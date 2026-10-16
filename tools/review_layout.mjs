// ============================================================
// BOT DE LAYOUT — SANTA LÚCIA (crítico de level design)
// NÃO joga e NÃO olha colisão (pra isso existe audit_world.mjs):
// julga o DESIGN dos layouts — fluxo, orientação geográfica,
// rótulos de porta, circuitos (loops), proporções por função,
// supply line do boss e acesso vertical entre andares.
// Saída: LAYOUT_REVIEW.txt na raiz.
// Uso: node tools/review_layout.mjs
// ============================================================
import fs from 'fs';

const gradStub = { addColorStop() {} };
function make2d() {
  const base = {
    canvas: null, fillStyle: '', measureText: (t) => ({ width: 10 }),
    createLinearGradient: () => gradStub, createRadialGradient: () => gradStub,
    getImageData: (x, y, w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }),
  };
  return new Proxy(base, { get(t, k) { if (k in t) return t[k]; return () => undefined; }, set(t, k, v) { t[k] = v; return true; } });
}
function makeCanvas(w = 64, h = 64) { return { width: w, height: h, getContext: () => make2d(), style: {}, addEventListener() {} }; }
function makeEl(id = '') { return { id, style: {}, classList: { add() {}, remove() {}, contains: () => false }, addEventListener() {}, appendChild() {}, getContext: () => make2d(), querySelector: () => makeEl(), querySelectorAll: () => [], setAttribute() {} }; }
global.document = { createElement: (t) => (t === 'canvas' ? makeCanvas() : makeEl()), getElementById: () => makeEl(), body: makeEl(), addEventListener() {} };
global.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
global.performance = { now: () => Date.now() };
global.window = global.document;
try { global.navigator = { userAgent: 'layout-review' }; } catch { Object.defineProperty(globalThis, 'navigator', { value: { userAgent: 'layout-review' }, configurable: true }); }

import * as RealTHREE from '../vendor/three.module.min.js';
const THREE = RealTHREE;
const { buildTextures } = await import('../js/textures.js');
const { buildRoom } = await import('../js/world.js');
const TEX = buildTextures(THREE);

const ROOMS = ['quarto', 'corredor', 'quarto2', 'saguao', 'cemiterio', 'estufa', 'floresta',
  'estacionamento', 'casa_zelador', 'passagem', 'corredor_n', 'experimentos', 'catedral',
  'hall2', 'enfermaria', 'escritorio2', 'fornalhas', 'corredor3', 'escritorio_sup', 'telhado'];
const FLOOR = { quarto: 1, corredor: 1, quarto2: 1, saguao: 1, cemiterio: 1, estufa: 1, floresta: 1, estacionamento: 1, casa_zelador: 1, passagem: 1, corredor_n: 1, experimentos: 1, catedral: 1, hall2: 2, enfermaria: 2, escritorio2: 2, fornalhas: 2, corredor3: 3, escritorio_sup: 3, telhado: 3 };
const CAMPANHAS = {
  daniel: { start: 'quarto', final: 'telhado' },
  clara: { start: 'floresta', final: 'catedral' },
  bento: { start: 'casa_zelador', final: 'floresta' },
};
const ELEV = [['corredor_n', 'hall2'], ['hall2', 'corredor3'], ['corredor3', 'hall2'], ['hall2', 'corredor_n']]; // acts do elevador + escada
const PREP = new Set(['DO', 'DA', 'DE', 'DOS', 'DAS', 'A', 'O', 'AS', 'OS', 'E', '·']);

const F = [];
const add = (sev, local, msg, fix = '') => F.push({ sev, local, msg, fix });
const roomName = (R) => (R.name || R.id).split('·')[0].trim();
const primaryTokens = (R) => roomName(R).split(/\s+/).filter((t) => t.length > 2 && !PREP.has(t.toUpperCase()));

console.log('🏛️  Construindo as 20 salas...\n');
const R = {};
for (const id of ROOMS) R[id] = buildRoom(THREE, TEX, id);

// ---------- grafo ----------
const edges = []; // {a,b,door,label}
for (const id of ROOMS) for (const d of R[id].doors) {
  if (d.target && ROOMS.includes(d.target) && (id < d.target || !ROOMS.slice(0, ROOMS.indexOf(id)).includes(d.target)))
    edges.push({ a: id, b: d.target, label: d.label });
}
const adj = new Map(ROOMS.map((id) => [id, []]));
for (const e of edges) { adj.get(e.a).push(e.b); adj.get(e.b).push(e.a); }
for (const [a, b] of ELEV) { adj.get(a).push(b); adj.get(b).push(a); }
const hops = (src) => {
  const dist = new Map([[src, 0]]); const q = [src];
  while (q.length) { const u = q.shift(); for (const v of adj.get(u)) if (!dist.has(v)) { dist.set(v, dist.get(u) + 1); q.push(v); } }
  return dist;
};

