// ============================================================
// AUDITOR DE DESIGN & MODELOS 3D — SANTA LÚCIA (v1)
// NÃO joga o jogo: CONSTRÓI as 20 salas com THREE real (headless)
// e disseca a geometria: sólidos, portas, itens, inimigos, cams,
// luzes, navegação (grid 0.25m), boss e cadeia de progressão.
// Saída: AUDITORIA_MUNDO.txt na raiz + resumo no console.
// Uso: node tools/audit_world.mjs [nivel]  (1=gameplay, 2=+malha/colisão, 3=+micrometria)
// ============================================================
import fs from 'fs';
import * as RealTHREE from '../vendor/three.module.min.js';

// ---------- stubs de DOM (mesmo padrão do bot_play) ----------
const gradStub = { addColorStop() {} };
function make2d() {
  const base = {
    canvas: null, fillStyle: '', strokeStyle: '', lineWidth: 1, font: '',
    imageSmoothingEnabled: false,
    fillRect() {}, clearRect() {}, strokeRect() {}, fillText() {},
    beginPath() {}, arc() {}, ellipse() {}, moveTo() {}, lineTo() {},
    stroke() {}, fill() {}, closePath() {}, save() {}, restore() {},
    translate() {}, rotate() {}, scale() {}, drawImage() {},
    createLinearGradient() { return gradStub; },
    createRadialGradient() { return gradStub; },
    getImageData(x, y, w, h) { return { data: new Uint8ClampedArray(w * h * 4) }; },
    putImageData() {}, measureText: (t) => ({ width: (t || '').length * 6 }),
  };
  // qualquer método faltante (bezierCurveTo, quadraticCurveTo...) vira no-op
  return new Proxy(base, {
    get(t, k) { if (k in t) return t[k]; return () => undefined; },
    set(t, k, v) { t[k] = v; return true; },
  });
}
function makeCanvas(w = 64, h = 64) {
  return { width: w, height: h, clientWidth: 800, clientHeight: 600, getContext: () => make2d(), style: {}, addEventListener() {}, removeEventListener() {} };
}
function makeEl(id = '') {
  return {
    id, style: {}, innerHTML: '', textContent: '', value: '', checked: false,
    classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
    addEventListener() {}, removeEventListener() {}, appendChild() {}, remove() {},
    setAttribute() {}, getAttribute: () => null, querySelector: () => makeEl(), querySelectorAll: () => [],
    getContext: () => make2d(), focus() {}, blur() {}, click() {},
  };
}
global.document = {
  createElement: (t) => (t === 'canvas' ? makeCanvas() : makeEl()),
  getElementById: (id) => makeEl(id),
  body: makeEl('body'), addEventListener() {}, removeEventListener() {},
};
global.localStorage = { data: {}, getItem(k) { return this.data[k] || null; }, setItem(k, v) { this.data[k] = v; }, removeItem(k) { delete this.data[k]; } };
global.performance = { now: () => Date.now() };
global.window = global.document;
try { global.navigator = { userAgent: "audit-bot" }; } catch { Object.defineProperty(globalThis, "navigator", { value: { userAgent: "audit-bot" }, configurable: true }); }

const THREE = RealTHREE;
const { buildTextures } = await import('../js/textures.js');
const { buildRoom } = await import('../js/world.js');
const C = await import('../js/config.js');
const ITEMS = C.ITEMS;
const ENEMIES = C.ENEMIES || C.ENEMY_STATS || C.ENEMY_DEFS || {};
const TEX = buildTextures(THREE);

const ROOMS = ['quarto', 'corredor', 'quarto2', 'saguao', 'cemiterio', 'estufa', 'floresta',
  'estacionamento', 'casa_zelador', 'passagem', 'corredor_n', 'experimentos', 'catedral',
  'hall2', 'enfermaria', 'escritorio2', 'fornalhas', 'corredor3', 'escritorio_sup', 'telhado'];
const CAMPANHAS = {
  daniel: { start: 'quarto', final: 'telhado', boss: 'vulto' },
  clara: { start: 'floresta', final: 'catedral', boss: 'alencastro' },
  bento: { start: 'casa_zelador', final: 'floresta', boss: null },
};
const BOSSES = {
  catedral: { type: 'alencastro', x: 0, z: -3.0, camps: ['clara'] },
  telhado: { type: 'vulto', x: 0, z: -4.0, camps: ['daniel', 'bento'] },
};
const RES = 0.25, RAIO = 0.28; // resolução do grid e raio de colisão do "player fantasma"
const LEVEL = parseInt(process.argv[2] || '3', 10);

// ---------- util ----------
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
function distSolids(x, z, solids) {
  let best = 1e9;
  for (const s of solids) {
    const dx = Math.max(s.x0 - x, 0, x - s.x1);
    const dz = Math.max(s.z0 - z, 0, z - s.z1);
    best = Math.min(best, Math.hypot(dx, dz));
    if (best === 0) return 0;
  }
  return best;
}
const inSolid = (x, z, solids, m = 0) => distSolids(x, z, solids) <= m;

