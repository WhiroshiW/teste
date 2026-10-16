// Testa o CORTE DIAGONAL estilo Leon (RE4): windup pra fora, corte cruzando
// o corpo com torção do tronco, faca acompanhando o arco na mão, e volta
// exata ao stance (pose de mira aprovada).
import * as THREE from '../vendor/three.module.min.js';
const gradStub = { addColorStop() {} };
function make2d() { return { canvas:null, fillStyle:'',strokeStyle:'',lineWidth:1,font:'',imageSmoothingEnabled:false, fillRect(){},clearRect(){},strokeRect(){},fillText(){},beginPath(){},arc(){},ellipse(){},moveTo(){},lineTo(){},bezierCurveTo(){},fill(){},stroke(){},save(){},restore(){},translate(){},rotate(){},createLinearGradient(){return gradStub;},createRadialGradient(){return gradStub;},getImageData(x,y,w,h){return{data:new Uint8ClampedArray(w*h*4),width:w,height:h};},putImageData(){},drawImage(){},closePath(){} }; }
const makeCanvas=(w=64,h=64)=>({width:w,height:h,getContext:()=>make2d(),style:{}});
global.window={}; global.document={createElement:(t)=>(t==='canvas'?makeCanvas():{style:{},appendChild(){},getContext:()=>make2d()})};
global.localStorage={getItem:()=>null,setItem(){},removeItem(){}};
const { buildTextures } = await import('../js/textures.js');
const TEX = buildTextures(THREE);
const { Player } = await import('../js/entities.js');
const p = new Player(THREE, TEX); p.setHero('daniel'); p.setWeapon('knife');
const room = { solids: [] };
const cam = new THREE.PerspectiveCamera(60, 16 / 9, 0.1, 140);
p.renderCamera = cam;
cam.position.set(0, 1.95, -3); cam.lookAt(0, 1.35, 0); cam.updateMatrixWorld(true);
const v = new THREE.Vector3(), a = new THREE.Vector3(), b = new THREE.Vector3();
function screenAng() {
  p.knifeM.updateWorldMatrix(true, false);
  v.set(0, 0, 1).transformDirection(p.knifeM.matrixWorld);
  p.knifeM.getWorldPosition(a);
  b.copy(a).addScaledVector(v, 0.3);
  a.project(cam); b.project(cam);
  return Math.abs(Math.atan2((b.x - a.x) * 16 / 9, b.y - a.y)) * 180 / Math.PI;
}
const IN = { f:false, b:false, l:false, r:false, run:false };
p.setAim(true);
p.update(1 / 60, IN, room);
const stance = { x: p.armR.rotation.x, y: p.armR.rotation.y, ty: p.torso.rotation.y };
if (Math.abs(stance.x - (-1.52)) > 1e-6) throw new Error('stance base mudou');
p.playAttack(0.4);
let maxY = -9, minY = 9, worst = 0, first = null, path = 0;
const last = new THREE.Vector3(); let hasLast = false;
for (let i = 0; i < 45; i++) {
  p.update(1 / 60, IN, room);
  maxY = Math.max(maxY, p.armR.rotation.y);
  minY = Math.min(minY, p.armR.rotation.y);
  worst = Math.max(worst, screenAng());
  const ang = screenAng();
  if (first === null) first = ang;
  const pos = p.knifeM.getWorldPosition(new THREE.Vector3());
  if (hasLast) path += pos.distanceTo(last);
  last.copy(pos); hasLast = true;
}
const finalAng = screenAng();
if (Math.abs(p.armR.position.z) > 0.02) throw new Error('braço transladou — desprega do ombro!');
console.log(`Leon slash: windup y=${maxY.toFixed(2)} (>0.25?) corte y=${minY.toFixed(2)} (<-0.5?)`);
console.log(`torção tronco: ${p.torso.rotation.y.toFixed(2)} | faca viajou ${path.toFixed(2)}m`);
console.log(`lâmina: stance=${first.toFixed(1)}° pico no corte=${worst.toFixed(1)}° final=${finalAng.toFixed(1)}°`);
if (maxY < 0.25) throw new Error('windup fraco — mão não sai pra fora');
if (minY > -0.5) throw new Error('corte não atravessa o corpo');
if (worst < 20) throw Error('lâmina deveria ARQUEAR com o corte (estilo Leon)');
if (path < 0.3) throw new Error('faca viajou pouco');
if (finalAng > 5) throw new Error('não voltou à vertical na tela!');
const sx = Math.abs(p.armR.rotation.x - stance.x), sy = Math.abs(p.armR.rotation.y - stance.y);
if (sx > 0.05 || sy > 0.05) throw new Error(`não voltou ao stance (dx=${sx.toFixed(2)}, dy=${sy.toFixed(2)})`);
console.log('LEON-SLASH-OK — windup, corte cruzado, arco na mão, retorno ao stance');
