// ============================================================
// SANTA LÚCIA - Equipe Nakamura - Áudio sintetizado via WebAudio
// SFX, ambientes e músicas gerados proceduralmente. Sem arquivos.
// ============================================================

const AMBIENTS = {
  quarto:    { base: 55, base2: 55.7, type: 'sawtooth', lp: 220, noise: 0.05, nlp: 400, lfo: 0.08, vol: 0.5 },
  saguao:    { base: 49, base2: 98.5, type: 'triangle', lp: 300, noise: 0.03, nlp: 300, lfo: 0.06, vol: 0.4 },
  enfermaria:{ base: 58, base2: 116.8, type: 'sawtooth', lp: 180, noise: 0.09, nlp: 900, lfo: 0.13, vol: 0.55 },
  consultorio:{ base: 65, base2: 65.9, type: 'sine', lp: 260, noise: 0.04, nlp: 350, lfo: 0.07, vol: 0.45 },
  porao:     { base: 41, base2: 41.6, type: 'sawtooth', lp: 140, noise: 0.14, nlp: 240, lfo: 0.2, vol: 0.65 },
  terraco:   { base: 46, base2: 92.3, type: 'sawtooth', lp: 200, noise: 0.3, nlp: 2400, lfo: 0.11, vol: 0.7 },
  floresta:  { base: 43, base2: 86.4, type: 'sine', lp: 280, noise: 0.22, nlp: 1200, lfo: 0.14, vol: 0.6 },
  capela:    { base: 55, base2: 110.2, type: 'triangle', lp: 340, noise: 0.05, nlp: 600, lfo: 0.05, vol: 0.5 },
  title:     { base: 43.6, base2: 65.4, type: 'sine', lp: 160, noise: 0.32, nlp: 1800, lfo: 0.065, vol: 0.75 },
  title_storm:{ base: 43.6, base2: 65.4, type: 'sine', lp: 160, noise: 0.32, nlp: 1800, lfo: 0.065, vol: 0.75 },
};

// notas: [semitom de A2=110Hz base ...] sequências simples
const MUSICS = {
  // tema do título: lamento em Lá menor com harmônico melancólico
  title: {
    wave: 'triangle', vol: 0.16, tempo: 0.62, harm: true,
    notes: [0, -1, 3, 7, 3, -1, 0, -4, -1, -4, 0, -5, -4, -1, 0, -12],
    base: 220,
  },
  // caixinha de música do saguão
  save: {
    wave: 'sine', vol: 0.1, tempo: 0.5, harm: true,
    notes: [0, 4, 7, 12, 7, 4, 0, -5, 0, 4, 7, 12, 14, 12, 7, 4],
    base: 440,
  },
  boss: {
    wave: 'sawtooth', vol: 0.14, tempo: 0.24,
    notes: [0, 0, 12, 0, 3, 0, 10, 0, 0, 0, 12, 0, 5, 3, 1, 0],
    base: 55, drum: true,
  },
  mercenaries: {
    wave: 'sawtooth', vol: 0.16, tempo: 0.16,
    notes: [0, 12, 0, 7, 3, 12, 0, 10, 0, 12, 0, 7, 5, 3, 1, 0],
    base: 65.4, drum: true,
  },
  capela: {
    wave: 'triangle', vol: 0.12, tempo: 0.58, harm: true,
    notes: [0, -4, 3, 7, 12, 7, 3, 0, -5, 0, 4, 8, 12, 8, 4, 0],
    base: 174.6,
  },
  ending: {
    wave: 'triangle', vol: 0.15, tempo: 0.55,
    notes: [0, 4, 7, 12, 16, 12, 7, 4, 5, 9, 12, 16, 19, 16, 12, 9],
    base: 261.6,
  },
};