// grid de navegação da sala (célula bloqueada se sólido a < RAIO)
function buildGrid(R) {
  const cols = Math.ceil(R.w / RES), rows = Math.ceil(R.d / RES);
  const blocked = new Uint8Array(cols * rows);
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const x = -R.w / 2 + (i + 0.5) * RES, z = -R.d / 2 + (j + 0.5) * RES;
      blocked[j * cols + i] = distSolids(x, z, R.solids) < RAIO ? 1 : 0;
    }
  }
  return { cols, rows, blocked };
}
function bfsGrid(R, g, seeds) {
  const prev = new Int32Array(g.cols * g.rows).fill(-1);
  const seen = new Uint8Array(g.cols * g.rows);
  const q = [];
  for (const [sx, sz] of seeds) {
    const i = clamp(Math.floor((sx + R.w / 2) / RES), 0, g.cols - 1);
    const j = clamp(Math.floor((sz + R.d / 2) / RES), 0, g.rows - 1);
    const k = j * g.cols + i;
    if (!g.blocked[k] && !seen[k]) { seen[k] = 1; q.push(k); }
  }
  while (q.length) {
    const k = q.shift();
    const i = k % g.cols, j = (k / g.cols) | 0;
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const ni = i + di, nj = j + dj;
      if (ni < 0 || nj < 0 || ni >= g.cols || nj >= g.rows) continue;
      const nk = nj * g.cols + ni;
      if (g.blocked[nk] || seen[nk]) continue;
      seen[nk] = 1; prev[nk] = k; q.push(nk);
    }
  }
  return { seen, prev };
}
const cellOf = (R, g, x, z) => {
  const i = clamp(Math.floor((x + R.w / 2) / RES), 0, g.cols - 1);
  const j = clamp(Math.floor((z + R.d / 2) / RES), 0, g.rows - 1);
  return j * g.cols + i;
};
// AABB de todas as meshes da sala (world space) p/ auditoria de malha
function collectBoxes(R) {
  R.group.updateMatrixWorld(true);
  const out = [];
  R.group.traverse((o) => {
    if (!o.isMesh || !o.geometry) return;
    if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
    const bb = o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld);
    if (!isFinite(bb.min.x) || !isFinite(bb.max.x)) return;
    out.push({ bb, type: o.geometry.type });
  });
  return out;
}
const furnitureGrade = (b) => Math.min(b.max.x - b.min.x, b.max.z - b.min.z) >= 0.45 && (b.max.y - b.min.y) >= 0.5;
function overlap3D(a, b) {
  const ox = Math.min(a.max.x, b.max.x) - Math.max(a.min.x, b.min.x);
  const oy = Math.min(a.max.y, b.max.y) - Math.max(a.min.y, b.min.y);
  const oz = Math.min(a.max.z, b.max.z) - Math.max(a.min.z, b.min.z);
  if (ox <= 0 || oy <= 0 || oz <= 0) return 0;
  return ox * oy * oz;
}
const volOf = (b) => (b.max.x - b.min.x) * (b.max.y - b.min.y) * (b.max.z - b.min.z);
function distSolidsBox(bb, solids) {
  // menor penetração do footprint do box em qualquer sólido (0 = sem toque)
  let best = 1e9;
  for (const so of solids) {
    const ox = Math.min(bb.max.x, so.x1) - Math.max(bb.min.x, so.x0);
    const oz = Math.min(bb.max.z, so.z1) - Math.max(bb.min.z, so.z0);
    if (ox > 0 && oz > 0) best = Math.min(best, Math.min(ox, oz));
  }
  return best === 1e9 ? -1 : best; // -1 = sem contato
}
const isWallBand = (R, so) => so.x0 <= -R.w / 2 + 0.01 || so.x1 >= R.w / 2 - 0.01 || so.z0 <= -R.d / 2 + 0.01 || so.z1 >= R.d / 2 - 0.01;

// existe célula navegável (vista pelo BFS) a <= radius do ponto?
// (é assim que o jogo decide candidato: distância pura, sem LOS)
function reachDisc(R, bf, x, z, radius) {
  const i0 = clamp(Math.floor((x - radius + R.w / 2) / RES), 0, R.w / RES - 1 | 0);
  const i1 = clamp(Math.ceil((x + radius + R.w / 2) / RES), 0, (R.w / RES | 0) - 1);
  const j0 = clamp(Math.floor((z - radius + R.d / 2) / RES), 0, (R.d / RES | 0) - 1);
  const j1 = clamp(Math.ceil((z + radius + R.d / 2) / RES), 0, (R.d / RES | 0) - 1);
  for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
    if (!bf.seen[j * ((R.w / RES | 0)) + i]) continue;
    const cx = -R.w / 2 + (i + 0.5) * RES, cz = -R.d / 2 + (j + 0.5) * RES;
    if (Math.hypot(cx - x, cz - z) <= radius) return true;
  }
  return false;
}

// ============================================================
const FINDINGS = []; // { sev, room, msg, fix }
const add = (sev, room, msg, fix = '') => FINDINGS.push({ sev, room, msg, fix });
const perRoom = {};

console.log('🏗️  Construindo as 20 salas com THREE real...\n');
const built = {};
for (const id of ROOMS) {
  try { built[id] = buildRoom(THREE, TEX, id); }
  catch (e) { add('CRIT', id, `buildRoom FALHOU: ${e.message}`, 'corrigir erro de construção'); }
}

