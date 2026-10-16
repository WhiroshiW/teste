// Testa o RIG RE2/RE3: cotovelo/joelho (2 segmentos), joelho dobrando no
// passo, low-ready com arma de fogo parado e pose de mira leve.
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
// 1) rig: antebraço e canela receberam geometria do corte
const foreMeshes = p.foreR.children.filter((c) => c.isMesh).length;
const shinMeshes = p.shinL.children.filter((c) => c.isMesh).length;
if (foreMeshes < 1) throw new Error('antebraço vazio — corte do rig falhou');
if (shinMeshes < 1) throw new Error('canela vazia — corte do rig falhou');
console.log(`rig: antebraçoR=${foreMeshes} mesh(es) · canelaL=${shinMeshes} mesh(es) ✓`);
// 2) joelho dobra no passo
const room = { solids: [] };
const IN = { f:true, b:false, l:false, r:false, run:false };
p.walkPhase = 0;
let maxKnee = 0;
for (let i = 0; i < 120; i++) { p.update(1 / 60, IN, room); maxKnee = Math.max(maxKnee, Math.abs(p.shinL.rotation.x)); }
if (maxKnee < 0.2) throw new Error('joelho não dobra no passo (' + maxKnee.toFixed(2) + ')');
console.log(`passo: joelho dobra até ${(maxKnee * 180 / Math.PI).toFixed(0)}° ✓`);
// 3) lean de corrida
const RUN = { ...IN, run: true };
p.group.rotation.x = 0;
for (let i = 0; i < 60; i++) p.update(1 / 60, RUN, room);
if (p.group.rotation.x < 0.05) throw new Error('sem lean na corrida');
console.log(`corrida: lean ${(p.group.rotation.x * 180 / Math.PI).toFixed(0)}° ✓`);
// 4) pistola parada = low-ready (RE2/RE3)
p.setWeapon('pistol');
for (let i = 0; i < 90; i++) p.update(1 / 60, { f:false, b:false, l:false, r:false, run:false }, room);
if (p.armR.rotation.x > -0.25 || p.foreR.rotation.x < 0.5) { console.log('DEBUG low-ready:', p.weapon, p.aiming, p.armR.rotation.x.toFixed(3), p.foreR.rotation.x.toFixed(3), p.moving); throw new Error('pistola não foi pro low-ready'); }
console.log(`pistola idle: braço ${p.armR.rotation.x.toFixed(2)} + cotovelo ${p.foreR.rotation.x.toFixed(2)} = low-ready ✓`);
// 5) mirar pistola = pose leve (2 mãos à frente)
p.setAim(true);
p.update(1 / 60, { f:false, b:false, l:false, r:false, run:false }, room);
if (Math.abs(p.armR.rotation.x - (-1.42)) > 0.02 || Math.abs(p.foreR.rotation.x - 0.22) > 0.02) throw new Error('pose leve errada');
console.log('pistola mira: 2 mãos à frente ✓');
// 6) faca idle: cotovelo neutro (visual aprovado intacto)
p.setWeapon('knife'); p.setAim(false);
for (let i = 0; i < 90; i++) p.update(1 / 60, { f:false, b:false, l:false, r:false, run:false }, room);
if (Math.abs(p.foreR.rotation.x) > 0.05 || Math.abs(p.armR.rotation.x) > 0.15) throw new Error('idle da faca mudou!');
console.log('faca idle: visual aprovado intacto ✓');
// 7) MÃO REAL do modelo em cena (v73): antebraço AI visível, punho procedural oculto
const armOK = (fore, wrist, fist) => {
  const aiVis = [...fore.children, ...wrist.children].some((c) => c.isMesh && c.visible && c.userData.part && c.geometry.attributes.position.count > 1000);
  const manga = fore.children.some((c) => c.isMesh && c.userData.sleeve && c.visible);
  return aiVis && !manga && !fist.visible;
};
if (!armOK(p.foreR, p.wristR, p.fistR) || !armOK(p.foreL, p.wristL, p.fistL)) {
  const dbg = (g) => JSON.stringify(g.children.map((c) => ({ p: c.userData.part, v: c.visible, n: c.isMesh ? c.geometry.attributes.position.count : 0 })));
  throw new Error('mão real fora: foreR=' + dbg(p.foreR) + ' foreL=' + dbg(p.foreL));
}
console.log('mão REAL do modelo em cena (punho procedural guardado) ✓');
// 8) faca fora da mão (recalibração): nenhum prop visível no knifeM
const propsVis = p.knifeM.children.some((c) => c.visible);
if (propsVis) throw new Error('faca ainda visível na mão (recalibração pendente)');
console.log('mão vazia (faca aguardando recalibração) ✓');
console.log('RIG-OK');
