// Mede o ângulo da LÂMINA NA TELA (projeção da câmera chase) em vários yaws.
// Meta: <5 graus em idle E mira — vertical APARENTE para o jogador.
import * as THREE from '../vendor/three.module.min.js';
const gradStub = { addColorStop() {} };
function make2d() { return { canvas:null, fillStyle:'',strokeStyle:'',lineWidth:1,font:'',imageSmoothingEnabled:false, fillRect(){},clearRect(){},strokeRect(){},fillText(){},beginPath(){},arc(){},ellipse(){},moveTo(){},lineTo(){},bezierCurveTo(){},fill(){},stroke(){},save(){},restore(){},translate(){},rotate(){},createLinearGradient(){return gradStub;},createRadialGradient(){return gradStub;},getImageData(x,y,w,h){return{data:new Uint8ClampedArray(w*h*4),width:w,height:h};},putImageData(){},drawImage(){},closePath(){} }; }
const makeCanvas=(w=64,h=64)=>({width:w,height:h,getContext:()=>make2d(),style:{}});
global.window={}; global.document={createElement:(t)=>(t==='canvas'?makeCanvas():{style:{},appendChild(){},getContext:()=>make2d()})};
global.localStorage={getItem:()=>null,setItem(){},removeItem(){}};
const { buildTextures } = await import('../js/textures.js');
const TEX = buildTextures(THREE);
const { Player } = await import('../js/entities.js');

const p = new Player(THREE, TEX);
p.setHero('daniel'); p.setWeapon('knife');
const room = { solids: [] };
const IN = { f:false, b:false, l:false, r:false, run:false };
const cam = new THREE.PerspectiveCamera(60, 16 / 9, 0.1, 140);
p.renderCamera = cam;
const v = new THREE.Vector3(), a = new THREE.Vector3(), b = new THREE.Vector3();
function screenAng() {
  p.knifeM.updateWorldMatrix(true, false);
  v.set(0, 0, 1).transformDirection(p.knifeM.matrixWorld);
  p.knifeM.getWorldPosition(a);
  b.copy(a).addScaledVector(v, 0.3);
  a.project(cam); b.project(cam);
  return Math.abs(Math.atan2((b.x - a.x) * 16 / 9, b.y - a.y)) * 180 / Math.PI;
}
function chaseCam(angle) {
  cam.position.set(-Math.sin(angle) * 3.0, 1.95, -Math.cos(angle) * 3.0);
  cam.lookAt(Math.sin(angle) * 1.2, 1.35, Math.cos(angle) * 1.2);
  cam.updateMatrixWorld(true);
}
let worst = 0;
for (const yaw of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
  p.angle = yaw; p.group.rotation.y = yaw; chaseCam(yaw);
  p.setAim(false); p.update(1 / 60, IN, room);
  const idle = screenAng();
  p.setAim(true); p.update(1 / 60, IN, room);
  const aim = screenAng();
  worst = Math.max(worst, idle, aim);
  console.log(`yaw ${String(Math.round(yaw * 180 / Math.PI)).padStart(3)}: tela idle=${idle.toFixed(1)}°  aim=${aim.toFixed(1)}°`);
}
console.log(worst < 5 ? `APROVADO: pior ${worst.toFixed(1)}° (<5°)` : `⚠️ REPROVADO: pior ${worst.toFixed(1)}°`);
