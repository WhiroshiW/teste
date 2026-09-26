import * as RealTHREE from '../vendor/three.module.min.js';

const gradStub = { addColorStop() {} };
function make2d() {
  return {
    canvas: null, fillStyle: '', strokeStyle: '', lineWidth: 1, font: '',
    imageSmoothingEnabled: false,
    fillRect() {}, clearRect() {}, strokeRect() {}, fillText() {},
    beginPath() {}, arc() {}, ellipse() {}, moveTo() {}, lineTo() {},
    bezierCurveTo() {}, fill() {}, stroke() {}, save() {}, restore() {},
    translate() {}, rotate() {}, closePath() {},
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
    id, classList: {
      items: new Set(),
      add(c) { this.items.add(c); },
      remove(c) { this.items.delete(c); },
      toggle(c, v) { if (v === undefined) v = !this.items.has(c); if (v) this.items.add(c); else this.items.delete(c); },
      contains(c) { return this.items.has(c); },
    },
    style: {}, children: [], width: 96, height: 96, clientWidth: 800, clientHeight: 600,
    innerHTML: '', textContent: '', value: '9', checked: true,
    appendChild(c) { el.children.push(c); return c; },
    querySelector(sel) { return null; },
    querySelectorAll(sel) { return []; },
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

let fails = 0;
const assert = (cond, msg) => {
  if (!cond) {
    fails++;
    console.error(`  ❌ FALHA: ${msg}`);
  } else {
    console.log(`  ✓ ${msg}`);
  }
};

console.log('=== TESTE DO NOVO DESIGN DE MENUS (FOLHA DO CADERNO) ===\n');

const game = new Game(THREE, makeEl('screen'));

// 1. Menu Principal (4 opções do topo da folha: JOGAR, CARREGAR, CONFIGURAÇÕES, EXTRA)
console.log('--- 1. Menu Principal à Direita (Diorama 3D à Esquerda) ---');
game.toTitle();
assert(game.ui.titleItems.length === 4, 'Menu de título possui exatamente as 4 opções pedidas');
assert(game.ui.titleItems[0] === 'play', 'Opção 1 é JOGAR (play)');
assert(game.ui.titleItems[1] === 'load', 'Opção 2 é CARREGAR (load)');
assert(game.ui.titleItems[2] === 'options', 'Opção 3 é CONFIGURAÇÕES (options)');
assert(game.ui.titleItems[3] === 'extras', 'Opção 4 é EXTRA (extras)');

// Teste de ação JOGAR
game.titleAction('play');
assert(!game.ui.el.campaignSelect.classList.contains('hidden'), 'JOGAR abre a seleção de campanha (Daniel/Clara)');

// Teste de ação CONFIGURAÇÕES (Painel Elétrico)
console.log('\n--- 2. Tela de Configurações: Painel Elétrico de Fundo ---');
game.titleAction('options');
assert(!game.ui.el.options.classList.contains('hidden'), 'CONFIGURAÇÕES abre o Painel Elétrico Industrial de fundo');

// Teste de ação EXTRA (Loja de Pontos & Modelos 3D com Estante e Mesa)
console.log('\n--- 3. Tela de Extras: Loja de Pontos, Estante & Mesa com Vela ---');
game.titleAction('extras');
assert(!game.ui.el.pointsShop.classList.contains('hidden'), 'EXTRA abre a Loja de Pontos e Modelos 3D');
assert(game.ui.el.shopList.children.length > 0, 'Estante possui prateleiras com itens e colecionáveis');

console.log(fails === 0 ? '\n✓ NOVO DESIGN DE MENUS AUDITADO COM SUCESSO TOTAL!' : `\n❌ ${fails} FALHA(S)`);
process.exit(fails === 0 ? 0 : 1);
