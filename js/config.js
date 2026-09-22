// ============================================================
// ECOS DO VAZIO - Config: itens, armas, inimigos, constantes
// ============================================================

export const SAVE_KEY = '[SECURITY_DATA]';
export const GAME_TITLE = 'ECOS DO VAZIO';

export const CFG = {
  rtW: 320,
  rtH: 180,
  camAspect: 16 / 9,
  interactKey: 'KeyE',
};

// ------------------------------- ITENS -------------------------------
export const ITEMS = {
  knife:    { name: 'Faca Enferrujada', type: 'weapon', icon: '🔪', desc: 'Uma faca velha de cozinha. Fraca, mas nunca acaba.' },
  pistol:   { name: 'Pistola M9', type: 'weapon', ammo: 'ammo9', icon: '🔫', desc: 'Pistola 9mm da segurança do sanatório. Confiável.' },
  shotgun:  { name: 'Espingarda', type: 'weapon', ammo: 'shell', icon: '💥', desc: 'Espingarda calibre 12. Devastadora de perto.' },
  ammo9:    { name: 'Balas 9mm', type: 'ammo', icon: '🔸', desc: 'Caixa com balas de 9mm.' },
  shell:    { name: 'Cartuchos Cal.12', type: 'ammo', icon: '🟥', desc: 'Cartuchos de escopeta calibre 12.' },
  pills:    { name: 'Comprimidos', type: 'heal', power: 50, icon: '💊', desc: 'Analgésicos fortes. Restaura parte da vida.' },
  lightflask:{ name: 'Frasco de Luz', type: 'heal', power: 999, icon: '🧪', desc: 'Um frasco com luz quente. Restaura toda a vida.' },
  ribbon:   { name: 'Fita de Tinta', type: 'ribbon', icon: '🎀', desc: 'Fita para o diário. Permite registrar o progresso.' },
  smallkey: { name: 'Chave Pequena', type: 'key', icon: '🗝️', desc: 'Uma chave pequena de gaveta.' },
  rustkey:  { name: 'Chave Enferrujada', type: 'key', icon: '🔑', desc: 'Chave velha e enferrujada. Abre a porta do consultório.' },
  basekey:  { name: 'Chave do Porão', type: 'key', icon: '🗝️', desc: 'Chave pesada com a etiqueta "PORÃO".' },
  fuse:     { name: 'Fusível', type: 'key', icon: '🔌', desc: 'Fusível de 30 amperes. Parece servir no quadro de força.' },
  crank:    { name: 'Manivela', type: 'key', icon: '⚙️', desc: 'Manivela de ferro para válvulas e registros.' },
  frag:     { name: 'Fragmento de Memória', type: 'key', icon: '💠', desc: 'Um caco brilhante de lembrança. O memorial precisa de 4.' },
  page:     { name: 'Página do Diário', type: 'page', icon: '📄', desc: 'Uma página arrancada de um diário.' },
};

// ------------------------------- ARMAS -------------------------------
export const WEAPONS = {
  knife:   { name: 'Faca Enferrujada', dmg: 12, rate: 0.42, range: 1.8, auto: false, kick: 0.05, sfx: 'knife' },
  pistol:  { name: 'Pistola M9', dmg: 26, rate: 0.38, range: 13, auto: false, kick: 0.22, sfx: 'pistol' },
  shotgun: { name: 'Espingarda', dmg: 85, rate: 1.0, range: 9, auto: false, kick: 0.6, sfx: 'shotgun', falloff: true },
};
export const WEAPON_ORDER = ['knife', 'pistol', 'shotgun'];

// ------------------------------ INIMIGOS ------------------------------
export const ENEMIES = {
  sombra: {
    name: 'Sombra', hp: 55, dmg: 12, speed: 1.7, range: 1.25, cooldown: 1.5,
    notice: 9.5, scale: 1.0, eye: 0xfff6c8, stagger: 0.55,
  },
  lamento: {
    name: 'Lamento', hp: 100, dmg: 20, speed: 2.5, range: 1.35, cooldown: 1.1,
    notice: 11, scale: 1.12, eye: 0xbfe8ff, stagger: 0.35,
  },
  vulto: {
    name: 'VULTO', hp: 650, dmg: 30, speed: 2.1, range: 2.0, cooldown: 1.6,
    notice: 99, scale: 2.1, eye: 0xff3b30, stagger: 0.0, boss: true,
  },
};

export function healthStatus(hp) {
  if (hp > 66) return { label: 'FINO', cls: 'ok' };
  if (hp > 33) return { label: 'CUIDADO', cls: 'warn' };
  if (hp > 0) return { label: 'PERIGO', cls: 'bad' };
  return { label: 'MORTO', cls: 'bad' };
}

export function rankFor(timeSec, saves) {
  const m = timeSec / 60;
  if (m <= 25 && saves <= 3) return 'S';
  if (m <= 40 && saves <= 6) return 'A';
  if (m <= 60) return 'B';
  return 'C';
}

export function fmtTime(sec) {
  sec = Math.floor(sec);
  const h = String(Math.floor(sec / 3600)).padStart(2, '0');
  const m = String(Math.floor((sec % 3600) / 60)).padStart(2, '0');
  const s = String(sec % 60).padStart(2, '0');
  return `${h}:${m}:${s}`;
}
