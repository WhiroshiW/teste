// ============================================================
// QA DE UX DO INVENTÁRIO + MAPA (harness jsdom — Equipe Nakamura)
// Dirige a UI real (js/ui.js) como um player: abre abas, navega
// por teclado, descarta itens, troca andares. RODAR DENTRO DO
// PROJETO (cwd /home/user/teste): node tools/_test_ux.mjs
// ============================================================
import { JSDOM } from 'jsdom';
import fs from 'fs';

const html = fs.readFileSync('index.html', 'utf-8');
const dom = new JSDOM(html, { pretendToBeVisual: true, url: 'http://localhost/' });
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.requestAnimationFrame = () => 0; // sem loop infinito no teste
globalThis.cancelAnimationFrame = () => {};

// stub de contexto 2D (jsdom não tem canvas nativo)
let drawCalls = 0;
const ctxProxy = new Proxy({}, {
  get: (t, p) => {
    if (p === 'measureText') return () => ({ width: 24 });
    return () => { drawCalls++; };
  },
  set: () => true,
});
dom.window.HTMLCanvasElement.prototype.getContext = () => ctxProxy;

const { UI } = await import('../js/ui.js?v=qa');

// ---------- stub do game (só o que a UI toca) ----------
const sfxLog = [];
let closeCount = 0;
function mkItem(item, extra = {}) { return { item, qty: 1, equipped: false, ...extra }; }
const game = {
  state: 'inventory',
  inv: [mkItem('pills', { qty: 3 }), mkItem('pistol', { equipped: true }), mkItem('fuse')],
  player: { hp: 90, x: 0, z: 0 },
  room: { id: 'saguao' },
  visitedRooms: new Set(['saguao', 'corredor']),
  currentCampaign: 'daniel',
  opts: {}, unlocks: {}, points: 0, highScores: [], hasSave: false, camMode: '',
  saveOpts: {}, countItem: () => 0, flags: { pages: new Array(8).fill(false) },
  formattedTime: () => '00:00:00', currentObjective: () => 'FUJA DO SANATÓRIO',
  audio: { sfx: (n) => sfxLog.push(n) },
  closeInventory: () => { closeCount++; },
  examineItem: () => {}, equipWeapon: () => {}, useItem: () => {},
  readPage: () => {}, combineItems: () => {},
};
const ui = new UI(game);
const vis = (id) => !document.getElementById(id).classList.contains('hidden');
let pass = 0, fail = 0;
function T(nome, cond) {
  if (cond) { pass++; console.log(`  ✅ ${nome}`); }
  else { fail++; console.log(`  ❌ ${nome}`); }
}

// ============ T1: abrir MAPA direto (tecla M) ============
ui.showInventory('mapa');
T('M abre aba MAPA (painel mapa visível)', vis('invPaneMapa'));
T('M esconde painel de itens', !vis('invPaneItens'));
T('aba MAPA marcada como sel', document.getElementById('invTabMapa').classList.contains('sel'));
T('renderMap desenhou no canvas', drawCalls > 20);
T('auto-selecionou andar da sala atual (L1)', ui.mapFloor === 'L1');

// ============ T2/T3: teclado inerte no mapa ============
const sel0 = ui.invSel;
ui.invNav(1, 0); ui.invNav(0, 1);
T('setas/WASD não navegam a grade invisível', ui.invSel === sel0);
ui.invConfirm();
T('Enter/Space não confirma item no mapa', ui.invMode === 'grid' && ui.invCmds.length === 0);

// ============ T4: voltar no mapa fecha o inventário ============
ui.invBack();
T('back no MAPA fecha o inventário', closeCount === 1);

// ============ T5: TAB abre na maleta por padrão ============
ui.showInventory();
T('abrir sem arg vai pra MALETA', vis('invPaneItens') && !vis('invPaneMapa'));

// ============ T6: navegação na grade ============
ui.invSel = 0; ui.invNav(1, 0);
T('→ move seleção pra 2º slot', ui.invSel === 1);
ui.invNav(0, 1);
T('↓ cai na linha de baixo (slot 5)', ui.invSel === 5);

