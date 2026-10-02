#!/usr/bin/env python3
"""
Calibrador VISUAL do encaixe de armas (SANTA LÚCIA).
Renderiza o personagem + arma com as MESMAS transforms do runtime
(three.js Euler XYZ, mesma hierarquia) em PNG — o agente OLHA a imagem
e ajusta os ângulos antes de commitar. Fim do ciclo às cegas.

Uso: python3 tools/render_player.py [--pitch A] [--roll A] [--back Z] [--out x.png]
"""
import json, base64, struct, math, sys, os
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
argd = sys.argv[1:]
def arg(k, d):
    return float(argd[argd.index(k)+1]) if k in argd else d
PITCH = arg('--pitch', -1.57)   # knifeM rotation.x
ROLL  = arg('--roll', -0.45)    # knifeM rotation.z
BACK  = arg('--back', 0.0)      # knifeM position deslocamento no eixo dos dedos
OUT   = argd[argd.index('--out')+1] if '--out' in argd else '/tmp/calib.png'

D = json.load(open('/tmp/daniel.json'))
WJ = json.load(open('/tmp/weapons.json'))

def norm(a):
    l = math.sqrt(sum(x*x for x in a))
    if l < 1e-9: return None
    return [x/l for x in a]
def sub(a,b): return [a[i]-b[i] for i in range(3)]
def dot(a,b): return sum(x*y for x,y in zip(a,b))
def cross(a,b): return [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]]

# Euler XYZ (three.js): v' = Rx * Ry * Rz * v
def euler(p, rx, ry, rz):
    cx,sx,cy,sy,cz,sz = math.cos(rx),math.sin(rx),math.cos(ry),math.sin(ry),math.cos(rz),math.sin(rz)
    x,y,z = p
    x,y = x*cz-y*sz, x*sz+y*cz          # Rz
    x,z = x*cy+z*sy, -x*sy+z*cy         # Ry
    y,z = y*cx-z*sx, y*sx+z*cx          # Rx
    return (x,y,z)

# ── mundo do braço direito: Rz(restZ aplicado) + j
part = D['parts']['armR']; j = part['j']
restApplied = -max(0.14, (D['pose']['armOpen'] or 0)*0.62)  # _aiArmZ.R
jx,jy,jz = j
ca,sa = math.cos(restApplied), math.sin(restApplied)
def armWorld(p):
    x = p[0]*ca - p[1]*sa + jx
    y = p[0]*sa + p[1]*ca + jy
    z = p[2] + jz
    return (x,y,z)

def part_verts(name, worldfn):
    b = base64.b64decode(D['parts'][name]['p']); n = D['parts'][name]['n']
    i16 = struct.unpack_from(f'<{n*3}h', b, 0)
    return [worldfn((i16[i*3]/2048, i16[i*3+1]/2048, i16[i*3+2]/2048)) for i in range(n)]

def part_tris(name, worldfn, color):
    V = part_verts(name, worldfn)
    tris = []
    for t in range(0, len(V), 3):
        tris.append((V[t], V[t+1], V[t+2], color))
    return tris

# offsets mundiais das peças (frame do personagem)
OFF = {'torso': (0,0,0), 'legL': (-0.099, 0.9828, 0), 'legR': (0.099, 0.9828, 0)}
HEADJ = D['parts']['head']['j']
OFF['head'] = (HEADJ[0], HEADJ[1], HEADJ[2])
COLORS = {'torso': (0.17,0.21,0.30), 'head': (0.84,0.71,0.60),
          'legL': (0.23,0.23,0.25), 'legR': (0.23,0.23,0.25),
          'armL': (0.16,0.20,0.32), 'armR': (0.19,0.24,0.36)}

tris = []
for nm in ['torso','head','legL','legR']:
    tris += part_tris(nm, lambda p, o=OFF[nm]: (p[0]+o[0], p[1]+o[1], p[2]+o[2]), COLORS[nm])
tris += part_tris('armR', armWorld, COLORS['armR'])
jL = D['parts']['armL']['j']
ca2,sa2 = math.cos(max(0.14,(D['pose']['armOpen'] or 0)*0.62)), math.sin(max(0.14,(D['pose']['armOpen'] or 0)*0.62))
tris += part_tris('armL', lambda p: (p[0]*ca2-p[1]*sa2+jL[0], p[0]*sa2+p[1]*ca2+jL[1], p[2]+jL[2]), COLORS['armL'])

