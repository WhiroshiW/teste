// ============================================================
// SANTA LÚCIA - Módulo de Suporte a Controles (Gamepad API)
// Suporte Nativo: PlayStation 4 (DualShock 4) & Xbox (One/Series/360)
// Desenvolvido por Equipe Nakamura
// ============================================================

export class GamepadManager {
  constructor(game) {
    this.game = game;
    this.connected = false;
    this.padIndex = -1;
    this.controllerType = 'xbox'; // 'ps4' | 'xbox'
    this.name = '';

    this.prevButtons = [];
    this.prevShooting = false;
    this.debounceNav = 0;
    this.deadzone = 0.22;

    this.wireEvents();
  }

  wireEvents() {
    if (typeof window === 'undefined') return;

    window.addEventListener('gamepadconnected', (e) => {
      this.padIndex = e.gamepad.index;
      this.connected = true;
      this.identifyController(e.gamepad);
      const typeLabel = this.controllerType === 'ps4' ? 'DualShock 4 (PlayStation)' : 'Xbox Controller';
      this.game.ui.toast(`🎮 CONTROLE CONECTADO: ${typeLabel}`, 3.5);
      if (this.game.audio) this.game.audio.sfx('uiSelect');
      this.vibrate(0.3, 0.5, 220);
      this.updateUIControllerHints();
    });

    window.addEventListener('gamepaddisconnected', (e) => {
      if (e.gamepad.index === this.padIndex) {
        this.connected = false;
        this.padIndex = -1;
        this.game.ui.toast('⚠️ CONTROLE DESCONECTADO', 3);
        this.updateUIControllerHints();
      }
    });
  }

  identifyController(gp) {
    const id = (gp.id || '').toLowerCase();
    this.name = gp.id || 'Controle Padrão';
    if (id.includes('dualshock') || id.includes('dualsense') || id.includes('054c') || id.includes('playstation') || id.includes('sony')) {
      this.controllerType = 'ps4';
    } else {
      this.controllerType = 'xbox';
    }
  }

  getPad() {
    if (typeof navigator === 'undefined' || !navigator.getGamepads) return null;
    const pads = navigator.getGamepads();
    if (this.padIndex >= 0 && pads[this.padIndex]) {
      return pads[this.padIndex];
    }
    for (let i = 0; i < pads.length; i++) {
      if (pads[i]) {
        this.padIndex = i;
        this.connected = true;
        this.identifyController(pads[i]);
        return pads[i];
      }
    }
    this.connected = false;
    return null;
  }

  vibrate(weak = 0.4, strong = 0.6, duration = 180) {
    if (this.game.opts && this.game.opts.vibration === false) return;
    const pad = this.getPad();
    if (!pad || !pad.vibrationActuator) return;
    try {
      pad.vibrationActuator.playEffect('dual-rumble', {
        startDelay: 0,
        duration: duration,
        weakMagnitude: weak,
        strongMagnitude: strong,
      });
    } catch (e) {
      /* noop */
    }
  }

