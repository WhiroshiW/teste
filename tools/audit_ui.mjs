// ============================================================
// BOT DE UI/MENUS — SANTA LÚCIA (auditor de interface)
// NÃO joga: (A) varre o código (DOM, estados, ícones, textos D,
// loja, itens) e (B) BOOTA o jogo headless e NAVEGA por todas as
// telas — capturando 'undefined'/'NaN' desenhados, elementos fora
// da tela, overlays que não fecham e textos vazios.
// Saída: UI_REVIEW.txt na raiz.
// Uso: node tools/audit_ui.mjs
// ============================================================
import fs from 'fs';

// ---------------- stubs de DOM (com GRAVAÇÃO) ----------------
const gradStub = { addColorStop() {} };
const W = 800, H = 600;
let frame = []; // buffer de draw calls da "tela atual"
function make2d() {
  const base = {
    canvas: null, fillStyle: '', strokeStyle: '', lineWidth: 1, font: '',
    imageSmoothingEnabled: false,
    fillText(t, x, y) { frame.push({ t: String(t), x, y, kind: 'text' }); },
    fillRect(x, y, w, h) { frame.push({ x, y, w, h, kind: 'rect' }); },
    clearRect() {}, strokeRect() {}, strokeText(t, x, y) { frame.push({ t: String(t), x, y, kind: 'text' }); },
    beginPath() {}, arc() {}, ellipse() {}, moveTo() {}, lineTo() {},
    bezierCurveTo() {}, quadraticCurveTo() {}, fill() {}, stroke() {}, closePath() {},
    save() {}, restore() {}, translate() {}, rotate() {}, scale() {}, drawImage() {},
    setTransform() {}, createPattern() { return null; },
    createLinearGradient() { return gradStub; }, createRadialGradient() { return gradStub; },
    getImageData(x, y, w, h) { return { data: new Uint8ClampedArray(Math.max(4, w * h * 4)), width: w, height: h }; },
    putImageData() {}, measureText: (t) => ({ width: String(t).length * 7 }),
  };
  return new Proxy(base, { get(t, k) { if (k in t) return t[k]; return () => undefined; }, set(t, k, v) { t[k] = v; return true; } });
}
const ALL_EL = new Map();
function makeCanvas(w = 64, h = 64) {
  const c = { width: w || W, height: h || H, clientWidth: W, clientHeight: H, style: { setProperty() {}, removeProperty() {}, getPropertyValue: () => '' }, addEventListener() {}, removeEventListener() {}, getContext: () => make2d() };
  return c;
}
function makeEl(id = '') {
  const el = {
    id, tagName: 'DIV', style: { setProperty() {}, removeProperty() {}, getPropertyValue: () => '' }, children: [], width: 96, height: 96, clientWidth: W, clientHeight: H,
    innerHTML: '', textContent: '', value: '', checked: true, dataset: {},
    classList: {
      items: new Set(),
      add(...c) { c.forEach((x) => this.items.add(x)); },
      remove(...c) { c.forEach((x) => this.items.delete(x)); },
      toggle(c, v) { if (v === undefined) v = !this.items.has(c); if (v) this.items.add(c); else this.items.delete(c); },
      contains(c) { return this.items.has(c); },
    },
    appendChild(c) { el.children.push(c); return c; },
    querySelector() { return makeEl(); }, querySelectorAll() { return []; },
    addEventListener() {}, removeEventListener() {}, setAttribute() {}, getAttribute: () => null,
    getContext: () => make2d(), focus() {}, blur() {}, click() {},
    onclick: null, oninput: null, onchange: null, onmouseenter: null, ondblclick: null,
  };
  if (id) ALL_EL.set(id, el);
  return el;
}
global.window = { innerWidth: W, innerHeight: H, addEventListener() {}, removeEventListener() {}, location: { search: '' } };
global.document = {
  createElement: (tag) => (tag === 'canvas' ? makeCanvas() : makeEl()),
  getElementById: (id) => { if (!ALL_EL.has(id)) ALL_EL.set(id, makeEl(id)); return ALL_EL.get(id); },
  body: makeEl('body'), addEventListener() {}, removeEventListener() {},
};
global.localStorage = { data: {}, getItem(k) { return this.data[k] || null; }, setItem(k, v) { this.data[k] = v; }, removeItem(k) { delete this.data[k]; } };
global.performance = { now: () => Date.now() };
global.requestAnimationFrame = (fn) => setTimeout(fn, 16);
global.Image = class { constructor() { this.style = {}; this.onload = null; } set src(v) { if (this.onload) setTimeout(this.onload, 0); } };
global.Audio = class { constructor() { this.volume = 1; } play() { return Promise.resolve(); } pause() {} load() {} addEventListener() {} };
class MockRenderer { constructor() { this.domElement = makeCanvas(320, 180); } setSize() {} setPixelRatio() {} setClearColor() {} setRenderTarget() {} render() {} setAnimationLoop() {} clearDepth() {} getContext() { return { colorMask() {}, clearDepth() {}, enable() {}, disable() {} }; } }

