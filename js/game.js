// ============================================================
// ECOS DO VAZIO - Game: laço principal, campanhas cruzadas,
// câmera livre 3ª pessoa & clássica PS1, Mercenários, Sobrevivente,
// loja de pontos, puzzles, combate e cutscenes.
// ============================================================
import {
  ITEMS, WEAPONS, ENEMIES, CAMPAIGNS, SHOP_ITEMS, GALLERY_MODELS,
  rankFor, rankForMercenaries, fmtTime, healthStatus,
  SAVE_KEY, POINTS_KEY, UNLOCKS_KEY, HISCORES_KEY
} from './config.js';
import { buildTextures } from './textures.js';
import { buildRoom, ROOM_IDS, makePickupMesh } from './world.js';
import { Player, Enemy, NPC, TimeTotem, Particles, collideCircle, pointInSolids } from './entities.js';
import { AudioSys } from './audio.js';
import { createPSX } from './psx.js';
import { UI } from './ui.js';
import {
  INTRO, INTRO_CLARA, INTRO_BENTO, D, OBJECTIVES,
  END_GOOD, END_NORMAL, END_CLARA_GOOD, END_CLARA_NORMAL, END_BENTO
} from './story.js';

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
    this.camera = new THREE.PerspectiveCamera(60, 16 / 9, 0.1, 140);

    // Iluminação refinada: mais clara, legível e atmosférica
    this.ambLight = new THREE.AmbientLight(0xffffff, 0.65);
    this.scene.add(this.ambLight);
    this.hemiLight = new THREE.HemisphereLight(0xddeeff, 0x1a1522, 0.45);
    this.scene.add(this.hemiLight);

    // Lanterna com facho mais amplo e potente
    this.lantern = new THREE.PointLight(0xffedd2, 8, 16, 2);
    this.scene.add(this.lantern);

    this.TEX = buildTextures(THREE);
    this.psx = createPSX(THREE, this.renderer);
    this.audio = new AudioSys();
    this.particles = new Particles(THREE, this.scene, this.TEX);

    this.player = new Player(THREE, this.TEX);
    this.player.addTo(this.scene);
    this.psx.snapScene(this.player.group);

    // Câmera: 'fixed' (PS1 clássico) ou 'chase' (3ª pessoa estilo GTA)
    this.camMode = 'fixed';
    this.chaseCamPos = new THREE.Vector3();

    // Sistema de Pontos & Desbloqueios
    const rawPts = localStorage.getItem(POINTS_KEY);
    this.points = rawPts !== null ? parseInt(rawPts, 10) : 500; // 500 pts bônus inicial para testar a loja!
    if (rawPts === null) localStorage.setItem(POINTS_KEY, '500');
    this.unlocks = JSON.parse(localStorage.getItem(UNLOCKS_KEY) || '{}');
    this.hiscores = JSON.parse(localStorage.getItem(HISCORES_KEY) || '{}');

    // Opções
    this.opts = {
      master: 0.9, music: 0.8, sfx: 0.9, crt: true, high: false,
      brightness: 'high', filter: 'none', cam: 'fixed', infAmmo: false,
    };
    try {
      const o = JSON.parse(localStorage.getItem('ecoVazioOpts') || '{}');
      Object.assign(this.opts, o);
    } catch (e) { /* noop */ }
    this.camMode = this.opts.cam || 'fixed';
    this.infiniteAmmo = !!this.opts.infAmmo && !!this.unlocks.infinite_ammo;

    this.ui = new UI(this);
    this.applyOpts();

    // Estado e Campanhas
    this.state = 'title';
    this.currentCampaign = 'daniel'; // 'daniel' | 'clara' | 'bento'
    this.gameMode = 'story'; // 'story' | 'mercenaries' | 'survivor'
    this.helpFrom = 'title';
    this.optionsFrom = 'title';
    this.room = null;
    this.enemies = [];
    this.npcs = [];
    this.totems = [];
    this.boss = null;
    this.resetRun();

    // Entrada
    this.keys = new Set();
    this.touch = { f: false, b: false, l: false, r: false, run: false, aim: false };
    this.firePressed = false;
    this.wireInput();

    // Efeitos visuais
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

    // Cenário inicial do título: floresta sob névoa e postes iluminados
    this.loadRoom('floresta', 0, 10, 0, { backdrop: true });
    this.player.group.visible = false;
    this.audio.music('title');
    this.ui.showTitle(this.hasSave());
    this.ui.showHud(false);
    this.fadeTarget = 0;

    this.clock = new THREE.Clock();
    this.renderer.setAnimationLoop(() => this.frame());
  }

  // ==================== PONTOS & LOJA ====================
  addPoints(n, reason = '') {
    this.points += n;
    localStorage.setItem(POINTS_KEY, String(this.points));
    if (this.ui.el.titlePointsVal) this.ui.el.titlePointsVal.textContent = this.points.toLocaleString();
    if (this.ui.el.shopPointsVal) this.ui.el.shopPointsVal.textContent = this.points.toLocaleString();
    if (reason) this.ui.toast(`⭐ +${n} PONTOS: ${reason}`, 3.5);
  }

  buyShopItem(item) {
    if (this.points < item.cost) {
      this.ui.toast('Pontos insuficientes!', 2.5);
      this.audio.sfx('dryfire');
      return;
    }
    this.points -= item.cost;
    this.unlocks[item.id] = true;
    localStorage.setItem(POINTS_KEY, String(this.points));
    localStorage.setItem(UNLOCKS_KEY, JSON.stringify(this.unlocks));
    this.audio.sfx('pickupKey');
    this.ui.toast(`✓ Adquirido: ${item.name}!`, 3.5);
    this.ui.showShop(this.points, this.unlocks);

    if (item.id === 'infinite_ammo') {
      this.infiniteAmmo = true;
      this.opts.infAmmo = true;
      localStorage.setItem('ecoVazioOpts', JSON.stringify(this.opts));
    }
  }

  // ==================== CÂMERA ALTERNÁVEL ====================
  toggleCamMode() {
    this.camMode = this.camMode === 'fixed' ? 'chase' : 'fixed';
    this.opts.cam = this.camMode;
    localStorage.setItem('ecoVazioOpts', JSON.stringify(this.opts));
    this.audio.sfx('uiSelect');
    const msg = this.camMode === 'chase' ? '📷 CÂMERA: 3ª PESSOA (LIVRE)' : '📷 CÂMERA: FIXA (PS1 CLÁSSICO)';
    this.ui.toast(msg, 2.5);
    if (this.ui.el.optCam) this.ui.el.optCam.value = this.camMode;
    if (this.ui.el.invCamSwitch) {
      this.ui.el.invCamSwitch.textContent = `📷 CÂMERA: ${this.camMode === 'chase' ? '3ª PESSOA' : 'FIXA PS1'}`;
    }
  }

  setVolume(which, v) {
    this.opts[which] = v;
    this.audio.setVolume(which, v);
    this.saveOpts();
  }

  setCrt(b) {
    this.opts.crt = !!b;
    this.psx.setCrt(this.opts.crt);
    this.saveOpts();
  }

  setQuality(high) {
    this.opts.high = !!high;
    this.psx.setQuality(this.opts.high);
    this.saveOpts();
  }

  saveOpts() {
    try {
      localStorage.setItem('ecoVazioOpts', JSON.stringify(this.opts));
    } catch (e) { /* noop */ }
  }

  setCamMode(m) {
    this.camMode = m;
    this.opts.cam = m;
    this.saveOpts();
  }

  setBrightness(level) {
    this.opts.brightness = level;
    this.saveOpts();
    const val = level === 'normal' ? 1.0 : level === 'max' ? 1.75 : 1.35;
    this.psx.setBrightness(val);
    this.ambLight.intensity = level === 'normal' ? 0.45 : level === 'max' ? 0.85 : 0.65;
  }

  setFilter(f) {
    this.opts.filter = f;
    this.saveOpts();
    const mode = f === 'vhs' ? 1 : f === 'sepia' ? 2 : 0;
    this.psx.setFilter(mode);
  }

  setInfiniteAmmo(b) {
    this.infiniteAmmo = b;
    this.opts.infAmmo = b;
    this.saveOpts();
  }

  // ==================== EXECUÇÃO / RESETS ====================
  resetRun() {
    this.timeSec = 0;
    this.saves = 0;
    this.kills = 0;
    this.equipped = 'knife';
    this.inv = [];
    this.roomVisited = {};
    this.flags = {
      pages: [false, false, false, false, false, false, false, false],
      frags: [false, false, false, false],
      bedKey: false, drawerOpen: false, pistol: false, rustKey: false,
      poraoOpen: false, fuseOn: false, crank: false, valveOpen: false,
      safeOpened: false, memorialOpen: false, bossDead: false, vase: false,
      forestUnlocked: false, chapelEncounterMet: false, claraDossierGot: false,
    };
  }

  applyOpts() {
    this.audio.setVolume('master', this.opts.master);
    this.audio.setVolume('music', this.opts.music);
    this.audio.setVolume('sfx', this.opts.sfx);
    this.psx.setCrt(this.opts.crt);
    this.setBrightness(this.opts.brightness || 'high');
    this.setFilter(this.opts.filter || 'none');
  }

  resize() {
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = this.psx.fitAspect(w / h);
    this.camera.updateProjectionMatrix();
  }

  // ==================== ENTRADA / CONTROLES ====================
  wireInput() {
    window.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      this.keys.add(e.code);
      this.audio.unlock();
      this.onKey(e.code);
    });
    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.code);
    });
    this.renderer.domElement.addEventListener('mousedown', (e) => {
      if (e.button === 0) {
        this.audio.unlock();
        this.onCanvasClick();
      }
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

    // Alternar câmera rapidamente em tempo de jogo com V ou C
    if ((code === 'KeyV' || code === 'KeyC') && (st === 'play' || st === 'inventory')) {
      this.toggleCamMode();
      return;
    }

    if (st === 'title') {
      if (code === 'Escape') {
        if (!this.ui.el.campaignSelect.classList.contains('hidden')) {
          this.ui.hideCampaignSelect(); this.ui.showTitle(this.hasSave()); return;
        }
        if (!this.ui.el.extraModes.classList.contains('hidden')) {
          this.ui.hideExtraModes(); this.ui.showTitle(this.hasSave()); return;
        }
        if (!this.ui.el.pointsShop.classList.contains('hidden')) {
          this.ui.hideShop(); this.ui.showTitle(this.hasSave()); return;
        }
        if (!this.ui.el.modelViewer.classList.contains('hidden')) {
          this.ui.hideGallery(); this.ui.showShop(this.points, this.unlocks); return;
        }
      }
      if (code === 'KeyW' || code === 'ArrowUp') this.ui.titleNav(-1);
      else if (code === 'KeyS' || code === 'ArrowDown') this.ui.titleNav(1);
      else if (code === 'Enter' || code === 'Space' || code === 'KeyE') this.ui.titleConfirm();
    } else if (st === 'pause') {
      if (code === 'KeyW' || code === 'ArrowUp') this.ui.pauseNav(-1);
      else if (code === 'KeyS' || code === 'ArrowDown') this.ui.pauseNav(1);
      else if (code === 'Enter' || code === 'Space' || code === 'KeyE') this.ui.pauseConfirm();
      else if (code === 'Escape' || code === 'KeyP') this.pauseAction('resume');
    } else if (st === 'inventory') {
      if (code === 'KeyW' || code === 'ArrowUp') this.ui.invNav(0, -1);
      else if (code === 'KeyS' || code === 'ArrowDown') this.ui.invNav(0, 1);
      else if (code === 'KeyA' || code === 'ArrowLeft') this.ui.invNav(-1, 0);
      else if (code === 'KeyD' || code === 'ArrowRight') this.ui.invNav(1, 0);
      else if (code === 'Enter' || code === 'KeyE' || code === 'Space') this.ui.invConfirm();
      else if (code === 'KeyQ') this.ui.execInvCmd('EXAMINAR', this.inv[this.ui.invSel]);
      else if (code === 'Tab' || code === 'KeyI' || code === 'Escape') {
        this.closeInventory();
      }
    } else if (st === 'safe') {
      if (code === 'KeyA' || code === 'ArrowLeft') this.ui.safeNav(-1, 0);
      else if (code === 'KeyD' || code === 'ArrowRight') this.ui.safeNav(1, 0);
      else if (code === 'KeyW' || code === 'ArrowUp') this.ui.safeNav(0, 1);
      else if (code === 'KeyS' || code === 'ArrowDown') this.ui.safeNav(0, -1);
      else if (code === 'Enter') this.safeConfirm(this.ui.safeDigits.join(''));
      else if (code === 'Escape') this.safeCancel();
    } else if (st === 'savebox') {
      if (code === 'KeyA' || code === 'ArrowLeft') this.ui.saveSel = 0;
      else if (code === 'KeyD' || code === 'ArrowRight') this.ui.saveSel = 1;
      else if (code === 'Enter' || code === 'KeyE') this.saveConfirm(this.ui.saveSel === 0);
      else if (code === 'Escape') this.saveConfirm(false);
    } else if (st === 'banner') {
      if (code === 'KeyE' || code === 'Enter' || code === 'Space') this.closeBanner();
    } else if (st === 'dialog' || st === 'intro') {
      if (code === 'KeyE' || code === 'Enter' || code === 'Space') this.ui.advanceDialog();
    } else if (st === 'play') {
      if (code === 'Tab' || code === 'KeyI') this.openInventory();
      else if (code === 'Escape' || code === 'KeyP') this.pauseGame();
      else if (code === 'KeyE') this.doPromptAction();
      else if (code === 'KeyJ' || code === 'KeyX' || code === 'KeyF') {
        if (this.aimHeld()) this.tryFire();
      }
    }
  }

  onCanvasClick() {
    if (this.state === 'play' && this.aimHeld()) this.tryFire();
    else if (this.state === 'dialog' || this.state === 'intro') this.ui.advanceDialog();
    else if (this.state === 'banner') this.closeBanner();
  }

  touchFire() { if (this.state === 'play' && this.aimHeld()) this.tryFire(); }
  touchAct() {
    if (this.state === 'play') this.doPromptAction();
    else if (this.state === 'dialog' || this.state === 'intro') this.ui.advanceDialog();
    else if (this.state === 'banner') this.closeBanner();
  }
  touchInv() {
    if (this.state === 'play') this.openInventory();
    else if (this.state === 'inventory') this.closeInventory();
  }

  // ==================== AÇÕES DE MENU ====================
  titleAction(act) {
    this.ui.hideTitle();
    if (act === 'new') {
      this.ui.showCampaignSelect();
    } else if (act === 'continue') {
      this.continueGame();
    } else if (act === 'extras') {
      this.ui.showExtraModes(this.hiscores.mercenaries, this.hiscores.survivor);
    } else if (act === 'shop') {
      this.ui.showShop(this.points, this.unlocks);
    } else if (act === 'options') {
      this.optionsFrom = 'title';
      this.ui.showOptions();
    } else if (act === 'help') {
      this.helpFrom = 'title';
      this.ui.showHelp();
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
      this.ui.hidePause(); this.toTitle();
    }
  }

  gameoverAction(act) {
    if (act === 'retry') {
      this.ui.hideGameOver();
      if (this.hasSave()) this.continueGame();
      else this.startCampaign(this.currentCampaign);
    } else {
      this.ui.hideGameOver();
      this.toTitle();
    }
  }

  endingDone() {
    this.audio.sfx('uiSelect');
    this.ui.hideEnding();
    this.toTitle();
  }

  toTitle() {
    this.state = 'title';
    this.gameMode = 'story';
    this.audio.stopMusic();
    this.audio.heartbeat(false);
    this.ui.hideAllOverlays();
    this.ui.showHud(false);
    this.ui.boss(null);
    this.ui.extraHud(null);
    this.ui.hideBanner();
    this.whiteTarget = 0; this.whiteVal = 0;
    this.dmgVal = 0;
    this.player.group.visible = false;
    this.loadRoom('floresta', 0, 10, 0, { backdrop: true });
    this.fadeTarget = 0;
    this.ui.showTitle(this.hasSave());
    this.audio.music('title');
  }

  // ==================== INÍCIO DAS CAMPANHAS ====================
  startCampaign(campId) {
    if (campId === 'bento' && !this.unlocks.extra_bento) {
      this.audio.sfx('dryfire');
      this.ui.toast('🔒 Turno do Bento bloqueado! Compre na Loja de Pontos por 1.200 PTS.', 3.5);
      return;
    }

    this.ui.hideAllOverlays();
    this.currentCampaign = campId;
    this.gameMode = 'story';
    this.resetRun();

    const camp = CAMPAIGNS[campId] || CAMPAIGNS.daniel;
    const skin = this.unlocks['tactical_skin_' + campId] ? 'tactical' : 'default';
    this.player.setHero(campId, skin);

    this.player.group.visible = true;
    this.player.group.rotation.x = 0;
    this.whiteVal = 0; this.whiteTarget = 0;
    this.dmgVal = 0; this.deathT = 0;

    // Concede armas extras da loja se desbloqueadas
    if (this.unlocks.magnum_unlock) this.addItem('magnum', 1);
    if (this.unlocks.magnum_unlock) this.addItem('magnum_ammo', 12);
    if (this.unlocks.grenade_unlock) this.addItem('grenade_launcher', 1);
    if (this.unlocks.grenade_unlock) this.addItem('grenade_rounds', 6);

    // Itens iniciais da campanha
    camp.startItems.forEach((it) => this.addItem(it.item, it.qty));

    // Equipar primeira arma
    const wFirst = camp.startItems.find((i) => ITEMS[i.item].type === 'weapon');
    if (wFirst) {
      this.equipped = wFirst.item;
      this.player.setWeapon(wFirst.item);
      const invIt = this.inv.find((i) => i.item === wFirst.item);
      if (invIt) invIt.equipped = true;
    }

    this.loadRoom(camp.startRoom, camp.startX, camp.startZ, camp.startRot);
    this.state = 'intro';
    this.fadeVal = 1; this.fadeTarget = 0;
    this.ui.showHud(true);
    this.updateAmmoHud();
    this.ui.hp(this.player.hp);

    const introLines = campId === 'clara' ? INTRO_CLARA : campId === 'bento' ? INTRO_BENTO : INTRO;
    this.say(introLines, () => {
      this.state = 'play';
      this.checkObjective(true);
    });
  }

  continueGame() {
    this.ui.hideAllOverlays();
    const ok = this.doLoad();
    if (!ok) this.startCampaign('daniel');
  }

  // ==================== MODOS EXTRAS ====================
  startMercenaries() {
    if (!this.unlocks.extra_mercenaries) {
      this.audio.sfx('dryfire');
      this.ui.toast('🔒 Modo Mercenários bloqueado! Compre na Loja de Pontos por 1.000 PTS.', 3.5);
      return;
    }

    this.ui.hideAllOverlays();
    this.gameMode = 'mercenaries';
    this.mercTimer = 120; // 2 minutos
    this.mercScore = 0;
    this.mercCombo = 0;
    this.mercComboTimer = 0;
    this.mercWaveTimer = 3.0;

    this.resetRun();
    this.player.setHero(this.currentCampaign, 'default');
    this.player.group.visible = true;
    this.player.group.rotation.x = 0;

    // Equipamento completo para ação
    this.addItem('pistol', 1);
    this.addItem('ammo9', 60);
    this.addItem('shotgun', 1);
    this.addItem('shell', 24);
    this.addItem('pills', 3);
    this.equipped = 'shotgun';
    this.player.setWeapon('shotgun');
    const invIt = this.inv.find((i) => i.item === 'shotgun');
    if (invIt) invIt.equipped = true;

    this.loadRoom('saguao', 0, 0, 0);
    this.state = 'play';
    this.ui.showHud(true);
    this.updateAmmoHud();
    this.ui.hp(this.player.hp);
    this.audio.music('mercenaries');

    // Totens de tempo adicionados na arena
    this.totems = [
      new TimeTotem(this.THREE, this.TEX, -6, 2, 30),
      new TimeTotem(this.THREE, this.TEX, 6, -2, 30),
      new TimeTotem(this.THREE, this.TEX, 0, -4, 30),
    ];
    this.totems.forEach((t) => t.addTo(this.room.group));

    this.ui.toast('⏱️ MERCENÁRIOS INICIADO! Elimine aberrações e quebre totens!', 4);
  }

  startSurvivor() {
    if (!this.unlocks.extra_survivor) {
      this.audio.sfx('dryfire');
      this.ui.toast('🔒 Modo Sobrevivente bloqueado! Compre na Loja de Pontos por 1.000 PTS.', 3.5);
      return;
    }

    this.ui.hideAllOverlays();
    this.gameMode = 'survivor';
    this.survivorWave = 1;
    this.survivorKills = 0;

    this.resetRun();
    this.player.setHero(this.currentCampaign, 'default');
    this.player.group.visible = true;
    this.player.group.rotation.x = 0;

    this.addItem('knife', 1);
    this.addItem('pistol', 1);
    this.addItem('ammo9', 15);
    this.addItem('pills', 1);
    this.equipped = 'pistol';
    this.player.setWeapon('pistol');
    const invIt = this.inv.find((i) => i.item === 'pistol');
    if (invIt) invIt.equipped = true;

    this.loadRoom('floresta', 0, 0, 0);
    this.state = 'play';
    this.ui.showHud(true);
    this.updateAmmoHud();
    this.ui.hp(this.player.hp);
    this.audio.ambient('floresta');

    this.spawnSurvivorWave();
    this.ui.toast(`🛡️ SOBREVIVENTE: ONDA ${this.survivorWave}!`, 4);
  }

  spawnSurvivorWave() {
    const types = ['sombra', 'rastejador', 'cao', 'carrasco'];
    const count = 3 + this.survivorWave * 2;
    for (let i = 0; i < count; i++) {
      const type = i % 4 === 3 ? 'carrasco' : types[i % 3];
      const angle = (i / count) * Math.PI * 2;
      const x = Math.sin(angle) * (8 + Math.random() * 4);
      const z = Math.cos(angle) * (8 + Math.random() * 4);
      const e = new Enemy(this.THREE, this.TEX, type, x, z, false);
      e.spawnIdx = -100 - i;
      e.addTo(this.room.group);
      e.alert();
      this.psx.snapScene(e.group);
      this.enemies.push(e);
    }
  }

  // ==================== SALAS & TRANSIÇÕES ====================
  roomState(id) {
    if (!this.roomVisited[id]) this.roomVisited[id] = { deadSpawns: new Set(), takenPickups: new Set() };
    return this.roomVisited[id];
  }

  loadRoom(id, sx, sz, angle, opts = {}) {
    if (this.room) {
      this.scene.remove(this.room.group);
    }
    this.enemies = [];
    this.npcs = [];
    this.totems = [];
    this.boss = null;

    const r = buildRoom(this.THREE, this.TEX, id);
    this.room = r;
    this.scene.add(r.group);
    this.psx.snapScene(r.group);

    if (r.fog) {
      this.scene.fog = new this.THREE.Fog(r.fog.c, r.fog.n, r.fog.f);
      this.scene.background.setHex(r.fog.c);
    } else {
      this.scene.fog = null;
      this.scene.background.setHex(0x000000);
    }

    const st = this.roomState(id);

    // Pickups persistentes
    for (const pk of r.pickups) {
      if (st.takenPickups.has(pk.uid)) {
        pk.taken = true;
        pk.mesh.visible = false;
      }
    }

    // Inimigos
    if (!opts.backdrop && this.gameMode === 'story') {
      for (const s of r.spawns) {
        const dead = st.deadSpawns.has(s.idx);
        const e = new Enemy(this.THREE, this.TEX, s.type, s.x, s.z, dead);
        e.spawnIdx = s.idx;
        e.addTo(r.group);
        this.psx.snapScene(e.group);
        this.enemies.push(e);
      }
    }

    // Spawn do jogador
    this.player.place(sx, sz, angle);
    this.chaseCamPos.set(sx - Math.sin(angle) * 3.4, 1.9, sz - Math.cos(angle) * 3.4);

    // Cutscene do encontro de Daniel & Clara na Capela
    if (id === 'capela' && !this.flags.chapelEncounterMet && !opts.backdrop && this.gameMode === 'story') {
      const npcWho = this.currentCampaign === 'daniel' ? 'clara' : 'daniel';
      const companion = new NPC(this.THREE, this.TEX, npcWho, 0, -3.5, Math.PI);
      companion.addTo(r.group);
      this.npcs.push(companion);

      setTimeout(() => {
        this.flags.chapelEncounterMet = true;
        const dialogue = this.currentCampaign === 'daniel' ? D.encontro_daniel : D.encontro_clara;
        this.say(dialogue, () => {
          this.addItem('forest_key', 1);
          this.showBanner('forest_key');
          this.addPoints(200, 'Encontro Revelador');
        });
      }, 600);
    }

    // Chefe Alencastro no Porão da Campanha B
    if (id === 'porao' && this.currentCampaign === 'clara' && !this.flags.bossDead && !opts.backdrop) {
      const boss = new Enemy(this.THREE, this.TEX, 'alencastro', 0, 0, false);
      boss.spawnIdx = -999;
      boss.addTo(r.group);
      boss.alert();
      this.psx.snapScene(boss.group);
      this.enemies.push(boss);
      this.boss = boss;
      this.audio.music('boss');
    }

    if (!opts.backdrop) {
      this.ui.room(r.name);
      if (r.music) this.audio.music(r.music);
      else if (r.ambient) this.audio.ambient(r.ambient);
    }

    this.selectCam(true);
  }

  // ==================== CÂMERAS ====================
  selectCam(snap = false) {
    const p = this.player;

    // Modo 3ª pessoa over-the-shoulder (estilo GTA / livre)
    if (this.camMode === 'chase' && this.state !== 'title') {
      const dist = 3.4;
      const targetX = p.x - Math.sin(p.angle) * dist;
      const targetZ = p.z - Math.cos(p.angle) * dist;
      const targetY = 1.95;

      const rate = snap ? 1 : 0.18;
      this.chaseCamPos.x += (targetX - this.chaseCamPos.x) * rate;
      this.chaseCamPos.z += (targetZ - this.chaseCamPos.z) * rate;
      this.chaseCamPos.y += (targetY - this.chaseCamPos.y) * rate;

      // Impede atravessar paredes
      collideCircle(this.chaseCamPos, 0.45, this.room.solids);

      const sh = 0.015 + this.dmgVal * 0.04 + this.camShake * 0.12;
      const t = performance.now() / 1000;
      this.camera.position.set(
        this.chaseCamPos.x + Math.sin(t * 1.8) * sh,
        this.chaseCamPos.y + Math.cos(t * 2.2) * sh * 0.5,
        this.chaseCamPos.z + Math.cos(t * 1.4) * sh
      );
      this.camera.lookAt(p.x + Math.sin(p.angle) * 1.2, 1.35, p.z + Math.cos(p.angle) * 1.2);
      this.camShake = Math.max(0, this.camShake - 0.03);
      return;
    }

    // Modo Câmera Fixa (PS1 Clássico)
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

  // ==================== DIÁLOGO & BANNERS ====================
  say(lines, cb) {
    this.state = 'dialog';
    this.player.setAim(false);
    this.ui.crosshair(false);
    this.ui.target(0, 0, false);
    this.ui.dialog(lines, () => {
      this.state = 'play';
      if (cb) cb();
    });
  }

  showBanner(itemId, qty = 1) {
    this.state = 'banner';
    this.bannerItem = itemId;
    this.player.setAim(false);
    this.ui.showBanner(itemId, qty);
  }

  closeBanner() {
    this.ui.hideBanner();
    this.state = 'play';
    this.checkObjective();
  }

  checkObjective(force = false) {
    const txt = OBJECTIVES(this.flags);
    this.currentObjText = txt;
    if (force) this.ui.toast('OBJETIVO: ' + txt, 4);
  }
  currentObjective() { return this.currentObjText || OBJECTIVES(this.flags); }

  // ==================== INVENTÁRIO ====================
  countItem(id) {
    const it = this.inv.find((i) => i.item === id);
    return it ? it.qty : 0;
  }
  hasItem(id) { return this.countItem(id) > 0; }

  addItem(id, qty = 1) {
    const ex = this.inv.find((i) => i.item === id && ITEMS[id].type !== 'weapon' && ITEMS[id].type !== 'key');
    if (ex) { ex.qty += qty; return; }
    if (this.inv.length >= 8) {
      this.ui.toast('Inventário cheio!', 2.5);
      return;
    }
    this.inv.push({ item: id, qty, equipped: false });
  }

  removeItem(id, qty = 1) {
    const idx = this.inv.findIndex((i) => i.item === id);
    if (idx === -1) return;
    this.inv[idx].qty -= qty;
    if (this.inv[idx].qty <= 0) {
      if (this.inv[idx].equipped) {
        this.equipped = 'knife';
        this.player.setWeapon('knife');
      }
      this.inv.splice(idx, 1);
    }
  }

  openInventory() {
    if (this.state !== 'play') return;
    this.state = 'inventory';
    this.player.setAim(false);
    this.ui.crosshair(false);
    this.ui.target(0, 0, false);
    this.audio.sfx('uiSelect');
    this.ui.showInventory();
  }

  closeInventory() {
    this.ui.hideInventory();
    this.state = 'play';
  }

  equipWeapon(it) {
    this.inv.forEach((i) => { if (ITEMS[i.item].type === 'weapon') i.equipped = false; });
    it.equipped = true;
    this.equipped = it.item;
    this.player.setWeapon(it.item);
    this.updateAmmoHud();
  }

  useItem(it) {
    const cfg = ITEMS[it.item];
    if (cfg.type === 'heal') {
      if (this.player.hp >= this.player.maxhp) {
        this.ui.toast('Vida já está cheia.', 2);
        return;
      }
      this.player.hp = Math.min(this.player.maxhp, this.player.hp + cfg.power);
      this.removeItem(it.item, 1);
      this.audio.sfx('heal');
      this.ui.hp(this.player.hp);
      this.ui.toast(`❤ Vida recuperada (+${cfg.power})`, 2.5);
    }
  }

  readPage(idx) {
    this.ui.hideInventory();
    this.state = 'dialog';
    const lines = D.diario_texto(idx);
    this.say(lines, () => {
      this.state = 'play';
    });
  }

  examineItem(it) {
    const cfg = ITEMS[it.item];
    this.ui.toast(`${cfg.icon} ${cfg.name}: ${cfg.desc}`, 4.5);
  }

  updateAmmoHud() {
    const w = WEAPONS[this.equipped];
    const def = ITEMS[this.equipped];
    if (!w || !def.ammo) {
      this.ui.ammo('', false);
    } else {
      const c = this.infiniteAmmo ? '♾️' : this.countItem(def.ammo);
      this.ui.ammo(`${w.name}: ${c}`, true);
    }
  }

  // ==================== PUZZLES / COFRE / SAVE ====================
  openSafe() {
    this.state = 'safe';
    this.player.setAim(false);
    this.ui.showSafe();
  }

  safeConfirm(code) {
    this.ui.hideSafe();
    this.state = 'play';

    // Easter Egg código Resident Evil (1996)
    if (code === '1996') {
      this.audio.sfx('puzzle');
      this.flags.safeOpened = true;
      this.addItem('magnum_ammo', 6);
      this.addItem('lightflask', 1);
      this.addPoints(500, 'Easter Egg: Ano do PS1 Clássico');
      this.say([
        { who: 'n', text: 'O cofre destravou emitindo um zumbido clássico!' },
        { who: 'n', text: '"Para os sobreviventes do terror de 1996. Vocês ainda se lembram da mansão."' },
        { who: 'n', text: 'Você encontrou BALAS MAGNUM e um FRASCO DE LUZ!' },
      ]);
      return;
    }

    if (code === '1402') {
      this.audio.sfx('puzzle');
      this.flags.safeOpened = true;
      this.addItem('basekey');
      this.addItem('shell', 8);
      this.addPoints(300, 'Enigma do Cofre');
      this.say(D.cofre_abre, () => {
        this.showBanner('basekey');
      });
      this.checkObjective();
    } else {
      this.audio.sfx('dryfire');
      this.say(D.cofre_errado);
    }
  }

  safeCancel() {
    this.ui.hideSafe();
    this.state = 'play';
  }

  hasSave() { return !!localStorage.getItem(SAVE_KEY); }

  openSaveBox() {
    if (!this.hasItem('ribbon') && !this.unlocks.infinite_ink) {
      this.say(D.salvar_sem_fita);
      return;
    }
    this.state = 'savebox';
    this.player.setAim(false);
    this.ui.showSaveBox();
  }

  saveConfirm(yes) {
    this.ui.hideSaveBox();
    this.state = 'play';
    if (!yes) return;
    if (!this.unlocks.infinite_ink) this.removeItem('ribbon', 1);
    this.doSave();
  }

  doSave() {
    const data = {
      campaign: this.currentCampaign,
      room: this.room.id,
      x: this.player.x, z: this.player.z, angle: this.player.angle,
      hp: this.player.hp, equipped: this.equipped,
      inv: this.inv, flags: this.flags,
      timeSec: this.timeSec, saves: this.saves + 1,
      kills: this.kills, roomVisited: this.roomVisited,
    };
    this.saves++;
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    this.audio.sfx('typewriter');
    this.ui.toast('✎ Progresso registrado no Diário. (' + this.saves + ' registros)', 3.5);
  }

  doLoad() {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return false;
    try {
      const data = JSON.parse(raw);
      this.currentCampaign = data.campaign || 'daniel';
      this.gameMode = 'story';
      this.resetRun();

      this.currentCampaign = data.campaign || 'daniel';
      this.player.setHero(this.currentCampaign, this.unlocks['tactical_skin_' + this.currentCampaign] ? 'tactical' : 'default');

      this.flags = data.flags;
      this.inv = data.inv;
      this.equipped = data.equipped || 'knife';
      this.timeSec = data.timeSec || 0;
      this.saves = data.saves || 0;
      this.kills = data.kills || 0;
      this.roomVisited = data.roomVisited || {};

      this.loadRoom(data.room, data.x, data.z, data.angle);
      this.player.group.visible = true;
      this.player.group.rotation.x = 0;
      this.player.group.position.y = 0;
      this.player.hp = data.hp;
      this.player.dead = false;
      this.player.setWeapon(this.equipped);

      this.state = 'play';
      this.ui.showHud(true);
      this.updateAmmoHud();
      this.ui.hp(this.player.hp);
      this.fadeVal = 1; this.fadeTarget = 0;
      this.ui.toast('Jogo carregado com sucesso.', 3);
      return true;
    } catch (e) {
      return false;
    }
  }

  // ==================== PORTAS ====================
  useDoor(door) {
    if (door.need) {
      if (door.need.item && !this.hasItem(door.need.item)) {
        this.say([{ who: 'n', text: door.msg || 'A porta está trancada.' }]);
        this.audio.sfx('dryfire');
        return;
      }
      if (door.need.flag && !this.flags[door.need.flag]) {
        if (door.msg === 'elevador_off') this.say(D.elevador_off);
        else this.say([{ who: 'n', text: door.msg || 'Não há energia.' }]);
        this.audio.sfx('dryfire');
        return;
      }
      if (door.consume && door.need.item) this.removeItem(door.need.item, 1);
      if (door.setFlag) this.flags[door.setFlag] = true;
    }
    this.doorSequence(door);
  }

  doorSequence(door) {
    this.state = 'door';
    this.player.setAim(false);
    this.ui.crosshair(false);
    this.ui.target(0, 0, false);
    this.audio.sfx('doorCreak');
    this.ui.doorAnim(door.elevator, () => {
      this.loadRoom(door.target, door.sx, door.sz, door.srot);
      this.state = 'play';
    });
  }

  // ==================== INTERAÇÕES DE CENÁRIO ====================
  doAct(act) {
    const f = this.flags;
    const say = (lines, cb) => this.say(lines, cb);

    switch (act) {
      // Quarto 3
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
        this.addItem('ammo9', 15);
        this.addItem('pills', 1);
        this.audio.sfx('puzzle');
        say(D.gaveta_open, () => {
          this.showBanner('pistol');
          this.ui.toast('+15 Balas 9mm • +1 Comprimidos • Bilhete: "14 de fevereiro"', 5);
        });
        this.checkObjective();
        break;
      case 'teddy':
        if (!f.frags[0]) {
          f.frags[0] = true;
          this.addItem('frag');
          this.addPoints(150, 'Fragmento do Urso');
          this.audio.sfx('memorial');
          say(D.urso_frag, () => this.showBanner('frag'));
          this.checkObjective();
        } else say(D.urso_after);
        break;
      case 'clock': say(D.relogio); break;
      case 'window_q': say(D.janela_quarto); break;

      // Saguão
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

      // Enfermaria
      case 'fusebox':
        if (f.fuseOn) { say(D.quadro_after); break; }
        if (!this.hasItem('fuse')) { say(D.quadro_falta); break; }
        this.removeItem('fuse');
        f.fuseOn = true;
        this.audio.sfx('power');
        this.audio.sfx('puzzle');
        this.addPoints(200, 'Energia Restabelecida');
        say(D.quadro_ok);
        this.checkObjective();
        break;
      case 'armario':
        if (!f.crank) {
          f.crank = true;
          this.addItem('crank');
          f.frags[1] = true;
          this.addItem('frag');
          this.addPoints(150, 'Fragmento do Armário');
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

      // Consultório
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
          this.addPoints(150, 'Fragmento do Retrato');
          this.audio.sfx('memorial');
          say(D.quadro_pintura, () => this.showBanner('frag'));
          this.checkObjective();
        } else say(D.quadro_pintura_after);
        break;

      // Porão
      case 'valve':
        if (f.valveOpen) { say(D.valvula_after); break; }
        if (!this.hasItem('crank')) { say(D.valvula_falta); break; }
        f.valveOpen = true;
        this.audio.sfx('valve');
        this.room.solids = this.room.solids.filter((s) => s.tag !== 'water');
        this.addPoints(250, 'Porão Drenado');
        say(D.valvula_ok);
        this.checkObjective();
        break;
      case 'boiler': say(D.boiler); break;
      case 'crate':
        if (!f.frags[3]) {
          f.frags[3] = true;
          this.addItem('frag');
          this.addPoints(150, 'Fragmento do Engradado');
          this.audio.sfx('memorial');
          say(D.engradado, () => this.showBanner('frag'));
          this.checkObjective();
        } else say(D.engradado_after);
        break;

      // Floresta & Capela
      case 'carro_clara': say(D.carro_clara); break;
      case 'tumulo_lucia':
        say(D.tumulo_lucia, () => {
          this.addPoints(300, 'Túmulo de Lúcia Descoberto');
        });
        break;
      case 'cabana_bento': say(D.cabana_bento); break;
      case 'altar_capela': say(D.altar_capela); break;
      case 'confessionario':
        say(D.confessionario, () => {
          this.addPoints(200, 'Confissão Secreta Revelada');
        });
        break;
      case 'anjo_capela': say(D.anjo_capela); break;

      // Terraço & Finais
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

  // ==================== ITENS NO CHÃO ====================
  pickupAt(p) {
    p.taken = true;
    p.mesh.visible = false;
    this.roomState(this.room.id).takenPickups.add(p.uid);

    if (p.item === 'page') {
      this.flags.pages[p.page] = true;
      this.audio.sfx('pickup');
      this.readPage(p.page);
      return;
    }

    this.addItem(p.item, p.qty);
    this.audio.sfx(ITEMS[p.item].type === 'key' ? 'pickupKey' : 'pickup');
    this.ui.toast(`Coletou: ${ITEMS[p.item].icon} ${ITEMS[p.item].name}${p.qty > 1 ? ` x${p.qty}` : ''}`, 2.5);
    this.updateAmmoHud();
    this.checkObjective();
  }

  // ==================== CHEFES & FINAIS ====================
  spawnBossActors() {
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
  }

  onBossDead() {
    this.flags.bossDead = true;
    this.audio.stopMusic();
    this.audio.sfx('enemyDie');
    this.audio.music('ending');
    this.ui.boss(null);
    this.addPoints(1000, 'Chefe Derrotado');

    if (this.room.portal) {
      this.room.portal.visible = true;
      if (this.room.portalLight) this.room.portalLight.intensity = 20;
    }
    this.ui.toast('A luz se abriu! Atravesse o portal.', 6);
  }

  startEnding() {
    this.state = 'ending';
    this.endingPhase = 1;
    this.whiteTarget = 1;
    this.audio.stopMusic();
    this.audio.heartbeat(false);
  }

  finishEnding() {
    this.endingPhase = 2;
    const pagesCount = this.flags.pages.filter(Boolean).length;
    const rank = rankFor(this.timeSec, this.saves);

    let endLines = END_NORMAL;
    let titleStr = 'FINAL: MEIO CAMINHO';
    let isGood = false;

    if (this.currentCampaign === 'clara') {
      isGood = pagesCount >= 6;
      endLines = isGood ? END_CLARA_GOOD : END_CLARA_NORMAL;
      titleStr = isGood ? 'FINAL: REDENÇÃO MÉDICA' : 'FINAL: FUGA NA MADRUGADA';
    } else if (this.currentCampaign === 'bento') {
      endLines = END_BENTO;
      titleStr = 'FINAL: O ÚLTIMO TURNO';
      isGood = true;
    } else {
      isGood = pagesCount === 8;
      endLines = isGood ? END_GOOD : END_NORMAL;
      titleStr = isGood ? 'FINAL: ACEITAÇÃO' : 'FINAL: MEIO CAMINHO';
    }

    const earned = 2000 + (rank === 'S' ? 3000 : rank === 'A' ? 1500 : 800) + this.kills * 50;
    this.addPoints(earned);

    this.say(endLines, () => {
      this.ui.showEnding({
        title: titleStr,
        good: isGood,
        rank,
        time: fmtTime(this.timeSec),
        saves: this.saves,
        pages: pagesCount,
        kills: this.kills,
        earnedPoints: earned,
        msg: isGood
          ? 'Você encarou cada pedaço da verdade. A escuridão ainda existe, mas você aprendeu a caminhar com ela.'
          : 'Você sobreviveu à noite. Mas partes de sua alma ainda esperam por respostas no sanatório...',
      });
    });
  }

  // ==================== MIRA & COMBATE ====================
  autoTarget() {
    const p = this.player;
    let best = null, bestDist = Infinity;
    const w = WEAPONS[this.equipped];
    const maxR = w ? w.range : 10;
    for (const e of this.enemies) {
      if (!e.alive) continue;
      const dx = e.x - p.x, dz = e.z - p.z;
      const dist = Math.hypot(dx, dz);
      if (dist > maxR) continue;
      let diff = Math.atan2(dx, dz) - p.angle;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      if (Math.abs(diff) < 0.75 && dist < bestDist) {
        best = e; bestDist = dist;
      }
    }
    return best;
  }

  tryFire() {
    const p = this.player;
    if (!p.canFire() || p.dead) return;
    const w = WEAPONS[this.equipped];
    if (!w) return;
    const def = ITEMS[this.equipped];
    const dirX = Math.sin(p.angle), dirZ = Math.cos(p.angle);

    // Armas Brancas: Faca, Bisturi, Chave Inglesa
    if (def.type === 'weapon' && !def.ammo) {
      p.spendCooldown(w.rate);
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
        if (Math.abs(diff) > 0.85) continue;

        hitAny = true;
        const isCrit = w.critChance && Math.random() < w.critChance;
        const dmg = isCrit ? w.dmg * 2 : w.dmg;
        const died = e.damage(dmg, dx / (dist || 1), dz / (dist || 1));

        const cp = e.chestPos();
        this.particles.burst(cp.x, cp.y, cp.z, isCrit ? 16 : 8, 'blood');
        this.audio.sfx('hitFlesh');
        if (died) this.onEnemyDead(e);
      }
      return;
    }

    // Armas de Fogo: checa munição
    if (!this.infiniteAmmo && !this.hasItem(def.ammo)) {
      this.audio.sfx('dryfire');
      p.spendCooldown(0.3);
      this.ui.toast(`Sem munição de ${def.name}!`, 1.5);
      return;
    }

    if (!this.infiniteAmmo) this.removeItem(def.ammo, 1);
    this.updateAmmoHud();
    p.spendCooldown(w.rate);
    this.audio.sfx(w.sfx || 'pistol');
    this.flashVal = 0.35;
    this.camShake = Math.min(1.2, this.camShake + w.kick);

    // Efeito de boca de fogo
    const muz = p.muzzleWorld();
    this.particles.burst(muz.x, muz.y, muz.z, 6, 'spark');

    // Explosão do Lança-Granadas
    if (w.aoe) {
      const aimTarget = this.autoTarget();
      const tx = aimTarget ? aimTarget.x : p.x + dirX * 6;
      const tz = aimTarget ? aimTarget.z : p.z + dirZ * 6;
      this.particles.burst(tx, 1.0, tz, 30, 'blood');
      this.particles.burst(tx, 1.2, tz, 25, 'spark');
      this.flashBoost = 0.5;

      for (const e of this.enemies) {
        if (!e.alive) continue;
        const d = Math.hypot(e.x - tx, e.z - tz);
        if (d <= w.aoe) {
          const dmg = Math.round(w.dmg * (1 - d / (w.aoe * 1.3)));
          const died = e.damage(dmg, (e.x - tx) / (d || 1), (e.z - tz) / (d || 1));
          if (died) this.onEnemyDead(e);
        }
      }
      return;
    }

    // Tiros diretos (Pistola, Revólver, Espingarda, Magnum)
    const target = this.autoTarget();
    if (target) {
      const dx = target.x - p.x, dz = target.z - p.z;
      const dist = Math.hypot(dx, dz);
      let dmg = w.dmg;
      if (w.falloff && dist > 4) dmg = Math.max(15, Math.round(w.dmg * (1 - (dist - 4) / 7)));

      const died = target.damage(dmg, dx / (dist || 1), dz / (dist || 1));
      const cp = target.chestPos();
      this.particles.burst(cp.x, cp.y, cp.z, w.pierce ? 24 : 12, 'blood');
      this.audio.sfx('hitFlesh');
      if (died) this.onEnemyDead(target);
    } else {
      this.particles.burst(p.x + dirX * 8, 1.2, p.z + dirZ * 8, 4, 'spark');
      this.audio.sfx('hitWall');
    }
  }

  onEnemyDead(e) {
    this.kills++;
    this.audio.sfx('enemyDie');
    this.roomState(this.room.id).deadSpawns.add(e.spawnIdx);

    const pts = e.cfg.points || 50;
    this.addPoints(pts);

    // Sistema de Mercenários: combos e tempo extra
    if (this.gameMode === 'mercenaries') {
      this.mercTimer += e.cfg.boss ? 30 : 6;
      this.mercCombo++;
      this.mercComboTimer = 5.0;
      this.mercScore += pts * this.mercCombo;
      this.ui.toast(`+${e.cfg.boss ? 30 : 6}s! Combo x${this.mercCombo}`, 1.5);
    }

    // Queda de munição ocasional (35% de chance)
    if (Math.random() < 0.35 && !this.room.pickups.some((p) => Math.hypot(p.x - e.x, p.z - e.z) < 1.0)) {
      const dropItem = this.currentCampaign === 'clara' ? 'ammo38' : 'ammo9';
      const pk = {
        uid: 'drop_' + Date.now(),
        item: dropItem,
        qty: 6,
        x: e.x, y: 0.1, z: e.z,
        taken: false, phase: 0,
        mesh: makePickupMesh(this.THREE, this.TEX, dropItem, null),
      };
      pk.mesh.position.set(e.x, 0.1, e.z);
      this.room.group.add(pk.mesh);
      this.room.pickups.push(pk);
    }

    if (e.cfg.boss) this.onBossDead();
  }

  damagePlayer(n, fromX, fromZ) {
    const p = this.player;
    const ok = p.damage(n);
    if (!ok) return;

    this.dmgVal = 0.9;
    this.camShake = 0.6;
    this.audio.sfx('playerHurt');

    const cp = p.muzzleWorld(new this.THREE.Vector3());
    this.particles.burst(p.x, 1.2, p.z, 14, 'blood');
    this.ui.hp(p.hp);

    const dx = p.x - fromX, dz = p.z - fromZ;
    const dist = Math.hypot(dx, dz);
    if (dist > 0.001) {
      p.group.position.x += (dx / dist) * 0.35;
      p.group.position.z += (dz / dist) * 0.35;
      collideCircle(p.group.position, 0.38, this.room.solids);
    }
  }

  // ==================== CANDIDATOS A INTERAÇÃO ====================
  currentCandidate() {
    const p = this.player;
    // 1. Totens de tempo dos Mercenários
    for (const t of this.totems) {
      if (t.alive && Math.hypot(t.group.position.x - p.x, t.group.position.z - p.z) < 1.6) {
        return { kind: 'totem', ref: t };
      }
    }
    // 2. Pickups
    for (const pk of this.room.pickups) {
      if (pk.taken) continue;
      if (Math.hypot(pk.x - p.x, pk.z - p.z) < 1.35) return { kind: 'pickup', ref: pk };
    }
    // 3. Portas
    for (const d of this.room.doors) {
      if (Math.hypot(d.x - p.x, d.z - p.z) < d.r) return { kind: 'door', ref: d };
    }
    // 4. Interações
    for (const it of this.room.interacts) {
      if (it.when && !it.when(this.flags)) continue;
      if (Math.hypot(it.x - p.x, it.z - p.z) < it.r) return { kind: 'act', ref: it };
    }
    return null;
  }

  doPromptAction() {
    const c = this.currentCandidate();
    if (!c) return;
    if (c.kind === 'totem') {
      const bonus = c.ref.smash();
      this.mercTimer += bonus;
      this.audio.sfx('totem');
      this.ui.toast(`💎 +${bonus} SEGUNDOS!`, 2.5);
    } else if (c.kind === 'pickup') {
      this.pickupAt(c.ref);
    } else if (c.kind === 'door') {
      this.useDoor(c.ref);
    } else if (c.kind === 'act') {
      this.doAct(c.ref.act);
    }
  }

  // ==================== LAÇO PRINCIPAL (FRAME) ====================
  frame() {
    const dt = Math.min(0.1, this.clock.getDelta());
    const st = this.state;

    if (st === 'play') {
      this.timeSec += dt;
      this.updatePlay(dt);
      if (this.gameMode === 'mercenaries') this.updateMercenaries(dt);
      else if (this.gameMode === 'survivor') this.updateSurvivor(dt);
    } else if (st === 'title') {
      this.updateTitleCam(dt);
      if (this.room && this.room.fx) this.room.fx(dt, this.clock.elapsedTime, this);
    } else if (st === 'ending') {
      this.selectCam();
      if (this.room && this.room.fx) this.room.fx(dt, this.clock.elapsedTime, this);
      if (this.endingPhase === 1) {
        this.whiteVal = Math.min(1, this.whiteVal + dt * 0.5);
        if (this.whiteVal >= 1) this.finishEnding();
      }
    } else {
      this.selectCam();
      if (this.room && this.room.fx) this.room.fx(dt, this.clock.elapsedTime, this);
    }

    // Efeitos globais de PS1
    this.fadeVal += (this.fadeTarget - this.fadeVal) * Math.min(1, dt * 2.2);
    this.psx.setFade(this.fadeVal);

    this.dmgVal = Math.max(0, this.dmgVal - dt * 1.4);
    const lowHp = this.player.hp <= 33 && this.player.hp > 0 && this.player.group.visible;
    const pulse = lowHp ? 0.3 + Math.sin(performance.now() / 350) * 0.12 : 0;
    this.psx.setDamage(Math.max(this.dmgVal, pulse));

    this.flashVal = Math.max(0, this.flashVal - dt * 3);
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
    this.lantern.intensity = this.player.group.visible ? 8 : 0;
    this.psx.render(this.scene, this.camera, dt);
  }

  updateTitleCam(dt) {
    this.titleAngle += dt * 0.05;
    const r = 14;
    this.camera.position.set(
      Math.sin(this.titleAngle) * r,
      3.2 + Math.sin(this.titleAngle * 2) * 0.6,
      Math.cos(this.titleAngle) * r + 2
    );
    this.camera.lookAt(0, 1.4, 0);
  }

  updatePlay(dt) {
    const p = this.player;

    if (p.dead) {
      this.deathT += dt;
      p.dieAnim(dt);
      this.dmgVal = Math.max(this.dmgVal, 0.7);
      if (this.deathT > 1.8 && this.state === 'play') {
        this.state = 'gameover';
        this.audio.sfx('gameover');
        this.audio.stopMusic();
        this.audio.heartbeat(false);
        this.fadeTarget = 0.4;
        this.ui.showGameOver();
      }
      return;
    }

    // Mira e movimentação
    const aiming = this.aimHeld();
    p.setAim(aiming);
    this.ui.crosshair(aiming);

    const ev = p.update(dt, this.moveInput(), this.room);
    if (ev.step) this.audio.sfx(ev.run ? 'stepRun' : 'step');

    // Inimigos
    for (const e of this.enemies) {
      const eEv = e.update(dt, p, this.room);
      if (eEv === 'hit') {
        this.damagePlayer(e.cfg.dmg, e.x, e.z);
      } else if (eEv === 'slam') {
        this.camShake = 0.7;
        this.particles.burst(e.x, 0.2, e.z, 20, 'dark');
      } else if (eEv === 'growl') {
        if (e.cfg.brute) this.audio.sfx('growlBrute');
        else if (e.cfg.hound) this.audio.sfx('dogBark');
        else if (e.cfg.crawler) this.audio.sfx('crawlerHiss');
        else this.audio.sfx('enemyGrowl');
      }
    }

    // NPCs (atualizam direção do olhar)
    for (const npc of this.npcs) npc.update(dt, p);

    // Totens
    for (const t of this.totems) t.update(dt);

    // Mira automática / alvo
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

    // Câmera & Lanterna
    this.selectCam();
    this.lantern.position.set(p.x, 1.7, p.z);

    // Pickups flutuando
    const t = this.clock.elapsedTime;
    for (const pk of this.room.pickups) {
      if (pk.taken) continue;
      pk.mesh.rotation.y += dt * 1.5;
      pk.mesh.position.y = pk.y + Math.sin(t * 2 + pk.phase) * 0.05;
    }

    if (this.room.fx) this.room.fx(dt, t, this);

    // Prompts contextuais
    const c = this.currentCandidate();
    if (!c) this.ui.prompt(null);
    else if (c.kind === 'totem') this.ui.prompt('<b>E</b> — Quebrar Cristal (+30s)');
    else if (c.kind === 'door') this.ui.prompt(`<b>E</b> — ${c.ref.label}`);
    else if (c.kind === 'act') this.ui.prompt(`<b>E</b> — ${c.ref.prompt}`);
    else if (c.kind === 'pickup') {
      const it = ITEMS[c.ref.item];
      const extra = c.ref.item === 'page' ? ` (Pág. ${this.flags.pages.filter(Boolean).length + 1}/8)` : c.ref.qty > 1 ? ` x${c.ref.qty}` : '';
      this.ui.prompt(`<b>E</b> — Pegar ${it.icon} ${it.name}${extra}`);
    }

    // Barra de chefe
    if (this.boss && this.boss.alive) {
      this.ui.boss(this.boss.cfg.name, this.boss.hp / this.boss.maxhp);
    }
  }

  updateMercenaries(dt) {
    this.mercTimer = Math.max(0, this.mercTimer - dt);
    if (this.mercComboTimer > 0) {
      this.mercComboTimer -= dt;
      if (this.mercComboTimer <= 0) this.mercCombo = 0;
    }

    const min = String(Math.floor(this.mercTimer / 60)).padStart(2, '0');
    const sec = String(Math.floor(this.mercTimer % 60)).padStart(2, '0');
    this.ui.extraHud(`${min}:${sec}`, this.mercScore, this.mercCombo);

    // Fim de tempo nos Mercenários
    if (this.mercTimer <= 0) {
      this.state = 'gameover';
      const rank = rankForMercenaries(this.mercScore);
      const earned = Math.round(this.mercScore * 0.25);
      this.addPoints(earned);

      if (this.mercScore > (this.hiscores.mercenaries || 0)) {
        this.hiscores.mercenaries = this.mercScore;
        localStorage.setItem(HISCORES_KEY, JSON.stringify(this.hiscores));
      }

      this.say([
        { who: 'n', text: `TEMPO ESGOTADO! Pontuação Final: ${this.mercScore.toLocaleString()} PTS.` },
        { who: 'n', text: `RANK OBTIDO: ${rank}! Você ganhou +${earned} Pontos para a Loja!` },
      ], () => this.toTitle());
    }
  }

  updateSurvivor(dt) {
    const aliveEnemies = this.enemies.filter((e) => e.alive).length;
    this.ui.extraHud(`ONDA ${this.survivorWave}`, this.kills * 100, aliveEnemies);

    // Se eliminou todos da onda atual
    if (aliveEnemies === 0 && this.state === 'play') {
      this.survivorWave++;
      const bonus = this.survivorWave * 150;
      this.addPoints(bonus);
      this.audio.sfx('memorial');

      // Drop de cura
      const p = this.player;
      this.addItem('pills', 1);
      this.addItem(this.currentCampaign === 'clara' ? 'ammo38' : 'ammo9', 15);
      this.updateAmmoHud();

      this.ui.toast(`🎉 ONDA ${this.survivorWave - 1} CONCLUÍDA! (+${bonus} Pts • Recursos Reabastecidos)`, 3.5);
      setTimeout(() => this.spawnSurvivorWave(), 3000);
    }
  }

  formattedTime() { return fmtTime(this.timeSec); }
}
