// Teste headless: importa o THREE real + módulos do jogo com stubs de DOM.
// Uso: node test/headless.mjs
import * as THREE from '../vendor/three.module.min.js';

// ---------- stubs ----------
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
    querySelectorAll: () => [],
    addEventListener() {},
    getContext: () => make2d(),
    onclick: null, oninput: null, onchange: null, onmouseenter: null, ondblclick: null,
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

let fails = 0;
const ok = (cond, msg) => {
  if (!cond) { fails++; console.log('  ✗ FAIL:', msg); }
};

// ---------- 1. texturas ----------
console.log('[1] texturas...');
const { buildTextures, drawPortrait } = await import('../js/textures.js');
const TEX = buildTextures(THREE);
const texKeys = Object.keys(TEX);
console.log('   texturas geradas:', texKeys.length);
ok(texKeys.length > 30, 'poucas texturas');
for (const k of ['floorWood', 'wallpaper', 'doorWood', 'sky', 'faceDaniel', 'eye', 'fence', 'blood', 'water', 'altar']) {
  ok(TEX[k] && TEX[k].isTexture, 'textura ausente: ' + k);
}
// retratos
for (const who of ['daniel', 'lucia', 'medico', 'vulto', 'q', 'n']) {
  drawPortrait(makeCanvas(96, 96), who);
}
console.log('   retratos OK');

// ---------- 2. salas ----------
console.log('[2] salas...');
const { buildRoom, ROOM_IDS } = await import('../js/world.js');
const { pointInSolids } = await import('../js/entities.js');
console.log('   salas:', ROOM_IDS.join(', '));
const rooms = {};
for (const id of ROOM_IDS) {
  const R = buildRoom(THREE, TEX, id);
  rooms[id] = R;
  ok(R.cams.length >= 1, `${id}: sem câmeras`);
  ok(R.solids.length > 3, `${id}: sem sólidos`);
  ok(R.group.children.length > 10, `${id}: pouco conteúdo`);
  // portas: alvo válido, trigger dentro dos limites
  for (const d of R.doors) {
    ok(rooms[d.target] !== undefined || ROOM_IDS.includes(d.target), `${id}: porta p/ alvo inválido ${d.target}`);
    ok(Math.abs(d.x) <= R.w / 2 + 1 && Math.abs(d.z) <= R.d / 2 + 1, `${id}: porta fora dos limites (${d.x},${d.z})`);
  }
  // sólidos "finais" (no porão a água drena: ignora tag 'water')
  const solidsFinal = R.solids.filter((s) => s.tag !== 'water');
  const free = (x, z) => !pointInSolids(x, z, solidsFinal);
  // spawns não podem estar dentro de sólidos finais
  for (const s of R.spawns) {
    ok(free(s.x, s.z), `${id}: spawn dentro de sólido (${s.x},${s.z})`);
  }
  // pickups: basta um ponto alcançável num raio de 1.3
  for (const p of R.pickups) {
    let reach = free(p.x, p.z);
    for (let a = 0; a < 8 && !reach; a++) {
      const t = (a / 8) * Math.PI * 2;
      if (free(p.x + Math.cos(t) * 1.3, p.z + Math.sin(t) * 1.3)) reach = true;
    }
    ok(reach, `${id}: pickup ${p.item} inalcançável (${p.x},${p.z})`);
  }
  // interacts: algum ponto dentro do raio precisa ser pisável
  for (const it of R.interacts) {
    let reach = free(it.x, it.z);
    for (let a = 0; a < 12 && !reach; a++) {
      const t = (a / 12) * Math.PI * 2;
      const rr = it.r * 0.85;
      if (free(it.x + Math.cos(t) * rr, it.z + Math.sin(t) * rr)) reach = true;
    }
    ok(reach, `${id}: interact '${it.act}' inalcançável (${it.x},${it.z}) r=${it.r}`);
  }
  // portas: trigger alcançável
  for (const d of R.doors) {
    let reach = free(d.x, d.z);
    for (let a = 0; a < 8 && !reach; a++) {
      const t = (a / 8) * Math.PI * 2;
      if (free(d.x + Math.cos(t) * d.r * 0.8, d.z + Math.sin(t) * d.r * 0.8)) reach = true;
    }
    ok(reach, `${id}: porta '${d.label}' inalcançável (${d.x},${d.z})`);
  }
  console.log(`   ${id}: cams=${R.cams.length} portas=${R.doors.length} itens=${R.pickups.length} inter=${R.interacts.length} inimigos=${R.spawns.length} sólidos=${R.solids.length}`);
}
// destinos das portas: spawn fora de sólido na sala alvo
for (const id of ROOM_IDS) {
  for (const d of rooms[id].doors) {
    const T = rooms[d.target];
    const solidsFinal = T.solids.filter((s) => s.tag !== 'water');
    ok(!pointInSolids(d.sx, d.sz, solidsFinal), `${id} -> ${d.target}: spawn (${d.sx},${d.sz}) dentro de sólido!`);
  }
}
// cobertura das câmeras: cantos da sala cobertos por alguma câmera
for (const id of ROOM_IDS) {
  const R = rooms[id];
  const corners = [
    [-R.w / 2 + 0.6, -R.d / 2 + 0.6], [R.w / 2 - 0.6, -R.d / 2 + 0.6],
    [-R.w / 2 + 0.6, R.d / 2 - 0.6], [R.w / 2 - 0.6, R.d / 2 - 0.6],
  ];
  for (const [cx, cz] of corners) {
    const covered = R.cams.some((c) => cx >= c.rect[0] && cx <= c.rect[2] && cz >= c.rect[1] && cz <= c.rect[3]);
    ok(covered, `${id}: canto (${cx},${cz}) sem câmera`);
  }
}
// itens críticos existem?
const allPickups = ROOM_IDS.flatMap((id) => rooms[id].pickups.map((p) => p.item + (p.page !== null && p.page !== undefined ? p.page : '')));
for (const need of ['shotgun', 'fuse', 'ammo9', 'shell', 'pills', 'lightflask', 'ribbon']) {
  ok(allPickups.includes(need), 'item crítico ausente nos mapas: ' + need);
}
const pages = ROOM_IDS.flatMap((id) => rooms[id].pickups.filter((p) => p.item === 'page').map((p) => p.page)).sort();
ok(JSON.stringify(pages) === JSON.stringify([0, 1, 2, 3, 4, 5, 6, 7]), 'páginas do diário incompletas: ' + JSON.stringify(pages));
console.log('   páginas:', JSON.stringify(pages));