for (const id of ROOMS) {
  const R = built[id];
  if (!R) continue;
  const f = [];
  const area = R.w * R.d;
  const g = buildGrid(R);

  // sementes: centro (se livre) + todas as portas
  const seeds = R.doors.map((d) => [d.x, d.z]);
  if (!inSolid(0, 0, R.solids, RAIO)) seeds.unshift([0, 0]);
  const bf = bfsGrid(R, g, seeds);
  const reachableCells = bf.seen.reduce((a, b) => a + b, 0);
  const freeCells = g.blocked.length - g.blocked.reduce((a, b) => a + b, 0);
  const percConect = freeCells ? Math.round((reachableCells / freeCells) * 100) : 0;

  // ---------- A) INTERAÇÕES (candidato = distância pura ≤ r, sem LOS) ----------
  for (const it of R.interacts) {
    const alcanca = reachDisc(R, bf, it.x, it.z, Math.max(it.r || 1.4, 1.0));
    if (!alcanca) {
      f.push(['CRIT', `act "${it.act}" (${it.x},${it.z}, r=${it.r}) INALCANÇÁVEL — nenhuma célula navegável no raio${inSolid(it.x, it.z, R.solids) ? ' (está dentro de sólido)' : ''}`, `mover o act e/ou liberar espaço ao redor`]);
    } else if (inSolid(it.x, it.z, R.solids, 0.05)) {
      f.push(['BAIXO', `act "${it.act}" (${it.x},${it.z}) fica dentro de móvel (alcançável de fora por raio ${it.r}) — estético`, `puxar o ponto 0.3–0.5 pra frente do móvel`]);
    }
  }
  // ---------- B) PICKUPS (candidato = dist ≤ 1.35; dentro de mesh = invisível) ----------
  for (const pk of R.pickups) {
    if (!ITEMS[pk.item]) { f.push(['CRIT', `pickup "${pk.item}" (${pk.x},${pk.z}) NÃO EXISTE em ITEMS`, `corrigir id do item`]); continue; }
    const dentro = inSolid(pk.x, pk.z, R.solids, 0.02);
    const pega = reachDisc(R, bf, pk.x, pk.z, 1.35);
    if (dentro) {
      f.push(pega ? ['ALTO', `pickup ${ITEMS[pk.item].name} (${pk.x},${pk.z}) DENTRO da mesh de um móvel — INVISÍVEL no jogo (pegável às cegas)`, `mover ≥0.5 pra fora do móvel, à vista`]
                  : ['CRIT', `pickup ${ITEMS[pk.item].name} (${pk.x},${pk.z}) dentro de móvel E sem célula de coleta no raio 1.35 — IMPOSSÍVEL pegar`, `mover pra espaço aberto`]);
    } else if (!pega) {
      f.push(['CRIT', `pickup ${ITEMS[pk.item].name} (${pk.x},${pk.z}) em ILHA — ninguém chega no raio 1.35`, `liberar caminho ou aproximar do piso útil`]);
    }
  }
  // ---------- C) SPAWNS ----------
  for (const sp of R.spawns) {
    if (!ENEMIES[sp.type]) { f.push(['CRIT', `spawn "${sp.type}" não existe em ENEMIES`, `corrigir tipo`]); continue; }
    if (inSolid(sp.x, sp.z, R.solids, 0.4)) {
      f.push(['CRIT', `spawn ${ENEMIES[sp.type].name} (${sp.x},${sp.z}) DENTRO de sólido (nasce travado)`, `mover ≥0.5`]);
    }
    const dPorta = Math.min(...R.doors.map((d) => Math.hypot(d.x - sp.x, d.z - sp.z)), 1e9);
    if (R.doors.length && dPorta < 1.4) {
      f.push(['ALTO', `spawn ${ENEMIES[sp.type].name} a ${dPorta.toFixed(1)}m da porta de entrada (${sp.x},${sp.z}) — camp NA CARA`, `afastar spawn ≥1.4m da porta`]);
    }
    if (!bf.seen[cellOf(R, g, sp.x, sp.z)]) {
      f.push(['ALTO', `spawn ${ENEMIES[sp.type].name} (${sp.x},${sp.z}) em ilha — não alcança nem é alcançado`, `reposicionar`]);
    }
  }
  // ---------- D) PORTAS ----------
  for (let i = 0; i < R.doors.length; i++) {
    const d = R.doors[i];
    if (!built[d.target]) { f.push(['CRIT', `porta "${d.label}" aponta pra sala inexistente "${d.target}"`, `corrigir target`]); continue; }
    const T = built[d.target];
    // lado origem: caminho de 1.2m pra dentro livre?
    const dx0 = 0 - d.x, dz0 = 0 - d.z, L0 = Math.hypot(dx0, dz0) || 1;
    let prof = 0;
    for (let s = 0.2; s <= 1.3; s += 0.15) {
      const px = d.x + (dx0 / L0) * s, pz = d.z + (dz0 / L0) * s;
      if (inSolid(px, pz, R.solids, RAIO)) break;
      prof = s;
    }
    if (prof < 0.9) {
      f.push(['ALTO', `vão da porta "${d.label}" (${d.x},${d.z}) estrangulado: livre só ${prof.toFixed(1)}m (regra: ≥0.9m)`, `afastar móvel/sólido do vão`]);
    }
    // lado destino: (sx,sz) dentro do volume e caminho pra dentro livre
    const hw = T.w / 2, hd = T.d / 2;
    if (Math.abs(d.sx) > hw + 1.2 || Math.abs(d.sz) > hd + 1.2) {
      f.push(['CRIT', `chegada "${d.label}" em (${d.sx},${d.sz}) FORA do volume de ${d.target} (${T.w}x${T.d})`, `corrigir sx/sz`]);
    } else {
      const dxc = 0 - d.sx, dzc = 0 - d.sz, Ld = Math.hypot(dxc, dzc) || 1;
      let prof2 = 0;
      for (let s = 0.2; s <= 1.3; s += 0.15) {
        const px = d.sx + (dxc / Ld) * s, pz = d.sz + (dzc / Ld) * s;
        if (inSolid(px, pz, T.solids, RAIO)) break;
        prof2 = s;
      }
      if (prof2 < 0.9) {
        f.push(['ALTO', `entrada em ${d.target} bloqueada: livre só ${prof2.toFixed(1)}m a partir de (${d.sx},${d.sz}) — móvel na cara da porta`, `afastar sólidos do vão no destino`]);
      }
      const Tg = buildGrid(T);
      const Tseeds = T.doors.map((dd) => [dd.x, dd.z]);
      if (!inSolid(0, 0, T.solids, RAIO)) Tseeds.unshift([0, 0]);
      const Tbf = bfsGrid(T, Tg, Tseeds);
      if (!Tbf.seen[cellOf(T, Tg, d.sx, d.sz)]) {
        f.push(['CRIT', `chegada em ${d.target} (${d.sx},${d.sz}) em ILHA — jogador fica preso ao entrar`, `liberar área`]);
      }
    }
    // recíproca
    const rec = T.doors.some((d2) => d2.target === id && Math.hypot(d2.sx - d.x, d2.sz - d.z) < 3.2);
    if (!rec) {
      f.push(['ALTO', `porta "${d.label}" → ${d.target} SEM retorno correspondente do lado de lá`, `adicionar porta de volta em ${d.target}`]);
    }
    // portas coladas
    for (let j = i + 1; j < R.doors.length; j++) {
      const d2 = R.doors[j];
      const dd = Math.hypot(d.x - d2.x, d.z - d2.z);
      if (dd < 1.4) f.push(['MED', `portas "${d.label}" e "${d2.label}" a ${dd.toFixed(1)}m — confusão visual`, `separar ≥1.4m`]);
    }
  }
  // ---------- E) NAVEGAÇÃO ----------
  if (percConect < 85) {
    f.push(['ALTO', `só ${percConect}% do chão livre é conectado — bolsões inacessíveis (${100 - percConect}% do mapa morto)`, `rever layout de sólidos`]);
  }
  // ---------- F) CÂMERAS ----------
  if (R.cams.length === 0) f.push(['ALTO', `sala SEM câmeras — ângulo padrão pode falhar`, `adicionar addCam`]);
  for (const cam of R.cams) {
    if (inSolid(cam.pos[0], cam.pos[2], R.solids, 0.1)) {
      f.push(['MED', `câmera (${cam.pos.join(',')}) dentro de sólido — risco de tela bloqueada`, `reposicionar`]);
    }
    if (Math.abs(cam.pos[0]) > R.w / 2 + 1 || Math.abs(cam.pos[2]) > R.d / 2 + 1) {
      f.push(['MED', `câmera fora do volume da sala: (${cam.pos.join(',')})`, `reposicionar`]);
    }
  }
  if (area > 160 && R.cams.length < 3) f.push(['BAIXO', `sala grande (${area | 0}m²) com só ${R.cams.length} câmera(s)`, `salas grandes pedem 3–4 ângulos`]);
  // ---------- G) LUZES ----------
  const lum = R.lights.reduce((a, l) => a + (l.intensity || 0) * (l.distance || 0) / 10, 0);
  if (R.lights.length === 0) f.push(['ALTO', `sala SEM luzes — preta`, `adicionar pointLight`]);
  else if (area > 140 && lum < 6) f.push(['MED', `sala grande (${area | 0}m²) subiluminada (lum=${lum.toFixed(1)})`, `+1 luz central ou subir intensidade`]);
  // ---------- H) SALA DE SAVE ----------
  const hasSave = R.interacts.some((it) => it.act === 'save');
  if (hasSave) {
    if (R.spawns.length) f.push(['ALTO', `sala de SAVE com ${R.spawns.length} inimigo(s) — regra: sala de save é limpa`, `remover spawns`]);
    if (!R.pickups.some((p) => p.item === 'ribbon')) f.push(['MED', `sala de save sem FITA de tinta por perto`, `adicionar ribbon`]);
  }
  // ---------- J) BOSS ----------
  if (BOSSES[id]) {
    const B = BOSSES[id];
    if (inSolid(B.x, B.z, R.solids, 0.5)) f.push(['CRIT', `boss ${B.type} (${B.x},${B.z}) dentro de sólido`, `reposicionar`]);
    const dPorta = Math.min(...R.doors.map((d) => Math.hypot(d.x - B.x, d.z - B.z)), 1e9);
    if (dPorta < 4) f.push(['ALTO', `boss a ${dPorta.toFixed(1)}m da porta — pega o jogador NA ENTRADA (dor do alencastro)`, `≥4m de respiro`]);
    // área de kite: disco raio 3.2 ao redor do boss
    let livres = 0, tot = 0;
    for (let a2 = -3.2; a2 <= 3.2; a2 += RES) for (let b2 = -3.2; b2 <= 3.2; b2 += RES) {
      if (a2 * a2 + b2 * b2 > 3.2 * 3.2) continue;
      tot++;
      if (!inSolid(B.x + a2, B.z + b2, R.solids, RAIO)) livres++;
    }
    const kitePct = Math.round((livres / tot) * 100);
    if (kitePct < 55) f.push(['MED', `área de kite do boss apertada (${kitePct}% livre num raio 3.2m)`, `limpar móveis ao redor`]);
    f.push(['INFO', `boss ${B.type}: dist-entrada ${dPorta.toFixed(1)}m, kite ${kitePct}%`, '']);
  }
  // ---------- K/L) redundâncias ----------
  const sKey = R.solids.map((s) => `${s.x0},${s.z0},${s.x1},${s.z1}`);
  const dupS = sKey.filter((k, i2) => sKey.indexOf(k) !== i2).length;
  if (dupS) f.push(['MED', `${dupS} sólido(s) duplicado(s)`, `remover redundância`]);

  perRoom[id] = {
    area, percConect, doors: R.doors.length, pickups: R.pickups.length,
    acts: R.interacts.length, spawns: R.spawns.length, cams: R.cams.length,
    lights: R.lights.length, save: hasSave, findings: f,
  };

  // ================= PASSADA 2: MALHA × COLISÃO × DECORAÇÃO =================
  if (LEVEL >= 2) {
    const boxes = collectBoxes(R).filter((b) => b.type === 'BoxGeometry' || b.type === 'CylinderGeometry');
    // estrutura = box centrado na banda da parede E comprido (segmento de
    // parede/vão/nicho de embutir): não é móvel, não se audita como móvel
    const isStructure = (bb) => {
      const cx = (bb.min.x + bb.max.x) / 2, cz = (bb.min.z + bb.max.z) / 2;
      const naBanda = R.solids.some((so) => isWallBand(R, so)
        && cx >= so.x0 - 0.01 && cx <= so.x1 + 0.01 && cz >= so.z0 - 0.01 && cz <= so.z1 + 0.01);
      if (!naBanda) return false;
      const len = Math.max(bb.max.x - bb.min.x, bb.max.z - bb.min.z);
      return len >= 1.8;
    };
    const furn = boxes.filter((b) => furnitureGrade(b.bb) && !isStructure(b.bb));
    const anyBox = boxes;

    // 2A) sólido SEM mesh = parede invisível (armadilha injusta)
    for (const so of R.solids) {
      const cx = (so.x0 + so.x1) / 2, cz = (so.z0 + so.z1) / 2;
      const coberto = anyBox.some((b) => overlap3D(b.bb, { min: { x: so.x0, y: 0, z: so.z0 }, max: { x: so.x1, y: 3, z: so.z1 } }) > 0.02);
      if (!coberto) f.push(['CRIT', `COLISÃO INVISÍVEL: sólido (${so.x0},${so.z0})-(${so.x1},${so.z1}) não tem NENHUMA mesh — jogador bate no ar`, `adicionar mesh (box) com o mesmo footprint ou remover o sólido`]);
      void cx; void cz;
    }
    // 2B) móvel grande SEM sólido = dá pra atravessar (perde credibilidade)
    for (const b of furn) {
      const bb = b.bb;
      const coberto = R.solids.some((so) => {
        const ox = Math.min(bb.max.x, so.x1) - Math.max(bb.min.x, so.x0);
        const oz = Math.min(bb.max.z, so.z1) - Math.max(bb.min.z, so.z0);
        return ox > 0.2 && oz > 0.2;
      });
      if (!coberto) {
        f.push(['MED', `móvel atravessável: mesh (${bb.min.x.toFixed(1)},${bb.min.z.toFixed(1)}) (${b.type}) sem colisão — player passa por dentro`, `adicionar solid() com o footprint do móvel`]);
      }
    }
    // 2C) móvel ENTERRADO/ATRAVESSANDO parede
    for (const b of furn) {
      const bb = b.bb;
      const walls = R.solids.filter((so) => isWallBand(R, so));
      for (const so of walls) {
        const cxm = (bb.min.x + bb.max.x) / 2, czm = (bb.min.z + bb.max.z) / 2;
        const noBando = cxm >= so.x0 - 0.01 && cxm <= so.x1 + 0.01 && czm >= so.z0 - 0.01 && czm <= so.z1 + 0.01;
        const saiPeloLado = bb.min.x < -R.w / 2 - 0.05 || bb.max.x > R.w / 2 + 0.05 || bb.min.z < -R.d / 2 - 0.05 || bb.max.z > R.d / 2 + 0.05;
        if (noBando && saiPeloLado) {
          f.push(['CRIT', `móvel ATRAVESSA a parede pra fora: mesh (${bb.min.x.toFixed(1)},${bb.min.z.toFixed(1)}) (${b.type})`, `recolher móvel pra dentro do quarto`]);
        } else {
          const pen = distSolidsBox(bb, walls.filter((w2) => w2 !== so));
          void pen;
          // cruzando a face interna: penetração na banda sem estar montado nela
          const ox = Math.min(bb.max.x, so.x1) - Math.max(bb.min.x, so.x0);
          const oz = Math.min(bb.max.z, so.z1) - Math.max(bb.min.z, so.z0);
          if (ox > 0 && oz > 0 && !noBando && Math.min(ox, oz) > 0.12) {
            const dentro = bb.min.x > so.x0 && bb.max.x < so.x1 && bb.min.z > so.z0 && bb.max.z < so.z1;
            if (!dentro) f.push(['MED', `móvel ENTERRADO na parede (${Math.min(ox, oz).toFixed(2)}m): mesh (${bb.min.x.toFixed(1)},${bb.min.z.toFixed(1)}) (${b.type})`, `afastar do batente`]);
          }
        }
      }
    }
    // 2D) móvel × móvel sobrepostos (sem empilhamento vertical legítimo)
    for (let a = 0; a < furn.length; a++) for (let b = a + 1; b < furn.length; b++) {
      const A = furn[a].bb, B2 = furn[b].bb;
      if (A.min.y >= B2.max.y - 0.06 || B2.min.y >= A.max.y - 0.06) continue; // decor em cima: ok
      const ov = overlap3D(A, B2);
      if (Math.min(volOf(A), volOf(B2)) < 0.2) continue; // props pequenos: ok
      // detalhe de um MESMO prop: centro do menor dentro do AABB do maior
      const cA = { x: (A.min.x + A.max.x) / 2, y: (A.min.y + A.max.y) / 2, z: (A.min.z + A.max.z) / 2 };
      const cB = { x: (B2.min.x + B2.max.x) / 2, y: (B2.min.y + B2.max.y) / 2, z: (B2.min.z + B2.max.z) / 2 };
      const dentro = (c, b) => c.x >= b.min.x && c.x <= b.max.x && c.y >= b.min.y && c.y <= b.max.y && c.z >= b.min.z && c.z <= b.max.z;
      if (dentro(cA, B2) || dentro(cB, A)) continue;
      if (ov > 0.35 * Math.min(volOf(A), volOf(B2))) {
        f.push(['MED', `móveis sobrepostos em (${A.min.x.toFixed(1)},${A.min.z.toFixed(1)}): A[${A.min.x.toFixed(1)},${A.min.z.toFixed(1)}..${A.max.x.toFixed(1)},${A.max.z.toFixed(1)}] y${A.min.y.toFixed(1)}-${A.max.y.toFixed(1)} × B[${B2.min.x.toFixed(1)},${B2.min.z.toFixed(1)}..${B2.max.x.toFixed(1)},${B2.max.z.toFixed(1)}] y${B2.min.y.toFixed(1)}-${B2.max.y.toFixed(1)} — clipping visual`, `separar os móveis`]);
      }
    }
    perRoom[id].furn = furn.length;
  }

  // ================= PASSADA 3: MICROMETRIA / ILUMINAÇÃO DE CENA =================
  if (LEVEL >= 3) {
    // 3A) corredores: menor largura de cada rota porta→porta (regra: >=0.9m)
    const doorCells = R.doors.map((d) => [cellOf(R, g, d.x, d.z), d.label]);
    const dToWall = new Float32Array(g.cols * g.rows);
    const nearDoor = (x, z) => R.doors.some((d) => Math.hypot(d.x - x, d.z - z) < 1.35);
    for (let j = 0; j < g.rows; j++) for (let i = 0; i < g.cols; i++) {
      const k = j * g.cols + i;
      const x = -R.w / 2 + (i + 0.5) * RES, z = -R.d / 2 + (j + 0.5) * RES;
      // recessos de porta não são gargalo (auditados à parte no vão)
      dToWall[k] = (g.blocked[k] || nearDoor(x, z)) ? 0 : distSolids(x, z, R.solids);
      if (!g.blocked[k] && nearDoor(x, z)) dToWall[k] = 1e9;
    }
    // WIDEST PATH (maximiza a folga mínima): a melhor passagem possível
    // entre portas — não o caminho mais curto (que abraça paredes)
    const rotas = [];
    for (let di = 0; di < doorCells.length; di++) {
      const src = doorCells[di][0];
      const larg = new Float32Array(g.cols * g.rows).fill(-1);
      larg[src] = 1e9;
      const stack = [src];
      while (stack.length) {
        // extrai o de maior largura (grid pequeno: varredura simples serve)
        let bi = -1, bv = -1;
        for (let q = 0; q < stack.length; q++) if (larg[stack[q]] > bv) { bv = larg[stack[q]]; bi = q; }
        const u = stack.splice(bi, 1)[0];
        const ui = u % g.cols, uj = (u / g.cols) | 0;
        for (const [ddi, ddj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const ni = ui + ddi, nj = uj + ddj;
          if (ni < 0 || nj < 0 || ni >= g.cols || nj >= g.rows) continue;
          const nk = nj * g.cols + ni;
          if (g.blocked[nk]) continue;
          const w2 = Math.min(bv, dToWall[nk]);
          if (w2 > larg[nk] + 1e-6) { larg[nk] = w2; stack.push(nk); }
        }
      }
      for (let dj = di + 1; dj < doorCells.length; dj++) {
        const kk = doorCells[dj][0];
        if (larg[kk] < 0) continue;
        rotas.push({ a: doorCells[di][1], b: doorCells[dj][1], largura: larg[kk] });
      }
    }
    for (const ro of rotas) {
      const larguraM = ro.largura * 2; // diâmetro do túnel (folga pros 2 lados)
      if (larguraM < 0.9) {
        f.push(['CRIT', `GARGALO na rota "${ro.a}" ↔ "${ro.b}": melhor passagem tem ${larguraM.toFixed(2)}m de largura — regra: >=0.9m`, `abrir o vão (mover sólidos ±0.3)`]);
      } else if (larguraM < 1.1) {
        f.push(['MED', `corredor apertado na rota "${ro.a}" ↔ "${ro.b}": ${larguraM.toFixed(2)}m`, `alargar para >=1.1m (conforto RE)`]);
      }
    }
    // 3B) câmera com visão bloqueada por sólido (amostra da linha pos→look)
    for (const cam of R.cams) {
      const [px, py, pz] = cam.pos, [lx, ly, lz] = cam.look;
      const steps = 16;
      for (let t = 1; t <= steps; t++) {
        const tt = t / (steps + 1);
        const sx = px + (lx - px) * tt, sy = py + (ly - py) * tt, sz = pz + (lz - pz) * tt;
        const hit = R.solids.find((so) => sx >= so.x0 - 0.02 && sx <= so.x1 + 0.02 && sz >= so.z0 - 0.02 && sz <= so.z1 + 0.02);
        if (!hit) continue;
        const alturaBloqueio = isWallBand(R, hit) ? R.h - 0.1 : 1.0; // móvel baixo não bloqueia câmera alta
        if (sy < alturaBloqueio) {
          f.push(['MED', `câmera (${px.toFixed(1)},${pz.toFixed(1)}) com visão BLOQUEADA (${isWallBand(R, hit) ? 'parede' : 'móvel'}) no caminho até (${lx.toFixed(1)},${lz.toFixed(1)})`, `erguer/mover a câmera`]);
          break;
        }
      }
      if (py > R.h + 0.5) f.push(['BAIXO', `câmera acima do teto (y=${py.toFixed(1)} > h=${R.h})`, `abaixar y`]);
    }
    // 3C) teto e piso
    const OUTDOOR = ['telhado', 'floresta', 'estacionamento'];
    if (!OUTDOOR.includes(id)) {
      const teto = R.group.children.some((o) => o.isMesh && o.geometry && o.geometry.type === 'PlaneGeometry'
        && o.position.y >= R.h - 0.4);
      if (!teto) f.push(['ALTO', `sala SEM teto (o céu fica aberto)`, `plane(ceiling) em y=R.h`]);
    }
    const piso = R.group.children.some((o) => o.isMesh && o.geometry && o.geometry.type === 'PlaneGeometry'
      && Math.abs(o.position.y) < 0.2);
    if (!piso) f.push(['CRIT', `sala SEM PISO (vai pro void)`, `plane(floor) em y=0`]);
    // 3D) densidade de inimigos (dado, não veredito)
    const dens = area > 0 ? (R.spawns.length / (area / 100)) : 0;
    if (dens > 6) f.push(['MED', `sala superlotada: ${R.spawns.length} inimigos em ${area | 0}m² (${dens.toFixed(1)}/100m²)`, `diluir spawns`]);
    perRoom[id].corredores = rotas.length ? rotas.reduce((m2, ro) => Math.min(m2, ro.largura * 2), 1e9).toFixed(2) + 'm' : '—';
    perRoom[id].dens = dens.toFixed(1);
  }

  for (const [sev, msg, fix] of f) add(sev, id, msg, fix);
}

// ============================================================
// PROGRESSÃO POR CAMPANHA (fixpoint de salas + chaves)
// ============================================================
console.log('🧭 Analisando cadeia de progressão...\n');
const progressao = {};
// arestas virtuais do elevador (acts, não portas) + condição de uso
const ELEV_EDGES = [
  { a: 'corredor_n', b: 'hall2', needItem: 'fuse' },   // P1 exige energia (fusível+quadro)
  { a: 'hall2', b: 'corredor3', needItem: null },      // P2->P3 exige valveOpen (resolvível nas fornalhas)
  { a: 'corredor3', b: 'hall2', needItem: null },
  { a: 'hall2', b: 'corredor_n', needItem: null },
];
for (const [camp, cfg] of Object.entries(CAMPANHAS)) {
  const seen = new Set([cfg.start]);
  const keys = new Set();
  let grew = true;
  while (grew) {
    grew = false;
    for (const id of [...seen]) {
      const R = built[id];
      if (!R) continue;
      for (const pk of R.pickups) if (ITEMS[pk.item] && ITEMS[pk.item].type === 'key' && !keys.has(pk.item)) { keys.add(pk.item); grew = true; }
      for (const d of R.doors) {
        if (seen.has(d.target)) continue;
        const T = built[d.target];
        if (!T) continue;
        const need = d.need && d.need.item;
        if (need && !keys.has(need)) continue; // porta trancada sem a chave (ainda)
        seen.add(d.target); grew = true;
      }
      for (const e of ELEV_EDGES) {
        if (e.a !== id || seen.has(e.b)) continue;
        if (e.needItem && !keys.has(e.needItem)) continue;
        seen.add(e.b); grew = true;
      }
    }
  }
  const falta = ROOMS.filter((r) => !seen.has(r));
  const finalOK = seen.has(cfg.final);
  progressao[camp] = { seen: [...seen], falta, finalOK };
  if (!finalOK) add('CRIT', camp, `FINAL da campanha (${cfg.final}) INALCANÇÁVEL — zerabilidade quebrada!`, 'rever cadeia de portas/chaves');
  for (const r of falta) add('INFO', camp, `sala "${r}" fora do alcance da campanha ${camp} (avaliar se é by design)`, '');
}

// ============================================================
// BALANCE GLOBAL (dados p/ decisão, não veredito)
// ============================================================
const glob = { ribbon: 0, shell: 0, pills: 0, antidote: 0, frag: 0, ammo9: 0, ammo38: 0, keys: [] };
for (const id of ROOMS) {
  const R = built[id];
  if (!R) continue;
  for (const pk of R.pickups) {
    if (glob[pk.item] !== undefined) glob[pk.item] += pk.qty;
    if (ITEMS[pk.item] && ITEMS[pk.item].type === 'key') glob.keys.push(pk.item);
  }
}
const hpTotal = ROOMS.reduce((a, id) => {
  const R = built[id]; if (!R) return a;
  return a + R.spawns.reduce((b, s) => b + (ENEMIES[s.type] ? ENEMIES[s.type].hp : 0), 0);
}, 0) + 700 + 700; // bosses

// ============================================================
// RELATÓRIO
// ============================================================
const sevRank = { CRIT: 0, ALTO: 1, MED: 2, BAIXO: 3, INFO: 4 };
const cnt = {};
for (const f of FINDINGS) cnt[f.sev] = (cnt[f.sev] || 0) + 1;
const buildV = (fs.existsSync('index.html') && /currentBuild = '([^']+)'/.exec(fs.readFileSync('index.html', 'utf8')) || [])[1] || '?';

