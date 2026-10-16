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

// Sair para o Corredor dos Quartos e depois para o Saguão (Planta Folha P1)
const doorToCorredor = game.room.doors.find(d => d.target === 'corredor_quartos');
assert(!!doorToCorredor, 'Porta para o Corredor dos Quartos encontrada no quarto');
game.doorSequence(doorToCorredor);
assert(game.room.id === 'corredor_quartos', 'Transição Quarto -> Corredor dos Quartos bem sucedida');

const doorToSaguao = game.room.doors.find(d => d.target === 'saguao');
assert(!!doorToSaguao, 'Porta para o Saguão encontrada no corredor');
game.doorSequence(doorToSaguao);
assert(game.room.id === 'saguao', 'Transição Corredor -> Saguão bem sucedida');

// 2. Saguão
assert(game.currentObjective().includes('estátua de mármore'), 'Objetivo indica examinar a estátua');
game.doAct('statue');
assert(game.hasItem('rustkey'), 'Obteve a Chave Enferrujada na estátua');
assert(game.currentObjective().includes('ala médica'), 'Objetivo indica usar a Chave Enferrujada');

// V2: novas travas da espiral no saguão
assert(game.room.doors.find(d => d.target === 'estufa').need.item === 'greenhouse_key', 'Estufa requer a Chave da Estufa (V2)');
assert(game.room.doors.find(d => d.target === 'mezanino').need.item === 'crowbar', 'Mezanino requer o Pé de Cabra (V2)');
assert(game.room.doors.find(d => d.target === 'floresta').need.item === 'forest_key', 'Floresta requer a Chave do Portão (V2)');

// Canil entrega a Chave do Portão de Ferro
game.doAct('kennel_search');
assert(game.hasItem('forest_key'), 'Canil entregou a Chave do Portão de Ferro (V2)');

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

// Entrar na Enfermaria (V2: agora pede a chave enferrujada)
const doorToEnf = game.room.doors.find(d => d.target === 'enfermaria');
assert(doorToEnf.need && doorToEnf.need.item === 'rustkey', 'Enfermaria requer a Chave Enferrujada (V2)');
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

// 4. Consultório — V2: o quadro esconde o FUSÍVEL (não é mais fragmento)
game.doAct('painting');
assert(game.hasItem('fuse'), 'Obteve o FUSÍVEL 30A atrás do quadro a óleo (V2)');
assert(game.flags.hasFuse, 'Flag hasFuse ativada');
assert(!game.flags.frags[2], 'Quadro NÃO entrega mais fragmento (V2)');
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

// 7. Porão: Drenagem de água, cripta e fragmentos finais
assert(!game.flags.valveOpen, 'Água ainda não drenada');
const doorSubsolo = game.room.doors.find(d => d.target === 'subsolo_corredor');
assert(doorSubsolo.need && doorSubsolo.need.flag === 'valveOpen', 'Subsolo requer drenagem (V2)');

// Engradado submerso resiste antes da válvula
game.doAct('crate');
assert(!game.flags.frags[3], 'Engradado submerso NÃO entrega fragmento (V2)');

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
assert(game.flags.frags[3], 'Obteve o Fragmento do Engradado (drenado)');

// V2: CRIPTA — fragmento final + escopeta, atrás do Talismã do Culto
game.doAct('cripta');
assert(!game.flags.criptaOpened, 'Cripta resiste sem o Talismã do Culto (V2)');
game.addItem('cult_symbol');
game.doAct('cripta');
assert(game.flags.criptaOpened && game.flags.frags[2], 'Cripta abriu com o Talismã: Fragmento da cripta (V2)');
assert(game.hasItem('shotgun'), 'Escopeta do patriarca obtida na cripta (V2)');
assert(game.flags.frags.filter(Boolean).length === 4, 'Todos os 4 Fragmentos de Memória obtidos!');
assert(game.currentObjective().includes('terraço') || game.currentObjective().includes('FUSÍVEL'), 'Objetivo indica o caminho do terraço');

// V2: DIRETORIA — cofre executivo só abre com o Dossiê do subsolo
game.doAct('director_safe');
assert(!game.hasItem('terrace_key'), 'Cofre da diretoria pede a senha do Dossiê (V2)');
game.addItem('alencastro_dossier');
game.doAct('director_safe');
assert(game.hasItem('terrace_key'), 'Cartão do Heliponto obtido no cofre da diretoria (V2)');

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

console.log('\n=== TESTE DE FLUXO V2: CAMPANHA CLARA (A Investigação Médica) ===\n');
const gameClara = new Game(THREE, makeEl('container'));
gameClara.ui.doorAnim = (elevator, cb) => { if (cb) cb(); };
gameClara.say = (lines, cb) => { if (cb) cb(); };
gameClara.startCampaign('clara');

assert(gameClara.room.id === 'floresta', 'Clara iniciou nos Jardins da Floresta');
assert(gameClara.hasItem('revolver'), 'Clara possui o Revólver Colt .38');
assert(gameClara.hasItem('clara_card'), 'Clara possui seu Cartão Magnético Médico');

