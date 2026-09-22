// ============================================================
// ECOS DO VAZIO - Game: laço principal, estados, combate,
// puzzles, câmeras fixas, portas, save/load.
// ============================================================
import { ITEMS, WEAPONS, SAVE_KEY, rankFor, fmtTime } from './config.js';
import { INTRO, D, DIARY, TIPS, objectiveFor, END_GOOD, END_NORMAL } from './story.js';
import { buildTextures } from './textures.js';
import { AudioSys } from './audio.js';
import { createPSX } from './psx.js';
import { collideCircle, pointInSolids, Particles, Player, Enemy } from './entities.js';
import { buildRoom } from './world.js';
import { UI } from './ui.js';

export class Game {
  constructor(THREE, container) {
    this.THREE = THREE;
    this.container = container;
    this.renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(1);
    this.renderer.setSize(container.clientWidth, container.clientHeight, false);
    this.renderer.domElement.id = 'gl';
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000000);
    this.camera = new THREE.PerspectiveCamera(60, 16 / 9, 0.1, 120);
    this.ambLight = new THREE.AmbientLight(0xffffff, 0.2);
    this.scene.add(this.ambLight);
    this.lantern = new THREE.PointLight(0xffd9a0, 5, 10, 2);
    this.scene.add(this.lantern);

    this.TEX = buildTextures(THREE);
    this.psx = createPSX(THREE, this.renderer);
    this.audio = new AudioSys();
    this.particles = new Particles(THREE, this.scene, this.TEX);
    this.player = new Player(THREE, this.TEX);
    this.player.addTo(this.scene);
    this.psx.snapScene(this.player.group);
    this.ui = new UI(this);

    // opções
    this.opts = { master: 0.9, music: 0.8, sfx: 0.9, crt: true, high: false };
    try {
      const o = JSON.parse(localStorage.getItem('ecoVazioOpts') || '{}');
      Object.assign(this.opts, o);
    } catch (e) { /* noop */ }
    this.applyOpts();

    // estado
    this.state = 'title';
    this.helpFrom = 'title';
    this.optionsFrom = 'title';
    this.room = null;
    this.enemies = [];
    this.boss = null;
    this.resetRun();

    // entrada
    this.keys = new Set();
    this.touch = { f: false, b: false, l: false, r: false, run: false, aim: false };
    this.firePressed = false;
    this.wireInput();

    // efeitos
    this.fadeVal = 1; this.fadeTarget = 0;
    this.whiteVal = 0; this.whiteTarget = 0;
    this.dmgVal = 0;
    this.flashVal = 0;
    this.flashBoost = 0;
    this.lightningT = 5;
    this.deathT = 0;
    this.bannerT = 0;
    this.bannerItem = null;
    this.endingPhase = 0;
    this.camShake = 0;
    this.titleAngle = 0;

    window.addEventListener('resize', () => this.resize());
    this.resize();

    // cenário de fundo do título
    this.loadRoom('terraco', 0, 3, Math.PI, { backdrop: true });
    this.player.group.visible = false;
    this.audio.music(null);
    this.ui.showTitle(this.hasSave());
    this.ui.showHud(false);
    this.fadeTarget = 0;

