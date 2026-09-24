// ============================================================
// SANTA LÚCIA - Config: itens, armas, inimigos, campanhas, loja
// Desenvolvido por Equipe Nakamura
// ============================================================

export const SAVE_KEY = 'santa_lucia_save_v1';
export const POINTS_KEY = 'santa_lucia_points_v1';
export const UNLOCKS_KEY = 'santa_lucia_unlocks_v1';
export const HISCORES_KEY = 'santa_lucia_scores_v1';
export const OPTS_KEY = 'santa_lucia_opts_v1';
export const GAME_TITLE = 'SANTA LÚCIA';

export const CFG = {
  rtW: 320,
  rtH: 180,
  camAspect: 16 / 9,
  interactKey: 'KeyE',
};

// ------------------------------- ITENS -------------------------------
export const ITEMS = {
  // Armas
  knife:    { name: 'Faca Enferrujada', type: 'weapon', icon: '🔪', desc: 'Faca velha de cozinha. Fraca, mas rápida e nunca acaba.' },
  scalpel:  { name: 'Bisturi Cirúrgico', type: 'weapon', icon: '🗡️', desc: 'Instrumento médico de precisão da Dra. Clara. Corte certeiro.' },
  wrench:   { name: 'Chave Inglesa', type: 'weapon', icon: '🔧', desc: 'Ferramenta pesada do zelador Bento. Pancada contundente.' },
  pistol:   { name: 'Pistola M9', type: 'weapon', ammo: 'ammo9', icon: '🔫', desc: 'Pistola 9mm da segurança do sanatório. Confiável.' },
  revolver: { name: 'Revólver .38', type: 'weapon', ammo: 'ammo38', icon: '🎯', desc: 'Revólver clássico da Dra. Clara. Alto impacto e precisão.' },
  shotgun:  { name: 'Espingarda Cal.12', type: 'weapon', ammo: 'shell', icon: '💥', desc: 'Espingarda calibre 12. Devastadora à queima-roupa.' },
  grenade_launcher: { name: 'Lança-Granadas', type: 'weapon', ammo: 'grenade_rounds', icon: '💣', desc: 'Arma pesada militar. Causa explosão de alto raio.' },
  magnum:   { name: 'Magnum .44 "Julgamento"', type: 'weapon', ammo: 'magnum_ammo', icon: '⭐', desc: 'Arma secreta lendária. Poder descomunal capaz de abater quase tudo com 1 tiro.' },

  // Munições
  ammo9:    { name: 'Balas 9mm', type: 'ammo', icon: '🔸', desc: 'Caixa de munição 9mm para pistola.' },
  ammo38:   { name: 'Balas .38', type: 'ammo', icon: '🔹', desc: 'Munição calibre .38 para revólver.' },
  shell:    { name: 'Cartuchos Cal.12', type: 'ammo', icon: '🟥', desc: 'Cartuchos de chumbo grosso para espingarda.' },
  grenade_rounds: { name: 'Granadas', type: 'ammo', icon: '🧨', desc: 'Projéteis explosivos pesados.' },
  magnum_ammo:    { name: 'Balas Magnum .44', type: 'ammo', icon: '🌟', desc: 'Munição perfurante pesada para a Magnum.' },

  // Cura e utilitários
  pills:      { name: 'Comprimidos', type: 'heal', power: 50, icon: '💊', desc: 'Analgésicos fortes. Restaura parte da vida.' },
  lightflask: { name: 'Frasco de Luz', type: 'heal', power: 999, icon: '🧪', desc: 'Um frasco com essência pura de luz. Restaura toda a vida.' },
  antidote:   { name: 'Soro Restaurador', type: 'heal', power: 75, icon: '💉', desc: 'Fórmula médica desenvolvida por Clara para estabilizar sinais vitais.' },
  ribbon:     { name: 'Fita de Tinta', type: 'ribbon', icon: '🎀', desc: 'Fita para o diário/máquina de escrever. Permite registrar o progresso.' },

  // Chaves e quebra-cabeças
  smallkey:   { name: 'Chave Pequena', type: 'key', icon: '🗝️', desc: 'Uma chave pequena de gaveta do quarto 3.' },
  rustkey:    { name: 'Chave Enferrujada', type: 'key', icon: '🔑', desc: 'Chave velha do consultório do Dr. Alencastro.' },
  basekey:    { name: 'Chave do Porão', type: 'key', icon: '🗝️', desc: 'Chave pesada que dá acesso às caldeiras subterrâneas.' },
  fuse:       { name: 'Fusível 30A', type: 'key', icon: '🔌', desc: 'Fusível industrial para o quadro de força do elevador.' },
  crank:      { name: 'Manivela de Ferro', type: 'key', icon: '⚙️', desc: 'Manivela para registros de drenagem do porão.' },
  frag:       { name: 'Fragmento de Memória', type: 'key', icon: '💠', desc: 'Caco brilhante de lembrança de Lúcia. O memorial exige 4.' },
  page:       { name: 'Página do Diário', type: 'page', icon: '📄', desc: 'Uma página arrancada de um diário pessoal.' },

  // Itens novos da Campanha B e extras
  forest_key: { name: 'Chave do Portão de Ferro', type: 'key', icon: '🗝️', desc: 'Chave gótica que abre o portão dos jardins e da floresta.' },
  clara_card: { name: 'Cartão da Dra. Clara', type: 'key', icon: '💳', desc: 'Cartão magnético médico de acesso aos arquivos confidenciais.' },
  bento_key:  { name: 'Chave Mestra de Bento', type: 'key', icon: '🔑', desc: 'Chaveiro com a chave mestra que abre as saídas de emergência.' },
  chapel_key: { name: 'Chave da Capela', type: 'key', icon: '🗝️', desc: 'Chave com entalhes de uma cruz gótica.' },
  lucia_locket: { name: 'Medalhão de Lúcia', type: 'key', icon: '📿', desc: 'Um pequeno medalhão com a foto de infância dos irmãos Daniel e Lúcia.' },
  alencastro_dossier: { name: 'Dossiê Alencastro', type: 'key', icon: '📁', desc: 'Documentos provando os experimentos ilegais com a escuridão da mente.' },
};

