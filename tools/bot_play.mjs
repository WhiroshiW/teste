// ============================================================
// BOT JOGADOR — SANTA LÚCIA (Progressão V2)
// Joga como um player de verdade: NÃO tem caminho fixo.
// Percepção: só o que a tela mostra (prompt contextual, objetivo
// no HUD, inimigos visíveis com linha de visão, diálogos lidos,
// inventário). Descobre o mapa explorando, erra portas trancadas,
// lê as dicas (14/02, dossiê) e aprende as senhas como um player.
// Uso: node tools/bot_play.mjs [daniel|clara|bento] [maxMin]
// ============================================================
import * as RealTHREE from '../vendor/three.module.min.js';
import fs from 'fs';

// ---------- stubs de DOM (mesmo padrão do test_linear_flow) ----------
const gradStub = { addColorStop() {} };
function make2d() {
  return {
    canvas: null, fillStyle: '', strokeStyle: '', lineWidth: 1, font: '',
    imageSmoothingEnabled: false,
    fillRect() {}, clearRect() {}, strokeRect() {}, fillText() {},
    beginPath() {}, arc() {}, ellipse() {}, moveTo() {}, lineTo() {},
    bezierCurveTo() {}, fill() {}, stroke() {}, save() {}, restore() {},
    translate() {}, rotate() {},
    createLinearGradient() { return gradStub; }, createRadialGradient() { return gradStub; },
    getImageData(x, y, w, h) { return { data: new Uint8ClampedArray(w * h * 4), width: w, height: h }; },
    putImageData() {}, drawImage() {}, closePath() {},
  };
}
function makeCanvas(w = 64, h = 64) {
  return { width: w, height: h, clientWidth: 800, clientHeight: 600, getContext: () => make2d(), style: {}, addEventListener() {}, removeEventListener() {} };
}
const styleStub = () => ({ setProperty() {}, removeProperty() {}, getPropertyValue() { return ''; } });
function makeEl(id = '') {
  return {
    id, classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
    style: styleStub(), children: [], width: 96, height: 96, clientWidth: 800, clientHeight: 600,
    innerHTML: '', textContent: '', value: '9', checked: true,
    appendChild(c) { return c; }, querySelector: () => null, querySelectorAll: () => [],
    addEventListener() {}, getContext: () => make2d(),
    onclick: null, oninput: null, onchange: null, onmouseenter: null, ondblclick: null,
  };
}
global.window = { innerWidth: 800, innerHeight: 600, addEventListener() {}, removeEventListener() {}, __SANTA_LUCIA_HEADLESS__: true };
global.document = {
  createElement: (t) => (t === 'canvas' ? makeCanvas() : makeEl()),
  getElementById: (id) => makeEl(id),
  body: makeEl('body'), addEventListener() {}, removeEventListener() {},
};
global.localStorage = { data: {}, getItem(k) { return this.data[k] || null; }, setItem(k, v) { this.data[k] = v; }, removeItem(k) { delete this.data[k]; } };
global.performance = { now: () => Date.now() };
global.requestAnimationFrame = (fn) => setTimeout(fn, 16);

class MockRenderer {
  constructor() { this.domElement = makeCanvas(320, 180); this.autoClear = true; }
  setSize() {} setPixelRatio() {} setClearColor() {} setRenderTarget() {} render() {} setAnimationLoop() {} clearDepth() {}
  getContext() { return { colorMask() {}, clearDepth() {}, enable() {}, disable() {} }; }
}
const THREE = { ...RealTHREE, WebGLRenderer: MockRenderer };
const { Game } = await import('../js/game.js');
const { ITEMS, WEAPONS, ENEMIES } = await import('../js/config.js');
const { pointInSolids } = await import('../js/entities.js');

const CAMPAIGN = (process.argv[2] || 'daniel').toLowerCase();
const MAX_MIN = parseFloat(process.argv[3] || '90');
const DT = 1 / 30;
const EYES_FILE = `docs/refs/_debug/eyes_${CAMPAIGN}.jsonl`;

// ---------- boot do jogo ----------
const game = new Game(THREE, makeEl('container'));
game.unlocks.extra_bento = true;
game.ui.doorAnim = (e, cb) => { if (cb) cb(); }; // sem animação de porta no headless

// Olhos: captura de diálogos/toasts (o bot LÊ o que o jogo mostra)
const heard = [];
const origSay = game.say.bind(game);
game.say = (lines, cb) => {
  const ls = Array.isArray(lines) ? lines : (lines && lines.text ? [lines] : []);
  for (const l of ls) heard.push({ t: gameTime, who: l.who, text: l.text });
  return origSay(lines, cb);
};
const origToast = game.ui.toast.bind(game.ui);
game.ui.toast = (html, dur) => { heard.push({ t: gameTime, who: 'toast', text: String(html).replace(/<[^>]*>/g, '') }); return origToast(html, dur); };
let itensColetados = 0;
const origPickupAt = game.pickupAt.bind(game);
game.pickupAt = (p) => { const t0 = p.taken; origPickupAt(p); if (!t0 && p.taken) { itensColetados++;
  for (const v of bot.pkSeen.values()) if (v.room === game.room.id && Math.abs(v.x - p.x) < 0.01 && Math.abs(v.z - p.z) < 0.01) { v.taken = true; v.stale = false; } } };

let gameTime = 0;
let zeroed = false;
const origShowEnding = game.ui.showEnding.bind(game.ui);
game.ui.showEnding = (stats) => { zeroed = true; return origShowEnding(stats); };

// relógio do jogo sob nosso controle
game.clock.getDelta = () => DT;

// ---------- util ----------
const wrap = (a) => { while (a > Math.PI) a -= Math.PI * 2; while (a < -Math.PI) a += Math.PI * 2; return a; };
const dist = (ax, az, bx, bz) => Math.hypot(ax - bx, az - bz);
const TRAIL = []; // trilha completa do bot (olhos)
let CODES_N = 0;
const flagsSig = () => JSON.stringify(game.flags) + '|' + game.inv.map((i) => i.item + (i.qty > 1 ? 'x' + i.qty : '')).join(',') + '|c' + CODES_N;

// ---------- OLHOS (dump JSONL p/ radar PNG) ----------
fs.mkdirSync('docs/refs/_debug', { recursive: true });
fs.writeFileSync(EYES_FILE, '');
const pathTrail = []; // trilha do player por sala
function eyesSnapshot(tag) {
  const r = game.room;
  if (!r) return;
  let meshes = 0, lights = 0;
  const count = (o) => { meshes++; if (o.isLight || o.isPointLight || o.isSpotLight) lights++; (o.children || []).forEach(count); };
  count(r.group);
  const rec = {
    tag, t: +gameTime.toFixed(1), campaign: CAMPAIGN, room: r.id, roomName: r.name,
    trail: TRAIL.filter((q) => q.room === r.id),
    player: { x: +game.player.x.toFixed(2), z: +game.player.z.toFixed(2), angle: +game.player.angle.toFixed(2), hp: game.player.hp },
    objective: game.currentObjective(),
    inv: game.inv.map((i) => i.item + (i.qty > 1 ? 'x' + i.qty : '')),
    enemies: game.enemies.filter((e) => e.alive).map((e) => ({ type: e.type || '?', x: +e.x.toFixed(2), z: +e.z.toFixed(2), hp: e.hp })),
    pickups: r.pickups.map((p) => ({ item: p.item, x: p.x, z: p.z, taken: !!p.taken })),
    doors: r.doors.map((d) => ({ target: d.target, x: d.x, z: d.z, need: d.need ? (d.need.item || d.need.flag) : null })),
    interacts: r.interacts.map((i) => ({ act: i.act, x: i.x, z: i.z })),
    spawns: (r.spawns || []).map((s) => ({ type: s.type, x: s.x, z: s.z })),
    stats: { meshes, lights, solids: r.solids.length, cams: r.cams.length },
    frags: (game.flags.frags || []).filter(Boolean).length,
  };
  fs.appendFileSync(EYES_FILE, JSON.stringify(rec) + '\n');
}


