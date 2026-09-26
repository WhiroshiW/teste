// ============================================================
// SANTA LÚCIA - Equipe Nakamura - Interface: telas, HUD, inventário, diálogos, loja, extras
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
      roomTitleText: this.$('roomTitleText'), roomSubText: this.$('roomSubText'),
      hpText: this.$('hpText'), hpStatus: this.$('hpStatus'),
      ammoBox: this.$('ammoBox'), ammoText: this.$('ammoText'),
      ammoWeaponName: this.$('ammoWeaponName'), ammoIcon: this.$('ammoIcon'),
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
      invHeroName: this.$('invHeroName'), invCombineNotice: this.$('invCombineNotice'),
      ecgCanvas: this.$('ecgCanvas'), ecgStatus: this.$('ecgStatus'), ecgBpm: this.$('ecgBpm'),
      introCutscene: this.$('introCutscene'), introYearTag: this.$('introYearTag'),
      introQuoteText: this.$('introQuoteText'), introSkipBtn: this.$('introSkipBtn'),
      safe: this.$('safe'), safeDigits: this.$('safeDigits'),
      saveBox: this.$('saveBox'),
      saveHeroName: this.$('saveHeroName'), saveRoomName: this.$('saveRoomName'),
      saveCountVal: this.$('saveCountVal'), saveTimeVal: this.$('saveTimeVal'),
      saveRibbonVal: this.$('saveRibbonVal'), saveStamp: this.$('saveStamp'),
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
    this.combineSource = null;
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

  // ==================== TÍTULO (LAYOUT IDÊNTICO À IMAGEM DE REFERÊNCIA) ====================
  showTitle(hasSave) {
    this.show(this.el.title);
    this.titleItems = ['play', 'load', 'options', 'extras'];
    this.menuIdx.title = 0;
    this.renderTitleMenu(hasSave);
    this.startTitleRain();
    this.startTitle3DParallax();
  }
  hideTitle() {
    this.hide(this.el.title);
    this.stopTitleRain();
    this.stopTitle3DParallax();
  }

  // ==================== DIORAMA 3D PARALLAX COM DEPTH MAP ====================
  startTitle3DParallax() {
    const cvs = this.$('title3DCanvas');
    if (!cvs || typeof cvs.getContext !== 'function') return;

    let gl = null;
    try {
      gl = cvs.getContext('webgl', { antialias: true, alpha: true }) || cvs.getContext('experimental-webgl');
    } catch (e) {
      gl = null;
    }
    if (!gl || typeof gl.createShader !== 'function' || typeof gl.viewport !== 'function') return; // Fallback gracioso automático para o background CSS 2D

    const resize = () => {
      cvs.width = (typeof window !== 'undefined' && window.innerWidth) || 1280;
      cvs.height = (typeof window !== 'undefined' && window.innerHeight) || 720;
      gl.viewport(0, 0, cvs.width, cvs.height);
    };
    resize();
    if (typeof window !== 'undefined' && window.addEventListener) {
      window.addEventListener('resize', resize);
      this._title3DResize = resize;
    }

    const vsSource = `
      attribute vec2 aPos;
      varying vec2 vUv;
      void main() {
        vUv = aPos * 0.5 + 0.5;
        vUv.y = 1.0 - vUv.y;
        gl_Position = vec4(aPos, 0.0, 1.0);
      }
    `;

    const fsSource = `
      precision highp float;
      uniform sampler2D uTexture;
      uniform sampler2D uDepth;
      uniform vec2 uOffset;
      uniform float uTime;
      uniform float uLightning;
      varying vec2 vUv;

      void main() {
        float rawDepth = texture2D(uDepth, vUv).r;
        vec2 disp = uOffset * (rawDepth - 0.45);
        vec2 uv = clamp(vUv - disp, 0.001, 0.999);

        vec4 baseColor = texture2D(uTexture, uv);
        float depth = texture2D(uDepth, uv).r;

        // 1. Cintilação e pulsação quente das janelas e lanternas
        float isWarm = step(0.44, baseColor.r) * step(0.28, baseColor.g) * step(baseColor.b, baseColor.g * 0.9);
        float isBuilding = smoothstep(0.25, 0.35, depth);
        float windowMask = isWarm * isBuilding;
        float flicker = (sin(uTime * 3.7) * 0.45 + sin(uTime * 8.3) * 0.35 + sin(uTime * 14.1) * 0.2) * 0.35;
        baseColor.rgb += vec3(0.42, 0.28, 0.08) * windowMask * flicker;

        // 2. Reflexo molhado nos paralelepípedos durante o relâmpago
        float isGround = smoothstep(0.48, 0.95, depth) * smoothstep(0.55, 0.98, uv.y);
        float wetReflection = isGround * uLightning * 0.55;
        baseColor.rgb += vec3(0.60, 0.70, 0.90) * wetReflection;

        // 3. Efeito 3D de clarão do relâmpago iluminando as superfícies
        baseColor.rgb += baseColor.rgb * (uLightning * 0.65);

        // 4. Névoa volumétrica 3D rastejando no ar entre o primeiro plano e a mansão
        float fogX = uv.x * 2.0 + uTime * 0.02;
        float fogVal = sin(fogX * 6.28) * 0.5 + 0.5;
        float fogZone = smoothstep(0.45, 0.78, uv.y) * (1.0 - smoothstep(0.85, 1.0, uv.y));
        float fogPlane = smoothstep(0.25, 0.55, depth) * (1.0 - smoothstep(0.75, 0.95, depth));
        baseColor.rgb += vec3(0.08, 0.12, 0.18) * (fogVal * fogZone * fogPlane * 0.25);

        gl_FragColor = baseColor;
      }
    `;

    function compileShader(type, src) {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return s;
    }

    const prog = gl.createProgram();
    gl.attachShader(prog, compileShader(gl.VERTEX_SHADER, vsSource));
    gl.attachShader(prog, compileShader(gl.FRAGMENT_SHADER, fsSource));
    gl.linkProgram(prog);
    gl.useProgram(prog);

    const posBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      -1, -1,
       1, -1,
      -1,  1,
      -1,  1,
       1, -1,
       1,  1,
    ]), gl.STATIC_DRAW);

    const aPos = gl.getAttribLocation(prog, 'aPos');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const uTexLoc = gl.getUniformLocation(prog, 'uTexture');
    const uDepthLoc = gl.getUniformLocation(prog, 'uDepth');
    const uOffsetLoc = gl.getUniformLocation(prog, 'uOffset');
    const uTimeLoc = gl.getUniformLocation(prog, 'uTime');
    const uLightLoc = gl.getUniformLocation(prog, 'uLightning');

    function createTex(img) {
      const t = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
      return t;
    }

    let isReady = false;
    let loaded = 0;
    const bgImg = new Image();
    const depthImg = new Image();
    const onImgLoad = () => {
      loaded++;
      if (loaded === 2) {
        gl.useProgram(prog);
        const t0 = createTex(bgImg);
        const t1 = createTex(depthImg);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, t0);
        gl.uniform1i(uTexLoc, 0);
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, t1);
        gl.uniform1i(uDepthLoc, 1);
        isReady = true;
        cvs.style.opacity = '1';
      }
    };
    bgImg.onload = onImgLoad;
    depthImg.onload = onImgLoad;
    const ts = Date.now();
    bgImg.src = './assets/title_bg.jpg?t=' + ts;
    depthImg.src = './assets/title_depth.jpg?t=' + ts;

    let mouseX = 0, mouseY = 0;
    let targetX = 0, targetY = 0;

    const onMouseMove = (e) => {
      const cx = (window.innerWidth || 1280) * 0.5;
      const cy = (window.innerHeight || 720) * 0.5;
      targetX = ((e.clientX - cx) / cx) * 0.024;
      targetY = ((e.clientY - cy) / cy) * 0.018;
    };
    if (typeof window !== 'undefined' && window.addEventListener) {
      window.addEventListener('mousemove', onMouseMove);
      this._title3DMouseMove = onMouseMove;
    }

    let startTime = Date.now();
    const renderLoop = () => {
      if (!this.el.title || (this.el.title.classList && this.el.title.classList.contains('hidden'))) return;
      const t = (Date.now() - startTime) * 0.001;

      if (isReady) {
        mouseX += (targetX - mouseX) * 0.05;
        mouseY += (targetY - mouseY) * 0.05;

        // Respiração cinematográfica autônoma da câmera (dolly lento)
        const breatheX = Math.sin(t * 0.38) * 0.012;
        const breatheY = Math.cos(t * 0.28) * 0.007;

        this._titleLightningVal = Math.max(0, (this._titleLightningVal || 0) * 0.88);

        gl.useProgram(prog);
        gl.uniform2f(uOffsetLoc, mouseX + breatheX, mouseY + breatheY);
        gl.uniform1f(uTimeLoc, t);
        gl.uniform1f(uLightLoc, this._titleLightningVal);

        gl.drawArrays(gl.TRIANGLES, 0, 6);
      }

      if (typeof requestAnimationFrame === 'function') {
        this._title3DRaf = requestAnimationFrame(renderLoop);
      }
    };

    if (typeof requestAnimationFrame === 'function') {
      if (this._title3DRaf) cancelAnimationFrame(this._title3DRaf);
      this._title3DRaf = requestAnimationFrame(renderLoop);
    }
  }

  stopTitle3DParallax() {
    if (this._title3DRaf && typeof cancelAnimationFrame === 'function') {
      cancelAnimationFrame(this._title3DRaf);
      this._title3DRaf = null;
    }
    if (this._title3DMouseMove && typeof window !== 'undefined' && window.removeEventListener) {
      window.removeEventListener('mousemove', this._title3DMouseMove);
      this._title3DMouseMove = null;
    }
    if (this._title3DResize && typeof window !== 'undefined' && window.removeEventListener) {
      window.removeEventListener('resize', this._title3DResize);
      this._title3DResize = null;
    }
    const cvs = this.$('title3DCanvas');
    if (cvs) cvs.style.opacity = '0';
  }

  startTitleRain() {
    const cvs = this.$('titleRainCanvas');
    if (!cvs || !cvs.getContext) return;
    const ctx = cvs.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      cvs.width = (typeof window !== 'undefined' && window.innerWidth) || 800;
      cvs.height = (typeof window !== 'undefined' && window.innerHeight) || 600;
    };
    resize();
    if (typeof window !== 'undefined' && window.addEventListener) {
      window.addEventListener('resize', resize);
      this._titleResize = resize;
    }

    // Camadas de chuva de profundidade cinematográfica
    const layers = [
      { count: 160, spdMin: 12, spdMax: 17, lenMin: 10, lenMax: 18, alpha: 0.16, width: 0.75, windFactor: 0.5 },
      { count: 110, spdMin: 19, spdMax: 26, lenMin: 20, lenMax: 32, alpha: 0.28, width: 1.0,  windFactor: 0.8 },
      { count: 32,  spdMin: 30, spdMax: 42, lenMin: 38, lenMax: 56, alpha: 0.45, width: 1.4,  windFactor: 1.1 },
    ];

    const drops = [];
    layers.forEach((layer, layerIdx) => {
      for (let i = 0; i < layer.count; i++) {
        drops.push({
          layer: layerIdx,
          x: Math.random() * (cvs.width + 300) - 150,
          y: Math.random() * cvs.height,
          len: layer.lenMin + Math.random() * (layer.lenMax - layer.lenMin),
          spd: layer.spdMin + Math.random() * (layer.spdMax - layer.spdMin),
          alpha: layer.alpha * (0.8 + Math.random() * 0.4),
          width: layer.width,
          windFactor: layer.windFactor,
        });
      }
    });

    // Ondulações / micro-respingos no chão (splashes)
    const splashes = [];
    const maxSplashes = 28;

    let lightningActive = false;
    let lastLightning = Date.now();
    let nextLightningDelay = 5000 + Math.random() * 6000;
    let animTime = 0;

    const loop = () => {
      if (!this.el.title || (this.el.title.classList && this.el.title.classList.contains('hidden'))) return;
      animTime += 0.016;
      ctx.clearRect(0, 0, cvs.width, cvs.height);

      // Leve brisa orgânica para a direita (alinhada com a tempestade de fundo)
      const baseWind = 1.2 + Math.sin(animTime * 0.4) * 0.4;

      // 1. Renderiza as gotas de chuva por camada de profundidade
      for (let lIdx = 0; lIdx < 3; lIdx++) {
        const layerDrops = drops.filter(d => d.layer === lIdx);
        if (!layerDrops.length) continue;

        ctx.beginPath();
        for (const d of layerDrops) {
          const wind = baseWind * d.windFactor;
          const endX = d.x + wind * (d.len * 0.07);
          const endY = d.y + d.len;

          ctx.moveTo(d.x, d.y);
          ctx.lineTo(endX, endY);

          d.x += wind * 0.25;
          d.y += d.spd;

          // Ao atingir o chão molhado e calçamento
          if (d.y > cvs.height) {
            if (d.layer >= 1 && splashes.length < maxSplashes && Math.random() < 0.28) {
              splashes.push({
                x: d.x,
                y: cvs.height - 4 - Math.random() * (cvs.height * 0.28),
                radius: 1.5 + Math.random() * 3.5,
                maxRadius: 4.0 + Math.random() * 5.0,
                alpha: (d.layer === 2 ? 0.35 : 0.2),
                life: 1.0,
              });
            }
            d.y = -d.len - Math.random() * 20;
            d.x = Math.random() * (cvs.width + 300) - 150;
          }
        }

        const baseColor = lightningActive ? '230, 240, 255' : '195, 210, 230';
        const layerAlpha = (layers[lIdx].alpha * (lightningActive ? 1.8 : 1.0)).toFixed(2);
        ctx.strokeStyle = `rgba(${baseColor}, ${layerAlpha})`;
        ctx.lineWidth = layers[lIdx].width;
        ctx.lineCap = 'round';
        ctx.stroke();
      }

      // 2. Micro-impactos / ondulações no chão molhado
      if (splashes.length > 0) {
        for (let i = splashes.length - 1; i >= 0; i--) {
          const s = splashes[i];
          s.radius += (s.maxRadius - s.radius) * 0.16;
          s.life -= 0.06;
          if (s.life <= 0) {
            splashes.splice(i, 1);
            continue;
          }
          ctx.beginPath();
          if (ctx.ellipse) {
            ctx.ellipse(s.x, s.y, s.radius * 1.8, s.radius * 0.6, 0, 0, Math.PI * 2);
          } else {
            ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
          }
          ctx.strokeStyle = `rgba(215, 230, 248, ${(s.alpha * s.life).toFixed(2)})`;
          ctx.lineWidth = 0.8;
          ctx.stroke();
        }
      }

      // 3. Névoa sutil de umidade no rodapé
      const mistGrad = ctx.createLinearGradient(0, cvs.height - 180, 0, cvs.height);
      mistGrad.addColorStop(0, 'rgba(8, 12, 18, 0)');
      mistGrad.addColorStop(1, 'rgba(12, 18, 28, 0.16)');
      ctx.fillStyle = mistGrad;
      ctx.fillRect(0, cvs.height - 180, cvs.width, 180);

      // 4. Relâmpagos ocasionais integrados
      const now = Date.now();
      if (now - lastLightning > nextLightningDelay) {
        lastLightning = now;
        nextLightningDelay = 5500 + Math.random() * 8000;
        const flash = this.$('titleLightningFlash');
        lightningActive = true;
        this._titleLightningVal = 1.0;
        if (flash) {
          flash.style.opacity = '0.35';
          setTimeout(() => { if (flash) flash.style.opacity = '0.08'; this._titleLightningVal = 0.2; }, 60);
          setTimeout(() => { if (flash) flash.style.opacity = '0.42'; this._titleLightningVal = 1.0; }, 120);
          setTimeout(() => {
            if (flash) flash.style.opacity = '0';
            lightningActive = false;
          }, 240);
        } else {
          setTimeout(() => { lightningActive = false; }, 240);
        }
        if (this.audio) this.audio.sfx('thunder');
      }

      if (typeof requestAnimationFrame === 'function') {
        this._titleRainRaf = requestAnimationFrame(loop);
      }
    };

    if (typeof requestAnimationFrame === 'function') {
      if (this._titleRainRaf) cancelAnimationFrame(this._titleRainRaf);
      this._titleRainRaf = requestAnimationFrame(loop);
    }
  }

  stopTitleRain() {
    if (this._titleRainRaf && typeof cancelAnimationFrame === 'function') {
      cancelAnimationFrame(this._titleRainRaf);
      this._titleRainRaf = null;
    }
    if (this._titleResize && typeof window !== 'undefined' && window.removeEventListener) {
      window.removeEventListener('resize', this._titleResize);
      this._titleResize = null;
    }
  }

  renderTitleMenu(hasSave) {
    const labels = {
      play: 'JOGAR',
      load: 'CARREGAR',
      options: 'CONFIGURAÇÕES',
      extras: 'EXTRA',
      // compatibilidade retroativa
      new: 'JOGAR',
      continue: 'CARREGAR',
      intro: 'ASSISTIR INTRO',
      shop: 'EXTRA',
      help: 'AJUDA',
    };
    this.el.titleMenu.innerHTML = '';
    this.titleItems.forEach((act, i) => {
      const isSel = (i === this.menuIdx.title);
      const d = document.createElement('div');
      d.className = 'menuItem' + (isSel ? ' sel' : '');
      d.innerHTML = `<span class="selCheck">✔</span><span class="menuText">${labels[act] || act.toUpperCase()}</span>`;
      d.onclick = () => { this.menuIdx.title = i; this.audio.sfx('uiSelect'); this.game.titleAction(act); };
      d.onmouseenter = () => {
        if (this.menuIdx.title !== i) {
          this.menuIdx.title = i;
          this.audio.sfx('uiMove');
          this.renderTitleMenu(hasSave);
        }
      };
      this.el.titleMenu.appendChild(d);
    });
    const info = this.$('titleSaveInfo');
    if (info) {
      info.textContent = hasSave ? '• SALVAMENTO DISPONÍVEL NA MÁQUINA DE ESCREVER' : '';
    }
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

  // ==================== LOJA DE PONTOS & MODELOS 3D (FOLHA DO MEIO) ====================
  showShop(points, unlocks) {
    if (this.el.shopPointsVal) this.el.shopPointsVal.textContent = points.toLocaleString();
    this.setupGallery3D();
    const list = this.el.shopList;
    list.innerHTML = '';

    const modelMap = {
      model_viewer: 'daniel',
      extra_mercenaries: 'aberracao',
      extra_survivor: 'vulto',
      extra_bento: 'bento',
      skin_clara_classic: 'clara',
      skin_daniel_battered: 'daniel',
      infinite_ammo: 'alencastro',
      infinite_ink: 'enfermeira',
    };

    let activeItem = SHOP_ITEMS[0];

    const selectShopItem = (it, row) => {
      list.querySelectorAll('.shopItem').forEach((r) => r.classList.remove('sel'));
      if (row) row.classList.add('sel');
      activeItem = it;
      const modelId = modelMap[it.id] || 'daniel';
      this.updateGalleryItem(modelId);
      if (this.el.galleryName) this.el.galleryName.textContent = it.name.toUpperCase();
      if (this.el.gallerySub) this.el.gallerySub.textContent = unlocks[it.id] ? '✓ ITEM DESBLOQUEADO' : `VALOR: ${it.cost.toLocaleString()} PONTOS`;
      if (this.el.galleryBio) this.el.galleryBio.textContent = it.desc;

      const actRow = this.$('extraActionRow');
      if (actRow) {
        actRow.innerHTML = '';
        const bought = !!unlocks[it.id];
        const btn = document.createElement('button');
        btn.className = 'btn' + (bought ? '' : ' lockedBtn');
        if (bought) {
          if (it.id === 'extra_mercenaries') {
            btn.textContent = '▶ JOGAR MERCENÁRIOS';
            btn.onclick = () => { this.hideAllOverlays(); this.game.startMercenaries(); };
          } else if (it.id === 'extra_survivor') {
            btn.textContent = '▶ JOGAR SOBREVIVENTE';
            btn.onclick = () => { this.hideAllOverlays(); this.game.startSurvivor(); };
          } else if (it.id === 'extra_bento') {
            btn.textContent = '▶ JOGAR TURNO DO BENTO';
            btn.onclick = () => { this.hideAllOverlays(); this.game.startCampaign('bento'); };
          } else {
            btn.textContent = '✓ DESBLOQUEADO (GIRAR 360°)';
          }
        } else {
          btn.textContent = `🛒 COMPRAR (${it.cost.toLocaleString()} PTS)`;
          btn.onclick = () => {
            this.game.buyShopItem(it);
            selectShopItem(it, row);
          };
        }
        actRow.appendChild(btn);
      }
    };

    SHOP_ITEMS.forEach((it, idx) => {
      const row = document.createElement('div');
      const bought = !!unlocks[it.id];
      row.className = 'shopItem' + (bought ? ' bought' : '') + (idx === 0 ? ' sel' : '');
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
          btn.onclick = (e) => { e.stopPropagation(); selectShopItem(it, row); };
        } else if (it.id === 'extra_mercenaries') {
          btn.textContent = 'JOGAR';
          btn.onclick = (e) => { e.stopPropagation(); this.hideAllOverlays(); this.game.startMercenaries(); };
        } else if (it.id === 'extra_survivor') {
          btn.textContent = 'JOGAR';
          btn.onclick = (e) => { e.stopPropagation(); this.hideAllOverlays(); this.game.startSurvivor(); };
        } else if (it.id === 'extra_bento') {
          btn.textContent = 'JOGAR';
          btn.onclick = (e) => { e.stopPropagation(); this.hideAllOverlays(); this.game.startCampaign('bento'); };
        } else {
          btn.textContent = '✓';
          btn.disabled = true;
        }
      } else {
        btn.textContent = 'COMPRAR';
        btn.onclick = (e) => {
          e.stopPropagation();
          this.game.buyShopItem(it);
        };
      }

      if (right) right.appendChild(btn);
      else row.appendChild(btn);

      row.onclick = () => {
        this.audio.sfx('uiMove');
        selectShopItem(it, row);
      };

      list.appendChild(row);
    });

    selectShopItem(SHOP_ITEMS[0], list.children[0]);
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
  showOptions() {
    this.show(this.el.options);
    this.syncOptionsUI();
  }
  hideOptions() { this.hide(this.el.options); }

  // ==================== PAINEL DE CONFIGURAÇÕES INDUSTRIAL ====================
  initOptionsPanel() {
    if (typeof document === 'undefined' || typeof document.querySelectorAll !== 'function') return;

    // 1. Alternância de abas com ícones
    const tabs = document.querySelectorAll('.optTabItem');
    tabs.forEach((tab) => {
      tab.onclick = () => {
        const targetTab = tab.getAttribute('data-tab');
        tabs.forEach((t) => t.classList.remove('active'));
        tab.classList.add('active');

        document.querySelectorAll('.optTabContent').forEach((c) => c.classList.add('hidden'));
        const activeContent = this.$(`tabContent_${targetTab}`);
        if (activeContent) activeContent.classList.remove('hidden');
        if (this.audio) this.audio.sfx('uiMove');
      };
    });

    // Alternância de abas de controle (Gamepad vs Teclado)
    const ctrlTabs = document.querySelectorAll('.optCtrlTabBtn');
    ctrlTabs.forEach((btn) => {
      btn.onclick = () => {
        const mode = btn.getAttribute('data-ctrl');
        ctrlTabs.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        document.querySelectorAll('.ctrlSchemeView').forEach((v) => v.classList.add('hidden'));
        const targetView = this.$(`ctrlScheme_${mode}`);
        if (targetView) targetView.classList.remove('hidden');
        if (this.audio) this.audio.sfx('uiMove');
      };
    });

    // 2. Opções interativas com setas ❮ e ❯
    const optionDefs = {
      difficulty: {
        items: ['Fácil', 'Normal', 'Difícil (Pesadelo)'],
        get: () => this.game.opts.difficulty || 'Normal',
        set: (v) => { this.game.opts.difficulty = v; this.game.saveOpts(); },
      },
      cam: {
        items: ['Fixa PS1', '3ª Pessoa Livre'],
        get: () => (this.game.camMode === 'chase' ? '3ª Pessoa Livre' : 'Fixa PS1'),
        set: (v) => { this.game.setCamMode(v === '3ª Pessoa Livre' ? 'chase' : 'fixed'); },
      },
      vibration: {
        items: ['Ativado', 'Desativado'],
        get: () => (this.game.opts.vibration === false ? 'Desativado' : 'Ativado'),
        set: (v) => { this.game.opts.vibration = (v === 'Ativado'); this.game.saveOpts(); },
      },
      hints: {
        items: ['Ativado', 'Desativado'],
        get: () => (this.game.opts.hints === false ? 'Desativado' : 'Ativado'),
        set: (v) => { this.game.opts.hints = (v === 'Ativado'); this.game.saveOpts(); },
      },
      infAmmo: {
        items: ['Desativado', 'Ativado'],
        get: () => (this.game.infiniteAmmo ? 'Ativado' : 'Desativado'),
        set: (v) => {
          if (v === 'Ativado' && !this.game.unlocks.infinite_ammo) {
            this.toast('Disponível na Loja de Recompensas!', 2.5);
            return;
          }
          this.game.setInfiniteAmmo(v === 'Ativado');
        },
      },
      voice: {
        items: ['Ativado', 'Desativado'],
        get: () => (this.game.opts.voice === false ? 'Desativado' : 'Ativado'),
        set: (v) => { this.game.opts.voice = (v === 'Ativado'); this.game.saveOpts(); },
      },
      crt: {
        items: ['Ativado', 'Desativado'],
        get: () => (this.game.opts.crt === false ? 'Desativado' : 'Ativado'),
        set: (v) => { this.game.setCrt(v === 'Ativado'); },
      },
      filter: {
        items: ['Padrão PS1', 'Fita VHS', 'Sépia Retrô'],
        get: () => (this.game.opts.filter === 'vhs' ? 'Fita VHS' : this.game.opts.filter === 'sepia' ? 'Sépia Retrô' : 'Padrão PS1'),
        set: (v) => {
          const map = { 'Padrão PS1': 'none', 'Fita VHS': 'vhs', 'Sépia Retrô': 'sepia' };
          this.game.setFilter(map[v] || 'none');
        },
      },
      res: {
        items: ['PS1 Autêntico', 'Alta Definição'],
        get: () => (this.game.opts.high ? 'Alta Definição' : 'PS1 Autêntico'),
        set: (v) => { this.game.setQuality(v === 'Alta Definição'); },
      },
      lang: {
        items: ['Português (BR)', 'English (US)', 'Español'],
        get: () => (this.game.opts.lang || 'Português (BR)'),
        set: (v) => { this.game.opts.lang = v; this.game.saveOpts(); },
      },
      lang2: {
        items: ['Português (BR)', 'English (US)', 'Español'],
        get: () => (this.game.opts.lang || 'Português (BR)'),
        set: (v) => { this.game.opts.lang = v; this.game.saveOpts(); },
      },
      subtitles: {
        items: ['Ativado', 'Desativado'],
        get: () => (this.game.opts.subtitles === false ? 'Desativado' : 'Ativado'),
        set: (v) => { this.game.opts.subtitles = (v === 'Ativado'); this.game.saveOpts(); },
      },
    };

    this._optDefs = optionDefs;

    document.querySelectorAll('.optSettingControl').forEach((ctrl) => {
      const key = ctrl.getAttribute('data-opt');
      const def = optionDefs[key];
      if (!def) return;

      const valEl = ctrl.querySelector('.optSettingVal');
      const prevBtn = ctrl.querySelector('.optArrowBtn.prev');
      const nextBtn = ctrl.querySelector('.optArrowBtn.next');

      const update = (dir) => {
        const cur = def.get();
        const idx = def.items.indexOf(cur);
        const nextIdx = (idx + dir + def.items.length) % def.items.length;
        const nextVal = def.items[nextIdx];
        def.set(nextVal);
        if (valEl) valEl.textContent = def.get();
        if (this.audio) this.audio.sfx('uiSelect');
      };

      if (prevBtn) prevBtn.onclick = (e) => { e.preventDefault(); update(-1); };
      if (nextBtn) nextBtn.onclick = (e) => { e.preventDefault(); update(1); };
    });

    // 3. Sliders de Metal
    const wireSlider = (id, pctId, onVal) => {
      const el = this.$(id);
      const pct = this.$(pctId);
      if (!el) return;
      el.oninput = () => {
        const v = parseFloat(el.value);
        if (pct) pct.textContent = Math.round((v / parseFloat(el.max)) * 100) + '%';
        onVal(v);
      };
    };

    wireSlider('val_master', 'pct_master', (v) => this.game.setVolume('master', v / 10));
    wireSlider('val_music', 'pct_music', (v) => this.game.setVolume('music', v / 10));
    wireSlider('val_sfx', 'pct_sfx', (v) => this.game.setVolume('sfx', v / 10));

    const brightEl = this.$('val_brightness');
    const brightPct = this.$('pct_brightness');
    if (brightEl) {
      brightEl.oninput = () => {
        const map = { 1: ['normal', '50%'], 2: ['high', '70%'], 3: ['max', '100%'] };
        const [lvl, label] = map[brightEl.value] || ['high', '70%'];
        if (brightPct) brightPct.textContent = label;
        this.game.setBrightness(lvl);
      };
    }

    // 4. Restaurar Padrões
    const restoreBtn = this.$('optRestoreBtn');
    if (restoreBtn) {
      restoreBtn.onclick = () => {
        this.game.opts = {
          master: 0.9, music: 0.8, sfx: 0.9, crt: true, high: false,
          brightness: 'high', filter: 'none', cam: 'fixed', infAmmo: false,
          difficulty: 'Normal', vibration: true, hints: true, voice: true,
          lang: 'Português (BR)', subtitles: true,
        };
        this.game.camMode = 'fixed';
        this.game.infiniteAmmo = false;
        this.game.applyOpts();
        this.game.saveOpts();
        this.syncOptionsUI();
        if (this.audio) this.audio.sfx('uiSelect');
        this.toast('✓ Configurações restauradas para o padrão industrial.', 3);
      };
    }
  }

  syncOptionsUI() {
    if (!this._optDefs) return;
    Object.keys(this._optDefs).forEach((k) => {
      const def = this._optDefs[k];
      const el = this.$(`val_${k}`);
      if (el) el.textContent = def.get();
    });

    const setSlider = (id, pctId, val, max = 10) => {
      const el = this.$(id);
      const pct = this.$(pctId);
      if (el) el.value = val;
      if (pct) pct.textContent = Math.round((val / max) * 100) + '%';
    };

    setSlider('val_master', 'pct_master', (this.game.opts.master || 0.9) * 10);
    setSlider('val_music', 'pct_music', (this.game.opts.music || 0.8) * 10);
    setSlider('val_sfx', 'pct_sfx', (this.game.opts.sfx || 0.9) * 10);

    const brightEl = this.$('val_brightness');
    const brightPct = this.$('pct_brightness');
    if (brightEl) {
      const bMap = { normal: [1, '50%'], high: [2, '70%'], max: [3, '100%'] };
      const [v, lbl] = bMap[this.game.opts.brightness] || [2, '70%'];
      brightEl.value = v;
      if (brightPct) brightPct.textContent = lbl;
    }
  }

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
    click('optTestSpark', () => {
      this.audio.sfx('spark');
      this.toast('⚡ TESTE DO PAINEL ELÉTRICO: CIRCUITO NOMINAL DE 220V ESTABILIZADO.', 3);
      const pilot = document.querySelector('.pilotLight');
      if (pilot) {
        pilot.style.background = '#ffd700';
        pilot.style.boxShadow = '0 0 25px #ffd700';
        setTimeout(() => {
          pilot.style.background = '#33ff55';
          pilot.style.boxShadow = '0 0 10px #33ff55';
        }, 500);
      }
    });
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

    this.initOptionsPanel();
  }

  // ==================== HUD ====================
  showHud(b) { b ? this.show(this.el.hud) : this.hide(this.el.hud); }
  room(name, sub = '') {
    if (this.el.roomTitleText) this.el.roomTitleText.textContent = name;
    else if (this.el.roomName) this.el.roomName.textContent = name;
    if (this.el.roomSubText) this.el.roomSubText.textContent = sub;
    if (this.el.roomName) {
      this.el.roomName.classList.remove('hidden');
      this.el.roomName.style.opacity = 1;
    }
    this.roomTimer = 3.6;
  }
  hp(hp) {
    const st = healthStatus(hp);
    if (this.el.hpText) this.el.hpText.textContent = `${Math.max(0, Math.ceil(hp))} HP`;
    const s = this.el.hpStatus;
    if (s) {
      s.textContent = st.label;
      s.className = 'hpStatus ' + st.cls;
    }
  }
  ammo(weaponName, ammoStr, icon = '🔫', visible = true) {
    if (!this.el.ammoBox) return;
    this.el.ammoBox.classList.toggle('hidden', !visible);
    if (this.el.ammoWeaponName) this.el.ammoWeaponName.textContent = weaponName ? weaponName.toUpperCase() : '';
    if (this.el.ammoIcon) this.el.ammoIcon.textContent = icon;
    if (this.el.ammoText) this.el.ammoText.textContent = ammoStr;
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
    this.combineSource = null;
    this.renderInventory();
    this.show(this.el.inv);
  }
  hideInventory() {
    this.combineSource = null;
    this.hide(this.el.inv);
  }

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
    const SLOTS = 12;

    if (this.el.invCombineNotice) {
      this.el.invCombineNotice.classList.toggle('hidden', this.combineSource === null);
    }

    for (let i = 0; i < SLOTS; i++) {
      const it = inv[i];
      const slot = document.createElement('div');
      const isSel = i === this.invSel;
      const isComb = this.combineSource === i;
      slot.className = 'invCell' + (isSel ? ' sel' : '') + (isComb ? ' combining' : '') + (it ? (it.equipped ? ' equipped' : '') : ' empty');
      if (it) {
        const itemCfg = ITEMS[it.item] || { name: it.item, icon: '📦' };
        const num = it.qty > 1 ? `<span class="invQty">${it.qty}</span>` : '';
        slot.innerHTML = `<span class="invIcon">${itemCfg.icon}</span>${num}`;
      } else {
        slot.innerHTML = '<span class="invIcon" style="opacity:0.25">◻</span>';
      }

      slot.onclick = () => {
        if (this.combineSource !== null) {
          if (this.combineSource === i) {
            this.combineSource = null;
            this.audio.sfx('uiBack');
            this.renderInventory();
            return;
          }
          const srcIdx = this.combineSource;
          this.combineSource = null;
          this.game.combineItems(srcIdx, i);
          this.renderInventory();
          return;
        }
        this.invSel = i;
        this.invMode = 'grid';
        this.audio.sfx('uiMove');
        this.renderInventory();
      };

      slot.ondblclick = () => {
        if (it) {
          const cfg = ITEMS[it.item];
          if (cfg && cfg.type === 'weapon') {
            this.game.equipWeapon(it);
            this.renderInventory();
          } else if (cfg && cfg.type === 'heal') {
            this.game.useItem(it);
            this.renderInventory();
          }
        }
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
    const cfg = ITEMS[it.item] || { name: it.item, icon: '📦', desc: '', type: 'item' };
    this.el.invIcon.textContent = cfg.icon;
    this.el.invName.textContent = cfg.name + (it.qty > 1 ? ` (x${it.qty})` : '') + (it.equipped ? ' [EQUIPADA]' : '');
    this.el.invDesc.textContent = cfg.desc;

    this.invCmds = [];
    if (cfg.type === 'weapon') this.invCmds.push(it.equipped ? 'DESEQUIPAR' : 'EQUIPAR');
    if (cfg.type === 'heal') this.invCmds.push('USAR');
    if (cfg.type === 'page') this.invCmds.push('LER');
    this.invCmds.push('COMBINAR');
    this.invCmds.push('EXAMINAR');

    this.el.invCmds.innerHTML = '';
    this.invCmds.forEach((cmd, i) => {
      const b = document.createElement('button');
      b.className = 'btn small cmdBtn' + (this.invMode === 'cmds' && i === this.invCmd ? ' selCmd' : '');
      b.textContent = cmd;
      b.onclick = () => { this.invCmd = i; this.execInvCmd(cmd, it); };
      this.el.invCmds.appendChild(b);
    });
  }

  invNav(dx, dy) {
    if (this.invMode === 'grid') {
      const COLS = 4;
      const ROWS = 3;
      let r = Math.floor(this.invSel / COLS), c = this.invSel % COLS;
      r = (r + dy + ROWS) % ROWS;
      c = (c + dx + COLS) % COLS;
      this.invSel = r * COLS + c;
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
    if (this.combineSource !== null) {
      this.combineSource = null;
      this.audio.sfx('uiBack');
      this.renderInventory();
      return;
    }
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
    } else if (cmd === 'COMBINAR') {
      this.combineSource = this.invSel;
      this.invMode = 'grid';
      this.audio.sfx('uiSelect');
      this.toast('⚙️ Selecione o segundo item para combinar.', 3);
      this.renderInventory();
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
  showSaveBox(data = {}) {
    this.saveSel = 0;
    if (this.el.saveHeroName) this.el.saveHeroName.textContent = (data.hero || 'DANIEL SILVA').toUpperCase();
    if (this.el.saveRoomName) this.el.saveRoomName.textContent = (data.room || 'SAGUÃO PRINCIPAL').toUpperCase();
    if (this.el.saveCountVal) this.el.saveCountVal.textContent = `${String(data.saves || 0).padStart(2, '0')} VEZES`;
    if (this.el.saveTimeVal) this.el.saveTimeVal.textContent = data.time || '00:00:00';
    if (this.el.saveRibbonVal) {
      this.el.saveRibbonVal.textContent = data.infiniteInk ? 'INFINITA (BÔNUS DA LOJA)' : `x${data.ribbons || 0} RESTANTES`;
    }
    if (this.el.saveStamp) this.hide(this.el.saveStamp);
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