// ------------------------------- ARMAS -------------------------------
export const WEAPONS = {
  knife:    { name: 'Faca Enferrujada', dmg: 14, rate: 0.40, range: 1.8, auto: false, kick: 0.05, sfx: 'knife' },
  scalpel:  { name: 'Bisturi Cirúrgico', dmg: 18, rate: 0.32, range: 1.7, auto: false, kick: 0.04, sfx: 'knife', critChance: 0.25 },
  wrench:   { name: 'Chave Inglesa', dmg: 28, rate: 0.55, range: 2.0, auto: false, kick: 0.12, sfx: 'knife', staggerBonus: 0.4 },
  pistol:   { name: 'Pistola M9', dmg: 28, rate: 0.35, range: 14, auto: false, kick: 0.20, sfx: 'pistol' },
  revolver: { name: 'Revólver .38', dmg: 48, rate: 0.45, range: 16, auto: false, kick: 0.30, sfx: 'revolver' },
  shotgun:  { name: 'Espingarda', dmg: 95, rate: 0.95, range: 9.5, auto: false, kick: 0.55, sfx: 'shotgun', falloff: true },
  grenade_launcher: { name: 'Lança-Granadas', dmg: 160, rate: 1.3, range: 14, auto: false, kick: 0.7, sfx: 'shotgun', aoe: 3.5 },
  magnum:   { name: 'Magnum .44', dmg: 320, rate: 0.65, range: 20, auto: false, kick: 0.85, sfx: 'revolver', pierce: true },
};

export const WEAPON_ORDER = ['knife', 'scalpel', 'wrench', 'pistol', 'revolver', 'shotgun', 'grenade_launcher', 'magnum'];

// ------------------------------ INIMIGOS ------------------------------
export const ENEMIES = {
  sombra: {
    name: 'Sombra', hp: 55, dmg: 12, speed: 1.8, range: 1.25, cooldown: 1.4,
    notice: 10, scale: 1.0, eye: 0xfff6c8, stagger: 0.55, points: 60,
  },
  lamento: {
    name: 'Lamento', hp: 110, dmg: 22, speed: 2.4, range: 1.35, cooldown: 1.1,
    notice: 12, scale: 1.12, eye: 0xbfe8ff, stagger: 0.35, points: 120,
  },
  rastejador: {
    name: 'Carniçal Rastejador', hp: 48, dmg: 16, speed: 2.8, range: 1.3, cooldown: 0.95,
    notice: 11, scale: 0.75, eye: 0x88ff88, stagger: 0.60, points: 100, crawler: true,
  },
  cao: {
    name: 'Cão Sombrio', hp: 50, dmg: 18, speed: 3.4, range: 1.4, cooldown: 1.0,
    notice: 14, scale: 0.85, eye: 0xffaa33, stagger: 0.40, points: 140, hound: true,
  },
  carrasco: {
    name: 'O Carrasco', hp: 320, dmg: 38, speed: 1.35, range: 2.2, cooldown: 1.8,
    notice: 12, scale: 1.55, eye: 0xff2222, stagger: 0.15, points: 300, brute: true,
  },
  vulto: {
    name: 'VULTO', hp: 700, dmg: 32, speed: 2.15, range: 2.1, cooldown: 1.5,
    notice: 99, scale: 2.1, eye: 0xff3b30, stagger: 0.0, boss: true, points: 1000,
  },
  alencastro: {
    name: 'DR. ALENCASTRO', hp: 800, dmg: 36, speed: 2.05, range: 2.3, cooldown: 1.4,
    notice: 99, scale: 1.95, eye: 0x9944ff, stagger: 0.0, boss: true, points: 1200,
  },
};

