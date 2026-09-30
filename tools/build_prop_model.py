#!/usr/bin/env python3
"""
SANTA LÚCIA — Props de ARMA 3D (IA) -> WEAPON_MODELS (js/model_weapons_data.js).

Diferente dos personagens: prop NÃO fatia — vira UMA geometria quantizada
presa ao pivô da arma procedural (gunPivot/knifeM/...). O fallback
procedural continua ativo para qualquer arma ausente no arquivo.

Uso:  python3 tools/build_prop_model.py [nome ...]     # vazio = todos os presentes
GLBs vêm da pasta do repo:  'modelos 3d/<file>'
Ajuste por arma: len (m), pitch/yaw/roll (rad), grip [gx,gy,gz] = ponto
do cabo no espaço normalizado (vira a origem do prop na mão).
"""
import struct, json, base64, io as iomod, math, os, sys
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC_DIR = os.path.join(ROOT, 'modelos 3d')
Q, QU = 2048.0, 65535.0

# nome -> config (file em 'modelos 3d/'; knobs medidos na chegada de cada GLB)
# Orientações medidas: faca/bisturi/chave = cabo em -Z, ponta +Z;
# pistolas = cano em -X (yaw -90° traz o cano para +Z), cabo desce em -Y.
# 'revolver' = arma de fogo da Dra. (Pistola_clara.glb no slot revolverM).
PROPS = {
  'faca':            dict(file='Faca_daniel.glb',      len=0.30, pitch=0.0,  yaw=0.0,  roll=0.0, grip=[0.5,0.5,0.32], color=0x9aa0a8),
  'pistola':         dict(file='Pistola_daniel.glb',   len=0.26, pitch=0.0,  yaw=-1.5708, roll=0.0, grip=[0.5,0.30,0.15], color=0x2e3238),
  'revolver':        dict(file='Pistola_clara.glb',    len=0.26, pitch=0.0,  yaw=-1.5708, roll=0.0, grip=[0.5,0.30,0.15], color=0x3a3f46),
  'bisturi':         dict(file='Bisturi_da_clara.glb', len=0.20, pitch=0.0,  yaw=0.0,  roll=0.0, grip=[0.5,0.5,0.15], color=0xb8c0c8),
  'chave_inglesa':   dict(file='chave_inglesa.glb',    len=0.34, pitch=0.0,  yaw=0.0,  roll=0.0, grip=[0.5,0.5,0.15], color=0x5a6068),
}
MAX_TRIS = 30000  # acima disso o tool decima com gltfpack automaticamente

def load_glb(path):
    data = open(path,'rb').read()
    off=12; chunks=[]
    while off<len(data):
        ln,ty=struct.unpack('<II',data[off:off+8]); chunks.append((ty,data[off+8:off+8+ln])); off+=8+ln
    return json.loads(chunks[0][1]), chunks[1][1]

def read_acc(g, bin_data, idx):
    a=g['accessors'][idx]; v=g['bufferViews'][a['bufferView']]
    o=v.get('byteOffset',0)+a.get('byteOffset',0)
    nc={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4}[a['type']]
    ct={5126:'f',5125:'I',5123:'H',5121:'B'}[a['componentType']]
    return list(struct.unpack_from(f'<{a["count"]*nc}{ct}',bin_data,o))

def cl(x): return min(1.0,max(0.0,x))

