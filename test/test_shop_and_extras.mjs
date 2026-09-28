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
const { SHOP_ITEMS } = await import('../js/config.js');

let fails = 0;
const assert = (cond, msg) => {
  if (!cond) {
    fails++;
    console.error(`  ❌ FALHA: ${msg}`);
  } else {
    console.log(`  ✓ ${msg}`);
  }
};

console.log('=== TESTE DE LOJA SECRETA E MODOS EXTRAS ===\n');
const game = new Game(THREE, makeEl('container'));

assert(game.points === 500, 'Inicia com 500 pontos de bônus inicial de boas-vindas');
assert(!game.unlocks.extra_mercenaries, 'Modo Mercenários inicia bloqueado');
assert(!game.unlocks.extra_survivor, 'Modo Sobrevivente inicia bloqueado');
assert(!game.unlocks.extra_bento, 'Turno de Bento inicia bloqueado');

// Adicionar pontos e comprar
game.addPoints(5000, 'Recompensa de Campanha');
assert(game.points === 5500, '5500 pontos acumulados com sucesso');

const mercItem = SHOP_ITEMS.find(i => i.id === 'extra_mercenaries');
game.buyShopItem(mercItem);
assert(game.unlocks.extra_mercenaries === true, 'Modo Mercenários desbloqueado na loja');
assert(game.points === 4500, 'Pontos deduzidos corretamente (4500)');

const survItem = SHOP_ITEMS.find(i => i.id === 'extra_survivor');
game.buyShopItem(survItem);
assert(game.unlocks.extra_survivor === true, 'Modo Sobrevivente desbloqueado na loja');
assert(game.points === 3500, 'Pontos deduzidos corretamente (3500)');

const bentoItem = SHOP_ITEMS.find(i => i.id === 'extra_bento');
game.buyShopItem(bentoItem);
assert(game.unlocks.extra_bento === true, 'Turno do Bento desbloqueado na loja');
assert(game.points === 2300, 'Pontos deduzidos corretamente (2300)');

// Teste de Persistência: recriar o jogo e ler do localStorage
const reloadedGame = new Game(THREE, makeEl('container'));
assert(reloadedGame.points === 2300, 'Pontos persistidos no localStorage após reload');
assert(reloadedGame.unlocks.extra_mercenaries === true, 'Desbloqueio Mercenários persistido');
assert(reloadedGame.unlocks.extra_survivor === true, 'Desbloqueio Sobrevivente persistido');
assert(reloadedGame.unlocks.extra_bento === true, 'Desbloqueio Bento persistido');

// Iniciar e testar Modo Mercenários
reloadedGame.startMercenaries();
assert(reloadedGame.gameMode === 'mercenaries', 'Modo Mercenários iniciado com sucesso');
assert(reloadedGame.room.id === 'saguao', 'Mercenários inicia no Saguão');
assert(reloadedGame.hasItem('shotgun'), 'Possui escopeta no modo Mercenários');
assert(reloadedGame.mercTimer > 0, 'Cronômetro do Mercenários ativo');

// Iniciar e testar Modo Sobrevivente
reloadedGame.startSurvivor();
assert(reloadedGame.gameMode === 'survivor', 'Modo Sobrevivente iniciado com sucesso');
assert(reloadedGame.room.id === 'floresta', 'Sobrevivente inicia na Floresta');
assert(reloadedGame.survivorWave === 1, 'Onda 1 iniciada');

// Iniciar e testar Turno do Bento
reloadedGame.startCampaign('bento');
assert(reloadedGame.currentCampaign === 'bento', 'Turno do Bento iniciado');
assert(reloadedGame.room.id === 'porao', 'Bento inicia no Porão');

console.log(fails === 0 ? '\n✓ LOJA E MODOS EXTRAS AUDITADOS E 100% FUNCIONAIS!' : `\n❌ ${fails} FALHA(S)`);
process.exit(fails === 0 ? 0 : 1);
