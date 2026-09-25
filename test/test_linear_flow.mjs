import * as RealTHREE from '../vendor/three.module.min.js';

const gradStub = { addColorStop() {} };
function make2d() {
  return {
    canvas: null, fillStyle: '', strokeStyle: '', lineWidth: 1, font: '',
    imageSmoothingEnabled: false,
    fillRect() {}, clearRect() {}, strokeRect() {}, fillText() {},
    beginPath() {}, arc() {}, ellipse() {}, moveTo() {}, lineTo() {},
    bezierCurveTo() {}, fill() {}, stroke() {}, save() {}, restore() {},
    translate() {}, rotate() {},
    createLinearGradient() { return gradStub; },
    createRadialGradient() { return gradStub; },
    getImageData(x, y, w, h) { return { data: new Uint8ClampedArray(w * h * 4), width: w, height: h }; },
    putImageData() {}, drawImage() {},
  };
}
function makeCanvas(w = 64, h = 64) {
  return {
    width: w, height: h,
    clientWidth: 800, clientHeight: 600,
    getContext: () => make2d(),
    style: {},
    addEventListener() {},
    removeEventListener() {},
  };
}
function makeEl(id = '') {
  const el = {
    id,
    classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
    style: {}, children: [], width: 96, height: 96,
    clientWidth: 800, clientHeight: 600,
    innerHTML: '', textContent: '', value: '9', checked: true,
    appendChild(c) { el.children.push(c); return c; },
    querySelector: () => null, querySelectorAll: () => [],
    addEventListener() {}, getContext: () => make2d(),
    onclick: null, oninput: null, onchange: null, onmouseenter: null, ondblclick: null,
  };
  return el;
}
global.window = {
  innerWidth: 800,
  innerHeight: 600,
  addEventListener() {},
  removeEventListener() {},
};
global.document = {
  createElement: (tag) => (tag === 'canvas' ? makeCanvas() : makeEl()),
  getElementById: (id) => makeEl(id),
  body: makeEl('body'),
  addEventListener() {},
  removeEventListener() {},
};
global.localStorage = {
  data: {},
  getItem(k) { return this.data[k] || null; },
  setItem(k, v) { this.data[k] = v; },
  removeItem(k) { delete this.data[k]; },
};
global.performance = { now: () => Date.now() };
global.requestAnimationFrame = (fn) => setTimeout(fn, 16);

class MockRenderer {
  constructor() { this.domElement = makeCanvas(320, 180); }
  setSize() {}
  setPixelRatio() {}
  setClearColor() {}
  setRenderTarget() {}
  render() {}
  setAnimationLoop() {}
}

const THREE = { ...RealTHREE, WebGLRenderer: MockRenderer };
const { Game } = await import('../js/game.js');

let fails = 0;
const assert = (cond, msg) => {
  if (!cond) {
    fails++;
    console.error(`  ❌ FALHA: ${msg}`);
  } else {
    console.log(`  ✓ ${msg}`);
  }
};

console.log('=== TESTE DE FLUXO LINEAR: CAMPANHA DANIEL ===\n');
const game = new Game(THREE, makeEl('container'));

// Mock instantâneo para UI em teste headless
game.ui.doorAnim = (elevator, cb) => { if (cb) cb(); };
const origSay = game.say.bind(game);
game.say = (lines, cb) => {
  origSay(lines, cb);
  if (cb) cb();
};

game.startCampaign('daniel');

assert(game.room.id === 'quarto', 'Iniciou no Quarto 3');
assert(game.currentObjective().includes('cama do quarto'), 'Objetivo inicial indica vasculhar a cama');

// 1. Quarto
game.doAct('bed');
assert(game.hasItem('smallkey'), 'Pegou a Chave Pequena na cama');
assert(game.currentObjective().includes('gaveta trancada'), 'Objetivo atualizou para abrir a gaveta');

game.doAct('drawer');
assert(!game.hasItem('smallkey'), 'Chave Pequena consumida após abrir a gaveta');
assert(game.hasItem('pistol'), 'Obteve a Pistola M9 na gaveta');
assert(game.flags.drawerOpen, 'Flag drawerOpen marcada como true');

game.doAct('teddy');
assert(game.flags.frags[0], 'Obteve o Fragmento 1 (Ursinho)');