// ---------- NAVEGAÇÃO: grade + A* (o bot enxerga a geometria da sala,
// igual um player enxerga os móveis) ----------
const gridCache = new Map();
function gridFor(room) {
  const key = room.id + '#' + room.solids.length;
  if (gridCache.has(key)) return gridCache.get(key);
  const R = 0.38; // raio de colisão do player (infla os móveis)
  const hw = (room.w || 16) / 2 + 2, hd = (room.d || 12) / 2 + 2;
  const CS = 0.25;
  const w = Math.ceil((hw * 2) / CS), h = Math.ceil((hd * 2) / CS);
  const blocked = new Uint8Array(w * h);
  const idx = (cx, cz) => cz * w + cx;
  for (let cz = 0; cz < h; cz++) {
    for (let cx = 0; cx < w; cx++) {
      const x = -hw + cx * CS, z = -hd + cz * CS;
      // célula bloqueada se o PONTO ou vizinhança inflada bate em sólido
      if (pointInSolids(x, z, room.solids) ||
          pointInSolids(x + R, z, room.solids) || pointInSolids(x - R, z, room.solids) ||
          pointInSolids(x, z + R, room.solids) || pointInSolids(x, z - R, room.solids)) blocked[idx(cx, cz)] = 1;
    }
  }
  const g = { w, h, hw, hd, cs: CS, blocked, idx };
  gridCache.set(key, g);
  return g;
}
function astar(room, sx, sz, tx, tz) {
  const g = gridFor(room);
  const toCell = (x, z) => [Math.max(0, Math.min(g.w - 1, Math.round((x + g.hw) / g.cs))), Math.max(0, Math.min(g.h - 1, Math.round((z + g.hd) / g.cs)))];
  let [scx, scz] = toCell(sx, sz), [tcx, tcz] = toCell(tx, tz);
  const free = (cx, cz) => cx >= 0 && cz >= 0 && cx < g.w && cz < g.h && !g.blocked[g.idx(cx, cz)];
  if (!free(scx, scz)) { // acha célula livre próxima do ponto de partida
    outer: for (let r = 1; r < 8; r++) for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++)
      if (free(scx + dx, scz + dz)) { scx += dx; scz += dz; break outer; }
  }
  if (!free(tcx, tcz)) {
    outer2: for (let r = 1; r < 10; r++) for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++)
      if (free(tcx + dx, tcz + dz)) { tcx += dx; tcz += dz; break outer2; }
  }
  const N = g.w * g.h;
  const come = new Int32Array(N).fill(-1);
  const gs = new Float32Array(N).fill(Infinity);
  const open = [[Math.hypot(tcx - scx, tcz - scz), scx, scz]];
  gs[g.idx(scx, scz)] = 0;
  const DIRS = [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];
  let found = false, guard = 0;
  while (open.length && guard++ < 60000) {
    let bi = 0;
    for (let i = 1; i < open.length; i++) if (open[i][0] < open[bi][0]) bi = i;
    const [, cx, cz] = open.splice(bi, 1)[0];
    if (cx === tcx && cz === tcz) { found = true; break; }
    const ci = g.idx(cx, cz);
    for (const [dx, dz] of DIRS) {
      const nx = cx + dx, nz = cz + dz;
      if (!free(nx, nz)) continue;
      if (dx && dz && (!free(cx + dx, cz) || !free(cx, cz + dz))) continue; // sem cortar quina
      const ni = g.idx(nx, nz);
      const cost = gs[ci] + (dx && dz ? 1.414 : 1);
      if (cost < gs[ni]) {
        gs[ni] = cost; come[ni] = ci;
        open.push([cost + Math.hypot(tcx - nx, tcz - nz), nx, nz]);
      }
    }
  }
  if (!found) return null;
  const pts = [];
  let ci = g.idx(tcx, tcz);
  while (ci !== -1) {
    const cx = ci % g.w, cz = (ci - cx) / g.w;
    pts.push([-g.hw + cx * g.cs, -g.hd + cz * g.cs]);
    ci = come[ci];
  }
  pts.reverse();
  // suaviza: pula waypoints com linha de visão livre
  const out = [];
  let i = 0;
  while (i < pts.length) {
    let j = pts.length - 1;
    while (j > i + 1 && !room.los(pts[i][0], pts[i][1], pts[j][0], pts[j][1])) j--;
    out.push(pts[j]);
    i = (j === i) ? i + 1 : j;
  }
  return out;
}

// ============================================================
// O CÉREBRO
// ============================================================
class Bot {
  constructor() {
    this.roomsSeen = new Set();
    this.doorMem = new Map();      // "sala:idx" -> {label, locked, msg, sig}
    this.actTried = new Map();     // "sala:act" -> sig
    this.pkTried = new Map();      // "sala:idx" -> sig (anti spam E com mochila cheia)
    this.codes = [];               // senhas aprendidas LENDO o jogo
    this.codesTried = new Set();
    this.deaths = 0;
    this.acts = 0; this.pickups = 0; this.doorsOpened = 0; this.shots = 0;
    this.stallTicks = 0; this.veerUntil = 0; this.veerDir = 1; this.unstickUntil = 0;
    this.lastPos = { x: 0, z: 0 };
    this.navTarget = null; this.navKind = '';
    this.targetDeadSig = '';
    this.keyCooldown = 0;
    this.lastShot = 0; this.lastHeal = -99;
    this.lastRoom = '';
    this.snapT = 0;
    this.blockedReport = null;
    this.deadTargets = new Set(); // alvos geometricamente inatingíveis nesta assinatura
    this.dmgMem = new Map();      // tipo do inimigo -> maior dano que senti dele
    this.roomFear = new Map();    // sala -> até quando temo reentrar
    this.fleeCount = new Map();   // sala -> quantas vezes apanhei/fugi/morri nela
    this._hits = [];              // [{t,d}] dano nos últimos 5s
    this._lastHp = 100;
    this._fleeUntil = 0;
    this._fleeDoor = null;
    this._leftAt = new Map();     // sala -> quando a saí (histerese 45s)
    this._prevRoom = null;
    this._dashUntil = 0;
    this._sigLastSave = null;     // assinatura dos flags no último save
    this._progLastSave = undefined; // progresso real gravado
    this._saveDetour = false;
    this._chase = new Map();      // inimigo -> {d0,t} da perseguição atual
    this._chaseFail = new Map();  // inimigo -> até quando desisti dele
    this.roomDoors = new Map();   // sala -> [{idx,target,x,z}] (placas que o bot LEU)
    this.goalRoom = null;         // sala-alvo lida no OBJETIVO (HUD)
    this.pkSeen = new Map();      // pkKey -> {room,x,z,taken,stale} — o que o bot JÁ VIU pelo mundo
    this._wdCount = 0;            // ♻️ consecutivas na mesma sala
    this._goalRescue = null;      // desvio: sala com item possivelmente esquecido (pós-morte)
    this._rescueTried = new Set();
    this.finished = null;
    this.roomEnterT = 0;
  }

  // ---- aprendizado LENDO diálogos/toasts ----
  learnFromText(text) {
    if (!text) return;
    const dates = text.matchAll(/\b(\d{2})\/(\d{2})\b/g);
    for (const m of dates) this.pushCode(m[1] + m[2]);
    const quads = text.matchAll(/\b(\d{4})\b/g);
    for (const m of quads) this.pushCode(m[1]);
  }
  pushCode(c) {
    if (!this.codes.includes(c)) { this.codes.push(c); CODES_N = this.codes.length; this.log(`📖 aprendeu possível senha: ${c}`); }
  }

  log(msg) { console.log(`[bot ${String(+gameTime).padStart(4, '0')}s] ${msg}`); }

  key(code) { if (gameTime >= this.keyCooldown) { this.keyCooldown = gameTime + 0.22; game.onKey(code); } }
  pressE() { this.key('KeyE'); }
  pressERaw() { game.onKey('KeyE'); } // interação de jogo: NUNCA engolir input

  release() { game.keys.clear(); }

  // ---- percepção ----
  percept() {
    const p = game.player;
    const cand = game.state === 'play' ? game.currentCandidate() : null;
    const visible = game.enemies
      .filter((e) => e.alive && (this._chaseFail.get(e) || 0) <= gameTime)
      .filter((e) => dist(e.x, e.z, p.x, p.z) < 11 && game.room.los(p.x, p.z, e.x, e.z))
      .map((e) => ({ e, d: dist(e.x, e.z, p.x, p.z), bearing: wrap(Math.atan2(e.x - p.x, e.z - p.z) - p.angle) }))
      .sort((a, b) => a.d - b.d);
    return { p, cand, visible };
  }

  progressSig() {
    const f = game.flags;
    return [
      (f.frags || []).map((x) => x ? 1 : 0).join(''),
      f.valveOpen ? 1 : 0, f.poraoOpen ? 1 : 0, f.safeOpened ? 1 : 0,
      f.secretOpen ? 1 : 0, f.hallNorthOpen ? 1 : 0, f.plantsCleared ? 1 : 0,
      f.chapelSignal ? 1 : 0, f.chapelEncounterMet ? 1 : 0, f.luciaLocketGot ? 1 : 0,
      f.memorialOpen ? 1 : 0, f.bossDead ? 1 : 0, f.gateClosed ? 1 : 0,
    ].join('|');
  }

