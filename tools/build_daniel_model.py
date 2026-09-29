#!/usr/bin/env python3
"""
SANTA LÚCIA — Fatia o GLB do Daniel (modelo IA do produtor) em 6 peças PS1
(head/torso/armL/armR/legL/legR), quantiza (Int16 pos / Uint16 uv) e gera
js/model_daniel_data.js + assets/daniel_body.jpg.

Uso: python3 tools/build_daniel_model.py [caminho/dr.glb]
Requer: pillow
"""
import struct, json, base64, io as iomod, sys
from PIL import Image

SRC = sys.argv[1] if len(sys.argv) > 1 else '/tmp/dr.glb'
S = 0.947          # escala 1.9m -> 1.8m
Y_SHIFT = 0.95158  # pés do GLB original -> Y=0
Q, QU = 2048.0, 65535.0

data = open(SRC, 'rb').read()
off, chunks = 12, []
while off < len(data):
    ln, ty = struct.unpack('<II', data[off:off+8])
    chunks.append((ty, data[off+8:off+8+ln])); off += 8+ln
g = json.loads(chunks[0][1]); bin_data = chunks[1][1]
acc, bvs = g['accessors'], g['bufferViews']
prim = g['meshes'][0]['primitives'][0]

def read_acc(idx):
    a = acc[idx]; v = bvs[a['bufferView']]
    o = v.get('byteOffset', 0) + a.get('byteOffset', 0)
    nc = {'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4}[a['type']]
    ct = {5126:'f',5125:'I',5123:'H',5121:'B'}[a['componentType']]
    return list(struct.unpack_from(f'<{a["count"]*nc}{ct}', bin_data, o))

indices = read_acc(prim['indices'])
praw = read_acc(prim['attributes']['POSITION'])
uvraw = read_acc(prim['attributes']['TEXCOORD_0'])
npos = acc[prim['attributes']['POSITION']]['count']
pos = [[praw[i*3], praw[i*3+1]+Y_SHIFT, praw[i*3+2]] for i in range(npos)]
uv = [[uvraw[i*2], uvraw[i*2+1]] for i in range(acc[prim['attributes']['TEXCOORD_0']]['count'])]

def seg_dist(p, a, b):
    px,py,pz=p; ax,ay,az=a; bx,by,bz=b
    abx,aby,abz=bx-ax,by-ay,bz-az
    t=max(0,min(1,((px-ax)*abx+(py-ay)*aby+(pz-az)*abz)/(abx*abx+aby*aby+abz*abz)))
    dx,dy,dz=px-(ax+t*abx),py-(ay+t*aby),pz-(az+t*abz)
    return (dx*dx+dy*dy+dz*dz)**0.5

HEAD_C=(0.0,1.71,0.02)
ARM_L=((-0.205,1.47,0.0),(-0.325,0.84,0.0))
ARM_R=((0.205,1.47,0.0),(0.325,0.84,0.0))
def region(c):
    x,y,z=c
    if ((x-HEAD_C[0])**2+(y-HEAD_C[1])**2+(z-HEAD_C[2])**2)**0.5 < 0.175: return 'head'
    if seg_dist(c,*ARM_L) < 0.068: return 'armL'
    if seg_dist(c,*ARM_R) < 0.068: return 'armR'
    if y < 0.86 and abs(x) < 0.185: return 'legL' if x<0 else 'legR'
    return 'torso'

JOINTS_AI={'head':(0.0,1.60,0.0),'torso':(0.0,0.0,0.0),
           'armL':(-0.205,1.47,0.0),'armR':(0.205,1.47,0.0),
           'legL':(-0.10,0.84,0.0),'legR':(0.10,0.84,0.0)}
parts={k:[] for k in JOINTS_AI}
for t in range(0,len(indices),3):
    idx=indices[t:t+3]
    c=[sum(pos[i][k] for i in idx)/3 for k in range(3)]
    parts[region(c)].extend(idx)

out={}
for name,idxs in parts.items():
    jx,jy,jz=JOINTS_AI[name]
    P,U=[],[]
    for i in idxs:
        px,py,pz=pos[i]
        P+=[round((px-jx)*S*Q),round((py-jy)*S*Q),round((pz-jz)*S*Q)]
        U+=[round(uv[i][0]*QU),round((1.0-uv[i][1])*QU)]
    out[name]={'p':base64.b64encode(struct.pack(f'<{len(P)}h',*P)).decode(),
               'u':base64.b64encode(struct.pack(f'<{len(U)}H',*U)).decode(),
               'n':len(P)//3,'j':[round(jx*S,4),round(jy*S,4),round(jz*S,4)]}
    print(f"{name}: {out[name]['n']} verts")

js=("// Daniel 3D (modelo IA do produtor) fatiado em peças PS1 — tools/build_daniel_model.py\n"
    "export const DANIEL_MODEL = {\n  tex: './assets/daniel_body.jpg',\n  parts: "+json.dumps(out)+"\n};\n")
open('js/model_daniel_data.js','w').write(js)
v=bvs[g['images'][0]['bufferView']]
img=bin_data[v.get('byteOffset',0):v.get('byteOffset',0)+v['byteLength']]
Image.open(iomod.BytesIO(img)).convert('RGB').resize((512,512),Image.LANCZOS).save('assets/daniel_body.jpg','JPEG',quality=85,optimize=True)
print("OK: js/model_daniel_data.js + assets/daniel_body.jpg")
