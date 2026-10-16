// ============================================================
// TESTE DO NOVO MENU CARREGAR E SALVAR (IDÊNTICO À REFERÊNCIA)
// ============================================================
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
    id, classList: {
      _classes: new Set(),
      add(c) { this._classes.add(c); },
      remove(c) { this._classes.delete(c); },
      toggle(c) { this._classes.has(c) ? this._classes.delete(c) : this._classes.add(c); },
      contains(c) { return this._classes.has(c); }
    },
    style: {}, children: [], width: 96, height: 96, clientWidth: 800, clientHeight: 600,
    innerHTML: '', textContent: '', value: '9', checked: true,
    appendChild(c) { el.children.push(c); return c; },
    querySelector: () => null, querySelectorAll: () => [],
    addEventListener() {}, getContext: () => make2d(),
    setAttribute(k, v) { this[k] = v; },
    onclick: null, oninput: null, onchange: null, onmouseenter: null, ondblclick: null,
  };
  return el;
}
global.window = { innerWidth: 1280, innerHeight: 720, addEventListener() {}, removeEventListener() {} };
global.document = {
  createElement: (tag) => (tag === 'canvas' ? makeCanvas() : makeEl()),
  getElementById: (id) => makeEl(id),
  body: makeEl('body'),
  addEventListener() {},
  removeEventListener() {},
  querySelectorAll: () => [],
};
global.localStorage = {
  data: {},
  getItem(k) { return this.data[k] || null; },
  setItem(k, v) { this.data[k] = String(v); },
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

console.log('=== TESTE DO NOVO MENU CARREGAR E SALVAR (6 SLOTS) ===\n');

const game = new Game(THREE, makeEl('screen'));

// 1. Inicia sem saves nos slots
const initialSlots = game.getSaveSlots();
assert(initialSlots.length === 6, 'Menu possui exatamente 6 slots de salvamento');
assert(initialSlots[0].empty === true, 'Slot 01 inicia VAGO');
assert(initialSlots[1].empty === true, 'Slot 02 inicia VAGO');
assert(initialSlots[2].empty === true, 'Slot 03 inicia VAGO');

// 2. Salvar no Slot 03 (Noite sem Fim)
game.currentCampaign = 'daniel';
game.loadRoom('saguao', 0, 0, 0);
game.saveToSlot(3);
const slotsAfterSave3 = game.getSaveSlots();
assert(slotsAfterSave3[2].empty === false, 'Slot 03 agora está ocupado com registro');
assert(slotsAfterSave3[2].title === 'NOITE SEM FIM', 'Título narrativo do Slot 03 é "NOITE SEM FIM"');
assert(slotsAfterSave3[2].date.includes('/1924'), 'Data do prontuário formatada em 1924');

// 3. Salvar no Slot 04 na Enfermaria (O Silêncio dos Esquecidos)
game.loadRoom('enfermaria', 0, 0, 0);
game.saveToSlot(4);
const slotsAfterSave4 = game.getSaveSlots();
assert(slotsAfterSave4[3].title === 'O SILÊNCIO DOS ESQUECIDOS', 'Slot 04 na Enfermaria recebe "O SILÊNCIO DOS ESQUECIDOS"');

// 4. Salvar no Slot 05 no Consultório (Sussurros na Ala Leste)
game.loadRoom('consultorio', 0, 0, 0);
game.saveToSlot(5);
const slotsAfterSave5 = game.getSaveSlots();
assert(slotsAfterSave5[4].title === 'SUSSURROS NA ALA LESTE', 'Slot 05 no Consultório recebe "SUSSURROS NA ALA LESTE"');

// 5. Carregar do Slot 03
const loaded = game.loadFromSlot(3);
assert(loaded === true, 'Carregamento do Slot 03 bem-sucedido');
assert(game.room.id === 'saguao', 'Posição do jogador restaurada para o Saguão');

// 6. Deletar Slot 03
game.deleteSlot(3);
const slotsAfterDelete = game.getSaveSlots();
assert(slotsAfterDelete[2].empty === true, 'Slot 03 voltou a ficar VAGO após exclusão');
assert(slotsAfterDelete[3].empty === false, 'Slot 04 permanece salvo após deletar o 03');

// 7. Abertura da Tela via Title e via Máquina de Escrever
game.toTitle();
game.titleAction('load');
assert(!game.ui.el.saveBox.classList.contains('hidden'), 'Ação CARREGAR no menu principal abre a nova tela de salvamento');
assert(game.ui._saveMode === 'load', 'Tela aberta em modo "load" (SAVES)');

game.inv.push({ item: 'ribbon', qty: 2, equipped: false });
game.openSaveBox();
assert(game.ui._saveMode === 'create', 'Máquina de escrever abre a tela em modo "create" (CRIAR)');
assert(game.state === 'savebox', 'Estado do jogo definido como savebox');

console.log(fails === 0 ? '\n✓ NOVO MENU CARREGAR E SALVAR AUDITADO COM SUCESSO TOTAL!' : `\n❌ ${fails} FALHA(S)`);
process.exit(fails === 0 ? 0 : 1);
