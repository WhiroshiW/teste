import * as RealTHREE from '../vendor/three.module.min.js';

const gradStub = { addColorStop() {} };
function make2d() {
  return {
    canvas: null, fillStyle: '', strokeStyle: '', lineWidth: 1, font: '',
    imageSmoothingEnabled: false,
    fillRect() {}, clearRect() {}, strokeRect() {}, fillText() {},
    beginPath() {}, arc() {}, ellipse() {}, moveTo() {}, lineTo() {},
    bezierCurveTo() {}, fill() {}, stroke() {}, save() {}, restore() {},
    translate() {}, rotate() {},
    createLinearGradient() { return gradStub; },
    createRadialGradient() { return gradStub; },
    getImageData(x, y, w, h) { return { data: new Uint8ClampedArray(w * h * 4), width: w, height: h }; },
    putImageData() {}, drawImage() {},
  };
}
function makeCanvas(w = 64, h = 64) {
  return { width: w, height: h, clientWidth: 800, clientHeight: 600, getContext: () => make2d(), style: {}, addEventListener() {}, removeEventListener() {} };
}
function makeEl(id = '') {
  const el = {
    id, classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
    style: {}, children: [], width: 96, height: 96, clientWidth: 800, clientHeight: 600,
    innerHTML: '', textContent: '', value: '9', checked: true,
    appendChild(c) { el.children.push(c); return c; },
    querySelector: () => null, querySelectorAll: () => [],
    addEventListener() {}, getContext: () => make2d(),
    onclick: null, oninput: null, onchange: null, onmouseenter: null, ondblclick: null,
  };
  return el;
}
global.window = { innerWidth: 800, innerHeight: 600, addEventListener() {}, removeEventListener() {} };
global.document = {
  createElement: (tag) => (tag === 'canvas' ? makeCanvas() : makeEl()),
  getElementById: (id) => makeEl(id),
  body: makeEl('body'),
  addEventListener() {},
  removeEventListener() {},
};
global.localStorage = {
  data: {},
  getItem(k) { return this.data[k] || null; },
  setItem(k, v) { this.data[k] = v; },
  removeItem(k) { delete this.data[k]; },
};
global.performance = { now: () => Date.now() };
global.requestAnimationFrame = (fn) => setTimeout(fn, 16);

class MockRenderer { constructor() { this.domElement = makeCanvas(320, 180); } setSize() {} setPixelRatio() {} setClearColor() {} setRenderTarget() {} render() {} setAnimationLoop() {} }
const THREE = { ...RealTHREE, WebGLRenderer: MockRenderer };
const { Game } = await import('../js/game.js');
const { Particles } = await import('../js/entities.js');

let fails = 0;
const assert = (cond, msg) => {
  if (!cond) {
    fails++;
    console.error(`  ❌ FALHA: ${msg}`);
  } else {
    console.log(`  ✓ ${msg}`);
  }
};

console.log('=== TESTE DE PARTÍCULAS, NOVOS INIMIGOS E RE HUD ===\n');

// 1. Teste de Partículas
const scene = new THREE.Scene();
const partSys = new Particles(THREE, scene, {});
assert(partSys.pos[1] <= -9000, 'Partículas iniciam fora da tela (y <= -9000)');

partSys.burst(0, 1.5, 0, 10, 'blood');
let hasActive = false;
for (let i = 0; i < partSys.N; i++) {
  if (partSys.life[i] > 0 && partSys.pos[i * 3 + 1] > 0) hasActive = true;
}
assert(hasActive, 'Burst criou partículas ativas com posição no mundo');

// Avançar tempo até todas expirarem
for (let step = 0; step < 20; step++) {
  partSys.update(0.1);
}
let lingering = 0;
for (let i = 0; i < partSys.N; i++) {
  if (partSys.life[i] <= 0 && partSys.pos[i * 3 + 1] > -5000) lingering++;
}
assert(lingering === 0, 'Partículas mortas foram imediatamente removidas da tela (y = -9999)');

partSys.burst(0, 1.5, 0, 10, 'spark');
partSys.clear();
let anyVisible = 0;
for (let i = 0; i < partSys.N; i++) {
  if (partSys.pos[i * 3 + 1] > -5000) anyVisible++;
}
assert(anyVisible === 0, 'clear() limpou 100% das partículas da cena sem poluir o mapa');

// 2. Teste dos Novos Inimigos na Campanha Daniel
const game = new Game(THREE, makeEl('container'));
game.ui.doorAnim = (elevator, cb) => { if (cb) cb(); };
game.say = (lines, cb) => { if (cb) cb(); };
game.startCampaign('daniel');

// Saguão deve ter Paciente Contorcido e Carniçal
game.loadRoom('saguao', 0, 0, 0);
const hasInfectado = game.enemies.some(e => e.type === 'infectado');
const hasRastejador = game.enemies.some(e => e.type === 'rastejador');
assert(hasInfectado, 'Novo inimigo Infectado (Paciente Contorcido) presente no Saguão');
assert(hasRastejador, 'Inimigo Carniçal Rastejador presente no Saguão');
assert(game.enemies.length >= 3, `Saguão mais desafiador com ${game.enemies.length} inimigos`);

// Enfermaria deve ter a Enfermeira Cirúrgica
game.loadRoom('enfermaria', 0, 0, 0);
const hasEnfermeira = game.enemies.some(e => e.type === 'enfermeira');
assert(hasEnfermeira, 'Novo inimigo Enfermeira Cirúrgica presente na Enfermaria');

// Porão deve ter a Aberração das Caldeiras (Amálgama de Cinzas)
game.loadRoom('porao', 0, 0, 0);
const hasAberracao = game.enemies.some(e => e.type === 'aberracao');
assert(hasAberracao, 'Novo inimigo Amálgama de Cinzas presente no Porão das caldeiras');

// 3. Teste do Sistema de Combinação (RE Style)
game.inv = [
  { item: 'ammo9', qty: 15, equipped: false },
  { item: 'pistol', qty: 1, equipped: false },
  { item: 'pills', qty: 1, equipped: false },
  { item: 'pills', qty: 2, equipped: false },
];
// Combinar munição com pistola
game.combineItems(0, 1);
assert(game.equipped === 'pistol', 'Combinar Munição 9mm com Pistola equipou e carregou a arma');

// Combinar pílulas com pílulas
game.combineItems(2, 3);
const remainingPills = game.inv.filter(i => i.item === 'pills');
assert(remainingPills.length === 1 && remainingPills[0].qty === 3, 'Combinar remédios empilhou as doses em 1 frasco');

// 4. Teste do HUD de Salvamento Estilo Resident Evil
game.inv.push({ item: 'ribbon', qty: 2, equipped: false });
game.openSaveBox();
assert(game.state === 'savebox', 'Estado mudou para savebox ao abrir máquina de escrever');

console.log(fails === 0 ? '\n✓ PARTÍCULAS, INIMIGOS E RESIDENT EVIL HUD AUDITADOS COM SUCESSO!' : `\n❌ ${fails} FALHA(S)`);
process.exit(fails === 0 ? 0 : 1);