  canCarry(pk) {
    const d = ITEMS[pk.item];
    if (!d) return false;
    const stackable = d.type !== 'weapon' && (d.type !== 'key' || pk.item === 'frag') && game.inv.some((i) => i.item === pk.item);
    if (stackable || d.type === 'key') return true;
    if (d.type === 'weapon' && game.inv.filter((i) => ITEMS[i.item] && ITEMS[i.item].type === 'weapon').length < 3) return true;
    return game.inv.length < 12;
  }

  heavyArmed() {
    // armada pesada: arma na mão com dano alto E bala — OU qualquer ranged
    // com munição no bolso (o revólver da Clara é arma de boss dela;
    // "sem arma pesada" fazia o dash manda-la examinar estátua no meio
    // da briga e morrer com 36 de dano por golpe)
    const w = WEAPONS[game.equipped];
    if (w && w.dmg >= 60 && game.hasItem(w.ammo)) return true;
    const rangedComBala = game.inv.some((i) => {
      const d = ITEMS[i.item];
      return d && d.ammo && game.hasItem(d.ammo);
    });
    return !!rangedComBala;
  }

  doorLockedInfo(d) {
    if (d.setFlag && game.flags[d.setFlag]) return { locked: false };
    if (!d.need) return { locked: false };
    if (d.need.item) return { locked: !game.hasItem(d.need.item), item: d.need.item };
    if (d.need.flag) return { locked: !game.flags[d.need.flag], flag: d.need.flag };
    return { locked: false };
  }

  // ---- uso de item de cura (mesma UI do player) ----
  tryHeal(bigAround = false) {
    if (gameTime - this.lastHeal < 8) return false;
    const p = game.player;
    if (p.dead || p.hp <= 0 || p.hp > (bigAround ? 85 : 45)) return false;
    const idx = game.inv.findIndex((i) => ITEMS[i.item] && ITEMS[i.item].type === 'heal');
    if (idx === -1) return false;
    this.lastHeal = gameTime;
    this.log(`💉 vida ${p.hp} — usando ${ITEMS[game.inv[idx].item].name}`);
    game.openInventory();
    game.ui.invMode = 'grid'; game.ui.invSel = idx;
    game.ui.invConfirm();           // abre o detalhe do item
    game.ui.invCmd = 0;
    game.ui.invConfirm();           // executa USAR
    if (game.state === 'inventory') game.closeInventory();
    return true;
  }

  // ---- COMBATE (mira igual player: gira, aperta espaço, J) ----
  combat(per, now) {
    const { p, visible } = per;
    const tgt = visible[0];
    // perseguição sem progresso: 8s sem chegar perto = desisto dele (por ora)
    const ch = this._chase.get(tgt.e);
    if (!ch) this._chase.set(tgt.e, { d0: tgt.d, t: now });
    else if (now - ch.t > 8) {
      if (tgt.d > ch.d0 - 1.0) {
        this._chaseFail.set(tgt.e, gameTime + 45);
        this._chase.delete(tgt.e);
        this.log(`🤚 não chego perto disso (${tgt.e.type || 'bicho'} d=${tgt.d.toFixed(1)}) — sigo minha vida`);
        return false;
      }
      this._chase.set(tgt.e, { d0: tgt.d, t: now });
    }
    if (!this._cb) this._cb = { last: now };
    else if (now - this._cb.last > 10) {
      this.log(`⚔️ briga longa: ${tgt.e.type || 'inimigo'} d=${tgt.d.toFixed(1)} ehp=${tgt.e.hp} | eu hp=${p.hp} arma=${game.equipped} err=${tgt.bearing.toFixed(2)}`);
      this._cb.last = now;
    }
    const w = ITEMS[game.equipped];
    const hasAmmo = w && w.ammo ? game.hasItem(w.ammo) : true;
    const ranged = w && w.ammo && hasAmmo;
    const bigDmg = this.dmgMem.get(tgt.e.type || '?') || 0;
    // grandão na mira: melhor ferramenta na mão antes de trocar tiro
    if (bigDmg >= 22) {
      // cadeia completa: pesadas primeiro, depois o melhor ranged COM munição
      const temBala = (wi) => { const w = ITEMS[wi]; return !w || !w.ammo || game.hasItem(w.ammo); };
      const want = ['grenade_launcher', 'shotgun', 'revolver', 'magnum', 'pistol'].find((wi) => game.inv.some((i) => i.item === wi) && temBala(wi));
      if (want && game.equipped !== want) { game.equipWeapon(game.inv.find((i) => i.item === want)); this.log(`🧰 equipo ${ITEMS[want].name} pro grandão`); }
    }
    const kite = bigDmg >= 22 ? 3.4 : 1.9;

    // REGRAS DO JOGO: J só dispara/facada com Space (mira) segurado!
    game.keys.add('Space');

    if (ranged) {
      // gira pro alvo e atira; recua se estiver em cima
      const err = tgt.bearing;
      if (err > 0.1) { game.keys.add('KeyA'); game.keys.delete('KeyD'); }
      else if (err < -0.1) { game.keys.add('KeyD'); game.keys.delete('KeyA'); }
      else { game.keys.delete('KeyA'); game.keys.delete('KeyD'); }
      if (tgt.d < kite) game.keys.add('KeyS'); else game.keys.delete('KeyS');
      if (Math.abs(err) < 0.3 && now - this.lastShot > (WEAPON_RATE(game) || 0.5)) {
        this.lastShot = now; this.shots++;
        this.key('KeyJ');
      }
    } else {
      // facada: aproxima e apunhala
      if (tgt.d > 1.5 && bigDmg < 22) {
        const err = tgt.bearing;
        if (err > 0.25) { game.keys.add('KeyA'); game.keys.delete('KeyD'); }
        else if (err < -0.25) { game.keys.add('KeyD'); game.keys.delete('KeyA'); }
        else { game.keys.delete('KeyA'); game.keys.delete('KeyD'); }
        game.keys.add('KeyW');
      } else if (bigDmg >= 22) {
        game.keys.delete('KeyW'); game.keys.add('KeyS'); // faca contra grandão? nem pensar: recuando
      } else {
        game.keys.delete('KeyW');
        const err = tgt.bearing;
        if (err > 0.2) { game.keys.add('KeyA'); game.keys.delete('KeyD'); }
        else if (err < -0.2) { game.keys.add('KeyD'); game.keys.delete('KeyA'); }
        if (now - this.lastShot > (WEAPON_RATE(game) || 0.5) && Math.abs(err) < 0.8) {
          this.lastShot = now; this.shots++;
          this.key('KeyJ');
        }
      }
    }
    return true; // combate domina o tick
  }

