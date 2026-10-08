// Mede o ângulo da LÂMINA no MUNDO frame a frame usando o update() REAL do jogo
// (mesmo caminho do runtime) — aponta estados onde a lâmina deixa de ser vertical.
// Uso: node tools/measure_blade.mjs
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

const v = new THREE.Vector3();
function bladeDir() {
  p.knifeM.updateWorldMatrix(true, false);
  v.set(0, 0, 1).transformDirection(p.knifeM.matrixWorld); // +Z local = lâmina
  return { x: v.x, y: v.y, z: v.z };
}
const deg = (d) => Math.acos(Math.max(-1, Math.min(1, d.y))) * 180 / Math.PI; // ângulo com o CÉU

function run(name, frames, input, pre) {
  if (pre) pre();
  let first = null, worst = -1, wf = 0, last = null;
  for (let i = 0; i < frames; i++) {
    p.update(1 / 60, input, room);
    const d = bladeDir(), a = deg(d);
    if (i === 0) first = a;
    if (a > worst) { worst = a; wf = i; }
    last = a;
  }
  const flag = (m) => m ? ' ⚠️' : ' ✓';
  console.log(`${name}: frame0=${first.toFixed(1)}° pior=${worst.toFixed(1)}°(f${wf}) final=${last.toFixed(1)}°${flag(last > 25)}`);
}

run('idle parado (yaw 0)', 120, IN, () => { p.setAim(false); p.group.rotation.y = 0; });
run('idle parado (yaw 90)', 120, IN, () => { p.group.rotation.y = Math.PI / 2; });
run('idle parado (yaw 180)', 120, IN, () => { p.group.rotation.y = Math.PI; });
run('andando p/ frente', 180, { ...IN, f: true }, () => { p.setAim(false); p.walkPhase = 0; });
run('andando correndo', 180, { ...IN, f: true, run: true }, () => { p.setAim(false); p.walkPhase = 0; });
run('mira parada', 90, IN, () => { p.setAim(true); });
run('mira girando esq (l)', 120, { ...IN, l: true }, () => { p.setAim(true); });
run('mira girando dir (r)', 120, { ...IN, r: true }, () => { p.setAim(true); });
console.log('(0° = lâmina apontando pro CÉU; >25° marca ⚠️)');