import * as RealTHREE from '../vendor/three.module.min.js';
const THREE = { ...RealTHREE, WebGLRenderer: MockRenderer };
const { Game } = await import('../js/game.js');
const C = await import('../js/config.js');
const { ICONS } = await import('../js/icons.js');
const S = await import('../js/story.js');
const ITEMS = C.ITEMS, SHOP_ITEMS = C.SHOP_ITEMS, GALLERY_MODELS = C.GALLERY_MODELS, CAMPAIGNS = C.CAMPAIGNS;
const D = S.D || S.default?.D || {};

const F = [];
const add = (sev, local, msg, fix = '') => F.push({ sev, local, msg, fix });
const INFO = [];

// ================= A) ANÁLISE ESTÁTICA =================
console.log('🔎 Parte A — varredura estática do código de UI...\n');
const srcUI = fs.readFileSync('js/ui.js', 'utf8');
const srcGame = fs.readFileSync('js/game.js', 'utf8');
const srcHTML = fs.readFileSync('index.html', 'utf8');

// A1. elementos DOM referenciados vs existentes no index.html
const refsEl = [...srcUI.matchAll(/\$\('([\w-]+)'\)/g)].map((m) => m[1]);
const htmlIds = new Set([...srcHTML.matchAll(/id="([\w-]+)"/g)].map((m) => m[1]));
const faltamDOM = [...new Set(refsEl.filter((id) => !htmlIds.has(id)))];
for (const id of faltamDOM) add('CRIT', 'ui.js', `el '${id}' referenciado mas NÃO EXISTE no index.html — tela/HUD quebrado`, `adicionar <div id="${id}"> no index.html`);

// A2. estados setados vs tratados
const setStates = [...new Set([...srcGame.matchAll(/this\.state = '(\w+)'/g)].map((m) => m[1]))];
const bothSrc = srcGame + srcUI;
for (const st of setStates) {
  const usos = (bothSrc.match(new RegExp(`\\bstate === '${st}'`, 'g')) || []).length
    + (bothSrc.match(new RegExp(`\\bst === '${st}'`, 'g')) || []).length
    + (bothSrc.match(new RegExp(`case '${st}':`, 'g')) || []).length;
  let tratado = usos > 0;
  if (!tratado) {
    // roteamento por métodos dedicados (helpBack/optionsBack/doorSequence/show*): a string
    // do estado aparece em mais lugares do que os próprios sets = existe tratamento
    const sets = (bothSrc.match(new RegExp(`state(?:\\s*)=(?:\\s*)'${st}'`, 'g')) || []).length;
    const mencoes = (bothSrc.match(new RegExp(`'${st}'`, 'g')) || []).length;
    tratado = mencoes > sets;
  }
  if (!tratado) add('ALTO', 'game.js', `estado '${st}' é SETADO mas nunca é TRATADO (sem update/draw/input) — tela morta ou travamento`, `implementar o handler de '${st}'`);
}

