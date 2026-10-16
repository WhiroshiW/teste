#!/usr/bin/env python3
"""
SANTA LÚCIA — Pipeline personagens IA -> peças PS1 (genérico).

Fluxo do produtor: imagem A-pose (docs/refs/) -> IA 3D grátis (Tripo/
Hunyuan/TRELLIS) -> GLB subido no repo -> ESTE script -> jogo.

Uso:  python3 tools/build_character_model.py <src.glb> daniel|clara
Requer: pillow + `npx gltfpack -i src.glb -o /tmp/out.glb -si 0.28 -noq`
        (rodar gltfpack ANTES; NÃO usar @gltf-transform/cli simplify —
         ele corrompe os dados reescrevendo em range [-1,1]!)

Lições carimbadas:
- gltfpack mantém o range real; confira min/max REAL dos dados (accessor
  min/max pode ficar stale).
- UVs podem sair fora de [0,1] (wrap) -> clamp antes de quantizar Uint16.
- A-pose aberta: pose.armOpen fecha os braços no runtime (rotação Z).
- Cortes de região: diagonais generosos por altura/lateral (cápsulas
  finas escorregam na malha decimada).
"""
import struct, json, base64, io as iomod, math, sys
from PIL import Image

SRC, WHO = sys.argv[1], sys.argv[2]
S = 1.8
Q, QU = 2048.0, 65535.0

# unidade normalizada (altura 1.0, pés em y=0) por personagem
CFG = {
 'daniel': dict(out='js/model_daniel_data.js', tex_out='assets/daniel_body.jpg', tex_js='./assets/daniel_body.jpg',
   var='DANIEL_MODEL', head_cut=0.80, head_joint=0.83, shoulder=(0.10,0.76), hand=(0.36,0.50),
   leg_cut=0.52, leg_joint=0.055, arm_x=0.115, arm_y=(0.40,0.79)),
 'clara': dict(out='js/model_clara_data.js', tex_out='assets/clara_body_ai.jpg', tex_js='./assets/clara_body_ai.jpg',
   var='CLARA_MODEL', head_cut=0.80, head_joint=0.83, shoulder=(0.10,0.76), hand=(0.36,0.50),
   leg_cut=0.52, leg_joint=0.055, arm_x=0.115, arm_y=(0.40,0.79)),
}
c = CFG[WHO]

data = open(SRC,'rb').read()
off=12; chunks=[]
while off<len(data):
    ln,ty=struct.unpack('<II',data[off:off+8]); chunks.append((ty,data[off+8:off+8+ln])); off+=8+ln
g=json.loads(chunks[0][1]); bin_data=chunks[1][1]
acc,bvs=g['accessors'],g['bufferViews']
prim=g['meshes'][0]['primitives'][0]
def read_acc(idx):
    a=acc[idx]; v=bvs[a['bufferView']]
    o=v.get('byteOffset',0)+a.get('byteOffset',0)
    nc={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4}[a['type']]
    ct={5126:'f',5125:'I',5123:'H',5121:'B'}[a['componentType']]
    return list(struct.unpack_from(f'<{a["count"]*nc}{ct}',bin_data,o))
indices=read_acc(prim['indices']); praw=read_acc(prim['attributes']['POSITION']); uvraw=read_acc(prim['attributes']['TEXCOORD_0'])
npos=acc[prim['attributes']['POSITION']]['count']
# checagem de sanidade: range real (accessor min/max pode estar stale)
ys=[praw[i*3+1] for i in range(npos)]
ymin,ymax=min(ys),max(ys)
print(f"range real y [{ymin:.3f}..{ymax:.3f}] (span {ymax-ymin:.3f})")
pos=[[praw[i*3], praw[i*3+1]-ymin, praw[i*3+2]] for i in range(npos)]  # pés -> y=0
def cl(x): return min(1.0,max(0.0,x))
uv=[[cl(uvraw[i*2]),cl(uvraw[i*2+1])] for i in range(acc[prim['attributes']['TEXCOORD_0']]['count'])]
sh,shy=c['shoulder']; hx,hy=c['hand']
def region(cx,cy):
    if cy>c['head_cut']: return 'head'
    if cx<-c['arm_x'] and c['arm_y'][0]<cy<c['arm_y'][1]: return 'armL'
    if cx>c['arm_x'] and c['arm_y'][0]<cy<c['arm_y'][1]: return 'armR'
    if cy<c['leg_cut'] and abs(cx)<0.16: return 'legL' if cx<0 else 'legR'
    return 'torso'
JOINTS_N={'head':(0.0,c['head_joint'],0.0),'torso':(0.0,0.0,0.0),
          'armL':(-sh,shy,0.0),'armR':(sh,shy,0.0),
          'legL':(-c['leg_joint'],c['leg_cut'],0.0),'legR':(c['leg_joint'],c['leg_cut'],0.0)}
parts={k:[] for k in JOINTS_N}
for t in range(0,len(indices),3):
    idx=indices[t:t+3]
    cx=sum(pos[i][0] for i in idx)/3; cy=sum(pos[i][1] for i in idx)/3
    parts[region(cx,cy)].extend(idx)
out={}
for name,idxs in parts.items():
    jn=JOINTS_N[name]; jx,jy,jz=[jn[k]*S for k in range(3)]
    P,U=[],[]
    for i in idxs:
        px,py,pz=pos[i]
        P+=[round((px*S-jx)*Q),round((py*S-jy)*Q),round((pz*S-jz)*Q)]
        U+=[round(uv[i][0]*QU),round((1.0-uv[i][1])*QU)]
    out[name]={'p':base64.b64encode(struct.pack(f'<{len(P)}h',*P)).decode(),
               'u':base64.b64encode(struct.pack(f'<{len(U)}H',*U)).decode(),
               'n':len(P)//3,'j':[round(jx,4),round(jy,4),round(jz,4)]}
    print(f"{name}: {out[name]['n']} verts ({len(idxs)//3} tris)")
armOpen=round(math.atan2(hx-sh,shy-hy),3)
gun=[round((hx-sh)*S,3),round((hy-shy)*S,3),0.08]
js=("// "+WHO.upper()+" 3D — modelo IA do produtor fatiado em peças PS1\n"
    "// Gerado por tools/build_character_model.py (config "+WHO.upper()+").\n"
    "// pose.armOpen fecha os braços no idle; UVs clampeados; pés em y=0.\n"
    "export const "+c['var']+" = {\n  tex: '"+c['tex_js']+"',\n"
    "  pose: "+json.dumps({'armOpen':armOpen,'gun':gun})+",\n  parts: "+json.dumps(out)+"\n};\n")
open(c['out'],'w').write(js)
print("OK:",c['out'],len(js)//1024,"KB | armOpen",armOpen,"gun",gun)
v=bvs[g['images'][0]['bufferView']]
img=bin_data[v.get('byteOffset',0):v.get('byteOffset',0)+v['byteLength']]
Image.open(iomod.BytesIO(img)).convert('RGB').resize((512,512),Image.LANCZOS).save(c['tex_out'],'JPEG',quality=85,optimize=True)
print("OK:",c['tex_out'])