  update(dt) {
    const pad = this.getPad();
    if (!pad) return;

    const btns = pad.buttons.map(b => (typeof b === 'object' ? b.pressed : b > 0.5));
    const axes = pad.axes || [0, 0, 0, 0];

    const justPressed = (idx) => btns[idx] && !this.prevButtons[idx];

    const st = this.game.state;
    this.debounceNav = Math.max(0, this.debounceNav - dt);

    // ==================== 1. TELA DE TÍTULO ====================
    if (st === 'title') {
      const up = btns[12] || axes[1] < -0.4;
      const down = btns[13] || axes[1] > 0.4;
      if (this.debounceNav <= 0) {
        if (up) {
          this.game.ui.titleNav(-1);
          this.debounceNav = 0.22;
        } else if (down) {
          this.game.ui.titleNav(1);
          this.debounceNav = 0.22;
        }
      }

      // X (PS4) / A (Xbox) -> Confirmar
      if (justPressed(0)) {
        this.game.ui.titleConfirm();
      }
      // O (PS4) / B (Xbox) -> Voltar
      if (justPressed(1)) {
        if (!this.game.ui.el.campaignSelect.classList.contains('hidden')) {
          this.game.ui.hideCampaignSelect();
          this.game.ui.showTitle(this.game.hasSave());
        } else if (!this.game.ui.el.extraModes.classList.contains('hidden')) {
          this.game.ui.hideExtraModes();
          this.game.ui.showTitle(this.game.hasSave());
        } else if (!this.game.ui.el.options.classList.contains('hidden')) {
          this.game.ui.hideOptions();
          this.game.ui.showTitle(this.game.hasSave());
        }
      }
    }

    // ==================== 2. MENU DE CONFIGURAÇÕES ====================
    else if (st === 'options' || (this.game.ui.el.options && !this.game.ui.el.options.classList.contains('hidden'))) {
      // L1 / LB (4) e R1 / RB (5) -> Troca abas
      if (justPressed(4)) {
        this.cycleOptionsTab(-1);
      } else if (justPressed(5)) {
        this.cycleOptionsTab(1);
      }

      // D-Pad Esquerda (14) ou Direita (15) -> Ajusta opção
      if (this.debounceNav <= 0) {
        if (btns[14] || axes[0] < -0.4) {
          this.triggerOptionArrow('prev');
          this.debounceNav = 0.20;
        } else if (btns[15] || axes[0] > 0.4) {
          this.triggerOptionArrow('next');
          this.debounceNav = 0.20;
        }
      }

      // O (PS4) / B (Xbox) -> Fechar configurações
      if (justPressed(1)) {
        this.game.ui.hideOptions();
        if (this.game.optionsFrom === 'play') {
          this.game.state = 'play';
        } else {
          this.game.ui.showTitle(this.game.hasSave());
        }
        if (this.game.audio) this.game.audio.sfx('uiBack');
      }
    }

    // ==================== 3. INVENTÁRIO ====================
    else if (st === 'inventory' || (this.game.ui.el.inv && !this.game.ui.el.inv.classList.contains('hidden'))) {
      const up = btns[12] || axes[1] < -0.4;
      const down = btns[13] || axes[1] > 0.4;
      const left = btns[14] || axes[0] < -0.4;
      const right = btns[15] || axes[0] > 0.4;

      if (this.debounceNav <= 0) {
        if (up) { this.game.ui.invNav(-4); this.debounceNav = 0.18; }
        else if (down) { this.game.ui.invNav(4); this.debounceNav = 0.18; }
        else if (left) { this.game.ui.invNav(-1); this.debounceNav = 0.18; }
        else if (right) { this.game.ui.invNav(1); this.debounceNav = 0.18; }
      }

      // X (PS4) / A (Xbox) -> Usar / Equipar
      if (justPressed(0)) this.game.ui.invAction('use');
      // Quadrado (PS4) / X (Xbox) -> Combinar
      if (justPressed(2)) this.game.ui.invAction('combine');
      // O (PS4) / B (Xbox) ou Triângulo (PS4) / Y (Xbox) -> Fechar inventário
      if (justPressed(1) || justPressed(3)) this.game.closeInventory();
    }

    // ==================== 4. DIÁLOGO ====================
    else if (st === 'dialog' || (this.game.ui.el.dialog && !this.game.ui.el.dialog.classList.contains('hidden'))) {
      if (justPressed(0) || justPressed(1)) {
        this.game.ui.advanceDialog();
      }
    }

    // ==================== 5. JOGO ATIVO (GAMEPLAY) ====================
    else if (st === 'play') {
      const p = this.game.player;
      if (!p || p.dead) return;

      // Mira: L2 / LT (6) ou L1 / LB (4)
      const isAiming = btns[6] || btns[4] || (pad.buttons[6] && pad.buttons[6].value > 0.3);
      p.setAim(!!isAiming);
      this.game.ui.crosshair(!!isAiming);

      // Disparo: R2 / RT (7) ou R1 / RB (5) ou X/A enquanto mira
      const isShooting = btns[7] || btns[5] || (isAiming && btns[0]) || (pad.buttons[7] && pad.buttons[7].value > 0.4);
      if (isShooting && !this.prevShooting && isAiming) {
        this.game.shoot();
        this.vibrate(0.45, 0.85, 180);
      }
      this.prevShooting = isShooting;

      // Interagir / Pegar / Portas: X (PS4) / A (Xbox) quando NÃO mira
      if (!isAiming && justPressed(0)) {
        this.game.doPromptAction();
      }

      // Abrir Inventário: Triângulo (PS4) / Y (Xbox)
      if (justPressed(3)) {
        this.game.openInventory();
      }

      // Alternar Câmera PS1 / 3ª Pessoa: Select / Share / Back (8)
      if (justPressed(8)) {
        this.game.toggleCamMode();
      }

      // Menu de Opções / Pausa: Start / Options (9)
      if (justPressed(9)) {
        this.game.optionsFrom = 'play';
        this.game.ui.showOptions();
      }

      // Giro de câmera livre no modo chase com analógico direito
      if (this.game.camMode === 'chase' && Math.abs(axes[2]) > 0.15) {
        p.rot -= axes[2] * dt * 2.2;
      }
    }

    this.prevButtons = btns;
  }

