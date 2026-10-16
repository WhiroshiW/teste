// Dump do QUARTO 1 para render offline (olhos): geometria + cor real do material
// + textura procedural real (via @napi-rs/canvas). Uso: node tools/render_room_dump.mjs [quarto|quarto2]
import { createCanvas } from '@napi-rs/canvas';
import fs from 'fs';

const gradStub = { addColorStop() {} };
global.window = { addEventListener() {} };
global.location = { search: '?playtest' };
global.document = {
  addEventListener() {},
  createElement: (t) => (t === 'canvas' ? createCanvas(64, 64) : { style: {}, appendChild() {} }),
  body: { appendChild() {}, style: {} },
};
global.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
global.Image = class {};
global.Audio = class {};

const THREE = await import('../vendor/three.module.min.js');
const { buildTextures } = await import('../js/textures.js');
const TEX = buildTextures(THREE);
const { buildRoom } = await import('../js/world.js');

const ROOM = process.argv[2] || 'quarto';
const room = buildRoom(THREE, TEX, ROOM);
room.group.updateMatrixWorld(true);

const texCache = new Map();
const v = new THREE.Vector3();
const meshes = [];
room.group.traverse((o) => {
  if (!o.isMesh || !o.visible) return;
  for (let q = o; q && q !== room.group; q = q.parent) if (!q.visible) return;
  const g = o.geometry;
  if (!g || !g.attributes.position) return;
  const pos = g.attributes.position;
  const idx = g.index ? Array.from(g.index.array) : null;
  const world = [];
  for (let i = 0; i < pos.count; i++) { v.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld); world.push(v.x, v.y, v.z); }
  let col = [150, 120, 100];
  let texKey = null;
  const m = o.material;
  if (m) {
    if (m.color) col = [Math.round(m.color.r * 255), Math.round(m.color.g * 255), Math.round(m.color.b * 255)];
    if (m.map && m.map.image && m.map.image.toDataURL) {
      const img = m.map.image;
      const key = img.width + 'x' + img.height + ':' + (texCache.size);
      if (!texCache.has(img)) texCache.set(img, key);
      texKey = texCache.get(img);
    }
  }
  meshes.push({ world, uvs: g.attributes.uv ? Array.from(g.attributes.uv.array) : null, idx, count: pos.count, col, texKey });
});

const textures = {};
for (const [img, key] of texCache) textures[key] = img.toDataURL('image/png').split(',', 2)[1];

// duas câmeras: (1) cama+cadeira do urso, (2) armário + vista geral
// alvo da "cama" e da cadeira por sala (coords de makeNormalBed/makeTeddyChair)
const FOCO = {
  quarto:   { cama: [-3.65, 0.55, -2.0], urso: [-4.3, 0.7, 1.8], arm: [4.5, 1.05, -1.0] },
  quarto2:  { cama: [3.65, 0.55, -1.5], urso: [-3.6, 1.0, -1.2], arm: [-4.5, 1.0, -1.2], armCam: [-1.0, 1.7, -1.2] },
  casa_zelador: { cama: [3.4, 0.55, -1.8], urso: [0.0, 0.7, 0.0], arm: [0.0, 0.7, 0.0] },
};
FOCO.saguao = { cama: [0, 1.2, -4.5], urso: [-8.2, 1.6, -6.3], arm: [12.6, 1.55, 4.0], armCam: [8.5, 1.8, 4.0] };
if (process.argv[3] === 'portaN') FOCO.saguao.cama = [0.0, 1.25, -8.6];
const F = FOCO[ROOM] || FOCO.quarto;
const CAMS = [
  { pos: process.argv[3] === 'portaN' ? [0.0, 1.5, -4.2] : [F.cama[0] + 3.2, 1.5, F.cama[2] + 3.4], tgt: F.cama, out: `/tmp/room_${ROOM}_cama.png` },
  { pos: [F.urso[0] + 2.3, 0.9, F.urso[2]], tgt: F.urso, out: `/tmp/room_${ROOM}_urso.png` },
  { pos: F.armCam || [F.arm[0] - 3.6, 1.5, F.arm[2] + 2.2], tgt: F.arm, out: `/tmp/room_${ROOM}_armario.png` },
];
fs.writeFileSync('/tmp/room_render.json', JSON.stringify({ meshes, textures, CAMS }));
console.log(`dump ok: ${ROOM}`, meshes.length, 'meshes ·', Object.keys(textures).length, 'texturas reais');
