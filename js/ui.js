// ============================================================
// ECOS DO VAZIO - Interface: telas, HUD, inventário, diálogos
// ============================================================
import { ITEMS, WEAPONS, healthStatus } from './config.js';
import { HELP_ROWS as HH } from './story.js';
import { drawPortrait } from './textures.js';

const NAMES = {
  daniel: 'DANIEL', lucia: 'LÚCIA', medico: 'DR. MATIAS',
  vulto: 'VULTO', q: '???', n: '',
};

export class UI {
  constructor(game) {
    this.game = game;
    this.$ = (id) => document.getElementById(id);
    this.el = {
      title: this.$('title'), titleMenu: this.$('titleMenu'),
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
      safe: this.$('safe'), safeDigits: this.$('safeDigits'),
      saveBox: this.$('saveBox'),
      pause: this.$('pause'), pauseMenu: this.$('pauseMenu'),
      gameover: this.$('gameover'),
      ending: this.$('ending'), endTitle: this.$('endTitle'),
      endRank: this.$('endRank'), endStats: this.$('endStats'), endMsg: this.$('endMsg'),
      door: this.$('door'), doorCanvas: this.$('doorCanvas'),
      touch: this.$('touch'),
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
    this.buildHelp();
    this.wireButtons();
    this.wireTouch();
  }

  show(elm) { elm.classList.remove('hidden'); }
  hide(elm) { elm.classList.add('hidden'); }
  get audio() { return this.game.audio; }

  // ==================== TITLE ====================
  showTitle(hasSave) {
    this.show(this.el.title);
    this.titleItems = hasSave ? ['new', 'continue', 'help', 'options'] : ['new', 'help', 'options'];
    this.menuIdx.title = 0;
    this.renderTitleMenu(hasSave);
  }
  hideTitle() { this.hide(this.el.title); }
  renderTitleMenu(hasSave) {
    const labels = { new: 'NOVO JOGO', continue: 'CONTINUAR', help: 'COMO JOGAR', options: 'OPÇÕES' };
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
    this.renderTitleMenu(n === 4);
  }
  titleConfirm() {
    this.audio.sfx('uiSelect');
    this.game.titleAction(this.titleItems[this.menuIdx.title]);
  }

  // ==================== HELP / OPTIONS ====================
  buildHelp() {
    this.el.helpRows.innerHTML = '';
    for (const [k, v] of HH) {
      const r = document.createElement('div');
      r.className = 'helpRow';
      r.innerHTML = `<span class="helpKey">${k}</span><span>${v}</span>`;
      this.el.helpRows.appendChild(r);
    }
  }
  showHelp() { this.show(this.el.help); }
  hideHelp() { this.hide(this.el.help); }
  showOptions() {
    const o = this.game.opts;
    this.$('optMaster').value = Math.round(o.master * 10);
    this.$('optMusic').value = Math.round(o.music * 10);
    this.$('optSfx').value = Math.round(o.sfx * 10);
    this.$('optCrt').checked = o.crt;
    this.$('optRes').value = o.high ? 'alta' : 'ps1';
    this.optSel = 0;
    this.renderOptSel();
    this.show(this.el.options);
  }
  hideOptions() { this.hide(this.el.options); }
  optRows() { return ['master', 'music', 'sfx', 'crt', 'res', 'back']; }
  renderOptSel() {
    const rows = this.el.options.querySelectorAll('.optRow');
    rows.forEach((r, i) => r.classList.toggle('sel', i === this.optSel));
  }
  optionsNav(dir) {
    const rows = this.optRows().length;
    this.optSel = (this.optSel + dir + rows) % rows;
    this.audio.sfx('uiMove');
    this.renderOptSel();
  }
  optionsAdjust(dir) {
    const key = this.optRows()[this.optSel];
    const o = this.game.opts;
    if (key === 'master' || key === 'music' || key === 'sfx') {
      o[key] = Math.max(0, Math.min(1, o[key] + dir * 0.1));
      this.game.applyOpts();
      this.showOptionsKeepSel();
      this.audio.sfx('uiMove');
    } else if (key === 'crt' || key === 'res') {
      this.optionsConfirm();
    } else if (key === 'back' && dir !== 0) {
      this.optionsConfirm();
    }
  }
  showOptionsKeepSel() {
    const s = this.optSel;
    this.showOptions();
    this.optSel = s;
    this.renderOptSel();
  }
  optionsConfirm() {
    const key = this.optRows()[this.optSel];
    const o = this.game.opts;
    if (key === 'crt') { o.crt = !o.crt; this.game.applyOpts(); this.showOptionsKeepSel(); this.audio.sfx('uiSelect'); }
    else if (key === 'res') { o.high = !o.high; this.game.applyOpts(); this.showOptionsKeepSel(); this.audio.sfx('uiSelect'); }
    else if (key === 'back') { this.audio.sfx('uiBack'); this.game.optionsBack(); }
    else this.audio.sfx('uiSelect');
  }

  wireButtons() {
    const click = (id, fn) => {
      const e = this.$(id);
      if (e) e.onclick = (ev) => { ev.stopPropagation(); this.audio.unlock(); fn(); };
    };
    click('helpBack', () => { this.audio.sfx('uiBack'); this.game.helpBack(); });
    click('optBack', () => { this.audio.sfx('uiBack'); this.game.optionsBack(); });
    // sliders
    for (const k of ['Master', 'Music', 'Sfx']) {
      const s = this.$('opt' + k);
      if (s) s.oninput = () => {
        this.game.opts[k.toLowerCase()] = s.value / 10;
        this.game.applyOpts();
      };
    }
    const crt = this.$('optCrt');
    if (crt) crt.onchange = () => { this.game.opts.crt = crt.checked; this.game.applyOpts(); };
    const res = this.$('optRes');
    if (res) res.onchange = () => { this.game.opts.high = res.value === 'alta'; this.game.applyOpts(); };
    // inventário
    click('invUse', () => this.game.invCommand('use'));
    click('invExamine', () => this.game.invCommand('examine'));
    click('invClose', () => this.game.closeInventory());
    // cofre
    click('safeOk', () => this.game.safeConfirm());
    click('safeCancel', () => this.game.safeCancel());
    // save
    click('saveYes', () => this.game.saveConfirm(true));
    click('saveNo', () => this.game.saveConfirm(false));
    // pause
    const pclick = (id, act) => click(id, () => this.game.pauseAction(act));
    pclick('pResume', 'resume'); pclick('pHelp', 'help');
    pclick('pOptions', 'options'); pclick('pTitle', 'title');
    // game over / ending
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
  toast(txt, dur = 3) {
    this.el.toast.innerHTML = txt;
    this.show(this.el.toast);
    this.toastTimer = dur;
  }
  update(dt) {
    // typewriter do diálogo
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
          if (Math.floor(this.dlg.chars / 2) !== Math.floor(before / 2)) this.audio.sfx('type');
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
  }

  // ==================== BANNER DE ITEM ====================
  showBanner(itemId, qty) {
    const it = ITEMS[itemId];
    this.el.bannerIcon.textContent = it.icon;
    this.el.bannerName.textContent = (qty > 1 ? qty + 'x ' : '') + it.name;
    this.el.bannerDesc.textContent = it.desc;
    this.el.banner.classList.toggle('key', it.type === 'key' || it.type === 'weapon');
    this.show(this.el.banner);
  }
  hideBanner() { this.hide(this.el.banner); }

  // ==================== DIÁLOGO ====================
  dialog(lines, cb) {
    this.dlg = { active: true, lines, i: 0, chars: 0, cb, t: 0 };
    this.show(this.el.dialog);
    this.renderDlgLine();
  }
  renderDlgLine() {
    const line = this.dlg.lines[this.dlg.i];
    this.dlg.chars = 0; this.dlg.t = 0;
    this.el.dlgText.textContent = '';
    this.el.dlgName.textContent = NAMES[line.who] || '';
    this.el.dlgName.style.display = line.who === 'n' ? 'none' : 'block';
    this.el.dlgPortrait.style.display = line.who === 'n' ? 'none' : 'block';
    if (line.who !== 'n') drawPortrait(this.el.dlgPortrait, line.who);
    this.el.dialog.classList.toggle('evil', line.who === 'vulto');
  }
  advanceDialog() {
    if (!this.dlg.active) return;
    const line = this.dlg.lines[this.dlg.i];
    if (this.dlg.chars < line.text.length) {
      this.dlg.chars = line.text.length;
      this.el.dlgText.textContent = line.text;
      return;
    }
    this.audio.sfx('uiMove');
    this.dlg.i++;
    if (this.dlg.i >= this.dlg.lines.length) {
      this.dlg.active = false;
      this.hide(this.el.dialog);
      const cb = this.dlg.cb;
      this.dlg.cb = null;
      if (cb) cb();
    } else {
      this.renderDlgLine();
    }
  }
  get dialogActive() { return this.dlg.active; }

  // ==================== INVENTÁRIO ====================
  openInventory(data) {
    this.invSel = 0; this.invMode = 'grid'; this.invCmd = 0;
    this.renderInventory(data);
    this.show(this.el.inv);
  }
  closeInventory() { this.hide(this.el.inv); }
  get invOpen() { return !this.el.inv.classList.contains('hidden'); }
  renderInventory(data) {
    const { items, equipped } = data;
    const g = this.el.invGrid;
    g.innerHTML = '';
    const cols = 3;
    const total = Math.max(items.length, 6);
    for (let i = 0; i < total; i++) {
      const cell = document.createElement('div');
      cell.className = 'invCell';
      const it = items[i];
      if (it) {
        const def = ITEMS[it.id];
        cell.innerHTML = `<div class="invIcon">${def.icon}</div><div class="invQty">${it.qty > 1 ? 'x' + it.qty : ''}</div>`;
        if (it.id === equipped) cell.classList.add('equipped');
      } else {
        cell.classList.add('empty');
      }
      if (i === this.invSel && this.invMode === 'grid') cell.classList.add('sel');
      cell.onclick = () => {
        if (!items[i]) return;
        this.invSel = i; this.invMode = 'grid';
        this.audio.sfx('uiMove');
        this.renderInventory(this.game.getInvData());
      };
      cell.ondblclick = () => {
        if (!items[i]) return;
        this.invSel = i;
        this.game.invDefaultAction();
      };
      g.appendChild(cell);
    }
    void cols;
    // detalhe
    const sel = items[this.invSel];
    if (sel) {
      const def = ITEMS[sel.id];
      this.el.invIcon.textContent = def.icon;
      this.el.invName.textContent = (sel.qty > 1 ? sel.qty + 'x ' : '') + def.name;
      let desc = def.desc;
      if (def.type === 'weapon' && WEAPONS[sel.id]) {
        const w = WEAPONS[sel.id];
        desc += def.ammo ? ` Munição: ${this.game.countItem(def.ammo)}.` : ' Não usa munição.';
        desc += ` Dano ${w.dmg}.`;
        if (sel.id === equipped) desc += ' [EQUIPADA]';
      }
      this.el.invDesc.textContent = desc;
      this.invCmds = def.type === 'weapon' ? ['use:Equipar', 'examine:Examinar']
        : def.type === 'heal' ? ['use:Usar', 'examine:Examinar']
          : ['examine:Examinar'];
    } else {
      this.el.invIcon.textContent = '—';
      this.el.invName.textContent = 'Vazio';
      this.el.invDesc.textContent = 'Nada aqui.';
      this.invCmds = [];
    }
    // comandos
    const c = this.el.invCmds;
    c.innerHTML = '';
    this.invCmds.forEach((cmd, i) => {
      const [act, label] = cmd.split(':');
      const b = document.createElement('button');
      b.className = 'cmdBtn' + (this.invMode === 'cmd' && i === this.invCmd ? ' sel' : '');
      b.textContent = label;
      b.onclick = (ev) => { ev.stopPropagation(); this.game.invCommand(act); };
      c.appendChild(b);
    });
    // lateral
    this.el.invObjective.textContent = data.objective;
    this.el.invPages.textContent = `PÁGINAS DO DIÁRIO: ${data.pages}/8`;
    this.el.invWeapon.textContent = `ARMA: ${ITEMS[equipped].name}`;
    this.el.invTime.textContent = data.time;
  }
  invNav(dx, dy) {
    const data = this.game.getInvData();
    const n = Math.max(data.items.length, 6);
    if (this.invMode === 'grid') {
      let s = this.invSel + dx + dy * 3;
      s = Math.max(0, Math.min(n - 1, s));
      if (s !== this.invSel) { this.audio.sfx('uiMove'); }
      this.invSel = s;
      this.renderInventory(data);
    } else {
      const m = this.invCmds.length;
      if (m === 0) return;
      this.invCmd = (this.invCmd + (dy !== 0 ? dy : dx) + m) % m;
      this.audio.sfx('uiMove');
      this.renderInventory(data);
    }
  }
  invConfirm() {
    const data = this.game.getInvData();
    if (this.invMode === 'grid') {
      if (!data.items[this.invSel]) { this.audio.sfx('uiBack'); return; }
      this.invMode = 'cmd'; this.invCmd = 0;
      this.audio.sfx('uiSelect');
      this.renderInventory(data);
    } else {
      const [act] = this.invCmds[this.invCmd].split(':');
      this.game.invCommand(act);
    }
  }
  invBack() {
    if (this.invMode === 'cmd') {
      this.invMode = 'grid';
      this.audio.sfx('uiBack');
      this.renderInventory(this.game.getInvData());
    } else {
      this.game.closeInventory();
    }
  }

  // ==================== COFRE ====================
  openSafe() {
    this.safeDigits = [0, 0, 0, 0]; this.safeSel = 0;
    this.renderSafe();
    this.show(this.el.safe);
  }
  closeSafe() { this.hide(this.el.safe); }
  renderSafe() {
    const d = this.el.safeDigits;
    d.innerHTML = '';
    this.safeDigits.forEach((v, i) => {
      const s = document.createElement('div');
      s.className = 'digit' + (i === this.safeSel ? ' sel' : '');
      s.textContent = v;
      s.onclick = () => { this.safeSel = i; this.audio.sfx('safeTick'); this.renderSafe(); };
      d.appendChild(s);
    });
  }
  safeNav(dx, dy) {
    if (dx !== 0) {
      this.safeSel = (this.safeSel + dx + 4) % 4;
      this.audio.sfx('uiMove');
    } else if (dy !== 0) {
      this.safeDigits[this.safeSel] = (this.safeDigits[this.safeSel] + dy + 10) % 10;
      this.audio.sfx('safeTick');
    }
    this.renderSafe();
  }
  get safeCode() { return this.safeDigits.join(''); }

  // ==================== SAVE ====================
  showSave() {
    this.saveSel = 0;
    this.renderSaveSel();
    this.show(this.el.saveBox);
  }
  hideSave() { this.hide(this.el.saveBox); }
  renderSaveSel() {
    this.$('saveYes').classList.toggle('sel', this.saveSel === 0);
    this.$('saveNo').classList.toggle('sel', this.saveSel === 1);
  }
  saveNav(dx) {
    this.saveSel = (this.saveSel + dx + 2) % 2;
    this.audio.sfx('uiMove');
    this.renderSaveSel();
  }

  // ==================== PAUSE ====================
  showPause() {
    this.menuIdx.pause = 0;
    this.renderPause();
    this.show(this.el.pause);
  }
  hidePause() { this.hide(this.el.pause); }
  renderPause() {
    const labels = { resume: 'CONTINUAR', help: 'COMO JOGAR', options: 'OPÇÕES', title: 'VOLTAR AO TÍTULO' };
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
      `TEMPO: ${data.time}<br>REGISTROS: ${data.saves}<br>PÁGINAS: ${data.pages}/8`;
    this.el.endMsg.innerHTML = data.msg;
    this.show(this.el.ending);
  }
  hideEnding() { this.hide(this.el.ending); }

  // ==================== PORTA (animação estilo RE) ====================
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
      // progresso da abertura
      const open = Math.max(0, Math.min(1, (t - 0.18) / 0.6));
      const gap = open * W * 0.42;
      // fundo (escuridão além da porta)
      const g = x.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, '#000');
      g.addColorStop(0.5, elevator ? '#0a1420' : '#0a0805');
      g.addColorStop(1, '#000');
      x.fillStyle = g;
      x.fillRect(W / 2 - gap - 4, 0, gap * 2 + 8, H);
      // folhas
      const drawLeaf = (left) => {
        const wdt = W / 2 - gap;
        const px = left ? 0 : W / 2 + gap;
        const grd = x.createLinearGradient(px, 0, px + (left ? wdt : -wdt), 0);
        grd.addColorStop(0, pal.d); grd.addColorStop(0.5, pal.l); grd.addColorStop(1, pal.d);
        x.fillStyle = grd;
        x.fillRect(left ? 0 : W / 2 + gap, 0, wdt, H);
        // painéis
        x.strokeStyle = pal.edge; x.lineWidth = 2;
        for (let i = 0; i < 3; i++) {
          const py = 20 + i * 50;
          if (left) x.strokeRect(14, py, Math.max(4, wdt - 28), 36);
          else x.strokeRect(W / 2 + gap + 14, py, Math.max(4, wdt - 28), 36);
        }
        // borda luminosa
        x.fillStyle = elevator ? '#9ad0ff' : '#c89858';
        x.fillRect(left ? wdt - 2 : W / 2 + gap, 0, 2, H);
      };
      drawLeaf(true); drawLeaf(false);
      // vinheta + fade final
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
  }
}