  // ---- navegação (A* + follow) ----
  navigate(tx, tz, now) {
    const p = game.player;
    const room = game.room;
    const tkey = room.id + ':' + tx.toFixed(1) + ',' + tz.toFixed(1);

    // (re)calcula o caminho só quando muda o destino ou o caminho morreu
    const fails = this._navFails && this._navFails.get(tkey) || 0;
    if (fails >= 3 && now < (this._navFailUntil || 0)) { this.navTarget = null; return; }
    if (this._pathKey !== tkey || !this._path || !this._path.length) {
      this._pathKey = tkey;
      this._repathAt = now + 3;
      this._path = room.los(p.x, p.z, tx, tz) ? [[tx, tz]] : astar(room, p.x, p.z, tx, tz);
      if (!this._path) {
        // fallback: alvo (porta na parede) puxado 1.3m na direção do player
        const dxp = p.x - tx, dzp = p.z - tz, L = Math.hypot(dxp, dzp) || 1;
        this._path = astar(room, p.x, p.z, tx + (dxp / L) * 1.3, tz + (dzp / L) * 1.3);
      }
      if (!this._path) {
        // sem caminho: alvo inatingível por ora (PORTAS nunca: o mundo muda)
        if (this.navTarget && this.navTarget.key && this.navKind !== 'door') this.deadTargets.add(this.navTarget.key);
        this.navTarget = null;
        this.stallTicks = 0;
        this._navFails = this._navFails || new Map();
        this._navFails.set(tkey, fails + 1);
        if (fails + 1 >= 3) this._navFailUntil = now + 60;
        if (fails < 3) this.log(`🚧 sem caminho até (${tx.toFixed(1)},${tz.toFixed(1)}) — alvo descartado`);
        return;
      }
      this._wp = 0;
    }

    // repath periódico (o mundo muda: água drena, portas abrem)
    if (now > (this._repathAt || 0)) {
      this._pathKey = null;
      this._repathAt = now + 3;
      return;
    }

    // waypoint atual
    let [wx, wz] = this._path[Math.min(this._wp, this._path.length - 1)];
    if (dist(p.x, p.z, wx, wz) < 0.62 && this._wp < this._path.length - 1) { this._wp++; [wx, wz] = this._path[this._wp]; }

    const desired = Math.atan2(wx - p.x, wz - p.z);
    const err = wrap(desired - p.angle);

    game.keys.delete('KeyS');
    if (err > 0.13) { game.keys.add('KeyA'); game.keys.delete('KeyD'); }
    else if (err < -0.13) { game.keys.add('KeyD'); game.keys.delete('KeyA'); }
    else { game.keys.delete('KeyA'); game.keys.delete('KeyD'); }

    const far = dist(p.x, p.z, tx, tz) > 2.2;
    if (Math.abs(err) < 0.6 && far && p.hp > 40 && !this.enemyNear(9)) game.keys.add('ShiftLeft'); else game.keys.delete('ShiftLeft');
    if (Math.abs(err) < 0.8) game.keys.add('KeyW');
    else game.keys.delete('KeyW');

    // anti-atolamento local: se preso muito tempo, manda repathar
    if (dist(p.x, p.z, this.lastPos.x, this.lastPos.z) < 0.02) {
      this.stallTicks++;
      if (this.stallTicks > 35) {
        this.stallTicks = 0;
        if (this._wp < this._path.length - 1) { this._wp++; } // pula o waypoint problemático
        else this._pathKey = null; // último wp: repatha
        this.unstickUntil = now + 0.4;
      }
    } else this.stallTicks = 0;
    this.lastPos = { x: p.x, z: p.z };
  }

  enemyNear(r) {
    const p = game.player;
    return game.enemies.some((e) => e.alive && dist(e.x, e.z, p.x, p.z) < r);
  }

  // ---- escolha do próximo objetivo (EXPLORAÇÃO, sem roteiro) ----
  // Instinto de player de RE: VARRE a sala (itens + examinar tudo) SÓ DEPOIS
  // pensa em portas. Sem isso ele fica pingue-pongue entre salas.
  chooseTarget(per) {
    const p = game.player, r = game.room;
    const sig = flagsSig();

    // 1) varredura da sala: pickups + acts não testados
    const sweep = [];
    for (const pk of r.pickups) {
      this.pkSeen.set('pk:' + r.id + ':' + pk.idx, { room: r.id, x: pk.x, z: pk.z, taken: !!pk.taken, stale: false });
      if (pk.taken) continue;
      if (!this.canCarry(pk)) continue; // não cabe: player segue o baile
      sweep.push({ x: pk.x, z: pk.z, kind: 'pickup', w: 1.0, key: 'pk:' + r.id + ':' + pk.idx });
    }
    const temCodigoNovo = this.codes.some((c) => !this.codesTried.has(c));
    for (const it of r.interacts) {
      if (it.when && !it.when(game.flags)) continue;
      const key = r.id + ':' + it.act;
      const tried = this.actTried.get(key);
      // cofre: player volta com senha nova na cabeça (enquanto houver código não testado)
      const safeVivo = it.act === 'safe' && !game.flags.safeOpened; // cofre aberto: nunca mais
      if (!tried || tried !== sig || (safeVivo && temCodigoNovo)) sweep.push({ x: it.x, z: it.z, kind: 'act', act: it.act, w: 1.0, key: 'act:' + r.id + ':' + it.act });
    }
    const sweep2 = sweep.filter((o) => !this.deadTargets.has(o.key));
    if (sweep2.length) {
      for (const o of sweep2) o.cost = dist(p.x, p.z, o.x, o.z) * (o.w || 1);
      sweep2.sort((a, b) => a.cost - b.cost);
      return sweep2[0];
    }

    // 2) sala varrida: agora sim, portas — REGRA DURA: sala nova primeiro!
    const novas = [], retent = [], usadas = [], justLeft = [], fearPool = [];
    r.doors.forEach((d, i) => {
      const dk = r.id + ':' + i;
      const info = this.doorLockedInfo(d);
      const mem = this.doorMem.get(dk);
      if (!info.locked) {
        if ((this.roomFear.get(d.target) || 0) > gameTime) {
          fearPool.push({ x: d.x, z: d.z, kind: 'door', idx: i, w: 1, key: 'door:' + r.id + ':' + i });
        } else if (gameTime - (this._leftAt.get(d.target) || -1e9) < 45) {
          justLeft.push({ x: d.x, z: d.z, kind: 'door', idx: i, w: 1, key: 'door:' + r.id + ':' + i });
        } else {
          (this.roomsSeen.has(d.target) ? usadas : novas).push({ x: d.x, z: d.z, kind: 'door', idx: i, w: 1, key: 'door:' + r.id + ':' + i });
        }
      } else if (mem && mem.sig !== sig) {
        // ganhei algo novo desde a última tentativa: vale retentar
        retent.push({ x: d.x, z: d.z, kind: 'door', idx: i, w: 1, key: 'door:' + r.id + ':' + i });
      }
    });
    for (const pool0 of [novas, retent, usadas, justLeft, fearPool]) {
      const pool = pool0.filter((o) => !this.deadTargets.has(o.key));
      if (pool.length) {
        for (const o of pool) o.cost = dist(p.x, p.z, o.x, o.z) * (o.w || 1);
        pool.sort((a, b) => a.cost - b.cost);
        return pool[0];
      }
    }
    return null;
  }

