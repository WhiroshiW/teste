// Teste do MODO LABORATÓRIO: flag, plano branco, player andando, editor vivo
global.location = { search: '?playtest' };
global.window = { addEventListener(){} };
const gradStub = { addColorStop() {} };
function make2d() { return { addEventListener(){}, getBoundingClientRect(){return{left:0,top:0,width:320,height:180}}, canvas:null, fillStyle:'',strokeStyle:'',lineWidth:1,font:'',imageSmoothingEnabled:false, fillRect(){},clearRect(){},strokeRect(){},fillText(){},beginPath(){},arc(){},ellipse(){},moveTo(){},lineTo(){},bezierCurveTo(){},fill(){},stroke(){},save(){},restore(){},translate(){},rotate(){},createLinearGradient(){return gradStub;},createRadialGradient(){return gradStub;},getImageData(x,y,w,h){return{data:new Uint8ClampedArray(w*h*4),width:w,height:h};},putImageData(){},drawImage(){},closePath(){} }; }
const makeCanvas=(w=64,h=64)=>({width:w,height:h,getContext:()=>make2d(),style:{},addEventListener(){},getBoundingClientRect(){return{left:0,top:0,width:320,height:180}}});
global.document={addEventListener(){},createElement:(t)=>(t==='canvas'?makeCanvas():{style:{},appendChild(){},getContext:()=>make2d()}),body:{appendChild(){},style:{}}};
const __mem = {}; global.localStorage={getItem:(k)=>(k in __mem?__mem[k]:null),setItem:(k,v)=>{__mem[k]=String(v)},removeItem:(k)=>{delete __mem[k]}};
const THREE = await import('../vendor/three.module.min.js');
const { buildTextures } = await import('../js/textures.js');
const TEX = buildTextures(THREE);
const { Player } = await import('../js/entities.js');
const { buildLab, isPlaytest, DevEditor } = await import('../js/devmode.js');
console.log('playtest flag:', isPlaytest());
const p = new Player(THREE, TEX); p.setHero('daniel'); p.setWeapon('knife');
const fakeGame = { THREE, player: p, scene: new THREE.Scene(), camera: new THREE.PerspectiveCamera(60, 16/9, 0.1, 140), enemies: [], npcs: [], totems: [], boss: null, state: 'play', camMode: 'chase', fadeVal: 1, fadeTarget: 0, ui: { toast(){}, crosshair(){}, showHud(){} }, selectCam(){}, renderer: { domElement: makeCanvas(320,180) } };
fakeGame.camera.position.set(0,1.95,-3); fakeGame.camera.lookAt(0,1.35,0); fakeGame.camera.updateMatrixWorld(true);
const room = buildLab(fakeGame);
console.log('room id:', room.id, '| solids:', room.solids.length, '| grupo filhos:', room.group.children.length);
console.log('plano branco:', room.group.children[0].name, '| grade:', room.group.children[1].name);
console.log('player em:', p.x, p.z, '| estado:', fakeGame.state, '| camMode:', fakeGame.camMode);
console.log('editor criado:', fakeGame.editor instanceof DevEditor);
p.update(1/60, {f:true,b:false,l:false,r:false,run:false}, room);
console.log('andou no plano: x=', p.x.toFixed(3), 'z=', p.z.toFixed(3));
fakeGame.editor.update(1/60);
console.log('overlay:', JSON.stringify(fakeGame.editor.el.textContent.split('\n')[0]));
// simula o acesso do loop a todos os campos que o game.js usa
for (const k of ['cams','d','doors','fx','group','id','interacts','name','pickups','portal','portalLight','solids','w']) {
  if (k === 'doors' || k === 'cams' || k === 'interacts' || k === 'pickups' || k === 'solids' || k === 'lights' || k === 'spawns') {
    if (!Array.isArray(room[k])) throw new Error('campo ' + k + ' nao e array!');
    for (const _ of room[k]) {}
  } else if (!(k in room)) throw new Error('faltou campo ' + k);
}
console.log('todos os 13 campos do room OK (doors iteravel!)');
// mesa-vitrine: RECALIBRACAO — as armas sairam (vitrine vazia de proposito)
const nomes = [];
room.group.traverse((o) => nomes.push(o.name));
const armas = [];
for (const a of armas) if (!nomes.includes(a)) throw new Error('falta ' + a + ' na mesa!');
for (const n of nomes) if (n.startsWith('exibe_')) throw new Error('arma ' + n + ' deveria ter saido da vitrine (recalibracao)!');
if (!nomes.includes('mesa_vitrine')) throw new Error('falta mesa!');
console.log('mesa-vitrine VAZIA OK (recalibracao de armas pendente)');
// camera enxerga camada 2 (faca do player visivel)
const mask = fakeGame.camera.layers.mask;
if (!((mask >> 2) & 1)) throw new Error('camera nao enxerga camada 2!');
console.log('camera com camada 2 OK (faca do player visivel)');
// o que tem na mao do player? (suspeita: kb/kh reativados)
const mao = [];
p.knifeM.traverse((o) => mao.push({ tipo: o.type, nome: o.name || '(sem nome)', vis: o.visible, layer: o.layers.mask, filhos: o.children ? o.children.length : 0 }));
console.log('knifeM do player:', JSON.stringify(mao, null, 1));
// ---------- features novas do editor ----------
const E = fakeGame.editor;
E.addBox();
const prim = E.selected;
if (!prim || !prim.name.startsWith('prim_')) throw new Error('addBox falhou');
const p0 = prim.position.clone();
E.pushUndo(); prim.position.x += 1;
E.undo();
if (Math.abs(prim.position.x - p0.x) > 1e-6) throw new Error('undo falhou');
E.duplicate();
const copia = E.selected;
if (!copia || copia === prim || !copia.name.includes('_copia')) throw new Error('duplicar falhou');
E.remove();
if (copia.parent) throw new Error('remover falhou');
E.select(prim);
const n0 = E.collect().length;
if (n0 < 1) throw new Error('collect vazio');
prim.position.z = 9.75;
E.snapshot(); // mutações passam pelo snapshot() (como os controles do editor fazem)
E.save();
prim.position.z = 0;
E.load();
if (Math.abs(prim.position.z - 9.75) > 1e-6) throw new Error('save/load falhou');
console.log('editor: caixa+undo+duplicar+remover+collect+save/load OK (' + n0 + ' objeto(s))');
console.log('LAB-OK');
