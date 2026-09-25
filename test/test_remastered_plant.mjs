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
const { buildTextures } = await import('../js/textures.js');
const { buildRoom, ROOM_IDS } = await import('../js/world.js');

let fails = 0;
const assert = (cond, msg) => {
  if (!cond) {
    fails++;
    console.error(`  ❌ FALHA: ${msg}`);
  } else {
    console.log(`  ✓ ${msg}`);
  }
};

console.log('=== TESTE DE VALIDAÇÃO DA PLANTA REMASTERIZADA (4 FOLHAS) ===\n');

const TEX = buildTextures(THREE);

// 1. FOLHA P1: Térreo e Áreas Externas
console.log('--- 1. Setor P1: Térreo & Externos ---');
const saguao = buildRoom(THREE, TEX, 'saguao');
const corQuartos = buildRoom(THREE, TEX, 'corredor_quartos');
const q2 = buildRoom(THREE, TEX, 'quarto2');
const estufa = buildRoom(THREE, TEX, 'estufa');
const cemiterio = buildRoom(THREE, TEX, 'cemiterio');
const jardim = buildRoom(THREE, TEX, 'jardim');
const casaZelador = buildRoom(THREE, TEX, 'casa_zelador');

assert(saguao.doors.some(d => d.target === 'corredor_quartos'), 'Saguão conecta com Corredor dos Quartos');
assert(saguao.doors.some(d => d.target === 'estufa'), 'Saguão conecta com Estufa Botânica (Sul)');
assert(saguao.doors.some(d => d.target === 'cemiterio'), 'Saguão conecta com Lápides do Cemitério (Norte)');
assert(saguao.doors.some(d => d.target === 'jardim'), 'Saguão conecta com Pátio Externo & Canil (Leste)');
assert(saguao.doors.some(d => d.target === 'mezanino'), 'Saguão possui escadaria para o Mezanino (2º Andar)');

assert(corQuartos.doors.some(d => d.target === 'quarto'), 'Corredor dos Quartos conecta com Quarto 1 (Daniel)');
assert(corQuartos.doors.some(d => d.target === 'quarto2'), 'Corredor dos Quartos conecta com Quarto 2 (Cofre)');
assert(q2.interacts.some(i => i.act === 'safe'), 'Quarto 2 possui o grande Cofre de Ferro');

assert(estufa.pickups.some(p => p.item === 'herbicide'), 'Estufa contém o Composto Herbicida');
assert(jardim.pickups.some(p => p.item === 'greenhouse_key'), 'Canil/Jardim contém a Chave da Estufa');
assert(jardim.doors.some(d => d.target === 'casa_zelador'), 'Jardim conecta com a Casa do Zelador Bento');
assert(casaZelador.pickups.some(p => p.item === 'crowbar'), 'Casa do Zelador contém o Pé de Cabra de Bento');

// 2. FOLHA P2: Segundo Andar & Caldeiras
console.log('\n--- 2. Setor P2: Segundo Andar & Caldeiras ---');
const mezanino = buildRoom(THREE, TEX, 'mezanino');
const enfermaria = buildRoom(THREE, TEX, 'enfermaria');
const consultorio = buildRoom(THREE, TEX, 'consultorio');
const porao = buildRoom(THREE, TEX, 'porao');

assert(mezanino.doors.some(d => d.target === 'saguao'), 'Mezanino conecta descendo para o Saguão (P1)');
assert(mezanino.doors.some(d => d.target === 'corredor_p3'), 'Mezanino conecta subindo para o 3º Andar (P3)');
assert(mezanino.doors.some(d => d.target === 'enfermaria'), 'Mezanino conecta com Ala Médica');
assert(mezanino.doors.some(d => d.target === 'porao'), 'Mezanino conecta com Ala das Caldeiras');
assert(enfermaria.interacts.some(i => i.act === 'fusebox'), 'Ala Médica contém o Painel Elétrico');
assert(enfermaria.doors.some(d => d.target === 'consultorio'), 'Ala Médica conecta com Escritório do Dr. Alencastro');
assert(porao.interacts.some(i => i.act === 'valve'), 'Ala das Caldeiras contém a Válvula de drenagem');

// 3. FOLHA P3: Terceiro Andar & Terraço do Heliponto
console.log('\n--- 3. Setor P3: Terceiro Andar & Terraço Heliponto ---');
const corP3 = buildRoom(THREE, TEX, 'corredor_p3');
const salaDrP3 = buildRoom(THREE, TEX, 'sala_dr_p3');
const terraco = buildRoom(THREE, TEX, 'terraco');

assert(corP3.doors.some(d => d.target === 'mezanino'), 'Corredor P3 conecta descendo ao Mezanino P2');
assert(corP3.doors.some(d => d.target === 'sala_dr_p3'), 'Corredor P3 conecta com Sala do Dr. Alencastro');
assert(corP3.doors.some(d => d.target === 'terraco'), 'Corredor P3 conecta subindo para o Terraço');
assert(salaDrP3.pickups.some(p => p.item === 'terrace_key'), 'Sala Confidencial P3 contém o Cartão do Heliponto');
assert(terraco.interacts.some(i => i.act === 'memorial'), 'Terraço possui o Memorial e a arena do Heliponto');

// 4. FOLHA EXTRAS: Subsolo Secreto & Culto
console.log('\n--- 4. Setor Extras: Subsolo, Santuário do Culto & Experimentos ---');
const subCorredor = buildRoom(THREE, TEX, 'subsolo_corredor');
const culto = buildRoom(THREE, TEX, 'culto');
const experimentos = buildRoom(THREE, TEX, 'experimentos');

assert(subCorredor.doors.some(d => d.target === 'porao'), 'Subsolo conecta com as Caldeiras');
assert(subCorredor.doors.some(d => d.target === 'culto'), 'Subsolo conecta com Santuário do Culto');
assert(subCorredor.doors.some(d => d.target === 'experimentos'), 'Subsolo conecta com Sala de Experimentos');
assert(culto.pickups.some(p => p.item === 'cult_symbol'), 'Santuário do Culto contém o Talismã no Altar');
assert(experimentos.pickups.some(p => p.item === 'alencastro_dossier'), 'Sala de Experimentos contém o Dossiê das Cobaias');

console.log(fails === 0 ? '\n✓ TODAS AS 4 FOLHAS DA PLANTA FORAM AUDITADAS COM SUCESSO TOTAL!' : `\n❌ ${fails} FALHA(S)`);
process.exit(fails === 0 ? 0 : 1);