export class AudioSys {
  constructor() {
    this.ctx = null;
    this.master = null; this.musicG = null; this.sfxG = null; this.ambG = null;
    this.vMaster = 0.9; this.vMusic = 0.8; this.vSfx = 0.9;
    this.ambNodes = null;
    this.curAmb = null;
    this.musicTimer = null;
    this.musicState = null;
    this.curMusic = null;
    this.pendingAmb = null;
    this.pendingMusic = null;
    this.heartTimer = null;
    this.noiseBuf = null;

    // Inicialização segura de vozes para o leitor de legendas
    this.voices = [];
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const getV = () => {
        try { this.voices = window.speechSynthesis.getVoices() || []; } catch (e) {}
      };
      getV();
      try { window.speechSynthesis.onvoiceschanged = getV; } catch (e) {}
    }
  }

  stopVoice() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
      } catch (e) {}
    }
  }

  // Dublagem direta das legendas via síntese de voz (sem MP3s pré-gravados)
  speakSubtitle(text, who) {
    if (typeof window === 'undefined' || !('speechSynthesis' in window) || !text) return;
    try {
      this.stopVoice();

      const clean = text
        .replace(/<[^>]*>/g, '')
        .replace(/[—"'\(\)\[\]]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      if (!clean) return;

      const utter = new SpeechSynthesisUtterance(clean);
      utter.lang = 'pt-BR';
      const vol = Math.max(0.2, Math.min(1.0, this.vMaster * this.vSfx));
      utter.volume = vol;

      // Personalização de afinação e ritmo por personagem
      if (who === 'clara') {
        utter.pitch = 1.25; utter.rate = 1.05;
      } else if (who === 'bento') {
        utter.pitch = 0.72; utter.rate = 0.95;
      } else if (who === 'daniel') {
        utter.pitch = 1.0; utter.rate = 1.0;
      } else if (who === 'vulto' || who === 'medico') {
        utter.pitch = 0.55; utter.rate = 0.85;
      } else if (who === 'lucia' || who === 'q') {
        utter.pitch = 1.35; utter.rate = 0.92;
      } else {
        // Narrador ('n') e mensagens de sistema
        utter.pitch = 0.95; utter.rate = 1.0;
      }

      if (!this.voices || this.voices.length === 0) {
        try { this.voices = window.speechSynthesis.getVoices() || []; } catch (e) {}
      }
      const pt = this.voices.find((v) => v.lang && (v.lang.startsWith('pt') || v.lang.includes('PT') || v.lang.includes('pt-BR')));
      if (pt) utter.voice = pt;

      window.speechSynthesis.speak(utter);
    } catch (e) {}
  }

  unlock() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') {
        try { this.ctx.resume().catch(() => {}); } catch (e) {}
      }
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain(); this.master.connect(this.ctx.destination);
    this.musicG = this.ctx.createGain(); this.musicG.connect(this.master);
    this.sfxG = this.ctx.createGain(); this.sfxG.connect(this.master);
    this.ambG = this.ctx.createGain(); this.ambG.connect(this.master);
    this.applyVol();
    // buffer de ruído reutilizável (2s)
    const len = this.ctx.sampleRate * 2;
    this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    // dispara o que foi pedido antes do unlock (ex: música do título)
    const pa = this.pendingAmb, pm = this.pendingMusic;
    this.pendingAmb = null; this.pendingMusic = null;
    if (pa) this.ambient(pa);
    if (pm) this.music(pm);
  }

  applyVol() {
    if (!this.ctx) return;
    this.master.gain.value = this.vMaster;
    this.musicG.gain.value = this.vMusic;
    this.sfxG.gain.value = this.vSfx;
  }
  setMaster(v) { this.vMaster = v; this.applyVol(); }
  setMusic(v) { this.vMusic = v; this.applyVol(); }
  setSfx(v) { this.vSfx = v; this.applyVol(); }
  setVolume(which, v) {
    if (which === 'master') this.setMaster(v);
    else if (which === 'music') this.setMusic(v);
    else if (which === 'sfx') this.setSfx(v);
  }

  get ready() { return !!this.ctx; }
  now() { return this.ctx ? this.ctx.currentTime : 0; }

  // ---------- primitivas ----------
  tone({ f = 440, f2 = null, t = 0.3, v = 0.3, type = 'sine', at = 0, dest = null }) {
    if (!this.ctx) return;
    const t0 = this.now() + at;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t0);
    if (f2 !== null) o.frequency.exponentialRampToValueAtTime(Math.max(1, f2), t0 + t);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(v, t0 + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + t);
    o.connect(g); g.connect(dest || this.sfxG);
    o.start(t0); o.stop(t0 + t + 0.05);
  }

  noise({ t = 0.3, v = 0.3, fc = 1000, q = 1, type = 'lowpass', at = 0, fc2 = null, dest = null }) {
    if (!this.ctx) return;
    const t0 = this.now() + at;
    const s = this.ctx.createBufferSource();
    s.buffer = this.noiseBuf; s.loop = true;
    s.playbackRate.value = 0.7 + Math.random() * 0.6;
    const f = this.ctx.createBiquadFilter();
    f.type = type; f.frequency.setValueAtTime(fc, t0); f.Q.value = q;
    if (fc2 !== null) f.frequency.exponentialRampToValueAtTime(Math.max(10, fc2), t0 + t);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(v, t0 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + t);
    s.connect(f); f.connect(g); g.connect(dest || this.sfxG);
    s.start(t0); s.stop(t0 + t + 0.05);
  }

  // ---------- SFX ----------
  sfx(name, opt = {}) {
    if (!this.ctx) return;
    switch (name) {
      case 'step':
        this.noise({ t: 0.09, v: 0.12, fc: 300 + Math.random() * 200 });
        break;
      case 'stepRun':
        this.noise({ t: 0.08, v: 0.16, fc: 500 });
        break;
      case 'uiMove': this.tone({ f: 660, t: 0.05, v: 0.12, type: 'square' }); break;
      case 'uiSelect':
        this.tone({ f: 520, t: 0.09, v: 0.16, type: 'square' });
        this.tone({ f: 780, t: 0.12, v: 0.16, type: 'square', at: 0.07 });
        break;
      case 'uiBack': this.tone({ f: 330, f2: 220, t: 0.12, v: 0.16, type: 'square' }); break;
      case 'uiTransition':
        // Transição suave e elegante de tela estilo RE Remake (deslocamento de ar frio sombrio)
        this.noise({ t: 0.32, v: 0.15, fc: 650, fc2: 80, q: 2.0, type: 'bandpass' });
        this.tone({ f: 90, f2: 38, t: 0.35, v: 0.12, type: 'sine' });
        break;
      case 'type': this.tone({ f: 900 + Math.random() * 400, t: 0.02, v: 0.05, type: 'square' }); break;
      case 'pickup':
        [523, 659, 784].forEach((f, i) => this.tone({ f, t: 0.14, v: 0.18, type: 'square', at: i * 0.09 }));
        break;
      case 'pickupKey': // jingle estilo RE
        [392, 523, 659, 784, 1046].forEach((f, i) => this.tone({ f, t: 0.22, v: 0.16, type: 'triangle', at: i * 0.11 }));
        this.tone({ f: 196, t: 0.7, v: 0.1, type: 'sine', at: 0.1 });
        break;
      case 'heal':
        this.tone({ f: 440, f2: 880, t: 0.4, v: 0.15, type: 'sine' });
        this.noise({ t: 0.3, v: 0.06, fc: 3000, type: 'highpass', at: 0.05 });
        break;
      case 'pistol':
        this.noise({ t: 0.18, v: 0.5, fc: 3500, fc2: 300 });
        this.tone({ f: 220, f2: 40, t: 0.22, v: 0.4, type: 'square' });
        break;
      case 'revolver':
        this.noise({ t: 0.22, v: 0.6, fc: 4200, fc2: 240 });
        this.tone({ f: 280, f2: 35, t: 0.28, v: 0.55, type: 'square' });
        break;
      case 'typewriter':
        // som clássico de máquina de escrever estilo RE
        for (let i = 0; i < 4; i++) {
          this.tone({ f: 1200 + Math.random() * 600, t: 0.03, v: 0.14, type: 'square', at: i * 0.12 });
          this.noise({ t: 0.04, v: 0.12, fc: 2400, at: i * 0.12 });
        }
        // campainha mecânica "ding!"
        this.tone({ f: 1760, t: 0.5, v: 0.25, type: 'sine', at: 0.55 });
        break;
      case 'totem':
        // quebra de cristal e bônus de tempo
        [587, 880, 1174, 1760].forEach((f, i) => this.tone({ f, t: 0.2, v: 0.18, type: 'triangle', at: i * 0.07 }));
        this.noise({ t: 0.25, v: 0.2, fc: 3000, type: 'highpass' });
        break;
      case 'growlBrute':
        this.tone({ f: 45, f2: 30, t: 1.2, v: 0.35, type: 'sawtooth' });
        this.noise({ t: 0.8, v: 0.25, fc: 350, fc2: 80 });
        break;
      case 'dogBark':
        this.tone({ f: 260, f2: 120, t: 0.18, v: 0.25, type: 'sawtooth' });
        this.noise({ t: 0.15, v: 0.2, fc: 1200 });
        break;
      case 'crawlerHiss':
        this.noise({ t: 0.45, v: 0.25, fc: 3200, type: 'bandpass', q: 3 });
        break;
      case 'radioBeep':
        this.noise({ t: 0.08, v: 0.15, fc: 1800 });
        this.tone({ f: 880, t: 0.06, v: 0.12, type: 'square', at: 0.04 });
        this.tone({ f: 1320, t: 0.08, v: 0.14, type: 'square', at: 0.1 });
        break;
      case 'voiceTalk': {
        const pitch = opt.pitch || (opt.who === 'clara' ? 280 : opt.who === 'bento' ? 140 : 190);
        this.tone({ f: pitch, f2: pitch * 0.85, t: 0.07, v: 0.15, type: 'triangle' });
        break;
      }
      case 'shotgun':
        this.noise({ t: 0.4, v: 0.65, fc: 2500, fc2: 120 });
        this.tone({ f: 140, f2: 30, t: 0.4, v: 0.5, type: 'square' });
        break;
      case 'dryfire': this.tone({ f: 1200, t: 0.04, v: 0.12, type: 'square' }); break;
      case 'knife':
        this.noise({ t: 0.12, v: 0.2, fc: 4000, type: 'bandpass', q: 2, fc2: 1000 });
        break;
      case 'hitFlesh':
        this.noise({ t: 0.14, v: 0.35, fc: 700, fc2: 200 });
        this.tone({ f: 180, f2: 60, t: 0.12, v: 0.2, type: 'sawtooth' });
        break;
      case 'hitWall':
        this.noise({ t: 0.1, v: 0.2, fc: 2000, fc2: 500 });
        break;
      case 'enemyDie':
        this.tone({ f: 300, f2: 40, t: 0.7, v: 0.3, type: 'sawtooth' });
        this.noise({ t: 0.5, v: 0.2, fc: 600, fc2: 100, at: 0.1 });
        break;
      case 'enemyGrowl':
        this.tone({ f: 70 + Math.random() * 30, f2: 45, t: 0.8, v: 0.22, type: 'sawtooth' });
        break;
      case 'playerHurt':
        this.tone({ f: 300, f2: 90, t: 0.3, v: 0.3, type: 'sawtooth' });
        this.noise({ t: 0.2, v: 0.25, fc: 800 });
        break;
      case 'doorCreak':
        this.tone({ f: 180, f2: 320, t: 0.9, v: 0.12, type: 'sawtooth' });
        this.tone({ f: 90, f2: 140, t: 0.9, v: 0.14, type: 'square', at: 0.1 });
        this.noise({ t: 0.9, v: 0.05, fc: 500, at: 0.1 });
        break;
      case 'doorSlam':
        this.noise({ t: 0.25, v: 0.4, fc: 400, fc2: 80 });
        this.tone({ f: 90, f2: 35, t: 0.3, v: 0.35 });
        break;
      case 'locked':
        this.tone({ f: 140, t: 0.1, v: 0.25, type: 'square' });
        this.tone({ f: 110, t: 0.14, v: 0.25, type: 'square', at: 0.12 });
        break;
      case 'unlock':
        this.tone({ f: 500, t: 0.07, v: 0.2, type: 'square' });
        this.tone({ f: 750, t: 0.1, v: 0.2, type: 'square', at: 0.09 });
        break;
      case 'puzzle':
        [523, 659, 784, 1046, 784, 1046].forEach((f, i) =>
          this.tone({ f, t: 0.2, v: 0.15, type: 'triangle', at: i * 0.12 }));
        break;
      case 'power':
        this.tone({ f: 50, f2: 200, t: 0.6, v: 0.25, type: 'sawtooth' });
        this.noise({ t: 0.4, v: 0.1, fc: 5000, type: 'highpass', at: 0.2 });
        this.tone({ f: 440, t: 0.5, v: 0.06, type: 'sine', at: 0.5 });
        break;
      case 'valve':
        for (let i = 0; i < 5; i++) {
          this.tone({ f: 200, f2: 120, t: 0.12, v: 0.15, type: 'square', at: i * 0.18 });
          this.noise({ t: 0.1, v: 0.1, fc: 800, at: i * 0.18 });
        }
        this.noise({ t: 1.6, v: 0.2, fc: 600, fc2: 200, at: 0.9 });
        break;
      case 'water':
        this.noise({ t: 1.8, v: 0.25, fc: 900, fc2: 300 });
        break;
      case 'safeTick': this.tone({ f: 1500, t: 0.03, v: 0.1, type: 'square' }); break;
      case 'safeOpen':
        this.tone({ f: 200, f2: 600, t: 0.25, v: 0.2, type: 'square' });
        this.noise({ t: 0.5, v: 0.15, fc: 400, at: 0.15 });
        this.tone({ f: 800, t: 0.3, v: 0.1, type: 'sine', at: 0.3 });
        break;
      case 'safeFail':
        this.tone({ f: 220, f2: 110, t: 0.4, v: 0.2, type: 'square' });
        break;
      case 'elevator':
        this.tone({ f: 80, f2: 160, t: 1.4, v: 0.15, type: 'sawtooth' });
        this.noise({ t: 1.4, v: 0.08, fc: 300, at: 0.1 });
        this.tone({ f: 880, t: 0.3, v: 0.12, type: 'sine', at: 1.3 });
        break;
      case 'thunder':
        this.thunder(opt);
        break;
      case 'thunderClose':
        this.thunder({ close: true, ...opt });
        break;
      case 'thunderDistant':
        this.thunder({ close: false, ...opt });
        break;
      case 'chapelBell':
        this.chapelBell(opt);
        break;
      case 'sponsorChatGPT':
        this.sponsorChatGPT();
        break;
      case 'sponsorGrok':
        this.sponsorGrok();
        break;
      case 'sponsorArena':
        this.sponsorArena();
        break;
      case 'bossRoar':
        this.tone({ f: 60, f2: 35, t: 1.6, v: 0.45, type: 'sawtooth' });
        this.tone({ f: 90, f2: 50, t: 1.4, v: 0.3, type: 'square', at: 0.1 });
        this.noise({ t: 1.2, v: 0.3, fc: 400, fc2: 80, at: 0.1 });
        break;
      case 'slam':
        this.noise({ t: 0.4, v: 0.5, fc: 500, fc2: 60 });
        this.tone({ f: 70, f2: 25, t: 0.5, v: 0.45 });
        break;
      case 'sponsorImpact':
        this.sponsorChatGPT();
        break;
      case 'memorial':
        [261, 329, 392, 523, 659].forEach((f, i) =>
          this.tone({ f, t: 0.6, v: 0.12, type: 'sine', at: i * 0.2 }));
        this.noise({ t: 1.5, v: 0.05, fc: 6000, type: 'highpass', at: 0.2 });
        break;
      case 'save':
        [659, 784, 880, 1046, 880, 784, 659, 523].forEach((f, i) =>
          this.tone({ f, t: 0.35, v: 0.12, type: 'sine', at: i * 0.22 }));
        break;
      case 'typewriter':
        for (let i = 0; i < 6; i++) {
          this.tone({ f: 1800, t: 0.03, v: 0.1, type: 'square', at: i * 0.1 });
          this.noise({ t: 0.03, v: 0.08, fc: 3000, at: i * 0.1 });
        }
        break;
      case 'heartbeat':
        this.tone({ f: 55, f2: 35, t: 0.14, v: 0.4 });
        this.tone({ f: 50, f2: 32, t: 0.12, v: 0.3, at: 0.22 });
        break;
      case 'glass':
        [2100, 2600, 3100, 1800].forEach((f, i) =>
          this.tone({ f, t: 0.15, v: 0.08, type: 'sine', at: i * 0.04 }));
        this.noise({ t: 0.3, v: 0.15, fc: 6000, type: 'highpass' });
        break;
      case 'static':
        this.noise({ t: 0.8, v: 0.2, fc: 4000, type: 'highpass' });
        break;
      case 'gameover':
        [220, 207, 196, 185, 174].forEach((f, i) =>
          this.tone({ f, t: 0.7, v: 0.18, type: 'triangle', at: i * 0.45 }));
        break;
      case 'sting': // susto
        this.tone({ f: 110, f2: 440, t: 0.35, v: 0.3, type: 'sawtooth' });
        this.noise({ t: 0.4, v: 0.3, fc: 2000, fc2: 200 });
        break;
    }
  }

  // ==================== DESIGN DE SOM DOS PATROCINADORES (RE REMAKE) ====================
  sponsorChatGPT() {
    if (!this.ctx) return;
    // 1. Sub-grave profundo de impacto e suspense
    this.tone({ f: 55, f2: 24, t: 2.4, v: 0.45, type: 'sine' });
    this.noise({ t: 1.5, v: 0.25, fc: 320, fc2: 45, at: 0.02 });
    // 2. Ranger metálico gótico: portão centenário do Sanatório abrindo na neblina
    const t0 = this.now() + 0.12;
    const osc = this.ctx.createOscillator();
    const mod = this.ctx.createOscillator();
    const modG = this.ctx.createGain();
    const g = this.ctx.createGain();
    const f = this.ctx.createBiquadFilter();
    f.type = 'bandpass'; f.frequency.value = 850; f.Q.value = 4.0;
    osc.type = 'sawtooth'; osc.frequency.setValueAtTime(140, t0);
    osc.frequency.exponentialRampToValueAtTime(75, t0 + 1.25);
    mod.frequency.setValueAtTime(45, t0);
    mod.frequency.linearRampToValueAtTime(12, t0 + 1.25);
    modG.gain.value = 65;
    mod.connect(modG); modG.connect(osc.frequency);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(0.18, t0 + 0.1);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.35);
    osc.connect(f); f.connect(g); g.connect(this.sfxG);
    osc.start(t0); mod.start(t0);
    osc.stop(t0 + 1.4); mod.stop(t0 + 1.4);
    // 3. Harmônicos fúnebres de sino distante
    [110, 131, 220, 277].forEach((freq, i) => {
      this.tone({ f: freq, t: 2.0, v: 0.09, type: 'sine', at: 0.08 + i * 0.03 });
    });
  }

  sponsorGrok() {
    if (!this.ctx) return;
    // 1. Ruptura de relâmpago violento chicoteando o granito ensanguentado
    this.noise({ t: 0.22, v: 0.52, fc: 4800, fc2: 240, type: 'bandpass', q: 2.5 });
    this.tone({ f: 300, f2: 55, t: 0.38, v: 0.38, type: 'sawtooth' });
    // 2. Trovão ribombante de tempestade nos contrafortes da serra
    this.noise({ t: 3.0, v: 0.42, fc: 380, fc2: 35, at: 0.06 });
    this.tone({ f: 65, f2: 26, t: 2.8, v: 0.42, type: 'sine', at: 0.08 });
    // 3. Respingo gélido de chuva torrencial batendo na pedra fria
    this.noise({ t: 2.2, v: 0.18, fc: 1900, fc2: 950, type: 'bandpass', at: 0.25 });
    // 4. Pedal grave de órgão de capela gótica (36.7Hz / D1)
    this.tone({ f: 36.7, t: 2.4, v: 0.24, type: 'triangle', at: 0.12 });
    this.tone({ f: 73.4, t: 2.2, v: 0.14, type: 'sine', at: 0.12 });
  }

  sponsorArena() {
    if (!this.ctx) return;
    // 1. Choque de lâminas: daggers cruzadas ressoando em aço puro
    this.tone({ f: 1864, f2: 1200, t: 0.75, v: 0.18, type: 'triangle' });
    this.tone({ f: 2795, f2: 2400, t: 0.95, v: 0.14, type: 'sine' });
    this.noise({ t: 0.25, v: 0.28, fc: 6800, type: 'highpass' });
    // 2. Crescendo espectral de coro gótico do Sanatório
    [220, 261.6, 329.6, 440].forEach((freq) => {
      this.tone({ f: freq, t: 2.6, v: 0.15, type: 'sine', at: 0.1 });
    });
    // 3. Impacto cinemático de fechamento
    this.tone({ f: 50, f2: 20, t: 2.6, v: 0.48, type: 'sine', at: 0.15 });
    this.noise({ t: 2.0, v: 0.32, fc: 280, fc2: 38, at: 0.15 });
    // 4. Rajada de vento uivante antecipando a tela de título
    this.noise({ t: 2.8, v: 0.22, fc: 520, fc2: 180, q: 3.2, type: 'bandpass', at: 0.35 });
  }

  sponsorImpact() {
    this.sponsorChatGPT();
  }

  // ==================== TROVÃO E TEMPESTADE DA SERRA ====================
  thunder(opt = {}) {
    if (!this.ctx) return;
    const isClose = opt.close !== undefined ? opt.close : (Math.random() < 0.65);
    const delay = opt.delay || 0;

    if (isClose) {
      // 1. Estalo de chicote do relâmpago atingindo a montanha (whip crack)
      this.noise({ t: 0.28, v: 0.52, fc: 2400, fc2: 260, type: 'bandpass', q: 2.2, at: delay });
      this.tone({ f: 240, f2: 45, t: 0.35, v: 0.42, type: 'sawtooth', at: delay });
      // 2. Impacto violento de sub-grave sacudindo as paredes do sanatório
      this.tone({ f: 75, f2: 24, t: 3.4, v: 0.55, type: 'sine', at: delay + 0.04 });
      this.noise({ t: 3.8, v: 0.46, fc: 400, fc2: 32, at: delay + 0.05 });
      // 3. Reverberação rolante nos desfiladeiros da Serra da Mantiqueira
      this.noise({ t: 2.8, v: 0.32, fc: 180, fc2: 38, at: delay + 0.55 });
      this.tone({ f: 50, f2: 20, t: 2.6, v: 0.28, type: 'sine', at: delay + 0.7 });
    } else {
      // Trovão distante rolando suavemente pelo vale na tempestade
      this.noise({ t: 4.0, v: 0.3, fc: 160, fc2: 28, at: delay });
      this.tone({ f: 48, f2: 22, t: 3.6, v: 0.32, type: 'sine', at: delay });
      this.noise({ t: 2.5, v: 0.2, fc: 110, fc2: 30, at: delay + 0.85 });
    }
  }

  // ==================== SINO FÚNEBRE DA CAPELA DO SANATÓRIO ====================
  chapelBell(opt = {}) {
    if (!this.ctx) return;
    const f0 = opt.pitch || 110; // A2 fundamental
    const vol = opt.vol !== undefined ? opt.vol : 0.18;
    const t0 = this.now() + (opt.delay || 0);

    const partials = [
      { mult: 0.5,  v: 0.6,  dur: 5.5 },
      { mult: 1.0,  v: 1.0,  dur: 5.0 },
      { mult: 1.19, v: 0.85, dur: 4.2 }, // terça menor gótica
      { mult: 1.5,  v: 0.65, dur: 3.5 },
      { mult: 2.0,  v: 0.55, dur: 3.0 },
      { mult: 2.74, v: 0.35, dur: 2.2 },
      { mult: 4.1,  v: 0.22, dur: 1.4 },
    ];

    // Batida inicial do badalo de ferro
    this.noise({ t: 0.04, v: vol * 0.4, fc: 2400, type: 'bandpass', q: 3.0, at: opt.delay || 0 });

    partials.forEach((p) => {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      const lp = this.ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 1600;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(f0 * p.mult, t0);

      g.gain.setValueAtTime(0.0001, t0);
      g.gain.linearRampToValueAtTime(vol * p.v, t0 + 0.025);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + p.dur);

      osc.connect(lp);
      lp.connect(g);
      g.connect(this.sfxG);

      osc.start(t0);
      osc.stop(t0 + p.dur + 0.05);
    });
  }

  // ==================== AMBIENTE PROCEDURAL ====================
  ambient(name) {
    this.pendingAmb = name;
    if (!this.ctx || this.curAmb === name) return;
    this.curAmb = name;
    const P = AMBIENTS[name] || AMBIENTS.quarto;
    const t = this.now();

    // Limpa ambiente anterior
    this.stopAmbient(true);

    // Sistema dedicado para a tempestade da tela inicial (chuva contínua, vento uivante, pingos e sino)
    if (name === 'title_storm' || name === 'title' || name === 'storm') {
      this.startStormAmbient(t, P);
      return;
    }

    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(P.vol * 0.35, t + 2);
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = P.lp;
    const o1 = this.ctx.createOscillator(); o1.type = P.type; o1.frequency.value = P.base;
    const o2 = this.ctx.createOscillator(); o2.type = P.type; o2.frequency.value = P.base2;
    const og = this.ctx.createGain(); og.gain.value = 0.5;
    o1.connect(og); o2.connect(og); og.connect(lp); lp.connect(g);
    // ruído
    const ns = this.ctx.createBufferSource();
    ns.buffer = this.noiseBuf; ns.loop = true;
    const nf = this.ctx.createBiquadFilter();
    nf.type = 'lowpass'; nf.frequency.value = P.nlp;
    const ng = this.ctx.createGain(); ng.gain.value = P.noise * 3;
    ns.connect(nf); nf.connect(ng); ng.connect(g);
    // LFO de respiração
    const lfo = this.ctx.createOscillator(); lfo.frequency.value = P.lfo;
    const lg = this.ctx.createGain(); lg.gain.value = P.vol * 0.12;
    lfo.connect(lg); lg.connect(g.gain);
    g.connect(this.ambG);
    o1.start(); o2.start(); ns.start(); lfo.start();
    this.ambNodes = { g, o1, o2, ns, lfo };
  }

  startStormAmbient(t, P) {
    const masterAmbG = this.ctx.createGain();
    masterAmbG.gain.setValueAtTime(0.0001, t);
    masterAmbG.gain.linearRampToValueAtTime(Math.min(1.0, (P.vol || 0.75) * 0.52), t + 2.0);
    masterAmbG.connect(this.ambG);

    // 1. Chuva: Chiado de impacto e goteiras nas calhas (Bandpass 2600Hz)
    const rainPatter = this.ctx.createBufferSource();
    rainPatter.buffer = this.noiseBuf;
    rainPatter.loop = true;
    rainPatter.playbackRate.value = 1.05;
    const rainPatterFilter = this.ctx.createBiquadFilter();
    rainPatterFilter.type = 'bandpass';
    rainPatterFilter.frequency.value = 2600;
    rainPatterFilter.Q.value = 1.6;
    const rainPatterG = this.ctx.createGain();
    rainPatterG.gain.value = 0.22;
    rainPatter.connect(rainPatterFilter);
    rainPatterFilter.connect(rainPatterG);
    rainPatterG.connect(masterAmbG);

    // 2. Chuva: Massa torrencial encorpada (Lowpass 1100Hz)
    const rainBody = this.ctx.createBufferSource();
    rainBody.buffer = this.noiseBuf;
    rainBody.loop = true;
    rainBody.playbackRate.value = 0.8;
    const rainBodyFilter = this.ctx.createBiquadFilter();
    rainBodyFilter.type = 'lowpass';
    rainBodyFilter.frequency.value = 1100;
    rainBodyFilter.Q.value = 0.9;
    const rainBodyG = this.ctx.createGain();
    rainBodyG.gain.value = 0.28;
    rainBody.connect(rainBodyFilter);
    rainBodyFilter.connect(rainBodyG);
    rainBodyG.connect(masterAmbG);

    // 3. Vento Uivante da Serra da Mantiqueira (Bandpass com modulação contínua)
    const wind = this.ctx.createBufferSource();
    wind.buffer = this.noiseBuf;
    wind.loop = true;
    wind.playbackRate.value = 0.65;
    const windFilter = this.ctx.createBiquadFilter();
    windFilter.type = 'bandpass';
    windFilter.frequency.setValueAtTime(320, t);
    windFilter.Q.value = 3.6;

    // LFO 1: Varredura contínua de afinação das rajadas de vento (0.065Hz -> 15s ciclo)
    const windPitchLfo = this.ctx.createOscillator();
    windPitchLfo.frequency.value = 0.065;
    const windPitchLfoG = this.ctx.createGain();
    windPitchLfoG.gain.value = 220;
    windPitchLfo.connect(windPitchLfoG);
    windPitchLfoG.connect(windFilter.frequency);

    // LFO 2: Modulação de volume da respiração do vento (0.038Hz)
    const windVolLfo = this.ctx.createOscillator();
    windVolLfo.frequency.value = 0.038;
    const windVolLfoG = this.ctx.createGain();
    windVolLfoG.gain.value = 0.09;
    const windG = this.ctx.createGain();
    windG.gain.setValueAtTime(0.18, t);
    windVolLfo.connect(windVolLfoG);
    windVolLfoG.connect(windG.gain);

    wind.connect(windFilter);
    windFilter.connect(windG);
    windG.connect(masterAmbG);

    // 4. Ressonância oca e gélida do sanatório abandonado (Drone de sub-grave)
    const drone1 = this.ctx.createOscillator();
    drone1.type = 'sine';
    drone1.frequency.value = 43.65; // F0
    const drone2 = this.ctx.createOscillator();
    drone2.type = 'triangle';
    drone2.frequency.value = 65.41; // C1
    const droneLp = this.ctx.createBiquadFilter();
    droneLp.type = 'lowpass';
    droneLp.frequency.value = 160;
    const droneG = this.ctx.createGain();
    droneG.gain.value = 0.22;
    drone1.connect(droneLp);
    drone2.connect(droneLp);
    droneLp.connect(droneG);
    droneG.connect(masterAmbG);

    rainPatter.start(t);
    rainBody.start(t);
    wind.start(t);
    windPitchLfo.start(t);
    windVolLfo.start(t);
    drone1.start(t);
    drone2.start(t);

    const timers = [];

    // 5. Gotejamento aleatório de calhas e cornijas de pedra
    const scheduleDrip = () => {
      if (!this.ambNodes || (this.curAmb !== 'title_storm' && this.curAmb !== 'title')) return;
      const nextDelay = 350 + Math.random() * 950;
      const dt = setTimeout(() => {
        if (!this.ambNodes || (this.curAmb !== 'title_storm' && this.curAmb !== 'title')) return;
        const f1 = 950 + Math.random() * 450;
        const f2 = 550 + Math.random() * 250;
        this.tone({ f: f1, f2, t: 0.02, v: 0.05 + Math.random() * 0.04, type: 'sine', dest: masterAmbG });
        scheduleDrip();
      }, nextDelay);
      timers.push(dt);
    };
    scheduleDrip();

    // 6. Sino fúnebre distante da capela a cada 32 segundos
    const bellTm = setInterval(() => {
      if ((this.curAmb === 'title_storm' || this.curAmb === 'title') && this.ready) {
        this.chapelBell({ pitch: 110, vol: 0.16 });
      }
    }, 32000);
    timers.push(bellTm);

    // 7. Trovão distante ocasional a cada 20 segundos
    const thunderTm = setInterval(() => {
      if ((this.curAmb === 'title_storm' || this.curAmb === 'title') && this.ready) {
        this.thunder({ close: false, delay: 0 });
      }
    }, 20000);
    timers.push(thunderTm);

    this.ambNodes = {
      g: masterAmbG,
      sources: [rainPatter, rainBody, wind, drone1, drone2, windPitchLfo, windVolLfo],
      timers,
      stop() {
        timers.forEach((tm) => {
          try { clearTimeout(tm); clearInterval(tm); } catch (e) {}
        });
      }
    };
  }

  stopAmbient(keepPending = false) {
    if (!keepPending) this.curAmb = null;
    if (this.ambNodes && this.ctx) {
      const old = this.ambNodes; const t = this.now();
      if (typeof old.stop === 'function') {
        try { old.stop(); } catch (e) {}
      }
      if (old.timers && Array.isArray(old.timers)) {
        old.timers.forEach((tm) => {
          try { clearTimeout(tm); clearInterval(tm); } catch (e) {}
        });
      }
      if (old.g && old.g.gain) {
        try {
          old.g.gain.cancelScheduledValues(t);
          old.g.gain.setValueAtTime(old.g.gain.value, t);
          old.g.gain.linearRampToValueAtTime(0.0001, t + 0.8);
        } catch (e) {}
      }
      setTimeout(() => {
        if (old.sources && Array.isArray(old.sources)) {
          old.sources.forEach((s) => { try { s.stop(); } catch (e) {} });
        } else {
          try {
            if (old.o1) old.o1.stop();
            if (old.o2) old.o2.stop();
            if (old.ns) old.ns.stop();
            if (old.lfo) old.lfo.stop();
          } catch (e) {}
        }
      }, 1000);
      this.ambNodes = null;
    }
  }

  // ---------- MÚSICA (sequenciador simples) ----------
  music(name) {
    this.pendingMusic = name;
    if (this.curMusic === name) return;
    this.stopMusic();
    if (!name || !this.ctx) return;
    const M = MUSICS[name];
    if (!M) return;
    this.curMusic = name;
    let step = 0;
    const playStep = () => {
      if (this.curMusic !== name || !this.ctx) return;
      const semi = M.notes[step % M.notes.length];
      const f = M.base * Math.pow(2, semi / 12);
      this.tone({ f, t: M.tempo * 1.8, v: M.vol, type: M.wave, dest: this.musicG });
      if (M.harm) this.tone({ f: f * 2, t: M.tempo * 1.2, v: M.vol * 0.3, type: 'sine', dest: this.musicG });
      if (M.drum) {
        this.tone({ f: 60, f2: 30, t: 0.15, v: 0.3, dest: this.musicG });
        if (step % 2 === 0) this.noise({ t: 0.08, v: 0.1, fc: 5000, type: 'highpass', dest: this.musicG });
      }
      step++;
    };
    playStep();
    this.musicTimer = setInterval(playStep, M.tempo * 1000);
  }

  stopMusic() {
    this.curMusic = null;
    if (this.musicTimer) { clearInterval(this.musicTimer); this.musicTimer = null; }
  }

  heartbeat(on) {
    if (on && !this.heartTimer && this.ctx) {
      const beat = () => this.sfx('heartbeat');
      beat();
      this.heartTimer = setInterval(beat, 1100);
    } else if (!on && this.heartTimer) {
      clearInterval(this.heartTimer);
      this.heartTimer = null;
    }
  }
}