# ── faca: gunPivot na palma (frame do braço) -> mundo; knifeM euler; geo local
b = base64.b64decode(WJ['faca']['geo']); n = WJ['faca']['n']
i16 = struct.unpack_from(f'<{n*3}h', b, 0)
KV = [(i16[i*3]/2048, i16[i*3+1]/2048, i16[i*3+2]/2048) for i in range(n)]
gp = D['pose']['gun']
gpW = armWorld(gp)
KN = []
for p in KV:
    q = euler(p, PITCH, 0, ROLL)
    q = (q[0], q[1]+BACK, q[2])  # BACK = desloca no Y local (desce o cabo)
    w = armWorld((q[0]+gp[0], q[1]+gp[1], q[2]+gp[2]))
    KN.append((w, p))  # mundo + local (pra cor da lâmina)

# ── rasterização com z-buffer
if '--close' in argd:
    # close-up na palma: câmera rente, mira na mão direita
    gpw = armWorld(D['pose']['gun'])
    cam = (gpw[0]+1.05, gpw[1]+0.55, gpw[2]-1.05)
    tgt = gpw
else:
    cam = (1.9, 1.85, -1.95); tgt = (0.12, 1.02, 0.0)
fw = norm(sub(tgt, cam)); rt = norm(cross(fw, [0,1,0])); up = cross(rt, fw)
W,H,K = 520, 470, 1.15
img = [[(0.10,0.10,0.12)]*W for _ in range(H)]
zbuf = [[1e9]*W for _ in range(H)]
def prj(p):
    d = sub(p, cam); z = dot(d, fw)
    return (int((dot(d,rt)/z*K+0.5)*W), int((0.5-dot(d,up)/z*K)*H), z)
LIGHT = norm([0.4, 0.85, 0.5])
def fill(a3):
    (A,B,C,col) = a3
    n = norm(cross(sub(B,A), sub(C,A)))
    if n is None: return
    ax,ay,az = prj(A); bx,by,bz = prj(B); cx,cy,cz2 = prj(C)
    if dot(n, sub(cam, A)) < 0: n = [-x for x in n]
    lum = 0.42 + 0.58*max(0.0, dot(n, LIGHT))
    shade = tuple(min(1.0, c*lum) for c in col)
    minx,maxx = max(0,min(ax,bx,cx)), min(W-1,max(ax,bx,cx))
    miny,maxy = max(0,min(ay,by,cy)), min(H-1,max(ay,by,cy))
    if minx>maxx or miny>maxy: return
    d00 = (bx-ax)*(cy-ay)-(cx-ax)*(by-ay)
    if abs(d00) < 1e-9: return
    for py in range(miny, maxy+1):
        for px in range(minx, maxx+1):
            w1 = ((px-ax)*(cy-ay)-(cx-ax)*(py-ay))/d00
            w2 = ((by-ay)*(px-ax)-(bx-ax)*(py-ay))/d00
            if w1 < -0.001 or w2 < -0.001 or w1+w2 > 1.001: continue
            z = az + w1*(bz-az) + w2*(cz2-az)
            if z < zbuf[py][px]:
                zbuf[py][px] = z; img[py][px] = shade

for t in tris: fill(t)
# faca por cima (com z-buffer próprio da lista já projetada)
for i in range(0, len(KN), 3):
    A,la = KN[i]; B,lb = KN[i+1]; C,lc = KN[i+2]
    blade = (la[2] > 0.12) and (lb[2] > 0.12) and (lc[2] > 0.12)
    fill((A,B,C, (0.74,0.78,0.84) if blade else (0.30,0.24,0.19)))

out = Image.new('RGB', (W,H))
px = out.load()
for y in range(H):
    for x in range(W):
        r,g,b2 = img[y][x]
        px[x,y] = (int(r*255), int(g*255), int(b2*255))
out.save(OUT)
print(f"OK {OUT} | knifeM euler=({PITCH:.2f},0,{ROLL:.2f}) | gun={D['pose']['gun']}")
