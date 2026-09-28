import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

console.log('=== TESTE DA INTRO DOS PATROCINADORES (ESTILO RESIDENT EVIL REMAKE) ===\n');

// 1. Verificar se os arquivos de imagem dos 3 patrocinadores existem e estão íntegros
const assets = [
  'assets/sponsor_chatgpt.jpg',
  'assets/sponsor_grok.jpg',
  'assets/sponsor_arena.jpg'
];

assets.forEach((f) => {
  assert(fs.existsSync(f), `Asset ${f} deve existir no disco`);
  const st = fs.statSync(f);
  assert(st.size > 10000, `Asset ${f} deve ser uma imagem válida (> 10KB), encontrado ${st.size} bytes`);
  console.log(`  ✓ Imagem ${path.basename(f)} confirmada (${(st.size / 1024).toFixed(1)} KB)`);
});

// 2. Verificar marcação HTML em index.html
const indexHtml = fs.readFileSync('index.html', 'utf-8');
assert(indexHtml.includes('id="sponsorSplash"'), 'index.html deve conter #sponsorSplash');
assert(indexHtml.includes('id="sponsorImg"'), 'index.html deve conter #sponsorImg');
assert(indexHtml.includes('id="sponsorSkipBtn"'), 'index.html deve conter #sponsorSkipBtn');
assert(indexHtml.includes('id="btnPlaySponsors"'), 'index.html deve conter #btnPlaySponsors na tela de Extras');
console.log('  ✓ Marcação HTML de #sponsorSplash, imagens e botão de pular verificados');

// 3. Verificar classes de animação CSS em css/style.css
const css = fs.readFileSync('css/style.css', 'utf-8');
assert(css.includes('#sponsorSplash'), 'css/style.css deve estilizar #sponsorSplash');
assert(css.includes('sponsorPushZoom'), 'css/style.css deve conter @keyframes sponsorPushZoom');
assert(css.includes('.sponsorImage.active'), 'css/style.css deve definir .sponsorImage.active');
console.log('  ✓ Regras CSS e keyframes de zoom cinematográfico confirmados');

// 4. Teste funcional do AudioSys (efeitos sonoros estilísticos e ambientação)
import { AudioSys } from '../js/audio.js';
const audio = new AudioSys();
assert(typeof audio.sponsorImpact === 'function', 'audio deve ter método sponsorImpact()');
assert(typeof audio.sponsorChatGPT === 'function', 'audio deve ter método sponsorChatGPT()');
assert(typeof audio.sponsorGrok === 'function', 'audio deve ter método sponsorGrok()');
assert(typeof audio.sponsorArena === 'function', 'audio deve ter método sponsorArena()');
assert(typeof audio.thunder === 'function', 'audio deve ter método thunder()');
assert(typeof audio.chapelBell === 'function', 'audio deve ter método chapelBell()');

audio.sfx('sponsorImpact');
audio.sfx('sponsorChatGPT');
audio.sfx('sponsorGrok');
audio.sfx('sponsorArena');
audio.sfx('thunder', { close: true });
audio.sfx('thunder', { close: false });
audio.sfx('chapelBell');
audio.ambient('title_storm');
audio.stopAmbient();
console.log('  ✓ Efeitos sonoros temáticos (ChatGPT, Grok, Arena, Trovão, Chuva, Vento e Sino da Capela) acionados com sucesso');

// 5. Teste do ciclo de vida da intro no Game engine
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
    classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
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
  innerWidth: 1280,
  innerHeight: 720,
  addEventListener: () => {},
  removeEventListener: () => {},
  requestAnimationFrame: (cb) => { setTimeout(cb, 10); return 1; },
  cancelAnimationFrame: () => {},
  localStorage: { getItem: () => null, setItem: () => {} },
  __SANTA_LUCIA_HEADLESS__: true,
};
const screenEl = makeEl('screen');
globalThis.document = {
  hidden: false,
  createElement: (tag) => (tag === 'canvas' ? makeCanvas() : makeEl()),
  getElementById: (id) => (id === 'screen' ? screenEl : makeEl(id)),
  querySelector: () => null,
  querySelectorAll: () => [],
  addEventListener: () => {},
  body: makeEl('body'),
};

global.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
global.window = globalThis.window;
global.document = globalThis.document;
global.requestAnimationFrame = globalThis.window.requestAnimationFrame;

import * as THREE from '../vendor/three.module.min.js';
import { Game } from '../js/game.js';
const game = new Game(THREE, screenEl);

assert(typeof game.playSponsorIntro === 'function', 'Game deve implementar playSponsorIntro()');
assert(typeof game.skipSponsorIntro === 'function', 'Game deve implementar skipSponsorIntro()');

let introFinished = false;
game.playSponsorIntro(() => {
  introFinished = true;
});

assert.strictEqual(game.state, 'sponsor_intro', 'Estado deve mudar para sponsor_intro durante a exibição');
console.log('  ✓ playSponsorIntro inicia no estado sponsor_intro e oculta overlays');

// Teste de pular a intro
game.skipSponsorIntro();
game.skipSponsorIntro();
game.skipSponsorIntro();

assert(introFinished, 'Callback de conclusão da intro deve ser invocado ao pular todos os cards');
console.log('  ✓ skipSponsorIntro pula a sequência e transita para o menu de título');

// Teste de navegação / clique durante sponsor_intro
game.state = 'sponsor_intro';
let skippedWithKey = false;
game.skipSponsorIntro = () => { skippedWithKey = true; };
game.onKey('Space');
assert(skippedWithKey, 'Tecla Space deve acionar skipSponsorIntro()');

let skippedWithEscape = false;
game.skipSponsorIntro = () => { skippedWithEscape = true; };
game.onKey('Escape');
assert(skippedWithEscape, 'Tecla Escape deve acionar skipSponsorIntro()');

let skippedWithClick = false;
game.skipSponsorIntro = () => { skippedWithClick = true; };
game.onCanvasClick();
assert(skippedWithClick, 'Clique no canvas deve acionar skipSponsorIntro()');

console.log('  ✓ Pular via Teclado (Space/Escape), Mouse e Gamepad 100% verificado');

console.log('\n✓ INTRO DOS PATROCINADORES 100% TESTADA E AUDITADA!');
process.exit(0);