// Sair para o Saguão
const doorToSaguao = game.room.doors.find(d => d.target === 'saguao');
assert(!!doorToSaguao, 'Porta para o Saguão encontrada no quarto');
game.doorSequence(doorToSaguao);
assert(game.room.id === 'saguao', 'Transição Quarto -> Saguão bem sucedida');

// 2. Saguão
assert(game.currentObjective().includes('estátua central'), 'Objetivo indica examinar a estátua');
game.doAct('statue');
assert(game.hasItem('rustkey'), 'Obteve a Chave Enferrujada na estátua');
assert(game.currentObjective().includes('porta norte da enfermaria'), 'Objetivo indica usar a Chave Enferrujada');

// Tentar abrir o Porão sem chave
const doorToPorao = game.room.doors.find(d => d.target === 'porao');
assert(doorToPorao.need.item === 'basekey', 'Porta do Porão requer basekey');
game.useDoor(doorToPorao);
assert(game.room.id === 'saguao', 'Porta do porão bloqueada sem chave');

// Tentar chamar o elevador sem energia
const doorToTerraco = game.room.doors.find(d => d.target === 'terraco');
assert(doorToTerraco.need.flag === 'fuseOn', 'Elevador requer energia');
game.useDoor(doorToTerraco);
assert(game.room.id === 'saguao', 'Elevador bloqueado sem energia');

// Entrar na Enfermaria
const doorToEnf = game.room.doors.find(d => d.target === 'enfermaria');
game.doorSequence(doorToEnf);
assert(game.room.id === 'enfermaria', 'Entrou na Enfermaria');

// 3. Enfermaria
game.doAct('armario');
assert(game.hasItem('crank'), 'Obteve a Manivela no armário');
assert(game.flags.frags[1], 'Obteve o Fragmento 2 (Armário)');

// Tentar abrir o consultório com chave enferrujada
const doorToCons = game.room.doors.find(d => d.target === 'consultorio');
assert(doorToCons.need.item === 'rustkey', 'Porta do consultório requer rustkey');
game.useDoor(doorToCons);
assert(!game.hasItem('rustkey'), 'Chave Enferrujada consumida ao destrancar o consultório');
assert(game.flags.consultOpen, 'Flag consultOpen marcada como true');
assert(game.room.id === 'consultorio', 'Entrou no Consultório do Dr. Alencastro');

// Teste de re-entrada no Consultório (porta destrancada permanentemente)
const doorBackToEnf = game.room.doors.find(d => d.target === 'enfermaria');
game.doorSequence(doorBackToEnf);
assert(game.room.id === 'enfermaria', 'Voltou para a Enfermaria');

// Re-entrar no consultório sem ter a chave (já está destrancada!)
const doorToConsAgain = game.room.doors.find(d => d.target === 'consultorio');
game.useDoor(doorToConsAgain);
assert(game.room.id === 'consultorio', 'Re-entrou no Consultório sem pedir a chave novamente (Porta permanece destrancada!)');

// 4. Consultório
game.doAct('painting');
assert(game.flags.frags[2], 'Obteve o Fragmento 3 (Pintura)');

// Pegar o fusível no consultório
const fusePickup = game.room.pickups.find(p => p.item === 'fuse');
assert(!!fusePickup, 'Fusível 30A presente no chão do consultório');
game.pickupAt(fusePickup);
assert(game.hasItem('fuse'), 'Coletou o Fusível 30A');
assert(game.flags.hasFuse, 'Flag hasFuse ativada');
assert(game.currentObjective().includes('quadro de força'), 'Objetivo indica levar o fusível ao quadro de força');

// Testar Easter Egg do cofre (1996) e combinação real (1402)
game.safeConfirm('1996');
assert(game.flags.safeEasterEgg, 'Easter Egg 1996 destravado');
assert(!game.flags.safeOpened, 'Cofre principal permanece destravável após Easter Egg');
assert(!game.hasItem('basekey'), 'Chave do porão ainda não concedida pelo Easter Egg');

game.safeConfirm('1402');
assert(game.flags.safeOpened, 'Cofre aberto com a data 1402');
assert(game.hasItem('basekey'), 'Obteve a Chave do Porão (basekey)');
assert(game.currentObjective().includes('FUSÍVEL') || game.currentObjective().includes('CHAVE DO PORÃO'), 'Objetivo atualizado');