// A3. ícones usados vs ICONS
const iconUses = new Set();
for (const src of [srcUI, srcGame]) for (const m of src.matchAll(/icon\('([\w-]+)'/g)) iconUses.add(m[1]);
for (const it of Object.values(ITEMS)) if (it.icon) iconUses.add(it.icon);
for (const it of SHOP_ITEMS) if (it.icon) iconUses.add(it.icon);
const iconsSet = new Set(ICONS);
const iconFaltando = [...iconUses].filter((i) => !iconsSet.has(i));
for (const i of iconFaltando) add('MED', 'icons', `ícone '${i}' usado mas não existe no ICONS — cai no fallback genérico`, `adicionar '${i}' ao ICONS ou trocar o uso`);
// ícones declarados e nunca usados (info)
const nuncaUsados = ICONS.filter((i) => !iconUses.has(i));
if (nuncaUsados.length) INFO.push(`ℹ️ ícones no ICONS sem uso atual (biblioteca de design): ${nuncaUsados.join(', ')}`);
if (false) add('BAIXO', 'icons', `${nuncaUsados.length} ícones definidos e nunca usados: ${nuncaUsados.join(', ')}`, `usar ou remover`);

// A4. referências D.* vs keys de story
const dKeys = new Set(Object.keys(D));
const dRefs = new Set([...srcGame.matchAll(/\bD\.(\w+)/g)].map((m) => m[1]));
const dFaltando = [...dRefs].filter((k) => !dKeys.has(k));
for (const k of dFaltando) add('CRIT', 'story.js', `D.${k} usado no game.js mas NÃO EXISTE em story.js — texto vira undefined na tela`, `criar a entrada D.${k}`);
// textos vazios de D
for (const [k, v] of Object.entries(D)) {
  if (typeof v === 'function') continue; // diálogos paramétricos (ex: diario_texto(idx))
  if (!Array.isArray(v) || v.length === 0) add('MED', `D.${k}`, 'diálogo declarado mas vazio (array vazio) — say() não mostra nada', 'escrever as falas');
  else for (const l of v) if (!l.who || !l.text) add('MED', `D.${k}`, `fala sem 'who' ou sem 'text'`, 'completar a fala');
}

// A5. loja
for (const it of SHOP_ITEMS) {
  const preco = it.cost ?? it.price ?? it.pts;
  if (!Number.isInteger(preco) || preco < 0) add('MED', `loja:${it.id}`, `preço inválido (${preco})`, 'preço inteiro >= 0');
  if (!it.name || !it.desc) add('MED', `loja:${it.id}`, 'item da loja sem nome ou descrição', 'completar');
  if (it.icon && !iconsSet.has(it.icon)) add('MED', `loja:${it.id}`, `ícone '${it.icon}' inexistente`, 'corrigir ícone');
}
// A6. itens e campanhas
for (const [id, it] of Object.entries(ITEMS)) {
  if (!it.name || !it.desc) add('BAIXO', `item:${id}`, 'sem nome/descrição (tooltip vazio)', 'completar');
  if (it.icon && !iconsSet.has(it.icon)) add('MED', `item:${id}`, `ícone '${it.icon}' inexistente`, 'corrigir');
}
for (const [cid, camp] of Object.entries(CAMPAIGNS)) {
  for (const si of camp.startItems || []) if (!ITEMS[si.item]) add('CRIT', `campanha:${cid}`, `item inicial '${si.item}' não existe`, 'corrigir startItems');
}

// ================= B) NAVEGAÇÃO DINÂMICA =================
console.log('🖥️  Parte B — bootando o jogo e navegando por todas as telas...\n');
const game = new Game(THREE, makeEl('screen'));
const ui = game.ui;

const BADTXT = /undefined|NaN|\[object|null(?![a-zA-Z])/;
function snapScreen(nome) {
  frame = [];
  const vis = [], probs = [];
  for (const [id, el] of ALL_EL) {
    if (el.classList.contains('hidden')) continue;
    vis.push(id);
    const txt = String(el.textContent || '') + ' ' + String(el.innerHTML || '');
    if (BADTXT.test(txt)) probs.push(['CRIT', `${nome}`, `overlay '${id}' visível com texto quebrado ("${(txt.match(BADTXT) || [''])[0]}")`, 'consertar o preenchimento do overlay']);
    if (el.tagName === 'CANVAS') {
      for (const d of frame) {
        if (d.kind !== 'text') continue;
        if (BADTXT.test(d.t)) probs.push(['CRIT', nome, `canvas de '${id}' desenhou texto quebrado: "${d.t.slice(0, 40)}"`, 'consertar o valor antes do fillText']);
        else if (d.x < -50 || d.x > W + 50 || d.y < -50 || d.y > H + 50) probs.push(['MED', nome, `canvas de '${id}' desenhou "${d.t.slice(0, 24)}" FORA da tela (${d.x | 0},${d.y | 0})`, 'reposicionar']);
      }
    }
  }
  for (const p of probs) add(p[0], p[1], p[2], p[3]);
  return { nome, state: game.state, vis: vis.slice(0, 10), probs: probs.length };
}
const roteiro = [];
const S1 = (nome, fn) => { try { fn(); roteiro.push(snapScreen(nome)); } catch (e) { add('CRIT', nome, `EXCEÇÃO ao abrir a tela: ${e.message}`, 'ver stack no console'); roteiro.push({ nome, state: game.state + ' (EXCEÇÃO)', vis: [], probs: 1 }); } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// título
S1('title', () => game.toTitle());
// carregar (do título)
S1('load-screen', () => game.titleAction('load'));
game.toTitle();
// seleção de campanha
S1('campaign-select', () => game.titleAction('play'));
// opções
S1('options', () => game.titleAction('options'));
// extras
S1('extras', () => game.titleAction('extras'));
// loja: sem pontos
S1('shop-vazio', () => ui.showShop(game.points, game.unlocks));
// loja: comprar TUDO (graceful sem pontos + compra com pontos)
try {
  game.points = 0;
  for (const it of SHOP_ITEMS) { try { game.buyShopItem(it); } catch (e) { add('CRIT', `loja:${it.id}`, `EXCEÇÃO comprando sem pontos: ${e.message}`, 'guardar pontos insuficientes'); } }
  game.points = 50000;
  for (const it of SHOP_ITEMS) {
    const antes = game.points;
    try { game.buyShopItem(it); } catch (e) { add('CRIT', `loja:${it.id}`, `EXCEÇÃO comprando: ${e.message}`, 'consertar buyShopItem'); continue; }
    if (game.points > antes && !game.unlocks[it.id]) add('MED', `loja:${it.id}`, 'comprou mas nem debitou pontos nem setou unlock', 'consertar efeito da compra');
  }
  if (game.points < 0) add('CRIT', 'loja', `pontos NEGATIVOS após compras (${game.points})`, 'validar saldo antes de debitar');
} catch (e) { add('CRIT', 'loja', `EXCEÇÃO geral na loja: ${e.message}`, 'rever'); }
S1('shop-pos-compra', () => ui.showShop(game.points, game.unlocks));
// galeria 3D
S1('galeria', () => ui.showGallery());
for (const m of GALLERY_MODELS || []) {
  try {
    ui.updateGalleryItem(m.id);
    const txt = String(ui.el.galleryName?.textContent || '') + String(ui.el.gallerySub?.textContent || '') + String(ui.el.galleryBio?.textContent || '');
    if (BADTXT.test(txt) || txt.trim().length < 4) add('MED', `galeria:${m.id}`, 'modelo sem nome/sub/bio preenchidos (texto vazio ou undefined)', 'completar cadastro do modelo');
  } catch (e) { add('CRIT', `galeria:${m.id}`, `EXCEÇÃO: ${e.message}`, 'consertar updateGalleryItem'); }
}
// campanha daniel: intro → play
try {
  game.startCampaign('daniel');
  let guard = 0;
  const avanca = () => { try { game.onKey('KeyE'); game.onKey('Enter'); } catch {} };
  while (game.state !== 'play' && guard++ < 60) { avanca(); await sleep(30); }
  if (game.state !== 'play') add('MED', 'intro', `não cheguei a 'play' apertando E/Enter (state=${game.state})`, 'ver fluxo intro→sponsor→play');
} catch (e) { add('CRIT', 'intro', `EXCEÇÃO na campanha: ${e.message}`, 'rever startCampaign'); }
// pausa
S1('pause', () => game.pauseGame());
try { game.pauseGame(); } catch (e) { add('MED', 'pause', `despausar falhou: ${e.message}`, 'toggle de pausa'); }
// inventário
S1('inventory', () => game.openInventory());
try {
  game.addItem('ribbon', 2); game.addItem('shotgun', 1); game.addItem('frag', 2);
  for (let i = 0; i < Math.min(game.inv.length, 8); i++) {
    ui.invSel = i;
    if (typeof ui.renderInv === 'function') ui.renderInv();
    else if (typeof ui.updateInv === 'function') ui.updateInv();
    const txt = String(ui.el.invName?.textContent || '') + String(ui.el.invDesc?.textContent || '');
    if (BADTXT.test(txt)) add('CRIT', `inventario-item${i}`, `detalhe do item mostra "${(txt.match(BADTXT) || [''])[0]}"`, 'consertar painel de detalhe');
  }
} catch (e) { add('MED', 'inventory', `varredura de itens falhou: ${e.message}`, 'rever'); }
game.closeInventory();
// savebox
S1('savebox', () => game.openSaveBox());
if (game.state === 'savebox') {
  const txt = String(ui.el.saveHeroName?.textContent || '') + String(ui.el.saveRoomName?.textContent || '');
  if (BADTXT.test(txt)) add('CRIT', 'savebox', `cabeçalho do save quebrado: "${txt.slice(0, 60)}"`, 'consertar showSaveBox');
  try { game.saveConfirm(true); } catch (e) { add('CRIT', 'savebox', `confirmar save lançou: ${e.message}`, 'rever saveConfirm'); }
  await sleep(900); // o jogo fecha a savebox num setTimeout de 650ms
  if (game.state !== 'play') add('MED', 'savebox', `após salvar, state=${game.state} (esperado 'play')`, 'savebox deve fechar sozinha');
}
// load durante o jogo
S1('load-in-game', () => ui.showSaveBox({ mode: 'load', from: 'game', saves: game.saves, time: '00:00', ribbons: 1 }));
game.ui.hideSaveBox(); if (game.state !== 'play') game.state = 'play';
// cofre
S1('safe', () => game.openSafe());
try { game.safeCancel(); } catch (e) { add('MED', 'safe', `cancelar cofre: ${e.message}`, ''); }
// ending
S1('ending-bom', () => ui.showEnding({ title: 'FINAL: ACEITAÇÃO', good: true, rank: 'S', time: '42:00', saves: 3, pages: 8, kills: 12, earnedPoints: 5000, msg: 'Teste de sanidade do final.' }));
S1('ending-ruim', () => ui.showEnding({ title: 'FINAL: MEIO CAMINHO', good: false, rank: 'C', time: '22:00', saves: 6, pages: 2, kills: 3, earnedPoints: 900, msg: 'Teste do final ruim.' }));
game.toTitle();
// título pós-tudo (consistência)
S1('title-final', () => game.toTitle());

// ================= RELATÓRIO =================
const rank = { CRIT: 0, ALTO: 1, MED: 2, BAIXO: 3 };
const cnt = {};
for (const f of F) cnt[f.sev] = (cnt[f.sev] || 0) + 1;
const buildV = (/currentBuild = '([^']+)'/.exec(srcHTML) || [])[1] || '?';
const nota = Math.max(0, Math.min(100, 100 - (cnt.CRIT || 0) * 12 - (cnt.ALTO || 0) * 8 - (cnt.MED || 0) * 4 - (cnt.BAIXO || 0) * 1));

let out = '';
out += '══════════════════════════════════════════════════════════════════\n';
out += '   REVIEW DE UI/MENUS — SANATÓRIO SANTA LÚCIA\n';
out += `   bot de UI v1 · build ${buildV}\n`;
out += '══════════════════════════════════════════════════════════════════\n';
out += `NOTA DE UI: ${nota}/100 · 🔴 ${cnt.CRIT || 0} · 🟠 ${cnt.ALTO || 0} · 🟡 ${cnt.MED || 0} · 🔵 ${cnt.BAIXO || 0}\n\n`;
out += 'NAVEGAÇÃO (tela a tela):\n';
for (const r of roteiro) out += `  ${r.nome.padEnd(16)} state=${String(r.state).padEnd(12)} overlays=[${r.vis.join(',')}]${r.probs ? `  ⚠ ${r.probs} problema(s)` : '  ✓'}\n`;
out += '\nDADOS DA LOJA: itens ' + SHOP_ITEMS.length + ' · GALERIA: modelos ' + (GALLERY_MODELS || []).length + ' · ESTADOS do jogo: ' + setStates.length + '\n\n';
out += '──────────────────────────────────────────────────────────────────\nACHADOS\n──────────────────────────────────────────────────────────────────\n';
F.sort((a, b) => rank[a.sev] - rank[b.sev] || a.local.localeCompare(b.local));
for (const f of F) {
  const icon = { CRIT: '🔴', ALTO: '🟠', MED: '🟡', BAIXO: '🔵' }[f.sev];
  out += `  ${icon} [${f.sev}] ${f.local}: ${f.msg}\n${f.fix ? `        ↳ ${f.fix}\n` : ''}`;
}
out += '\n══════════════════════════════════════════════════════════════════\n';
fs.writeFileSync('UI_REVIEW.txt', out);
console.log(out.split('\n').slice(4, 5).join('\n'));
const crits = F.filter((f) => f.sev === 'CRIT');
console.log(`\n🔴 CRÍTICOS: ${crits.length}`);
for (const f of crits.slice(0, 12)) console.log(`   ${f.local}: ${f.msg}`);
console.log(`\n📄 relatório: UI_REVIEW.txt`);
process.exit(0);
