// ============================================================
// ECOS DO VAZIO - Interface: telas, HUD, inventário, diálogos, loja, extras
// ============================================================
import { ITEMS, WEAPONS, healthStatus, SHOP_ITEMS, GALLERY_MODELS, CAMPAIGNS } from './config.js';
import { HELP_ROWS as HH } from './story.js';
import { drawPortrait } from './textures.js';

const NAMES = {
  daniel: 'DANIEL', lucia: 'LÚCIA', clara: 'DRA. CLARA', bento: 'BENTO (ZELADOR)',
  alencastro: 'DR. ALENCASTRO', medico: 'DR. MATIAS', vulto: 'VULTO',
  radio: 'RÁDIO TRANSMISSOR', q: '???', n: '',
};

export class UI {
  constructor(game) {
    this.game = game;
    this.$ = (id) => document.getElementById(id);
    this.el = {
      title: this.$('title'), titleMenu: this.$('titleMenu'), titlePointsVal: this.$('titlePointsVal'),
      help: this.$('help'), helpRows: this.$('helpRows'),
      options: this.$('options'),
      hud: this.$('hud'), roomName: this.$('roomName'),
      hpText: this.$('hpText'), hpStatus: this.$('hpStatus'),
      ammoBox: this.$('ammoBox'), ammoText: this.$('ammoText'),
      prompt: this.$('prompt'), cross: this.$('cross'), target: this.$('target'),
      bossBar: this.$('bossBar'), bossName: this.$('bossName'), bossFill: this.$('bossFill'),
      toast: this.$('toast'),
      banner: this.$('banner'), bannerIcon: this.$('bannerIcon'),
      bannerName: this.$('bannerName'), bannerDesc: this.$('bannerDesc'),
      dialog: this.$('dialog'), dlgPortrait: this.$('dlgPortrait'),
      dlgName: this.$('dlgName'), dlgText: this.$('dlgText'),
      inv: this.$('inventory'), invGrid: this.$('invGrid'),
      invIcon: this.$('invIcon'), invName: this.$('invName'), invDesc: this.$('invDesc'),
      invCmds: this.$('invCmds'), invObjective: this.$('invObjective'),
      invPages: this.$('invPages'), invWeapon: this.$('invWeapon'), invTime: this.$('invTime'),
      invHeroName: this.$('invHeroName'),
      ecgCanvas: this.$('ecgCanvas'), ecgStatus: this.$('ecgStatus'), ecgBpm: this.$('ecgBpm'),
      introCutscene: this.$('introCutscene'), introYearTag: this.$('introYearTag'),
      introQuoteText: this.$('introQuoteText'), introSkipBtn: this.$('introSkipBtn'),
      safe: this.$('safe'), safeDigits: this.$('safeDigits'),
      saveBox: this.$('saveBox'),
      pause: this.$('pause'), pauseMenu: this.$('pauseMenu'),
      gameover: this.$('gameover'),
      ending: this.$('ending'), endTitle: this.$('endTitle'),
      endRank: this.$('endRank'), endStats: this.$('endStats'), endMsg: this.$('endMsg'),
      endPointsVal: this.$('endPointsVal'),
      door: this.$('door'), doorCanvas: this.$('doorCanvas'),
      touch: this.$('touch'),
      // Novas telas
      campaignSelect: this.$('campaignSelect'),
      extraModes: this.$('extraModes'),
      pointsShop: this.$('pointsShop'), shopPointsVal: this.$('shopPointsVal'), shopList: this.$('shopList'),
      modelViewer: this.$('modelViewer'), galleryCanvas: this.$('galleryCanvas'),
      gallerySelect: this.$('gallerySelect'), galleryName: this.$('galleryName'),
      gallerySub: this.$('gallerySub'), galleryBio: this.$('galleryBio'),
      scoreMercenaries: this.$('scoreMercenaries'), scoreSurvivor: this.$('scoreSurvivor'),
      extraHud: this.$('extraHud'), extraTimer: this.$('extraTimer'),
      extraScore: this.$('extraScore'), extraCombo: this.$('extraCombo'),
      hudCamBtn: this.$('hudCamBtn'), invCamSwitch: this.$('invCamSwitch'),
      optCam: this.$('optCam'), optBright: this.$('optBright'),
      optFilter: this.$('optFilter'), optInfAmmo: this.$('optInfAmmo'),
    };
    // diálogos
    this.dlg = { active: false, lines: [], i: 0, chars: 0, cb: null, t: 0 };
    this.toastTimer = 0;
    this.roomTimer = 0;
    // menus
    this.menuIdx = { title: 0, pause: 0 };
    this.titleItems = [];
    this.pauseItems = ['resume', 'help', 'options', 'title'];
    // inventário
    this.invSel = 0; this.invCmd = 0; this.invMode = 'grid'; this.invCmds = [];
    // cofre
    this.safeDigits = [0, 0, 0, 0]; this.safeSel = 0;
    // save confirm
    this.saveSel = 0;
    // ECG
    this.ecgX = 0; this.lastEcgX = 0; this.lastEcgY = 19;
    this.galleryRot = 0;

    this.buildHelp();
    this.wireButtons();
    this.wireTouch();
    this.renderCampaignPortraits();
  }

  get audio() { return this.game.audio; }
  show(e) { if (e) e.classList.remove('hidden'); }
  hide(e) { if (e) e.classList.add('hidden'); }

