// Dump do ATK estilo Leon (RE4 quick slash) em 3 frames — MESMO pipeline do
// render_lab_dump (aprovado no v69): player no lab, updates reais, câmera chase.
// Frames: atk0 = windup, atk1 = meio do corte, atk2 = retorno.
import * as THREE from '../vendor/three.module.min.js';
const gradStub = { addColorStop() {} };
function make2d() { return { canvas:null, fillStyle:'',strokeStyle:'',lineWidth:1,font:'',imageSmoothingEnabled:false, fillRect(){},clearRect(){},strokeRect(){},fillText(){},beginPath(){},arc(){},ellipse(){},moveTo(){},lineTo(){},bezierCurveTo(){},fill(){},stroke(){},save(){},restore(){},translate(){},rotate(){},createLinearGradient(){return gradStub;},createRadialGradient(){return gradStub;},getImageData(x,y,w,h){return{data:new Uint8ClampedArray(w*h*4),width:w,height:h};},putImageData(){},drawImage(){},closePath(){} }; }
const makeCanvas=(w=64,h=64)=>({width:w,height:h,getContext:()=>make2d(),style:{},addEventListener(){},getBoundingClientRect(){return{left:0,top:0,width:320,height:180}}});
global.window={addEventListener(){}};
global.location={search:'?playtest'};
global.document={addEventListener(){},createElement:(t)=>(t==='canvas'?makeCanvas():{style:{},appendChild(){},getContext:()=>make2d()}),body:{appendChild(){},style:{}}};
global.localStorage={getItem:()=>null,setItem(){},removeItem(){}};
import fs from 'fs';
const { buildTextures } = await import('../js/textures.js');
const TEX = buildTextures(THREE);
const { Player } = await import('../js/entities.js');
const { buildLab } = await import('../js/devmode.js');
const { WEAPON_MODELS } = await import('../js/model_weapons_data.js');

const p = new Player(THREE, TEX); p.setHero('daniel');
const fakeGame = { THREE, player: p, scene: new THREE.Scene(), camera: new THREE.PerspectiveCamera(60, 16/9, 0.1, 140), enemies: [], npcs: [], totems: [], boss: null, state: 'play', camMode: 'chase', fadeVal: 0, fadeTarget: 0, ui: { toast(){}, crosshair(){}, showHud(){} }, selectCam(){}, renderer: { domElement: makeCanvas(320,180) } };
const room = buildLab(fakeGame);
// assenta o player: alguns updates parado (pose idle real)
const IN = { f:false,b:false,l:false,r:false,run:false };
for (let i = 0; i < 30; i++) p.update(1/60, IN, room);
p.setAim(true); // o corte estilo Leon anima na MIRA (RE4R quick slash)
p.playAttack(0.4);
const FRAMES = [3, 15, 30]; // ticks após o clique: windup / corte / retorno
const v = new THREE.Vector3();
const dumpPlayer = (mode) => {
  const meshes = [];
  p.group.traverse((o) => {
    if (!o.isMesh || !o.visible) return;
    for (let q = o; q && q !== p.group; q = q.parent) if (!q.visible) return;
    let tag = 'proc', tex = null;
    if (o === p.fistR || o === p.fistL) tag = 'fist';
    if (o.userData && o.userData.sleeve) tag = 'sleeve';
    if (o.userData && o.userData.part) { tag = 'ai_' + o.userData.part; tex = 'assets/daniel_body.jpg'; }
    if (o.geometry.attributes.position.count > 5000 && o.parent === p.knifeM) tag = 'knife_prop';
    if (o.parent === p.knifeM && tag === 'proc') return; // boxes procedurais fora
    const g = o.geometry; const pos = g.attributes.position;
    const idx = g.index ? Array.from(g.index.array) : null;
    const world = [];
    for (let i = 0; i < pos.count; i++) { v.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld); world.push(v.x, v.y, v.z); }
    meshes.push({ tag, texPath: tex, world, uvs: g.attributes.uv ? Array.from(g.attributes.uv.array) : null, idx, count: pos.count });
  });
  return { mode, meshes };
};
const out = [];
let f = 0;
for (let tick = 0; tick <= 30; tick++) {
  p.update(1/60, IN, room);
  if (FRAMES.includes(tick)) {
    p.group.updateMatrixWorld(true);
    out.push(dumpPlayer('atk' + f));
    console.log('atk' + f + ': atkT=' + p.atkT.toFixed(3) + ' armR.y=' + p.armR.rotation.y.toFixed(2) + ' torso.y=' + p.torso.rotation.y.toFixed(2) + ' meshes=' + out[f].meshes.length);
    f++;
  }
}
console.log('estado foreR final:', JSON.stringify(p.foreR.children.map((c) => ({ v: c.visible, fore: !!c.userData.isFore, slv: !!c.userData.sleeve, n: c.isMesh ? c.geometry.attributes.position.count : 0 }))));
console.log('estado wristR final:', JSON.stringify(p.wristR.children.map((c) => ({ v: c.visible, hand: !!c.userData.isHand }))));
if (WEAPON_MODELS.faca) out[0].knifeTex = WEAPON_MODELS.faca.tex;
fs.writeFileSync('/tmp/player_render.json', JSON.stringify(out));
console.log('dump ok:', out.map((o) => o.mode + ':' + o.meshes.length).join(' '));