let out = '';
out += '══════════════════════════════════════════════════════════════════\n';
out += '   AUDITORIA DE DESIGN & MODELOS 3D — SANATÓRIO SANTA LÚCIA\n';
out += `   bot auditor v2 · build ${buildV} · PASSADA nível ${LEVEL} (1=gameplay, 2=+malha, 3=+micrometria)\n`;
out += '══════════════════════════════════════════════════════════════════\n';
out += `Gerado em: ${new Date().toLocaleString('pt-BR')} · grid ${RES}m · raio player ${RAIO}m\n\n`;
out += 'RESUMO: ';
out += `🔴 ${cnt.CRIT || 0} críticos · 🟠 ${cnt.ALTO || 0} altos · 🟡 ${cnt.MED || 0} médios · 🔵 ${cnt.BAIXO || 0} baixos\n\n`;

out += '──────────────────────────────────────────────────────────────────\n';
out += 'PAINEL POR SALA (área | chão conectado | portas/itens/acts/ini | cam/luz)\n';
out += '──────────────────────────────────────────────────────────────────\n';
for (const id of ROOMS) {
  const p = perRoom[id];
  if (!p) { out += `  ${id.padEnd(16)} ❌ FALHOU DE CONSTRUIR\n`; continue; }
  out += `  ${id.padEnd(16)} ${String(p.area | 0).padStart(4)}m²  nav ${String(p.percConect).padStart(3)}%  ${p.doors}/${p.pickups}/${p.acts}/${p.spawns}  ${p.cams}cam/${p.lights}luz${p.save ? '  💾SAVE' : ''}${p.corredores ? '  corredor min ' + p.corredores : ''}${p.furn !== undefined ? '  móveis:' + p.furn : ''}\n`;
}
out += '\n';