  hideAllOverlays() {
    this.hide(this.el.title);
    this.hide(this.el.introCutscene);
    this.hide(this.el.campaignSelect);
    this.hide(this.el.extraModes);
    this.hide(this.el.pointsShop);
    this.hide(this.el.modelViewer);
    this.hide(this.el.help);
    this.hide(this.el.options);
    this.hide(this.el.inv);
    this.hide(this.el.safe);
    this.hide(this.el.saveBox);
    this.hide(this.el.pause);
    this.hide(this.el.gameover);
    this.hide(this.el.ending);
    this.hide(this.el.banner);
  }

  renderCampaignPortraits() {
    const c1 = this.$('campPortDaniel');
    if (c1) drawPortrait(c1, 'daniel');
    const c2 = this.$('campPortClara');
    if (c2) drawPortrait(c2, 'clara');
  }

  // ==================== TÍTULO ====================
  showTitle(hasSave) {
    this.show(this.el.title);
    this.titleItems = hasSave
      ? ['new', 'continue', 'intro', 'extras', 'shop', 'options', 'help']
      : ['new', 'intro', 'extras', 'shop', 'options', 'help'];
    this.menuIdx.title = 0;
    if (this.el.titlePointsVal) {
      this.el.titlePointsVal.textContent = (this.game.points || 0).toLocaleString();
    }
    this.renderTitleMenu(hasSave);
  }
  hideTitle() { this.hide(this.el.title); }

  renderTitleMenu(hasSave) {
    const labels = {
      new: 'NOVO JOGO',
      continue: 'CONTINUAR',
      intro: 'ASSISTIR INTRO (1997)',
      extras: 'MODOS EXTRAS',
      shop: 'LOJA DE PONTOS',
      options: 'OPÇÕES',
      help: 'COMO JOGAR',
    };
    this.el.titleMenu.innerHTML = '';
    this.titleItems.forEach((act, i) => {
      const d = document.createElement('div');
      d.className = 'menuItem' + (i === this.menuIdx.title ? ' sel' : '');
      d.textContent = (i === this.menuIdx.title ? '▶ ' : '　') + labels[act];
      d.onclick = () => { this.menuIdx.title = i; this.audio.sfx('uiSelect'); this.game.titleAction(act); };
      d.onmouseenter = () => {
        if (this.menuIdx.title !== i) { this.menuIdx.title = i; this.audio.sfx('uiMove'); this.renderTitleMenu(hasSave); }
      };
      this.el.titleMenu.appendChild(d);
    });
    this.$('titleSaveInfo').textContent = hasSave ? '▲ DADOS DE JOGO ENCONTRADOS' : '';
  }

  titleNav(dir) {
    const n = this.titleItems.length;
    this.menuIdx.title = (this.menuIdx.title + dir + n) % n;
    this.audio.sfx('uiMove');
    this.renderTitleMenu(this.game.hasSave());
  }
  titleConfirm() {
    this.audio.sfx('uiSelect');
    this.game.titleAction(this.titleItems[this.menuIdx.title]);
  }

  // ==================== SELEÇÃO DE CAMPANHA ====================
  showCampaignSelect() { this.show(this.el.campaignSelect); }
  hideCampaignSelect() { this.hide(this.el.campaignSelect); }

  // ==================== MODOS EXTRAS ====================
  showExtraModes(hiMerc, hiSurv) {
    if (this.el.scoreMercenaries) this.el.scoreMercenaries.textContent = `RECORDE: ${(hiMerc || 0).toLocaleString()} PTS`;
    if (this.el.scoreSurvivor) this.el.scoreSurvivor.textContent = `RECORDE: ONDA ${hiSurv || 0}`;

    const u = this.game.unlocks || {};

    const updateMode = (btnId, statusId, unlocked, cost) => {
      const btn = this.$(btnId);
      const st = this.$(statusId);
      if (unlocked) {
        if (st) {
          st.textContent = '✓ DESBLOQUEADO';
          st.className = 'extraStatus unlocked';
        }
        if (btn) {
          btn.classList.remove('lockedBtn');
          btn.textContent = btn.dataset.playText || 'JOGAR';
        }
      } else {
        if (st) {
          st.textContent = `🔒 BLOQUEADO (${cost.toLocaleString()} PTS NA LOJA)`;
          st.className = 'extraStatus locked';
        }
        if (btn) {
          btn.classList.add('lockedBtn');
          btn.textContent = `DESBLOQUEAR NA LOJA (${cost.toLocaleString()} PTS)`;
        }
      }
    };

    updateMode('btnPlayMercenaries', 'statusMercenaries', !!u.extra_mercenaries, 1000);
    updateMode('btnPlaySurvivor', 'statusSurvivor', !!u.extra_survivor, 1000);
    updateMode('btnPlayBento', 'statusBento', !!u.extra_bento, 1200);

    this.show(this.el.extraModes);
  }
  hideExtraModes() { this.hide(this.el.extraModes); }