// ============================================================
// 1) ACESSO VERTICAL (regra canônica: sem atalhos entre andares)
// ============================================================
const vert = [];
for (const e of edges) {
  const fa = FLOOR[e.a], fb = FLOOR[e.b];
  if (fa !== fb) vert.push(e);
}
const esperadoVert = 1; // só a escada corredor_n<->hall2 é PORTA entre andares
for (const e of vert) {
  const par = [e.a, e.b].sort().join('<->');
  if (par !== 'corredor_n<->hall2') add('CRIT', `${e.a} ↔ ${e.b}`, `PORTA entre andares fora do plano: "${e.label}" — vertical só pode ser escada/elevador`, `remover porta ou reclassificar andar`);
}
const elevLinks = new Set(ELEV.map(([a, b]) => [a, b].sort().join('<->')));
const sobePelaPorta = vert.map((e) => [e.a, e.b].sort().join('<->'));
for (const par of sobePelaPorta) if (!elevLinks.has(par)) add('CRIT', par, 'liga andares mas não é escada nem elevador', 'rever');
// subgrafos por andar conectados?
for (const f of [1, 2, 3]) {
  const ids = ROOMS.filter((id) => FLOOR[id] === f);
  const dist = hops(ids[0]);
  const isolados = ids.filter((id) => !dist.has(id));
  if (isolados.length) add('CRIT', `andar ${f}`, `salas desconectadas no próprio andar: ${isolados.join(', ')}`, `conectar via salas do andar`);
}

// ============================================================
// 2) CIRCUITOS (loops) por andar — RE clássico é feito de voltas
// ============================================================
const loops = {};
for (const f of [1, 2, 3]) {
  const ids = ROOMS.filter((id) => FLOOR[id] === f);
  const V = ids.length;
  const E = edges.filter((e) => FLOOR[e.a] === f && FLOOR[e.b] === f).length;
  const comp = new Set(); let C = 0;
  for (const id of ids) {
    if (comp.has(id)) continue;
    C++; const q = [id];
    while (q.length) { const u = q.shift(); if (comp.has(u)) continue; comp.add(u); for (const v of adj.get(u)) if (FLOOR[v] === f && !comp.has(v)) q.push(v); }
  }
  loops[f] = { V, E, ciclos: E - V + C };
  if (loops[f].ciclos <= 0 && V >= 4) add('MED', `andar ${f}`, `layout em ÁRVORE (${V} salas, ${E} ligações, 0 circuito) — todo retorno refaz o mesmo corredor (backtracking RE-ruim)`, `criar 1 porta nova dentro do andar pra fechar um circuito (jogador monta a volta dele)`);
}

// ============================================================
// 3) ORIENTAÇÃO GEOGRÁFICA (sai pelo norte = chega pelo sul)
// ============================================================
const sideOf = (Rm, x, z) => {
  const hw = Rm.w / 2, hd = Rm.d / 2;
  const dn = Math.abs(z + hd), ds = Math.abs(z - hd), dw = Math.abs(x + hw), de = Math.abs(x - hw);
  const m = Math.min(dn, ds, dw, de);
  return m === dn ? 'N' : m === ds ? 'S' : m === dw ? 'W' : 'E';
};
const oposto = { N: 'S', S: 'N', E: 'W', W: 'E' };
let orientCheck = 0;
for (const id of ROOMS) for (const d of R[id].doors) {
  const T = R[d.target]; if (!T) continue;
  const saida = sideOf(R[id], d.x, d.z), chegada = sideOf(T, d.sx, d.sz);
  orientCheck++;
  if (chegada === saida) add('MED', `${id} → ${d.target}`, `"${d.label}": sai pela face ${saida} e CHEGA pela face ${chegada} — a geografia teleporta (quebra o mapa mental do jogador)`, `trocar o lado da chegada (sx,sz) pra face ${oposto[saida]} de ${d.target}`);
}

// ============================================================
// 4) RÓTULOS DE PORTA (rótulo aponta pra sala errada)
// ============================================================
for (const id of ROOMS) for (const d of R[id].doors) {
  const T = R[d.target]; if (!T) continue;
  const alvoTk = primaryTokens(T).map((t) => t.toUpperCase());
  const bateuAlvo = alvoTk.filter((t) => d.label.toUpperCase().includes(t)).length;
  for (const id2 of ROOMS) {
    if (id2 === d.target) continue;
    const tk = primaryTokens(R[id2]).map((t) => t.toUpperCase());
    const nome2 = tk.join(' ');
    if (nome2.length < 5 || nome2 === roomName(T).toUpperCase()) continue;
    const citou = tk.filter((t) => d.label.toUpperCase().includes(t)).length;
    if (citou >= Math.max(1, Math.ceil(tk.length * 0.6)) && bateuAlvo === 0) {
      add('MED', `${id}`, `porta "${d.label}" cita "${nome2}" mas o alvo é ${roomName(T)} — rótulo trai o jogador`, `renomear a porta pra citar ${roomName(T)}`);
      break;
    }
  }
}
// rótulos duplicados na mesma sala
for (const id of ROOMS) {
  const labs = R[id].doors.map((d) => d.label);
  const dup = labs.filter((l, i) => labs.indexOf(l) !== i);
  if (dup.length) add('MED', id, `rótulos duplicados de porta: ${[...new Set(dup)].join(' / ')}`, `diferenciar os rótulos`);
}