// Chave do portão no chão da clareira (abre o portão do saguão na volta)
const fkey = gameClara.room.pickups.find(p => p.item === 'forest_key');
assert(!!fkey, 'Chave do Portão presente na floresta inicial (V2)');
gameClara.pickupAt(fkey);
assert(gameClara.flags.hasForestKey, 'Flag hasForestKey ativada (V2)');

gameClara.doAct('monolith');
assert(!gameClara.flags.chapelSignal, 'Monólito sem medalhão NÃO dá o sinal (V2)');

// Floresta -> Saguão
gameClara.doorSequence(gameClara.room.doors.find(d => d.target === 'saguao'));
assert(gameClara.room.id === 'saguao', 'Clara chegou ao Saguão');

// Cartão abre a enfermaria (porta exige rustkey; Clara usa o cartão)
const doorEnfC = gameClara.room.doors.find(d => d.target === 'enfermaria');
assert(doorEnfC.need && doorEnfC.need.item === 'rustkey', 'Enfermaria trancada (V2)');
gameClara.useDoor(doorEnfC);
assert(gameClara.room.id === 'enfermaria', 'Cartão da Clara destrancou a enfermaria (V2)');

// Armário: manivela
gameClara.doAct('armario');
assert(gameClara.hasItem('crank'), 'Clara pegou a Manivela no armário (V2)');

// Consultório pelo cartão (sem consumir a rustkey que ela não tem)
gameClara.useDoor(gameClara.room.doors.find(d => d.target === 'consultorio'));
assert(gameClara.room.id === 'consultorio', 'Cartão abriu o consultório (V2)');
assert(gameClara.flags.consultOpen, 'consultOpen marcado (V2)');

// Ficha vermelha dá a dica; cofre 1402 no QUARTO 2 dá a chave do porão
gameClara.doAct('desk_dr');
gameClara.doorSequence(gameClara.room.doors.find(d => d.target === 'enfermaria'));
gameClara.doorSequence(gameClara.room.doors.find(d => d.target === 'saguao'));
gameClara.doorSequence(gameClara.room.doors.find(d => d.target === 'corredor_quartos'));
gameClara.doorSequence(gameClara.room.doors.find(d => d.target === 'quarto2'));
assert(gameClara.room.id === 'quarto2', 'Clara chegou ao Quarto 2 do cofre');
gameClara.safeConfirm('1402');
assert(gameClara.hasItem('basekey'), 'Clara obteve a Chave do Porão (V2)');

// Porão: o chefe Alencastro aguarda, mas a investigação vem primeiro (provas)
gameClara.doorSequence(gameClara.room.doors.find(d => d.target === 'corredor_quartos'));
gameClara.doorSequence(gameClara.room.doors.find(d => d.target === 'saguao'));
gameClara.useDoor(gameClara.room.doors.find(d => d.target === 'porao'));
assert(gameClara.room.id === 'porao', 'Clara desceu ao Porão das caldeiras');

gameClara.doAct('valve');
assert(gameClara.flags.valveOpen, 'Clara drenou o porão com a manivela (V2)');

// Subsolo: dossiê + talismã do culto
gameClara.doorSequence(gameClara.room.doors.find(d => d.target === 'subsolo_corredor'));
assert(gameClara.room.id === 'subsolo_corredor', 'Comporta do subsolo cedeu após drenagem (V2)');
gameClara.doorSequence(gameClara.room.doors.find(d => d.target === 'experimentos'));
const dossierC = gameClara.room.pickups.find(p => p.item === 'alencastro_dossier');
gameClara.pickupAt(dossierC);
assert(gameClara.flags.claraDossierGot, 'Prova 1: Dossiê Alencastro (V2)');
gameClara.doorSequence(gameClara.room.doors.find(d => d.target === 'subsolo_corredor'));
gameClara.doorSequence(gameClara.room.doors.find(d => d.target === 'culto'));
const talisC = gameClara.room.pickups.find(p => p.item === 'cult_symbol');
gameClara.pickupAt(talisC);
assert(gameClara.hasItem('cult_symbol'), 'Prova 2: Talismã do Culto (V2)');

// Cemitério: cripta abre com o talismã e entrega o Medalhão de Lúcia
gameClara.doorSequence(gameClara.room.doors.find(d => d.target === 'subsolo_corredor'));
gameClara.doorSequence(gameClara.room.doors.find(d => d.target === 'porao'));
gameClara.doorSequence(gameClara.room.doors.find(d => d.target === 'saguao'));
gameClara.doorSequence(gameClara.room.doors.find(d => d.target === 'cemiterio'));
gameClara.doAct('cripta');
assert(gameClara.flags.luciaLocketGot, 'Prova 3: Medalhão de Lúcia na cripta (V2)');