  // ==================== LOJA DE PONTOS ====================
  showShop(points, unlocks) {
    if (this.el.shopPointsVal) this.el.shopPointsVal.textContent = points.toLocaleString();
    const list = this.el.shopList;
    list.innerHTML = '';
    SHOP_ITEMS.forEach((it) => {
      const row = document.createElement('div');
      const bought = !!unlocks[it.id];
      row.className = 'shopItem' + (bought ? ' bought' : '');
      row.innerHTML = `
        <div class="shopItemLeft">
          <div class="shopItemIcon">${it.icon}</div>
          <div>
            <div class="shopItemTitle">${it.name}</div>
            <div class="shopItemDesc">${it.desc}</div>
          </div>
        </div>
        <div class="shopItemRight">
          <div class="shopItemCost">${bought ? 'ADQUIRIDO' : it.cost.toLocaleString() + ' PTS'}</div>
        </div>
      `;
      const right = (row.querySelector && row.querySelector('.shopItemRight')) || (row.children && row.children[1]);
      const btn = document.createElement('button');
      btn.className = 'btn small shopBtn';

      if (bought) {
        if (it.id === 'model_viewer') {
          btn.textContent = 'VER 3D';
          btn.onclick = () => { this.hideShop(); this.showGallery(); };
        } else if (it.id === 'extra_mercenaries') {
          btn.textContent = 'JOGAR';
          btn.onclick = () => { this.hideAllOverlays(); this.game.startMercenaries(); };
        } else if (it.id === 'extra_survivor') {
          btn.textContent = 'JOGAR';
          btn.onclick = () => { this.hideAllOverlays(); this.game.startSurvivor(); };
        } else if (it.id === 'extra_bento') {
          btn.textContent = 'JOGAR';
          btn.onclick = () => { this.hideAllOverlays(); this.game.startCampaign('bento'); };
        } else {
          btn.textContent = '✓';
          btn.disabled = true;
        }
      } else {
        btn.textContent = 'COMPRAR';
        btn.onclick = () => this.game.buyShopItem(it);
      }

      if (right) right.appendChild(btn);
      else row.appendChild(btn);

      list.appendChild(row);
    });
    this.show(this.el.pointsShop);
  }
  hideShop() { this.hide(this.el.pointsShop); }

  // ==================== GALERIA 3D ====================
  showGallery() {
    this.setupGallery3D();
    const sel = this.el.gallerySelect;
    sel.innerHTML = '';
    GALLERY_MODELS.forEach((m) => {
      const opt = document.createElement('option');
      opt.value = m.id; opt.textContent = m.name;
      sel.appendChild(opt);
    });
    sel.onchange = () => this.updateGalleryItem(sel.value);
    this.updateGalleryItem(GALLERY_MODELS[0].id);
    this.show(this.el.modelViewer);
  }
  hideGallery() { this.hide(this.el.modelViewer); }

  setupGallery3D() {
    if (this.galleryRenderer || !this.el.galleryCanvas) return;
    try {
      const THREE = this.game.THREE;
      if (!THREE || !THREE.WebGLRenderer) return;
      this.galleryRenderer = new THREE.WebGLRenderer({ canvas: this.el.galleryCanvas, antialias: false, alpha: true });
      this.galleryRenderer.setSize(320, 240, false);
      this.galleryScene = new THREE.Scene();
      this.galleryCamera = new THREE.PerspectiveCamera(45, 320 / 240, 0.1, 20);
      this.galleryCamera.position.set(0, 1.1, 3.6);
      this.galleryCamera.lookAt(0, 0.95, 0);

      const light1 = new THREE.DirectionalLight(0xffeedd, 1.8);
      light1.position.set(2, 3, 2);
      const light2 = new THREE.AmbientLight(0x667799, 1.4);
      this.galleryScene.add(light1, light2);

      this.galleryModelGroup = new THREE.Group();
      this.galleryScene.add(this.galleryModelGroup);
    } catch (e) { /* no-op em ambientes sem WebGL */ }
  }

  updateGalleryItem(id) {
    const item = GALLERY_MODELS.find((m) => m.id === id) || GALLERY_MODELS[0];
    if (this.el.galleryName) this.el.galleryName.textContent = item.name;
    if (this.el.gallerySub) this.el.gallerySub.textContent = item.sub;
    if (this.el.galleryBio) this.el.galleryBio.textContent = item.bio;

    if (!this.galleryModelGroup) return;
    const THREE = this.game.THREE;
    try {
      while (this.galleryModelGroup.children.length > 0) {
        this.galleryModelGroup.remove(this.galleryModelGroup.children[0]);
      }
      if (id === 'daniel' || id === 'clara' || id === 'bento') {
        const p = new Player(THREE, this.game.TEX);
        p.setHero(id, 'default');
        p.group.position.set(0, 0, 0);
        this.galleryModelGroup.add(p.group);
      } else {
        const e = new Enemy(THREE, this.game.TEX, id, 0, 0, false);
        e.group.position.set(0, 0, 0);
        this.galleryModelGroup.add(e.group);
      }
    } catch (e) { /* noop */ }
  }

  renderGalleryFrame(dt) {
    if (!this.galleryRenderer || !this.el.modelViewer || this.el.modelViewer.classList.contains('hidden')) return;
    this.galleryRot = (this.galleryRot || 0) + dt * 0.9;
    if (this.galleryModelGroup) {
      this.galleryModelGroup.rotation.y = this.galleryRot;
    }
    try {
      this.galleryRenderer.render(this.galleryScene, this.galleryCamera);
    } catch (e) { /* noop */ }
  }

  // ==================== AJUDA & OPÇÕES ====================
  buildHelp() {
    this.el.helpRows.innerHTML = '';
    HH.forEach(([k, d]) => {
      const r = document.createElement('div');
      r.className = 'helpRow';
      r.innerHTML = `<span class="k">${k}</span><span class="d">${d}</span>`;
      this.el.helpRows.appendChild(r);
    });
  }
  showHelp() { this.show(this.el.help); }
  hideHelp() { this.hide(this.el.help); }
  showOptions() { this.show(this.el.options); }
  hideOptions() { this.hide(this.el.options); }