def build(name, cfg):
    path = os.path.join(SRC_DIR, cfg['file'])
    if not os.path.exists(path): return None
    # auto-decimação: props > MAX_TRIS passam pelo gltfpack (subprocess)
    g0, b0 = load_glb(path)
    p0 = g0['meshes'][0]['primitives'][0]
    tris0 = g0['accessors'][p0['indices']]['count']//3 if 'indices' in p0 else g0['accessors'][p0['attributes']['POSITION']]['count']//3
    if tris0 > MAX_TRIS:
        ratio = max(0.15, min(0.9, MAX_TRIS/tris0))
        tmp = f"/tmp/prop_{name}_opt.glb"
        print(f"{name}: {tris0} tris > {MAX_TRIS} -> gltfpack -si {ratio:.2f}")
        os.system(f"npx --yes gltfpack -i '{path}' -o '{tmp}' -si {ratio:.2f} -noq > /dev/null 2>&1")
        if os.path.exists(tmp): path = tmp
    g, bin_data = load_glb(path)
    prim = g['meshes'][0]['primitives'][0]
    praw = read_acc(g, bin_data, prim['attributes']['POSITION'])
    uvraw = read_acc(g, bin_data, prim['attributes']['TEXCOORD_0'])
    indices = read_acc(g, bin_data, prim['indices']) if 'indices' in prim else list(range(len(praw)//3))
    n = len(praw)//3
    xs=praw[0::3]; ys=praw[1::3]; zs=praw[2::3]
    dims=(max(xs)-min(xs), max(ys)-min(ys), max(zs)-min(zs))
    k = cfg['len']/max(dims)  # eixo maior -> len
    # rotação opcional (knobs)
    pitch,yaw,roll = cfg['pitch'],cfg['yaw'],cfg['roll']
    cp,sp,cy,sy,cr,sr = math.cos(pitch),math.sin(pitch),math.cos(yaw),math.sin(yaw),math.cos(roll),math.sin(roll)
    def rot(x,y,z):
        x,y = x*cp + y*sp, -x*sp + y*cp        # pitch (X)
        x,z = x*cy - z*sy, x*sy + z*cy         # yaw (Y)
        y,z = y*cr - z*sr, y*sr + z*cr         # roll (Z)
        return x,y,z
    rpos=[rot(praw[i*3],praw[i*3+1],praw[i*3+2]) for i in range(n)]
    xs=[p[0] for p in rpos]; ys=[p[1] for p in rpos]; zs=[p[2] for p in rpos]
    mn=(min(xs),min(ys),min(zs)); dims=(max(xs)-mn[0], max(ys)-mn[1], max(zs)-mn[2])
    gx,gy,gz = cfg['grip']
    pivot=[mn[0]+gx*dims[0], mn[1]+gy*dims[1], mn[2]+gz*dims[2]]
    # CRÍTICO: expandir para TRIANGLE SOUP usando o índice (GLBs indexados:
    # vértices consecutivos NÃO formam triângulos na ordem do buffer!)
    soup=[]
    for t in range(0,len(indices),3):
        soup += [indices[t], indices[t+1], indices[t+2]]
    P,U=[],[]
    for i in soup:
        px,py,pz=rpos[i]
        P+=[round(((px*k-pivot[0]*k))*Q),round(((py*k-pivot[1]*k))*Q),round(((pz*k-pivot[2]*k))*Q)]
        U+=[round(cl(uvraw[i*2])*QU),round((1.0-cl(uvraw[i*2+1]))*QU)]
    n=len(soup)  # runtime consome soup (3 verts por tri, sem índice)
    ntris=len(indices)//3
    print(f"{name}: {n} verts soup / {ntris} tris | dims {tuple(round(d,3) for d in dims)} -> len {cfg['len']}")
    out_geo=base64.b64encode(struct.pack(f'<{len(P)}h{len(U)}H',*(P+U))).decode()
    tex_data=None
    if g.get('images'):
        v=g['bufferViews'][g['images'][0]['bufferView']]
        img=bin_data[v.get('byteOffset',0):v.get('byteOffset',0)+v['byteLength']]
        im=Image.open(iomod.BytesIO(img)).convert('RGB')
        if max(im.size)>256: im=im.resize((256,256),Image.LANCZOS)
        buf=igm=0
        bio=iomod.BytesIO(); im.save(bio,'JPEG',quality=80,optimize=True)
        tex_data='data:image/jpeg;base64,'+base64.b64encode(bio.getvalue()).decode()
    return dict(geo=out_geo, n=n, tex=tex_data, color=cfg['color'])

def main():
    names = sys.argv[1:] or [k for k,c in PROPS.items() if os.path.exists(os.path.join(SRC_DIR,c['file']))]
    models={}
    for nm in names:
        if nm not in PROPS: print(f"? prop desconhecido: {nm} (adicione no PROPS)"); continue
        r=build(nm,PROPS[nm])
        if r: models[nm]=r
    js=("// ARMAS 3D (props IA do produtor) — GERADO por tools/build_prop_model.py\n"
        "// Vazio/nome ausente = jogo usa o prop procedural (fallback).\n"
        "export const WEAPON_MODELS = "+json.dumps(models)+"\n")
    open(os.path.join(ROOT,'js/model_weapons_data.js'),'w',encoding='utf-8').write(js)
    print(f"OK: js/model_weapons_data.js ({', '.join(models) if models else 'vazio — fallback procedural'})")

if __name__=='__main__':
    main()
