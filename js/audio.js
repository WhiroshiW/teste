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
  title:     { base: 55, base2: 82.5, type: 'triangle', lp: 240, noise: 0.12, nlp: 1500, lfo: 0.09, vol: 0.5 },
};

// notas: [semitom de A2=110Hz base ...] sequências simples
const MUSICS = {
  // tema do título: lamento em Lá menor
  title: {
    wave: 'triangle', vol: 0.16, tempo: 0.62,
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
        this.noise({ t: 1.6, v: 0.4, fc: 250, fc2: 40, at: opt.delay || 0 });
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

  // ---------- AMBIENTE ----------
  ambient(name) {
    this.pendingAmb = name;
    if (!this.ctx || this.curAmb === name) return;
    this.curAmb = name;
    const P = AMBIENTS[name] || AMBIENTS.quarto;
    const t = this.now();
    // limpa anterior
    if (this.ambNodes) {
      const old = this.ambNodes;
      try {
        old.g.gain.cancelScheduledValues(t);
        old.g.gain.setValueAtTime(old.g.gain.value, t);
        old.g.gain.linearRampToValueAtTime(0.0001, t + 1.2);
        setTimeout(() => { try { old.o1.stop(); old.o2.stop(); old.ns.stop(); } catch (e) { /* noop */ } }, 1400);
      } catch (e) { /* noop */ }
      this.ambNodes = null;
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

  stopAmbient() {
    this.curAmb = null;
    if (this.ambNodes && this.ctx) {
      const old = this.ambNodes; const t = this.now();
      old.g.gain.cancelScheduledValues(t);
      old.g.gain.setValueAtTime(old.g.gain.value, t);
      old.g.gain.linearRampToValueAtTime(0.0001, t + 0.8);
      setTimeout(() => { try { old.o1.stop(); old.o2.stop(); old.ns.stop(); } catch (e) { /* noop */ } }, 1000);
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