  showIntroCutscene() {
    this.show(this.el.introCutscene);
  }
  hideIntroCutscene() {
    this.hide(this.el.introCutscene);
  }
  setIntroSubtitle(yearText, quoteText) {
    if (this.el.introYearTag) {
      this.el.introYearTag.textContent = yearText || '';
      this.el.introYearTag.classList.toggle('visible', !!yearText);
    }
    if (this.el.introQuoteText) {
      this.el.introQuoteText.innerHTML = quoteText || '';
      this.el.introQuoteText.classList.toggle('visible', !!quoteText);
    }
  }

  // ==================== BOTÕES / EVENTOS ====================
  wireButtons() {
    const click = (id, fn) => {
      const e = this.$(id);
      if (e) e.onclick = (ev) => { ev.preventDefault(); this.audio.unlock(); fn(); };
    };

    // Pular intro cinematográfica
    click('introSkipBtn', () => { this.game.skipIntroCinematic(); });
    if (this.el.introCutscene) {
      this.el.introCutscene.onclick = (ev) => {
        ev.preventDefault();
        this.game.skipIntroCinematic();
      };
    }

    // Navegação principal
    click('helpBack', () => { this.audio.sfx('uiBack'); this.hideHelp(); this.showTitle(this.game.hasSave()); });
    click('optBack', () => { this.audio.sfx('uiBack'); this.hideOptions(); this.showTitle(this.game.hasSave()); });
    click('campBack', () => { this.audio.sfx('uiBack'); this.hideCampaignSelect(); this.showTitle(this.game.hasSave()); });
    click('extraBack', () => { this.audio.sfx('uiBack'); this.hideExtraModes(); this.showTitle(this.game.hasSave()); });
    click('extraToShop', () => { this.audio.sfx('uiSelect'); this.hideExtraModes(); this.showShop(this.game.points, this.game.unlocks); });
    click('shopBack', () => { this.audio.sfx('uiBack'); this.hideShop(); this.showTitle(this.game.hasSave()); });
    click('galleryBack', () => { this.audio.sfx('uiBack'); this.hideGallery(); this.showShop(this.game.points, this.game.unlocks); });

    // Seleção de campanha
    click('btnSelectDaniel', () => {
      this.audio.sfx('uiSelect');
      this.hideAllOverlays();
      this.game.startCampaign('daniel');
    });
    click('btnSelectClara', () => {
      this.audio.sfx('uiSelect');
      this.hideAllOverlays();
      this.game.startCampaign('clara');
    });

    // Modos extras com verificação de bloqueio
    click('btnPlayMercenaries', () => {
      if (!this.game.unlocks.extra_mercenaries) {
        this.audio.sfx('dryfire');
        this.hideExtraModes();
        this.showShop(this.game.points, this.game.unlocks);
        this.toast('🔒 Adquira o Modo Mercenários na Loja por 1.000 PTS!', 3.5);
        return;
      }
      this.audio.sfx('uiSelect');
      this.hideAllOverlays();
      this.game.startMercenaries();
    });

    click('btnPlaySurvivor', () => {
      if (!this.game.unlocks.extra_survivor) {
        this.audio.sfx('dryfire');
        this.hideExtraModes();
        this.showShop(this.game.points, this.game.unlocks);
        this.toast('🔒 Adquira o Modo Sobrevivente na Loja por 1.000 PTS!', 3.5);
        return;
      }
      this.audio.sfx('uiSelect');
      this.hideAllOverlays();
      this.game.startSurvivor();
    });

    click('btnPlayBento', () => {
      if (!this.game.unlocks.extra_bento) {
        this.audio.sfx('dryfire');
        this.hideExtraModes();
        this.showShop(this.game.points, this.game.unlocks);
        this.toast('🔒 Adquira o Turno do Bento na Loja por 1.200 PTS!', 3.5);
        return;
      }
      this.audio.sfx('uiSelect');
      this.hideAllOverlays();
      this.game.startCampaign('bento');
    });

    // Alternar câmera
    click('hudCamBtn', () => this.game.toggleCamMode());
    click('invCamSwitch', () => this.game.toggleCamMode());

    // Opções
    const optBright = this.el.optBright;
    if (optBright) optBright.onchange = () => this.game.setBrightness(optBright.value);
    const optCam = this.el.optCam;
    if (optCam) optCam.onchange = () => this.game.setCamMode(optCam.value);
    const optFilter = this.el.optFilter;
    if (optFilter) optFilter.onchange = () => this.game.setFilter(optFilter.value);
    const optInfAmmo = this.el.optInfAmmo;
    if (optInfAmmo) optInfAmmo.onchange = () => this.game.setInfiniteAmmo(optInfAmmo.value === 'on');

    const optM = this.$('optMaster'), optMu = this.$('optMusic'), optS = this.$('optSfx');
    if (optM) optM.oninput = () => this.game.setVolume('master', optM.value / 10);
    if (optMu) optMu.oninput = () => this.game.setVolume('music', optMu.value / 10);
    if (optS) optS.oninput = () => this.game.setVolume('sfx', optS.value / 10);
    const optCrt = this.$('optCrt');
    if (optCrt) optCrt.onchange = () => this.game.setCrt(optCrt.checked);
    const optRes = this.$('optRes');
    if (optRes) optRes.onchange = () => this.game.setQuality(optRes.value === 'alta');

    // Inventário
    click('invClose', () => this.game.closeInventory());

    // Diálogo
    const dlg = this.el.dialog;
    if (dlg) dlg.onclick = () => { this.audio.unlock(); this.advanceDialog(); };

    // Cofre
    click('safeOk', () => this.game.safeConfirm(this.safeDigits.join('')));
    click('safeCancel', () => this.game.safeCancel());

    // Salvar
    click('saveYes', () => this.game.saveConfirm(true));
    click('saveNo', () => this.game.saveConfirm(false));

    // GameOver & Final
    click('goRetry', () => this.game.gameoverAction('retry'));
    click('goTitle', () => this.game.gameoverAction('title'));
    click('endBtn', () => this.game.endingDone());
  }

