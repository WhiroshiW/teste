// ============================================================
// SANTA LÚCIA - Game: laço principal, campanhas cruzadas,
// câmera livre 3ª pessoa & clássica PS1, Mercenários, Sobrevivente,
// loja de pontos, puzzles, combate e cutscenes.
// Desenvolvido por Equipe Nakamura
// ============================================================
import {
  ITEMS, WEAPONS, ENEMIES, CAMPAIGNS, SHOP_ITEMS, GALLERY_MODELS,
  rankFor, rankForMercenaries, fmtTime, healthStatus,
  SAVE_KEY, POINTS_KEY, UNLOCKS_KEY, HISCORES_KEY, OPTS_KEY
} from './config.js';
import { buildTextures } from './textures.js';
import { buildRoom, ROOM_IDS, makePickupMesh } from './world.js';
import { Player, Enemy, NPC, TimeTotem, Particles, collideCircle, pointInSolids } from './entities.js';
import { AudioSys } from './audio.js';
import { createPSX } from './psx.js';
import { UI } from './ui.js';
import { GamepadManager } from './gamepad.js';
import {
  INTRO, INTRO_CLARA, INTRO_BENTO, D, OBJECTIVES,
  END_GOOD, END_NORMAL, END_CLARA_GOOD, END_CLARA_NORMAL, END_BENTO
} from './story.js';