out += '──────────────────────────────────────────────────────────────────\n';
out += 'PROGRESSÃO POR CAMPANHA\n';
out += '──────────────────────────────────────────────────────────────────\n';
for (const [camp, p] of Object.entries(progressao)) {
  out += `  ${camp.toUpperCase()}: ${p.seen.length}/20 salas · final(${CAMPANHAS[camp].final}) ${p.finalOK ? '✅ alcançável' : '❌ QUEBRADO'}${p.falta.length ? ' · fora do alcance: ' + p.falta.join(', ') : ''}\n`;
}
out += '\n';

out += '──────────────────────────────────────────────────────────────────\n';
out += 'ECONOMIA DO MUNDO (dados)\n';
out += '──────────────────────────────────────────────────────────────────\n';
out += `  fitas:${glob.ribbon} (saves possíveis) · shells:${glob.shell} · pills:${glob.pills} · antidotes:${glob.antidote} · frags:${glob.frag}/4\n`;
out += `  ammo9:${glob.ammo9} · ammo38:${glob.ammo38} · HP total de inimigos+bosses: ${hpTotal}\n`;
out += `  chaves no mapa: ${glob.keys.join(', ')}\n\n`;

out += '──────────────────────────────────────────────────────────────────\n';
out += 'ACHADOS (ordenados por severidade)\n';
out += '──────────────────────────────────────────────────────────────────\n';
FINDINGS.sort((a, b) => sevRank[a.sev] - sevRank[b.sev] || a.room.localeCompare(b.room));
for (const f of FINDINGS) {
  const icon = { CRIT: '🔴', ALTO: '🟠', MED: '🟡', BAIXO: '🔵', INFO: 'ℹ️ ' }[f.sev];
  out += `  ${icon} [${f.sev}] ${f.room}: ${f.msg}\n${f.fix ? `        ↳ conserto: ${f.fix}\n` : ''}`;
}
out += '\n══════════════════════════════════════════════════════════════════\n';
fs.writeFileSync('AUDITORIA_MUNDO.txt', out);

// console resumo
console.log(out.split('\n').slice(4, 9).join('\n'));
const criticos = FINDINGS.filter((f) => f.sev === 'CRIT');
console.log(`\n🔴 CRÍTICOS: ${criticos.length}`);
for (const f of criticos.slice(0, 12)) console.log(`   ${f.room}: ${f.msg}`);
console.log(`\n📄 relatório completo: AUDITORIA_MUNDO.txt`);