  // ==================== HUD ====================
  showHud(b) { b ? this.show(this.el.hud) : this.hide(this.el.hud); }
  room(name) {
    this.el.roomName.textContent = name;
    this.el.roomName.classList.remove('hidden');
    this.el.roomName.style.opacity = 1;
    this.roomTimer = 3.2;
  }
  hp(hp) {
    const st = healthStatus(hp);
    this.el.hpText.textContent = `${Math.max(0, Math.ceil(hp))}`;
    const s = this.el.hpStatus;
    s.textContent = st.label;
    s.className = 'hpStatus ' + st.cls;
  }
  ammo(str, visible) {
    this.el.ammoBox.classList.toggle('hidden', !visible);
    this.el.ammoText.textContent = str;
  }
  prompt(txt) {
    if (!txt) { this.hide(this.el.prompt); return; }
    this.show(this.el.prompt);
    this.el.prompt.innerHTML = txt;
  }
  crosshair(b) { this.el.cross.classList.toggle('hidden', !b); }
  target(sx, sy, b) {
    this.el.target.classList.toggle('hidden', !b);
    if (b) { this.el.target.style.left = sx + 'px'; this.el.target.style.top = sy + 'px'; }
  }
  boss(name, frac) {
    if (name === null) { this.hide(this.el.bossBar); return; }
    this.show(this.el.bossBar);
    this.el.bossName.textContent = name;
    this.el.bossFill.style.width = Math.max(0, frac * 100) + '%';
  }
  extraHud(timerStr, scoreVal, comboVal) {
    if (timerStr === null) { this.hide(this.el.extraHud); return; }
    this.show(this.el.extraHud);
    if (this.el.extraTimer) this.el.extraTimer.textContent = timerStr;
    if (this.el.extraScore) this.el.extraScore.textContent = (scoreVal || 0).toLocaleString();
    if (this.el.extraCombo) {
      this.el.extraCombo.textContent = comboVal > 1 ? `COMBO x${comboVal} 🔥` : '';
    }
  }
  toast(txt, dur = 3) {
    this.el.toast.innerHTML = txt;
    this.show(this.el.toast);
    this.toastTimer = dur;
  }

  update(dt) {
    // Typewriter do diálogo
    if (this.dlg.active) {
      const line = this.dlg.lines[this.dlg.i];
      if (line && this.dlg.chars < line.text.length) {
        this.dlg.t += dt;
        const cps = 48;
        let n = Math.floor(this.dlg.t * cps);
        if (n > 0) {
          this.dlg.t -= n / cps;
          const before = this.dlg.chars;
          this.dlg.chars = Math.min(line.text.length, this.dlg.chars + n);
          if (Math.floor(this.dlg.chars / 2) !== Math.floor(before / 2)) {
            this.audio.sfx('voiceTalk', { who: line.who });
          }
          this.el.dlgText.textContent = line.text.slice(0, this.dlg.chars);
        }
      }
    }
    if (this.toastTimer > 0) {
      this.toastTimer -= dt;
      if (this.toastTimer <= 0) this.hide(this.el.toast);
    }
    if (this.roomTimer > 0) {
      this.roomTimer -= dt;
      if (this.roomTimer < 1) this.el.roomName.style.opacity = this.roomTimer;
      if (this.roomTimer <= 0) this.el.roomName.classList.add('hidden');
    }
    // Atualiza ECG quando o inventário estiver aberto
    if (!this.el.inv.classList.contains('hidden')) {
      this.drawECG(this.game.player.hp, dt);
    }
    // Renderiza modelo 3D da galeria se estiver aberta
    this.renderGalleryFrame(dt);
  }

  // ==================== BANNER DE ITEM ====================
  showBanner(itemId, qty) {
    const it = ITEMS[itemId];
    if (!it) return;
    this.el.bannerIcon.textContent = it.icon;
    this.el.bannerName.textContent = (qty > 1 ? qty + 'x ' : '') + it.name;
    this.el.bannerDesc.textContent = it.desc;
    this.el.banner.classList.toggle('key', it.type === 'key' || it.type === 'weapon');
    this.show(this.el.banner);
  }
  hideBanner() { this.hide(this.el.banner); }

  // ==================== DIÁLOGO ====================
  dialog(lines, cb) {
    if (!lines || lines.length === 0) { if (cb) cb(); return; }
    this.dlg.active = true;
    this.dlg.lines = lines;
    this.dlg.i = 0;
    this.dlg.chars = 0;
    this.dlg.cb = cb;
    this.dlg.t = 0;
    this.showLine();
    this.show(this.el.dialog);
  }
  showLine() {
    const line = this.dlg.lines[this.dlg.i];
    this.dlg.chars = 0;
    this.dlg.t = 0;
    this.el.dlgName.textContent = NAMES[line.who] || line.who.toUpperCase();
    this.el.dlgText.textContent = '';
    drawPortrait(this.el.dlgPortrait, line.who);
    if (this.audio && this.audio.speakSubtitle) {
      this.audio.speakSubtitle(line.text, line.who);
    }
  }
  advanceDialog() {
    if (!this.dlg.active) return;
    const line = this.dlg.lines[this.dlg.i];
    if (this.dlg.chars < line.text.length) {
      this.dlg.chars = line.text.length;
      this.el.dlgText.textContent = line.text;
      return;
    }
    if (this.audio && this.audio.stopVoice) {
      this.audio.stopVoice();
    }
    this.dlg.i++;
    if (this.dlg.i >= this.dlg.lines.length) {
      this.dlg.active = false;
      this.hide(this.el.dialog);
      const cb = this.dlg.cb;
      this.dlg.cb = null;
      if (cb) cb();
    } else {
      this.showLine();
    }
  }