// ============================================================
// 5) PROPORÇÕES POR FUNÇÃO (regra: arena 3–4x quarto)
// ============================================================
const area = (id) => R[id].w * R[id].d;
const baseQ = area('quarto');
const SALVA = new Set(ROOMS.filter((id) => R[id].interacts.some((it) => it.act === 'save')));
const ARENA = new Set(['catedral', 'telhado']);
const CORREDOR = new Set(['corredor', 'corredor_n', 'corredor3']);
for (const id of ROOMS) {
  const a = area(id), rel = a / baseQ;
  if (ARENA.has(id) && rel < 3) add('MED', id, `arena com só ${rel.toFixed(1)}x o quarto — regra: 3–4x`, `aumentar sala`);
  if (SALVA.has(id) && a > baseQ * 2.5) add('BAIXO', id, `sala de save grande (${a | 0}m²) — saves RE costumam ser aconchegantes`, `ok se for intencional`);
  if (!ARENA.has(id) && !SALVA.has(id) && !CORREDOR.has(id) && rel >= 2 && rel < 3) add('BAIXO', id, `tamanho intermediário (${rel.toFixed(1)}x quarto) — decidir função: apoio ou arena?`, `posicionar itens/inimigos de acordo`);
  if (CORREDOR.has(id)) {
    const ratio = Math.max(R[id].w, R[id].d) / Math.min(R[id].w, R[id].d);
    if (ratio < 2.2) add('BAIXO', id, `corredor gorducho (${R[id].w}x${R[id].d}, ratio ${ratio.toFixed(1)}) — corredor é longo e estreito`, `afinar`);
  }
}

// ============================================================
// 6) SUPPLY LINE (munição/cura a caminho e DENTRO da arena do boss)
// ============================================================
const itemCount = (ids) => {
  const m = {};
  for (const id of ids) for (const pk of R[id].pickups) m[pk.item] = (m[pk.item] || 0) + pk.qty;
  return m;
};
const bossArena = { clara: 'catedral', daniel: 'telhado', bento: null };
for (const [camp, arena] of Object.entries(bossArena)) {
  if (!arena) continue;
  const dist = hops(arena);
  const perto = ROOMS.filter((id) => dist.get(id) !== undefined && dist.get(id) <= 1);
  const sup = itemCount(perto);
  const cura = (sup.pills || 0) + (sup.antidote || 0);
  const muni = Object.entries(sup).filter(([k]) => k.startsWith('ammo') || k === 'shell').reduce((a, [, v]) => a + v, 0);
  if (cura === 0) add('MED', arena, `arena do boss da campanha ${camp}: ZERO cura na arena ou vizinhas (${perto.join(',')})`, `posicionar pills/antidote antes do chefe`);
  if (muni === 0) add('MED', arena, `arena do boss de ${camp}: sem munição de reserva por perto`, `distribuir munição no caminho final`);
}
// fitas: a máquina mais distante do saguão
for (const camp of Object.keys(CAMPANHAS)) {
  const st = CAMPANHAS[camp].start;
  const dist = hops(st);
  const semSavePerto = !ROOMS.some((id) => SALVA.has(id) && dist.get(id) !== undefined && dist.get(id) <= 4);
  if (semSavePerto) add('MED', camp, `início da campanha ${camp} fica a 5+ salas de qualquer save`, `trazer a trilha inicial mais perto da máquina`);
}

// ============================================================
// 7) CÂMERAS DE CORREDOR (olham AO LONGO, não atravessado)
// ============================================================
for (const id of CORREDOR) {
  const Rm = R[id];
  const longo = Rm.w >= Rm.d ? [1, 0] : [0, 1];
  for (const cam of Rm.cams) {
    const vx = cam.look[0] - cam.pos[0], vz = cam.look[2] - cam.pos[2];
    const L = Math.hypot(vx, vz) || 1;
    const along = Math.abs(vx * longo[0] + vz * longo[1]) / L;
    if (along < 0.6) add('BAIXO', id, `câmera em (${cam.pos[0]},${cam.pos[2]}) olha ATRAVESSADO o corredor (along=${along.toFixed(2)}) — ângulo RE olha ao longo`, `girar o look pro eixo longo`);
  }
  if (Rm.cams.length < 2) add('MED', id, `corredor com ${Rm.cams.length} câmera(s) — idas e vindas repetem ângulo`, `+1 câmera cobrindo o outro sentido`);
}