// ---------- 3. entidades ----------
console.log('[3] entidades...');
const { Player, Enemy, Particles, collideCircle } = await import('../js/entities.js');
{
  const scene = new THREE.Scene();
  const pl = new Player(THREE, TEX);
  pl.addTo(scene);
  pl.place(0, 0, 0);
  ok(pl.x === 0 && pl.z === 0, 'player place');
  const room = { solids: [{ x0: 5, z0: -5, x1: 6, z1: 5 }] };
  const ev = pl.update(0.016, { f: true, b: false, l: false, r: false, run: false }, room);
  ok(typeof ev.step === 'boolean', 'player update retorno');
  ok(pl.z > 0, 'player andou');
  pl.setWeapon('pistol');
  ok(pl.pistolM.visible && !pl.knifeM.visible, 'troca de arma');
  pl.setWeapon('shotgun');
  ok(pl.shotgunM.visible, 'shotgun visível');
  pl.setAim(true);
  ok(pl.gunPivot.visible, 'mira mostra arma');
  const died = pl.damage(30);
  ok(died && pl.hp === 70, 'dano no jogador');
  pl.iframes = 0;
  pl.damage(999);
  ok(pl.dead && pl.hp === 0, 'morte do jogador');
  pl.dieAnim(0.5);

  const e = new Enemy(THREE, TEX, 'sombra', 3, 3, false);
  e.addTo(scene);
  ok(e.alive && e.hp === 55, 'sombra hp');
  const fakePlayer = { x: 0, z: 0, dead: false };
  let evs = new Set();
  for (let i = 0; i < 120; i++) {
    const r = e.update(0.016, fakePlayer, { solids: [], los: () => true });
    if (r) evs.add(r);
  }
  ok(e.state !== 'dormant', 'inimigo percebeu o jogador');
  const died2 = e.damage(100, 0, 0);
  ok(died2 && e.dead, 'inimigo morreu');

  const boss = new Enemy(THREE, TEX, 'vulto', 0, -1, false);
  boss.addTo(scene);
  for (let i = 0; i < 60; i++) boss.update(0.016, { x: 0, z: 8, dead: false }, { solids: [], los: () => true });
  ok(boss.alive, 'chefe vivo após updates');

  const corpse = new Enemy(THREE, TEX, 'lamento', 1, 1, true);
  ok(corpse.dead && corpse.state === 'dead', 'corpse inicial');

  const parts = new Particles(THREE, scene, TEX);
  parts.burst(0, 1, 0, { color: 0xff0000, n: 20 });
  parts.update(0.016);
  parts.clear();

  // colisão
  const p = { x: 5.5, z: 0 };
  collideCircle(p, 0.35, room.solids);
  ok(p.x < 5 || p.x > 6, 'collideCircle empurra para fora');
  console.log('   player/inimigos/partículas/colisão OK, evs:', [...evs].join(','));
}

// ---------- 4. áudio (sem contexto = no-op seguro) ----------
console.log('[4] áudio...');
{
  const { AudioSys } = await import('../js/audio.js');
  const a = new AudioSys();
  a.sfx('pistol'); a.sfx('bossRoar'); a.sfx('thunder', { delay: 1 });
  a.ambient('porao'); a.music('boss'); a.stopMusic(); a.heartbeat(true); a.heartbeat(false);
  a.setMaster(0.5); a.setMusic(0.5); a.setSfx(0.5);
  console.log('   AudioSys no-op OK');
}