  // ==================== INVENTÁRIO COM ECG ====================
  showInventory() {
    this.invSel = 0;
    this.invMode = 'grid';
    this.invCmd = 0;
    this.renderInventory();
    this.show(this.el.inv);
  }
  hideInventory() { this.hide(this.el.inv); }

  drawECG(hp, dt) {
    const c = this.el.ecgCanvas;
    if (!c) return;
    const x = c.getContext('2d');
    const w = c.width, h = c.height;

    // Fundo verde escuro fosforescente com grade hospitalar
    x.fillStyle = 'rgba(2, 8, 4, 0.25)';
    x.fillRect(0, 0, w, h);

    // Grade milimetrada de osciloscópio
    x.strokeStyle = 'rgba(0, 80, 30, 0.15)';
    x.lineWidth = 1;
    for (let gx = 0; gx < w; gx += 16) {
      x.beginPath(); x.moveTo(gx, 0); x.lineTo(gx, h); x.stroke();
    }
    for (let gy = 0; gy < h; gy += 10) {
      x.beginPath(); x.moveTo(0, gy); x.lineTo(w, gy); x.stroke();
    }

    const color = hp > 66 ? '#33ff66' : hp > 33 ? '#ffcc00' : '#ff3333';
    x.strokeStyle = color;
    x.lineWidth = 2;
    x.shadowColor = color;
    x.shadowBlur = 4;

    const rate = hp > 66 ? 75 : hp > 33 ? 100 : 145;
    this.ecgX = (this.ecgX || 0) + dt * rate;
    if (this.ecgX >= w) {
      this.ecgX = 0;
      this.lastEcgY = h / 2;
    }

    // forma de onda ECG P-Q-R-S-T
    const phase = (this.ecgX % 50) / 50;
    let y = h / 2;
    if (phase > 0.30 && phase < 0.38) y = h * 0.35; // P
    else if (phase >= 0.38 && phase < 0.44) y = h * 0.82; // Q
    else if (phase >= 0.44 && phase < 0.52) y = h * 0.12; // R
    else if (phase >= 0.52 && phase < 0.60) y = h * 0.88; // S
    else if (phase >= 0.60 && phase < 0.70) y = h * 0.40; // T

    x.beginPath();
    x.moveTo(this.lastEcgX || 0, this.lastEcgY || h / 2);
    x.lineTo(this.ecgX, y);
    x.stroke();
    x.shadowBlur = 0;

    this.lastEcgX = this.ecgX;
    this.lastEcgY = y;

    const st = healthStatus(hp);
    if (this.el.ecgStatus) {
      this.el.ecgStatus.textContent = st.label;
      this.el.ecgStatus.style.color = color;
    }
    if (this.el.ecgBpm) {
      const bpm = hp > 66 ? 72 : hp > 33 ? 116 : 164;
      this.el.ecgBpm.textContent = `${bpm} BPM`;
      this.el.ecgBpm.style.color = color;
    }
  }

  renderInventory() {
    const inv = this.game.inv;
    const g = this.el.invGrid;
    g.innerHTML = '';
    const SLOTS = 8;
    for (let i = 0; i < SLOTS; i++) {
      const it = inv[i];
      const slot = document.createElement('div');
      slot.className = 'invSlot' + (i === this.invSel ? ' sel' : '') + (it && it.equipped ? ' eq' : '');
      if (it) {
        const itemCfg = ITEMS[it.item];
        const num = it.qty > 1 ? `<span class="qty">${it.qty}</span>` : '';
        const eq = it.equipped ? '<span class="eqBadge">E</span>' : '';
        slot.innerHTML = `<span class="icon">${itemCfg.icon}</span><span class="name">${itemCfg.name}</span>${num}${eq}`;
      } else {
        slot.innerHTML = '<span class="icon" style="opacity:0.25">◻</span>';
      }
      slot.onclick = () => {
        this.invSel = i;
        this.invMode = 'grid';
        this.audio.sfx('uiMove');
        this.renderInventory();
      };
      g.appendChild(slot);
    }
    this.renderInvDetail();

    const curHero = CAMPAIGNS[this.game.currentCampaign] || CAMPAIGNS.daniel;
    if (this.el.invHeroName) this.el.invHeroName.textContent = curHero.name.toUpperCase();
    this.el.invWeapon.textContent = 'ARMA: ' + (WEAPONS[this.game.player.weapon]?.name || 'Nenhuma');
    this.el.invPages.textContent = `PÁGINAS: ${this.game.flags.pages.filter(Boolean).length}/8`;
    this.el.invTime.textContent = 'TEMPO: ' + this.game.formattedTime();
    this.el.invObjective.textContent = this.game.currentObjective();

    if (this.el.invCamSwitch) {
      this.el.invCamSwitch.textContent = `📷 CÂMERA: ${this.game.camMode === 'chase' ? '3ª PESSOA' : 'FIXA PS1'}`;
    }
  }

