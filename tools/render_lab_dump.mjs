// Dump do MODO LABORATÓRIO: player + mesa-vitrine, mesma camera chase do lab,
// para renderizar offline e ver exatamente o que o produtor vê.
import * as THREE from '../vendor/three.module.min.js';
const gradStub = { addColorStop() {} };
function make2d() { return { canvas:null, fillStyle:'',strokeStyle:'',lineWidth:1,font:'',imageSmoothingEnabled:false, fillRect(){},clearRect(){},strokeRect(){},fillText(){},beginPath(){},arc(){},ellipse(){},moveTo(){},lineTo(){},bezierCurveTo(){},fill(){},stroke(){},save(){},restore(){},translate(){},rotate(){},createLinearGradient(){return gradStub;},createRadialGradient(){return gradStub;},getImageData(x,y,w,h){return{data:new Uint8ClampedArray(w*h*4),width:w,height:h};},putImageData(){},drawImage(){},closePath(){} }; }
const makeCanvas=(w=64,h=64)=>({width:w,height:h,getContext:()=>make2d(),style:{},addEventListener(){},getBoundingClientRect(){return{left:0,top:0,width:320,height:180}}});
global.window={addEventListener(){}};
global.location={search:'?playtest'};
global.document={addEventListener(){},createElement:(t)=>(t==='canvas'?makeCanvas():{style:{},appendChild(){},getContext:()=>make2d()}),body:{appendChild(){},style:{}}};
global.localStorage={getItem:()=>null,setItem(){},removeItem(){}};
const { buildTextures } = await import('../js/textures.js');
const TEX = buildTextures(THREE);
const { Player } = await import('../js/entities.js');
const { buildLab } = await import('../js/devmode.js');
const { WEAPON_MODELS } = await import('../js/model_weapons_data.js');
import fs from 'fs';

const p = new Player(THREE, TEX); p.setHero('daniel');
const fakeGame = { THREE, player: p, scene: new THREE.Scene(), camera: new THREE.PerspectiveCamera(60, 16/9, 0.1, 140), enemies: [], npcs: [], totems: [], boss: null, state: 'play', camMode: 'chase', fadeVal: 0, fadeTarget: 0, ui: { toast(){}, crosshair(){}, showHud(){} }, selectCam(){}, renderer: { domElement: makeCanvas(320,180) } };
fakeGame.camera.position.set(0, 1.95, -3.0); fakeGame.camera.lookAt(0, 1.35, 0); fakeGame.camera.updateMatrixWorld(true);
const room = buildLab(fakeGame);
p.update(1/60, { f:false,b:false,l:false,r:false,run:false }, room);
p.group.updateMatrixWorld(true); room.group.updateMatrixWorld(true);

const v = new THREE.Vector3();
const meshes = [];
const dump = (o, tag, texPath) => {
  const g = o.geometry; if (!g || !g.attributes.position) return;
  const pos = g.attributes.position;
  const idx = g.index ? Array.from(g.index.array) : null;
  const world = [];
  for (let i = 0; i < pos.count; i++) { v.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld); world.push(v.x, v.y, v.z); }
  meshes.push({ tag, texPath, world, uvs: g.attributes.uv ? Array.from(g.attributes.uv.array) : null, idx, count: pos.count });
};
// player: partes do corpo + o que está na mão
p.group.traverse((o) => {
  if (!o.isMesh || !o.visible) return;
  for (let q = o; q && q !== p.group; q = q.parent) if (!q.visible) return;
  let tag = 'proc', tex = null;
    if (o === p.fistR || o === p.fistL) tag = 'fist';
    if (o.userData && o.userData.sleeve) tag = 'sleeve';
  if (o.userData && o.userData.part) { tag = 'ai_' + o.userData.part; tex = 'assets/daniel_body.jpg'; }
  if (pos_count(o) > 5000 && o.parent === p.knifeM) tag = 'knife_prop';
  if (o.parent === p.knifeM && tag === 'proc') { console.log('!! BOX PROCEDURAL VISIVEL NA MAO:', o.geometry.type, o.layers.mask); return; }
  dump(o, tag, tex);
});
function pos_count(o) { return o.geometry.attributes.position.count; }
// vitrine
room.group.traverse((o) => {
  if (!o.isMesh || !o.visible) return;
  for (let q = o; q && q !== room.group; q = q.parent) if (!q.visible) return;
  let tag = 'lab_obj', tex = null;
  if (o.name === 'lab_plano' || o.name === 'lab_grade') return; // chão e grade não precisam render
  if (o.parent && o.parent.name && o.parent.name.startsWith('exibe_')) return; // vitrine fora (isolar player)
  if (o.name && o.name.startsWith('exibe_')) return;
  dump(o, tag, tex);
});
const out = [{ mode: 'lab', meshes }];
if (WEAPON_MODELS.faca) out[0].knifeTex = WEAPON_MODELS.faca.tex;
fs.writeFileSync('/tmp/player_render.json', JSON.stringify(out));
console.log('dump ok: lab', meshes.length, 'meshes |', meshes.map(m=>m.tag).join(','));
