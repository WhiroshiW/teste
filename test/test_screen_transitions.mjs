import assert from 'node:assert';
import fs from 'node:fs';

console.log('=== TESTE DE TRANSIÇÕES SUAVES E LIMPEZA DE CACHE ===\n');

// 1. Verificar HTML de #screenCurtain e cabeçalhos de no-cache
const indexHtml = fs.readFileSync('index.html', 'utf-8');
assert(indexHtml.includes('id="screenCurtain"'), 'index.html deve conter #screenCurtain');
assert(indexHtml.includes('meta http-equiv="Cache-Control"'), 'index.html deve conter meta Cache-Control');
assert(indexHtml.includes('meta http-equiv="Pragma"'), 'index.html deve conter meta Pragma');
assert(indexHtml.includes('caches.delete'), 'index.html deve conter limpeza de caches de Service Worker');
console.log('  ✓ Marcação de #screenCurtain e scripts de limpeza de cache confirmados');

// 2. Verificar regras CSS de transição suave em css/style.css
const css = fs.readFileSync('css/style.css', 'utf-8');
assert(css.includes('#screenCurtain'), 'css/style.css deve conter estilos para #screenCurtain');
assert(css.includes('#screenCurtain.active'), 'css/style.css deve conter estado active para #screenCurtain');
assert(css.includes('overlayFadeIn'), 'css/style.css deve conter @keyframes overlayFadeIn');
assert(css.includes('screenContentReveal'), 'css/style.css deve conter @keyframes screenContentReveal');
assert(css.includes('tabFadeIn'), 'css/style.css deve conter @keyframes tabFadeIn');
console.log('  ✓ Animações CSS de transição suave e cortina cinemática confirmadas');

// 3. Verificar som de transição no AudioSys
import { AudioSys } from '../js/audio.js';
const audio = new AudioSys();
audio.sfx('uiTransition');
console.log('  ✓ Efeito sonoro uiTransition executado com sucesso');

// 4. Teste funcional de UI.transitionTo
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
    putImageData() {}, drawImage() {}, closePath() {},
  };
}
function makeCanvas(w = 64, h = 64) {
  return { width: w, height: h, getContext: () => make2d(), style: {}, addEventListener() {}, removeEventListener() {} };
}
function makeEl(id = '') {
  const el = {
    id,
    classList: {
      _classes: new Set(),
      add(c) { this._classes.add(c); },
      remove(c) { this._classes.delete(c); },
      toggle(c) { this._classes.has(c) ? this._classes.delete(c) : this._classes.add(c); },
      contains(c) { return this._classes.has(c); }
    },
    style: {}, children: [], width: 96, height: 96,
    innerHTML: '', textContent: '', value: '9', checked: true,
    appendChild(c) { el.children.push(c); return c; },
    querySelector: () => null,
    querySelectorAll: () => [],
    addEventListener() {},
    getContext: () => make2d(),
    onclick: null, oninput: null, onchange: null, onmouseenter: null, ondblclick: null,
  };
  return el;
}
globalThis.window = {
  innerWidth: 1280, innerHeight: 720,
  addEventListener: () => {}, removeEventListener: () => {},
  requestAnimationFrame: (cb) => { setTimeout(cb, 10); return 1; },
  cancelAnimationFrame: () => {},
  __SANTA_LUCIA_HEADLESS__: true,
};
globalThis.document = {
  hidden: false,
  createElement: (tag) => (tag === 'canvas' ? makeCanvas() : makeEl()),
  getElementById: (id) => makeEl(id),
  querySelector: () => null,
  querySelectorAll: () => [],
  addEventListener: () => {},
  body: makeEl('body'),
};
global.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
global.window = globalThis.window;
global.document = globalThis.document;

import * as THREE from '../vendor/three.module.min.js';
import { Game } from '../js/game.js';
const screenEl = makeEl('screen');
const game = new Game(THREE, screenEl);

assert(typeof game.ui.transitionTo === 'function', 'UI deve implementar transitionTo');

let transitionFired = false;
let doneFired = false;
game.ui.transitionTo(() => {
  transitionFired = true;
}, () => {
  doneFired = true;
});

assert(transitionFired, 'transitionTo deve executar a função de troca de tela');
assert(doneFired, 'transitionTo deve executar o callback onDone');
console.log('  ✓ UI.transitionTo executado com sucesso e callbacks invocados');

// 5. Teste de transição de tela: Title -> Options -> Title
game.titleAction('options');
assert(!game.ui.el.options.classList.contains('hidden'), 'Tela de opções deve estar visível após titleAction("options")');
assert(game.ui.el.title.classList.contains('hidden'), 'Tela de título deve estar oculta');

game.ui.hideOptions();
game.ui.showTitle(false);
assert(!game.ui.el.title.classList.contains('hidden'), 'Tela de título deve estar visível após retornar');

console.log('  ✓ Transição de ida e volta entre menus 100% validada');

// 6. Verificar cabeçalhos de serve.py
const servePy = fs.readFileSync('serve.py', 'utf-8');
assert(servePy.includes('Clear-Site-Data'), 'serve.py deve incluir Clear-Site-Data para invalidar caches antigos');
assert(servePy.includes('no-store'), 'serve.py deve incluir no-store');
console.log('  ✓ Cabeçalhos de Clear-Site-Data e No-Store no servidor HTTP confirmados');

console.log('\n✓ POLIMENTO DE TRANSIÇÕES E LIMPEZA DE CACHE 100% TESTADO E AUDITADO!');
process.exit(0);