  renderInvDetail() {
    const it = this.game.inv[this.invSel];
    if (!it) {
      this.el.invIcon.textContent = '—';
      this.el.invName.textContent = 'Vazio';
      this.el.invDesc.textContent = 'Espaço livre na maleta de sobrevivência.';
      this.el.invCmds.innerHTML = '';
      this.invCmds = [];
      return;
    }
    const cfg = ITEMS[it.item];
    this.el.invIcon.textContent = cfg.icon;
    this.el.invName.textContent = cfg.name + (it.qty > 1 ? ` (x${it.qty})` : '') + (it.equipped ? ' [EQUIPADA]' : '');
    this.el.invDesc.textContent = cfg.desc;

    this.invCmds = [];
    if (cfg.type === 'weapon') this.invCmds.push(it.equipped ? 'DESEQUIPAR' : 'EQUIPAR');
    if (cfg.type === 'heal') this.invCmds.push('USAR');
    if (cfg.type === 'page') this.invCmds.push('LER');
    this.invCmds.push('EXAMINAR');

    this.el.invCmds.innerHTML = '';
    this.invCmds.forEach((cmd, i) => {
      const b = document.createElement('button');
      b.className = 'btn small' + (this.invMode === 'cmds' && i === this.invCmd ? ' selCmd' : '');
      b.textContent = cmd;
      b.onclick = () => { this.invCmd = i; this.execInvCmd(cmd, it); };
      this.el.invCmds.appendChild(b);
    });
  }

  invNav(dx, dy) {
    if (this.invMode === 'grid') {
      let r = Math.floor(this.invSel / 2), c = this.invSel % 2;
      r = (r + dy + 4) % 4;
      c = (c + dx + 2) % 2;
      this.invSel = r * 2 + c;
      this.audio.sfx('uiMove');
      this.renderInventory();
    } else {
      const n = this.invCmds.length;
      if (n > 0) {
        this.invCmd = (this.invCmd + dy + n) % n;
        this.audio.sfx('uiMove');
        this.renderInvDetail();
      }
    }
  }
  invConfirm() {
    if (this.invMode === 'grid') {
      const it = this.game.inv[this.invSel];
      if (!it) return;
      this.invMode = 'cmds';
      this.invCmd = 0;
      this.audio.sfx('uiSelect');
      this.renderInvDetail();
    } else {
      const it = this.game.inv[this.invSel];
      const cmd = this.invCmds[this.invCmd];
      if (cmd && it) this.execInvCmd(cmd, it);
    }
  }
  invBack() {
    if (this.invMode === 'cmds') {
      this.invMode = 'grid';
      this.audio.sfx('uiBack');
      this.renderInventory();
    } else {
      this.game.closeInventory();
    }
  }
  execInvCmd(cmd, it) {
    this.audio.sfx('uiSelect');
    if (cmd === 'EQUIPAR' || cmd === 'DESEQUIPAR') {
      this.game.equipWeapon(it);
      this.invMode = 'grid';
      this.renderInventory();
    } else if (cmd === 'USAR') {
      this.game.useItem(it);
      this.invMode = 'grid';
      this.renderInventory();
    } else if (cmd === 'LER') {
      this.game.readPage(it.page);
    } else if (cmd === 'EXAMINAR') {
      this.game.examineItem(it);
    }
  }

  // ==================== COFRE ====================
  showSafe() {
    this.safeDigits = [0, 0, 0, 0];
    this.safeSel = 0;
    this.renderSafe();
    this.show(this.el.safe);
  }
  hideSafe() { this.hide(this.el.safe); }
  renderSafe() {
    const d = this.el.safeDigits;
    d.innerHTML = '';
    this.safeDigits.forEach((v, i) => {
      const box = document.createElement('div');
      box.className = 'safeDigit' + (i === this.safeSel ? ' sel' : '');
      box.innerHTML = `<span class="arr">▲</span><span class="v">${v}</span><span class="arr">▼</span>`;
      box.onclick = () => { this.safeSel = i; this.audio.sfx('uiMove'); this.renderSafe(); };
      d.appendChild(box);
    });
  }
  safeNav(dx, dy) {
    if (dx !== 0) {
      this.safeSel = (this.safeSel + dx + 4) % 4;
      this.audio.sfx('uiMove');
    }
    if (dy !== 0) {
      this.safeDigits[this.safeSel] = (this.safeDigits[this.safeSel] - dy + 10) % 10;
      this.audio.sfx('uiMove');
    }
    this.renderSafe();
  }

  // ==================== SALVAR (CONFIRMAÇÃO) ====================
  showSaveBox() {
    this.saveSel = 0;
    this.show(this.el.saveBox);
  }
  hideSaveBox() { this.hide(this.el.saveBox); }

  // ==================== PAUSE ====================
  showPause() {
    this.menuIdx.pause = 0;
    this.renderPause();
    this.show(this.el.pause);
  }
  hidePause() { this.hide(this.el.pause); }
  renderPause() {
    const labels = {
      resume: 'CONTINUAR',
      help: 'COMO JOGAR',
      options: 'OPÇÕES',
      title: 'SAIR PARA O TÍTULO',
    };
    const m = this.el.pauseMenu;
    m.innerHTML = '';
    this.pauseItems.forEach((act, i) => {
      const d = document.createElement('div');
      d.className = 'menuItem' + (i === this.menuIdx.pause ? ' sel' : '');
      d.textContent = (i === this.menuIdx.pause ? '▶ ' : '　') + labels[act];
      d.onclick = () => this.game.pauseAction(act);
      d.onmouseenter = () => {
        if (this.menuIdx.pause !== i) { this.menuIdx.pause = i; this.audio.sfx('uiMove'); this.renderPause(); }
      };
      m.appendChild(d);
    });
  }
  pauseNav(dir) {
    const n = this.pauseItems.length;
    this.menuIdx.pause = (this.menuIdx.pause + dir + n) % n;
    this.audio.sfx('uiMove');
    this.renderPause();
  }
  pauseConfirm() {
    this.audio.sfx('uiSelect');
    this.game.pauseAction(this.pauseItems[this.menuIdx.pause]);
  }