  // ---- tick principal ----
  tick(now) {
    if (zeroed) { this.finished = 'ZERADO'; return; }
    const st = game.state;

    if (st === 'dialog' || st === 'banner' || st === 'intro' || st === 'intro_cutscene' || st === 'sponsor_intro' || st === 'cutscene') {
      this.release();
      this.pressE();
      if (st === 'intro_cutscene' || st === 'sponsor_intro') this.key('Enter');
      return;
    }
    if (st === 'door') { this.release(); return; }
    if (st === 'inventory') { this.release(); game.closeInventory(); return; }
    if (st === 'savebox') {
      this.release();
      if (!this._savedThisBox) {
        this._savedThisBox = true;
        this._saveboxAt = performance.now();
        this.saveCdUntil = gameTime + 300; // cooldown anti-loop do save
        this.log('💾 arquivando o prontuário na máquina de escrever');
        game.saveConfirm(true);
        this._sigLastSave = flagsSig();
        this._progLastSave = this.progressSig();
        this._saveDetour = false;
        this._goalSavePit = false;
        this.saveCdUntil = gameTime + 300;
      } else if (performance.now() - (this._saveboxAt || 0) > 900) {
        // savebox travada (o jogo fecha em 650ms REAL; 900ms é a rede)
        this.log('⚠️ savebox não fecha — Escape');
        this.key('Escape');
        this._saveboxAt = gameTime;
      }
      return;
    }
    if (st === 'pause') { this.release(); this.key('Escape'); return; }
    if (st === 'safe') { this.release(); this.trySafeCode(); return; }
    if (st === 'ending') {
      this.release();
      if (zeroed) this.finished = 'ZERADO';
      return;
    }
    if (st === 'gameover') return; // tratado no post()

    if (st !== 'play') { this.release(); return; }
    if (st === 'play' && this._savedThisBox && game.state === 'play') this._savedThisBox = false;

    // aprende com o que ouviu desde o último tick
    for (const h of heard) this.learnFromText(h.text);
    heard.length = 0;

    // re-armar o watchdog a cada 100s enquanto a sala não mudar
    if (this._wdAt && gameTime - this._wdAt > 100) this._wdAt = null;
    if (this.roomEnterT !== this._wdRoom) { this._wdRoom = this.roomEnterT; this._wdAt = null; this._wdCount = 0; }
    if (gameTime - this.roomEnterT > 150 && !this._wdAt) {
      this._wdAt = gameTime;
      this.deadTargets.clear();
      this.actTried.clear();
      this.pkTried.clear();
      this.deadTargets.clear();
      const nt = this.navTarget;
      this.navTarget = null;
      this._goalSuppress = null;
      this.wander = null;
      this._wdCount++;
      if (this._wdCount >= 2 && !this._goalRescue && !this._goalSavePit) {
        // player real: a porta quer um item que fiquei pra trás — revisito o que já vi pelo mundo
        for (const [k, v] of this.pkSeen) {
          if (v.room === game.room.id || this._rescueTried.has(k)) continue;
          if (v.taken && !v.stale) continue;
          if ((this.roomFear.get(v.room) || 0) > gameTime) continue;
          this._goalRescue = v.room;
          this.log(`🧭 algo ficou pra trás em ${v.room} — vou conferir`);
          break;
        }
      }
      this.log(`♻️ 150s parado na mesma sala [${game.room ? game.room.id : '?'}] — recomeço por aqui`);
    }

    // ---- 🏁 FINISHER: boss morto → direto no ponto de fuga ----
    // o HUD grita "atravesse a LUZ no altar" / "entre no HELICÓPTERO":
    // nenhum player fica coletando cunha depois de matar o chefe
    if (game.flags.bossDead && st === 'play') {
      const fimId = game.currentCampaign === 'clara' ? 'catedral' : 'telhado';
      if (game.room && game.room.id === fimId) {
        const fim = game.currentCampaign === 'clara' ? { x: 0.0, z: -5.0, r: 1.8 } : { x: 5.2, z: 3.0, r: 2.0 };
        const df = dist(game.player.x, game.player.z, fim.x, fim.z);
        if (df < fim.r) {
          this.release(); this.pressERaw();
          if (!this._finLog || gameTime - this._finLog > 20) { this._finLog = gameTime; this.log('🏁 boss caiu — indo embora de vez'); }
          return;
        }
        this.navTarget = { x: fim.x, z: fim.z, kind: 'act', key: 'final' };
        this.navKind = 'act'; this.navRoom = game.room.id;
        this.navigate(fim.x, fim.z, now);
        return;
      }
    }

    const per = this.percept();

    // ---- memória de dano: quem me bate forte fica registrado ----
    if (game.player.hp < this._lastHp - 0.01) {
      const d0 = this._lastHp - game.player.hp;
      this._hits.push({ t: gameTime, d: d0 });
      if (per.visible.length) {
        // atribuo a quem está no ALCANCE DELE (+0.6 de folga): bosses têm
        // braço longo (range 2.3) e o gate fixo 2.2 escondia o dano deles
        const v0 = per.visible[0];
        const rng = (ENEMIES[v0.e.type || '?'] && ENEMIES[v0.e.type].range) || 1.4;
        if (v0.d < rng + 0.6) this.dmgMem.set(v0.e.type || '?', Math.max(this.dmgMem.get(v0.e.type || '?') || 0, d0));
      }
    }
    this._lastHp = game.player.hp;
    this._hits = this._hits.filter((h) => gameTime - h.t < 5);
    const recentLoss = this._hits.reduce((a, h) => a + h.d, 0);

    const fleeing = gameTime < (this._fleeUntil || 0) && this._fleeDoor;

    if (!fleeing) {
      // ---- PÂNICO: apanhei demais / grandão em cima = FUJO pela porta ----
      const threat = per.visible.length ? per.visible[0] : null;
      const threatBig = threat && (this.dmgMem.get(threat.e.type || '?') || 0) >= 22;
      const heavy = this.heavyArmed();
      const dashPossible = threatBig && !heavy && game.player.hp >= 35 && gameTime > (this._dashNoTarget || 0);
      const bossHere = !!(game.boss && game.boss.alive && game.enemies && game.enemies.includes(game.boss));
      if (threat && !heavy && !dashPossible && !bossHere && gameTime > (this._dashUntil || 0) && (recentLoss > 25 || (threatBig && threat.d < 2.9 && game.player.hp < 40))) {
        const r = game.room;
        let fd = null, fdist = 1e9;
        // já estava correndo pra uma porta perto? compromisso com ELA (não viro atrás)
        if (this.navKind === 'door' && this.navTarget && this.navRoom === r.id) {
          const nd = dist(game.player.x, game.player.z, this.navTarget.x, this.navTarget.z);
          if (nd < 3.5) fd = { x: this.navTarget.x, z: this.navTarget.z, idx: this.navTarget.idx };
        }
        if (!fd) r.doors.forEach((d, i) => {
          if (this.doorLockedInfo(d).locked) return;
          const dd = dist(game.player.x, game.player.z, d.x, d.z);
          if (dd < fdist) { fdist = dd; fd = { x: d.x, z: d.z, idx: i }; }
        });
        if (fd) {
          const fc = (this.fleeCount.get(r.id) || 0) + 1;
          this.fleeCount.set(r.id, fc);
          const fearT = this._sigAtEnter !== flagsSig() ? 300 : Math.min(900, 420 * Math.pow(1.5, Math.min(fc - 1, 4)));
          this.roomFear.set(r.id, gameTime + fearT);
          this._fleeUntil = gameTime + 10;
          this._fleeDoor = fd;
          this.navTarget = { x: fd.x, z: fd.z, kind: 'door', idx: fd.idx, key: 'door:' + r.id + ':' + fd.idx };
          this.navKind = 'door'; this.navRoom = r.id; this.renavUntil = now + 12;
          this.log(`😱 ${threat.e.type || 'bicho'} d=${threat.d.toFixed(1)} me arrasou (-${recentLoss | 0} hp) @${r.id}(${game.player.x.toFixed(1)},${game.player.z.toFixed(1)}) alvo=(${this.navTarget ? this.navTarget.kind : '?'}) — FUJO, volto daqui a ${(fearT / 60) | 0}min mais armado`);
          return;
        }
      }
      // ---- 🏃 CORRIDA COM PROPÓSITO: desarmado contra grandão, vou logo no
      //      que interessa (pegar arma/destravar) — brigar é plano B ----
      if (threatBig && threat && game.player.hp > 45 && !heavy && gameTime > (this._dashUntil || 0)) {
        const r = game.room;
        if (this.navKind === 'door' && this.navTarget && this.navRoom === r.id) {
          // já estou correndo pra uma porta: COMPROMETO a corrida até ela
          this._dashUntil = now + 14; this.renavUntil = now + 14;
          this.log('🏃 sigo até a saída — brigar desarmado é plano B');
        }
        let tgt = null, bc = 1e9;
        // acts não tentados ganham 3m de vantagem (a máquina do objetivo
        // costuma estar PERTO da entrada — gira e resolve)
        for (const it of r.interacts) {
          if (it.when && !it.when(game.flags)) continue;
          if (this.actTried.has(r.id + ':' + it.act)) continue;
          const dd = dist(game.player.x, game.player.z, it.x, it.z) - 3;
          if (dd < bc) { bc = dd; tgt = { x: it.x, z: it.z, kind: 'act' }; }
        }
        for (const pk of r.pickups) {
          if (pk.taken) continue;
          const d2 = ITEMS[pk.item];
          const wantW = d2 && d2.type === 'weapon' && !game.inv.some((i) => i.item === pk.item);
          const wantA = d2 && d2.type === 'ammo' && game.inv.some((i) => ITEMS[i.item] && ITEMS[i.item].ammo === pk.item) && !game.hasItem(pk.item);
          if ((wantW || wantA) && dist(game.player.x, game.player.z, pk.x, pk.z) < bc) { bc = dist(game.player.x, game.player.z, pk.x, pk.z); tgt = { x: pk.x, z: pk.z, kind: 'pickup' }; }
        }
        if (tgt && !(this.navKind === 'door' && this._dashUntil > now - 13.9 && this.navTarget && this.navTarget.kind === 'door')) {
          this._dashUntil = now + 14;
          this.navTarget = { x: tgt.x, z: tgt.z, kind: tgt.kind, key: 'dash' };
          this.navKind = tgt.kind; this.navRoom = r.id; this.renavUntil = now + 14;
          this.log(`🏃 grandão na área e eu sem arma pesada — CORRO pro que interessa primeiro`);
        } else if (!tgt && !(this.navKind === 'door' && this._dashUntil > now - 13.9 && this.navTarget && this.navTarget.kind === 'door')) {
          this._dashNoTarget = gameTime + 5; // sem arma na sala: fugir é válido
        }
      }
    }

    // vida baixa: cura antes de tudo (se não estiver sendo perseguido de perto)
    const bossFight = !!(game.boss && game.boss.alive && game.enemies && game.enemies.includes(game.boss));
    if (!fleeing && (per.visible.length === 0 || per.visible[0].d > 3 || (bossFight && game.player.hp < 45))
        && gameTime > (this._dashUntil || 0)
        && !(per.visible.length && per.visible[0].d < 4.5 && game.player.hp > 40 && !bossFight)) {
      const bigAround = per.visible.some((v) => (this.dmgMem.get(v.e.type || '?') || 0) >= 22);
      if (this.tryHeal(bigAround)) return;
    }

    // combate tem prioridade (exceto em fuga)
    // dash é COMPROMETIDO: ou o E sai, ou a pancada vira pânico — sem meia-medida
    if (!fleeing && per.visible.length > 0 && gameTime > (this._dashUntil || 0) && this.combat(per, now) !== false) return;
    this._cb = null;
    game.keys.delete('Space');

    // ---- POUSO: alvo parado e perto (pickup/act) — viro o corpo pra ele ----
    // o cand exige estar DE FRENTE; chegar por cima sem virar = 9s e banimento
    if (this.navTarget && (this.navTarget.kind === 'pickup' || this.navTarget.kind === 'act') && this.navRoom === game.room.id) {
      const dd = dist(game.player.x, game.player.z, this.navTarget.x, this.navTarget.z);
      if (dd < 1.1) {
        const berr = wrap(Math.atan2(this.navTarget.x - game.player.x, this.navTarget.z - game.player.z) - game.player.angle);
        if (Math.abs(berr) > 0.25) {
          this.release();
          if (berr > 0) { game.keys.add('KeyA'); game.keys.delete('KeyD'); }
          else { game.keys.add('KeyD'); game.keys.delete('KeyA'); }
          return;
        }
        this.release();
      }
    }

    // interação com o que está na frente (mesmo prompt do player)
    const c = per.cand;
    if (c) {
      const sig = flagsSig();
      if (c.kind === 'pickup') {
        // martela E até o jogo decidir — MAS se não cabe nem deveria
        // (mochila cheia pra esse tipo), nem desperdiço o clique
        if (!this.canCarry(c.ref)) return; // cai pro explore: anda pra longe
        this.release(); this.pressE();
        return;
      }
      if (c.kind === 'act') {
        const key = game.room.id + ':' + c.ref.act;
        const tried = this.actTried.get(key);
        // botão do elevador é meu alvo: aperta de novo (riding é idempotente)
        const ehBotao = this.navTarget && this.navKind === 'act'
          && dist(this.navTarget.x, this.navTarget.z, c.ref.x, c.ref.z) < 1.5
          && /^elevator/.test(c.ref.act || '');
        if (c.ref.act === 'save' && gameTime < (this.saveCdUntil || 0) && !this._saveDetour) {
          // acabou de salvar: não vira viciado em máquina de escrever
          this.actTried.set(key, sig);
        } else if (ehBotao || !tried || tried !== sig || (c.ref.act === 'safe' && !game.flags.safeOpened && this.codes.some((cc) => !this.codesTried.has(cc)))) {
          this.release(); this.pressERaw();
          this.actTried.set(key, sig); this.acts++;
          this.log(`🔍 ${c.ref.prompt || c.ref.act}`);
          return;
        }
      }
      if (c.kind === 'door') {
        // REGRINHA DE CASA: só uso porta que É meu alvo de navegação (senão
        // o spawn nasce dentro do raio da porta de trás e vira pingue-pongue)
        const isTarget = this.navTarget && this.navKind === 'door' &&
          dist(this.navTarget.x, this.navTarget.z, c.ref.x, c.ref.z) < 1.5;
        if (isTarget && gameTime >= (this.doorHoldUntil || 0)) {
          const dk = game.room.id + ':' + game.room.doors.indexOf(c.ref);
          const info = this.doorLockedInfo(c.ref);
          const mem = this.doorMem.get(dk) || {};
          if (!info.locked || mem.sig !== sig) {
            this.release(); this.pressERaw();
            if (!info.locked && !mem.opened) { mem.opened = true; this.doorsOpened++; }
            if (info.locked) {
              mem.locked = true; mem.msg = c.ref.msg || ''; mem.sig = sig;
              this.log(`🔒 trancada: ${c.ref.label} — ${mem.msg.slice(0, 70)}`);
            }
            this.doorMem.set(dk, mem);
            return;
          }
        } else if (gameTime < (this.doorHoldUntil || 0) &&
                   !(per.visible.length && (this.dmgMem.get(per.visible[0].e.type || '?') || 0) >= 22)) {
          return; // congelinha antes de navegar (mas NÃO com brutamontes na cara)
        }
      }
    }

    // WATCHDOG GLOBAL: 150s na mesma sala sem história = memória de
    // 'alvos impossíveis' está OBSOLETA (o mundo mudou: peguei chave,
    // drenaram água...) — apaga tudo e raciocina de novo.
    // TELEMETRIA (temporária): a cada 15s, estado da navegação e do mundo

    // NAVEGAÇÃO POR OBJETIVO: o HUD diz onde ir e o bot vai (como um player)
    let goalRoom = this.parseGoalRoom();
    if (goalRoom && !game.hasSave()) {
      // nunca gravou prontuário: primeira parada é a máquina (o TIPS do jogo manda)
      if (!this._noSaveLog || gameTime - this._noSaveLog > 60) {
        this._noSaveLog = gameTime;
        this.log('📝 antes de tudo: registro meu prontuário na máquina');
      }
      goalRoom = null;
    }
    // 💾 PROGRESSO NÃO SALVO: detour pra máquina de escrever (player zela o save)
    const prog = this.progressSig();
    const canInk = game.countItem('ribbon') > 0 || game.unlocks.infinite_ink;
    if (this._progLastSave !== undefined && prog !== this._progLastSave && game.room.id !== 'saguao' && canInk
        && this.roomsSeen.has('saguao')
        && !(per.visible.length && per.visible[0].d < 6)) {
      goalRoom = 'saguao';
      this._saveDetour = true;
      this._goalSavePit = true; // me ancora na MÁQUINA (senão o hop me esbarra na porta e vou embora sem salvar)
    }
    const ehBossGoal = goalRoom === 'catedral' || goalRoom === 'telhado';
    if (goalRoom && !ehBossGoal && (this.roomFear.get(goalRoom) || 0) > gameTime) {
      if (!this._fearLogAt || gameTime - this._fearLogAt > 90) {
        this._fearLogAt = gameTime;
        this.log(`😨 ${goalRoom} me apanhou demais — deixo pra lá por ora, tem outro canto pra ir`);
      }
      goalRoom = null;
    }
    // anti-loop: se o objetivo manda pra sala onde JÁ ESTIVE e não progredi,
    // suprime até o texto do objetivo mudar (player desiste e caça outra ala)
    const objTxt = game.currentObjective() || '';
    if (this._goalSuppress && (this._goalSuppress.obj !== objTxt || gameTime > this._goalSuppress.until)) this._goalSuppress = null;
    if (goalRoom && goalRoom === game.room.id) {
      // anti-flip-flop SÓ dentro da sala-alvo: se estou aqui e o objetivo não
      // progrediu, suprimo por um tempo (player desiste e caça outra ala)
      const lg = this._lastGoalEnter;
      if (lg && lg.room === goalRoom && gameTime - lg.t < 120 && lg.obj === objTxt) {
        this._goalSuppress = { obj: objTxt, until: gameTime + 150 };
      }
      this._lastGoalEnter = { room: goalRoom, t: gameTime, obj: objTxt };
    }
    if (this._goalSuppress) goalRoom = null;
    if (this._goalSavePit) goalRoom = 'saguao';
    // 3º andar nunca visto: o player SABE que o elevador sobe (painel) —
    // subo e exploro de lá (senão o BFS morre na sala desconhecida)
    if (goalRoom && ['corredor3', 'escritorio_sup', 'telhado'].includes(goalRoom)
        && !this.roomsSeen.has('corredor3') && this.roomsSeen.has('hall2')) {
      goalRoom = 'corredor3';
    }
    if (this._goalRescue && !this._goalSavePit) goalRoom = this._goalRescue;
    this.goalRoom = goalRoom;
    if (this._goalRescue && game.room.id === this._goalRescue) {
      // cheguei: o sweep local re-verifica; o que continuar sumido entra na lista de conferidos
      for (const [k, v] of this.pkSeen) if (v.room === this._goalRescue && v.stale) this._rescueTried.add(k);
      this._goalRescue = null; this._wdCount = 0;
    }
    if (goalRoom && goalRoom === game.room.id && this._goalSavePit) {
      // ancorado na máquina de escrever: navego até ela e o cand-act salva
      this.navTarget = { x: 2.0, z: 0.4, kind: 'act', key: 'savebox' };
      this.navKind = 'act'; this.navRoom = game.room.id;
      this.navigate(2.0, 0.4, now);
      return;
    }
    if (goalRoom && goalRoom !== game.room.id) {
      const hop = this.nextHopTo(goalRoom);
      if (!hop && gameTime - (this._noHopLog || 0) > 60) {
        this._noHopLog = gameTime;
        this.log(`🧭 sem caminho conhecido até ${goalRoom} (conheço: ${[...this.roomDoors.keys()].join(',')})`);
        this.navTarget = null; this.navKind = null; // solta o alvo velho: explora rumo ao desconhecido
      }
      if (hop) {
        const sigH = flagsSig();
        const hopKey = 'door:' + game.room.id + ':' + hop.idx;
        const cand0 = per.cand;
        if (cand0 && cand0.kind === 'door' && game.room.doors.indexOf(cand0.ref) === hop.idx) {
          this.navTarget = { x: hop.x, z: hop.z, kind: 'door', idx: hop.idx, key: hopKey };
          this.navKind = 'door';
          this.navRoom = game.room.id;
          const info0 = this.doorLockedInfo(cand0.ref);
          if (!info0.locked || (this.doorMem.get(hopKey) || {}).sig !== sigH) {
            this.release(); this.pressERaw();
            const mem0 = this.doorMem.get(hopKey) || {};
            if (info0.locked) { mem0.locked = true; mem0.msg = cand0.ref.msg || ''; mem0.sig = sigH; this.log(`🔒 trancada: ${cand0.ref.label}`); }
            else if (!mem0.opened) { mem0.opened = true; this.doorsOpened++; }
            this.doorMem.set(hopKey, mem0);
          }
          return;
        }
        // mira a PORTA REAL: ponto puxado pro centro já caiu no raio de porta
        // trancada vizinha (mezanino roubava o candidato do porão → stall eterno).
        // Se A* falhar (porta na parede), o fallback do navigate puxa 1.3m sozinho.
        this.navTarget = { x: hop.x, z: hop.z, kind: 'door', idx: hop.idx, key: hopKey };
        this.navKind = 'door';
        this.navRoom = game.room.id;
        this.navigate(hop.x, hop.z, now);
        return;
      }
    }

    // explorar
    if (!this.navTarget || this.navRoom !== game.room.id || now > (this.renavUntil || 0)) {
      const t = this.chooseTarget(per);
      const same = t && this.navTarget && t.kind === this.navTarget.kind && dist(t.x, t.z, this.navTarget.x, this.navTarget.z) < 0.1;
      if (!same) this.navSince = now; // novo alvo: zera o cronômetro de alcance
      if (same && now - (this.navSince || now) > 9) {
        // 12s sem converter o alvo: inatingível por ora (geometria da sala)
        this.log(`🚧 9s sem alcançar ${t.kind} (${t.x.toFixed(1)},${t.z.toFixed(1)}) — estou em (${game.player.x.toFixed(1)},${game.player.z.toFixed(1)}) path=${this._path ? this._path.length + 'wp@' + this._wp : 'null'} err=${wrap(Math.atan2(t.x-game.player.x,t.z-game.player.z)-game.player.angle).toFixed(2)}`);
        if (t.key && t.kind !== 'door') this.deadTargets.add(t.key); // porta JAMAIS (o mundo muda)
        this.navTarget = null;
        this.stallTicks = 0;
        return;
      }
      this.navTarget = t;
      this.navRoom = game.room.id;
      this.navKind = t ? t.kind : '';
      this.renavUntil = now + 2.0; // re-avalia a cada 2s (alvo pode ter ficado obsoleto)
      const sigNow = flagsSig();
      if (this.targetDeadSig !== sigNow) { this.targetDeadSig = sigNow; this.deadTargets.clear(); }
      if (t && !same) this.log(`➡️ vou de ${t.kind} em (${t.x.toFixed(1)},${t.z.toFixed(1)})`);
    }
    if (this.navTarget) {
      this.navigate(this.navTarget.x, this.navTarget.z, now);
    } else {
      // nada conhecido: perambula (player perdido anda pra lá e pra cá)
      this.release();
      if (!this.wander || gameTime > (this.wanderUntil || 0)) {
        this.wander = { x: (Math.random() - 0.5) * game.room.w * 0.7, z: (Math.random() - 0.5) * game.room.d * 0.7 };
        this.wanderUntil = gameTime + 4;
        this.log('🤷 sem alvos conhecidos — perambulando...');
      }
      this.navigate(this.wander.x, this.wander.z, now);
      // sala estagnada: PLAYER DE VERDADE sai e procura outra ala.
      // Só declara BLOQUEADO se NENHUMA porta de saída restar.
      if (gameTime - this.roomEnterT > 120) {
        const r2 = game.room;
        const saidas = [];
        r2.doors.forEach((d, i) => {
          const info = this.doorLockedInfo(d);
          if (!info.locked && !this.deadTargets.has('door:' + r2.id + ':' + i)) saidas.push({ x: d.x, z: d.z, idx: i, target: d.target });
        });
        if (saidas.length) {
          this._exitRot = (this._exitRot || 0) + 1;
          const s0 = saidas[this._exitRot % saidas.length];
          this.log(`🌀 sala ${r2.id} estagnada — saio pra ${s0.target} e volto depois`);
          for (const o of [...this.deadTargets]) if (o.startsWith('door:' + r2.id)) this.deadTargets.delete(o);
          this.navTarget = { x: s0.x, z: s0.z, kind: 'door', idx: s0.idx, key: 'door:' + r2.id + ':' + s0.idx };
          this.navKind = 'door';
          this.navRoom = r2.id;
          this.renavUntil = now + 4;
          this.roomEnterT = now - 90; // renova o relógio de estagnação
          this.wander = null;
        } else {
          this.blockedReport = `sala ${game.room.id}: sem ações úteis e sem saída (alvos=${JSON.stringify(this.roomOptsLeft())})`;
          this.finished = 'BLOQUEADO';
        }
      }
    }
  }