    this.clock = new THREE.Clock();
    this.renderer.setAnimationLoop(() => this.frame());
  }

  resetRun() {
    this.flags = {
      frags: [false, false, false, false],
      pages: [false, false, false, false, false, false, false, false],
    };
    this.inv = [{ id: 'knife', qty: 1 }];
    this.equipped = 'knife';
    this.rooms = {};
    this.timePlayed = 0;
    this.saves = 0;
    this.lastObjective = '';
    this.player.hp = 100;
    this.player.dead = false;
    this.player.group.rotation.x = 0;
    this.player.group.position.y = 0;
    this.player.setWeapon('knife');
  }

  applyOpts() {
    this.audio.setMaster(this.opts.master);
    this.audio.setMusic(this.opts.music);
    this.audio.setSfx(this.opts.sfx);
    this.psx.setCrt(this.opts.crt);
    this.psx.setQuality(this.opts.high);
    try { localStorage.setItem('ecoVazioOpts', JSON.stringify(this.opts)); } catch (e) { /* noop */ }
  }

  resize() {
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    this.renderer.setSize(w, h, false);
    // render target acompanha a proporção da tela (sem distorcer)
    this.camera.aspect = this.psx.fitAspect(w / h);
    this.camera.updateProjectionMatrix();
  }

  // ==================== ENTRADA ====================
  wireInput() {
    window.addEventListener('keydown', (e) => {
      if (['Space', 'Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
      this.audio.unlock();
      if (e.repeat) return;
      this.keys.add(e.code);
      this.onKey(e.code);
    });
    window.addEventListener('keyup', (e) => { this.keys.delete(e.code); });
    this.renderer.domElement.addEventListener('mousedown', () => {
      this.audio.unlock();
      this.onCanvasClick();
    });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.state === 'play') this.pauseGame();
    });
  }

  moveInput() {
    const k = this.keys, t = this.touch;
    return {
      f: k.has('KeyW') || k.has('ArrowUp') || t.f,
      b: k.has('KeyS') || k.has('ArrowDown') || t.b,
      l: k.has('KeyA') || k.has('ArrowLeft') || t.l,
      r: k.has('KeyD') || k.has('ArrowRight') || t.r,
      run: k.has('ShiftLeft') || k.has('ShiftRight') || t.run,
    };
  }
  aimHeld() { return this.keys.has('Space') || this.touch.aim; }

  onKey(code) {
    const st = this.state;
    // atirar
    if ((code === 'KeyJ' || code === 'KeyX' || code === 'KeyF')) {
      if (st === 'play') this.firePressed = true;
      return;
    }
    // menus com setas/WASD
    const up = code === 'ArrowUp' || code === 'KeyW';
    const down = code === 'ArrowDown' || code === 'KeyS';
    const left = code === 'ArrowLeft' || code === 'KeyA';
    const right = code === 'ArrowRight' || code === 'KeyD';
    if (st === 'title') {
      if (up) this.ui.titleNav(-1);
      else if (down) this.ui.titleNav(1);
      else if (code === 'Enter' || code === 'Space' || code === 'KeyE') this.ui.titleConfirm();
      return;
    }
    if (st === 'help') {
      if (code === 'Escape' || code === 'Enter' || code === 'KeyE' || code === 'Space') { this.audio.sfx('uiBack'); this.helpBack(); }
      return;
    }
    if (st === 'options') {
      if (up) this.ui.optionsNav(-1);
      else if (down) this.ui.optionsNav(1);
      else if (left) this.ui.optionsAdjust(-1);
      else if (right) this.ui.optionsAdjust(1);
      else if (code === 'Enter' || code === 'KeyE' || code === 'Space') this.ui.optionsConfirm();
      else if (code === 'Escape') { this.audio.sfx('uiBack'); this.optionsBack(); }
      return;
    }
    if (st === 'pause') {
      if (up) this.ui.pauseNav(-1);
      else if (down) this.ui.pauseNav(1);
      else if (code === 'Enter' || code === 'KeyE' || code === 'Space') this.ui.pauseConfirm();
      else if (code === 'Escape' || code === 'KeyP') this.pauseAction('resume');
      return;
    }
    if (st === 'inventory') {
      if (up) this.ui.invNav(0, -1);
      else if (down) this.ui.invNav(0, 1);
      else if (left) this.ui.invNav(-1, 0);
      else if (right) this.ui.invNav(1, 0);
      else if (code === 'Enter' || code === 'KeyE' || code === 'Space') this.ui.invConfirm();
      else if (code === 'KeyQ') this.invExamineSel();
      else if (code === 'Escape' || code === 'KeyP' || code === 'Tab' || code === 'KeyI') this.ui.invBack();
      return;
    }
    if (st === 'safe') {
      if (up) this.ui.safeNav(0, 1);
      else if (down) this.ui.safeNav(0, -1);
      else if (left) this.ui.safeNav(-1, 0);
      else if (right) this.ui.safeNav(1, 0);
      else if (code === 'Enter' || code === 'KeyE') this.safeConfirm();
      else if (code === 'Escape') this.safeCancel();
      return;
    }
    if (st === 'savebox') {
      if (left) this.ui.saveNav(-1);
      else if (right) this.ui.saveNav(1);
      else if (code === 'Enter' || code === 'KeyE' || code === 'Space') this.saveConfirm(this.ui.saveSel === 0);
      else if (code === 'Escape') this.saveConfirm(false);
      return;
    }
    if (st === 'dialog' || st === 'intro') {
      if (code === 'Enter' || code === 'KeyE' || code === 'Space') this.ui.advanceDialog();
      return;
    }
    if (st === 'banner') {
      if (code === 'Enter' || code === 'KeyE' || code === 'Space') this.closeBanner();
      return;
    }
    if (st === 'gameover' || st === 'endingPanel') return; // só botões
    if (st === 'ending') {
      if (code === 'Enter' || code === 'KeyE' || code === 'Space') this.ui.advanceDialog();
      return;
    }
    if (st === 'play') {
      if (code === 'KeyE') this.doPromptAction();
      else if (code === 'Enter' && this.player.aiming) this.firePressed = true;
      else if (code === 'Tab' || code === 'KeyI') { this.audio.sfx('uiSelect'); this.openInventory(); }
      else if (code === 'Escape' || code === 'KeyP') this.pauseGame();
    }
  }

  onCanvasClick() {
    const st = this.state;
    if (st === 'dialog' || st === 'intro' || st === 'ending') this.ui.advanceDialog();
    else if (st === 'banner') this.closeBanner();
    else if (st === 'play') this.firePressed = true;
  }

  touchFire() {
    const st = this.state;
    if (st === 'dialog' || st === 'intro' || st === 'ending') this.ui.advanceDialog();
    else if (st === 'banner') this.closeBanner();
    else if (st === 'play') {
      if (this.player.aiming) this.firePressed = true;
      else this.ui.toast('Segure MIRAR e depois ATIRAR.', 2);
    }
  }
  touchAct() {
    this.audio.unlock();
    const st = this.state;
    if (st === 'play') this.doPromptAction();
    else if (st === 'dialog' || st === 'intro' || st === 'ending') this.ui.advanceDialog();
    else if (st === 'banner') this.closeBanner();
    else if (st === 'inventory') this.ui.invConfirm();
    else if (st === 'safe') this.safeConfirm();
  }
  touchInv() {
    if (this.state === 'play') { this.audio.sfx('uiSelect'); this.openInventory(); }
    else if (this.state === 'inventory') this.closeInventory();
  }

  // ==================== TELAS ====================
  titleAction(act) {
    this.audio.unlock();
    if (act === 'new') {
      this.ui.hideTitle();
      this.newGame();
    } else if (act === 'continue') {
      if (!this.hasSave()) { this.audio.sfx('uiBack'); return; }
      this.ui.hideTitle();
      this.continueGame();
    } else if (act === 'help') {
      this.helpFrom = 'title'; this.state = 'help';
      this.ui.hideTitle(); this.ui.showHelp();
    } else if (act === 'options') {
      this.optionsFrom = 'title'; this.state = 'options';
      this.ui.hideTitle(); this.ui.showOptions();
    }
  }
  helpBack() {
    this.ui.hideHelp();
    if (this.helpFrom === 'pause') { this.state = 'pause'; this.ui.showPause(); }
    else { this.state = 'title'; this.ui.showTitle(this.hasSave()); }
  }
  optionsBack() {
    this.ui.hideOptions();
    if (this.optionsFrom === 'pause') { this.state = 'pause'; this.ui.showPause(); }
    else { this.state = 'title'; this.ui.showTitle(this.hasSave()); }
  }
  pauseGame() {
    if (this.state !== 'play') return;
    this.state = 'pause';
    this.player.setAim(false);
    this.ui.crosshair(false);
    this.ui.target(0, 0, false);
    this.audio.sfx('uiBack');
    this.ui.showPause();
  }
  pauseAction(act) {
    if (act === 'resume') {
      this.ui.hidePause(); this.state = 'play';
    } else if (act === 'help') {
      this.helpFrom = 'pause'; this.state = 'help';
      this.ui.hidePause(); this.ui.showHelp();
    } else if (act === 'options') {
      this.optionsFrom = 'pause'; this.state = 'options';
      this.ui.hidePause(); this.ui.showOptions();
    } else if (act === 'title') {
      this.ui.hidePause();
      this.toTitle();
    }
  }
  gameoverAction(act) {
    this.audio.sfx('uiSelect');
    this.ui.hideGameOver();
    if (act === 'retry' && this.hasSave()) this.continueGame();
    else this.toTitle();
  }
  endingDone() {
    this.audio.sfx('uiSelect');
    this.ui.hideEnding();
    this.toTitle();
  }
  toTitle() {
    this.state = 'title';
    this.audio.stopMusic();
    this.audio.heartbeat(false);
    this.ui.showHud(false);
    this.ui.boss(null);
    this.ui.hideBanner();
    this.whiteTarget = 0; this.whiteVal = 0;
    this.dmgVal = 0;
    this.player.group.visible = false;
    this.loadRoom('terraco', 0, 3, Math.PI, { backdrop: true });
    this.fadeTarget = 0;
    this.ui.showTitle(this.hasSave());
  }

  // ==================== NOVO JOGO / CONTINUE ====================
  newGame() {
    this.resetRun();
    this.player.group.visible = true;
    this.player.group.rotation.x = 0;
    this.whiteVal = 0; this.whiteTarget = 0;
    this.dmgVal = 0; this.deathT = 0;
    this.loadRoom('quarto', 0.5, 1.8, Math.PI, {});
    this.ui.showHud(true);
    this.ui.hp(this.player.hp);
    this.ui.ammo('FACA', true);
    this.state = 'intro';
    this.fadeVal = 1; this.fadeTarget = 0;
    this.say(INTRO, () => {
      if (this.state === 'intro') this.state = 'play';
      this.checkObjective(true);
      this.ui.toast(TIPS[0], 5);
    });
  }
  continueGame() {
    if (!this.doLoad()) { this.toTitle(); return; }
    this.ui.showHud(true);
    this.state = 'play';
    this.checkObjective(true);
  }

  // ==================== SALAS ====================
  roomState(id) {
    if (!this.rooms[id]) this.rooms[id] = { taken: {}, dead: {} };
    return this.rooms[id];
  }

  loadRoom(id, sx, sz, angle, opts = {}) {
    if (this.room) {
      this.scene.remove(this.room.group);
    }
    this.enemies = [];
    this.boss = null;
    this.ui.boss(null);
    const room = buildRoom(this.THREE, this.TEX, id);
    this.room = room;
    // drenagem do porão
    if (id === 'porao' && this.flags.valveOpen) {
      room.solids = room.solids.filter((s) => s.tag !== 'water');
    }
    this.scene.add(room.group);
    this.psx.snapScene(room.group);
    // estado persistente
    const rs = this.roomState(id);
    for (const p of room.pickups) {
      if (rs.taken[p.idx]) { p.taken = true; p.mesh.visible = false; }
    }
    for (const s of room.spawns) {
      const dead = !!rs.dead[s.idx];
      const e = new Enemy(this.THREE, this.TEX, s.type, s.x, s.z, dead);
      e.spawnIdx = s.idx;
      e.addTo(room.group);
      this.psx.snapScene(e.group);
      this.enemies.push(e);
    }
    // chefe do terraço
    if (id === 'terraco' && this.flags.memorialOpen && !this.flags.bossDead && !opts.backdrop) {
      this.spawnBossActors();
    }
    // névoa / fundo
    this.scene.fog = new this.THREE.Fog(room.fog.c, room.fog.n, room.fog.f);
    this.scene.background = new this.THREE.Color(room.fog.c);
    // áudio
    this.audio.ambient(room.ambient);
    if (!opts.backdrop) {
      if (this.boss) this.audio.music('boss');
      else if (room.music) this.audio.music(room.music);
      else this.audio.music(null);
    } else {
      this.audio.music('title');
    }
    // jogador
    this.player.place(sx, sz, angle);
    this.player.setAim(false);
    this.particles.clear();
    if (!opts.backdrop) {
      this.ui.room(room.name);
      this.fadeVal = 1;
      this.fadeTarget = 0;
      this.updateAmmoHud();
      this.ui.hp(this.player.hp);
    }
    // câmera imediata
    this.selectCam(true);
  }

  selectCam(snap = false) {
    const p = this.player;
    let cam = this.room.cams[0];
    for (const c of this.room.cams) {
      const [x0, z0, x1, z1] = c.rect;
      if (p.x >= x0 && p.x <= x1 && p.z >= z0 && p.z <= z1) { cam = c; break; }
    }
    if (cam !== this.curCam || snap) {
      this.curCam = cam;
      this.camera.fov = cam.fov;
      this.camera.updateProjectionMatrix();
    }
    // tremor de mão + dano
    const sh = 0.02 + this.dmgVal * 0.05 + this.camShake * 0.15;
    const t = performance.now() / 1000;
    this.camera.position.set(
      cam.pos[0] + Math.sin(t * 1.7) * sh + (Math.random() - 0.5) * this.camShake * 0.2,
      cam.pos[1] + Math.sin(t * 2.3) * sh * 0.6,
      cam.pos[2] + Math.cos(t * 1.3) * sh
    );
    this.camera.lookAt(cam.look[0], cam.look[1], cam.look[2]);
    this.camShake = Math.max(0, this.camShake - 0.03);
  }

  // ==================== DIÁLOGO / BANNER / OBJETIVO ====================
  say(lines, cb) {
    if (this.state === 'play') this.state = 'dialog';
    this.player.setAim(false);
    this.ui.crosshair(false);
    this.ui.target(0, 0, false);
    this.ui.dialog(lines, () => {
      if (this.state === 'dialog') this.state = 'play';
      if (cb) cb();
    });
  }
  showBanner(itemId, qty = 1) {
    this.bannerItem = { itemId, qty };
    this.bannerT = 2.8;
    this.state = 'banner';
    this.ui.showBanner(itemId, qty);
  }
  closeBanner() {
    if (this.state !== 'banner') return;
    this.ui.hideBanner();
    this.state = 'play';
    this.bannerItem = null;
  }
  checkObjective(force = false) {
    const txt = objectiveFor(this.flags);
    if (force || txt !== this.lastObjective) {
      this.lastObjective = txt;
      this.ui.toast('◎ OBJETIVO: ' + txt, 4.5);
    }
  }

  // ==================== INVENTÁRIO ====================
  countItem(id) {
    const s = this.inv.find((i) => i.id === id);
    return s ? s.qty : 0;
  }
  hasItem(id) { return this.countItem(id) > 0; }
  addItem(id, qty = 1) {
    const s = this.inv.find((i) => i.id === id);
    if (s) s.qty += qty;
    else this.inv.push({ id, qty });
    this.updateAmmoHud();
  }
  removeItem(id, qty = 1) {
    const i = this.inv.findIndex((x) => x.id === id);
    if (i < 0) return;
    this.inv[i].qty -= qty;
    if (this.inv[i].qty <= 0) {
      this.inv.splice(i, 1);
      if (this.equipped === id) {
        this.equipped = this.hasItem('shotgun') ? 'shotgun' : this.hasItem('pistol') ? 'pistol' : 'knife';
        this.player.setWeapon(this.equipped);
      }
    }
    this.updateAmmoHud();
  }
  getInvData() {
    return {
      items: this.inv,
      equipped: this.equipped,
      objective: this.lastObjective || objectiveFor(this.flags),
      pages: this.flags.pages.filter(Boolean).length,
      time: fmtTime(this.timePlayed),
    };
  }
  openInventory() {
    if (this.state !== 'play') return;
    this.state = 'inventory';
    this.player.setAim(false);
    this.ui.crosshair(false);
    this.ui.target(0, 0, false);
    this.ui.openInventory(this.getInvData());
  }
  closeInventory() {
    if (this.state !== 'inventory') return;
    this.audio.sfx('uiBack');
    this.ui.closeInventory();
    this.state = 'play';
  }
  invCommand(act) {
    const data = this.getInvData();
    const sel = data.items[this.ui.invSel];
    if (!sel) return;
    if (act === 'use') this.useItem(sel.id);
    else if (act === 'examine') {
      this.audio.sfx('uiSelect');
      this.ui.toast(ITEMS[sel.id].icon + ' ' + ITEMS[sel.id].name + ' — ' + ITEMS[sel.id].desc, 4.5);
    }
  }
  invDefaultAction() {
    const data = this.getInvData();
    const sel = data.items[this.ui.invSel];
    if (!sel) return;
    const def = ITEMS[sel.id];
    this.invCommand(def.type === 'weapon' || def.type === 'heal' ? 'use' : 'examine');
  }
  invExamineSel() {
    const data = this.getInvData();
    const sel = data.items[this.ui.invSel];
    if (sel) {
      this.audio.sfx('uiSelect');
      this.ui.toast(ITEMS[sel.id].icon + ' ' + ITEMS[sel.id].name + ' — ' + ITEMS[sel.id].desc, 4.5);
    }
  }
  useItem(id) {
    const def = ITEMS[id];
    if (def.type === 'weapon') {
      this.equipped = id;
      this.player.setWeapon(id);
      this.audio.sfx('uiSelect');
      this.ui.toast(def.icon + ' ' + def.name + ' equipada.', 2);
      this.updateAmmoHud();
    } else if (def.type === 'heal') {
      if (this.player.hp >= this.player.maxhp) {
        this.audio.sfx('uiBack');
        this.ui.toast('Vida cheia. Guarde para depois.', 2.5);
        return;
      }
      this.removeItem(id);
      this.player.heal(def.power >= 999 ? 999 : def.power);
      this.audio.sfx('heal');
      this.ui.hp(this.player.hp);
      this.ui.toast(def.icon + ' Você se sente melhor...', 2.5);
      this.updateAmmoHud();
    } else if (def.type === 'ribbon') {
      this.audio.sfx('uiBack');
      this.ui.toast('Use no DIÁRIO do saguão para registrar o progresso.', 3);
    } else if (def.type === 'ammo') {
      this.audio.sfx('uiBack');
      this.ui.toast('Munição de reserva. É usada ao atirar.', 3);
    } else {
      this.audio.sfx('uiBack');
      this.ui.toast('É usado automaticamente no lugar certo.', 3);
    }
    this.ui.renderInventory(this.getInvData());
  }
  updateAmmoHud() {
    const w = this.equipped;
    const def = ITEMS[w];
    if (def.ammo) this.ui.ammo(`${def.name} • ${this.countItem(def.ammo)}`, true);
    else this.ui.ammo(def.name, true);
  }

  // ==================== COFRE ====================
  openSafe() {
    this.state = 'safe';
    this.ui.openSafe();
  }
  safeConfirm() {
    if (this.ui.safeCode === '1402') {
      this.audio.sfx('safeOpen');
      this.ui.closeSafe();
      this.state = 'play';
      this.flags.safeOpened = true;
      this.addItem('basekey');
      this.addItem('shell', 6);
      this.say(D.cofre_ok, () => {
        this.showBanner('basekey');
        this.ui.toast('+6 Cartuchos Cal.12', 3);
      });
      this.checkObjective();
    } else {
      this.audio.sfx('safeFail');
      this.ui.toast('Senha incorreta. Tente outra data...', 3);
    }
  }
  safeCancel() {
    this.audio.sfx('uiBack');
    this.ui.closeSafe();
    this.state = 'play';
  }

  // ==================== SAVE / LOAD ====================
  hasSave() {
    try { return !!localStorage.getItem(SAVE_KEY); } catch (e) { return false; }
  }
  openSaveBox() {
    if (!this.hasItem('ribbon')) {
      this.say(D.diario_noribbon);
      return;
    }
    this.state = 'savebox';
    this.audio.sfx('typewriter');
    this.ui.showSave();
  }
  saveConfirm(yes) {
    if (this.state !== 'savebox') return;
    this.ui.hideSave();
    if (yes) {
      this.removeItem('ribbon');
      this.saves++;
      this.doSave();
      this.audio.sfx('save');
      this.ui.toast('✎ Progresso registrado. (' + this.saves + ' registros)', 3);
    } else {
      this.audio.sfx('uiBack');
    }
    this.state = 'play';
  }
  doSave() {
    const data = {
      v: 1,
      flags: this.flags,
      inv: this.inv,
      equipped: this.equipped,
      hp: this.player.hp,
      room: this.room.id,
      x: this.player.x, z: this.player.z, angle: this.player.angle,
      time: this.timePlayed,
      saves: this.saves,
      rooms: this.rooms,
    };
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(data)); } catch (e) { /* noop */ }
  }
  doLoad() {
    try {
      const data = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
      if (!data || data.v !== 1) return false;
      this.resetRun();
      this.flags = data.flags;
      this.inv = data.inv;
      this.equipped = data.equipped;
      this.timePlayed = data.time || 0;
      this.saves = data.saves || 0;
      this.rooms = data.rooms || {};
      this.player.group.visible = true;
      this.player.group.rotation.x = 0;
      this.player.group.position.y = 0;
      this.player.hp = data.hp;
      this.player.dead = false;
      this.player.setWeapon(this.equipped);
      this.dmgVal = 0; this.deathT = 0;
      this.whiteVal = 0; this.whiteTarget = 0;
      this.loadRoom(data.room, data.x, data.z, data.angle, {});
      this.ui.showHud(true);
      this.ui.hp(this.player.hp);
      this.updateAmmoHud();
      return true;
    } catch (e) {
      return false;
    }
  }

  // ==================== PORTAS ====================
  useDoor(door) {
    // já aberta?
    if (door.setFlag && this.flags[door.setFlag]) { this.doorSequence(door); return; }
    if (door.need) {
      if (door.need.item) {
        if (!this.hasItem(door.need.item)) {
          this.audio.sfx('locked');
          this.say([{ who: 'n', text: door.msg || 'Trancada.' }]);
          return;
        }
        if (door.consume) this.removeItem(door.need.item);
        if (door.setFlag) this.flags[door.setFlag] = true;
        this.audio.sfx('unlock');
        this.doorSequence(door);
        return;
      }
      if (door.need.flag) {
        if (!this.flags[door.need.flag]) {
          this.audio.sfx('locked');
          const msg = door.msg && D[door.msg] ? D[door.msg] : [{ who: 'n', text: door.msg || 'Trancada.' }];
          this.say(msg);
          return;
        }
        this.doorSequence(door);
        return;
      }
    }
    this.doorSequence(door);
  }
  doorSequence(door) {
    this.state = 'door';
    this.player.setAim(false);
    this.ui.crosshair(false);
    this.ui.target(0, 0, false);
    this.ui.prompt(null);
    if (door.elevator) this.audio.sfx('elevator');
    else this.audio.sfx('doorCreak');
    this.ui.doorAnim(!!door.elevator, () => {
      this.audio.sfx('doorSlam');
      this.loadRoom(door.target, door.sx, door.sz, door.sa, {});
      this.state = 'play';
      this.checkObjective();
      // dica de combate na primeira vez com inimigos
      if (!this.flags.hintFight && this.enemies.some((e) => e.alive)) {
        this.flags.hintFight = true;
        this.ui.toast('⚠ Sombras à frente! Mire com ESPAÇO, atire com J — ou CORRA.', 5);
      }
    });
  }

  // ==================== INTERAÇÕES (puzzles) ====================
  doAct(act) {
    const f = this.flags;
    const say = (lines, cb) => this.say(lines, cb);
    switch (act) {
      case 'bed':
        if (!f.bedKey) {
          f.bedKey = true;
          this.addItem('smallkey');
          say(D.cama_key, () => this.showBanner('smallkey'));
        } else say(f.drawerOpen ? D.cama_after : D.cama_locked);
        break;
      case 'drawer':
        if (f.drawerOpen) { say(D.gaveta_after); break; }
        if (!this.hasItem('smallkey')) { say(D.gaveta_locked); break; }
        this.removeItem('smallkey');
        f.drawerOpen = true;
        f.pistol = true;
        this.addItem('pistol');
        this.addItem('ammo9', 12);
        this.addItem('pills', 1);
        this.audio.sfx('puzzle');
        say(D.gaveta_open, () => {
          this.showBanner('pistol');
          this.ui.toast('+12 Balas 9mm • +1 Comprimidos • Bilhete: "14 de fevereiro"', 5);
        });
        this.checkObjective();
        break;
      case 'teddy':
        if (!f.frags[0]) {
          f.frags[0] = true;
          this.addItem('frag');
          this.audio.sfx('memorial');
          say(D.urso_frag, () => this.showBanner('frag'));
          this.checkObjective();
        } else say(D.urso_after);
        break;
      case 'clock': say(D.relogio); break;
      case 'window_q': say(D.janela_quarto); break;
      case 'statue':
        if (!f.rustKey) {
          f.rustKey = true;
          this.addItem('rustkey');
          say(D.estatua_key, () => this.showBanner('rustkey'));
          this.checkObjective();
        } else say(D.estatua_after);
        break;
      case 'stairs': say(D.escada); break;
      case 'vase':
        if (!f.vase) {
          f.vase = true;
          this.addItem('pills');
          say(D.vaso, () => this.showBanner('pills'));
        } else say(D.vaso_after);
        break;
      case 'save': this.openSaveBox(); break;
      case 'fusebox':
        if (f.fuseOn) { say(D.quadro_after); break; }
        if (!this.hasItem('fuse')) { say(D.quadro_falta); break; }
        this.removeItem('fuse');
        f.fuseOn = true;
        this.audio.sfx('power');
        this.audio.sfx('puzzle');
        say(D.quadro_ok);
        this.checkObjective();
        break;
      case 'armario':
        if (!f.crank) {
          f.crank = true;
          this.addItem('crank');
          f.frags[1] = true;
          this.addItem('frag');
          this.audio.sfx('memorial');
          say(D.armario, () => {
            this.showBanner('crank');
            this.ui.toast('💠 +1 FRAGMENTO DE MEMÓRIA (2/4)', 4);
          });
          this.checkObjective();
        } else say(D.armario_after);
        break;
      case 'cama3': say(D.cama3); break;
      case 'cadeira': say(D.cadeira_rodas); break;
      case 'cortina': say(D.cortina); break;
      case 'desk': say(D.poema); break;
      case 'safe':
        if (f.safeOpened) say(D.cofre_vazio);
        else this.openSafe();
        break;
      case 'estante': say(D.estante); break;
      case 'painting':
        if (!f.frags[2]) {
          f.frags[2] = true;
          this.addItem('frag');
          this.audio.sfx('memorial');
          say(D.quadro_pintura, () => this.showBanner('frag'));
          this.checkObjective();
        } else say(D.quadro_pintura_after);
        break;
      case 'valve':
        if (f.valveOpen) { say(D.valvula_after); break; }
        if (!this.hasItem('crank')) { say(D.valvula_falta); break; }
        f.valveOpen = true;
        this.audio.sfx('valve');
        this.room.solids = this.room.solids.filter((s) => s.tag !== 'water');
        say(D.valvula_ok);
        this.checkObjective();
        break;
      case 'boiler': say(D.boiler); break;
      case 'crate':
        if (!f.frags[3]) {
          f.frags[3] = true;
          this.addItem('frag');
          this.audio.sfx('memorial');
          say(D.engradado, () => this.showBanner('frag'));
          this.checkObjective();
        } else say(D.engradado_after);
        break;
      case 'memorial': {
        const n = f.frags.filter(Boolean).length;
        if (f.memorialOpen) { this.ui.toast('O memorial arde em luz azul.', 3); break; }
        if (n < 4) { say(D.memorial_falta); break; }
        f.memorialOpen = true;
        this.audio.sfx('memorial');
        this.audio.sfx('bossRoar');
        this.spawnBossActors();
        say(D.memorial_ok, () => this.checkObjective());
        break;
      }
      case 'portal':
        this.startEnding();
        break;
      case 'edge': say(D.beirada); break;
      default: break;
    }
  }

  // ==================== PICKUPS ====================
  pickupAt(p) {
    if (p.taken) return;
    p.taken = true;
    p.mesh.visible = false;
    this.roomState(this.room.id).taken[p.idx] = 1;
    if (p.item === 'page') {
      const pg = DIARY[p.page];
      this.flags.pages[p.page] = true;
      this.audio.sfx('pickup');
      const n = this.flags.pages.filter(Boolean).length;
      this.say([{ who: 'n', text: `— ${pg.title} —\n${pg.text}\n\n(Página ${n} de 8)` }]);
      return;
    }
    this.addItem(p.item, p.qty);
    const def = ITEMS[p.item];
    if (def.type === 'key' || def.type === 'weapon') this.audio.sfx('pickupKey');
    else this.audio.sfx('pickup');
    // dicas contextuais
    if (p.item === 'shotgun' && !this.flags.hintShotgun) {
      this.flags.hintShotgun = true;
      this.ui.toast('Abra o inventário (TAB) para equipar a espingarda.', 4);
    }
    if ((p.item === 'ammo9' || p.item === 'shell') && !this.flags.hintAmmo) {
      this.flags.hintAmmo = true;
      this.ui.toast('Munição guardada. Equipe a arma no inventário (TAB).', 4);
    }
    this.showBanner(p.item, p.qty);
  }

  // ==================== CHEFE / FINAL ====================
  spawnBossActors() {
    if (this.boss) return;
    const boss = new Enemy(this.THREE, this.TEX, 'vulto', 0, -0.5, false);
    boss.spawnIdx = -1;
    boss.addTo(this.room.group);
    this.psx.snapScene(boss.group);
    boss.alert();
    this.enemies.push(boss);
    this.boss = boss;
    for (const [x, z] of [[-4.5, 2.5], [4.5, 2.5]]) {
      const s = new Enemy(this.THREE, this.TEX, 'sombra', x, z, false);
      s.spawnIdx = -2;
      s.addTo(this.room.group);
      this.psx.snapScene(s.group);
      this.enemies.push(s);
    }
    this.audio.music('boss');
    this.ui.boss('VULTO', 1);
    this.psx.shake(0.03);
  }
  onBossDead() {
    this.flags.bossDead = true;
    this.audio.music(null);
    this.audio.ambient('terraco');
    this.ui.boss(null);
    this.boss = null;
    this.say(D.boss_dead, () => this.checkObjective());
  }
  startEnding() {
    if (this.state !== 'play') return;
    this.state = 'ending';
    this.endingPhase = 0;
    this.player.setAim(false);
    this.ui.crosshair(false);
    this.ui.prompt(null);
    this.audio.stopMusic();
    this.audio.ambient('quarto');
    this.audio.music('ending');
    const good = this.flags.pages.filter(Boolean).length >= 8;
    this.endingGood = good;
    this.ui.dialog(good ? END_GOOD : END_NORMAL, () => {
      this.endingPhase = 1;
      this.whiteTarget = 1;
    });
  }
  finishEnding() {
    this.endingPhase = 2;
    this.state = 'endingPanel';
    this.audio.music(null);
    this.audio.stopAmbient();
    const pages = this.flags.pages.filter(Boolean).length;
    this.ui.showEnding({
      title: this.endingGood ? 'FINAL: ACEITAÇÃO ★' : 'FINAL: MEIO CAMINHO',
      good: this.endingGood,
      rank: rankFor(this.timePlayed, this.saves),
      time: fmtTime(this.timePlayed),
      saves: this.saves,
      pages,
      msg: this.endingGood
        ? 'Você juntou todas as memórias.<br>Obrigado por jogar ECOS DO VAZIO.<br><br><i>Se a escuridão pesar, peça ajuda. CVV — 188.</i>'
        : `Faltaram ${8 - pages} páginas do diário.<br>Jogue de novo e encontre todas para o final verdadeiro.<br><br><i>Se a escuridão pesar, peça ajuda. CVV — 188.</i>`,
    });
  }

  // ==================== COMBATE ====================
  autoTarget() {
    const w = WEAPONS[this.equipped];
    let best = null, bestScore = 1e9;
    for (const e of this.enemies) {
      if (!e.alive) continue;
      const dx = e.x - this.player.x, dz = e.z - this.player.z;
      const dist = Math.hypot(dx, dz);
      if (dist > w.range + 2) continue;
      let diff = Math.atan2(dx, dz) - this.player.angle;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      if (Math.abs(diff) > 0.65) continue;
      if (!this.room.los(this.player.x, this.player.z, e.x, e.z)) continue;
      const score = dist + Math.abs(diff) * 4;
      if (score < bestScore) { bestScore = score; best = e; }
    }
    return best;
  }

  tryFire() {
    const p = this.player;
    if (!p.canFire() || p.dead) return;
    const w = WEAPONS[this.equipped];
    const def = ITEMS[this.equipped];
    const dirX = Math.sin(p.angle), dirZ = Math.cos(p.angle);

    // --- faca ---
    if (this.equipped === 'knife') {
      p.spendCooldown();
      this.audio.sfx('knife');
      this.camShake = Math.min(1, this.camShake + w.kick);
      let hitAny = false;
      for (const e of this.enemies) {
        if (!e.alive) continue;
        const dx = e.x - p.x, dz = e.z - p.z;
        const dist = Math.hypot(dx, dz);
        if (dist > w.range) continue;
        let diff = Math.atan2(dx, dz) - p.angle;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        if (Math.abs(diff) > 0.8) continue;
        hitAny = true;
        const died = e.damage(w.dmg, dx / (dist || 1), dz / (dist || 1));
        const cp = e.chestPos();
        this.particles.burst(cp.x, cp.y, cp.z, { color: 0x880000, n: 10, speed: 2 });
        this.audio.sfx('hitFlesh');
        if (died) this.onEnemyDead(e);
      }
      if (!hitAny) {
        // golpe no ar
        this.particles.burst(p.x + dirX, 1.2, p.z + dirZ, { color: 0xaaaaaa, n: 4, speed: 1, grav: 0, life: 0.25 });
      }
      return;
    }

    // --- armas de fogo ---
    if (!def.ammo || this.countItem(def.ammo) <= 0) {
      this.audio.sfx('dryfire');
      p.spendCooldown();
      this.ui.toast('Sem munição! (TAB para trocar/equipar)', 2);
      return;
    }
    this.removeItem(def.ammo);
    p.spendCooldown();
    this.audio.sfx(w.sfx);
    this.flashVal = this.equipped === 'shotgun' ? 0.35 : 0.22;
    this.camShake = Math.min(1, this.camShake + w.kick);
    this.psx.shake(w.kick * 0.03);
    const mz = p.muzzleWorld();
    this.particles.burst(mz.x, mz.y, mz.z, { color: 0xffcc66, n: 8, speed: 1.5, grav: 0, life: 0.18 });
    // alerta geral (barulho)
    for (const e of this.enemies) {
      if (e.alive && Math.hypot(e.x - p.x, e.z - p.z) < 15) e.alert();
    }
    const target = this.autoTarget();
    if (target) {
      const dx = target.x - p.x, dz = target.z - p.z;
      const dist = Math.hypot(dx, dz);
      let dmg = w.dmg;
      if (w.falloff) dmg = Math.round(w.dmg * Math.max(0.25, 1 - dist / (w.range * 1.25)));
      const died = target.damage(dmg, dx / (dist || 1), dz / (dist || 1));
      const cp = target.chestPos();
      this.particles.burst(cp.x, cp.y, cp.z, { color: 0x990000, n: this.equipped === 'shotgun' ? 22 : 12, speed: 3 });
      this.audio.sfx('hitFlesh');
      if (died) this.onEnemyDead(target);
      // mira cola no alvo
      p.angle = Math.atan2(dx, dz);
    } else {
      // impacto na parede
      let hx = mz.x, hz = mz.z, hit = false;
      for (let d = 0.5; d < 12; d += 0.3) {
        const px = mz.x + dirX * d, pz = mz.z + dirZ * d;
        if (pointInSolids(px, pz, this.room.solids)) { hx = px; hz = pz; hit = true; break; }
        hx = px; hz = pz;
      }
      if (hit) {
        this.particles.burst(hx, 1.3, hz, { color: 0xffdd88, n: 8, speed: 2.5 });
        this.audio.sfx('hitWall');
      }
    }
    this.updateAmmoHud();
  }

  onEnemyDead(e) {
    this.audio.sfx('enemyDie');
    if (e.spawnIdx >= 0) this.roomState(this.room.id).dead[e.spawnIdx] = 1;
    const cp = e.chestPos();
    this.particles.burst(cp.x, cp.y, cp.z, { color: 0x660000, n: 18, speed: 3 });
    if (e.type === 'vulto') {
      this.psx.shake(0.04);
      this.onBossDead();
    }
  }

  damagePlayer(n, fromX, fromZ) {
    const p = this.player;
    if (!p.damage(n)) return;
    this.audio.sfx('playerHurt');
    this.dmgVal = 0.9;
    this.camShake = Math.min(1, this.camShake + 0.7);
    this.psx.shake(0.025);
    this.ui.hp(p.hp);
    // empurrãozinho
    const dx = p.x - fromX, dz = p.z - fromZ;
    const d = Math.hypot(dx, dz) || 1;
    p.group.position.x += (dx / d) * 0.25;
    p.group.position.z += (dz / d) * 0.25;
    collideCircle(p.group.position, 0.35, this.room.solids);
    if (p.dead) {
      this.deathT = 0;
      this.player.setAim(false);
      this.ui.crosshair(false);
      this.ui.target(0, 0, false);
      this.ui.prompt(null);
    }
  }

  // ==================== PROMPT ====================
  currentCandidate() {
    const p = this.player;
    let best = null, bestD = 1e9;
    for (const d of this.room.doors) {
      const dist = Math.hypot(d.x - p.x, d.z - p.z);
      if (dist < d.r && dist < bestD) { bestD = dist; best = { kind: 'door', ref: d }; }
    }
    for (const it of this.room.interacts) {
      if (it.when && !it.when(this.flags)) continue;
      const dist = Math.hypot(it.x - p.x, it.z - p.z);
      if (dist < it.r && dist < bestD) { bestD = dist; best = { kind: 'act', ref: it }; }
    }
    for (const pk of this.room.pickups) {
      if (pk.taken) continue;
      const dist = Math.hypot(pk.x - p.x, pk.z - p.z);
      if (dist < 1.4 && dist < bestD) { bestD = dist; best = { kind: 'pickup', ref: pk }; }
    }
    return best;
  }
  doPromptAction() {
    if (this.state !== 'play' || this.player.dead) return;
    const c = this.currentCandidate();
    if (!c) return;
    if (c.kind === 'door') this.useDoor(c.ref);
    else if (c.kind === 'act') this.doAct(c.ref.act);
    else if (c.kind === 'pickup') this.pickupAt(c.ref);
  }

  // ==================== UPDATE ====================
  frame() {
    const dt = Math.min(0.05, this.clock.getDelta());
    const st = this.state;
    // tempo de jogo
    if (!['title', 'help', 'options'].includes(st)) this.timePlayed += dt;

    if (st === 'play') this.updatePlay(dt);
    else if (st === 'banner') {
      this.bannerT -= dt;
      if (this.bannerT <= 0) this.closeBanner();
      this.selectCam();
    } else if (st === 'dialog' || st === 'intro' || st === 'inventory' || st === 'safe' || st === 'savebox' || st === 'pause' || st === 'door') {
      this.selectCam();
      if (this.room.fx) this.room.fx(dt, this.clock.elapsedTime, this);
    } else if (st === 'gameover') {
      this.selectCam();
    } else if (st === 'ending') {
      this.selectCam();
      if (this.room.fx) this.room.fx(dt, this.clock.elapsedTime, this);
      if (this.endingPhase === 1) {
        this.whiteVal = Math.min(1, this.whiteVal + dt * 0.5);
        if (this.whiteVal >= 1) this.finishEnding();
      }
    } else if (st === 'title' || st === 'help' || st === 'options') {
      if (st === 'title') this.updateTitleCam(dt);
      if (this.room.fx) this.room.fx(dt, this.clock.elapsedTime, this);
    }

    // efeitos globais
    this.fadeVal += (this.fadeTarget - this.fadeVal) * Math.min(1, dt * 2.2);
    if (Math.abs(this.fadeTarget - this.fadeVal) < 0.01) this.fadeVal = this.fadeTarget;
    this.psx.setFade(this.fadeVal);
    this.dmgVal = Math.max(0, this.dmgVal - dt * 1.4);
    const lowHp = this.player.hp <= 33 && this.player.hp > 0 && this.player.group.visible;
    const pulse = lowHp ? 0.3 + Math.sin(performance.now() / 350) * 0.12 : 0;
    this.psx.setDamage(Math.max(this.dmgVal, pulse));
    this.flashVal = Math.max(0, this.flashVal - dt * 3);
    // relâmpago soma ao flash
    if (this.flashBoost > 0) {
      this.psx.setFlash(Math.max(this.flashVal, this.flashBoost));
      this.flashBoost = Math.max(0, this.flashBoost - dt * 2.5);
    } else {
      this.psx.setFlash(this.flashVal);
    }
    this.psx.setWhite(this.whiteVal);
    this.audio.heartbeat(lowHp && st === 'play');

    this.ui.update(dt);
    this.particles.update(dt);
    this.lantern.intensity = this.player.group.visible ? 5 : 0;
    this.psx.render(this.scene, this.camera, dt);
  }

  updateTitleCam(dt) {
    this.titleAngle += dt * 0.08;
    const r = 9;
    this.camera.position.set(Math.sin(this.titleAngle) * r, 3.4, Math.cos(this.titleAngle) * r - 1);
    this.camera.lookAt(0, 1.2, -4);
    if (this.camera.fov !== 55) { this.camera.fov = 55; this.camera.updateProjectionMatrix(); }
  }

  updatePlay(dt) {
    const p = this.player;
    // morte
    if (p.dead) {
      this.deathT += dt;
      p.dieAnim(dt);
      this.dmgVal = Math.max(this.dmgVal, 0.7);
      if (this.deathT > 1.7 && this.state === 'play') {
        this.state = 'gameover';
        this.audio.sfx('gameover');
        this.audio.stopMusic();
        this.audio.heartbeat(false);
        this.fadeTarget = 0.4;
        this.ui.showGameOver();
      }
      return;
    }
    // mira
    const aiming = this.aimHeld();
    if (aiming && !p.aiming && this.equipped !== 'knife' && !this.flags.hintAim) {
      this.flags.hintAim = true;
      this.ui.toast('J / CLIQUE para atirar. A mira cola no inimigo mais próximo.', 4);
    }
    p.setAim(aiming);
    this.ui.crosshair(aiming);
    // movimento
    const ev = p.update(dt, this.moveInput(), this.room);
    if (ev.step) this.audio.sfx(ev.run ? 'stepRun' : 'step');
    // separação jogador x inimigos + inimigos x inimigos
    for (const e of this.enemies) {
      if (!e.alive) continue;
      const rr = (e.type === 'vulto' ? 0.85 : 0.5) + 0.32;
      const dx = p.x - e.x, dz = p.z - e.z;
      const d = Math.hypot(dx, dz);
      if (d < rr && d > 0.001) {
        p.group.position.x = e.x + (dx / d) * rr;
        p.group.position.z = e.z + (dz / d) * rr;
        collideCircle(p.group.position, 0.35, this.room.solids);
      }
    }
    for (let i = 0; i < this.enemies.length; i++) {
      for (let j = i + 1; j < this.enemies.length; j++) {
        const a = this.enemies[i], b = this.enemies[j];
        if (!a.alive || !b.alive) continue;
        const dx = b.x - a.x, dz = b.z - a.z;
        const d = Math.hypot(dx, dz);
        if (d < 0.7 && d > 0.001) {
          const push = (0.7 - d) / 2;
          a.group.position.x -= (dx / d) * push;
          a.group.position.z -= (dz / d) * push;
          b.group.position.x += (dx / d) * push;
          b.group.position.z += (dz / d) * push;
        }
      }
    }
    // inimigos
    for (const e of this.enemies) {
      const r = e.update(dt, p, this.room);
      if (r === 'hit') {
        this.damagePlayer(e.cfg.dmg, e.x, e.z);
        if (e.type === 'vulto') this.psx.shake(0.03);
      } else if (r === 'growl') {
        this.audio.sfx('enemyGrowl');
      } else if (r === 'chargeTele') {
        this.audio.sfx('sting');
        this.ui.toast('⚠ O VULTO vai investir! SAIA DA FRENTE!', 2);
      } else if (r === 'slam') {
        this.audio.sfx('slam');
        this.camShake = Math.min(1, this.camShake + 0.5);
        this.psx.shake(0.02);
      }
    }
    // tiro
    if (this.firePressed) {
      this.firePressed = false;
      if (aiming) this.tryFire();
    }
    // mira automática: marcador
    if (aiming) {
      const t = this.autoTarget();
      if (t) {
        const v = t.chestPos(new this.THREE.Vector3()).project(this.camera);
        if (v.z < 1) {
          const w = this.container.clientWidth, h = this.container.clientHeight;
          this.ui.target((v.x * 0.5 + 0.5) * w, (-v.y * 0.5 + 0.5) * h, true);
        } else this.ui.target(0, 0, false);
      } else this.ui.target(0, 0, false);
    } else {
      this.ui.target(0, 0, false);
    }
    // câmera + lanterna
    this.selectCam();
    this.lantern.position.set(p.x, 1.7, p.z);
    // pickups: flutuar e girar
    const t = this.clock.elapsedTime;
    for (const pk of this.room.pickups) {
      if (pk.taken) continue;
      pk.mesh.rotation.y += dt * 1.5;
      pk.mesh.position.y = pk.y + Math.sin(t * 2 + pk.phase) * 0.05;
    }
    // fx da sala
    if (this.room.fx) this.room.fx(dt, t, this);
    // prompt
    const c = this.currentCandidate();
    if (!c) this.ui.prompt(null);
    else if (c.kind === 'door') this.ui.prompt(`<b>E</b> — ${c.ref.label}`);
    else if (c.kind === 'act') this.ui.prompt(`<b>E</b> — ${c.ref.prompt}`);
    else if (c.kind === 'pickup') {
      const it = ITEMS[c.ref.item];
      const extra = c.ref.item === 'page' ? ` (Pág. ${this.flags.pages.filter(Boolean).length + 1}/8)` : c.ref.qty > 1 ? ` x${c.ref.qty}` : '';
      this.ui.prompt(`<b>E</b> — Pegar ${it.icon} ${it.name}${extra}`);
    }
    // chefe: barra
    if (this.boss && this.boss.alive) {
      this.ui.boss('VULTO', this.boss.hp / this.boss.maxhp);
    }
    // relâmpago no terraço
    if (this.room.id === 'terraco') {
      this.lightningT -= dt;
      if (this.lightningT <= 0) {
        this.lightningT = 5 + Math.random() * 10;
        this.flashBoost = 0.65;
        this.audio.sfx('thunder', { delay: 0.3 + Math.random() * 1.2 });
      }
    }
  }
}