// ============ T7: abrir comandos do item ============
ui.invSel = 0; ui.invConfirm();
T('Enter abre menu de comandos', ui.invMode === 'cmds');
T('pills oferece USAR e DESCARTAR', ui.invCmds.includes('USAR') && ui.invCmds.includes('DESCARTAR'));
T('pills NÃO oferece EQUIPAR', !ui.invCmds.includes('EQUIPAR'));

// ============ T8: DESCARTAR funciona (bug antigo: ReferenceError) ============
const antes = game.inv.length;
ui.invCmd = ui.invCmds.indexOf('DESCARTAR');
ui.invConfirm();
T('DESCARTAR remove o item sem exceção', game.inv.length === antes - 1);
T('depois de descartar volta pra grade', ui.invMode === 'grid');

// ============ T9: item de história não tem DESCARTAR ============
const idxFuse = game.inv.findIndex((x) => x.item === 'fuse');
ui.invSel = idxFuse; ui.invConfirm();
T('Fusível (key item) NÃO oferece DESCARTAR', !ui.invCmds.includes('DESCARTAR'));
ui.invBack(); // volta pra grade

// ============ T10: última arma não pode ser descartada ============
game.inv = [mkItem('knife')]; // só a faca equipada... e se dessequipar?
game.inv[0].equipped = false;
ui.invSel = 0; ui.invConfirm();
T('última arma NÃO oferece DESCARTAR (anti-softlock)', !ui.invCmds.includes('DESCARTAR'));
ui.invBack();

// ============ T11: trocar de aba cancela COMBINAR ============
game.inv = [mkItem('pills', { qty: 2 }), mkItem('antidote')];
ui.invSel = 0; ui.invConfirm();
ui.invCmd = ui.invCmds.indexOf('COMBINAR'); ui.invConfirm();
T('COMBINAR ativa modo de combinação', ui.combineSource === 0);
T('aviso de combinação visível', vis('invCombineNotice'));
ui.invSwitchTab('mapa');
T('trocar pra MAPA cancela combinação', ui.combineSource === null && !vis('invCombineNotice'));

// ============ T12: reabrir itens e seleção de andar ============
ui.invSwitchTab('itens');
T('voltar pra MALETA re-renderiza grade', vis('invPaneItens') && document.getElementById('invGrid').children.length === 12);
ui.mapFloor = 'L1';
ui.invSwitchTab('mapa');
const btnL2 = document.querySelector('.mapFloor[data-floor="L2"]');
btnL2.click();
T('botão L2 seleciona andar 2', ui.mapFloor === 'L2' && btnL2.classList.contains('sel'));

// ============ T13: retrato por campanha ============
ui.invSwitchTab('itens');
ui.renderInventory();
T('Daniel usa portrait_daniel.png', document.getElementById('invPortrait').src.includes('portrait_daniel.png'));
game.currentCampaign = 'bento';
ui.renderInventory();
T('Bento cai no fallback (sem PNG)', vis('invPortraitFallback') && !vis('invPortrait'));
game.currentCampaign = 'daniel';

// ============ T14: ESTADO reflete o HP ============
for (const [hp, est] of [[90, 'FINE'], [50, 'CAUTION'], [10, 'DANGER']]) {
  game.player.hp = hp; ui.renderInventory();
  const txt = document.getElementById('invEstadoTxt').textContent;
  T(`hp ${hp} → ESTADO ${est}`, txt === est);
}

// ============ T15: ESC hierárquico (cmds → grade → fecha) ============
ui.invSel = 0; ui.invConfirm();           // abre cmds
ui.invBack();
T('back no submenu volta pra grade', ui.invMode === 'grid');
ui.invBack();
T('back na grade fecha o inventário', closeCount === 2);

// ============ resumo ============
ui.cancelMapAnim();
console.log(`\n══════ UX: ${pass} ✅ · ${fail} ❌ ══════`);
process.exit(fail ? 1 : 0);