  // ---- objetivo do HUD -> sala-alvo (o bot LÊ o objetivo como um player) ----
  parseGoalRoom() {
    const o = game.currentObjective() || '';
    // porta SELADA não é destino: o objetivo lista o que é acionável ao lado
    if (/selada/i.test(o)) {
      if (/EXPERIMENTOS/i.test(o)) return 'experimentos';
      if (/FUSÍVEL|fusível/i.test(o)) return 'corredor_n';
      if (/FRAGMENT/i.test(o)) return 'passagem';
    }
    const T = [
      // PLANTA NOVA (turnarounds 14/out) — L1 + L2 + L3
      [/HELICÓPTERO/i, 'telhado'],
      [/SUPERVISOR|CARTÃO DO HELIPONTO/i, 'escritorio_sup'],
      [/VULTO|telhado|TELHADO|heliponto|HELIPONTO|cobertura|COBERTURA/i, 'telhado'],
      [/3º ANDAR|3º andar/i, 'corredor3'],
      [/FORNALHAS|VÁLVULA|válvulas/i, 'fornalhas'],
      [/ENFERMARIA/i, 'enfermaria'],
      [/ELEVADOR|elevador|2º ANDAR|2º andar|ESCADA/i, 'corredor_n'],
      [/quadro de força/i, (game.hasItem && game.hasItem('fuse')) ? 'saguao' : 'corredor_n'],
      [/catedral|capela/i, 'catedral'],
      [/monólito|medalhão/i, 'floresta'],
      [/experimentos|DOSSIÊ|dossiê/i, 'experimentos'],
      [/estacionamento|carro/i, 'estacionamento'],
      [/estufa/i, 'estufa'],
      [/cripta|cemitério|túmulo/i, 'cemiterio'],
      [/passagem secreta|armário de ferramentas/i, 'passagem'],
      [/casa do zelador|zelador/i, 'casa_zelador'],
      [/portão de ferro|floresta/i, 'floresta'],
      [/FUSÍVEL|fusível/i, 'corredor_n'],
      [/cofre confidencial|QUARTO 2|senha/i, 'quarto2'],
      [/máquina de escrever|salvar/i, 'saguao'],
      [/hall|saguão/i, 'saguao'],
    ];
    for (const [re, room] of T) if (re.test(o)) return room;
    return null;
  }