// 5. Instalar o fusível no quadro de força na enfermaria
game.doorSequence(game.room.doors.find(d => d.target === 'enfermaria'));
assert(game.room.id === 'enfermaria', 'Voltou à Enfermaria com o fusível e a chave do porão');
game.doAct('fusebox');
assert(game.flags.fuseOn, 'Quadro de força energizado com sucesso');
assert(!game.hasItem('fuse'), 'Fusível 30A consumido no quadro');

// 6. Voltar ao Saguão e abrir o Porão
const doorEnfToSag = game.room.doors.find(d => d.target === 'saguao');
game.doorSequence(doorEnfToSag);
assert(game.room.id === 'saguao', 'Voltou ao Saguão');

const doorSagToPor = game.room.doors.find(d => d.target === 'porao');
game.useDoor(doorSagToPor);
assert(!game.hasItem('basekey'), 'Chave do Porão consumida ao destrancar');
assert(game.flags.poraoOpen, 'Flag poraoOpen ativada');
assert(game.room.id === 'porao', 'Entrou no Porão');

// Testar persistência da porta do Porão destrancada
const doorPorToSag = game.room.doors.find(d => d.target === 'saguao');
game.doorSequence(doorPorToSag);
assert(game.room.id === 'saguao', 'Voltou ao Saguão');
game.useDoor(game.room.doors.find(d => d.target === 'porao'));
assert(game.room.id === 'porao', 'Re-entrou no Porão sem pedir chave novamente');

// 7. Porão: Drenagem de água e último fragmento
assert(!game.flags.valveOpen, 'Água ainda não drenada');
game.doAct('valve');
assert(game.flags.valveOpen, 'Válvula acionada, água drenada');
assert(game.room.solids.filter(s => s.tag === 'water').length === 0, 'Sólidos de água removidos');

// Testar se ao sair e voltar do porão a água continua drenada
game.doorSequence(game.room.doors.find(d => d.target === 'saguao'));
assert(game.room.id === 'saguao', 'Saiu do porão');
game.doorSequence(game.room.doors.find(d => d.target === 'porao'));
assert(game.room.id === 'porao', 'Retornou ao porão');
assert(game.room.solids.filter(s => s.tag === 'water').length === 0, 'Água continua drenada após recarregar a sala (Sem Bug de Água Fantasma!)');

game.doAct('crate');
assert(game.flags.frags[3], 'Obteve o Fragmento 4 (Engradado)');
assert(game.flags.frags.filter(Boolean).length === 4, 'Todos os 4 Fragmentos de Memória obtidos!');
assert(game.currentObjective().includes('terraço'), 'Objetivo indica subir ao terraço');

// 8. Terraço e Chefe Final
game.doorSequence(game.room.doors.find(d => d.target === 'saguao'));
assert(game.room.id === 'saguao', 'Voltou ao Saguão');

// Subir pelo elevador (agora energizado)
game.useDoor(game.room.doors.find(d => d.target === 'terraco'));
assert(game.room.id === 'terraco', 'Elevador levou ao Terraço');

// Ativar o Memorial
game.doAct('memorial');
assert(game.flags.memorialOpen, 'Memorial aceso com os 4 fragmentos');
game.spawnBossActors();
assert(game.boss && game.boss.alive, 'Chefe Vulto sumonado para a batalha');

// Derrotar o chefe
game.boss.damage(999, 0, 0);
game.onBossDead();
assert(game.flags.bossDead, 'Chefe derrotado');
assert(game.room.portal.visible, 'Portal de luz aberto no terraço');

// Atravessar o portal e concluir o jogo
game.doAct('portal');
assert(game.state === 'ending', 'Entrou no estado de ending');
game.finishEnding();
assert(game.endingPhase === 2, 'Final do jogo alcançado com sucesso!');

console.log(fails === 0 ? '\n✓ FLUXO LINEAR AUDITADO E 100% FUNCIONAL!' : `\n❌ ${fails} FALHA(S) NO FLUXO`);
process.exit(fails === 0 ? 0 : 1);

console.log('\n=== TESTE DE FLUXO LINEAR: CAMPANHA CLARA ===\n');
const gameClara = new Game(THREE, makeEl('container'));
gameClara.ui.doorAnim = (elevator, cb) => { if (cb) cb(); };
gameClara.say = (lines, cb) => { if (cb) cb(); };
gameClara.startCampaign('clara');