// ============================================================
// 8) GRAFO INFORMA (becos, hubs, graus)
// ============================================================
const grau = new Map(ROOMS.map((id) => [id, adj.get(id).length]));
const becos = ROOMS.filter((id) => grau.get(id) === 1);
const hubs = [...ROOMS].sort((a, b) => grau.get(b) - grau.get(a)).slice(0, 3);

// ============================================================
// RELATÓRIO
// ============================================================
const rank = { CRIT: 0, MED: 1, BAIXO: 2 };
const cnt = {};
for (const f of F) cnt[f.sev] = (cnt[f.sev] || 0) + 1;
const buildV = (fs.existsSync('index.html') && /currentBuild = '([^']+)'/.exec(fs.readFileSync('index.html', 'utf8')) || [])[1] || '?';
const notaBase = 100 - (cnt.CRIT || 0) * 12 - (cnt.MED || 0) * 5 - (cnt.BAIXO || 0) * 1;
const nota = Math.max(0, Math.min(100, notaBase));

let out = '';
out += '══════════════════════════════════════════════════════════════════\n';
out += '   REVIEW DE LAYOUT — SANATÓRIO SANTA LÚCIA (design, não colisão)\n';
out += `   bot de layout v1 · build ${buildV}\n`;
out += '══════════════════════════════════════════════════════════════════\n';
out += `NOTA DE LAYOUT: ${nota}/100 · 🔴 ${cnt.CRIT || 0} · 🟡 ${cnt.MED || 0} · 🔵 ${cnt.BAIXO || 0}\n\n`;

out += 'VERTICAL (regra: 1 escada L1↔L2, 1 elevador L2↔L3, nada mais):\n';
out += `  porta entre andares: ${vert.map((e) => `${e.a}↔${e.b}`).join(', ') || '—'} · elevador: hall2↔corredor3 (acts)\n\n`;
out += 'CIRCUITOS POR ANDAR (ciclos = voltas inteligentes):\n';
for (const f of [1, 2, 3]) out += `  andar ${f}: ${loops[f].V} salas, ${loops[f].E} ligações, ${loops[f].ciclos} circuito(s)${loops[f].ciclos > 0 ? ' ✓' : '  ⚠ árvore'}\n`;
out += '\nDISTÂNCIAS-CHAVE (saltos de sala):\n';
for (const [camp, cfg] of Object.entries(CAMPANHAS)) {
  const d0 = hops(cfg.start);
  const salvaPerto = ROOMS.filter((id) => SALVA.has(id) && d0.has(id)).map((id) => `${id}:${d0.get(id)}`);
  const dFinal = d0.get(cfg.final);
  out += `  ${camp.padEnd(7)} início(${cfg.start}) → final(${cfg.final}): ${dFinal ?? '—'} saltos · saves: ${salvaPerto.join(' ')}\n`;
}
const dBoss = hops('catedral'); const dTel = hops('telhado');
out += `  save(saguao) → catedral: ${dBoss.get('saguao')} saltos · save(enfermaria) → telhado: ${dTel.get('enfermaria')} saltos\n\n`;
out += `BECOS (1 saída — ok se arena/lore): ${becos.join(', ')}\n`;
out += `HUBS: ${hubs.map((h) => `${h}(${grau.get(h)})`).join(', ')}\n`;
out += `SALAS DE SAVE: ${[...SALVA].join(', ')}\n`;
out += `AREAS (x quarto=${baseQ | 0}m²): ${ROOMS.map((id) => `${id}:${(area(id) / baseQ).toFixed(1)}`).join(' · ')}\n\n`;

out += '──────────────────────────────────────────────────────────────────\nACHADOS\n──────────────────────────────────────────────────────────────────\n';
F.sort((a, b) => rank[a.sev] - rank[b.sev] || a.local.localeCompare(b.local));
for (const f of F) {
  const icon = { CRIT: '🔴', MED: '🟡', BAIXO: '🔵' }[f.sev];
  out += `  ${icon} [${f.sev}] ${f.local}: ${f.msg}\n${f.fix ? `        ↳ ${f.fix}\n` : ''}`;
}
out += '\n══════════════════════════════════════════════════════════════════\n';
fs.writeFileSync('LAYOUT_REVIEW.txt', out);
console.log(out.split('\n').slice(4, 6).join('\n'));
const crits = F.filter((f) => f.sev === 'CRIT');
console.log(`\n🔴 CRÍTICOS: ${crits.length}`);
for (const f of crits.slice(0, 10)) console.log(`   ${f.local}: ${f.msg}`);
console.log(`\n📄 relatório: LAYOUT_REVIEW.txt`);