  // BFS no grafo de salas VISITADAS (o bot só conhece o que andou)
  nextHopTo(goal) {
    if (!goal) return null;
    // NOTA: goal pode ser sala NUNCA vista — o BFS acha a aresta que chega lá
    // (porta vista de longe ou painel do elevador); sem rota conhecida → null
    const start = game.room.id;
    if (start === goal) return null;
    // 1ª passada: BFS que NÃO usa portas trancadas (player lembra delas);
    // se não houver rota livre, tenta de novo aceitando trancadas
    for (const allowLocked of [false, true]) {
      const hop = this._bfsHop(goal, start, allowLocked);
      if (hop) return hop;
    }
    return null;
  }

  _bfsHop(goal, start, allowLocked) {
    const prev = new Map([[start, null]]);
    const q = [start];
    // arestas virtuais do ELEVADOR (acts, não portas): o painel tem posição
    const ELEV = {
      corredor_n: [{ target: 'hall2', x: 0.0, z: -1.8 }],
      hall2: [{ target: 'corredor3', x: -4.0, z: -5.8 }],
      corredor3: [{ target: 'hall2', x: 0.6, z: 2.3 }],
    };
    while (q.length) {
      const cur = q.shift();
      const edges = (this.roomDoors.get(cur) || []).slice();
      if (!allowLocked && ELEV[cur]) for (const e of ELEV[cur]) edges.push({ target: e.target, idx: -9, x: e.x, z: e.z, elev: true });
      for (const d of edges) {
        const doorRef = (game.room.id === cur) ? game.room.doors[d.idx] : null;
        const lockedNow = doorRef ? this.doorLockedInfo(doorRef).locked : !!(this.doorMem.get(cur + ':' + d.idx) || {}).locked;
        if (!allowLocked && lockedNow) continue;
        if (!this.roomDoors.has(d.target) && d.target !== goal) continue; // desconhecida: só se for o destino
        if (prev.has(d.target)) continue;
        prev.set(d.target, { from: cur, door: d });
        if (d.target === goal) {
          // reconstrói o primeiro salto
          let hop = d.target, step = prev.get(d.target);
          while (step && step.from !== start) { hop = step.from; step = prev.get(step.from); }
          return step ? step.door : d;
        }
        q.push(d.target);
      }
    }
    return null;
  }

