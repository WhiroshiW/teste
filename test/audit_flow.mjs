import * as THREE from '../vendor/three.module.min.js';
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
  return { width: w, height: h, getContext: () => make2d(), style: {} };
}
function makeEl() {
  const el = {
    classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
    style: {}, children: [], width: 96, height: 96,
    innerHTML: '', textContent: '', value: '9', checked: true,
    appendChild(c) { el.children.push(c); return c; },
    querySelector: () => null, querySelectorAll: () => [],
    addEventListener() {}, getContext: () => make2d(),
  };
  return el;
}
global.window = {};
global.document = {
  createElement: (tag) => (tag === 'canvas' ? makeCanvas() : makeEl()),
  getElementById: () => makeEl(),
};
global.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
global.requestAnimationFrame = (fn) => setTimeout(fn, 0);

const { buildTextures } = await import('../js/textures.js');
const { buildRoom, ROOM_IDS } = await import('../js/world.js');
const { ITEMS, CAMPAIGNS } = await import('../js/config.js');
const TEX = buildTextures(THREE);

console.log('=== 1. AUDITORIA DE PORTAS E TRANCA ===');
const doors = [];
for (const id of ROOM_IDS) {
  const r = buildRoom(THREE, TEX, id);
  for (const d of r.doors) {
    doors.push({ room: id, ...d });
    const needStr = d.need ? JSON.stringify(d.need) : 'LIVRE';
    console.log(`[${id}] -> [${d.target}] "${d.label}" | Requisito: ${needStr} | Consome: ${d.consume || false} | SetFlag: ${d.setFlag || 'nenhuma'}`);
  }
}

console.log('\n=== 2. AUDITORIA DE INTERAÇÕES E PUZZLES (doAct) ===');
for (const id of ROOM_IDS) {
  const r = buildRoom(THREE, TEX, id);
  for (const it of r.interacts) {
    console.log(`[${id}] act="${it.act}" prompt="${it.prompt}" (x=${it.x}, z=${it.z})`);
  }
}

console.log('\n=== 3. AUDITORIA DE PICKUPS NO CHÃO ===');
for (const id of ROOM_IDS) {
  const r = buildRoom(THREE, TEX, id);
  for (const p of r.pickups) {
    console.log(`[${id}] item="${p.item}" qty=${p.qty} page=${p.page} uid="${p.uid}" (x=${p.x}, z=${p.z})`);
  }
}

console.log('\n=== 4. ITENS DO TIPO CHAVE / PROGRESSÃO EM CONFIG.JS ===');
for (const [k, v] of Object.entries(ITEMS)) {
  if (v.type === 'key' || v.type === 'puzzle') {
    console.log(`Item: ${k} -> "${v.name}" (${v.type}) desc: "${v.desc}"`);
  }
}

console.log('\n=== 5. ITENS INICIAIS DAS CAMPANHAS ===');
for (const [campId, camp] of Object.entries(CAMPAIGNS)) {
  console.log(`Campanha: ${campId} (${camp.title})`);
  console.log(`  Sala inicial: ${camp.startRoom} (${camp.startX}, ${camp.startZ})`);
  console.log(`  Itens:`, camp.startItems);
}