export class Game {
  constructor(THREE, container) {
    this.THREE = THREE;
    this.container = container;
    try {
      this.renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'default' });
    } catch (e) {
      try {
        this.renderer = new THREE.WebGLRenderer({ antialias: false });
      } catch (e2) {
        this.renderer = {
          domElement: document.createElement('canvas'),
          setPixelRatio() {},
          setSize() {},
          setAnimationLoop() {},
          render() {},
        };
      }
    }
    this.renderer.setPixelRatio(1);
    const initW = container.clientWidth || window.innerWidth || 320;
    const initH = container.clientHeight || window.innerHeight || 240;
    this.renderer.setSize(initW, initH, false);
    this.renderer.domElement.id = 'gl';
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000000);
    this.camera = new THREE.PerspectiveCamera(60, 16 / 9, 0.1, 140);

    // Iluminação refinada: mais clara, legível e atmosférica
    this.ambLight = new THREE.AmbientLight(0xffffff, 0.85);
    this.scene.add(this.ambLight);
    this.hemiLight = new THREE.HemisphereLight(0xe8f0ff, 0x33283a, 0.65);
    this.scene.add(this.hemiLight);

    // Lanterna com facho mais amplo e potente
    this.lantern = new THREE.PointLight(0xfffaed, 14, 22, 1.8);
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

    // Limpeza de qualquer save antigo legado
    ['[SECURITY_DATA]', 'ecos_vazio_points', 'ecos_vazio_unlocks', 'ecos_vazio_scores', 'ecoVazioOpts', 'santa_lucia_save'].forEach((k) => {
      try { localStorage.removeItem(k); } catch (e) { /* noop */ }
    });

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
      const o = JSON.parse(localStorage.getItem(OPTS_KEY) || '{}');
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
    this.gamepad = new GamepadManager(this);
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

    // Cenário inicial do título: diorama 3D atmosférico do sanatório sob tempestade
    this.loadRoom('title_diorama', 0, 0, 0, { backdrop: true });
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
      this.saveOpts();
    }
  }

  // ==================== CÂMERA ALTERNÁVEL ====================
  toggleCamMode() {
    this.camMode = this.camMode === 'fixed' ? 'chase' : 'fixed';
    this.opts.cam = this.camMode;
    this.saveOpts();
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
      localStorage.setItem(OPTS_KEY, JSON.stringify(this.opts));
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
    const val = level === 'normal' ? 1.25 : level === 'max' ? 1.95 : 1.55;
    this.psx.setBrightness(val);
    this.ambLight.intensity = level === 'normal' ? 0.65 : level === 'max' ? 1.15 : 0.85;
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
    if (this.particles) this.particles.clear();
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
      consultOpen: false, poraoOpen: false, fuseOn: false, hasFuse: false,
      crank: false, valveOpen: false, safeOpened: false, safeEasterEgg: false,
      memorialOpen: false, bossDead: false, vase: false, forestUnlocked: false,
      chapelEncounterMet: false, claraDossierGot: false, luciaLocketGot: false,
      hasForestKey: false,
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
    const gp = this.gamepad ? this.gamepad.getMoveInput() : { f: false, b: false, l: false, r: false, run: false };
    return {
      f: k.has('KeyW') || k.has('ArrowUp') || t.f || gp.f,
      b: k.has('KeyS') || k.has('ArrowDown') || t.b || gp.b,
      l: k.has('KeyA') || k.has('ArrowLeft') || t.l || gp.l,
      r: k.has('KeyD') || k.has('ArrowRight') || t.r || gp.r,
      run: k.has('ShiftLeft') || k.has('ShiftRight') || t.run || gp.run,
    };
  }

  aimHeld() {
    if (this.keys.has('Space') || this.touch.aim) return true;
    if (this.gamepad) {
      const pad = this.gamepad.getPad();
      if (pad) {
        const btns = pad.buttons;
        return (btns[6] && btns[6].pressed) || (btns[4] && btns[4].pressed) || (btns[6] && btns[6].value > 0.25);
      }
    }
    return false;
  }

  onKey(code) {
    const st = this.state;

    // Alternar câmera rapidamente em tempo de jogo com V ou C
    if ((code === 'KeyV' || code === 'KeyC') && (st === 'play' || st === 'inventory')) {
      this.toggleCamMode();
      return;
    }

    if (st === 'intro_cutscene') {
      if (code === 'Enter' || code === 'Space' || code === 'KeyE' || code === 'Escape') {
        this.skipIntroCinematic();
        return;
      }
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
    if (this.state === 'intro_cutscene') this.skipIntroCinematic();
    else if (this.state === 'play' && this.aimHeld()) this.tryFire();
    else if (this.state === 'dialog' || this.state === 'intro' || this.state === 'cutscene') this.ui.advanceDialog();
    else if (this.state === 'banner') this.closeBanner();
  }

  touchFire() { if (this.state === 'play' && this.aimHeld()) this.tryFire(); }
  touchAct() {
    if (this.state === 'intro_cutscene') this.skipIntroCinematic();
    else if (this.state === 'play') this.doPromptAction();
    else if (this.state === 'dialog' || this.state === 'intro' || this.state === 'cutscene') this.ui.advanceDialog();
    else if (this.state === 'banner') this.closeBanner();
  }
  touchInv() {
    if (this.state === 'play') this.openInventory();
    else if (this.state === 'inventory') this.closeInventory();
  }

  // ==================== AÇÕES DE MENU (NOVO MENU 4 OPÇÕES) ====================
  titleAction(act) {
    if (act === 'play' || act === 'new') {
      this.ui.hideTitle();
      this.ui.showCampaignSelect();
    } else if (act === 'load' || act === 'continue') {
      if (this.hasSave()) {
        this.ui.hideTitle();
        this.continueGame();
      } else {
        this.audio.sfx('dryfire');
        this.ui.toast('• Nenhum prontuário médico registrado no Diário.', 3);
        this.ui.showTitle(false);
      }
    } else if (act === 'extras' || act === 'shop') {
      this.ui.hideTitle();
      this.ui.showShop(this.points, this.unlocks);
    } else if (act === 'options') {
      this.ui.hideTitle();
      this.optionsFrom = 'title';
      this.ui.showOptions();
    } else if (act === 'intro') {
      this.ui.hideTitle();
      this.playIntroCinematic(() => this.toTitle());
    } else if (act === 'help') {
      this.ui.hideTitle();
      this.helpFrom = 'title';
      this.ui.showHelp();
    }
  }

  // ==================== INTRO CINEMATOGRÁFICA DO SANATÓRIO ====================
  playIntroCinematic(onFinish) {
    this.state = 'intro_cutscene';
    this.introCallback = onFinish || (() => this.toTitle());
    this.ui.hideAllOverlays();
    this.ui.showIntroCutscene();
    this.loadRoom('title_diorama', 0, 0, 0, { backdrop: true });
    this.audio.music('ambient');
    this.introTimer = 0;
    this.introPhase = 0;
    this.introDone = false;
  }

  skipIntroCinematic() {
    if (this.introDone) return;
    this.introDone = true;
    this.ui.hideIntroCutscene();
    if (this.introCallback) {
      const cb = this.introCallback;
      this.introCallback = null;
      cb();
    } else {
      this.toTitle();
    }
  }

  updateIntroCinematic(dt) {
    if (this.introDone) return;
    this.introTimer += dt;
    const t = this.introTimer;

    // Tomada 1: (0s - 4.5s) - Close na janela gótica com chuva e tempestade
    if (t < 4.5) {
      if (this.introPhase !== 1) {
        this.introPhase = 1;
        this.ui.setIntroSubtitle(
          'SERRA DA MANTIQUEIRA · OUTUBRO DE 1997',
          'As portas do Sanatório Santa Lúcia foram lacradas há dez anos... isolando a loucura e as mortes não explicadas.'
        );
      }
      const p = t / 4.5;
      this.camera.position.set(0, 2.3 + Math.sin(t * 1.2) * 0.05, -3.2 - p * 0.4);
      this.camera.lookAt(0, 2.2, -4.95);
    }
    // Tomada 2: (4.5s - 9.0s) - Descida suave focando o prontuário de Lúcia e a foto
    else if (t < 9.0) {
      if (this.introPhase !== 2) {
        this.introPhase = 2;
        this.ui.setIntroSubtitle(
          'DUAS JORNADAS CRUZADAS',
          'Daniel Silva procura respostas para o suicídio forjado de sua irmã Lúcia. Dra. Clara Mendes busca desmascarar os experimentos clandestinos de seu mentor.'
        );
      }
      const p = (t - 4.5) / 4.5;
      this.camera.position.set(
        0.35 - p * 0.15,
        1.55 - p * 0.18,
        -1.1 - p * 0.2
      );
      this.camera.lookAt(0.1, 1.02, -1.65);
    }
    // Tomada 3: (9.0s - 13.5s) - Foco na vela acesa, crucifixo e frascos
    else if (t < 13.5) {
      if (this.introPhase !== 3) {
        this.introPhase = 3;
        this.ui.setIntroSubtitle(
          'OS ECOS DA CULPA',
          'Nesta madrugada fria, seus caminhos convergem para o mesmo abismo. A dor da perda tomou forma na escuridão.'
        );
      }
      const p = (t - 9.0) / 4.5;
      this.camera.position.set(
        -0.45 - p * 0.1,
        1.52 + Math.sin(t * 1.5) * 0.03,
        -1.15 - p * 0.15
      );
      this.camera.lookAt(-0.55, 1.42, -1.6);
    }
    // Tomada 4: (13.5s - 17.0s) - Recuo dramático para plano geral e revelação do título
    else if (t < 17.0) {
      if (this.introPhase !== 4) {
        this.introPhase = 4;
        this.ui.setIntroSubtitle(
          'EQUIPE NAKAMURA APRESENTA',
          '<strong style="color:#c81e1e; font-size:1.4em; letter-spacing:8px;">SANTA LÚCIA</strong>'
        );
        this.audio.sfx('thunder');
        this.flashBoost = 0.6;
      }
      const p = (t - 13.5) / 3.5;
      this.camera.position.set(
        -0.45 + p * 0.3,
        1.6 + p * 0.2,
        -0.5 + p * 0.5
      );
      this.camera.lookAt(-0.15, 1.2, -1.8);
    }
    // Final da cutscene
    else {
      this.skipIntroCinematic();
    }
  }

  // ==================== CUTSCENES EM MOMENTOS CHAVE ====================
  startChapelCutscene(r, companion) {
    this.flags.chapelEncounterMet = true;
    this.state = 'cutscene';
    this.cutsceneTimer = 0;
    this.cutsceneMode = 'chapel';
    this.player.setAim(false);
    this.ui.crosshair(false);
    this.ui.target(0, 0, false);

    // Câmera dramática de introdução do encontro (plano baixo entre os bancos)
    this.camera.position.set(2.2, 0.85, -1.2);
    this.camera.lookAt(0, 1.25, -3.5);

    const dialogue = this.currentCampaign === 'daniel' ? D.encontro_daniel : D.encontro_clara;
    setTimeout(() => {
      this.say(dialogue, () => {
        this.addItem('forest_key', 1);
        this.showBanner('forest_key');
        this.addPoints(200, 'Encontro Revelador na Capela');
        this.state = 'play';
        this.selectCam(true);
      });
    }, 400);
  }

  startMemorialCutscene() {
    this.flags.memorialOpen = true;
    this.state = 'cutscene';
    this.cutsceneTimer = 0;
    this.cutsceneMode = 'memorial';
    this.player.setAim(false);
    this.ui.crosshair(false);
    this.ui.target(0, 0, false);

    this.audio.sfx('memorial');
    this.flashBoost = 0.8;
    this.camShake = 1.2;

    this.camera.position.set(0, 1.6, 3.8);
    this.camera.lookAt(0, 1.4, 0);

    setTimeout(() => {
      this.audio.sfx('thunder');
      this.audio.sfx('bossRoar');
      this.spawnBossActors();
      this.say(D.memorial_ok, () => {
        this.state = 'play';
        this.checkObjective();
        this.selectCam(true);
      });
    }, 1200);
  }

  startBoilerBossCutscene(boss) {
    this.state = 'cutscene';
    this.cutsceneTimer = 0;
    this.cutsceneMode = 'boiler';
    this.player.setAim(false);
    this.ui.crosshair(false);
    this.ui.target(0, 0, false);

    this.camera.position.set(0, 0.6, 4.0);
    this.camera.lookAt(0, 1.6, 0);
    this.flashBoost = 0.5;
    this.audio.sfx('bossRoar');

    const lines = [
      { who: 'n', text: 'O vapor das caldeiras silva alto... As correntes de ferro tremem sob a névoa.' },
      { who: 'clara', text: 'Alencastro... o que você fez com seu próprio corpo?!' },
      { who: 'vulto', text: 'O VAZIO... FINALMENTE... ME PREENCHEU!' },
    ];

    setTimeout(() => {
      this.say(lines, () => {
        this.state = 'play';
        this.selectCam(true);
      });
    }, 800);
  }

  updateCutsceneCam(dt) {
    this.cutsceneTimer += dt;
    const t = this.cutsceneTimer;

    if (this.cutsceneMode === 'chapel') {
      this.camera.position.set(
        2.2 + Math.sin(t * 0.8) * 0.15,
        0.85 + Math.cos(t * 0.6) * 0.05,
        -1.2 + Math.sin(t * 0.5) * 0.1
      );
      this.camera.lookAt(0, 1.25, -3.5);
    } else if (this.cutsceneMode === 'memorial') {
      const r = 3.6 - Math.min(1.0, t * 0.3);
      const angle = t * 0.45;
      this.camera.position.set(
        Math.sin(angle) * r,
        1.6 + Math.min(1.8, t * 0.5),
        Math.cos(angle) * r
      );
      this.camera.lookAt(0, 1.4, 0);
    } else if (this.cutsceneMode === 'boiler') {
      this.camera.position.set(
        Math.sin(t * 0.7) * 0.3,
        0.6 + Math.min(1.2, t * 0.4),
        4.0 - Math.min(1.0, t * 0.3)
      );
      this.camera.lookAt(0, 1.6, 0);
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
    this.loadRoom('title_diorama', 0, 0, 0, { backdrop: true });
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
    if (this.particles) this.particles.clear();
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

    // Persistência de drenagem do porão (a água não volta se a válvula já foi aberta)
    if (id === 'porao' && this.flags.valveOpen) {
      r.solids = r.solids.filter((s) => s.tag !== 'water');
      if (r.waterMesh) r.waterMesh.visible = false;
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
    const validX = Number.isFinite(sx) ? sx : 0;
    const validZ = Number.isFinite(sz) ? sz : 0;
    const validAngle = Number.isFinite(angle) ? angle : 0;

    this.player.place(validX, validZ, validAngle);
    if (!opts.backdrop) {
      this.player.group.visible = true;
      this.player.group.position.y = 0;
      this.player.moving = false;
      this.lantern.position.set(validX, 1.7, validZ);
      this.lantern.intensity = 14;
    } else {
      this.player.group.visible = false;
      this.lantern.intensity = 0;
    }

    // Chase Cam posicionada sempre DENTRO da sala e sem colidir com paredes externas
    const hw = Math.max(2, (r.w || 16) / 2 - 0.9);
    const hd = Math.max(2, (r.d || 12) / 2 - 0.9);
    const idealDist = 2.8;
    let cx = validX - Math.sin(validAngle) * idealDist;
    let cz = validZ - Math.cos(validAngle) * idealDist;
    cx = Math.max(-hw, Math.min(hw, cx));
    cz = Math.max(-hd, Math.min(hd, cz));
    this.chaseCamPos.set(cx, 1.95, cz);
    collideCircle(this.chaseCamPos, 0.45, r.solids);

    // Cutscene do encontro de Daniel & Clara na Capela
    if (id === 'capela' && !this.flags.chapelEncounterMet && !opts.backdrop && this.gameMode === 'story') {
      const npcWho = this.currentCampaign === 'daniel' ? 'clara' : 'daniel';
      const companion = new NPC(this.THREE, this.TEX, npcWho, 0, -3.5, Math.PI);
      companion.addTo(r.group);
      this.npcs.push(companion);
      this.startChapelCutscene(r, companion);
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
      this.startBoilerBossCutscene(boss);
    }

    const ROOM_SUBS = {
      quarto: 'ALA DE INTERNAÇÃO · PISO 1',
      corredor_quartos: 'ALA OESTE · CORREDOR DOS DORMITÓRIOS',
      quarto2: 'ALA PRIVADA · SALA DO COFRE',
      saguao: 'HALL PRINCIPAL · RECEPÇÃO',
      estufa: 'SETOR SUL · ESTUFA BOTÂNICA',
      cemiterio: 'PÁTIO NORTE · LÁPIDES DOS FUNDADORES',
      jardim: 'SETOR LESTE · PÁTIO, ESTACIONAMENTO & CANIL',
      casa_zelador: 'CABANA DE SERVIÇO DE BENTO',
      mezanino: 'MEZANINO SUPERIOR · PISO 2',
      enfermaria: 'ALA MÉDICA CLÍNICA · PISO 2',
      consultorio: 'ESCRITÓRIO MÉDICO DO DR. ALENCASTRO',
      porao: 'SUBTERRÂNEO · ÁREA DAS CALDEIRAS',
      corredor_p3: 'ALA SUPERIOR · CORREDOR P3',
      sala_dr_p3: 'LABORATÓRIO CONFIDENCIAL DO DIRETOR',
      terraco: 'COBERTURA · HELIPONTO DE RESGATE',
      subsolo_corredor: 'CATACUMBAS SUBTERRÂNEAS · TÚNEIS',
      culto: 'SANTUÁRIO OCULTO · ALTAR PROFANO',
      experimentos: 'LABORATÓRIO DE EXPERIMENTOS HUMANOS',
      floresta: 'JARDINS EXTERNOS & CEMITÉRIO',
      capela: 'SANTUÁRIO ESQUECIDO',
    };

    if (!opts.backdrop) {
      this.ui.room(r.name, ROOM_SUBS[id] || 'SANATÓRIO SANTA LÚCIA');
      if (r.music) this.audio.music(r.music);
      else if (r.ambient) this.audio.ambient(r.ambient);
    }

    this.curCam = null;
    this.curCamLook = null;
    this.selectCam(true);
  }

  // ==================== CÂMERAS ====================
  selectCam(snap = false) {
    const p = this.player;
    if (!this.room) return;

    const px = Number.isFinite(p.x) ? p.x : 0;
    const pz = Number.isFinite(p.z) ? p.z : 0;
    const pAngle = Number.isFinite(p.angle) ? p.angle : 0;

    // Modo 3ª pessoa over-the-shoulder (estilo GTA / livre)
    if (this.camMode === 'chase' && this.state !== 'title') {
      const dist = 3.0;
      const hw = Math.max(2, (this.room.w || 16) / 2 - 0.7);
      const hd = Math.max(2, (this.room.d || 12) / 2 - 0.7);
      const targetX = Math.max(-hw, Math.min(hw, px - Math.sin(pAngle) * dist));
      const targetZ = Math.max(-hd, Math.min(hd, pz - Math.cos(pAngle) * dist));
      const targetY = 1.95;

      const rate = snap ? 1 : 0.18;
      if (!Number.isFinite(this.chaseCamPos.x)) this.chaseCamPos.x = targetX;
      if (!Number.isFinite(this.chaseCamPos.y)) this.chaseCamPos.y = targetY;
      if (!Number.isFinite(this.chaseCamPos.z)) this.chaseCamPos.z = targetZ;

      this.chaseCamPos.x += (targetX - this.chaseCamPos.x) * rate;
      this.chaseCamPos.z += (targetZ - this.chaseCamPos.z) * rate;
      this.chaseCamPos.y += (targetY - this.chaseCamPos.y) * rate;

      // Clamping rígido dentro das paredes
      this.chaseCamPos.x = Math.max(-hw, Math.min(hw, this.chaseCamPos.x));
      this.chaseCamPos.z = Math.max(-hd, Math.min(hd, this.chaseCamPos.z));

      // Impede atravessar paredes e sólidos
      collideCircle(this.chaseCamPos, 0.45, this.room.solids);

      const sh = 0.015 + this.dmgVal * 0.04 + this.camShake * 0.12;
      const t = performance.now() / 1000;
      this.camera.position.set(
        this.chaseCamPos.x + Math.sin(t * 1.8) * sh,
        this.chaseCamPos.y + Math.cos(t * 2.2) * sh * 0.5,
        this.chaseCamPos.z + Math.cos(t * 1.4) * sh
      );
      this.camera.lookAt(px + Math.sin(pAngle) * 1.2, 1.35, pz + Math.cos(pAngle) * 1.2);
      this.camShake = Math.max(0, this.camShake - 0.03);
      return;
    }

    // Modo Câmera Fixa (PS1 Clássico)
    if (!this.room.cams || this.room.cams.length === 0) return;

    let cam = this.room.cams[0];
    for (const c of this.room.cams) {
      const [x0, z0, x1, z1] = c.rect;
      if (px >= x0 && px <= x1 && pz >= z0 && pz <= z1) { cam = c; break; }
    }
    if (cam !== this.curCam || snap) {
      this.curCam = cam;
      this.camera.fov = cam.fov || 60;
      this.camera.updateProjectionMatrix();
    }

    const sh = 0.02 + this.dmgVal * 0.05 + this.camShake * 0.15;
    const t = performance.now() / 1000;
    this.camera.position.set(
      cam.pos[0] + Math.sin(t * 1.7) * sh + (Math.random() - 0.5) * this.camShake * 0.2,
      cam.pos[1] + Math.sin(t * 2.3) * sh * 0.6,
      cam.pos[2] + Math.cos(t * 1.3) * sh
    );

    // O enquadramento acompanha o tronco do jogador (y = 1.25), garantindo que
    // o personagem fique SEMPRE 100% visível na tela em qualquer porta e cômodo
    const tx = px, ty = 1.25, tz = pz;
    if (snap || !this.curCamLook || !Number.isFinite(this.curCamLook.x)) {
      this.curCamLook = new this.THREE.Vector3(tx, ty, tz);
    } else {
      this.curCamLook.x += (tx - this.curCamLook.x) * 0.18;
      this.curCamLook.y += (ty - this.curCamLook.y) * 0.18;
      this.curCamLook.z += (tz - this.curCamLook.z) * 0.18;
    }
    this.camera.lookAt(this.curCamLook.x, this.curCamLook.y, this.curCamLook.z);
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
    const txt = OBJECTIVES(this.flags, this.currentCampaign);
    this.currentObjText = txt;
    if (force) this.ui.toast('OBJETIVO: ' + txt, 4);
  }
  currentObjective() { return this.currentObjText || OBJECTIVES(this.flags, this.currentCampaign); }

  // ==================== INVENTÁRIO ====================
  countItem(id) {
    const it = this.inv.find((i) => i.item === id);
    return it ? it.qty : 0;
  }
  hasItem(id) { return this.countItem(id) > 0; }

  addItem(id, qty = 1) {
    const isStackable = ITEMS[id] && ITEMS[id].type !== 'weapon' && (ITEMS[id].type !== 'key' || id === 'frag');
    const ex = isStackable ? this.inv.find((i) => i.item === id) : null;
    if (ex) { ex.qty += qty; return; }
    if (this.inv.length >= 12) {
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

  combineItems(srcIdx, destIdx) {
    const src = this.inv[srcIdx];
    const dest = this.inv[destIdx];
    if (!src || !dest || src === dest) return;

    const sDef = ITEMS[src.item];
    const dDef = ITEMS[dest.item];
    if (!sDef || !dDef) return;

    // 1. Munição + Arma
    if (sDef.type === 'ammo' && dDef.type === 'weapon') {
      if (dDef.ammo === src.item) {
        this.equipWeapon(dest);
        this.audio.sfx('pickupKey');
        this.ui.toast(`⚙️ ${dDef.name} recarregada com ${sDef.name}!`, 3.5);
        this.updateAmmoHud();
        return;
      }
    } else if (sDef.type === 'weapon' && dDef.type === 'ammo') {
      if (sDef.ammo === dest.item) {
        this.equipWeapon(src);
        this.audio.sfx('pickupKey');
        this.ui.toast(`⚙️ ${sDef.name} recarregada com ${dDef.name}!`, 3.5);
        this.updateAmmoHud();
        return;
      }
    }

    // 2. Remédios ou Munições combinadas (empilhamento de mesmo tipo)
    if (src.item === dest.item && (sDef.type === 'heal' || sDef.type === 'ammo' || src.item === 'ribbon')) {
      dest.qty += src.qty;
      this.inv.splice(srcIdx, 1);
      this.audio.sfx('pickup');
      this.ui.toast(`📦 Doses de ${dDef.name} agrupadas no mesmo frasco (x${dest.qty}).`, 3);
      return;
    }

    this.audio.sfx('dryfire');
    this.ui.toast('Não é possível combinar estes dois itens.', 2.5);
  }

  updateAmmoHud() {
    const w = WEAPONS[this.equipped];
    const def = ITEMS[this.equipped];
    if (!w) {
      this.ui.ammo('', '', '', false);
      return;
    }
    if (!def.ammo) {
      this.ui.ammo(w.name, 'BRANCA', def.icon || '🔪', true);
    } else {
      const c = this.infiniteAmmo ? '∞' : this.countItem(def.ammo);
      this.ui.ammo(w.name, `${c} / ${this.infiniteAmmo ? '∞' : c}`, def.icon || '🔫', true);
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
      this.flags.safeEasterEgg = true;
      this.addItem('magnum_ammo', 6);
      this.addItem('lightflask', 1);
      this.addPoints(500, 'Easter Egg: Ano do PS1 Clássico');
      this.say([
        { who: 'n', text: 'O cofre destravou um compartimento secreto clássico!' },
        { who: 'n', text: '"Para os sobreviventes do terror de 1996. Vocês ainda se lembram da mansão."' },
        { who: 'n', text: 'Você encontrou BALAS MAGNUM e um FRASCO DE LUZ! O cofre principal com a chave ainda aguarda a combinação de 4 dígitos.' },
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
    const heroCfg = CAMPAIGNS[this.currentCampaign] || CAMPAIGNS.daniel;
    const roomTitle = this.room ? (this.room.name || this.room.id) : 'SAGUÃO';
    this.ui.showSaveBox({
      hero: heroCfg.name,
      room: roomTitle,
      saves: this.saves,
      time: this.formattedTime(),
      ribbons: this.countItem('ribbon'),
      infiniteInk: !!this.unlocks.infinite_ink,
    });
  }

  saveConfirm(yes) {
    if (!yes) {
      this.ui.hideSaveBox();
      this.state = 'play';
      return;
    }
    this.audio.sfx('typewriter');
    if (this.ui.el.saveStamp) {
      this.ui.show(this.ui.el.saveStamp);
    }
    if (!this.unlocks.infinite_ink) this.removeItem('ribbon', 1);
    this.doSave();
    setTimeout(() => {
      this.ui.hideSaveBox();
      this.state = 'play';
      this.ui.toast(`💾 Prontuário arquivado com sucesso no Sanatório. (${this.saves} registros)`, 4);
    }, 650);
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
    // 1. Se a porta já foi destrancada permanentemente por flag anterior
    if (door.setFlag && this.flags[door.setFlag]) {
      this.doorSequence(door);
      return;
    }

    if (door.need) {
      const isClara = this.currentCampaign === 'clara';
      const isBento = this.currentCampaign === 'bento';

      // Chave especial da Dra. Clara: cartão magnético destranca o consultório
      if (door.need.item === 'rustkey' && isClara && this.hasItem('clara_card')) {
        if (door.setFlag) this.flags[door.setFlag] = true;
        this.audio.sfx('puzzle');
        this.say([
          { who: 'clara', text: 'Aproximei meu Cartão Magnético Médico. A fechadura eletrônica liberou o consultório!' }
        ], () => {
          this.checkObjective();
          this.doorSequence(door);
        });
        return;
      }

      // Chave especial de Bento: chave mestra destranca o porão
      if (door.need.item === 'basekey' && isBento && this.hasItem('bento_key')) {
        if (door.setFlag) this.flags[door.setFlag] = true;
        this.audio.sfx('puzzle');
        this.say([
          { who: 'bento', text: 'Usei a Chave Mestra das saídas de emergência. A porta pesada do porão destrancou!' }
        ], () => {
          this.checkObjective();
          this.doorSequence(door);
        });
        return;
      }

      // Verificação de posse do item requerido
      if (door.need.item && !this.hasItem(door.need.item)) {
        this.say([{ who: 'n', text: door.msg || 'A porta está trancada.' }]);
        this.audio.sfx('dryfire');
        return;
      }

      // Verificação de flag (ex: elevador sem energia)
      if (door.need.flag && !this.flags[door.need.flag]) {
        if (door.msg === 'elevador_off') this.say(D.elevador_off);
        else this.say([{ who: 'n', text: door.msg || 'Não há energia.' }]);
        this.audio.sfx('dryfire');
        return;
      }

      // O jogador tem a chave requerida: destrancar com som e mensagem clássica
      const itDef = ITEMS[door.need.item];
      const keyName = itDef ? itDef.name : 'chave';

      if (door.consume && door.need.item) {
        this.removeItem(door.need.item, 1);
      }
      if (door.setFlag) {
        this.flags[door.setFlag] = true;
      }

      this.audio.sfx('puzzle');
      this.say([
        { who: 'n', text: `Você usou a ${keyName}. A fechadura estalou e a porta foi destrancada!` }
      ], () => {
        this.checkObjective();
        this.doorSequence(door);
      });
      return;
    }

    this.doorSequence(door);
  }

  doorSequence(door) {
    if (!door) return;
    this.state = 'door';
    this.keys.clear();
    this.player.setAim(false);
    this.ui.crosshair(false);
    this.ui.target(0, 0, false);
    this.audio.sfx('doorCreak');
    const rot = Number.isFinite(door.srot) ? door.srot : (Number.isFinite(door.sa) ? door.sa : 0);
    this.ui.doorAnim(door.elevator, () => {
      this.loadRoom(door.target, door.sx, door.sz, rot);
      this.player.group.visible = true;
      this.player.group.position.y = 0;
      this.player.moving = false;
      this.keys.clear();
      this.state = 'play';
      this.curCam = null;
      this.curCamLook = null;
      this.selectCam(true);
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
          this.checkObjective();
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

      // Novas Salas da Planta Remasterizada
      case 'greenhouse_bench': say(D.greenhouse_bench); break;
      case 'greenhouse_plants': say(D.greenhouse_plants); break;
      case 'mausoleum': say(D.mausoleum); break;
      case 'kennel': say(D.kennel); break;
      case 'bento_locker': say(D.bento_locker); break;
      case 'bento_radio': say(D.bento_radio); break;
      case 'elevator_p2': say(D.elevator_p2); break;
      case 'alencastro_desk_p3': say(D.alencastro_desk_p3); break;
      case 'alencastro_books_p3': say(D.alencastro_books_p3); break;
      case 'cult_altar': say(D.cult_altar); break;
      case 'exam_table': say(D.exam_table); break;
      case 'exam_sink': say(D.exam_sink); break;
      case 'bed2': say(D.bed2); break;
      case 'shelf2': say(D.shelf2); break;

      // Terraço & Finais
      case 'memorial': {
        const n = f.frags.filter(Boolean).length;
        if (f.memorialOpen) { this.ui.toast('O memorial arde em luz azul.', 3); break; }
        if (n < 4) { say(D.memorial_falta); break; }
        this.startMemorialCutscene();
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
    if (p.item === 'page') {
      p.taken = true;
      p.mesh.visible = false;
      this.roomState(this.room.id).takenPickups.add(p.uid);
      this.flags.pages[p.page] = true;
      this.audio.sfx('pickup');
      this.readPage(p.page);
      return;
    }

    const itDef = ITEMS[p.item];
    const canStack = itDef && itDef.type !== 'weapon' && (itDef.type !== 'key' || p.item === 'frag') && this.inv.some((i) => i.item === p.item);
    if (!canStack && this.inv.length >= 12) {
      this.ui.toast('Inventário cheio! Não é possível carregar mais itens.', 3);
      this.audio.sfx('dryfire');
      return;
    }

    p.taken = true;
    p.mesh.visible = false;
    this.roomState(this.room.id).takenPickups.add(p.uid);

    this.addItem(p.item, p.qty);
    if (p.item === 'fuse') this.flags.hasFuse = true;
    if (p.item === 'alencastro_dossier') this.flags.claraDossierGot = true;
    if (p.item === 'lucia_locket') this.flags.luciaLocketGot = true;
    if (p.item === 'forest_key') this.flags.hasForestKey = true;

    this.audio.sfx(itDef && itDef.type === 'key' ? 'pickupKey' : 'pickup');
    this.ui.toast(`Coletou: ${itDef ? itDef.icon : ''} ${itDef ? itDef.name : p.item}${p.qty > 1 ? ` x${p.qty}` : ''}`, 2.5);
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
    if (this.gamepad) this.gamepad.vibrate(0.4, 0.85, 180);

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
    if (this.gamepad) this.gamepad.vibrate(0.7, 1.0, 320);
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
    if (this.gamepad) this.gamepad.update(dt);
    const st = this.state;

    if (st === 'play') {
      this.timeSec += dt;
      this.updatePlay(dt);
      if (this.gameMode === 'mercenaries') this.updateMercenaries(dt);
      else if (this.gameMode === 'survivor') this.updateSurvivor(dt);
    } else if (st === 'intro_cutscene') {
      this.updateIntroCinematic(dt);
      if (this.room && this.room.fx) this.room.fx(dt, this.clock.elapsedTime, this);
    } else if (st === 'title') {
      this.updateTitleCam(dt);
      if (this.room && this.room.fx) this.room.fx(dt, this.clock.elapsedTime, this);
    } else if (st === 'cutscene') {
      this.updateCutsceneCam(dt);
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
    if (this.player && this.player.group && this.player.group.visible) {
      this.lantern.position.set(this.player.x, 1.7, this.player.z);
      this.lantern.intensity = 14;
    } else {
      this.lantern.intensity = 0;
    }
    this.psx.render(this.scene, this.camera, dt);
  }

  updateTitleCam(dt) {
    this.titleAngle += dt * 0.15;
    // Movimento orbital suave ao redor da mesa com a vela, dossiê e tempestade
    const cx = -0.45 + Math.sin(this.titleAngle * 0.4) * 0.35;
    const cy = 1.48 + Math.cos(this.titleAngle * 0.3) * 0.08;
    const cz = -0.55 + Math.cos(this.titleAngle * 0.35) * 0.25;
    this.camera.position.set(cx, cy, cz);
    this.camera.lookAt(-0.15, 1.15, -1.7);
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
    else if (c.kind === 'door') {
      const d = c.ref;
      let tag = '';
      if (d.setFlag && this.flags[d.setFlag]) {
        tag = ' <span style="color:#7dff8a;">[Destrancada]</span>';
      } else if (d.need) {
        if (d.need.item) {
          const hasKey = this.hasItem(d.need.item) ||
            (this.currentCampaign === 'clara' && d.need.item === 'rustkey' && this.hasItem('clara_card')) ||
            (this.currentCampaign === 'bento' && d.need.item === 'basekey' && this.hasItem('bento_key'));
          tag = hasKey
            ? ' <span style="color:#ffe970;">(Usar Chave)</span>'
            : ' <span style="color:#ff6b6b;">[Trancada]</span>';
        } else if (d.need.flag) {
          tag = this.flags[d.need.flag]
            ? ' <span style="color:#7dff8a;">[Energizado]</span>'
            : ' <span style="color:#ff6b6b;">[Sem Energia]</span>';
        }
      }
      this.ui.prompt(`<b>E</b> — ${d.label}${tag}`);
    }
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