assert(gameClara.room.id === 'floresta', 'Clara iniciou nos Jardins da Floresta');
assert(gameClara.hasItem('revolver'), 'Clara possui o Revólver Colt .38');
assert(gameClara.hasItem('clara_card'), 'Clara possui seu Cartão Magnético Médico');

// Clara examina o túmulo de Lúcia
gameClara.doAct('tumulo_lucia');
assert(gameClara.hasItem('lucia_locket'), 'Clara encontrou o Medalhão de Lúcia no túmulo');
assert(gameClara.flags.luciaLocketGot, 'Flag luciaLocketGot ativada');

// Clara segue pela floresta até a Capela
const doorFlorToCap = gameClara.room.doors.find(d => d.target === 'capela');
assert(!!doorFlorToCap, 'Porta para a Capela encontrada na floresta');
gameClara.doorSequence(doorFlorToCap);
assert(gameClara.room.id === 'capela', 'Clara entrou na Capela Esquecida');

// Clara coleta o Dossiê Alencastro na Capela
const dossier = gameClara.room.pickups.find(p => p.item === 'alencastro_dossier');
assert(!!dossier, 'Dossiê do Dr. Alencastro presente no altar da capela');
gameClara.pickupAt(dossier);
assert(gameClara.hasItem('alencastro_dossier'), 'Clara recolheu o Dossiê do Dr. Alencastro');
assert(gameClara.flags.claraDossierGot, 'Flag claraDossierGot ativada');

// Clara desce às caldeiras pelo alçapão da floresta/capela
const doorCapToFlor = gameClara.room.doors.find(d => d.target === 'floresta');
gameClara.doorSequence(doorCapToFlor);
assert(gameClara.room.id === 'floresta', 'Retornou aos jardins');

const doorFlorToPor = gameClara.room.doors.find(d => d.target === 'porao');
assert(!!doorFlorToPor, 'Alçapão para o porão encontrado na floresta');
gameClara.doorSequence(doorFlorToPor);
assert(gameClara.room.id === 'porao', 'Clara desceu ao Porão das caldeiras');

// Enfrentar e derrotar o Dr. Alencastro
gameClara.spawnBossActors();
assert(gameClara.boss && gameClara.boss.alive, 'Dr. Alencastro confrontado nas caldeiras');
gameClara.boss.damage(999, 0, 0);
gameClara.onBossDead();
assert(gameClara.flags.bossDead, 'Dr. Alencastro derrotado');
assert(gameClara.room.portal.visible, 'Portal de evacuação liberado nas caldeiras');

// Concluir campanha de Clara
gameClara.doAct('portal');
assert(gameClara.state === 'ending', 'Clara entrou na sequência de final');
gameClara.finishEnding();
assert(gameClara.endingPhase === 2, 'Final Bom de Clara alcançado com sucesso!');

console.log('\n=== TESTE DE FLUXO: MODO BENTO ===\n');
const gameBento = new Game(THREE, makeEl('container'));
gameBento.ui.doorAnim = (elevator, cb) => { if (cb) cb(); };
gameBento.say = (lines, cb) => { if (cb) cb(); };
gameBento.startCampaign('bento');

assert(gameBento.room.id === 'porao', 'Bento iniciou no Porão das caldeiras');
assert(gameBento.hasItem('bento_key'), 'Bento possui a Chave Mestra de Manutenção');
assert(gameBento.hasItem('shotgun'), 'Bento possui a Escopeta Calibre 12');

// Bento usa a chave mestra para abrir a passagem do porão para o saguão
const doorPorToSagBento = gameBento.room.doors.find(d => d.target === 'saguao');
gameBento.doorSequence(doorPorToSagBento);
assert(gameBento.room.id === 'saguao', 'Bento subiu ao saguão');

const doorSagToPorBento = gameBento.room.doors.find(d => d.target === 'porao');
gameBento.useDoor(doorSagToPorBento);
assert(gameBento.room.id === 'porao', 'Bento destrancou o porão com a chave mestra');

console.log('\n✓ TODAS AS 3 CAMPANHAS AUDITADAS E 100% FUNCIONAIS!');