// ---------- 5. psx snap ----------
console.log('[5] psx snapScene...');
{
  const { createPSX } = await import('../js/psx.js');
  const fakeRenderer = {};
  const psx = createPSX(THREE, fakeRenderer);
  psx.snapScene(rooms.quarto.group);
  let snapped = 0;
  rooms.quarto.group.traverse((o) => {
    if (o.isMesh && o.material && o.material.userData && o.material.userData.psxSnapped) snapped++;
  });
  ok(snapped > 5, 'materiais com snap: ' + snapped);
  psx.setDamage(0.5); psx.setFade(0); psx.setWhite(0); psx.setFlash(0); psx.setCrt(true);
  psx.setQuality(true); psx.setQuality(false); psx.shake(0.01);
  console.log('   snap OK em', snapped, 'materiais');
}

// ---------- 6. UI (stubs de DOM) ----------
console.log('[6] UI...');
{
  const { UI } = await import('../js/ui.js');
  const { ITEMS } = await import('../js/config.js');
  void ITEMS;
  const fakeAudio = { sfx() {}, unlock() {} };
  const fakeGame = {
    audio: fakeAudio,
    opts: { master: 0.9, music: 0.8, sfx: 0.9, crt: true, high: false },
    flags: { frags: [true, false, false, false], pages: [true, false, false, false, false, false, false, false] },
    inv: [{ item: 'knife', qty: 1 }, { item: 'pistol', qty: 1 }, { item: 'ammo9', qty: 24 }],
    equipped: 'pistol',
    player: { hp: 100, maxhp: 100, weapon: 'pistol' },
    points: 1000,
    unlocks: {},
    currentCampaign: 'daniel',
    hasSave() { return true; },
    formattedTime() { return '00:01:00'; },
    currentObjective() { return 'Explore a enfermaria.'; },
    getInvData() {
      return { items: this.inv, equipped: this.equipped, objective: 'Teste', pages: 1, time: '00:01:00' };
    },
    countItem(id) { const s = this.inv.find((i) => i.item === id); return s ? s.qty : 0; },
    titleAction() {}, helpBack() {}, optionsBack() {}, applyOpts() {},
    pauseAction() {}, gameoverAction() {}, endingDone() {}, closeInventory() {},
    invCommand() {}, invDefaultAction() {}, safeConfirm() {}, safeCancel() {},
    saveConfirm() {}, touchFire() {}, touchAct() {}, touchInv() {}, touch: {},
    toggleCamMode() {}, setBrightness() {}, setCamMode() {}, setFilter() {}, setInfiniteAmmo() {},
  };
  const ui = new UI(fakeGame);
  ui.showTitle(true); ui.titleNav(1); ui.renderTitleMenu(true); ui.hideTitle();
  ui.showHelp(); ui.hideHelp();
  ui.showOptions(); ui.hideOptions();
  ui.showHud(true); ui.room('TESTE'); ui.hp(25); ui.ammo('M9 • 10', true);
  ui.prompt('E — teste'); ui.prompt(null);
  ui.crosshair(true); ui.target(10, 10, true); ui.target(0, 0, false);
  ui.boss('VULTO', 0.5); ui.boss(null);
  ui.toast('teste', 1);
  ui.showBanner('pistol', 1); ui.hideBanner();
  // diálogo completo
  let done = false;
  ui.dialog([{ who: 'daniel', text: 'Olá, teste de diálogo.' }, { who: 'n', text: 'Narrador aqui.' }], () => { done = true; });
  for (let i = 0; i < 200 && !done; i++) { ui.update(0.05); ui.advanceDialog(); }
  ok(done, 'fluxo de diálogo');
  // inventário
  ui.showInventory();
  ui.invNav(1, 0); ui.invConfirm(); ui.invBack(); ui.hideInventory();
  // cofre
  ui.showSafe(); ui.safeNav(1, 0); ui.safeNav(0, 1);
  const safeStr = ui.safeDigits.join('');
  ok(/^\d{4}$/.test(safeStr), 'código do cofre: ' + safeStr);
  ui.hideSafe();
  // save/pause/gameover/ending
  ui.showSaveBox(); ui.hideSaveBox();
  ui.showPause(); ui.pauseNav(1); ui.hidePause();
  ui.showGameOver(); ui.hideGameOver();
  ui.showCampaignSelect(); ui.hideCampaignSelect();
  ui.showExtraModes(1000, 5); ui.hideExtraModes();
  ui.showShop(1000, {}); ui.hideShop();
  ui.showEnding({ title: 'FIM', good: true, rank: 'S', time: '00:10:00', saves: 1, pages: 8, msg: 'x' });
  ui.hideEnding();
  // animação de porta (acelera o relógio)
  await new Promise((resolve) => {
    const t0 = Date.now();
    global.requestAnimationFrame = (fn) => {
      if (Date.now() - t0 > 3000) { resolve(); return; }
      setTimeout(fn, 0);
    };
    ui.doorAnim(false, resolve);
    setTimeout(resolve, 3500);
  });
  console.log('   UI OK');
}

console.log(fails === 0 ? '\n✓ TODOS OS TESTES PASSARAM' : `\n✗ ${fails} FALHA(S)`);
process.exit(fails === 0 ? 0 : 1);
