# Monta o novo js/world.js: helpers (1-508) + NOVO BLOCO L1 + diorama + BUILDERS
# Planta nova do usuário (turnarounds 14/out). Fase 1 = L1 completo.
import io

SRC = 'js/world.js'
s = open(SRC, encoding='utf-8').read()

head = s[:s.index('// ---------------- 1. FOLHA P1')]
diorama = s[s.index('// ---------------- 21. DIORAMA'):s.index('// ==================== DICIONÁRIO DE SALAS')]

NOVO = r'''// ============================================================
// PLANTA NOVA (14/OUT — turnarounds do usuário): 3 NÍVEIS
// FASE 1 = L1 (TÉRREO) completo. L2/L3 chegam nas fases 2/3.
// L1: quarto1/2 → corredor → HALL PRINCIPAL (hub) → cemitério /
//     estufa / corredor norte (elevador) → catedral (final Clara)
//     ramo externo: floresta → estacionamento, floresta → casa do
//     zelador → PASSAGEM SECRETA (armário) → corredor norte.
// ============================================================

// ---------------- L1: QUARTO 1 (spawn do Daniel) ----------------
function buildQuarto(THREE, TEX) {
  const R = baseRoom(THREE, TEX, 'quarto', 'QUARTO 1 · ALA DE INTERNAÇÃO', 10, 8, 3.2);
  R.fog = { c: 0x05050c, n: 5, f: 20 };
  R.music = 'creepy';
  const wallM = tm(THREE, TEX.wall, 4, 2);
  plane(THREE, R.group, 10, 8, tm(THREE, TEX.floorWood, 4, 3), 0, 0, 0, -Math.PI / 2);
  plane(THREE, R.group, 10, 8, tm(THREE, TEX.ceiling, 4, 3), 0, 3.2, 0, Math.PI / 2);
  perimeter(THREE, R, 10, 8, 3.2, wallM, [{ side: 'N', at: 0.0, w: 2.0 }]);
  doorVisual(THREE, R, 'N', 0.0, 8, 10, TEX.door);
  pointLight(THREE, R, 0xffeebb, 3, 9, 0, 2.8, 0);

  addDoor(R, 0.0, -3.5, 1.4, 'Sair ao Corredor dos Quartos', 'corredor', -4, 2.2, 0);

  makeHospitalBed(THREE, TEX, R, -2.8, -2.0);
  solid(R, -3.6, -2.5, -2.0, -1.5);
  box(THREE, R.group, 1.4, 1.0, 0.5, tm(THREE, TEX.wall, 1, 1), -1.6, 0.5, -2.5); // gaveta
  solid(R, -2.3, -2.8, -0.9, -2.2);
  const teddy = box(THREE, R.group, 0.5, 0.5, 0.4, flat(THREE, 0x9a6a3a), -3.4, 0.6, 1.8);
  R.decor = R.decor || []; R.decor.push(teddy);
  box(THREE, R.group, 1.6, 2.2, 0.5, wallM, 4.2, 1.1, -1.0); // armário
  solid(R, 3.9, -1.3, 4.5, -0.7);
  addCam(R, [-5, -4, 0, 4], [-4.0, 2.8, 3.2], [0, 1.0, 0], 62);

  addInteract(R, -2.8, -2.0, 1.4, 'Examinar a cama hospitalar', 'bed');
  addInteract(R, -1.6, -2.5, 1.3, 'Abrir a gaveta trancada', 'drawer');
  addInteract(R, -3.4, 1.8, 1.3, 'Pegar o ursinho de pelúcia', 'teddy');
  addInteract(R, 4.2, -1.0, 1.4, 'Examinar o armário', 'clock');
  addInteract(R, 1.5, -3.0, 1.4, 'Olhar pela janela com grades', 'window_q');
  addPickup(THREE, R, TEX, 'pills', 2.0, 2.4, 1);
  addSpawn(R, 'sombra', 3.0, 2.5);
  return R;
}

// ---------------- L1: QUARTO 2 ----------------
function buildQuarto2(THREE, TEX) {
  const R = baseRoom(THREE, TEX, 'quarto2', 'QUARTO 2 · COFRE CONFIDENCIAL', 10, 8, 3.2);
  R.fog = { c: 0x05050c, n: 5, f: 20 };
  R.music = 'creepy';
  const wallM = tm(THREE, TEX.wall, 4, 2);
  plane(THREE, R.group, 10, 8, tm(THREE, TEX.floorWood, 4, 3), 0, 0, 0, -Math.PI / 2);
  plane(THREE, R.group, 10, 8, tm(THREE, TEX.ceiling, 4, 3), 0, 3.2, 0, Math.PI / 2);
  perimeter(THREE, R, 10, 8, 3.2, wallM, [{ side: 'N', at: 0.0, w: 2.0 }]);
  doorVisual(THREE, R, 'N', 0.0, 8, 10, TEX.door);
  pointLight(THREE, R, 0xffeebb, 3, 9, 0, 2.8, 0);

  addDoor(R, 0.0, -3.5, 1.4, 'Sair ao Corredor dos Quartos', 'corredor', 4, 2.2, 0);

  makeSafeConfidential(THREE, TEX, R, -3.5, 1.8, 0.4);
  solid(R, -4.2, 1.2, -2.8, 2.4);
  box(THREE, R.group, 1.8, 2.4, 0.5, wallM, -4.2, 1.2, -1.2); // estante de prontuários
  solid(R, -4.6, -1.5, -3.8, -0.9);
  makeHospitalBed(THREE, TEX, R, 3.0, -1.5, Math.PI / 2);
  solid(R, 2.5, -2.3, 3.5, -0.7);
  addCam(R, [-5, -4, 0, 4], [4.0, 2.8, 3.2], [0, 1.0, 0], 62);

  addInteract(R, -3.5, 1.8, 1.5, 'Abrir o cofre confidencial', 'safe');
  addInteract(R, -4.2, -1.2, 1.4, 'Examinar a estante de prontuários', 'shelf2');
  addInteract(R, 3.0, -1.5, 1.4, 'Examinar a cama antiga', 'bed2');
  addPickup(THREE, R, TEX, 'ribbon', 1.5, 2.2, 1);
  return R;
}

// ---------------- L1: CORREDOR DOS QUARTOS ----------------
function buildCorredor(THREE, TEX) {
  const R = baseRoom(THREE, TEX, 'corredor', 'CORREDOR DOS QUARTOS', 16, 7, 3.0);
  R.fog = { c: 0x040409, n: 5, f: 16 };
  R.music = 'creepy';
  const wallM = tm(THREE, TEX.wall, 6, 2);
  plane(THREE, R.group, 16, 7, tm(THREE, TEX.floorWood, 6, 3), 0, 0, 0, -Math.PI / 2);
  plane(THREE, R.group, 16, 7, tm(THREE, TEX.ceiling, 6, 3), 0, 3.0, 0, Math.PI / 2);
  perimeter(THREE, R, 16, 7, 3.0, wallM, [
    { side: 'N', at: 0.0, w: 2.0 },
    { side: 'S', at: -4.0, w: 2.0 },
    { side: 'S', at: 4.0, w: 2.0 },
  ]);
  doorVisual(THREE, R, 'N', 0.0, 7, 16, TEX.doorWood);
  doorVisual(THREE, R, 'S', -4.0, 7, 16, TEX.door);
  doorVisual(THREE, R, 'S', 4.0, 7, 16, TEX.door);
  pointLight(THREE, R, 0xffddaa, 2.5, 8, -4, 2.6, 0);
  pointLight(THREE, R, 0xffddaa, 2.5, 8, 4, 2.6, 0, { amp: 0.8, speed: 7 });

  addDoor(R, -4.0, 3.0, 1.4, 'Entrar no Quarto 1', 'quarto', 0, -2.4, 0);
  addDoor(R, 4.0, 3.0, 1.4, 'Entrar no Quarto 2', 'quarto2', 0, -2.4, 0);
  addDoor(R, 0.0, -3.0, 1.4, 'Ir ao Hall Principal', 'saguao', -4, 7.4, Math.PI);

  makeGothicWindow(THREE, TEX, R, -7.8, 1.8, 0, Math.PI / 2);
  makeGothicWindow(THREE, TEX, R, 7.8, 1.8, 0, -Math.PI / 2);
  bloodDecal(THREE, R, TEX, 0.0, 0.0, 2.0, 1.4);
  addCam(R, [-8, -3.5, 0, 3.5], [-6.0, 2.6, 2.8], [0, 1.0, 0], 62);
  addCam(R, [0, -3.5, 8, 3.5], [6.0, 2.6, 2.8], [0, 1.0, 0], 62);

  addPickup(THREE, R, TEX, 'ammo9', 2.0, 2.2, 8);
  addSpawn(R, 'infectado', 0.5, 0.0);
  return R;
}

// ---------------- L1: HALL PRINCIPAL (hub central, 3-4x quarto) ----------------
function buildSaguao(THREE, TEX) {
  const R = baseRoom(THREE, TEX, 'saguao', 'HALL PRINCIPAL', 26, 18, 4.4);
  R.fog = { c: 0x060609, n: 7, f: 26 };
  R.music = 'creepy';
  const wallM = tm(THREE, TEX.wall, 8, 3);
  plane(THREE, R.group, 26, 18, tm(THREE, TEX.floor, 8, 6), 0, 0, 0, -Math.PI / 2);
  plane(THREE, R.group, 26, 18, tm(THREE, TEX.ceiling, 8, 6), 0, 4.4, 0, Math.PI / 2);
  perimeter(THREE, R, 26, 18, 4.4, wallM, [
    { side: 'S', at: -4.0, w: 2.0 },
    { side: 'W', at: -2.0, w: 2.0 },
    { side: 'E', at: -2.0, w: 2.0 },
    { side: 'N', at: 0.0, w: 2.0 },
  ]);
  doorVisual(THREE, R, 'S', -4.0, 18, 26, TEX.doorWood);
  doorVisual(THREE, R, 'W', -2.0, 18, 26, TEX.door);
  doorVisual(THREE, R, 'E', -2.0, 18, 26, TEX.door);
  doorVisual(THREE, R, 'N', 0.0, 26, 18, TEX.doorMetal);
  pointLight(THREE, R, 0xffddaa, 5, 16, 0, 3.8, 0, { amp: 0.4, speed: 3 });
  pointLight(THREE, R, 0x8899ff, 3, 12, -8, 3.2, -5);
  pointLight(THREE, R, 0x8899ff, 3, 12, 8, 3.2, 5);

  addDoor(R, -4.0, 8.4, 1.4, 'Voltar ao Corredor dos Quartos', 'corredor', 0, -2.2, 0);
  addDoor(R, -12.4, -2.0, 1.4, 'Ir ao Cemitério', 'cemiterio', 6.4, 0.0, -Math.PI / 2);
  addDoor(R, 12.4, -2.0, 1.4, 'Ir à Estufa Botânica', 'estufa', -4.4, 0.0, Math.PI / 2,
    { need: { item: 'greenhouse_key' }, msg: 'Trancada. A placa diz "ESTUFA BOTÂNICA — só o jardineiro entra". Precisa da CHAVE DE LATÃO.' });
  addDoor(R, 0.0, -8.4, 1.4, 'Passagem Norte (Recepção Técnica)', 'corredor_n', -7.4, 0.0, Math.PI / 2,
    { need: { item: 'basekey' }, consume: true, setFlag: 'hallNorthOpen', msg: 'Porta de aço trancada. A placa diz "ADMINISTRAÇÃO — PROIBIDO". Precisa da CHAVE DE ACESSO.' });

  // Tapete central e recepção
  const rug = plane(THREE, R.group, 6, 9, flat(THREE, 0x5a1420), 0, 0.02, 0, -Math.PI / 2);
  R.decor = R.decor || []; R.decor.push(rug);
  makeReceptionCounterU(THREE, TEX, R, 2.0, 3.0);
  solid(R, 0.4, 1.4, 3.6, 4.6);
  // Escadaria desabada para o 2º andar (FASE 2 libera)
  for (let i = 0; i < 4; i++) box(THREE, R.group, 3.0 - i * 0.7, 0.35, 0.8, wallM, -8.0, 0.18 + i * 0.35, -6.2 + i * 0.8);
  solid(R, -9.5, -7.0, -6.5, -3.4);
  // Estátua de Santa Lúcia
  const sta = new THREE.Group();
  sta.position.set(0.0, 0, -4.5);
  const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.9, 1.0, 8), tm(THREE, TEX.wall, 1, 1));
  ped.position.y = 0.5; sta.add(ped);
  const fig = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.42, 2.2, 6), tm(THREE, TEX.wall, 1, 1, 0xcccccc));
  fig.position.y = 2.1; sta.add(fig);
  R.group.add(sta);
  solid(R, -0.9, -5.4, 0.9, -3.6);
  // Quadro de força
  box(THREE, R.group, 1.4, 1.8, 0.3, tm(THREE, TEX.wallStone, 1, 1, 0x556677), 8.0, 1.6, 4.0);
  solid(R, 7.3, 3.7, 8.7, 4.3);
  addCam(R, [-13, -9, 0, 9], [-10.0, 3.6, 6.5], [0, 1.0, 0], 64);
  addCam(R, [0, -9, 13, 9], [10.0, 3.6, 6.5], [0, 1.0, 0], 64);

  addInteract(R, 2.0, 3.0, 1.7, 'Usar a Máquina de Escrever da Recepção', 'save');
  addInteract(R, -8.0, -5.0, 1.8, 'Subir a escadaria do 2º Andar', 'stairs');
  addInteract(R, 8.0, 4.0, 1.6, 'Abrir o quadro de força', 'fusebox');
  addInteract(R, 0.0, -4.5, 1.6, 'Orar diante da estátua de Santa Lúcia', 'statue');
  addInteract(R, -2.7, 0.5, 1.3, 'Beber água do bebedouro', 'vase');
  addPickup(THREE, R, TEX, 'page', -4.0, 2.5, 1, 1, 0.06);
  addPickup(THREE, R, TEX, 'ammo9', 10.0, 6.5, 8);
  addSpawn(R, 'sombra', -6.0, 3.0);
  addSpawn(R, 'infectado', 6.0, -2.0);
  return R;
}

// ---------------- L1: CEMITÉRIO ----------------
function buildCemiterio(THREE, TEX) {
  const R = baseRoom(THREE, TEX, 'cemiterio', 'CEMITÉRIO DAS LÁPIDES', 16, 10, 3.4);
  R.fog = { c: 0x05070a, n: 6, f: 20 };
  R.music = 'creepy';
  const wallM = tm(THREE, TEX.wallStone, 6, 2);
  plane(THREE, R.group, 16, 10, tm(THREE, TEX.stoneFloor, 5, 4), 0, 0, 0, -Math.PI / 2);
  plane(THREE, R.group, 16, 10, tm(THREE, TEX.ceiling, 6, 4), 0, 3.4, 0, Math.PI / 2);
  perimeter(THREE, R, 16, 10, 3.4, wallM, [
    { side: 'E', at: 0.0, w: 2.0 },
    { side: 'N', at: 0.0, w: 2.0 },
  ]);
  doorVisual(THREE, R, 'E', 0.0, 10, 16, TEX.door);
  doorVisual(THREE, R, 'N', 0.0, 10, 16, TEX.doorWood);
  pointLight(THREE, R, 0x99bbff, 3, 14, 0, 3.0, 0, { amp: 0.5, speed: 5 });

  addDoor(R, 7.4, 0.0, 1.4, 'Voltar ao Hall Principal', 'saguao', -11.4, -2.0, -Math.PI / 2);
  addDoor(R, 0.0, -4.4, 1.4, 'Portão para a Floresta', 'floresta', 0, 5.6, Math.PI);

  // lápides
  for (const [lx, lz] of [[-5, -2], [-3, 1], [-1, -1.5], [1, 1.5], [3, -2], [5, 1]]) {
    box(THREE, R.group, 0.7, 1.1, 0.18, tm(THREE, TEX.wallStone, 1, 1), lx, 0.55, lz);
    solid(R, lx - 0.35, lz - 0.12, lx + 0.35, lz + 0.12);
  }
  // Mausoléu dos Alencastro
  box(THREE, R.group, 2.4, 2.2, 1.6, wallM, -5.0, 1.1, -3.0);
  solid(R, -6.2, -3.8, -3.8, -2.2);
  addCam(R, [-8, -5, 0, 5], [-5.8, 3.0, 3.5], [0, 1.0, 0], 62);
  addCam(R, [0, -5, 8, 5], [5.8, 3.0, 3.5], [0, 1.0, 0], 62);

  addInteract(R, 0.0, -2.5, 1.7, 'Examinar o túmulo recém-cavado', 'tumulo_lucia');
  addInteract(R, -5.0, -3.0, 1.6, 'Ler o mausoléu da família Alencastro', 'mausoleum');
  addPickup(THREE, R, TEX, 'greenhouse_key', 4.5, 2.8, 1);
  addPickup(THREE, R, TEX, 'page', -4.5, 3.2, 1, 2, 0.06);
  addSpawn(R, 'sombra', -3.0, 1.0);
  addSpawn(R, 'rastejador', 0.0, -1.0);
  addSpawn(R, 'sombra', 4.0, 2.0);
  return R;
}

// ---------------- L1: ESTUFA BOTÂNICA ----------------
function buildEstufa(THREE, TEX) {
  const R = baseRoom(THREE, TEX, 'estufa', 'ESTUFA BOTÂNICA', 12, 10, 3.6);
  R.fog = { c: 0x04120a, n: 6, f: 18 };
  R.music = 'creepy';
  const wallM = tm(THREE, TEX.wall, 5, 2, 0xaabb99);
  plane(THREE, R.group, 12, 10, tm(THREE, TEX.stoneFloor, 5, 4, 0x99aa88), 0, 0, 0, -Math.PI / 2);
  plane(THREE, R.group, 12, 10, tm(THREE, TEX.ceiling, 5, 4), 0, 3.6, 0, Math.PI / 2);
  perimeter(THREE, R, 12, 10, 3.6, wallM, [{ side: 'W', at: 0.0, w: 2.0 }]);
  doorVisual(THREE, R, 'W', 0.0, 10, 12, TEX.door);
  pointLight(THREE, R, 0xaaffcc, 3, 12, 0, 3.0, 0, { amp: 0.3, speed: 2 });

  addDoor(R, -5.4, 0.0, 1.4, 'Voltar ao Hall Principal', 'saguao', 11.4, -2.0, -Math.PI / 2);

  // bancada de botânica e canteiros
  box(THREE, R.group, 3.0, 0.9, 1.0, tm(THREE, TEX.floorWood, 2, 1), -2.0, 0.45, 2.0);
  solid(R, -3.5, 1.5, -0.5, 2.5);
  for (const [px, pz] of [[2.0, -2.0], [3.4, -1.0], [2.6, -3.2]]) {
    box(THREE, R.group, 1.0, 0.9, 1.0, flat(THREE, 0x224422), px, 0.45, pz);
    solid(R, px - 0.5, pz - 0.5, px + 0.5, pz + 0.5);
  }
  addCam(R, [-6, -5, 0, 5], [-4.0, 3.0, 3.4], [0, 1.0, 0], 62);

  addInteract(R, -2.0, 2.0, 1.5, 'Vasculhar a bancada de botânica', 'greenhouse_bench');
  addInteract(R, 2.0, -2.0, 1.6, 'Examinar as plantas carnívoras', 'greenhouse_plants');
  addPickup(THREE, R, TEX, 'antidote', 4.0, 3.0, 1);
  addPickup(THREE, R, TEX, 'page', -4.0, -3.0, 1, 3, 0.06);
  addSpawn(R, 'rastejador', 0.0, 0.0);
  return R;
}

// ---------------- L1: FLORESTA DOS LAMENTOS ----------------
function buildFloresta(THREE, TEX) {
  const R = baseRoom(THREE, TEX, 'floresta', 'FLORESTA DOS LAMENTOS', 20, 14, 4.8);
  R.fog = { c: 0x030604, n: 5, f: 15 };
  const wallM = tm(THREE, TEX.wallStone, 8, 2, 0x445544);
  plane(THREE, R.group, 20, 14, tm(THREE, TEX.stoneFloor, 8, 6, 0x556655), 0, 0, 0, -Math.PI / 2);
  perimeter(THREE, R, 20, 14, 4.8, wallM, [
    { side: 'S', at: 0.0, w: 2.0 },
    { side: 'E', at: 0.0, w: 2.0 },
    { side: 'N', at: 5.0, w: 2.0 },
  ]);
  doorVisual(THREE, R, 'S', 0.0, 14, 20, TEX.doorWood);
  doorVisual(THREE, R, 'E', 0.0, 14, 20, TEX.doorWood);
  doorVisual(THREE, R, 'N', 5.0, 14, 20, TEX.doorWood);
  pointLight(THREE, R, 0x88aaff, 2.5, 12, 0, 3.5, 0, { amp: 0.6, speed: 4 });
  pointLight(THREE, R, 0x88aaff, 2.0, 10, -6, 3.0, -3);

  addDoor(R, 0.0, 6.4, 1.4, 'Voltar ao Cemitério', 'cemiterio', 0, -3.4, 0);
  addDoor(R, 9.4, 0.0, 1.4, 'Portão para o Estacionamento', 'estacionamento', -6.4, 0.0, Math.PI / 2,
    { need: { item: 'forest_key' }, msg: 'Um portão de ferro com correntes. O cadeado é gótico — a CHAVE DO PORTÃO DE FERRO o abre.' });
  addDoor(R, 5.0, -6.4, 1.4, 'Entrar na Casa do Zelador', 'casa_zelador', 0, 2.4, 0);

  // árvores
  for (const [ax, az, r0] of [[-8, -4, 0.5], [-5, 1, 0.6], [-2, -4, 0.5], [3, 2, 0.6], [6, -3, 0.5], [-8, 4, 0.55], [1, 4.5, 0.5], [8, 3.5, 0.6]]) {
    const tr = new THREE.Mesh(new THREE.CylinderGeometry(r0 * 0.6, r0, 3.6, 6), flat(THREE, 0x2a2318));
    tr.position.set(ax, 1.8, az); R.group.add(tr);
    solid(R, ax - r0, az - r0, ax + r0, az + r0);
  }
  // monólito profano
  const mono = new THREE.Mesh(new THREE.BoxGeometry(1.0, 2.6, 0.5), tm(THREE, TEX.wallStone, 1, 1, 0x111111));
  mono.position.set(-6.0, 1.3, -3.0); R.group.add(mono);
  solid(R, -6.5, -3.3, -5.5, -2.7);
  // carro da Clara
  const car = new THREE.Group(); car.position.set(-2.0, 0, 4.0);
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.8, 4.2), flat(THREE, 0x2244aa));
  body.position.y = 0.6; car.add(body);
  const cab = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.6, 2.0), flat(THREE, 0x1133aa));
  cab.position.set(0, 1.2, -0.2); car.add(cab);
  R.group.add(car);
  solid(R, -3.0, 1.8, -1.0, 6.2);
  addCam(R, [-10, -7, 0, 7], [-7.0, 3.4, 4.5], [0, 1.0, 0], 64);
  addCam(R, [0, -7, 10, 7], [7.0, 3.4, 4.5], [0, 1.0, 0], 64);

  addInteract(R, -6.0, -3.0, 1.7, 'Examinar o monólito de pedra negra', 'monolith');
  addInteract(R, -2.0, 4.0, 1.8, 'Examinar o carro destruído', 'carro_clara');
  addInteract(R, 9.0, 1.2, 1.6, 'Fechar o portão de ferro com a corrente', 'gate_final');
  addPickup(THREE, R, TEX, 'ammo38', 6.5, -4.5, 8);
  addSpawn(R, 'sombra', -5.0, 2.0);
  addSpawn(R, 'lamento', 0.0, 0.0);
  addSpawn(R, 'sombra', 3.0, -3.0);
  return R;
}

// ---------------- L1: ESTACIONAMENTO (substitui pátio/canil) ----------------
function buildEstacionamento(THREE, TEX) {
  const R = baseRoom(THREE, TEX, 'estacionamento', 'ESTACIONAMENTO ABANDONADO', 16, 12, 4.4);
  R.fog = { c: 0x05060a, n: 6, f: 18 };
  R.music = 'creepy';
  const wallM = tm(THREE, TEX.wallStone, 6, 2);
  plane(THREE, R.group, 16, 12, tm(THREE, TEX.stoneFloor, 6, 5, 0x777788), 0, 0, 0, -Math.PI / 2);
  perimeter(THREE, R, 16, 12, 4.4, wallM, [{ side: 'W', at: 0.0, w: 2.0 }]);
  doorVisual(THREE, R, 'W', 0.0, 12, 16, TEX.doorWood);
  pointLight(THREE, R, 0xffcc88, 3, 14, 0, 3.6, 0, { amp: 0.7, speed: 6 });

  addDoor(R, -7.4, 0.0, 1.4, 'Voltar à Floresta', 'floresta', 8.4, 0.0, -Math.PI / 2);

  // carros abandonados em fila
  for (const [cx, cz, cor] of [[-4, -3, 0x666666], [0, -3, 0x774422], [4, -3, 0x334455], [-4, 2, 0x444455], [4, 2, 0x553333]]) {
    const c = new THREE.Mesh(new THREE.BoxGeometry(1.9, 1.1, 4.0), flat(THREE, cor));
    c.position.set(cx, 0.55, cz); R.group.add(c);
    solid(R, cx - 1.0, cz - 2.0, cx + 1.0, cz + 2.0);
  }
  bloodDecal(THREE, R, TEX, 2.0, 0.0, 2.2, 1.6);
  addCam(R, [-8, -6, 0, 6], [-6.0, 3.4, 4.4], [0, 1.0, 0], 64);
  addCam(R, [0, -6, 8, 6], [6.0, 3.4, 4.4], [0, 1.0, 0], 64);

  addInteract(R, -4.0, 2.0, 1.7, 'Vasculhar o carro do zelador', 'carro_zelador');
  addPickup(THREE, R, TEX, 'ammo9', 6.0, 4.5, 10);
  addPickup(THREE, R, TEX, 'pills', -6.0, -4.0, 1);
  addSpawn(R, 'infectado', 2.0, -2.0);
  addSpawn(R, 'rastejador', -2.0, -3.5);
  return R;
}

// ---------------- L1: CASA DO ZELADOR (armário secreto) ----------------
function buildCasaZelador(THREE, TEX) {
  const R = baseRoom(THREE, TEX, 'casa_zelador', 'CASA DO ZELADOR BENTO', 10, 8, 3.0);
  R.fog = { c: 0x070605, n: 5, f: 16 };
  R.music = 'creepy';
  const wallM = tm(THREE, TEX.floorWood, 4, 2, 0x8a7a5a);
  plane(THREE, R.group, 10, 8, tm(THREE, TEX.floorWood, 4, 3), 0, 0, 0, -Math.PI / 2);
  plane(THREE, R.group, 10, 8, tm(THREE, TEX.ceiling, 4, 3), 0, 3.0, 0, Math.PI / 2);
  perimeter(THREE, R, 10, 8, 3.0, wallM, [
    { side: 'S', at: 0.0, w: 2.0 },
    { side: 'N', at: 0.0, w: 2.0 },
  ]);
  doorVisual(THREE, R, 'S', 0.0, 8, 10, TEX.doorWood);
  doorVisual(THREE, R, 'N', 0.0, 8, 10, wallM);
  pointLight(THREE, R, 0xffcc88, 2.5, 9, 0, 2.6, 0);

  addDoor(R, 0.0, 3.5, 1.4, 'Voltar à Floresta', 'floresta', 5, -5.4, 0);
  addDoor(R, 0.0, -3.5, 1.4, 'Passagem Secreta', 'passagem', 0, -7.4, 0,
    { need: { flag: 'secretOpen' }, msg: 'Um ARMÁRIO DE FERRAMENTAS pesado cobre o vão. Empurrar não resolve — examine o armário.' });

  // bancada de trabalho do Bento
  box(THREE, R.group, 3.0, 0.9, 1.0, wallM, 0.0, 0.45, -2.6);
  solid(R, -1.5, -3.1, 1.5, -2.1);
  // armário de ferramentas que esconde a passagem
  const arm = new THREE.Mesh(new THREE.BoxGeometry(1.8, 2.2, 0.6), wallM);
  arm.position.set(-3.6, 1.1, -0.5); R.group.add(arm);
  solid(R, -4.4, -0.8, -2.8, -0.2);
  makeHospitalBed(THREE, TEX, R, 3.4, -1.8, Math.PI / 2);
  solid(R, 2.9, -2.6, 3.9, -1.0);
  // rádio amador
  box(THREE, R.group, 0.8, 0.5, 0.5, flat(THREE, 0x334455), 3.5, 1.2, 1.8);
  solid(R, 3.1, 1.5, 3.9, 2.1);
  addCam(R, [-5, -4, 0, 4], [-4.0, 2.6, 3.0], [0, 1.0, 0], 62);

  addInteract(R, 0.0, -2.6, 1.5, 'Vasculhar a bancada de trabalho de Bento', 'cabana_bento');
  addInteract(R, -3.6, -0.5, 1.5, 'Examinar o armário de ferramentas', 'armario_secreto');
  addInteract(R, 3.5, 1.8, 1.4, 'Ouvir o rádio amador', 'bento_radio');
  addPickup(THREE, R, TEX, 'pills', -2.5, 2.2, 1);
  return R;
}

// ---------------- L1: PASSAGEM SECRETA ----------------
function buildPassagem(THREE, TEX) {
  const R = baseRoom(THREE, TEX, 'passagem', 'PASSAGEM SECRETA', 7, 18, 2.8);
  R.fog = { c: 0x030303, n: 3, f: 10 };
  R.music = 'creepy';
  const wallM = tm(THREE, TEX.wallStone, 3, 2);
  plane(THREE, R.group, 7, 18, tm(THREE, TEX.stoneFloor, 3, 8), 0, 0, 0, -Math.PI / 2);
  plane(THREE, R.group, 7, 18, tm(THREE, TEX.ceiling, 3, 8), 0, 2.8, 0, Math.PI / 2);
  perimeter(THREE, R, 7, 18, 2.8, wallM, [
    { side: 'N', at: 0.0, w: 2.0 },
    { side: 'S', at: 0.0, w: 2.0 },
  ]);
  doorVisual(THREE, R, 'N', 0.0, 18, 7, wallM);
  doorVisual(THREE, R, 'S', 0.0, 18, 7, wallM);
  pointLight(THREE, R, 0xff8844, 1.8, 7, 0, 2.2, 0, { amp: 0.9, speed: 9 });

  addDoor(R, 0.0, -8.4, 1.4, 'Voltar à Casa do Zelador', 'casa_zelador', 0, -2.4, Math.PI);
  addDoor(R, 0.0, 8.4, 1.4, 'Sair na Recepção Técnica', 'corredor_n', 4, 2.2, Math.PI);

  // tubulações laterais
  box(THREE, R.group, 0.5, 0.5, 16, tm(THREE, TEX.wallStone, 6, 4, 0x555566), -3.0, 2.2, 0);
  box(THREE, R.group, 0.5, 0.5, 16, tm(THREE, TEX.wallStone, 6, 4, 0x555566), 3.0, 2.2, 0);
  solid(R, -3.3, -8.2, -2.7, 8.2);
  solid(R, 2.7, -8.2, 3.3, 8.2);
  bloodDecal(THREE, R, TEX, 0.0, -2.0, 2.0, 2.6);
  addCam(R, [-3.5, -9, 0, 9], [-2.0, 2.4, 3.0], [0, 1.1, 0], 64);

  addPickup(THREE, R, TEX, 'frag', 0.0, -5.5, 1);
  addPickup(THREE, R, TEX, 'ammo9', 1.5, 4.0, 8);
  addSpawn(R, 'sombra', 0.0, 0.0);
  return R;
}

// ---------------- L1: CORREDOR NORTE (elevador + catedral) ----------------
function buildCorredorN(THREE, TEX) {
  const R = baseRoom(THREE, TEX, 'corredor_n', 'RECEPÇÃO TÉCNICA · CORREDOR NORTE', 18, 7, 3.4);
  R.fog = { c: 0x05060a, n: 5, f: 18 };
  R.music = 'creepy';
  const wallM = tm(THREE, TEX.wall, 7, 2);
  plane(THREE, R.group, 18, 7, tm(THREE, TEX.floor, 7, 3), 0, 0, 0, -Math.PI / 2);
  plane(THREE, R.group, 18, 7, tm(THREE, TEX.ceiling, 7, 3), 0, 3.4, 0, Math.PI / 2);
  perimeter(THREE, R, 18, 7, 3.4, wallM, [
    { side: 'W', at: 0.0, w: 2.0 },
    { side: 'S', at: 4.0, w: 2.0 },
    { side: 'E', at: 0.0, w: 2.0 },
    { side: 'N', at: 4.0, w: 2.0 },
  ]);
  doorVisual(THREE, R, 'W', 0.0, 7, 18, TEX.doorMetal);
  doorVisual(THREE, R, 'S', 4.0, 7, 18, wallM);
  doorVisual(THREE, R, 'E', 0.0, 7, 18, TEX.door);
  doorVisual(THREE, R, 'N', 4.0, 7, 18, TEX.doorWood);
  pointLight(THREE, R, 0xffddaa, 3, 10, -4, 3.0, 0);
  pointLight(THREE, R, 0xffddaa, 3, 10, 6, 3.0, 0, { amp: 0.6, speed: 5 });

  addDoor(R, -8.4, 0.0, 1.4, 'Voltar ao Hall Principal', 'saguao', 0, -7.4, 0);
  addDoor(R, 4.0, 3.0, 1.4, 'Entrar na Passagem Secreta', 'passagem', 0, 7.4, Math.PI);
  addDoor(R, 8.4, 0.0, 1.4, 'Entrar na Sala de Experimentos', 'experimentos', -4.4, 0.0, Math.PI / 2);
  addDoor(R, 4.0, -3.0, 1.4, 'Entrar na Catedral', 'catedral', 4, 6.4, Math.PI,
    { need: { flag: 'chapelSignal' }, msg: 'Um selo de pedra negra veda a porta. O MEDALHÃO de Lúcia vibrou no MONÓLITO da floresta... é lá que o caminho se revela.' });

  // nicho do ELEVADOR (painel de andares)
  box(THREE, R.group, 2.6, 3.0, 0.5, tm(THREE, TEX.wallStone, 2, 1, 0x667788), 0.0, 1.5, -2.8);
  solid(R, -1.4, -3.1, 1.4, -2.5);
  box(THREE, R.group, 0.9, 1.2, 0.15, flat(THREE, 0x223322), 0.0, 1.4, -2.45);
  addCam(R, [-9, -3.5, 0, 3.5], [-7.0, 2.8, 2.8], [0, 1.0, 0], 62);
  addCam(R, [0, -3.5, 9, 3.5], [7.0, 2.8, 2.8], [0, 1.0, 0], 62);

  addInteract(R, 0.0, -1.8, 1.7, 'Usar o painel do elevador', 'elevator');
  addPickup(THREE, R, TEX, 'ammo9', -6.0, 2.0, 8);
  addSpawn(R, 'rastejador', 6.0, -1.5);
  return R;
}

// ---------------- L1: SALA DE EXPERIMENTOS ----------------
function buildExperimentos(THREE, TEX) {
  const R = baseRoom(THREE, TEX, 'experimentos', 'SALA DE EXPERIMENTOS', 12, 10, 3.2);
  R.fog = { c: 0x060408, n: 5, f: 16 };
  R.music = 'creepy';
  const wallM = tm(THREE, TEX.wall, 5, 2, 0x99aaaa);
  plane(THREE, R.group, 12, 10, tm(THREE, TEX.stoneFloor, 5, 4, 0x99aabb), 0, 0, 0, -Math.PI / 2);
  plane(THREE, R.group, 12, 10, tm(THREE, TEX.ceiling, 5, 4), 0, 3.2, 0, Math.PI / 2);
  perimeter(THREE, R, 12, 10, 3.2, wallM, [{ side: 'W', at: 0.0, w: 2.0 }]);
  doorVisual(THREE, R, 'W', 0.0, 10, 12, TEX.door);
  pointLight(THREE, R, 0xaaffee, 2.5, 11, 0, 2.9, 0, { amp: 0.5, speed: 8 });

  addDoor(R, -5.4, 0.0, 1.4, 'Voltar ao Corredor Norte', 'corredor_n', 7.4, 0.0, -Math.PI / 2);

  // maca de aço central e mesa
  makeHospitalBed(THREE, TEX, R, 0.0, -2.0);
  solid(R, -0.8, -2.8, 0.8, -1.2);
  box(THREE, R.group, 2.4, 0.9, 1.2, tm(THREE, TEX.wall, 2, 1, 0xaabbbb), 2.5, 0.45, 2.2);
  solid(R, 1.3, 1.6, 3.7, 2.8);
  addCam(R, [-6, -5, 0, 5], [-4.0, 2.8, 3.4], [0, 1.0, 0], 62);

  addInteract(R, 0.0, -2.0, 1.6, 'Examinar a maca com correias', 'exam_table');
  addInteract(R, 2.5, 2.2, 1.5, 'Vasculhar as pias de formol', 'exam_sink');
  addInteract(R, -2.5, 2.2, 1.5, 'Ler a mesa do Dr. Alencastro', 'desk_dr');
  addPickup(THREE, R, TEX, 'alencastro_dossier', -3.0, -2.5, 1);
  addPickup(THREE, R, TEX, 'shell', 4.0, -3.5, 4);
  addSpawn(R, 'infectado', -2.0, 0.5);
  addSpawn(R, 'enfermeira', 2.0, -1.0);
  return R;
}

// ---------------- L1: CATEDRAL (final da Clara) ----------------
function buildCatedral(THREE, TEX) {
  const R = baseRoom(THREE, TEX, 'catedral', 'CATEDRAL ESQUECIDA', 22, 16, 6.0);
  R.fog = { c: 0x04050a, n: 7, f: 24 };
  R.music = 'creepy';
  const wallM = tm(THREE, TEX.wallStone, 8, 3);
  plane(THREE, R.group, 22, 16, tm(THREE, TEX.stoneFloor, 8, 6), 0, 0, 0, -Math.PI / 2);
  plane(THREE, R.group, 22, 16, tm(THREE, TEX.ceiling, 8, 6), 0, 6.0, 0, Math.PI / 2);
  perimeter(THREE, R, 22, 16, 6.0, wallM, [{ side: 'S', at: 4.0, w: 2.0 }]);
  doorVisual(THREE, R, 'S', 4.0, 16, 22, TEX.doorWood);
  pointLight(THREE, R, 0xffbb66, 4, 16, 4.0, 4.0, 2.0, { amp: 0.5, speed: 4 });
  pointLight(THREE, R, 0xffbb66, 3, 14, -4.0, 3.5, -3.0);
  pointLight(THREE, R, 0xffbb66, 3, 14, 4.0, 3.5, -3.0);

  addDoor(R, 4.0, 7.4, 1.4, 'Voltar ao Corredor Norte', 'corredor_n', 4, -2.2, 0);

  // bancos (duas colunas)
  for (let i = 0; i < 3; i++) {
    box(THREE, R.group, 4.2, 0.8, 1.0, wallM, -3.5, 0.4, 3.0 - i * 2.6);
    solid(R, -5.6, 2.5 - i * 2.6, -1.4, 3.5 - i * 2.6);
    box(THREE, R.group, 4.2, 0.8, 1.0, wallM, 6.5, 0.4, 3.0 - i * 2.6);
    solid(R, 4.4, 2.5 - i * 2.6, 8.6, 3.5 - i * 2.6);
  }
  // altar
  box(THREE, R.group, 3.4, 1.1, 1.4, tm(THREE, TEX.wallStone, 2, 1), 0.0, 0.55, -5.0);
  solid(R, -1.7, -5.7, 1.7, -4.3);
  // vitrais
  makeGothicWindow(THREE, TEX, R, -10.8, 3.2, -3.0, Math.PI / 2, 2.4, 3.0);
  makeGothicWindow(THREE, TEX, R, 10.8, 3.2, -3.0, -Math.PI / 2, 2.4, 3.0);
  makeGothicWindow(THREE, TEX, R, -6.0, 3.2, -7.4, 0, 2.4, 3.0);
  makeGothicWindow(THREE, TEX, R, 6.0, 3.2, -7.4, 0, 2.4, 3.0);
  addCam(R, [-11, -8, 0, 8], [-8.0, 4.4, 5.5], [0, 1.2, 0], 64);
  addCam(R, [0, -8, 11, 8], [8.0, 4.4, 5.5], [0, 1.2, 0], 64);

  addInteract(R, 0.0, -5.0, 1.8, 'Aproximar-se do altar', 'altar_capela');
  addInteract(R, -6.5, 0.0, 1.5, 'Examinar o confessionário', 'confessionario');
  addInteract(R, 6.5, 0.0, 1.5, 'Examinar a estátua do anjo', 'anjo_capela');
  addPickup(THREE, R, TEX, 'shotgun', 0.0, -6.6, 1);
  addPickup(THREE, R, TEX, 'shell', 0.8, -6.6, 8);
  addPickup(THREE, R, TEX, 'antidote', -8.0, 5.5, 1);
  addSpawn(R, 'sombra', -5.0, 2.0);
  addSpawn(R, 'sombra', 5.0, -1.0);
  return R;
}

'''

BUILDERS = '''// ==================== DICIONÁRIO DE SALAS ====================
const BUILDERS = {
  quarto: buildQuarto,
  quarto2: buildQuarto2,
  corredor: buildCorredor,
  saguao: buildSaguao,
  cemiterio: buildCemiterio,
  estufa: buildEstufa,
  floresta: buildFloresta,
  estacionamento: buildEstacionamento,
  casa_zelador: buildCasaZelador,
  passagem: buildPassagem,
  corredor_n: buildCorredorN,
  experimentos: buildExperimentos,
  catedral: buildCatedral,
  title_diorama: buildTitleDiorama,
};

'''

out = head + NOVO + diorama + BUILDERS
open(SRC, 'w', encoding='utf-8').write(out)
print('world.js novo montado:', len(out.splitlines()), 'linhas')