  roomOptsLeft() {
    const r = game.room, sig = flagsSig();
    const acts = r.interacts.filter((i) => !i.when || i.when(game.flags)).map((i) => i.act);
    const doors = r.doors.map((d, i) => ({ t: d.target, locked: this.doorLockedInfo(d).locked }));
    return { acts, doors };
  }

  trySafeCode() {
    const next = this.codes.find((c) => !this.codesTried.has(c));
    if (!next) { game.safeCancel(); this.log('❓ sem senhas conhecidas — desisto do cofre por ora'); return; }
    this.codesTried.add(next);
    this.log(`🔢 testo a senha ${next} no cofre...`);
    game.safeConfirm(next);
  }

  onRoomChange() {
    if (game.room && game.room.id !== this.lastRoom) {
      this.lastRoom = game.room.id;
      this.roomsSeen.add(game.room.id);
      this.roomEnterT = gameTime;
      this.navTarget = null;
      this.stallTicks = 0;
      this.lastPos = { x: game.player.x, z: game.player.z };
      this.doorHoldUntil = gameTime + 1.2; // ignora a porta de trás ao chegar
      this._fleeUntil = 0; this._fleeDoor = null;
      this._hits = []; this._lastHp = game.player.hp;
      this._chase.clear(); this._chaseFail.clear(); this._dashUntil = 0;
      this._sigAtEnter = flagsSig();
      if (this._prevRoom && this._prevRoom !== game.room.id) this._leftAt.set(this._prevRoom, gameTime);
      this._prevRoom = game.room.id;
      this.roomDoors.set(game.room.id, game.room.doors.map((d, i) => ({ idx: i, target: d.target, x: d.x, z: d.z })));
      this.log(`🚪 ENTREI: ${game.room.name}`);
      eyesSnapshot('room-enter');
      pathTrail.push({ room: game.room.id, x: game.player.x, z: game.player.z });
    }
  }
}

function WEAPON_RATE(g) {
  const w = g.inv.find((i) => i.item === g.equipped);
  return w && WEAPONS_RATE[g.equipped] || 0.55;
}
const WEAPONS_RATE = { knife: 0.5, scalpel: 0.45, wrench: 0.5, crowbar: 0.5, pistol: 0.55, revolver: 0.7, shotgun: 1.1, magnum: 0.9, grenade_launcher: 1.2 };

// ---------- RUN ----------
console.log(`\n🤖 BOT JOGADOR — campanha ${CAMPAIGN.toUpperCase()} — sem roteiro, aprendendo lendo o jogo\n`);
game.startCampaign(CAMPAIGN);
const bot = new Bot();
const MAXT = MAX_MIN * 60;
let deaths = 0;

let _frameN = 0;
async function mainLoop() {
while (gameTime < MAXT && !bot.finished) {
  bot.onRoomChange();
  bot.tick(gameTime);
  game.frame();
  gameTime += DT;
  // DEIXA O EVENT LOOP RESPIRAR: sem isso os setTimeout do jogo
  // (save, cutscene do memorial, cutscene da capela...) nunca disparam
  if (++_frameN % 12 === 0) await new Promise((r) => setTimeout(r, 1)); // yield com TIMER (setImmediate pode starving timers do jogo)
  TRAIL.push({ room: game.room ? game.room.id : '', x: +game.player.x.toFixed(2), z: +game.player.z.toFixed(2) });
  if (game.state !== globalThis.__lastState) { globalThis.__lastState = game.state; console.log(`[st ${gameTime.toFixed(0)}s] estado -> ${game.state} @ ${game.room ? game.room.id : '?'}`); }
  if (TRAIL.length > 40000) TRAIL.splice(0, 5000);

  // eventos
  if (game.state === 'gameover' && !bot._goHandled) {
    bot._goHandled = true;
    deaths++; bot.deaths = deaths;
    eyesSnapshot('death');
    { const dr = game.room ? game.room.id : '?';
      const dc2 = (bot.fleeCount.get(dr) || 0) + 1;
      bot.fleeCount.set(dr, dc2);
      bot.roomFear.set(dr, gameTime + Math.min(900, 420 * Math.pow(1.5, Math.min(dc2 - 1, 4))));
      bot._hits = []; bot._fleeUntil = 0; bot._fleeDoor = null; bot._lastHp = 100; }
    if (game.hasSave && game.hasSave()) {
      bot.log(`💀 MORREU — carregando o último prontuário salvo (morte ${deaths})`);
      for (const v of bot.pkSeen.values()) if (v.taken) v.stale = true; // save antigo pode devolver itens ao mundo
      bot._goalRescue = null; bot._wdCount = 0;
      game.continueGame();
      if (game.state === 'gameover' || game.state === 'title') game.startCampaign(CAMPAIGN);
    } else {
      bot.log(`💀 MORREU sem save — recomeçando do zero (morte ${deaths})`);
      bot.roomsSeen.clear();
      bot.dmgMem.clear(); bot.roomFear.clear(); bot.fleeCount.clear();
      bot.actTried.clear(); bot.pkTried.clear(); bot.deadTargets.clear();
      game.startCampaign(CAMPAIGN);
    }
  } else if (game.state !== 'gameover') bot._goHandled = false;

  if (gameTime - bot.snapT > 20) { bot.snapT = gameTime; eyesSnapshot('periodic'); }
}
}
await mainLoop();

// ---------- RELATÓRIO ----------
const frags = (game.flags.frags || []).filter(Boolean).length;
const result = bot.finished || (zeroed ? 'ZERADO' : 'TEMPO ESGOTADO');
console.log('\n──────── RELATÓRIO DO BOT ────────');
console.log(`resultado:        ${result}`);
console.log(`salas visitadas:  ${bot.roomsSeen.size}/20`);
console.log(`fragmentos:       ${frags}/4`);
console.log(`mortes:           ${deaths}`);
console.log(`porta-aberturas:  ${bot.doorsOpened} | interações: ${bot.acts} | itens: ${itensColetados} | tiros/facadas: ${bot.shots}`);
console.log(`tempo de jogo:    ${Math.round(gameTime)}s (${Math.round(gameTime / 60)}min)`);
console.log(`senhas aprendidas: ${bot.codes.join(', ') || 'nenhuma'}`);
console.log(`inventário final: ${game.inv.map((i) => i.item).join(', ') || 'vazio'}`);
if (bot.blockedReport) console.log(`bloqueio: ${bot.blockedReport}`);
eyesSnapshot(result === 'ZERADO' ? 'victory' : 'end');
console.log(`\n👀 olhos: ${EYES_FILE} (radar PNGs: node tools/eyes_radar.py ${CAMPAIGN})`);
process.exit(0);