// ------------------------------ CAMPANHAS ------------------------------
export const CAMPAIGNS = {
  daniel: {
    id: 'daniel',
    name: 'Daniel Silva',
    sub: 'Campanha A — O Luto e a Busca',
    desc: 'O irmão mais velho que retorna ao sanatório abandonado após receber uma carta misteriosa com a caligrafia de Lúcia. Equipado com faca e determinação.',
    portrait: 'daniel',
    hp: 100,
    speed: 1.0,
    startRoom: 'quarto',
    startX: 0,
    startZ: 2.4,
    startRot: Math.PI,
    startItems: [
      { item: 'knife', qty: 1 },
      { item: 'pills', qty: 1 },
      { item: 'ribbon', qty: 2 },
    ],
  },
  clara: {
    id: 'clara',
    name: 'Dra. Clara Mendes',
    sub: 'Campanha B — A Investigação Médica',
    desc: 'Psiquiatra residente que tentou impedir as experiências do Dr. Alencastro. Chega através da floresta sob chuva para expor a verdade e resgatar sobreviventes.',
    portrait: 'clara',
    hp: 90,
    speed: 1.08, // Clara é mais ágil
    startRoom: 'floresta',
    startX: 0,
    startZ: 14,
    startRot: 0,
    startItems: [
      { item: 'scalpel', qty: 1 },
      { item: 'revolver', qty: 1 },
      { item: 'ammo38', qty: 18 },
      { item: 'antidote', qty: 1 },
      { item: 'clara_card', qty: 1 },
    ],
  },
  bento: {
    id: 'bento',
    name: 'Zelador Bento',
    sub: 'Modo Extra — O Turno da Noite',
    desc: 'Um senhor idoso e zelador leal das caldeiras. Na noite em que o laboratório ruiu, ele arriscou tudo para fechar os portões e salvar quem pudesse.',
    portrait: 'bento',
    hp: 110,
    speed: 0.92,
    startRoom: 'porao',
    startX: 4,
    startZ: -3.5,
    startRot: Math.PI / 2,
    startItems: [
      { item: 'wrench', qty: 1 },
      { item: 'pistol', qty: 1 },
      { item: 'ammo9', qty: 15 },
      { item: 'pills', qty: 2 },
      { item: 'bento_key', qty: 1 },
    ],
  },
};