  // ==================== GAME OVER / ENDING ====================
  showGameOver() { this.show(this.el.gameover); }
  hideGameOver() { this.hide(this.el.gameover); }

  showEnding(data) {
    this.el.endTitle.textContent = data.title;
    this.el.endTitle.className = data.good ? 'good' : 'normal';
    this.el.endRank.textContent = data.rank;
    this.el.endRank.className = 'rank r' + data.rank;
    this.el.endStats.innerHTML =
      `TEMPO: ${data.time}<br>REGISTROS: ${data.saves}<br>PÁGINAS: ${data.pages}/8<br>INIMIGOS ELIMINADOS: ${data.kills || 0}`;
    this.el.endMsg.innerHTML = data.msg;
    if (this.el.endPointsVal) this.el.endPointsVal.textContent = (data.earnedPoints || 0).toLocaleString();
    this.show(this.el.ending);
  }
  hideEnding() { this.hide(this.el.ending); }

  // ==================== PORTA (ANIMAÇÃO CLÁSSICA RE) ====================
  doorAnim(elevator, cb) {
    const cv = this.el.doorCanvas;
    const x = cv.getContext('2d');
    const W = cv.width, H = cv.height;
    this.show(this.el.door);
    const t0 = performance.now();
    const DUR = elevator ? 2200 : 1700;
    const pal = elevator
      ? { l: '#3a3e46', d: '#1e2026', edge: '#6a7078' }
      : { l: '#4a3420', d: '#241708', edge: '#6a4e2e' };
    const frame = () => {
      const t = (performance.now() - t0) / DUR;
      x.fillStyle = '#000';
      x.fillRect(0, 0, W, H);
      const open = Math.max(0, Math.min(1, (t - 0.18) / 0.6));
      const gap = open * W * 0.42;

      const g = x.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, '#000');
      g.addColorStop(0.5, elevator ? '#0a1420' : '#0a0805');
      g.addColorStop(1, '#000');
      x.fillStyle = g;
      x.fillRect(W / 2 - gap - 4, 0, gap * 2 + 8, H);

      const drawLeaf = (left) => {
        const wdt = W / 2 - gap;
        const px = left ? 0 : W / 2 + gap;
        const grd = x.createLinearGradient(px, 0, px + (left ? wdt : -wdt), 0);
        grd.addColorStop(0, pal.d); grd.addColorStop(0.5, pal.l); grd.addColorStop(1, pal.d);
        x.fillStyle = grd;
        x.fillRect(left ? 0 : W / 2 + gap, 0, wdt, H);
        x.strokeStyle = pal.edge; x.lineWidth = 2;
        for (let i = 0; i < 3; i++) {
          const py = 20 + i * 50;
          if (left) x.strokeRect(14, py, Math.max(4, wdt - 28), 36);
          else x.strokeRect(W / 2 + gap + 14, py, Math.max(4, wdt - 28), 36);
        }
        x.fillStyle = elevator ? '#9ad0ff' : '#c89858';
        x.fillRect(left ? wdt - 2 : W / 2 + gap, 0, 2, H);
      };
      drawLeaf(true); drawLeaf(false);

      const vg = x.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.8);
      vg.addColorStop(0, 'rgba(0,0,0,0)');
      vg.addColorStop(1, 'rgba(0,0,0,0.7)');
      x.fillStyle = vg;
      x.fillRect(0, 0, W, H);
      if (t > 0.78) {
        x.fillStyle = `rgba(0,0,0,${(t - 0.78) / 0.22})`;
        x.fillRect(0, 0, W, H);
      }
      if (t < 1) requestAnimationFrame(frame);
      else { this.hide(this.el.door); if (cb) cb(); }
    };
    requestAnimationFrame(frame);
  }

  // ==================== TOUCH ====================
  wireTouch() {
    if (!('ontouchstart' in window)) return;
    this.show(this.el.touch);
    const g = this.game;
    const hold = (id, key) => {
      const e = this.$(id);
      if (!e) return;
      const on = (ev) => { ev.preventDefault(); g.touch[key] = true; };
      const off = (ev) => { ev.preventDefault(); g.touch[key] = false; };
      e.addEventListener('touchstart', on, { passive: false });
      e.addEventListener('touchend', off, { passive: false });
      e.addEventListener('touchcancel', off, { passive: false });
    };
    hold('tF', 'f'); hold('tB', 'b'); hold('tL', 'l'); hold('tR', 'r');
    hold('tAim', 'aim');
    const tap = (id, fn) => {
      const e = this.$(id);
      if (!e) return;
      e.addEventListener('touchstart', (ev) => { ev.preventDefault(); this.audio.unlock(); fn(); }, { passive: false });
    };
    tap('tFire', () => g.touchFire());
    tap('tAct', () => g.touchAct());
    tap('tInv', () => g.touchInv());
    tap('tRun', () => { g.touch.run = !g.touch.run; this.$('tRun').classList.toggle('on', g.touch.run); });
    tap('tCam', () => g.toggleCamMode());
  }
}