// Monólito com o medalhão -> sinal da capela
gameClara.doorSequence(gameClara.room.doors.find(d => d.target === 'saguao'));
gameClara.useDoor(gameClara.room.doors.find(d => d.target === 'floresta'));
assert(gameClara.room.id === 'floresta', 'Chave do portão trouxe Clara de volta à floresta (V2)');
gameClara.doAct('monolith');
assert(gameClara.flags.chapelSignal, 'Monólito + medalhão = sinal da capela (V2)');

// Capela: encontro com Daniel (cutscene marca chapelEncounterMet)
gameClara.flags.chapelEncounterMet = true; // (a cutscene marca ao entrar)
gameClara.doorSequence(gameClara.room.doors.find(d => d.target === 'capela'));
assert(gameClara.room.id === 'capela', 'Clara entrou na Capela (V2)');

// De volta ao porão: confronto final com Alencastro
gameClara.doorSequence(gameClara.room.doors.find(d => d.target === 'floresta'));
gameClara.doorSequence(gameClara.room.doors.find(d => d.target === 'saguao'));
gameClara.useDoor(gameClara.room.doors.find(d => d.target === 'porao'));
assert(gameClara.boss && gameClara.boss.alive, 'Dr. Alencastro confrontado nas caldeiras (V2)');
gameClara.boss.damage(999, 0, 0);
gameClara.onBossDead();
assert(gameClara.flags.bossDead, 'Dr. Alencastro derrotado (V2)');
assert(gameClara.room.portal.visible, 'Portal de evacuação liberado nas caldeiras (V2)');

gameClara.doAct('portal');
assert(gameClara.state === 'ending', 'Clara entrou na sequência de final (V2)');
gameClara.finishEnding();
assert(gameClara.endingPhase === 2, 'Final de Clara alcançado com sucesso! (V2)');

console.log('\n=== TESTE DE FLUXO V2: MODO BENTO (O Turno da Noite) ===\n');
const gameBento = new Game(THREE, makeEl('container'));
gameBento.ui.doorAnim = (elevator, cb) => { if (cb) cb(); };
gameBento.say = (lines, cb) => { if (cb) cb(); };
gameBento.unlocks.extra_bento = true; // V2: modo extra destravado p/ auditoria
gameBento.startCampaign('bento');

assert(gameBento.room.id === 'porao', 'Bento iniciou no Porão das caldeiras');
assert(gameBento.hasItem('bento_key'), 'Bento possui a Chave Mestra');
assert(gameBento.hasItem('pistol'), 'Bento possui a pistola do turno');

// Chave mestra força a comporta alagada mesmo sem drenagem
gameBento.useDoor(gameBento.room.doors.find(d => d.target === 'subsolo_corredor'));
assert(gameBento.room.id === 'subsolo_corredor', 'Chave mestra de Bento forçou a comporta do subsolo (V2)');

// Limpa o subsolo (culto e experimentos)
gameBento.doorSequence(gameBento.room.doors.find(d => d.target === 'culto'));
assert(gameBento.room.id === 'culto', 'Bento invadiu o santuário do culto (V2)');
gameBento.doorSequence(gameBento.room.doors.find(d => d.target === 'subsolo_corredor'));
gameBento.doorSequence(gameBento.room.doors.find(d => d.target === 'experimentos'));
assert(gameBento.room.id === 'experimentos', 'Bento vistoriou a sala de experimentos (V2)');

// Volta ao saguão pela chave mestra do porão
gameBento.doorSequence(gameBento.room.doors.find(d => d.target === 'subsolo_corredor'));
gameBento.doorSequence(gameBento.room.doors.find(d => d.target === 'porao'));
gameBento.useDoor(gameBento.room.doors.find(d => d.target === 'saguao'));
assert(gameBento.room.id === 'saguao', 'Bento subiu ao saguão com a chave mestra (V2)');

// Jardim: canil entrega a chave da floresta
gameBento.doorSequence(gameBento.room.doors.find(d => d.target === 'jardim'));
gameBento.doAct('kennel_search');
assert(gameBento.hasItem('forest_key'), 'Canil entregou a Chave do Portão a Bento (V2)');

// Floresta: fecha o portão de ferro — FINAL
gameBento.doorSequence(gameBento.room.doors.find(d => d.target === 'saguao'));
gameBento.useDoor(gameBento.room.doors.find(d => d.target === 'floresta'));
assert(gameBento.room.id === 'floresta', 'Bento alcançou a floresta (V2)');
gameBento.doAct('gate_final');
assert(gameBento.state === 'ending', 'Portão de ferro trancado: sequência de final (V2)');
gameBento.finishEnding();
assert(gameBento.endingPhase === 2, 'FINAL: O ÚLTIMO TURNO de Bento alcançado! (V2)');

console.log(fails === 0 ? '\n✓ TODAS AS 3 CAMPANHAS AUDITADAS E 100% FUNCIONAIS (V2)!' : `\n❌ ${fails} FALHA(S) NO FLUXO V2`);
process.exit(fails === 0 ? 0 : 1);
