// ============================================================
// SANTA LÚCIA - Equipe Nakamura - Interface: telas, HUD, inventário, diálogos, loja, extras
// ============================================================
import { ITEMS, WEAPONS, healthStatus, SHOP_ITEMS, GALLERY_MODELS, CAMPAIGNS } from './config.js?v=1924_1997_v52';
import { HELP_ROWS as HH } from './story.js?v=1924_1997_v52';
import { icon } from './icons.js?v=1924_1997_v52';
import { drawPortrait } from './textures.js?v=1924_1997_v52';

// Pixel arts autorais dos protagonistas (Equipe Nakamura).
// Solte assets/portrait_daniel.png e assets/portrait_clara.png para usá-las;
// sem os arquivos, o retrato procedural clássico é usado automaticamente.
const PORTRAIT_ART = {
  daniel: './assets/portrait_daniel.png',
  clara: './assets/portrait_clara.png',
};

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
      sponsorSplash: this.$('sponsorSplash'), sponsorImg: this.$('sponsorImg'), sponsorSkipBtn: this.$('sponsorSkipBtn'),
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
      screenCurtain: this.$('screenCurtain'),
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

  // ==================== TRANSIÇÃO SUAVE E ELEGANTE DE TELAS ====================
  transitionTo(changeFn, onDone) {
    const curtain = this.el.screenCurtain || this.$('screenCurtain');
    const isNode = typeof process !== 'undefined' && process.versions && !!process.versions.node;
    if (!curtain || isNode || (typeof window !== 'undefined' && window.__SANTA_LUCIA_HEADLESS__)) {
      if (changeFn) changeFn();
      if (onDone) onDone();
      return;
    }

    if (this._transitioning) {
      if (changeFn) changeFn();
      if (onDone) onDone();
      return;
    }
    this._transitioning = true;

    // Efeito sonoro sutil de transição cinematográfica (deslocamento de ar frio)
    if (this.audio) {
      try { this.audio.sfx('uiTransition'); } catch (e) {}
    }

    curtain.classList.add('active');

    setTimeout(() => {
      try {
        if (changeFn) changeFn();
      } catch (err) {
        console.error('Erro na transição de tela:', err);
      }

      setTimeout(() => {
        curtain.classList.remove('active');
        setTimeout(() => {
          this._transitioning = false;
          if (onDone) onDone();
        }, 280);
      }, 50);
    }, 280);
  }

  hideAllOverlays() {
    this.stopAllScreenParallaxAndFX();
    this.hide(this.el.sponsorSplash);
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

  // ==================== INTRO DOS PATROCINADORES (ESTILO RESIDENT EVIL REMAKE) ====================
  showSponsorSplash() {
    this.show(this.el.sponsorSplash);
  }
  hideSponsorSplash() {
    this.hide(this.el.sponsorSplash);
    if (this.el.sponsorImg) {
      this.el.sponsorImg.classList.remove('active', 'fading');
      this.el.sponsorImg.style.backgroundImage = 'none';
    }
  }
  displaySponsorCard(imgUrl, onShow) {
    if (!this.el.sponsorImg) {
      if (onShow) onShow();
      return;
    }
    this.el.sponsorImg.classList.remove('active', 'fading');
    this.el.sponsorImg.style.opacity = '';
    this.el.sponsorImg.style.backgroundImage = `url('${imgUrl}')`;
    if (typeof this.el.sponsorImg.offsetWidth === 'number') {
      void this.el.sponsorImg.offsetWidth;
    }
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(() => {
        if (this.el.sponsorImg) {
          this.el.sponsorImg.classList.add('active');
          if (onShow) onShow();
        }
      });
    } else {
      this.el.sponsorImg.classList.add('active');
      if (onShow) onShow();
    }
  }
  fadeSponsorCard(onFadeDone) {
    if (!this.el.sponsorImg) {
      if (onFadeDone) onFadeDone();
      return;
    }
    this.el.sponsorImg.classList.remove('active');
    this.el.sponsorImg.classList.add('fading');
    setTimeout(() => {
      if (onFadeDone) onFadeDone();
    }, 550);
  }

  renderCampaignPortraits() {
    const c1 = this.$('campPortDaniel');
    if (c1) this.applyPortraitArt(c1, 'daniel');
    const c2 = this.$('campPortClara');
    if (c2) this.applyPortraitArt(c2, 'clara');
  }

  // Retratos pixel-art autorais (assets/portrait_<quem>.png) com fallback
  // procedural (drawPortrait) caso o arquivo não exista.
  applyPortraitArt(canvas, who) {
    const src = PORTRAIT_ART[who];
    if (!src || !canvas || typeof canvas.getContext !== 'function') return false;
    if (typeof Image === 'undefined') { drawPortrait(canvas, who); return true; } // ambiente sem DOM
    const img = new Image();
    img.onload = () => {
      const x = canvas.getContext('2d');
      if (!x) return;
      x.imageSmoothingEnabled = false;
      x.fillStyle = '#060608';
      x.fillRect(0, 0, canvas.width, canvas.height);
      x.drawImage(img, 0, 0, canvas.width, canvas.height);
    };
    img.onerror = () => drawPortrait(canvas, who);
    img.src = src;
    return true;
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
      const dpr = Math.min((typeof window !== 'undefined' && window.devicePixelRatio) || 1, 2);
      cvs.width = Math.round(((typeof window !== 'undefined' && window.innerWidth) || 1280) * dpr);
      cvs.height = Math.round(((typeof window !== 'undefined' && window.innerHeight) || 720) * dpr);
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
      if (this._title3DRaf && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(this._title3DRaf);
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
      const dpr = Math.min((typeof window !== 'undefined' && window.devicePixelRatio) || 1, 2);
      cvs._cssW = (typeof window !== 'undefined' && window.innerWidth) || 800;
      cvs._cssH = (typeof window !== 'undefined' && window.innerHeight) || 600;
      cvs._dpr = dpr;
      cvs.width = Math.round(cvs._cssW * dpr);
      cvs.height = Math.round(cvs._cssH * dpr);
      if (ctx.setTransform) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
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
          x: Math.random() * ((cvs._cssW || cvs.width) + 300) - 150,
          y: Math.random() * (cvs._cssH || cvs.height),
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
      ctx.clearRect(0, 0, (cvs._cssW || cvs.width), (cvs._cssH || cvs.height));

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
          if (d.y > (cvs._cssH || cvs.height)) {
            if (d.layer >= 1 && splashes.length < maxSplashes && Math.random() < 0.28) {
              splashes.push({
                x: d.x,
                y: (cvs._cssH || cvs.height) - 4 - Math.random() * ((cvs._cssH || cvs.height) * 0.28),
                radius: 1.5 + Math.random() * 3.5,
                maxRadius: 4.0 + Math.random() * 5.0,
                alpha: (d.layer === 2 ? 0.35 : 0.2),
                life: 1.0,
              });
            }
            d.y = -d.len - Math.random() * 20;
            d.x = Math.random() * ((cvs._cssW || cvs.width) + 300) - 150;
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
      const mistGrad = ctx.createLinearGradient(0, (cvs._cssH || cvs.height) - 180, 0, (cvs._cssH || cvs.height));
      mistGrad.addColorStop(0, 'rgba(8, 12, 18, 0)');
      mistGrad.addColorStop(1, 'rgba(12, 18, 28, 0.16)');
      ctx.fillStyle = mistGrad;
      ctx.fillRect(0, (cvs._cssH || cvs.height) - 180, (cvs._cssW || cvs.width), 180);

      // 4. Relâmpagos ocasionais integrados
      const now = Date.now();
      if (now - lastLightning > nextLightningDelay) {
        lastLightning = now;
        nextLightningDelay = 7000 + Math.random() * 9000;
        this.triggerTitleLightning();
      }

      if (typeof requestAnimationFrame === 'function') {
        this._titleRainRaf = requestAnimationFrame(loop);
      }
    };

    if (typeof requestAnimationFrame === 'function') {
      if (this._titleRainRaf && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(this._titleRainRaf);
      this._titleRainRaf = requestAnimationFrame(loop);
    }
  }

  triggerTitleLightning() {
    if (this._titleLightningActive) return;
    this._titleLightningActive = true;
    this._titleLightningVal = 1.0;
    const flash = this.$('titleLightningFlash');
    if (flash) {
      flash.style.opacity = '0.42';
      setTimeout(() => { if (flash) flash.style.opacity = '0.08'; this._titleLightningVal = 0.2; }, 60);
      setTimeout(() => { if (flash) flash.style.opacity = '0.48'; this._titleLightningVal = 1.0; }, 120);
      setTimeout(() => {
        if (flash) flash.style.opacity = '0';
        this._titleLightningActive = false;
      }, 260);
    } else {
      setTimeout(() => { this._titleLightningActive = false; }, 260);
    }
    if (this.game && this.game.flashBoost !== undefined) {
      this.game.flashBoost = 0.55;
    }
    if (this.audio) {
      this.audio.thunder({ close: true });
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
  showCampaignSelect() {
    this.campSelIdx = 0;
    this.renderCampSelection();
    this.show(this.el.campaignSelect);
    this.startScreenParallaxAndFX('campaignSelect', 'campWeatherCanvas', 'shop');
  }
  hideCampaignSelect() {
    this.hide(this.el.campaignSelect);
    this.stopScreenParallaxAndFX('campaignSelect');
  }
  renderCampSelection() {
    const cards = [this.el.campDaniel, this.el.campClara];
    cards.forEach((c, i) => { if (c) c.classList.toggle('sel', i === this.campSelIdx); });
  }
  campNav(d) {
    this.campSelIdx = (this.campSelIdx + d + 2) % 2;
    this.audio.sfx('uiMove');
    this.renderCampSelection();
  }
  campConfirm() {
    this.audio.sfx('uiSelect');
    const id = this.campSelIdx === 0 ? 'daniel' : 'clara';
    this.transitionTo(() => {
      this.hideAllOverlays();
      this.game.startCampaign(id);
    });
  }

  // ==================== PARALLAX 3D E AMBIENTE CLIMÁTICO (TELAS GÓTICAS) ====================
  initScreenParallaxListeners() {
    if (this._screenParallaxInited || typeof window === 'undefined' || typeof window.addEventListener !== 'function') return;
    this._screenParallaxInited = true;

    this._screenMouse = { x: 0, y: 0, targetX: 0, targetY: 0 };
    this._activeScreenEffects = {};

    window.addEventListener('mousemove', (e) => {
      const w = window.innerWidth || 1280;
      const h = window.innerHeight || 720;
      this._screenMouse.targetX = Math.max(-1, Math.min(1, (e.clientX / w - 0.5) * 2));
      this._screenMouse.targetY = Math.max(-1, Math.min(1, (e.clientY / h - 0.5) * 2));
    });

    window.addEventListener('resize', () => {
      if (!this._activeScreenEffects) return;
      Object.keys(this._activeScreenEffects).forEach((screenId) => {
        const item = this._activeScreenEffects[screenId];
        if (item && item.canvas) {
          const cv = item.canvas;
          cv._dpr = Math.min(window.devicePixelRatio || 1, 2);
          cv._cssW = window.innerWidth || 1280;
          cv._cssH = window.innerHeight || 720;
          cv.width = Math.round(cv._cssW * cv._dpr);
          cv.height = Math.round(cv._cssH * cv._dpr);
          const c2 = cv.getContext && cv.getContext('2d');
          if (c2 && c2.setTransform) c2.setTransform(cv._dpr, 0, 0, cv._dpr, 0, 0);
        }
      });
    });
  }

  startScreenParallaxAndFX(screenId, canvasId, type) {
    this.initScreenParallaxListeners();
    if (typeof window === 'undefined' || typeof document === 'undefined' || typeof requestAnimationFrame !== 'function') return;

    this._activeScreenEffects = this._activeScreenEffects || {};

    const screenEl = this.$(screenId);
    const canvas = this.$(canvasId);
    if (!screenEl || !canvas || typeof canvas.getContext !== 'function') return;

    canvas._dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas._cssW = window.innerWidth || 1280;
    canvas._cssH = window.innerHeight || 720;
    canvas.width = Math.round(canvas._cssW * canvas._dpr);
    canvas.height = Math.round(canvas._cssH * canvas._dpr);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    if (ctx.setTransform && canvas._dpr) ctx.setTransform(canvas._dpr, 0, 0, canvas._dpr, 0, 0);

    const fxData = {
      canvas,
      ctx,
      type,
      screenEl,
      particles: [],
      sparks: [],
      nextSparkTime: (typeof performance !== 'undefined' ? performance.now() : Date.now()) + 1200,
    };

    if (type === 'options') {
      // 1. Painel Elétrico: poeira industrial suspensa e faíscas de alta tensão
      for (let i = 0; i < 45; i++) {
        fxData.particles.push({
          x: Math.random() * (canvas._cssW || canvas.width),
          y: Math.random() * (canvas._cssH || canvas.height),
          radius: 0.8 + Math.random() * 1.8,
          alpha: 0.15 + Math.random() * 0.45,
          baseAlpha: 0.15 + Math.random() * 0.45,
          pulseSpd: 0.8 + Math.random() * 1.5,
          pulsePhase: Math.random() * Math.PI * 2,
          spdX: (Math.random() - 0.5) * 0.35,
          spdY: -0.2 - Math.random() * 0.45,
          color: Math.random() > 0.3 ? '210, 225, 250' : '255, 190, 80',
        });
      }
    } else if (type === 'extras') {
      // 2. Escadaria do Sanatório: névoa gótica e chuva oblíqua da janela tempestuosa
      for (let i = 0; i < 65; i++) {
        fxData.particles.push({
          x: Math.random() * ((canvas._cssW || canvas.width) + 200) - 100,
          y: Math.random() * (canvas._cssH || canvas.height),
          len: 12 + Math.random() * 22,
          spd: 14 + Math.random() * 18,
          alpha: 0.14 + Math.random() * 0.28,
          width: 0.75 + Math.random() * 0.75,
          wind: 1.5 + Math.random() * 0.8,
        });
      }
      fxData.fogMotes = [];
      for (let i = 0; i < 18; i++) {
        fxData.fogMotes.push({
          x: Math.random() * (canvas._cssW || canvas.width),
          y: Math.random() * (canvas._cssH || canvas.height),
          radius: 20 + Math.random() * 45,
          alpha: 0.03 + Math.random() * 0.06,
          spd: 0.1 + Math.random() * 0.25,
        });
      }
    } else if (type === 'shop') {
      // 3. Mesa de Investigação & Estante de Curiosidades: brasas quentes da vela e halo dourado
      for (let i = 0; i < 40; i++) {
        fxData.particles.push({
          x: (canvas._cssW || canvas.width) * 0.4 + (Math.random() - 0.5) * (canvas._cssW || canvas.width) * 0.7,
          y: (canvas._cssH || canvas.height) * 0.3 + Math.random() * (canvas._cssH || canvas.height) * 0.7,
          radius: 1.0 + Math.random() * 2.2,
          alpha: 0.2 + Math.random() * 0.6,
          baseAlpha: 0.2 + Math.random() * 0.6,
          pulsePhase: Math.random() * Math.PI * 2,
          spdY: -0.35 - Math.random() * 0.75,
          spdX: (Math.random() - 0.5) * 0.4,
          sway: Math.random() * 1.5,
          swaySpd: 1.2 + Math.random() * 1.6,
          color: Math.random() > 0.25 ? '255, 175, 45' : '255, 230, 130',
        });
      }
    } else if (type === 'save') {
      // 4. Menu Carregar e Salvar: Chuva na janela (esquerda), vela e brasas (direita), poeira ambiente
      for (let i = 0; i < 45; i++) {
        fxData.particles.push({
          x: Math.random() * ((canvas._cssW || canvas.width) * 0.40),
          y: Math.random() * (canvas._cssH || canvas.height),
          len: 12 + Math.random() * 20,
          spd: 12 + Math.random() * 16,
          alpha: 0.15 + Math.random() * 0.3,
          width: 0.8 + Math.random() * 0.6,
          wind: 0.4 + Math.random() * 0.4,
        });
      }
      fxData.candleEmbers = [];
      for (let i = 0; i < 28; i++) {
        fxData.candleEmbers.push({
          x: (canvas._cssW || canvas.width) * 0.81 + (Math.random() - 0.5) * 80,
          y: (canvas._cssH || canvas.height) * 0.60 + Math.random() * ((canvas._cssH || canvas.height) * 0.35),
          radius: 0.8 + Math.random() * 1.8,
          alpha: 0.2 + Math.random() * 0.6,
          baseAlpha: 0.2 + Math.random() * 0.6,
          pulsePhase: Math.random() * Math.PI * 2,
          spdY: -0.4 - Math.random() * 0.6,
          spdX: (Math.random() - 0.5) * 0.3,
          swaySpd: 1.5 + Math.random() * 1.8,
        });
      }
      fxData.dustMotes = [];
      for (let i = 0; i < 30; i++) {
        fxData.dustMotes.push({
          x: Math.random() * (canvas._cssW || canvas.width),
          y: Math.random() * (canvas._cssH || canvas.height),
          radius: 0.7 + Math.random() * 1.3,
          alpha: 0.08 + Math.random() * 0.22,
          baseAlpha: 0.08 + Math.random() * 0.22,
          pulsePhase: Math.random() * Math.PI * 2,
          spdX: (Math.random() - 0.5) * 0.2,
          spdY: -0.1 - Math.random() * 0.25,
        });
      }
    }

    this._activeScreenEffects[screenId] = fxData;

    if (!this._screenFXRaf && typeof requestAnimationFrame === 'function') {
      const loop = () => {
        const now = (typeof performance !== 'undefined' ? performance.now() : Date.now());
        const dt = 0.016;

        if (this._screenMouse) {
          this._screenMouse.x += (this._screenMouse.targetX - this._screenMouse.x) * 0.08;
          this._screenMouse.y += (this._screenMouse.targetY - this._screenMouse.y) * 0.08;
        }

        const activeKeys = this._activeScreenEffects ? Object.keys(this._activeScreenEffects) : [];
        if (activeKeys.length === 0) {
          if (this._screenFXRaf && typeof cancelAnimationFrame === 'function') {
            cancelAnimationFrame(this._screenFXRaf);
          }
          this._screenFXRaf = null;
          return;
        }

        const tSec = now * 0.001;
        const breathX = Math.sin(tSec * 0.75) * 0.12;
        const breathY = Math.cos(tSec * 0.95) * 0.10;
        const mx = ((this._screenMouse ? this._screenMouse.x : 0) + breathX);
        const my = ((this._screenMouse ? this._screenMouse.y : 0) + breathY);

        activeKeys.forEach((key) => {
          const fx = this._activeScreenEffects[key];
          if (!fx || !fx.screenEl || (fx.screenEl.classList && fx.screenEl.classList.contains('hidden'))) {
            delete this._activeScreenEffects[key];
            return;
          }

          fx.screenEl.style.setProperty('--mouse-x', mx.toFixed(4));
          fx.screenEl.style.setProperty('--mouse-y', my.toFixed(4));

          const c = fx.canvas;
          const ctx = fx.ctx;
          ctx.clearRect(0, 0, c.width, c.height);

          if (fx.type === 'options') {
            for (const p of fx.particles) {
              p.x += p.spdX;
              p.y += p.spdY;
              p.pulsePhase += dt * p.pulseSpd;
              const alpha = p.baseAlpha * (0.6 + Math.sin(p.pulsePhase) * 0.4);

              if (p.y < -10) { p.y = c.height + 10; p.x = Math.random() * c.width; }
              if (p.x < -10) p.x = c.width + 10;
              if (p.x > c.width + 10) p.x = -10;

              ctx.beginPath();
              ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
              ctx.fillStyle = `rgba(${p.color}, ${alpha.toFixed(3)})`;
              ctx.fill();
            }

            if (now > fx.nextSparkTime) {
              fx.nextSparkTime = now + 1600 + Math.random() * 2400;
              const spawnX = c.width * (0.25 + Math.random() * 0.5);
              const spawnY = c.height * (0.15 + Math.random() * 0.3);
              const count = 10 + Math.floor(Math.random() * 12);
              for (let i = 0; i < count; i++) {
                const angle = (Math.PI * 0.15) + Math.random() * (Math.PI * 0.7);
                const spd = 2 + Math.random() * 7;
                fx.sparks.push({
                  x: spawnX,
                  y: spawnY,
                  vx: Math.cos(angle) * spd * (Math.random() > 0.5 ? 1 : -1),
                  vy: Math.sin(angle) * spd,
                  life: 1.0,
                  decay: 0.03 + Math.random() * 0.05,
                  cyan: Math.random() > 0.6,
                });
              }
            }

            for (let i = fx.sparks.length - 1; i >= 0; i--) {
              const s = fx.sparks[i];
              s.x += s.vx;
              s.y += s.vy;
              s.vy += 0.28;
              s.life -= s.decay;

              if (s.life <= 0 || s.y > c.height) {
                fx.sparks.splice(i, 1);
                continue;
              }

              ctx.strokeStyle = s.cyan
                ? `rgba(160, 220, 255, ${s.life.toFixed(2)})`
                : `rgba(255, 230, 120, ${s.life.toFixed(2)})`;
              ctx.lineWidth = 1.4;
              ctx.beginPath();
              ctx.moveTo(s.x, s.y);
              ctx.lineTo(s.x - s.vx * 0.7, s.y - s.vy * 0.7);
              ctx.stroke();
            }

          } else if (fx.type === 'extras') {
            if (fx.fogMotes) {
              for (const m of fx.fogMotes) {
                m.x += m.spd;
                if (m.x - m.radius > c.width) m.x = -m.radius;
                const grad = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, m.radius);
                grad.addColorStop(0, `rgba(140, 165, 195, ${m.alpha})`);
                grad.addColorStop(1, 'rgba(140, 165, 195, 0)');
                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.arc(m.x, m.y, m.radius, 0, Math.PI * 2);
                ctx.fill();
              }
            }

            ctx.beginPath();
            ctx.strokeStyle = 'rgba(180, 205, 235, 0.22)';
            for (const d of fx.particles) {
              const endX = d.x + d.wind * (d.len * 0.1);
              const endY = d.y + d.len;
              ctx.moveTo(d.x, d.y);
              ctx.lineTo(endX, endY);

              d.x += d.wind * 0.35;
              d.y += d.spd;
              if (d.y > c.height) {
                d.y = -d.len;
                d.x = Math.random() * (c.width + 200) - 100;
              }
            }
            ctx.stroke();

          } else if (fx.type === 'shop') {
            const candleX = c.width * 0.75 + Math.sin(tSec * 1.5) * 4;
            const candleY = c.height * 0.65 + Math.cos(tSec * 2.1) * 3;
            const candleGrad = ctx.createRadialGradient(candleX, candleY, 10, candleX, candleY, 260);
            const flicker = 0.08 + Math.sin(tSec * 8.5) * 0.02 + Math.cos(tSec * 13) * 0.015;
            candleGrad.addColorStop(0, `rgba(255, 180, 60, ${flicker.toFixed(3)})`);
            candleGrad.addColorStop(1, 'rgba(255, 140, 30, 0)');
            ctx.fillStyle = candleGrad;
            ctx.beginPath();
            ctx.arc(candleX, candleY, 260, 0, Math.PI * 2);
            ctx.fill();

            for (const p of fx.particles) {
              p.pulsePhase += dt * p.swaySpd;
              p.x += p.spdX + Math.sin(p.pulsePhase) * (p.sway * 0.4);
              p.y += p.spdY;
              const alpha = p.baseAlpha * (0.6 + Math.sin(p.pulsePhase) * 0.4);

              if (p.y < -15) {
                p.y = c.height * 0.7 + Math.random() * (c.height * 0.3);
                p.x = c.width * 0.4 + (Math.random() - 0.5) * c.width * 0.7;
              }

              ctx.beginPath();
              ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
              ctx.fillStyle = `rgba(${p.color}, ${alpha.toFixed(3)})`;
              ctx.shadowColor = `rgba(${p.color}, 0.8)`;
              ctx.shadowBlur = 6;
              ctx.fill();
              ctx.shadowBlur = 0;
            }
          } else if (fx.type === 'save') {
            // Chuva na janela (lado esquerdo)
            ctx.beginPath();
            ctx.strokeStyle = 'rgba(160, 190, 225, 0.25)';
            for (const d of fx.particles) {
              const endX = d.x + d.wind * (d.len * 0.08);
              const endY = d.y + d.len;
              ctx.moveTo(d.x, d.y);
              ctx.lineTo(endX, endY);
              d.x += d.wind * 0.2;
              d.y += d.spd;
              if (d.y > c.height) {
                d.y = -d.len;
                d.x = Math.random() * (c.width * 0.40);
              }
            }
            ctx.stroke();

            // Poeira ambiente
            if (fx.dustMotes) {
              for (const m of fx.dustMotes) {
                m.x += m.spdX;
                m.y += m.spdY;
                m.pulsePhase += dt * 1.2;
                const alpha = m.baseAlpha * (0.6 + Math.sin(m.pulsePhase) * 0.4);
                if (m.y < -5) { m.y = c.height + 5; m.x = Math.random() * c.width; }
                ctx.beginPath();
                ctx.arc(m.x, m.y, m.radius, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(200, 215, 235, ${alpha.toFixed(3)})`;
                ctx.fill();
              }
            }

            // Halo luminoso pulsante da vela acesa
            const candleX = c.width * 0.81 + Math.sin(tSec * 2.1) * 3;
            const candleY = c.height * 0.62 + Math.cos(tSec * 1.7) * 2;
            const flicker = 0.12 + Math.sin(tSec * 9.2) * 0.03 + Math.cos(tSec * 14.5) * 0.02;
            const candleGrad = ctx.createRadialGradient(candleX, candleY, 5, candleX, candleY, 220);
            candleGrad.addColorStop(0, `rgba(255, 195, 80, ${flicker.toFixed(3)})`);
            candleGrad.addColorStop(1, 'rgba(255, 140, 20, 0)');
            ctx.fillStyle = candleGrad;
            ctx.beginPath();
            ctx.arc(candleX, candleY, 220, 0, Math.PI * 2);
            ctx.fill();

            // Brasas da vela
            if (fx.candleEmbers) {
              for (const p of fx.candleEmbers) {
                p.pulsePhase += dt * p.swaySpd;
                p.x += p.spdX + Math.sin(p.pulsePhase) * 0.5;
                p.y += p.spdY;
                const alpha = p.baseAlpha * (0.6 + Math.sin(p.pulsePhase) * 0.4);
                if (p.y < c.height * 0.35) {
                  p.y = c.height * 0.62 + Math.random() * 60;
                  p.x = c.width * 0.81 + (Math.random() - 0.5) * 60;
                }
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(255, 185, 60, ${alpha.toFixed(3)})`;
                ctx.shadowColor = 'rgba(255, 185, 60, 0.7)';
                ctx.shadowBlur = 4;
                ctx.fill();
                ctx.shadowBlur = 0;
              }
            }
          }
        });

        if (typeof requestAnimationFrame === 'function') {
          this._screenFXRaf = requestAnimationFrame(loop);
        }
      };

      this._screenFXRaf = requestAnimationFrame(loop);
    }
  }

  stopScreenParallaxAndFX(screenId) {
    if (this._activeScreenEffects && this._activeScreenEffects[screenId]) {
      const fx = this._activeScreenEffects[screenId];
      if (fx && fx.ctx && fx.canvas) {
        fx.ctx.clearRect(0, 0, (fx.canvas._cssW || fx.canvas.width), (fx.canvas._cssH || fx.canvas.height));
      }
      delete this._activeScreenEffects[screenId];
    }
    if (this._activeScreenEffects && Object.keys(this._activeScreenEffects).length === 0) {
      if (this._screenFXRaf && typeof cancelAnimationFrame === 'function') {
        cancelAnimationFrame(this._screenFXRaf);
      }
      this._screenFXRaf = null;
    }
  }

  stopAllScreenParallaxAndFX() {
    if (this._activeScreenEffects) {
      Object.keys(this._activeScreenEffects).forEach((k) => {
        const fx = this._activeScreenEffects[k];
        if (fx && fx.ctx && fx.canvas) {
          fx.ctx.clearRect(0, 0, (fx.canvas._cssW || fx.canvas.width), (fx.canvas._cssH || fx.canvas.height));
        }
      });
      this._activeScreenEffects = {};
    }
    if (this._screenFXRaf && typeof cancelAnimationFrame === 'function') {
      cancelAnimationFrame(this._screenFXRaf);
    }
    this._screenFXRaf = null;
  }

  // ==================== MODOS EXTRAS (IDÊNTICO À REFERÊNCIA) ====================
  showExtraModes(hiMerc, hiSurv) {
    const u = this.game.unlocks || {};

    const updateMode = (btnId, statusId, unlocked) => {
      const btn = this.$(btnId);
      const st = this.$(statusId);
      if (!btn || !st) return;
      if (unlocked) {
        st.innerHTML = '<span style="color:#6ee688;font-size:13px;font-weight:bold;letter-spacing:1px;">▶ JOGAR</span>';
        btn.classList.remove('locked');
      } else {
        st.innerHTML = `
          <svg class="extrasLockSvg" viewBox="0 0 16 16" width="14" height="14" fill="none">
            <rect x="3" y="7" width="10" height="8" rx="1" stroke="#8a96a6" stroke-width="1.2" fill="#141a22"/>
            <path d="M 5 7 L 5 4 C 5 2.5 6.3 1.5 8 1.5 C 9.7 1.5 11 2.5 11 4 L 11 7" stroke="#8a96a6" stroke-width="1.2"/>
            <circle cx="8" cy="11" r="1" fill="#8a96a6"/>
          </svg>
        `;
        btn.classList.add('locked');
      }
    };

    updateMode('btnPlayMercenaries', 'statusMercenaries', !!u.extra_mercenaries);
    updateMode('btnPlaySurvivor', 'statusSurvivor', !!u.extra_survivor);
    updateMode('btnPlayBento', 'statusBento', !!u.extra_bento);

    this.show(this.el.extraModes);
    this.startScreenParallaxAndFX('extraModes', 'extrasWeatherCanvas', 'extras');
  }
  hideExtraModes() {
    this.stopScreenParallaxAndFX('extraModes');
    this.hide(this.el.extraModes);
  }

  // ==================== LOJA DE PONTOS (IDÊNTICO À REFERÊNCIA) ====================
  showShop(points, unlocks) {
    const pts = (typeof points === 'number' && !isNaN(points)) ? points : (this.game.points || 0);
    if (this.el.shopPointsVal) this.el.shopPointsVal.textContent = pts.toLocaleString();
    this._activeShopCat = this._activeShopCat || 'upgrades';
    this.renderShopCategory(this._activeShopCat);
    this.show(this.el.pointsShop);
    this.startScreenParallaxAndFX('pointsShop', 'shopWeatherCanvas', 'shop');
  }
  hideShop() {
    this.stopScreenParallaxAndFX('pointsShop');
    this.hide(this.el.pointsShop);
  }

  renderShopCategory(cat) {
    const list = this.el.shopList;
    if (!list) return;
    list.innerHTML = '';

    const unlocks = this.game.unlocks || {};
    const filtered = SHOP_ITEMS.filter((it) => (it.category || 'upgrades') === cat);

    const getIconSvg = (id, fallback) => {
      if (id === 'shop_medkit') {
        return `<svg viewBox="0 0 32 32" width="28" height="28" fill="none">
          <rect x="3" y="8" width="26" height="20" rx="2" stroke="#8a96a6" stroke-width="1.5" fill="#141a22"/>
          <path d="M 11 8 L 11 5 L 21 5 L 21 8" stroke="#8a96a6" stroke-width="1.4"/>
          <path d="M 16 12 L 16 24 M 10 18 L 22 18" stroke="#e0e8f4" stroke-width="2.5" stroke-linecap="square"/>
        </svg>`;
      }
      if (id === 'shop_ammo') {
        return `<svg viewBox="0 0 32 32" width="28" height="28" fill="none">
          <rect x="3" y="6" width="26" height="15" rx="1" stroke="#8a96a6" stroke-width="1.3" fill="#141a22"/>
          <line x1="3" y1="12" x2="29" y2="12" stroke="#606c7e" stroke-width="1"/>
          <rect x="8" y="16" width="3.5" height="12" rx="1" stroke="#d4a444" stroke-width="1" fill="#7a5a20"/>
          <polygon points="8,16 9.75,13 11.5,16" fill="#f0c860"/>
          <rect x="14" y="16" width="3.5" height="12" rx="1" stroke="#d4a444" stroke-width="1" fill="#7a5a20"/>
          <polygon points="14,16 15.75,13 17.5,16" fill="#f0c860"/>
          <rect x="20" y="16" width="3.5" height="12" rx="1" stroke="#d4a444" stroke-width="1" fill="#7a5a20"/>
          <polygon points="20,16 21.75,13 23.5,16" fill="#f0c860"/>
        </svg>`;
      }
      if (id === 'shop_shield' || id === 'extra_survivor') {
        return `<svg viewBox="0 0 32 32" width="28" height="28" fill="none">
          <path d="M 6 5 L 26 5 L 26 15 C 26 23 16 28 16 28 C 16 28 6 23 6 15 Z" stroke="#a0acbc" stroke-width="1.5" fill="#141a22"/>
          <path d="M 16 5 L 16 27 M 6 13 L 26 13" stroke="#687688" stroke-width="1.2"/>
        </svg>`;
      }
      if (id === 'shop_energy') {
        return `<svg viewBox="0 0 32 32" width="28" height="28" fill="none">
          <polygon points="18,3 7,16 15,16 13,29 25,14 17,14" stroke="#d8e4f4" stroke-width="1.4" fill="rgba(140,180,230,0.2)"/>
        </svg>`;
      }
      if (id === 'shop_revive') {
        return `<svg viewBox="0 0 32 32" width="28" height="28" fill="none">
          <path d="M 8 15 C 8 8 24 8 24 15 C 24 19 22 21 21 23 L 11 23 C 10 21 8 19 8 15 Z" stroke="#a6b2c2" stroke-width="1.4" fill="#141a22"/>
          <circle cx="12" cy="15" r="2" fill="#080c10" stroke="#a6b2c2" stroke-width="1"/>
          <circle cx="20" cy="15" r="2" fill="#080c10" stroke="#a6b2c2" stroke-width="1"/>
          <line x1="14" y1="23" x2="14" y2="26" stroke="#a6b2c2" stroke-width="1.2"/>
          <line x1="18" y1="23" x2="18" y2="26" stroke="#a6b2c2" stroke-width="1.2"/>
        </svg>`;
      }
      return icon(fallback || 'star', 'lg');
    };

    filtered.forEach((it) => {
      const isConsumable = it.category === 'upgrades';
      const bought = !isConsumable && !!unlocks[it.id];

      const card = document.createElement('div');
      card.className = 'shopCardItem' + (bought ? ' bought' : '');
      card.innerHTML = `
        <div class="shopCardLeft">
          <span class="btnSelGlowIcon">❖</span>
          <div class="shopCardIconFrame">
            ${getIconSvg(it.id, it.icon)}
          </div>
          <div class="shopCardTexts">
            <div class="shopCardTitle">${it.name}</div>
            <div class="shopCardDesc">${it.desc}</div>
          </div>
        </div>
        <div class="shopCardRight">
          ${bought ? (
            it.id === 'extra_mercenaries' ? '<button class="shopCardActionBtn">▶ JOGAR</button>' :
            it.id === 'extra_survivor' ? '<button class="shopCardActionBtn">▶ JOGAR</button>' :
            it.id === 'extra_bento' ? '<button class="shopCardActionBtn">▶ JOGAR</button>' :
            '<span class="shopCardPrice" style="color:#6ee688;font-size:11px;">✓ ADQUIRIDO</span>'
          ) : `
            <svg viewBox="0 0 16 16" width="13" height="13" class="shopRubySvg">
              <polygon points="8,1 14,8 8,15 2,8" fill="#e02828" stroke="#ff6b6b" stroke-width="1"/>
              <polygon points="8,4 11,8 8,12 5,8" fill="#ff4d4d"/>
            </svg>
            <span class="shopCardPrice">${it.cost.toLocaleString()}</span>
          `}
        </div>
      `;

      card.onmouseenter = () => {
        if (this.audio) this.audio.sfx('uiMove');
      };

      card.onclick = () => {
        if (bought) {
          if (it.id === 'extra_mercenaries') {
            this.hideAllOverlays();
            this.game.startMercenaries();
          } else if (it.id === 'extra_survivor') {
            this.hideAllOverlays();
            this.game.startSurvivor();
          } else if (it.id === 'extra_bento') {
            this.hideAllOverlays();
            this.game.startCampaign('bento');
          }
          return;
        }
        this.game.buyShopItem(it);
        const pts = (this.game && typeof this.game.points === 'number') ? this.game.points : 0;
        if (this.el.shopPointsVal) this.el.shopPointsVal.textContent = pts.toLocaleString();
        this.renderShopCategory(cat);
      };

      list.appendChild(card);
    });
  }

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
    this.startScreenParallaxAndFX('options', 'optionsWeatherCanvas', 'options');
  }
  hideOptions() {
    this.stopScreenParallaxAndFX('options');
    this.hide(this.el.options);
  }

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

    // Pular intro dos patrocinadores (ChatGPT, Grok, Arena.ai / Nakamura)
    click('sponsorSkipBtn', () => { if (typeof this.game.skipSponsorIntro === 'function') this.game.skipSponsorIntro(); });
    if (this.el.sponsorSplash) {
      this.el.sponsorSplash.onclick = (ev) => {
        ev.preventDefault();
        if (typeof this.game.skipSponsorIntro === 'function') this.game.skipSponsorIntro();
      };
    }

    // Navegação principal com transições cinemáticas suaves
    click('helpBack', () => {
      this.transitionTo(() => {
        this.audio.sfx('uiBack');
        this.hideHelp();
        this.showTitle(this.game.hasSave());
      });
    });
    click('optBack', () => {
      this.transitionTo(() => {
        this.audio.sfx('uiBack');
        this.hideOptions();
        this.showTitle(this.game.hasSave());
      });
    });
    click('optTestSpark', () => {
      this.audio.sfx('spark');
      this.toast(icon('bolt') + ' TESTE DO PAINEL ELÉTRICO: CIRCUITO NOMINAL DE 220V ESTABILIZADO.', 3);
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
    click('campBack', () => {
      this.transitionTo(() => {
        this.audio.sfx('uiBack');
        this.hideCampaignSelect();
        this.showTitle(this.game.hasSave());
      });
    });
    click('extraBack', () => {
      this.transitionTo(() => {
        this.audio.sfx('uiBack');
        this.hideExtraModes();
        this.showTitle(this.game.hasSave());
      });
    });
    click('extraToShop', () => {
      this.transitionTo(() => {
        this.audio.sfx('uiSelect');
        this.hideExtraModes();
        this.showShop(this.game.points, this.game.unlocks);
      });
    });
    click('shopBack', () => {
      this.transitionTo(() => {
        this.audio.sfx('uiBack');
        this.hideShop();
        this.showExtraModes(this.game.highScores ? this.game.highScores.mercenaries : 0, this.game.highScores ? this.game.highScores.survivor : 0);
      });
    });
    click('galleryBack', () => {
      this.transitionTo(() => {
        this.audio.sfx('uiBack');
        this.hideGallery();
        this.showShop(this.game.points, this.game.unlocks);
      });
    });

    // Alternância de abas da loja (Melhorias, Modos, Armas)
    if (typeof document !== 'undefined' && typeof document.querySelectorAll === 'function') {
      const shopCatBtns = document.querySelectorAll('.shopCatBtn');
      shopCatBtns.forEach((btn) => {
        btn.onclick = () => {
          const cat = btn.getAttribute('data-cat');
          shopCatBtns.forEach((b) => b.classList.remove('active'));
          btn.classList.add('active');
          this._activeShopCat = cat;
          this.renderShopCategory(cat);
          if (this.audio) this.audio.sfx('uiMove');
        };
      });
    }

    // Clique no fundo escurecido da pausa = continuar
    const pScrim = this.$('pauseScrim');
    if (pScrim) pScrim.addEventListener('click', () => this.game.pauseAction('resume'));

    // Seleção de campanha
    click('btnSelectDaniel', () => {
      this.audio.sfx('uiSelect');
      this.transitionTo(() => {
        this.hideAllOverlays();
        this.game.startCampaign('daniel');
      });
    });
    click('btnSelectClara', () => {
      this.audio.sfx('uiSelect');
      this.transitionTo(() => {
        this.hideAllOverlays();
        this.game.startCampaign('clara');
      });
    });
    // Cards de campanha: clique confirma, hover seleciona (estilo mockup)
    const campCards = [this.$('campDaniel'), this.$('campClara')];
    campCards.forEach((card, i) => {
      if (!card) return;
      card.addEventListener('click', (e) => {
        if (e.target.closest('.campBtn')) return; // o botão tem o próprio handler
        this.campSelIdx = i;
        this.campConfirm();
      });
      card.addEventListener('mouseenter', () => {
        if (this.campSelIdx !== i) { this.campSelIdx = i; this.renderCampSelection(); }
      });
    });

    // Modos extras com verificação de bloqueio
    click('btnPlayMercenaries', () => {
      if (!this.game.unlocks.extra_mercenaries) {
        this.audio.sfx('dryfire');
        this.transitionTo(() => {
          this.hideExtraModes();
          this.showShop(this.game.points, this.game.unlocks);
        });
        this.toast(icon('lock') + ' Adquira o Modo Mercenários na Loja por 1.000 PTS!', 3.5);
        return;
      }
      this.audio.sfx('uiSelect');
      this.transitionTo(() => {
        this.hideAllOverlays();
        this.game.startMercenaries();
      });
    });

    click('btnPlaySurvivor', () => {
      if (!this.game.unlocks.extra_survivor) {
        this.audio.sfx('dryfire');
        this.transitionTo(() => {
          this.hideExtraModes();
          this.showShop(this.game.points, this.game.unlocks);
        });
        this.toast(icon('lock') + ' Adquira o Modo Sobrevivente na Loja por 1.000 PTS!', 3.5);
        return;
      }
      this.audio.sfx('uiSelect');
      this.transitionTo(() => {
        this.hideAllOverlays();
        this.game.startSurvivor();
      });
    });

    click('btnPlayBento', () => {
      if (!this.game.unlocks.extra_bento) {
        this.audio.sfx('dryfire');
        this.transitionTo(() => {
          this.hideExtraModes();
          this.showShop(this.game.points, this.game.unlocks);
        });
        this.toast(icon('lock') + ' Adquira o Turno do Bento na Loja por 1.200 PTS!', 3.5);
        return;
      }
      this.audio.sfx('uiSelect');
      this.transitionTo(() => {
        this.hideAllOverlays();
        this.game.startCampaign('bento');
      });
    });

    click('btnPlaySponsors', () => {
      this.audio.sfx('uiSelect');
      this.transitionTo(() => {
        this.hideAllOverlays();
        this.game.playSponsorIntro(() => this.game.toTitle());
      });
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

    // Salvar & Carregar (Menu Carregar e Salvar)
    click('saveTabCreate', () => { this.updateSaveModeTabsUI('create'); if (this.audio) this.audio.sfx('uiMove'); });
    click('saveTabDelete', () => { this.updateSaveModeTabsUI('delete'); if (this.audio) this.audio.sfx('uiMove'); });
    click('saveTabLoad', () => { this.updateSaveModeTabsUI('load'); if (this.audio) this.audio.sfx('uiMove'); });
    click('saveBackBtn', () => {
      this.transitionTo(() => {
        this.audio.sfx('uiBack');
        this.hideSaveBox();
        if (this._saveFrom === 'title') {
          this.showTitle(this.game.hasSave());
        } else {
          if (this.game) this.game.state = 'play';
        }
      });
    });
    click('saveYes', () => {
      if (this._pendingSlotAction) {
        const act = this._pendingSlotAction;
        this._pendingSlotAction = null;
        act();
      } else {
        this.game.saveConfirm(true);
      }
    });
    click('saveNo', () => {
      if (this.audio) this.audio.sfx('uiBack');
      const modal = this.$('saveConfirmModal');
      if (modal) this.hide(modal);
    });

    // GameOver & Final
    click('goRetry', () => this.game.gameoverAction('retry'));
    click('goTitle', () => {
      this.transitionTo(() => this.game.gameoverAction('title'));
    });
    click('endBtn', () => {
      this.transitionTo(() => this.game.endingDone());
    });

    this.initOptionsPanel();

    // Efeitos sonoros ao passar o mouse em todos os botões de menu estilizados
    if (typeof document !== 'undefined' && typeof document.querySelectorAll === 'function') {
      const hoverSelectors = [
        '.extrasCardBtn',
        '.optTabItem',
        '.optCtrlTabBtn',
        '.optRestoreBtn',
        '.optBackGothicBtn',
        '.shopCatBtn',
        '.shopBackGothicBtn',
        '.shopCardActionBtn',
        '.saveModeTabBtn',
        '.saveBackGothicBtn',
        '.saveSlotCard',
        '.campCard'
      ];
      hoverSelectors.forEach((sel) => {
        document.querySelectorAll(sel).forEach((btn) => {
          btn.addEventListener('mouseenter', () => {
            if (this.audio) this.audio.sfx('uiMove');
          });
        });
      });
    }
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
  ammo(weaponName, ammoStr, iconToken = 'handgun', visible = true) {
    if (!this.el.ammoBox) return;
    this.el.ammoBox.classList.toggle('hidden', !visible);
    if (this.el.ammoWeaponName) this.el.ammoWeaponName.textContent = weaponName ? weaponName.toUpperCase() : '';
    if (this.el.ammoIcon) this.el.ammoIcon.innerHTML = icon(iconToken);
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
      this.el.extraCombo.innerHTML = comboVal > 1 ? `COMBO x${comboVal} ${icon('fire')}` : '';
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
    this.el.bannerIcon.innerHTML = icon(it.icon);
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
    if (!this.applyPortraitArt(this.el.dlgPortrait, line.who)) drawPortrait(this.el.dlgPortrait, line.who);
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
        const itemCfg = ITEMS[it.item] || { name: it.item, icon: 'box' };
        const num = it.qty > 1 ? `<span class="invQty">${it.qty}</span>` : '';
        slot.innerHTML = `<span class="invIcon">${icon(itemCfg.icon)}</span>${num}`;
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
      this.el.invCamSwitch.innerHTML = `${icon('camera')} CÂMERA: ${this.game.camMode === 'chase' ? '3ª PESSOA' : 'FIXA PS1'}`;
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
    const cfg = ITEMS[it.item] || { name: it.item, icon: 'box', desc: '', type: 'item' };
    this.el.invIcon.innerHTML = icon(cfg.icon);
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
      this.toast(icon('gear') + ' Selecione o segundo item para combinar.', 3);
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

  // ==================== MENU CARREGAR E SALVAR (IDÊNTICO À REFERÊNCIA DO SANATÓRIO) ====================
  showSaveBox(data = {}) {
    this._saveMode = data.mode || (data.from === 'title' ? 'load' : 'create');
    this._saveFrom = data.from || (this.game && this.game.state === 'savebox' ? 'game' : 'title');
    this._pendingSlotAction = null;
    this.saveSel = 0;

    const heroName = (data.hero || (this.game && this.game.currentCampaign ? this.game.currentCampaign.toUpperCase() : 'DANIEL SILVA')).toUpperCase();
    const roomName = (data.room || (this.game && this.game.room ? (this.game.room.name || this.game.room.id) : 'SAGUÃO PRINCIPAL')).toUpperCase();
    const saveCount = `${String(data.saves || (this.game ? this.game.saves : 0)).padStart(2, '0')} VEZES`;
    const timeVal = data.time || (this.game ? this.game.formattedTime() : '00:00:00');
    const hasInfInk = !!(data.infiniteInk || (this.game && this.game.unlocks && this.game.unlocks.infinite_ink));
    const ribbons = data.ribbons !== undefined ? data.ribbons : (this.game ? this.game.countItem('ribbon') : 0);
    const ribbonText = hasInfInk ? 'FITA INFINITA (LOJA)' : `x${ribbons} RESTANTES`;

    if (this.el.saveHeroName) this.el.saveHeroName.textContent = heroName;
    if (this.el.saveRoomName) this.el.saveRoomName.textContent = roomName;
    if (this.el.saveCountVal) this.el.saveCountVal.textContent = saveCount;
    if (this.el.saveTimeVal) this.el.saveTimeVal.textContent = timeVal;
    if (this.el.saveRibbonVal) this.el.saveRibbonVal.textContent = ribbonText;
    if (this.el.saveStamp) this.hide(this.el.saveStamp);

    this.updateSaveModeTabsUI(this._saveMode);
    this.renderSaveSlots();

    this.show(this.el.saveBox);
    this.startScreenParallaxAndFX('saveBox', 'saveWeatherCanvas', 'save');
  }

  hideSaveBox() {
    this.stopScreenParallaxAndFX('saveBox');
    this.hide(this.el.saveBox);
    const modal = this.$('saveConfirmModal');
    if (modal) this.hide(modal);
  }

  updateSaveModeTabsUI(mode) {
    this._saveMode = mode;
    const tabs = [
      { id: 'saveTabCreate', mode: 'create' },
      { id: 'saveTabDelete', mode: 'delete' },
      { id: 'saveTabLoad', mode: 'load' },
    ];
    tabs.forEach(({ id, mode: m }) => {
      const btn = this.$(id);
      if (btn) {
        if (m === mode) btn.classList.add('active');
        else btn.classList.remove('active');
      }
    });
  }

  renderSaveSlots() {
    const grid = this.$('saveSlotsGrid');
    if (!grid) return;
    grid.innerHTML = '';

    const slots = (this.game && typeof this.game.getSaveSlots === 'function')
      ? this.game.getSaveSlots()
      : [
          { slot: 1, empty: true },
          { slot: 2, empty: true },
          { slot: 3, empty: false, title: 'NOITE SEM FIM', date: '24/05/1924', roomName: 'SANATÓRIO' },
          { slot: 4, empty: false, title: 'O SILÊNCIO DOS ESQUECIDOS', date: '12/06/1924', roomName: 'PAVILHÃO C' },
          { slot: 5, empty: false, title: 'SUSSURROS NA ALA LESTE', date: '03/07/1924', roomName: 'ALA LESTE' },
          { slot: 6, empty: false, title: 'O ÚLTIMO REGISTRO', date: '18/08/1924', roomName: 'DESCONHECIDO' },
        ];

    const mothSvg = `
      <svg viewBox="0 0 64 36" width="56" height="32" class="mothSvg" fill="none">
        <path d="M 28 8 C 26 4 23 2 19 3 M 36 8 C 38 4 41 2 45 3" stroke="#cad8ec" stroke-width="1.2" stroke-linecap="round"/>
        <path d="M 29 11 C 24 5 12 4 4 10 C 2 13 4 19 12 21 C 18 22 25 18 28 14 Z" fill="rgba(180, 200, 225, 0.16)" stroke="#b0bccd" stroke-width="1.2"/>
        <path d="M 35 11 C 40 5 52 4 60 10 C 62 13 60 19 52 21 C 46 22 39 18 36 14 Z" fill="rgba(180, 200, 225, 0.16)" stroke="#b0bccd" stroke-width="1.2"/>
        <path d="M 12 11 C 18 13 22 15 28 14 M 14 16 C 18 17 22 17 27 15 M 52 11 C 46 13 42 15 36 14 M 50 16 C 46 17 42 17 37 15" stroke="#7e90a6" stroke-width="0.8"/>
        <path d="M 27 16 C 22 17 18 22 20 27 C 22 30 26 30 29 24 Z" fill="rgba(160, 185, 215, 0.22)" stroke="#92a4ba" stroke-width="1.1"/>
        <path d="M 37 16 C 42 17 46 22 44 27 C 42 30 38 30 35 24 Z" fill="rgba(160, 185, 215, 0.22)" stroke="#92a4ba" stroke-width="1.1"/>
        <ellipse cx="32" cy="12" rx="4" ry="4.5" fill="#141c28" stroke="#cad8ec" stroke-width="1.2"/>
        <circle cx="30.8" cy="11.5" r="0.9" fill="#cad8ec"/>
        <circle cx="33.2" cy="11.5" r="0.9" fill="#cad8ec"/>
        <path d="M 31 14 L 33 14" stroke="#cad8ec" stroke-width="0.8"/>
        <path d="M 30 16.5 C 30 24 31 29 32 30 C 33 29 34 24 34 16.5 Z" fill="#182232" stroke="#a4b4c8" stroke-width="1.1"/>
        <line x1="30.5" y1="20" x2="33.5" y2="20" stroke="#cad8ec" stroke-width="0.9"/>
        <line x1="30.8" y1="23.5" x2="33.2" y2="23.5" stroke="#cad8ec" stroke-width="0.9"/>
        <line x1="31.2" y1="26.8" x2="32.8" y2="26.8" stroke="#cad8ec" stroke-width="0.9"/>
      </svg>
    `;

    const padlockSvg = `
      <svg viewBox="0 0 16 16" width="12" height="12" class="slotPadlockSvg" fill="none">
        <rect x="3.5" y="6.5" width="9" height="7.5" rx="1" stroke="#7a889b" stroke-width="1.2" fill="#141a24"/>
        <path d="M 5.5 6.5 L 5.5 4 C 5.5 2.6 6.6 1.5 8 1.5 C 9.4 1.5 10.5 2.6 10.5 4 L 10.5 6.5" stroke="#7a889b" stroke-width="1.2"/>
        <circle cx="8" cy="10" r="0.9" fill="#cad8ec"/>
      </svg>
    `;

    const keySvg = `
      <svg viewBox="0 0 16 16" width="12" height="12" fill="none">
        <circle cx="5" cy="5" r="2.5" stroke="#9bb2cb" stroke-width="1.1"/>
        <line x1="7" y1="7" x2="13" y2="13" stroke="#9bb2cb" stroke-width="1.2"/>
        <line x1="10" y1="10" x2="12" y2="8" stroke="#9bb2cb" stroke-width="1.1"/>
      </svg>
    `;

    const skullSvg = `
      <svg viewBox="0 0 16 16" width="12" height="12" fill="none">
        <path d="M 4 8 C 4 4 6 2 8 2 C 10 2 12 4 12 8 C 12 11 10.5 12 10.5 13.5 L 5.5 13.5 C 5.5 12 4 11 4 8 Z" stroke="#9bb2cb" stroke-width="1.1" fill="#141c28"/>
        <circle cx="6.5" cy="7.5" r="1" fill="#9bb2cb"/>
        <circle cx="9.5" cy="7.5" r="1" fill="#9bb2cb"/>
      </svg>
    `;

    slots.forEach((s) => {
      const card = document.createElement('div');
      card.className = `saveSlotCard ${s.empty ? 'empty' : 'saved'}`;
      if (typeof card.setAttribute === 'function') {
        card.setAttribute('data-slot', String(s.slot));
      }

      const numStr = String(s.slot).padStart(2, '0');
      const title = s.empty ? 'VAGO' : (s.title || 'NOITE SEM FIM');
      const subtitle = s.empty ? 'SLOT VAZIO' : `${s.date || '24/05/1924'} - ${s.roomName || 'SANATÓRIO'}`;

      let emblemHtml = '';
      if (!s.empty) {
        if (s.slot === 5) emblemHtml = keySvg + padlockSvg;
        else if (s.slot === 6) emblemHtml = skullSvg + padlockSvg;
        else emblemHtml = padlockSvg;
      }

      card.innerHTML = `
        <div class="saveSlotCornerNumber">${numStr}</div>
        <div class="saveSlotMothWrap">${mothSvg}</div>
        <div class="saveSlotTitle"><span class="btnSelGlowIcon">❖</span>${title}</div>
        <div class="saveSlotSubtitle">${subtitle}</div>
        <div class="saveSlotStatusDot">◉</div>
        <div class="saveSlotEmblem">${emblemHtml}</div>
      `;

      card.onmouseenter = () => {
        if (this.audio) this.audio.sfx('uiMove');
      };

      card.onclick = () => {
        this.onSaveSlotClick(s);
      };

      grid.appendChild(card);
    });
  }

  onSaveSlotClick(slot) {
    const numStr = String(slot.slot).padStart(2, '0');
    const modal = this.$('saveConfirmModal');
    const modalTitle = this.$('saveModalTitle');
    const modalMsg = this.$('saveModalMsg');
    const btnYes = this.$('saveYes');

    if (this._saveMode === 'load') {
      if (slot.empty) {
        if (this.audio) this.audio.sfx('dryfire');
        this.toast(`Slot ${numStr} está vazio. Nenhum prontuário registrado.`, 2.5);
        return;
      }
      if (modalTitle) modalTitle.textContent = 'CARREGAR PRONTUÁRIO';
      if (modalMsg) modalMsg.innerHTML = `Deseja carregar o registro do <b>Slot ${numStr}</b>?<br><span style="color:#6ea4e8;font-size:11px;">"${slot.title}" · ${slot.date} (${slot.roomName})</span>`;
      if (btnYes) btnYes.textContent = '► SIM (CARREGAR)';
      this._pendingSlotAction = () => {
        if (this.audio) this.audio.sfx('uiSelect');
        this.hideSaveBox();
        if (this.game && typeof this.game.loadFromSlot === 'function') {
          this.game.loadFromSlot(slot.slot);
        }
      };
      if (modal) this.show(modal);

    } else if (this._saveMode === 'create') {
      const hasInfInk = !!(this.game && this.game.unlocks && this.game.unlocks.infinite_ink);
      const ribbons = (this.game && typeof this.game.countItem === 'function') ? this.game.countItem('ribbon') : 0;
      if (!hasInfInk && ribbons <= 0) {
        if (this.audio) this.audio.sfx('dryfire');
        if (this.game && this.game.say && D.salvar_sem_fita) this.game.say(D.salvar_sem_fita);
        else this.toast('Sem Fitas de Tinta para datilografar!', 3);
        return;
      }

      if (modalTitle) modalTitle.textContent = 'DATILOGRAFAR PRONTUÁRIO';
      const overwriteNote = !slot.empty ? `<br><span style="color:#ff8888;font-size:11px;"><svg class="ic"><use href="#i-alert"></use></svg> ATENÇÃO: Isso irá sobrescrever o registro "${slot.title}"!</span>` : '';
      const ribbonNote = hasInfInk ? '<br><span style="color:#6ee688;font-size:11px;">Fita de Tinta Infinita Ativa.</span>' : '<br><span style="color:#cad8ec;font-size:11px;">Consome 1 Fita de Tinta da sua maleta.</span>';
      if (modalMsg) modalMsg.innerHTML = `Deseja registrar o seu prontuário no <b>Slot ${numStr}</b>?${overwriteNote}${ribbonNote}`;
      if (btnYes) btnYes.textContent = '► SIM (DATILOGRAFAR)';
      this._pendingSlotAction = () => {
        if (this.audio) this.audio.sfx('typewriter');
        if (!hasInfInk && this.game && typeof this.game.removeItem === 'function') {
          this.game.removeItem('ribbon', 1);
        }
        if (this.game && typeof this.game.saveToSlot === 'function') {
          this.game.saveToSlot(slot.slot);
        }
        const stamp = this.$('saveStamp');
        if (stamp) this.show(stamp);
        setTimeout(() => {
          this.hideSaveBox();
          if (this.game) {
            this.game.state = 'play';
            this.toast(`${icon('ribbon')} Prontuário arquivado com sucesso no Slot ${numStr}.`, 4);
          }
        }, 550);
      };
      if (modal) this.show(modal);

    } else if (this._saveMode === 'delete') {
      if (slot.empty) {
        if (this.audio) this.audio.sfx('dryfire');
        this.toast(`Slot ${numStr} já está vazio.`, 2);
        return;
      }
      if (modalTitle) modalTitle.textContent = 'EXCLUIR PRONTUÁRIO';
      if (modalMsg) modalMsg.innerHTML = `Tem certeza que deseja apagar permanentemente o registro do <b>Slot ${numStr}</b>?<br><span style="color:#ff6666;font-size:11px;">"${slot.title}" · ${slot.date}</span>`;
      if (btnYes) btnYes.textContent = '► CONFIRMAR EXCLUSÃO';
      this._pendingSlotAction = () => {
        if (this.audio) this.audio.sfx('dryfire');
        if (this.game && typeof this.game.deleteSlot === 'function') {
          this.game.deleteSlot(slot.slot);
        }
        if (modal) this.hide(modal);
        this.toast(`Registro do Slot ${numStr} removido do arquivo morto.`, 3);
        this.renderSaveSlots();
      };
      if (modal) this.show(modal);
    }
  }

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
      d.className = 'pauseItem' + (i === this.menuIdx.pause ? ' sel' : '');
      d.innerHTML = `<span class="pArrow">►</span><span class="pLabel">${labels[act]}</span>`;
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