// ------------------------------ LOJA DE PONTOS ------------------------------
export const SHOP_ITEMS = [
  {
    id: 'extra_mercenaries',
    name: 'Modo Extra: The Mercenaries',
    cost: 1000,
    desc: 'Combate contra o relógio no sanatório com ranking S, totens de tempo e combos.',
    icon: '⏱️',
  },
  {
    id: 'extra_survivor',
    name: 'Modo Extra: Sobrevivente',
    cost: 1000,
    desc: 'Sobrevivência infinita sob chuva pesada na floresta contra ondas crescentes.',
    icon: '🛡️',
  },
  {
    id: 'extra_bento',
    name: 'Campanha Extra: O Turno da Noite',
    cost: 1200,
    desc: 'Jogue como o Zelador Bento no porão escuro com chave inglesa na noite do colapso.',
    icon: '🗝️',
  },
  {
    id: 'infinite_ammo',
    name: 'Munição Infinita',
    cost: 2500,
    desc: 'Ative nas opções: todas as armas disparam sem consumir cartuchos.',
    icon: '♾️',
  },
  {
    id: 'magnum_unlock',
    name: 'Magnum .44 "Julgamento"',
    cost: 2000,
    desc: 'Desbloqueia a lendária Magnum .44 no baú de itens em qualquer campanha.',
    icon: '⭐',
  },
  {
    id: 'grenade_unlock',
    name: 'Lança-Granadas Tático',
    cost: 1800,
    desc: 'Arma com alto poder destrutivo em área, disponível no baú.',
    icon: '💣',
  },
  {
    id: 'tactical_skin_daniel',
    name: 'Traje Tático: Daniel',
    cost: 800,
    desc: 'Visual alternativo com jaqueta militar reforçada para Daniel.',
    icon: '🥋',
  },
  {
    id: 'tactical_skin_clara',
    name: 'Traje Investigador: Clara',
    cost: 800,
    desc: 'Roupa especial de investigação tática com coldre duplo para Clara.',
    icon: '🧥',
  },
  {
    id: 'model_viewer',
    name: 'Galeria 3D dos Modelos',
    cost: 500,
    desc: 'Inspecione em 360° todos os modelos 3D dos heróis e monstros com fichas.',
    icon: '🗿',
  },
  {
    id: 'filter_vhs',
    name: 'Filtro Vintage VHS & Sépia',
    cost: 600,
    desc: 'Desbloqueia filtros retrô estilo fita VHS e cinema clássico nas opções.',
    icon: '📼',
  },
  {
    id: 'infinite_ink',
    name: 'Fita de Tinta Infinita',
    cost: 700,
    desc: 'Permite salvar o progresso no diário quantas vezes quiser sem gastar fitas.',
    icon: '🎀',
  },
];

// Modelos para a Galeria 3D
export const GALLERY_MODELS = [
  {
    id: 'daniel',
    name: 'Daniel Silva',
    sub: 'O Irmão em Luto',
    bio: '27 anos. Carrega o peso da culpa pelo suicídio da irmã mais nova, Lúcia. Determinado a confrontar os ecos de seu passado.',
  },
  {
    id: 'clara',
    name: 'Dra. Clara Mendes',
    sub: 'Psiquiatra Residente',
    bio: '31 anos. Formada pela universidade federal, foi contratada para a ala de reabilitação e descobriu que Alencastro conduzia terapias de choque secretas.',
  },
  {
    id: 'bento',
    name: 'Bento Gonçalves',
    sub: 'Zelador do Sanatório',
    bio: '58 anos. Trabalhou por mais de 25 anos cuidando das caldeiras e geradores. Conhece cada passagem secreta das velhas paredes.',
  },
  {
    id: 'sombra',
    name: 'Sombra da Culpa',
    sub: 'Manifestação Inicial',
    bio: 'Silhuetas escuras com olhos incandescentes. Formadas pelo acúmulo de memórias dolorosas e negação deixadas no sanatório.',
  },
  {
    id: 'rastejador',
    name: 'Carniçal Rastejador',
    sub: 'Aberração Agachada',
    bio: 'Criatura rápida que rasteja pelo chão em alta velocidade, esquivando de tiros na altura do peito antes de pular na jugular.',
  },
  {
    id: 'cao',
    name: 'Cão do Pesadelo',
    sub: 'Predador Noturno',
    bio: 'Inimigo veloz que ataca em arrancadas pelos corredores e jardins da floresta.',
  },
  {
    id: 'carrasco',
    name: 'O Carrasco',
    sub: 'Guardião Brutal',
    bio: 'Uma figura gigantesca coberta por capuz de estopa, armada com um cutelo enferrujado. Passos que fazem as lâmpadas balançarem.',
  },
  {
    id: 'vulto',
    name: 'VULTO',
    sub: 'Manifestação do Abismo',
    bio: 'A entidade central do pesadelo de Daniel: uma personificação da depressão profunda que distorce o espaço e a mente.',
  },
  {
    id: 'alencastro',
    name: 'Dr. Alencastro (Mutado)',
    sub: 'O Diretor Caído',
    bio: 'Consumido pela própria ambição e pelas substâncias que injetou nos pacientes para criar "a mente que não sente dor".',
  },
];

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

export function rankForMercenaries(score) {
  if (score >= 15000) return 'SS';
  if (score >= 10000) return 'S';
  if (score >= 7000) return 'A';
  if (score >= 4000) return 'B';
  return 'C';
}

export function fmtTime(sec) {
  sec = Math.floor(sec);
  const h = String(Math.floor(sec / 3600)).padStart(2, '0');
  const m = String(Math.floor((sec % 3600) / 60)).padStart(2, '0');
  const s = String(sec % 60).padStart(2, '0');
  return `${h}:${m}:${s}`;
}
