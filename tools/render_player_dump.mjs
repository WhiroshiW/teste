// Dump de triângulos do Player em espaço do MUNDO usando o three.js REAL
// (mesmo código do jogo) para o rasterizador offline tools/render_player.py
// Uso: node tools/render_player_dump.mjs idle|aim|both
import * as THREE from '../vendor/three.module.min.js';
import fs from 'fs';
const gradStub = { addColorStop() {} };
function make2d() { return { canvas:null, fillStyle:'',strokeStyle:'',lineWidth:1,font:'',imageSmoothingEnabled:false, fillRect(){},clearRect(){},strokeRect(){},fillText(){},beginPath(){},arc(){},ellipse(){},moveTo(){},lineTo(){},bezierCurveTo(){},fill(){},stroke(){},save(){},restore(){},translate(){},rotate(){},createLinearGradient(){return gradStub;},createRadialGradient(){return gradStub;},getImageData(x,y,w,h){return{data:new Uint8ClampedArray(w*h*4),width:w,height:h};},putImageData(){},drawImage(){},closePath(){} }; }
const makeCanvas=(w=64,h=64)=>({width:w,height:h,getContext:()=>make2d(),style:{}});
global.window={}; global.document={createElement:(t)=>(t==='canvas'?makeCanvas():{style:{},appendChild(){},getContext:()=>make2d()})};
global.localStorage={getItem:()=>null,setItem(){},removeItem(){}};
const { buildTextures } = await import('../js/textures.js');
const TEX = buildTextures(THREE);
const { Player } = await import('../js/entities.js');
const { WEAPON_MODELS } = await import('../js/model_weapons_data.js');

const p = new Player(THREE, TEX);
p.setHero('daniel'); p.setWeapon('knife');
p.group.updateMatrixWorld(true);

const v = new THREE.Vector3();
function dumpState(mode) {
  if (mode === 'aim') {
    p.setAim(true);
    p.armR.rotation.set(-1.52, -0.04, -0.05);
    p.armL.rotation.set(-1.44, 0.05, 0.05);
    p.gunPivot.rotation.x = 0.92;
    p.knifeM.rotation.set(3.77, 0, -0.45);
  } else {
    p.setAim(false);
  }
  if (mode === 'swing') { // pico do swing do ANDAR — caso que tombava a faca
    p.armR.rotation.x = 0.5; p.armL.rotation.x = -0.5;
  }
  if (p.updateKnifeWorldUp) p.updateKnifeWorldUp(); // mesma compensação do jogo
  p.group.updateMatrixWorld(true);
  const vis = (o) => { for (let q = o; q && q !== p.group; q = q.parent) if (!q.visible) return false; return true; };
  const meshes = [];
  p.group.traverse((o) => {
    if (!o.isMesh || !o.visible || !vis(o)) return; // respeita pais ocultos (setWeapon esconde grupos)
    const g = o.geometry;
    const pos = g.attributes.position;
    if (!pos) return;
    const uvA = g.attributes.uv;
    let tag = 'proc';
    let texPath = null;
    if (o.userData && o.userData.part) { tag = 'ai_' + o.userData.part; texPath = 'assets/daniel_body.jpg'; }
    if (pos.count > 5000 && o.parent === p.knifeM) { tag = 'knife_prop'; }
    if (o.parent === p.knifeM && tag === 'proc') return; // boxes procedurais ocultos
    const idx = g.index ? Array.from(g.index.array) : null;
    const world = [];
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld);
      world.push(v.x, v.y, v.z);
    }
    const uvs = uvA ? Array.from(uvA.array) : null;
    meshes.push({ tag, texPath, world, uvs, idx, count: pos.count });
  });
  // textura da faca via dataURL
  const out = { mode, meshes };
  if (WEAPON_MODELS.faca) out.knifeTex = WEAPON_MODELS.faca.tex;
  return out;
}
const modes = process.argv[2] === 'aim' ? ['aim','swing'] : process.argv[2] === 'both' ? ['idle','aim','swing'] : ['idle','swing'];
const result = modes.map(dumpState);
fs.writeFileSync('/tmp/player_render.json', JSON.stringify(result));
console.log('dump ok:', result.map(r => `${r.mode}:${r.meshes.length} meshes`).join(' '));