  // Gera o objeto de movimento consumido por player.update
  getMoveInput() {
    const pad = this.getPad();
    if (!pad) return { f: false, b: false, l: false, r: false, run: false };

    const axes = pad.axes || [0, 0, 0, 0];
    const btns = pad.buttons.map(b => (typeof b === 'object' ? b.pressed : b > 0.5));

    const f = axes[1] < -this.deadzone || btns[12];
    const b = axes[1] > this.deadzone || btns[13];
    const l = axes[0] < -this.deadzone || btns[14];
    const r = axes[0] > this.deadzone || btns[15];
    const run = btns[1] || btns[10];

    return { f, b, l, r, run };
  }

  cycleOptionsTab(dir) {
    if (typeof document === 'undefined') return;
    const tabs = Array.from(document.querySelectorAll('.optTabItem'));
    if (!tabs.length) return;
    const curIdx = tabs.findIndex(t => t.classList.contains('active'));
    const nextIdx = (curIdx + dir + tabs.length) % tabs.length;
    tabs[nextIdx].click();
  }

  triggerOptionArrow(dir) {
    if (typeof document === 'undefined') return;
    const activePanel = document.querySelector('.optTabContent:not(.hidden)');
    if (!activePanel) return;
    const firstArrow = activePanel.querySelector(`.optArrowBtn.${dir}`);
    if (firstArrow) firstArrow.click();
  }

  updateUIControllerHints() {
    if (typeof document === 'undefined') return;
    const hint = document.querySelector('.optFooterHint');
    if (!hint) return;
    if (!this.connected) {
      hint.innerHTML = `
        <span class="optHintText">SELECIONE</span>
        <span class="optHintIcon">✚</span>
        <span class="optHintText">CONFIRME</span>
        <span class="optHintCircle">⭘</span>
      `;
      return;
    }

    if (this.controllerType === 'ps4') {
      hint.innerHTML = `
        <span class="optHintText">SELECIONE</span>
        <span class="optHintIcon" style="color:#70b0ff;">✚</span>
        <span class="optHintText">CONFIRME</span>
        <span class="optHintIcon" style="color:#70b0ff; font-weight:bold;">✕</span>
        <span class="optHintText">VOLTAR</span>
        <span class="optHintCircle" style="color:#e05555; font-weight:bold;">⭘</span>
        <span class="optHintText" style="margin-left:8px;">ABAS</span>
        <span class="optCtrlKey" style="font-size:10px;">L1 / R1</span>
      `;
    } else {
      hint.innerHTML = `
        <span class="optHintText">SELECIONE</span>
        <span class="optHintIcon" style="color:#55ff77;">✚</span>
        <span class="optHintText">CONFIRME</span>
        <span class="optHintIcon" style="color:#55ff77; font-weight:bold;">Ⓐ</span>
        <span class="optHintText">VOLTAR</span>
        <span class="optHintCircle" style="color:#e05555; font-weight:bold;">Ⓑ</span>
        <span class="optHintText" style="margin-left:8px;">ABAS</span>
        <span class="optCtrlKey" style="font-size:10px;">LB / RB</span>
      `;
    }
  }
}
