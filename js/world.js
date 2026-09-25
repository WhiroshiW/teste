// ============================================================
// SANTA LÚCIA - Equipe Nakamura - Mundo 3D Remasterizado
// Cenários arquitetônicos fiéis às 4 folhas de projeto do caderno:
// P1 (Térreo & Externos), P2 (2º Andar & Caldeiras),
// P3 (3º Andar & Terraço Heliponto) e Extras (Subsolo & Culto).
// Modelos 3D autênticos estilo PS1 (Resident Evil / Silent Hill).
// ============================================================
import { pointInSolids } from './entities.js';

// ==================== HELPERS MATERIAIS E PRIMITIVAS ====================
function tm(THREE, tex, rx = 1, ry = 1, color = 0xffffff, emissive = 0x000000) {
  const t = tex.clone();
  t.needsUpdate = true;
  t.repeat.set(rx, ry);
  return new THREE.MeshLambertMaterial({ map: t, color, emissive });
}
function flat(THREE, color, emissive = 0x000000) {
  return new THREE.MeshLambertMaterial({ color, emissive });
}
function basic(THREE, colorOrMap, opts = {}) {
  if (colorOrMap && colorOrMap.isTexture) {
    return new THREE.MeshBasicMaterial({ map: colorOrMap, ...opts });
  }
  return new THREE.MeshBasicMaterial({ color: colorOrMap, ...opts });
}

function box(THREE, parent, w, h, d, material, x, y, z, ry = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  m.position.set(x, y, z);
  m.rotation.y = ry;
  parent.add(m);
  return m;
}

function plane(THREE, parent, w, h, material, x, y, z, rx = 0, ry = 0) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), material);
  m.position.set(x, y, z);
  m.rotation.x = rx; m.rotation.y = ry;
  parent.add(m);
  return m;
}

function solid(room, x0, z0, x1, z1, tag = null) {
  room.solids.push({ x0, z0, x1, z1, tag });
}

function pointLight(THREE, room, color, intensity, distance, x, y, z, flicker = null) {
  const l = new THREE.PointLight(color, intensity, distance);
  l.position.set(x, y, z);
  room.group.add(l);
  if (flicker) {
    l.userData.flicker = { base: intensity, amp: flicker.amp || 1.5, speed: flicker.speed || 8 };
  }
  room.lights.push(l);
  return l;
}

function bloodDecal(THREE, room, TEX, x, z, w = 1.6, d = 1.6) {
  const b = plane(THREE, room.group, w, d, new THREE.MeshBasicMaterial({
    map: TEX.blood, transparent: true, opacity: 0.82, depthWrite: false,
  }), x, 0.015, z, -Math.PI / 2);
  b.rotation.z = Math.random() * Math.PI * 2;
  return b;
}

// Perímetro com vãos de portas proporcionais
function perimeter(THREE, room, w, d, h, wallMat, gaps = [], th = 0.5) {
  const gapsBy = { N: [], S: [], E: [], W: [] };
  gaps.forEach((g) => gapsBy[g.side].push(g));

  const buildSide = (side, from, to) => {
    const list = gapsBy[side].slice().sort((a, b) => a.at - b.at);
    let cur = from;
    const parts = [];
    for (const g of list) {
      const a = g.at - g.w / 2, b = g.at + g.w / 2;
      if (a > cur + 0.01) parts.push([cur, a]);
      cur = Math.max(cur, b);
    }
    if (cur < to - 0.01) parts.push([cur, to]);
    return parts;
  };

  const mkWall = (cx, cz, len, horiz) => {
    const ww = horiz ? len : th;
    const dd = horiz ? th : len;
    box(THREE, room.group, ww, h, dd, wallMat, cx, h / 2, cz);
    solid(room, cx - ww / 2, cz - dd / 2, cx + ww / 2, cz + dd / 2);
  };

  for (const [a, b] of buildSide('N', -w / 2, w / 2)) {
    mkWall((a + b) / 2, -d / 2, b - a, true);
  }
  for (const [a, b] of buildSide('S', -w / 2, w / 2)) {
    mkWall((a + b) / 2, d / 2, b - a, true);
  }
  for (const [a, b] of buildSide('W', -d / 2, d / 2)) {
    mkWall(-w / 2, (a + b) / 2, b - a, false);
  }
  for (const [a, b] of buildSide('E', -d / 2, d / 2)) {
    mkWall(w / 2, (a + b) / 2, b - a, false);
  }

  // Verga sobre as portas
  const lintelMat = wallMat;
  for (const g of gaps) {
    if (g.side === 'N') {
      const z = -d / 2;
      solid(room, g.at - g.w / 2, z - 0.5, g.at + g.w / 2, z);
      box(THREE, room.group, g.w + 0.4, h - 2.4, th, lintelMat, g.at, 2.4 + (h - 2.4) / 2, z);
    } else if (g.side === 'S') {
      const z = d / 2;
      solid(room, g.at - g.w / 2, z, g.at + g.w / 2, z + 0.5);
      box(THREE, room.group, g.w + 0.4, h - 2.4, th, lintelMat, g.at, 2.4 + (h - 2.4) / 2, z);
    } else if (g.side === 'W') {
      const x = -w / 2;
      solid(room, x - 0.5, g.at - g.w / 2, x, g.at + g.w / 2);
      box(THREE, room.group, th, h - 2.4, g.w + 0.4, lintelMat, x, 2.4 + (h - 2.4) / 2, g.at);
    } else if (g.side === 'E') {
      const x = w / 2;
      solid(room, x, g.at - g.w / 2, x + 0.5, g.at + g.w / 2);
      box(THREE, room.group, th, h - 2.4, g.w + 0.4, lintelMat, x, 2.4 + (h - 2.4) / 2, g.at);
    }
  }
}

// Visual de porta 3D com batente, painéis, maçaneta de latão e placa indicativa
function doorVisual(THREE, room, side, at, d, w, tex, frameColor = 0x241a12) {
  const g = room.group;
  const fm = flat(THREE, frameColor);
  const dm = new THREE.MeshLambertMaterial({ map: tex });
  const brassM = flat(THREE, 0xc8a028);

  if (side === 'N' || side === 'S') {
    const z = side === 'N' ? -d / 2 : d / 2;
    const face = side === 'N' ? 0.26 : -0.26;
    box(THREE, g, 0.18, 2.4, 0.45, fm, at - 0.88, 1.2, z);
    box(THREE, g, 0.18, 2.4, 0.45, fm, at + 0.88, 1.2, z);
    box(THREE, g, 1.94, 0.18, 0.45, fm, at, 2.4, z);
    plane(THREE, g, 1.58, 2.3, dm, at, 1.15, z + face, 0, side === 'N' ? 0 : Math.PI);
    box(THREE, g, 0.08, 0.12, 0.14, brassM, at + (side === 'N' ? 0.6 : -0.6), 1.05, z + face * 1.1);
  } else {
    const x = side === 'W' ? -w / 2 : w / 2;
    const face = side === 'W' ? 0.26 : -0.26;
    box(THREE, g, 0.45, 2.4, 0.18, fm, x, 1.2, at - 0.88);
    box(THREE, g, 0.45, 2.4, 0.18, fm, x, 1.2, at + 0.88);
    box(THREE, g, 0.45, 0.18, 1.94, fm, x, 2.4, at);
    plane(THREE, g, 1.58, 2.3, dm, x + face, 1.15, at, 0, side === 'W' ? Math.PI / 2 : -Math.PI / 2);
    box(THREE, g, 0.14, 0.12, 0.08, brassM, x + face * 1.1, 1.05, at + (side === 'W' ? -0.6 : 0.6));
  }
}

// ==================== MODELOS 3D AUTÊNTICOS DO SANATÓRIO ====================

// 1. Maca Hospitalar Psiquiátrica Clássica
function makeHospitalBed(THREE, TEX, room, x, z, ry = 0) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.rotation.y = ry;
  room.group.add(g);

  const metalM = flat(THREE, 0x485058);
  const mattM = tm(THREE, TEX.mattress, 1, 1);
  const sheetM = tm(THREE, TEX.sheet, 1, 1);
  const chromeM = flat(THREE, 0x8a929a);

  for (const [px, pz] of [[-0.95, -0.45], [0.95, -0.45], [-0.95, 0.45], [0.95, 0.45]]) {
    box(THREE, g, 0.08, 0.45, 0.08, metalM, px, 0.225, pz);
    box(THREE, g, 0.12, 0.08, 0.12, flat(THREE, 0x1a1a1a), px, 0.04, pz);
  }
  box(THREE, g, 2.1, 0.08, 1.05, metalM, 0, 0.45, 0);
  box(THREE, g, 0.08, 0.95, 1.05, metalM, -1.02, 0.85, 0);
  for (let b = -0.35; b <= 0.35; b += 0.24) {
    box(THREE, g, 0.04, 0.6, 0.04, chromeM, -1.02, 0.85, b);
  }
  box(THREE, g, 0.08, 0.65, 1.05, metalM, 1.02, 0.7, 0);
  box(THREE, g, 1.95, 0.16, 0.95, mattM, 0, 0.56, 0);
  box(THREE, g, 1.4, 0.08, 0.98, sheetM, 0.25, 0.66, 0);
  box(THREE, g, 0.45, 0.14, 0.75, sheetM, -0.7, 0.68, 0);

  // Suporte de Soro (IV Pole)
  box(THREE, g, 0.04, 1.85, 0.04, chromeM, -1.08, 0.925, 0.55);
  box(THREE, g, 0.25, 0.04, 0.04, chromeM, -1.08, 1.82, 0.55);
  box(THREE, g, 0.14, 0.24, 0.06, basic(THREE, 0xd0e8ff, { transparent: true, opacity: 0.75 }), -1.08, 1.65, 0.55);

  solid(room, x - 1.1, z - 0.55, x + 1.1, z + 0.55);
  return g;
}

// 2. Balcão de Recepção em 'U' (Folha P1 - Saguão Principal)
function makeReceptionCounterU(THREE, TEX, room, x, z) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  room.group.add(g);

  const woodM = tm(THREE, TEX.receptionCounter, 1, 1);
  const topM = tm(THREE, TEX.wood, 2, 1);
  const darkW = flat(THREE, 0x22160e);

  box(THREE, g, 4.2, 1.08, 0.65, woodM, 0, 0.54, 0);
  box(THREE, g, 4.4, 0.1, 0.8, topM, 0, 1.12, 0);
  box(THREE, g, 0.65, 1.08, 2.0, woodM, -1.8, 0.54, 1.0);
  box(THREE, g, 0.8, 0.1, 2.1, topM, -1.8, 1.12, 1.0);
  box(THREE, g, 0.65, 1.08, 2.0, woodM, 1.8, 0.54, 1.0);
  box(THREE, g, 0.8, 0.1, 2.1, topM, 1.8, 1.12, 1.0);

  box(THREE, g, 2.8, 0.08, 1.0, topM, 0, 0.76, 0.8);
  box(THREE, g, 0.55, 0.72, 0.7, darkW, -1.0, 0.38, 0.8);
  box(THREE, g, 0.55, 0.72, 0.7, darkW, 1.0, 0.38, 0.8);

  // Máquina de Escrever clássica
  box(THREE, g, 0.44, 0.15, 0.4, tm(THREE, TEX.typewriter, 1, 1), 0, 1.22, 0.02);
  plane(THREE, g, 0.26, 0.3, tm(THREE, TEX.paper, 1, 1), 0, 1.4, -0.05, 0.2, 0);

  // Banker's Lamp
  box(THREE, g, 0.16, 0.04, 0.16, flat(THREE, 0xc8a028), -0.7, 1.18, 0.02);
  box(THREE, g, 0.04, 0.3, 0.04, flat(THREE, 0xc8a028), -0.7, 1.33, 0.02);
  box(THREE, g, 0.3, 0.12, 0.12, flat(THREE, 0x1b4d2e), -0.7, 1.48, 0.02);
  pointLight(THREE, room, 0x77ffaa, 4, 5, x - 0.7, 1.55, z + 0.02);
  pointLight(THREE, room, 0xffdd99, 7, 7, x, 1.45, z + 0.02);

  // Telefone, campainha e ribbon
  box(THREE, g, 0.24, 0.12, 0.24, flat(THREE, 0x16181c), 0.75, 1.22, 0.02);
  box(THREE, g, 0.12, 0.06, 0.12, flat(THREE, 0xdddddd), -1.3, 1.18, 0.02);
  box(THREE, g, 0.16, 0.06, 0.16, flat(THREE, 0x8a1a1a), 0.35, 1.18, 0.02);

  // Bebedouro com galão de água
  const cooler = new THREE.Group();
  cooler.position.set(-2.8, 0, 0.4);
  g.add(cooler);
  box(THREE, cooler, 0.4, 0.95, 0.4, tm(THREE, TEX.waterDispenser, 1, 1), 0, 0.475, 0);
  box(THREE, cooler, 0.32, 0.44, 0.32, basic(THREE, 0x3388dd, { transparent: true, opacity: 0.78 }), 0, 1.18, 0);

  // Vasos de plantas nos cantos
  for (const [vx, vz] of [[-2.8, 2.2], [2.8, 2.2]]) {
    const pot = new THREE.Group();
    pot.position.set(vx, 0, vz);
    g.add(pot);
    box(THREE, pot, 0.45, 0.6, 0.45, tm(THREE, TEX.vase, 1, 1), 0, 0.3, 0);
    box(THREE, pot, 0.6, 0.75, 0.6, tm(THREE, TEX.leaves, 1, 1), 0, 0.9, 0);
  }

  // Sólidos de colisão do balcão em U
  solid(room, x - 2.2, z - 0.4, x + 2.2, z + 0.4);
  solid(room, x - 2.2, z + 0.4, x - 1.4, z + 2.1);
  solid(room, x + 1.4, z + 0.4, x + 2.2, z + 2.1);
  solid(room, x - 3.1, z + 0.15, x - 2.5, z + 0.65); // bebedouro
  solid(room, x - 3.1, z + 1.9, x - 2.5, z + 2.5);   // planta
  solid(room, x + 2.5, z + 1.9, x + 3.1, z + 2.5);

  return g;
}

// 3. O Grande Cofre Confidencial de Ferro (Folha P1 - Quarto 2)
function makeSafeConfidential(THREE, TEX, room, x, z, ry = 0) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.rotation.y = ry;
  room.group.add(g);

  const ironM = flat(THREE, 0x22262c);
  const steelM = flat(THREE, 0x4a525a);
  const chromeM = flat(THREE, 0xd0d8e0);
  const safeFaceM = new THREE.MeshLambertMaterial({ map: TEX.safe });

  box(THREE, g, 1.25, 1.45, 1.05, ironM, 0, 0.725, 0);
  box(THREE, g, 1.32, 1.52, 0.08, steelM, 0, 0.725, 0.52);
  plane(THREE, g, 1.15, 1.35, safeFaceM, 0, 0.725, 0.57, 0, 0);
  box(THREE, g, 0.32, 0.06, 0.06, chromeM, 0, 0.725, 0.62);
  box(THREE, g, 0.06, 0.32, 0.06, chromeM, 0, 0.725, 0.62);
  box(THREE, g, 0.16, 0.16, 0.04, flat(THREE, 0xc8a028), 0.28, 0.95, 0.6);

  solid(room, x - 0.7, z - 0.6, x + 0.7, z + 0.6);
  return g;
}

// 4. Armário Médico Envidraçado de Remédios
function makeMedicalCabinet(THREE, TEX, room, x, z, ry = 0) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.rotation.y = ry;
  room.group.add(g);

  const whiteM = tm(THREE, TEX.cabinet, 1, 1);
  const glassM = basic(THREE, 0xaad4f0, { transparent: true, opacity: 0.45 });

  box(THREE, g, 1.1, 2.2, 0.55, whiteM, 0, 1.1, 0);
  plane(THREE, g, 0.92, 1.25, glassM, 0, 1.35, 0.28, 0, 0);
  box(THREE, g, 0.12, 0.24, 0.12, flat(THREE, 0x8a4014), -0.28, 1.2, 0.1);
  box(THREE, g, 0.1, 0.2, 0.1, flat(THREE, 0x226633), 0.0, 1.18, 0.1);
  box(THREE, g, 0.14, 0.28, 0.14, flat(THREE, 0x1c3858), 0.26, 1.22, 0.1);

  solid(room, x - 0.6, z - 0.32, x + 0.6, z + 0.32);
  return g;
}

// 5. Caldeira Industrial com Tubulações e Válvula (Folha P2 - Porão)
function makeIndustrialBoiler(THREE, TEX, room, x, z) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  room.group.add(g);

  const boilerM = tm(THREE, TEX.boiler, 1, 1);
  const pipeM = tm(THREE, TEX.pipe, 1, 2);
  const rustM = tm(THREE, TEX.rust, 1, 1);
  const redValveM = flat(THREE, 0xbb2222);

  const cyl = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 2.5, 12), boilerM);
  cyl.position.y = 1.35;
  g.add(cyl);

  for (const [px, pz] of [[-0.6, -0.6], [0.6, -0.6], [-0.6, 0.6], [0.6, 0.6]]) {
    box(THREE, g, 0.16, 0.38, 0.16, rustM, px, 0.19, pz);
  }

  const p1 = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 3.2, 8), pipeM);
  p1.position.set(0, 2.4, 0);
  g.add(p1);

  box(THREE, g, 0.24, 0.24, 0.08, flat(THREE, 0xeeeeee), 0, 1.8, 0.82);
  const valve = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.04, 6, 12), redValveM);
  valve.position.set(0.6, 1.2, 0.6);
  valve.rotation.y = Math.PI / 4;
  g.add(valve);

  solid(room, x - 0.85, z - 0.85, x + 0.85, z + 0.85);
  return g;
}

// 6. Janela Gótica / Hospitalar com Grades de Ferro
function makeGothicWindow(THREE, TEX, room, x, y, z, ry = 0, w = 1.8, h = 2.4) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.rotation.y = ry;
  room.group.add(g);

  const frameM = flat(THREE, 0x22262e);
  const glassM = basic(THREE, 0x3a5a78, { transparent: true, opacity: 0.55 });
  const ironM = flat(THREE, 0x14161a);

  box(THREE, g, w + 0.2, h + 0.2, 0.15, frameM, 0, 0, 0);
  box(THREE, g, w + 0.4, 0.12, 0.28, frameM, 0, -h / 2, 0.06);
  plane(THREE, g, w, h, glassM, 0, 0, 0.01, 0, 0);

  const cols = 4;
  for (let i = 0; i <= cols; i++) {
    const gx = -w / 2 + (w / cols) * i;
    box(THREE, g, 0.04, h, 0.04, ironM, gx, 0, 0.04);
  }
  for (let j = -0.5; j <= 0.5; j += 0.5) {
    box(THREE, g, w, 0.04, 0.04, ironM, 0, j * (h * 0.4), 0.04);
  }

  const curtainM = tm(THREE, TEX.curtain, 1, 1);
  plane(THREE, g, 0.45, h * 0.95, curtainM, -w / 2 + 0.22, 0, 0.08, 0, 0);
  plane(THREE, g, 0.45, h * 0.95, curtainM, w / 2 - 0.22, 0, 0.08, 0, 0);

  return g;
}

// ==================== CONSTRUTOR BASE DE SALAS ====================
function baseRoom(THREE, TEX, id, name, w, d, h) {
  const room = {
    id, name, w, d, h,
    group: new THREE.Group(),
    fog: { c: 0x030304, n: 8, f: 30 },
    solids: [], cams: [], doors: [], pickups: [], interacts: [], spawns: [],
    lights: [], fx: null, ambient: 'quarto', music: null,
    waterMesh: null, portal: null, memorialGems: [], elevLight: null, rain: null,
    los(x0, z0, x1, z1) {
      const dist = Math.hypot(x1 - x0, z1 - z0);
      const steps = Math.ceil(dist / 0.3);
      for (let i = 1; i < steps; i++) {
        const t = i / steps;
        if (pointInSolids(x0 + (x1 - x0) * t, z0 + (z1 - z0) * t, room.solids)) return false;
      }
      return true;
    },
  };
  return room;
}

function addPickup(THREE, room, TEX, item, x, z, qty = 1, page = null, y = 0.35) {
  const mesh = makePickupMesh(THREE, TEX, item, page);
  mesh.position.set(x, y, z);
  room.group.add(mesh);
  room.pickups.push({ idx: room.pickups.length, item, qty, page, x, z, y, mesh, taken: false, phase: Math.random() * 6 });
}
function addInteract(room, x, z, r, prompt, act, when = null) {
  room.interacts.push({ x, z, r, prompt, act, when });
}
function addDoor(room, x, z, r, label, target, sx, sz, sa, opts = {}) {
  const rot = Number.isFinite(sa) ? sa : (opts.srot !== undefined ? opts.srot : 0);
  room.doors.push({ x, z, r, label, target, sx, sz, sa: rot, srot: rot, ...opts });
}
function addSpawn(room, type, x, z) {
  room.spawns.push({ idx: room.spawns.length, type, x, z });
}
function addCam(room, rect, pos, look, fov = 60) {
  room.cams.push({ rect, pos, look, fov });
}

// Pickup meshes retrô
export function makePickupMesh(THREE, TEX, item, page = null) {
  const g = new THREE.Group();
  const M = (c) => flat(THREE, c);
  const addGlow = (tex, col, s = 0.8) => {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({
      map: tex || TEX.glowWarm, color: col, transparent: true, opacity: 0.65,
      blending: THREE.AdditiveBlending, depthWrite: false,
    }));
    sp.scale.set(s, s, 1);
    g.add(sp);
  };

  switch (item) {
    case 'gun':
    case 'shotgun':
    case 'launcher': {
      box(THREE, g, 0.45, 0.14, 0.1, M(0x222222), 0, 0, 0);
      box(THREE, g, 0.1, 0.22, 0.08, M(0x4a321a), -0.15, -0.08, 0);
      addGlow(TEX.glowWarm, 0xffbb44, 0.9);
      break;
    }
    case 'ammo9':
    case 'shell':
    case 'grenade_rounds': {
      box(THREE, g, 0.24, 0.18, 0.24, M(0x3a4f28), 0, 0, 0);
      box(THREE, g, 0.22, 0.04, 0.22, M(0xc8a028), 0, 0.1, 0);
      addGlow(TEX.glowWarm, 0x88cc44, 0.65);
      break;
    }
    case 'pills':
    case 'firstaid':
    case 'antidote': {
      box(THREE, g, 0.18, 0.32, 0.18, M(0xf0eee4), 0, 0, 0);
      box(THREE, g, 0.2, 0.08, 0.2, M(0x228833), 0, 0.04, 0);
      box(THREE, g, 0.14, 0.08, 0.14, M(0x228833), 0, 0.18, 0);
      addGlow(TEX.glowGreen, 0x44ff66, 0.75);
      break;
    }
    case 'smallkey':
    case 'rustkey':
    case 'basekey':
    case 'forest_key':
    case 'greenhouse_key':
    case 'terrace_key': {
      const col = item === 'rustkey' ? 0x8a4a22 : item === 'basekey' ? 0x667788 : 0xd8b030;
      box(THREE, g, 0.06, 0.3, 0.04, M(col), 0, 0, 0);
      box(THREE, g, 0.16, 0.14, 0.04, M(col), 0, 0.12, 0);
      box(THREE, g, 0.1, 0.06, 0.04, M(col), 0.05, -0.09, 0);
      addGlow(TEX.glowWarm, col, 0.8);
      break;
    }
    case 'fuse': {
      box(THREE, g, 0.12, 0.35, 0.12, M(0x334466), 0, 0, 0);
      box(THREE, g, 0.14, 0.08, 0.14, M(0xd0d8e0), 0, 0.14, 0);
      box(THREE, g, 0.14, 0.08, 0.14, M(0xd0d8e0), 0, -0.14, 0);
      addGlow(TEX.glowWarm, 0x88bbff, 0.85);
      break;
    }
    case 'crank':
    case 'crowbar': {
      box(THREE, g, 0.45, 0.08, 0.08, M(0x44444c), 0, 0, 0);
      box(THREE, g, 0.08, 0.22, 0.08, M(0x44444c), 0.2, 0.07, 0);
      addGlow(TEX.glowWarm, 0x99aacc, 0.75);
      break;
    }
    case 'herbicide': {
      box(THREE, g, 0.28, 0.4, 0.28, M(0x2d4420), 0, 0, 0);
      box(THREE, g, 0.12, 0.14, 0.12, M(0xdddd44), 0, 0.24, 0);
      addGlow(TEX.glowGreen, 0x66ff44, 0.85);
      break;
    }
    case 'cult_symbol': {
      box(THREE, g, 0.26, 0.26, 0.06, M(0x551177), 0, 0, 0);
      addGlow(TEX.glowWarm, 0xaa44ff, 0.95);
      break;
    }
    case 'lightflask': {
      box(THREE, g, 0.16, 0.28, 0.12, M(0xc88220), 0, 0, 0);
      box(THREE, g, 0.08, 0.08, 0.08, M(0x333333), 0, 0.16, 0);
      addGlow(TEX.glowWarm, 0xffaa33, 0.75);
      break;
    }
    case 'ribbon': {
      box(THREE, g, 0.24, 0.08, 0.24, M(0x1a1a1a), 0, 0, 0);
      box(THREE, g, 0.2, 0.06, 0.2, M(0x8a1a1a), 0, 0, 0);
      addGlow(TEX.glowWarm, 0xff4444, 0.75);
      break;
    }
    case 'page': {
      plane(THREE, g, 0.3, 0.4, new THREE.MeshLambertMaterial({ map: TEX.paper }), 0, 0, 0, -Math.PI / 2 + 0.2, 0);
      addGlow(TEX.glowWarm, 0xffdd99, 0.7);
      break;
    }
    default:
      box(THREE, g, 0.25, 0.25, 0.25, M(0xffffff), 0, 0, 0);
  }
  g.rotation.y = Math.random() * 3;
  return g;
}

// ============================================================
// CONSTRUÇÃO ARQUITETÔNICA DAS SALAS (4 FOLHAS DO PROJETO)
// ============================================================

// ---------------- 1. FOLHA P1: QUARTO 1 (DANIEL) ----------------
function buildQuarto(THREE, TEX) {
  const R = baseRoom(THREE, TEX, 'quarto', 'ALA DE INTERNAÇÃO · QUARTO 03', 10, 8, 3.2);
  R.fog = { c: 0x05050c, n: 5, f: 20 };
  R.ambient = 'quarto';

  const floorM = tm(THREE, TEX.floorWood, 3, 3);
  const wallM = tm(THREE, TEX.wallpaper, 4, 1.4);
  const ceilM = tm(THREE, TEX.ceiling, 4, 3);
  plane(THREE, R.group, 10, 8, floorM, 0, 0, 0, -Math.PI / 2);
  plane(THREE, R.group, 10, 8, ceilM, 0, 3.2, 0, Math.PI / 2);

  perimeter(THREE, R, 10, 8, 3.2, wallM, [{ side: 'S', at: 0.0, w: 1.8 }]);
  doorVisual(THREE, R, 'S', 0.0, 8, 10, TEX.doorWood, 0x22160e);

  makeHospitalBed(THREE, TEX, R, -3.0, -2.4, 0);

  const woodD = flat(THREE, 0x2a1c12);
  box(THREE, R.group, 0.75, 0.75, 0.75, tm(THREE, TEX.wood, 1, 1), -1.6, 0.375, -3.2);
  box(THREE, R.group, 0.22, 0.35, 0.22, flat(THREE, 0xded8c0), -1.6, 0.92, -3.2);
  pointLight(THREE, R, 0xffa044, 4, 6, -1.6, 1.2, -3.2);
  solid(R, -2.0, -3.6, -1.2, -2.8);

  makeGothicWindow(THREE, TEX, R, 1.5, 1.8, -3.94, 0, 1.8, 2.2);
  pointLight(THREE, R, 0x4a6a9a, 3, 8, 1.5, 2.0, -3.2);

  box(THREE, R.group, 0.9, 0.45, 0.9, flat(THREE, 0x5a1a1a), -3.4, 0.225, 1.8);
  box(THREE, R.group, 0.2, 0.9, 0.9, flat(THREE, 0x5a1a1a), -3.85, 0.65, 1.8);
  solid(R, -4.1, 1.2, -2.8, 2.4);

  box(THREE, R.group, 1.2, 2.4, 0.6, woodD, 4.3, 1.2, -1.0);
  solid(R, 3.6, -1.5, 4.8, -0.5);

  plane(THREE, R.group, 2.6, 2.0, tm(THREE, TEX.rug, 1, 1), 0, 0.012, 0.2, -Math.PI / 2);

  addCam(R, [-5, -4, 0, 4], [-3.8, 2.6, 3.0], [-0.5, 1.1, -1.0], 60);
  addCam(R, [0, -4, 5, 4], [3.8, 2.6, -3.0], [1.0, 1.1, 1.0], 60);

  addDoor(R, 0.0, 3.4, 1.4, 'Sair para o Corredor dos Quartos', 'corredor_quartos', -4.0, -2.5, 0);

  addInteract(R, -2.8, -2.0, 1.6, 'Examinar a cama hospitalar', 'bed');
  addInteract(R, -1.6, -2.5, 1.4, 'Abrir a gaveta trancada', 'drawer');
  addInteract(R, -3.4, 1.8, 1.3, 'Pegar o ursinho de pelúcia', 'teddy');
  addInteract(R, 1.5, -3.0, 1.4, 'Olhar pela janela com grades', 'window_q');
  addInteract(R, 4.2, -1.0, 1.3, 'Examinar o armário', 'clock');

  addPickup(THREE, R, TEX, 'page', -0.5, 1.5, 1, 0, 0.06);

  return R;
}

// ---------------- 2. FOLHA P1: CORREDOR DOS QUARTOS ----------------
function buildCorredorQuartos(THREE, TEX) {
  const R = baseRoom(THREE, TEX, 'corredor_quartos', 'ALA DE INTERNAÇÃO · CORREDOR OESTE', 16, 8, 3.2);
  R.fog = { c: 0x05050c, n: 6, f: 22 };
  R.ambient = 'quarto';

  const floorM = tm(THREE, TEX.floorWood, 5, 2);
  const wallM = tm(THREE, TEX.wallpaper, 6, 1.4);
  const ceilM = tm(THREE, TEX.ceiling, 6, 3);
  plane(THREE, R.group, 16, 8, floorM, 0, 0, 0, -Math.PI / 2);
  plane(THREE, R.group, 16, 8, ceilM, 0, 3.2, 0, Math.PI / 2);

  perimeter(THREE, R, 16, 8, 3.2, wallM, [
    { side: 'N', at: -4.0, w: 1.8 },
    { side: 'S', at: -4.0, w: 1.8 },
    { side: 'E', at: 0.0, w: 1.8 },
  ]);
  doorVisual(THREE, R, 'N', -4.0, 8, 16, TEX.doorWood, 0x241a12);
  doorVisual(THREE, R, 'S', -4.0, 8, 16, TEX.doorWood, 0x241a12);
  doorVisual(THREE, R, 'E', 0.0, 8, 16, TEX.doorWood, 0x241a12);

  plane(THREE, R.group, 13, 2.2, tm(THREE, TEX.carpet, 5, 1), 0.5, 0.012, 0, -Math.PI / 2);

  makeHospitalBed(THREE, TEX, R, 2.5, -2.8, 0);
  makeGothicWindow(THREE, TEX, R, -1.0, 1.8, -3.94, 0, 1.8, 2.2);

  pointLight(THREE, R, 0x9a8060, 4, 10, -4.0, 2.4, 0);
  pointLight(THREE, R, 0x4a6a9a, 3, 9, 2.0, 2.4, 0);

  addCam(R, [-8, -4, 0, 4], [-5.0, 2.6, 2.8], [-1.0, 1.1, 0.0], 65);
  addCam(R, [0, -4, 8, 4], [5.0, 2.6, 2.8], [1.0, 1.1, 0.0], 65);

  addDoor(R, -4.0, -3.4, 1.3, 'Entrar no Quarto 1 (Daniel)', 'quarto', 0, 2.4, Math.PI);
  addDoor(R, -4.0, 3.4, 1.3, 'Entrar no Quarto 2 (Cofre Confidencial)', 'quarto2', 0, -2.6, 0);
  addDoor(R, 7.4, 0.0, 1.4, 'Ir ao Saguão Principal', 'saguao', -7.5, 3.5, -Math.PI / 2);

  addPickup(THREE, R, TEX, 'ammo9', 2.0, 2.8, 15);
  addSpawn(R, 'infectado', 0.0, 0.0);

  return R;
}

// ---------------- 3. FOLHA P1: QUARTO 2 (COFRE CONFIDENCIAL) ----------------
function buildQuarto2(THREE, TEX) {
  const R = baseRoom(THREE, TEX, 'quarto2', 'QUARTO 2 · COFRE CONFIDENCIAL', 10, 8, 3.2);
  R.fog = { c: 0x06050b, n: 5, f: 20 };
  R.ambient = 'quarto';

  const floorM = tm(THREE, TEX.floorWood, 3, 3);
  const wallM = tm(THREE, TEX.wallpaper, 4, 1.4);
  const ceilM = tm(THREE, TEX.ceiling, 4, 3);
  plane(THREE, R.group, 10, 8, floorM, 0, 0, 0, -Math.PI / 2);
  plane(THREE, R.group, 10, 8, ceilM, 0, 3.2, 0, Math.PI / 2);

  perimeter(THREE, R, 10, 8, 3.2, wallM, [{ side: 'N', at: 0.0, w: 1.8 }]);
  doorVisual(THREE, R, 'N', 0.0, 8, 10, TEX.doorWood, 0x22160e);

  makeSafeConfidential(THREE, TEX, R, -3.5, 2.7, 0);
  makeHospitalBed(THREE, TEX, R, 3.0, -2.4, Math.PI);

  box(THREE, R.group, 0.5, 2.4, 2.6, tm(THREE, TEX.bookcase, 1, 1), -4.5, 1.2, -1.2);
  solid(R, -4.9, -2.6, -4.1, 0.2);

  plane(THREE, R.group, 2.4, 2.8, tm(THREE, TEX.rug, 1, 1), 0, 0.012, 0.4, -Math.PI / 2);

  pointLight(THREE, R, 0x9a8060, 4, 9, 0, 2.4, 0);
  pointLight(THREE, R, 0x4a7a9a, 3, 7, -3.5, 1.8, 2.0);

  addCam(R, [-5, -4, 0, 4], [-3.4, 2.6, -2.6], [-0.5, 1.1, 1.0], 62);
  addCam(R, [0, -4, 5, 4], [3.4, 2.6, 2.6], [0.0, 1.1, 0.0], 62);

  addDoor(R, 0.0, -3.4, 1.3, 'Sair para o Corredor dos Quartos', 'corredor_quartos', -4.0, 2.5, Math.PI);

  addInteract(R, -3.5, 1.8, 1.5, 'Abrir o cofre confidencial', 'safe');
  addInteract(R, 3.0, -1.5, 1.3, 'Examinar a cama antiga', 'bed2');
  addInteract(R, -4.2, -1.2, 1.3, 'Examinar a estante de prontuários', 'shelf');

  addPickup(THREE, R, TEX, 'antidote', -1.2, 2.2, 1);
  addPickup(THREE, R, TEX, 'shell', 2.0, 2.0, 4); // Cartuchos críticos
  addSpawn(R, 'sombra', 1.5, 1.0);

  return R;
}

// ---------------- 4. FOLHA P1: SAGUÃO PRINCIPAL REMASTERIZADO ----------------
function buildSaguao(THREE, TEX) {
  const R = baseRoom(THREE, TEX, 'saguao', 'SAGUÃO PRINCIPAL', 18, 14, 4.5);
  R.fog = { c: 0x030304, n: 7, f: 30 };
  R.ambient = 'saguao';
  R.music = 'save';

  const floorM = tm(THREE, TEX.floorTile, 6, 5);
  const wallM = tm(THREE, TEX.wallDirty, 7, 2);
  const ceilM = tm(THREE, TEX.ceiling, 7, 6);
  plane(THREE, R.group, 18, 14, floorM, 0, 0, 0, -Math.PI / 2);
  plane(THREE, R.group, 18, 14, ceilM, 0, 4.5, 0, Math.PI / 2);

  perimeter(THREE, R, 18, 14, 4.5, wallM, [
    { side: 'W', at: 3.5, w: 2.0 },  // Ala dos Quartos
    { side: 'W', at: -2.5, w: 1.8 }, // Porão
    { side: 'S', at: -3.0, w: 2.2 }, // Estufa Botânica
    { side: 'S', at: 2.5, w: 2.0 },  // Floresta / Capela
    { side: 'N', at: -3.0, w: 2.2 }, // Cemitério
    { side: 'N', at: 3.5, w: 2.4 },  // Elevador
    { side: 'E', at: -1.5, w: 2.0 }, // Pátio Canil
    { side: 'E', at: 2.0, w: 2.0 },  // Enfermaria
    { side: 'E', at: -4.5, w: 1.8 }, // Capela
  ]);

  doorVisual(THREE, R, 'W', 3.5, 14, 18, TEX.doorWood);
  doorVisual(THREE, R, 'W', -2.5, 14, 18, TEX.doorMetal);
  doorVisual(THREE, R, 'S', -3.0, 14, 18, TEX.greenhouseGlass);
  doorVisual(THREE, R, 'S', 2.5, 14, 18, TEX.doorMetal);
  doorVisual(THREE, R, 'N', -3.0, 14, 18, TEX.doorWood);
  doorVisual(THREE, R, 'E', -1.5, 14, 18, TEX.doorWood);
  doorVisual(THREE, R, 'E', 2.0, 14, 18, TEX.doorWood);
  doorVisual(THREE, R, 'E', -4.5, 14, 18, TEX.doorWood);

  plane(THREE, R.group, 3.0, 12.0, tm(THREE, TEX.carpet, 1, 6), 0.5, 0.012, 0.0, -Math.PI / 2);

  // O IMPONENTE BALCÃO EM 'U' DE RECEPÇÃO COM MÁQUINA DE ESCREVER & GALÃO DE ÁGUA
  makeReceptionCounterU(THREE, TEX, R, 0.5, 0.2);

  // Escadaria nobre em curva para o Mezanino (P2)
  const stairM = tm(THREE, TEX.wood, 1, 1);
  for (let i = 0; i < 7; i++) {
    box(THREE, R.group, 2.6, 0.28, 0.7, stairM, -7.0, 0.14 + i * 0.28, -5.5 + i * 0.4);
  }
  solid(R, -8.6, -6.5, -5.6, -3.4); // Sólido da escada recuado para deixar z = -2.8 livre

  // Elevador de Serviço na parede Norte (x = 3.5)
  box(THREE, R.group, 2.6, 3.2, 0.3, flat(THREE, 0x1c1e22), 3.5, 1.6, -6.9);
  plane(THREE, R.group, 1.8, 2.6, new THREE.MeshLambertMaterial({ map: TEX.doorMetal }), 3.5, 1.3, -6.74, 0, 0);
  const elevLampM = new THREE.MeshBasicMaterial({ color: 0x331111 });
  box(THREE, R.group, 0.5, 0.12, 0.1, elevLampM, 3.5, 3.0, -6.7);
  R.elevLampM = elevLampM;
  R.elevLight = pointLight(THREE, R, 0xaac8ff, 0, 7, 3.5, 2.6, -5.8);

  // Estátua de mármore clássica no nicho decorativo
  const marM = tm(THREE, TEX.statue, 1, 1);
  box(THREE, R.group, 1.2, 0.8, 1.2, marM, -0.5, 0.4, -5.5);
  const robe = new THREE.Mesh(new THREE.ConeGeometry(0.38, 1.2, 7), marM);
  robe.position.set(-0.5, 1.4, -5.5); R.group.add(robe);
  solid(R, -1.2, -6.2, 0.2, -4.8);

  // Lustre de ferro central
  const ch = new THREE.Mesh(new THREE.TorusGeometry(0.8, 0.08, 6, 12), flat(THREE, 0x6a5a28));
  ch.position.set(0.5, 3.5, 0.2); ch.rotation.x = Math.PI / 2; R.group.add(ch);
  const chGlow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: TEX.glowWarm, color: 0xffcc88, transparent: true, opacity: 0.5,
    blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  chGlow.scale.set(3.5, 3.5, 1); chGlow.position.set(0.5, 3.4, 0.2); R.group.add(chGlow);
  R.chandelier = pointLight(THREE, R, 0xffb060, 0, 18, 0.5, 3.2, 0.2);
  R.chGlow = chGlow;

  addCam(R, [-9, 0, -2, 7], [-3.5, 3.8, 2.2], [-6.5, 1.2, 3.5], 60);
  addCam(R, [-9, -7, -2, 0], [-3.5, 3.8, 1.0], [-6.5, 1.2, -3.0], 60);
  addCam(R, [-2, -7, 4, 7], [1.5, 4.0, -1.5], [0.5, 1.2, 2.0], 60);
  addCam(R, [4, -7, 9, 7], [4.5, 3.8, -0.5], [7.0, 1.2, 0.0], 58);

  // PORTAS SINCRONIZADAS COM O MAPA DO CADERNO (Folha P1)
  addDoor(R, -8.2, 3.5, 1.4, 'Ala de Internação (Corredor dos Quartos)', 'corredor_quartos', 6.5, 0.0, -Math.PI / 2);
  addDoor(R, -3.0, 6.2, 1.4, 'Entrar na Estufa Botânica (Ala Sul)', 'estufa', 0, -3.8, 0);
  addDoor(R, -3.0, -6.2, 1.4, 'Ir ao Cemitério das Lápides (Ala Norte)', 'cemiterio', 0, 4.5, Math.PI);
  addDoor(R, 8.2, -1.5, 1.4, 'Pátio Externo & Canil (Ala Leste)', 'jardim', -7.5, -1.0, Math.PI / 2);
  addDoor(R, -6.8, -2.8, 1.4, 'Subir ao Mezanino (2º Andar P2)', 'mezanino', 5.5, 3.0, 0);

  addDoor(R, 8.2, 2.0, 1.3, 'Ir para a Enfermaria (Ala Médica)', 'enfermaria', -6.0, 0.0, Math.PI / 2);
  addDoor(R, -8.2, -2.5, 1.3, 'Descer ao Porão das Caldeiras', 'porao', 0.0, -4.0, 0,
    { need: { item: 'basekey' }, consume: true, setFlag: 'poraoOpen', msg: 'Trancada. A placa diz "PORÃO — PROIBIDO". Precisa da CHAVE DO PORÃO.' });
  addDoor(R, 3.5, -6.2, 1.5, 'Chamar o elevador para o Terraço', 'terraco', 3.0, 1.8, Math.PI,
    { need: { flag: 'fuseOn' }, elevator: true, msg: 'elevador_off' });
  addDoor(R, 2.5, 6.2, 1.4, 'Portão para os Jardins da Floresta', 'floresta', 0, -14.0, 0,
    { need: { item: 'forest_key' }, setFlag: 'forestUnlocked', msg: 'Portão de ferro fundido trancado. Precisa da CHAVE DO PORTÃO DE FERRO.' });
  addDoor(R, 8.2, -4.5, 1.3, 'Entrar na Capela Santa Lúcia', 'capela', 0, 8.0, Math.PI);

  addInteract(R, 0.5, 1.2, 1.6, 'Usar a Máquina de Escrever da Recepção', 'save');
  addInteract(R, -0.5, -4.5, 1.5, 'Examinar a estátua de mármore', 'statue');
  addInteract(R, -2.7, 0.5, 1.3, 'Beber água do bebedouro', 'vase');
  addInteract(R, -6.8, -2.4, 1.6, 'Olhar a escadaria do mezanino', 'stairs');

  addPickup(THREE, R, TEX, 'ribbon', 0.85, 0.22, 2);
  addPickup(THREE, R, TEX, 'page', -4.0, 2.5, 1, 1, 0.06);
  addPickup(THREE, R, TEX, 'ammo9', 6.5, 4.5, 12);

  // Inimigos posicionados fora dos móveis
  addSpawn(R, 'sombra', -3.5, 3.5);
  addSpawn(R, 'infectado', -3.0, -2.5);
  addSpawn(R, 'rastejador', 4.5, -3.5);
  addSpawn(R, 'infectado', 5.0, 3.5);

  R.fx = (dt, t, game) => {
    const on = game.flags.fuseOn;
    R.chandelier.intensity += (((on ? 26 : 0)) - R.chandelier.intensity) * Math.min(1, dt * 2);
    R.chGlow.material.opacity += (((on ? 0.55 : 0.02)) - R.chGlow.material.opacity) * Math.min(1, dt * 2);
    R.elevLight.intensity += (((on ? 8 : 0)) - R.elevLight.intensity) * Math.min(1, dt * 2);
    R.elevLampM.color.setHex(on ? 0x66ff88 : 0x331111);
  };

  return R;
}

// ---------------- 5. FOLHA P1: ESTUFA BOTÂNICA ----------------
function buildEstufa(THREE, TEX) {
  const R = baseRoom(THREE, TEX, 'estufa', 'ESTUFA BOTÂNICA · ALA SUL', 14, 10, 4.2);
  R.fog = { c: 0x050c05, n: 5, f: 22 };
  R.ambient = 'floresta';

  const floorM = tm(THREE, TEX.greenhouseSoil, 4, 3);
  const wallM = tm(THREE, TEX.greenhouseGlass, 4, 2);
  plane(THREE, R.group, 14, 10, floorM, 0, 0, 0, -Math.PI / 2);

  perimeter(THREE, R, 14, 10, 4.2, wallM, [{ side: 'N', at: 0.0, w: 2.2 }]);
  doorVisual(THREE, R, 'N', 0.0, 10, 14, TEX.greenhouseGlass);

  const soilM = tm(THREE, TEX.greenhouseSoil, 2, 1);
  const brickM = flat(THREE, 0x4a2a1a);
  for (const bx of [-3.0, 3.0]) {
    box(THREE, R.group, 2.2, 0.45, 5.0, soilM, bx, 0.225, 0);
    box(THREE, R.group, 2.4, 0.5, 0.15, brickM, bx, 0.25, -2.6);
    box(THREE, R.group, 2.4, 0.5, 0.15, brickM, bx, 0.25, 2.6);
    solid(R, bx - 1.2, -2.6, bx + 1.2, 2.6);
  }

  const woodM = tm(THREE, TEX.wood, 1, 1);
  box(THREE, R.group, 3.0, 0.9, 0.8, woodM, 0, 0.45, 4.2);
  solid(R, -1.6, 3.7, 1.6, 4.7);

  pointLight(THREE, R, 0x55aa66, 6, 12, 0, 3.0, 0);

  addCam(R, [-7, -5, 0, 5], [-5.5, 3.2, -4.0], [0, 1.0, 0], 62);
  addCam(R, [0, -5, 7, 5], [5.5, 3.2, 4.0], [0, 1.0, 0], 62);

  addDoor(R, 0.0, -4.2, 1.4, 'Voltar ao Saguão Principal', 'saguao', -3.0, 5.0, Math.PI);

  addInteract(R, 0.0, 3.5, 1.4, 'Examinar a bancada de pesticidas', 'herbicide_table');
  addInteract(R, -1.5, 0.0, 1.5, 'Examinar as raízes carnívoras', 'plant_roots');

  addPickup(THREE, R, TEX, 'herbicide', 0.0, 4.2, 1, null, 0.95);
  addPickup(THREE, R, TEX, 'firstaid', 5.2, 4.0, 1);
  addSpawn(R, 'infectado', 0, 1.0);

  return R;
}

// ---------------- 6. FOLHA P1: CEMITÉRIO DAS LÁPIDES ----------------
function buildCemiterio(THREE, TEX) {
  const R = baseRoom(THREE, TEX, 'cemiterio', 'CEMITÉRIO DAS LÁPIDES · ALA NORTE', 18, 14, 12);
  R.ambient = 'floresta';
  R.fog = { c: 0x05070a, n: 6, f: 26 };
  R.openSky = true;

  const groundM = tm(THREE, TEX.forestGround, 5, 4);
  plane(THREE, R.group, 18, 14, groundM, 0, 0, 0, -Math.PI / 2);

  const wallM = tm(THREE, TEX.wallStone, 4, 1);
  box(THREE, R.group, 18.0, 2.0, 0.5, wallM, 0, 1.0, -7.0);
  box(THREE, R.group, 0.5, 2.0, 14.0, wallM, -9.0, 1.0, 0);
  box(THREE, R.group, 0.5, 2.0, 14.0, wallM, 9.0, 1.0, 0);
  solid(R, -9.2, -7.2, 9.2, -6.7);
  solid(R, -9.2, -7.0, -8.7, 7.0);
  solid(R, 8.7, -7.0, 9.2, 7.0);

  const tombM = tm(THREE, TEX.tombstone, 1, 1);
  for (let row = -1; row <= 1; row += 2) {
    for (let col = -3; col <= 3; col += 2) {
      const lx = col * 1.8;
      const lz = row * 2.8;
      box(THREE, R.group, 0.8, 1.2, 0.25, tombM, lx, 0.6, lz);
      solid(R, lx - 0.45, lz - 0.2, lx + 0.45, lz + 0.2);
    }
  }

  box(THREE, R.group, 4.0, 3.2, 3.0, wallM, 0, 1.6, -5.0);
  solid(R, -2.1, -6.6, 2.1, -3.4);

  pointLight(THREE, R, 0x334466, 6, 22, 0, 4.5, 0);

  addCam(R, [-9, -7, 0, 7], [-5.0, 3.5, 4.5], [0, 1.0, -2.0], 65);
  addCam(R, [0, -7, 9, 7], [5.0, 3.5, 4.5], [0, 1.0, -2.0], 65);

  addDoor(R, 0.0, 6.2, 1.4, 'Voltar ao Saguão Principal', 'saguao', -3.0, -5.0, 0);

  addInteract(R, 0.0, -3.2, 1.4, 'Examinar a cripta selada da família Silva', 'cripta');
  addPickup(THREE, R, TEX, 'shotgun', 0.0, -3.0, 1, null, 0.4);
  addSpawn(R, 'infectado', -3.0, 0.0);
  addSpawn(R, 'sombra', 3.0, 1.0);

  return R;
}

// ---------------- 7. FOLHA P1: PÁTIO EXTERNO & CANIL ----------------
function buildJardim(THREE, TEX) {
  const R = baseRoom(THREE, TEX, 'jardim', 'PÁTIO EXTERNO & CANIL', 18, 12, 10);
  R.ambient = 'floresta';
  R.fog = { c: 0x06080b, n: 6, f: 25 };
  R.openSky = true;

  const groundM = tm(THREE, TEX.forestGround, 5, 4);
  plane(THREE, R.group, 18, 12, groundM, 0, 0, 0, -Math.PI / 2);

  const wallM = tm(THREE, TEX.wallStone, 4, 1);
  box(THREE, R.group, 18.0, 2.0, 0.5, wallM, 0, 1.0, -6.0);
  box(THREE, R.group, 18.0, 2.0, 0.5, wallM, 0, 1.0, 6.0);
  solid(R, -9.0, -6.2, 9.0, -5.7);
  solid(R, -9.0, 5.7, 9.0, 6.2);

  // Gaiolas do Canil (Folha P1)
  const kennelM = tm(THREE, TEX.dogKennel, 1, 1);
  box(THREE, R.group, 5.0, 2.2, 2.5, kennelM, -2.0, 1.1, -4.5);
  solid(R, -4.6, -5.8, 0.6, -3.2);

  // Casinhas de madeira destruídas do canil
  const woodM = tm(THREE, TEX.wood, 1, 1);
  box(THREE, R.group, 1.2, 1.1, 1.2, woodM, -5.0, 0.55, -4.5);
  solid(R, -5.7, -5.2, -4.3, -3.8);
  box(THREE, R.group, 1.2, 1.1, 1.2, woodM, 2.0, 0.55, -4.5);
  solid(R, 1.3, -5.2, 2.7, -3.8);

  // Poste de luz do pátio
  box(THREE, R.group, 0.2, 4.0, 0.2, flat(THREE, 0x22262c), 0, 2.0, 2.0);
  box(THREE, R.group, 0.6, 0.2, 0.4, flat(THREE, 0xd8ccb0), 0, 3.9, 2.0);
  solid(R, -0.2, 1.8, 0.2, 2.2);

  // Árvores retorcidas e caçamba
  const barkM = tm(THREE, TEX.bark, 1, 2);
  box(THREE, R.group, 0.8, 6.0, 0.8, barkM, 5.0, 3.0, -4.0);
  solid(R, 4.5, -4.5, 5.5, -3.5);
  box(THREE, R.group, 0.8, 6.0, 0.8, barkM, -6.0, 3.0, 4.0);
  solid(R, -6.5, 3.5, -5.5, 4.5);

  pointLight(THREE, R, 0x4a5a7a, 5, 20, 0, 4.0, 0);

  addCam(R, [-9, -6, 0, 6], [-5.0, 3.4, 3.5], [0, 1.0, 0], 65);
  addCam(R, [0, -6, 9, 6], [5.0, 3.4, 3.5], [0, 1.0, 0], 65);

  addDoor(R, -8.2, -1.0, 1.4, 'Voltar ao Saguão Principal', 'saguao', 7.5, -1.5, -Math.PI / 2);
  addDoor(R, 8.2, 0.0, 1.4, 'Entrar na Casa do Zelador Bento', 'casa_zelador', -3.5, 0.0, Math.PI / 2);

  addInteract(R, -2.0, -3.0, 1.4, 'Vasculhar as jaulas arrebentadas do canil', 'kennel_search');
  addPickup(THREE, R, TEX, 'greenhouse_key', -2.0, -3.0, 1);
  addPickup(THREE, R, TEX, 'ammo9', 3.0, 4.0, 15);
  addSpawn(R, 'rastejador', 1.0, -1.0);
  addSpawn(R, 'infectado', 4.0, 2.0);

  return R;
}

// ---------------- 8. FOLHA P1: CASA DO ZELADOR BENTO ----------------
function buildCasaZelador(THREE, TEX) {
  const R = baseRoom(THREE, TEX, 'casa_zelador', 'CASA DO ZELADOR BENTO', 10, 8, 3.0);
  R.fog = { c: 0x05040a, n: 5, f: 18 };
  R.ambient = 'quarto';

  const floorM = tm(THREE, TEX.floorWood, 3, 2);
  const wallM = tm(THREE, TEX.wood, 4, 1.4);
  const ceilM = tm(THREE, TEX.ceiling, 3, 3);
  plane(THREE, R.group, 10, 8, floorM, 0, 0, 0, -Math.PI / 2);
  plane(THREE, R.group, 10, 8, ceilM, 0, 3.0, 0, Math.PI / 2);

  perimeter(THREE, R, 10, 8, 3.0, wallM, [{ side: 'W', at: 0.0, w: 1.8 }]);
  doorVisual(THREE, R, 'W', 0.0, 8, 10, TEX.doorWood);

  const woodD = flat(THREE, 0x221810);
  box(THREE, R.group, 3.2, 0.9, 0.9, woodD, 0, 0.45, -3.4);
  solid(R, -1.7, -3.9, 1.7, -2.8);

  box(THREE, R.group, 2.2, 1.8, 1.1, woodD, 3.5, 0.9, 2.0);
  solid(R, 2.3, 1.3, 4.7, 2.7);

  pointLight(THREE, R, 0xffa044, 5, 8, 0, 2.2, -2.5);

  addCam(R, [-5, -4, 0, 4], [-3.2, 2.4, 2.5], [0, 1.0, 0], 62);
  addCam(R, [0, -4, 5, 4], [3.2, 2.4, -2.5], [0, 1.0, 0], 62);

  addDoor(R, -4.2, 0.0, 1.4, 'Sair para o Pátio Externo', 'jardim', 7.5, 0.0, -Math.PI / 2);

  addInteract(R, 0.0, -2.8, 1.4, 'Vasculhar a bancada de trabalho de Bento', 'bento_bench');
  addInteract(R, 3.5, 1.5, 1.4, 'Olhar o beliche e a lanterna', 'bento_bed');

  addPickup(THREE, R, TEX, 'crowbar', 0.0, -3.2, 1, null, 0.95);
  addPickup(THREE, R, TEX, 'lightflask', 1.0, -2.5, 1); // Fluido crítico
  addPickup(THREE, R, TEX, 'page', 1.5, 2.0, 1, 6, 0.06);

  return R;
}

// ---------------- 9. FOLHA P2: MEZANINO (2º ANDAR) ----------------
function buildMezanino(THREE, TEX) {
  const R = baseRoom(THREE, TEX, 'mezanino', 'MEZANINO · 2º ANDAR', 16, 12, 3.8);
  R.fog = { c: 0x05050c, n: 6, f: 24 };
  R.ambient = 'saguao';

  const floorM = tm(THREE, TEX.floorWood, 5, 4);
  const wallM = tm(THREE, TEX.wallpaper, 6, 1.4);
  plane(THREE, R.group, 16, 12, floorM, 0, 0, 0, -Math.PI / 2);

  perimeter(THREE, R, 16, 12, 3.8, wallM, [
    { side: 'N', at: 0.0, w: 2.0 },  // Ala Médica / Enfermaria
    { side: 'S', at: 0.0, w: 2.0 },  // Ala das Caldeiras / Porão
    { side: 'W', at: 0.0, w: 2.0 },  // Escada para o 3º Andar
  ]);
  doorVisual(THREE, R, 'N', 0.0, 12, 16, TEX.doorWood);
  doorVisual(THREE, R, 'S', 0.0, 12, 16, TEX.doorMetal);
  doorVisual(THREE, R, 'W', 0.0, 12, 16, TEX.doorWood);

  const railM = flat(THREE, 0x1a1e24);
  box(THREE, R.group, 8.0, 1.0, 0.1, railM, 0, 0.5, -2.5);
  box(THREE, R.group, 8.0, 1.0, 0.1, railM, 0, 0.5, 2.5);
  box(THREE, R.group, 0.1, 1.0, 5.0, railM, -4.0, 0.5, 0);
  box(THREE, R.group, 0.1, 1.0, 5.0, railM, 4.0, 0.5, 0);
  solid(R, -4.1, -2.6, 4.1, 2.6);

  pointLight(THREE, R, 0x9a8060, 5, 14, 0, 2.8, 0);

  addCam(R, [-8, -6, 0, 6], [-5.0, 3.0, 3.0], [0, 1.0, 0], 65);
  addCam(R, [0, -6, 8, 6], [5.0, 3.0, -3.0], [0, 1.0, 0], 65);

  addDoor(R, 6.2, 3.0, 1.4, 'Descer ao Saguão Principal (P1)', 'saguao', -6.8, -2.2, 0);
  addDoor(R, 0.0, -5.2, 1.4, 'Entrar na Ala Médica (Enfermaria)', 'enfermaria', -6.0, 0.0, Math.PI / 2);
  addDoor(R, 0.0, 5.2, 1.4, 'Entrar na Ala das Caldeiras (Porão)', 'porao', 0.0, -4.0, 0);
  addDoor(R, -7.2, 0.0, 1.4, 'Subir ao 3º Andar (Corredor P3)', 'corredor_p3', 5.5, 0.0, -Math.PI / 2);

  addInteract(R, 0.0, -2.3, 1.4, 'Olhar o parapeito do saguão lá embaixo', 'rail_view');
  addSpawn(R, 'sombra', 4.5, 0.0);

  return R;
}

// ---------------- 10. FOLHA P2: ENFERMARIA (ALA MÉDICA) ----------------
function buildEnfermaria(THREE, TEX) {
  const R = baseRoom(THREE, TEX, 'enfermaria', 'ALA MÉDICA · ENFERMARIA', 16, 10, 3.4);
  R.fog = { c: 0x05080c, n: 6, f: 22 };
  R.ambient = 'quarto';

  const floorM = tm(THREE, TEX.wallTile, 5, 3);
  const wallM = tm(THREE, TEX.wallDirty, 6, 2);
  const ceilM = tm(THREE, TEX.ceiling, 6, 4);
  plane(THREE, R.group, 16, 10, floorM, 0, 0, 0, -Math.PI / 2);
  plane(THREE, R.group, 16, 10, ceilM, 0, 3.4, 0, Math.PI / 2);

  perimeter(THREE, R, 16, 10, 3.4, wallM, [
    { side: 'S', at: 0.0, w: 2.0 },
    { side: 'N', at: 0.0, w: 2.0 },
    { side: 'W', at: 0.0, w: 2.0 },
  ]);
  doorVisual(THREE, R, 'S', 0.0, 10, 16, TEX.doorWood);
  doorVisual(THREE, R, 'N', 0.0, 10, 16, TEX.doorWood);
  doorVisual(THREE, R, 'W', 0.0, 10, 16, TEX.doorWood);

  makeHospitalBed(THREE, TEX, R, -4.5, -2.2, 0);
  makeHospitalBed(THREE, TEX, R, -4.5, 2.2, 0);
  makeHospitalBed(THREE, TEX, R, 4.5, -2.2, Math.PI);
  makeHospitalBed(THREE, TEX, R, 4.5, 2.2, Math.PI);

  makeMedicalCabinet(THREE, TEX, R, 0.0, -4.6, 0);

  box(THREE, R.group, 1.2, 1.4, 0.2, tm(THREE, TEX.fusebox, 1, 1), 7.6, 1.6, 0, 0, -Math.PI / 2);
  solid(R, 7.3, -0.7, 7.9, 0.7);

  pointLight(THREE, R, 0x8a9abb, 5, 14, 0, 2.6, 0);

  addCam(R, [-8, -5, 0, 5], [-6.2, 2.8, 0.0], [0, 1.1, 0], 62);
  addCam(R, [0, -5, 8, 5], [6.2, 2.8, 0.0], [0, 1.1, 0], 62);

  addDoor(R, -7.2, 0.0, 1.4, 'Voltar ao Saguão Principal', 'saguao', 7.5, 2.0, -Math.PI / 2);
  addDoor(R, 0.0, 4.4, 1.4, 'Voltar ao Mezanino (2º Andar)', 'mezanino', 0, -4.2, 0);
  addDoor(R, 0.0, -4.4, 1.4, 'Entrar no Consultório do Dr. Alencastro', 'consultorio', 0, 3.5, 0,
    { need: { item: 'rustkey' }, consume: true, setFlag: 'consultOpen', msg: 'Trancada com chave enferrujada pesada.' });

  addInteract(R, 7.3, 0.0, 1.5, 'Examinar o painel elétrico de força', 'fusebox');
  addInteract(R, 0.0, -4.0, 1.4, 'Examinar o armário de medicamentos', 'cabinet');
  addInteract(R, -4.5, -1.8, 1.4, 'Inspecionar a maca ensanguentada', 'bed');

  addPickup(THREE, R, TEX, 'crank', 0.0, -4.2, 1, null, 0.85);
  addPickup(THREE, R, TEX, 'pills', 2.0, -4.0, 1);
  addPickup(THREE, R, TEX, 'page', -2.0, -3.5, 1, 2, 0.06);

  addSpawn(R, 'enfermeira', -2.0, 0.0);
  addSpawn(R, 'infectado', 2.0, 1.5);

  return R;
}

// ---------------- 11. FOLHA P2: CONSULTÓRIO DO DR. ALENCASTRO ----------------
function buildConsultorio(THREE, TEX) {
  const R = baseRoom(THREE, TEX, 'consultorio', 'CONSULTÓRIO DO DR. ALENCASTRO', 12, 10, 3.4);
  R.fog = { c: 0x070505, n: 5, f: 20 };
  R.ambient = 'quarto';

  const floorM = tm(THREE, TEX.floorWood, 4, 3);
  const wallM = tm(THREE, TEX.wallpaper, 5, 1.4);
  const ceilM = tm(THREE, TEX.ceiling, 4, 3);
  plane(THREE, R.group, 12, 10, floorM, 0, 0, 0, -Math.PI / 2);
  plane(THREE, R.group, 12, 10, ceilM, 0, 3.4, 0, Math.PI / 2);

  perimeter(THREE, R, 12, 10, 3.4, wallM, [{ side: 'S', at: 0.0, w: 2.0 }]);
  doorVisual(THREE, R, 'S', 0.0, 10, 12, TEX.doorWood);

  const woodD = flat(THREE, 0x22140e);
  box(THREE, R.group, 3.2, 0.9, 1.4, woodD, 0, 0.45, -2.5);
  solid(R, -1.8, -3.3, 1.8, -1.7);

  box(THREE, R.group, 0.8, 1.2, 0.8, flat(THREE, 0x141820), 0, 0.6, -3.8);

  box(THREE, R.group, 1.6, 1.2, 0.08, tm(THREE, TEX.negatoscope, 1, 1), -4.0, 1.8, -4.9);
  pointLight(THREE, R, 0x88ccff, 4, 6, -4.0, 1.8, -4.4);

  plane(THREE, R.group, 1.4, 1.8, new THREE.MeshLambertMaterial({ map: TEX.paint1 }), 5.94, 1.8, 0, 0, -Math.PI / 2);

  pointLight(THREE, R, 0xffaa44, 5, 9, 0, 2.2, -2.0);

  addCam(R, [-6, -5, 0, 5], [-3.8, 2.6, 3.2], [0, 1.1, -1.0], 62);
  addCam(R, [0, -5, 6, 5], [3.8, 2.6, 3.2], [0, 1.1, -1.0], 62);

  addDoor(R, 0.0, 4.4, 1.4, 'Voltar à Enfermaria', 'enfermaria', -6.0, 0.0, Math.PI / 2);

  addInteract(R, 0.0, -1.5, 1.5, 'Examinar a mesa do Dr. Alencastro', 'desk_dr');
  addInteract(R, 5.2, 0.0, 1.4, 'Examinar o quadro a óleo na parede', 'painting');
  addInteract(R, -4.0, -4.0, 1.4, 'Inspecionar os exames no negatoscópio', 'negatoscope_view');

  addPickup(THREE, R, TEX, 'fuse', 0.8, -2.4, 1, null, 0.95);
  addPickup(THREE, R, TEX, 'page', -0.8, -1.8, 1, 3, 0.06);
  addSpawn(R, 'alencastro', 0.0, 0.0);

  return R;
}

// ---------------- 12. FOLHA P2: ALA DAS CALDEIRAS (PORÃO INDUSTRIAL) ----------------
function buildPorao(THREE, TEX) {
  const R = baseRoom(THREE, TEX, 'porao', 'ALA DAS CALDEIRAS · PORÃO INDUSTRIAL', 16, 12, 3.6);
  R.fog = { c: 0x050406, n: 6, f: 22 };
  R.ambient = 'porao';
  R.music = 'creepy';

  const floorM = tm(THREE, TEX.stoneFloor, 5, 4);
  const wallM = tm(THREE, TEX.wallStone, 6, 2);
  const ceilM = tm(THREE, TEX.ceiling, 6, 5);
  plane(THREE, R.group, 16, 12, floorM, 0, 0, 0, -Math.PI / 2);
  plane(THREE, R.group, 16, 12, ceilM, 0, 3.6, 0, Math.PI / 2);

  perimeter(THREE, R, 16, 12, 3.6, wallM, [
    { side: 'N', at: 0.0, w: 2.0 },
    { side: 'S', at: 0.0, w: 2.0 },
    { side: 'E', at: 0.0, w: 2.0 },
  ]);
  doorVisual(THREE, R, 'N', 0.0, 12, 16, TEX.doorMetal);
  doorVisual(THREE, R, 'S', 0.0, 12, 16, TEX.doorMetal);
  doorVisual(THREE, R, 'E', 0.0, 12, 16, TEX.doorMetal);

  makeIndustrialBoiler(THREE, TEX, R, -4.5, -2.2);
  makeIndustrialBoiler(THREE, TEX, R, 4.5, -2.2);

  const waterMesh = plane(THREE, R.group, 16, 12, tm(THREE, TEX.water, 4, 3, 0x446655), 0, 0.35, 0, -Math.PI / 2);
  R.waterMesh = waterMesh;
  solid(R, -7.5, -5.5, 7.5, 5.5, 'water');

  pointLight(THREE, R, 0xff6633, 5, 12, -4.5, 2.2, -1.5);
  pointLight(THREE, R, 0x336688, 4, 12, 0, 2.5, 2.0);

  addCam(R, [-8, -6, 0, 6], [-5.8, 3.0, 3.5], [0, 1.0, 0], 62);
  addCam(R, [0, -6, 8, 6], [5.8, 3.0, 3.5], [0, 1.0, 0], 62);

  addDoor(R, 7.2, 0.0, 1.4, 'Subir ao Saguão Principal', 'saguao', -7.5, -2.5, Math.PI / 2);
  addDoor(R, 0.0, -5.4, 1.4, 'Voltar ao Mezanino (2º Andar)', 'mezanino', 0, 4.2, Math.PI);
  addDoor(R, 0.0, 5.4, 1.4, 'Descer ao Subsolo Secreto', 'subsolo_corredor', 0.0, -3.2, 0);

  addInteract(R, -3.8, -1.8, 1.5, 'Girar a grande válvula vermelha de drenagem', 'valve');
  addInteract(R, 3.5, 2.0, 1.4, 'Examinar o engradado de madeira boiando', 'crates');

  addPickup(THREE, R, TEX, 'launcher', 5.5, 3.5, 1);
  addPickup(THREE, R, TEX, 'page', 2.5, 3.5, 1, 4, 0.06);
  addSpawn(R, 'carrasco', 2.0, 0.0);
  addSpawn(R, 'aberracao', -2.0, 1.0);

  return R;
}

// ---------------- 13. FOLHA P3: CORREDOR DO 3º ANDAR ----------------
function buildCorredorP3(THREE, TEX) {
  const R = baseRoom(THREE, TEX, 'corredor_p3', 'CORREDOR DA DIRETORIA · 3º ANDAR', 14, 8, 3.2);
  R.fog = { c: 0x05040a, n: 5, f: 20 };
  R.ambient = 'quarto';

  const floorM = tm(THREE, TEX.floorWood, 4, 2);
  const wallM = tm(THREE, TEX.wallpaper, 5, 1.4);
  const ceilM = tm(THREE, TEX.ceiling, 4, 3);
  plane(THREE, R.group, 14, 8, floorM, 0, 0, 0, -Math.PI / 2);
  plane(THREE, R.group, 14, 8, ceilM, 0, 3.2, 0, Math.PI / 2);

  perimeter(THREE, R, 14, 8, 3.2, wallM, [
    { side: 'S', at: -4.0, w: 2.0 }, // Mezanino P2
    { side: 'N', at: 0.0, w: 2.0 },  // Sala do Dr. P3
    { side: 'E', at: 0.0, w: 2.0 },  // Terraço
  ]);
  doorVisual(THREE, R, 'S', -4.0, 8, 14, TEX.doorWood);
  doorVisual(THREE, R, 'N', 0.0, 8, 14, TEX.doorWood);
  doorVisual(THREE, R, 'E', 0.0, 8, 14, TEX.doorMetal);

  plane(THREE, R.group, 11, 2.2, tm(THREE, TEX.carpet, 4, 1), 0, 0.012, 0, -Math.PI / 2);

  pointLight(THREE, R, 0xc8a044, 5, 10, 0, 2.4, 0);

  addCam(R, [-7, -4, 0, 4], [-4.5, 2.6, 2.8], [0, 1.1, 0], 65);
  addCam(R, [0, -4, 7, 4], [4.5, 2.6, 2.8], [0, 1.1, 0], 65);

  addDoor(R, -4.0, 3.4, 1.4, 'Descer ao Mezanino (2º Andar P2)', 'mezanino', -6.0, 0.0, Math.PI / 2);
  addDoor(R, 0.0, -3.4, 1.4, 'Entrar na Sala da Diretoria', 'sala_dr_p3', 0, 2.8, 0);
  addDoor(R, 6.4, 0.0, 1.4, 'Subir ao Terraço do Heliponto', 'terraco', -3.0, 3.0, -Math.PI / 2);

  addPickup(THREE, R, TEX, 'ammo9', 3.0, -2.8, 15);
  addPickup(THREE, R, TEX, 'page', 1.5, 2.0, 1, 5, 0.06);
  addSpawn(R, 'sombra', 2.0, 0.0);

  return R;
}

// ---------------- 14. FOLHA P3: SALA DA DIRETORIA P3 ----------------
function buildSalaDrP3(THREE, TEX) {
  const R = baseRoom(THREE, TEX, 'sala_dr_p3', 'SALA DA DIRETORIA EXECUTIVA · 3º ANDAR', 10, 8, 3.2);
  R.fog = { c: 0x050409, n: 5, f: 18 };
  R.ambient = 'quarto';

  const floorM = tm(THREE, TEX.floorWood, 3, 2);
  const wallM = tm(THREE, TEX.wallpaper, 4, 1.4);
  const ceilM = tm(THREE, TEX.ceiling, 3, 3);
  plane(THREE, R.group, 10, 8, floorM, 0, 0, 0, -Math.PI / 2);
  plane(THREE, R.group, 10, 8, ceilM, 0, 3.2, 0, Math.PI / 2);

  perimeter(THREE, R, 10, 8, 3.2, wallM, [{ side: 'S', at: 0.0, w: 2.0 }]);
  doorVisual(THREE, R, 'S', 0.0, 8, 10, TEX.doorWood);

  const woodD = flat(THREE, 0x1f140e);
  box(THREE, R.group, 2.8, 0.9, 1.3, woodD, 0, 0.45, -2.4);
  solid(R, -1.6, -3.2, 1.6, -1.6);

  box(THREE, R.group, 0.8, 1.8, 2.4, flat(THREE, 0x4a2a1a), 4.4, 0.9, 0);
  solid(R, 3.8, -1.4, 4.8, 1.4);

  pointLight(THREE, R, 0xffa044, 5, 8, 0, 2.2, -1.5);

  addCam(R, [-5, -4, 0, 4], [-3.2, 2.6, 2.6], [0, 1.1, 0], 62);
  addCam(R, [0, -4, 5, 4], [3.2, 2.6, 2.6], [0, 1.1, 0], 62);

  addDoor(R, 0.0, 3.4, 1.4, 'Voltar ao Corredor P3', 'corredor_p3', 0, -2.5, Math.PI);

  addInteract(R, 0.0, -1.5, 1.4, 'Vasculhar a mesa e o cofre executivo', 'director_safe');
  addInteract(R, 3.8, 0.0, 1.4, 'Olhar a lareira e a pasta de couro', 'fireplace');

  addPickup(THREE, R, TEX, 'terrace_key', 0.0, -2.2, 1, null, 0.95);
  addPickup(THREE, R, TEX, 'firstaid', 3.5, 2.0, 1);

  return R;
}

// ---------------- 15. FOLHA P3: TERRAÇO DO HELIPONTO ----------------
function buildTerraco(THREE, TEX) {
  const R = baseRoom(THREE, TEX, 'terraco', 'TERRAÇO · ARENA DO HELIPONTO', 18, 16, 12);
  R.ambient = 'terraco';
  R.music = 'boss';
  R.openSky = true;
  R.fog = { c: 0x07090f, n: 6, f: 32 };

  const floorM = tm(THREE, TEX.heliPad, 1, 1);
  plane(THREE, R.group, 18, 16, floorM, 0, 0, 0, -Math.PI / 2);

  const wallM = tm(THREE, TEX.wallDirty, 4, 1);
  box(THREE, R.group, 18.0, 1.2, 0.5, wallM, 0, 0.6, -8.0);
  box(THREE, R.group, 18.0, 1.2, 0.5, wallM, 0, 0.6, 8.0);
  box(THREE, R.group, 0.5, 1.2, 16.0, wallM, -9.0, 0.6, 0);
  box(THREE, R.group, 0.5, 1.2, 16.0, wallM, 9.0, 0.6, 0);
  solid(R, -9.2, -8.2, 9.2, -7.7);
  solid(R, -9.2, 7.7, 9.2, 8.2);
  solid(R, -9.2, -8.0, -8.7, 8.0);
  solid(R, 8.7, -8.0, 9.2, 8.0);

  const altarM = tm(THREE, TEX.altar, 1, 1);
  box(THREE, R.group, 1.8, 1.1, 1.8, altarM, 0, 0.55, 0);
  solid(R, -1.0, -1.0, 1.0, 1.0);

  const colors = [0x55aaff, 0xff5555, 0x55ff77, 0xffdd44];
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    const gem = box(THREE, R.group, 0.18, 0.18, 0.18, flat(THREE, colors[i]), Math.cos(a) * 0.7, 1.25, Math.sin(a) * 0.7);
    gem.visible = false;
    R.memorialGems.push(gem);
  }

  // Portal de luz final libertador
  const portal = new THREE.Group();
  portal.position.set(0, 1.8, -4.0);
  const pglow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: TEX.glowWarm, color: 0xfff2cc, transparent: true, opacity: 0.8,
    blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  pglow.scale.set(4, 4, 1);
  portal.add(pglow);
  portal.visible = false;
  R.group.add(portal);
  R.portal = portal;
  R.portalLight = pointLight(THREE, R, 0xfff2cc, 0, 14, 0, 1.8, -4.0);
  R.memorialLight = pointLight(THREE, R, 0x88bbff, 2, 10, 0, 1.5, 0);

  pointLight(THREE, R, 0x4a6a9a, 6, 24, 0, 6.0, 0);

  const RN = 600;
  const rpos = new Float32Array(RN * 3);
  for (let i = 0; i < RN; i++) {
    rpos[i * 3] = (Math.random() - 0.5) * 18;
    rpos[i * 3 + 1] = Math.random() * 10;
    rpos[i * 3 + 2] = (Math.random() - 0.5) * 16;
  }
  const rgeo = new THREE.BufferGeometry();
  rgeo.setAttribute('position', new THREE.BufferAttribute(rpos, 3));
  const rain = new THREE.Points(rgeo, new THREE.PointsMaterial({ color: 0x88bbff, size: 0.12, transparent: true, opacity: 0.75 }));
  R.group.add(rain);
  R.rain = rain;

  addCam(R, [-9, -8, 0, 8], [-6.0, 4.5, 5.0], [0, 1.0, 0], 65);
  addCam(R, [0, -8, 9, 8], [6.0, 4.5, -5.0], [0, 1.0, 0], 65);

  addDoor(R, 0.0, 7.2, 1.5, 'Descer pelo Elevador ao Saguão', 'saguao', 3.5, -4.5, 0);

  addInteract(R, 0.0, 0.0, 1.8, 'Colocar os Fragmentos de Memória no Memorial', 'memorial');

  addPickup(THREE, R, TEX, 'grenade_rounds', -5.0, 4.0, 6);
  addPickup(THREE, R, TEX, 'firstaid', 5.0, 4.0, 1);
  addPickup(THREE, R, TEX, 'page', -3.0, 3.0, 1, 7, 0.06);

  R.fx = (dt, t, game) => {
    if (R.rain) {
      const pos = R.rain.geometry.attributes.position.array;
      for (let i = 1; i < pos.length; i += 3) {
        pos[i] -= dt * 16;
        if (pos[i] < 0) pos[i] = 10;
      }
      R.rain.geometry.attributes.position.needsUpdate = true;
    }
    if (game && R.portal) {
      R.portal.visible = !!game.flags.bossDead;
      if (R.portal.visible) {
        R.portal.rotation.z += dt * 0.8;
        if (R.portalLight) R.portalLight.intensity = 22 + Math.sin(t * 5) * 6;
      }
    }
  };

  return R;
}

// ---------------- 16. FOLHA EXTRAS: CORREDOR DO SUBSOLO SECRETO ----------------
function buildSubsoloCorredor(THREE, TEX) {
  const R = baseRoom(THREE, TEX, 'subsolo_corredor', 'SUBSOLO SECRETO · MASMORRA', 14, 10, 3.2);
  R.fog = { c: 0x050307, n: 5, f: 20 };
  R.ambient = 'porao';

  const floorM = tm(THREE, TEX.stoneFloor, 4, 3);
  const wallM = tm(THREE, TEX.wallStone, 5, 2);
  const ceilM = tm(THREE, TEX.ceiling, 4, 3);
  plane(THREE, R.group, 14, 10, floorM, 0, 0, 0, -Math.PI / 2);
  plane(THREE, R.group, 14, 10, ceilM, 0, 3.2, 0, Math.PI / 2);

  perimeter(THREE, R, 14, 10, 3.2, wallM, [
    { side: 'N', at: 0.0, w: 2.0 },  // Ala das Caldeiras / Porão
    { side: 'W', at: 0.0, w: 2.0 },  // Santuário do Culto
    { side: 'E', at: 0.0, w: 2.0 },  // Sala de Experimentos
  ]);
  doorVisual(THREE, R, 'N', 0.0, 10, 14, TEX.doorMetal);
  doorVisual(THREE, R, 'W', 0.0, 10, 14, TEX.doorWood);
  doorVisual(THREE, R, 'E', 0.0, 10, 14, TEX.doorMetal);

  pointLight(THREE, R, 0xff8833, 5, 10, -4.0, 2.0, 0, { amp: 1.5, speed: 10 });
  pointLight(THREE, R, 0xff8833, 5, 10, 4.0, 2.0, 0, { amp: 1.5, speed: 10 });

  addCam(R, [-7, -5, 0, 5], [-4.5, 2.6, 3.0], [0, 1.1, 0], 65);
  addCam(R, [0, -5, 7, 5], [4.5, 2.6, -3.0], [0, 1.1, 0], 65);

  addDoor(R, 0.0, -4.4, 1.4, 'Subir à Ala das Caldeiras (Porão)', 'porao', 0, 4.0, Math.PI);
  addDoor(R, -6.4, 0.0, 1.4, 'Entrar no Santuário do Culto', 'culto', 4.5, 0.0, -Math.PI / 2);
  addDoor(R, 6.4, 0.0, 1.4, 'Entrar na Sala de Experimentos', 'experimentos', -4.5, 0.0, Math.PI / 2);

  addSpawn(R, 'rastejador', 0.0, 1.0);

  return R;
}

// ---------------- 17. FOLHA EXTRAS: SANTUÁRIO DO CULTO ----------------
function buildCulto(THREE, TEX) {
  const R = baseRoom(THREE, TEX, 'culto', 'SANTUÁRIO DO CULTO ARCANO', 12, 12, 3.6);
  R.fog = { c: 0x08020a, n: 5, f: 20 };
  R.ambient = 'porao';

  const floorM = tm(THREE, TEX.stoneFloor, 4, 4);
  const wallM = tm(THREE, TEX.wallStone, 5, 2);
  const ceilM = tm(THREE, TEX.ceiling, 4, 4);
  plane(THREE, R.group, 12, 12, floorM, 0, 0, 0, -Math.PI / 2);
  plane(THREE, R.group, 12, 12, ceilM, 0, 3.6, 0, Math.PI / 2);

  perimeter(THREE, R, 12, 12, 3.6, wallM, [{ side: 'E', at: 0.0, w: 2.0 }]);
  doorVisual(THREE, R, 'E', 0.0, 12, 12, TEX.doorWood);

  // Altar Sacrificial com base de 1.6 x 1.6
  const altarM = tm(THREE, TEX.cultAltar, 1, 1);
  box(THREE, R.group, 1.6, 1.1, 1.6, altarM, 0, 0.55, 0);
  solid(R, -0.85, -0.85, 0.85, 0.85);

  // 4 Pilares de tochas nos cantos
  for (const [px, pz] of [[-4.0, -4.0], [4.0, -4.0], [-4.0, 4.0], [4.0, 4.0]]) {
    box(THREE, R.group, 0.6, 2.5, 0.6, wallM, px, 1.25, pz);
    solid(R, px - 0.35, pz - 0.35, px + 0.35, pz + 0.35);
  }

  pointLight(THREE, R, 0xaa33ff, 6, 12, 0, 2.2, 0, { amp: 2.0, speed: 8 });

  addCam(R, [-6, -6, 0, 6], [-4.0, 2.8, 3.5], [0, 1.1, 0], 65);
  addCam(R, [0, -6, 6, 6], [4.0, 2.8, -3.5], [0, 1.1, 0], 65);

  addDoor(R, 5.4, 0.0, 1.4, 'Voltar ao Corredor do Subsolo', 'subsolo_corredor', -5.5, 0.0, Math.PI / 2);

  addInteract(R, 0.0, 1.3, 1.5, 'Examinar o altar do culto e os símbolos profanos', 'cult_altar');
  addPickup(THREE, R, TEX, 'cult_symbol', 0.0, 1.1, 1, null, 1.1); // Na borda do altar para ser alcançável
  addSpawn(R, 'carrasco', 0.0, -3.0);

  return R;
}

// ---------------- 18. FOLHA EXTRAS: SALA DE EXPERIMENTOS ----------------
function buildExperimentos(THREE, TEX) {
  const R = baseRoom(THREE, TEX, 'experimentos', 'SALA DE EXPERIMENTOS COM COBAIAS', 12, 10, 3.4);
  R.fog = { c: 0x05080c, n: 5, f: 20 };
  R.ambient = 'porao';

  const floorM = tm(THREE, TEX.wallTile, 4, 3);
  const wallM = tm(THREE, TEX.wallDirty, 5, 2);
  const ceilM = tm(THREE, TEX.ceiling, 4, 3);
  plane(THREE, R.group, 12, 10, floorM, 0, 0, 0, -Math.PI / 2);
  plane(THREE, R.group, 12, 10, ceilM, 0, 3.4, 0, Math.PI / 2);

  perimeter(THREE, R, 12, 10, 3.4, wallM, [{ side: 'W', at: 0.0, w: 2.0 }]);
  doorVisual(THREE, R, 'W', 0.0, 10, 12, TEX.doorMetal);

  const tableM = tm(THREE, TEX.examTable, 1, 1);
  box(THREE, R.group, 2.2, 0.9, 1.1, tableM, 0, 0.45, 0);
  solid(R, -1.2, -0.7, 1.2, 0.7);

  pointLight(THREE, R, 0x88ccff, 6, 8, 0, 2.8, 0);

  addCam(R, [-6, -5, 0, 5], [-3.8, 2.6, 2.8], [0, 1.0, 0], 62);
  addCam(R, [0, -5, 6, 5], [3.8, 2.6, -2.8], [0, 1.0, 0], 62);

  addDoor(R, -5.4, 0.0, 1.4, 'Voltar ao Corredor do Subsolo', 'subsolo_corredor', 5.5, 0.0, -Math.PI / 2);

  addInteract(R, 0.0, 1.0, 1.4, 'Examinar a maca cirúrgica com correias de couro', 'exam_table');
  addInteract(R, 3.5, -2.0, 1.3, 'Inspecionar os frascos com cérebros em formol', 'exam_sink');

  addPickup(THREE, R, TEX, 'alencastro_dossier', 0.0, 0.0, 1, null, 0.95);
  addPickup(THREE, R, TEX, 'antidote', 3.5, -3.0, 1);
  addSpawn(R, 'enfermeira', 2.0, 1.5);

  return R;
}

// ---------------- 19. FLORESTA DOS LAMENTOS (CAMPANHA) ----------------
function buildFloresta(THREE, TEX) {
  const R = baseRoom(THREE, TEX, 'floresta', 'FLORESTA DOS LAMENTOS', 22, 34, 14);
  R.fog = { c: 0x040608, n: 6, f: 28 };
  R.ambient = 'floresta';
  R.openSky = true;

  const groundM = tm(THREE, TEX.forestGround, 6, 8);
  plane(THREE, R.group, 22, 34, groundM, 0, 0, 0, -Math.PI / 2);

  pointLight(THREE, R, 0x334466, 6, 32, 0, 8.0, 0);

  const barkM = tm(THREE, TEX.bark, 1, 2);
  for (let i = -8; i <= 8; i += 4) {
    box(THREE, R.group, 0.8, 7.0, 0.8, barkM, i, 3.5, -10 + (Math.abs(i) % 3) * 4);
    solid(R, i - 0.5, -10 + (Math.abs(i) % 3) * 4 - 0.5, i + 0.5, -10 + (Math.abs(i) % 3) * 4 + 0.5);
  }
  for (let j = -6; j <= 6; j += 4) {
    box(THREE, R.group, 0.8, 7.0, 0.8, barkM, j, 3.5, 6 + (Math.abs(j) % 3) * 3);
    solid(R, j - 0.5, 6 + (Math.abs(j) % 3) * 3 - 0.5, j + 0.5, 6 + (Math.abs(j) % 3) * 3 + 0.5);
  }

  addCam(R, [-11, -17, 11, -5], [0, 4.5, -12], [0, 1.2, 0], 65);
  addCam(R, [-11, -5, 11, 7], [0, 4.5, 0], [0, 1.2, 8], 65);
  addCam(R, [-11, 7, 11, 17], [0, 4.5, 12], [0, 1.2, 16], 65);

  addDoor(R, 0, -15.5, 1.6, 'Voltar ao Portão do Saguão', 'saguao', 2.5, 5.0, Math.PI);
  addDoor(R, 0, 15.5, 1.6, 'Entrar na Capela Santa Lúcia', 'capela', 0.0, 8.2, 0);

  addInteract(R, 0, 0, 1.5, 'Olhar o monólito sombrio no meio da mata', 'monolith');

  addPickup(THREE, R, TEX, 'forest_key', 4.0, 2.0, 1);
  addPickup(THREE, R, TEX, 'ammo9', -4.0, -5.0, 15);
  addSpawn(R, 'sombra', 0, 3.0);
  addSpawn(R, 'infectado', -3.0, 8.0);

  return R;
}

// ---------------- 20. CAPELA SANTA LÚCIA (CAMPANHA) ----------------
function buildCapela(THREE, TEX) {
  const R = baseRoom(THREE, TEX, 'capela', 'CAPELA SANTA LÚCIA', 14, 22, 6.0);
  R.fog = { c: 0x050409, n: 6, f: 26 };
  R.ambient = 'quarto';

  const floorM = tm(THREE, TEX.floorWood, 4, 6);
  const wallM = tm(THREE, TEX.wallStone, 5, 3);
  const ceilM = tm(THREE, TEX.ceiling, 4, 6);
  plane(THREE, R.group, 14, 22, floorM, 0, 0, 0, -Math.PI / 2);
  plane(THREE, R.group, 14, 22, ceilM, 0, 6.0, 0, Math.PI / 2);

  perimeter(THREE, R, 14, 22, 6.0, wallM, [
    { side: 'S', at: 0.0, w: 2.2 },
    { side: 'N', at: 0.0, w: 2.2 },
  ]);
  doorVisual(THREE, R, 'S', 0.0, 22, 14, TEX.doorWood);
  doorVisual(THREE, R, 'N', 0.0, 22, 14, TEX.doorWood);

  const altarM = tm(THREE, TEX.altar, 1, 1);
  box(THREE, R.group, 3.5, 1.2, 1.6, altarM, 0, 0.6, -8.5);
  solid(R, -1.9, -9.5, 1.9, -7.5);

  const pewM = tm(THREE, TEX.pewWood, 1, 1);
  for (let z = -4; z <= 4; z += 2.5) {
    box(THREE, R.group, 3.2, 0.85, 0.6, pewM, -2.8, 0.425, z);
    box(THREE, R.group, 3.2, 0.85, 0.6, pewM, 2.8, 0.425, z);
    solid(R, -4.5, z - 0.35, -1.1, z + 0.35);
    solid(R, 1.1, z - 0.35, 4.5, z + 0.35);
  }

  pointLight(THREE, R, 0xc8a044, 6, 16, 0, 3.5, -4.0);

  addCam(R, [-7, -11, 7, -3], [0, 3.8, -4], [0, 1.2, -8.5], 62);
  addCam(R, [-7, -3, 7, 5], [0, 3.8, 3], [0, 1.2, -2], 62);
  addCam(R, [-7, 5, 7, 11], [0, 3.8, 9], [0, 1.2, 2], 62);

  addDoor(R, 0, 9.8, 1.5, 'Voltar à Floresta dos Lamentos', 'floresta', 0, 14.0, Math.PI);
  addDoor(R, 0, -9.8, 1.5, 'Voltar ao Saguão Principal', 'saguao', 7.0, -4.5, -Math.PI / 2);

  addInteract(R, 0, -7.5, 1.5, 'Examinar o crucifixo do altar', 'altar_capela');

  addPickup(THREE, R, TEX, 'antidote', -2.0, -8.5, 1);
  addPickup(THREE, R, TEX, 'grenade_rounds', 2.0, -8.5, 4);
  addSpawn(R, 'carrasco', 0, 0);

  return R;
}

// ---------------- 21. DIORAMA DO TÍTULO (FACHADA EXTERNA 3D) ----------------
function buildTitleDiorama(THREE, TEX) {
  const R = baseRoom(THREE, TEX, 'title_diorama', 'SANATÓRIO SANTA LÚCIA (1997)', 24, 20, 12);
  R.ambient = 'floresta';
  R.openSky = true;

  const groundM = tm(THREE, TEX.forestGround, 6, 5);
  plane(THREE, R.group, 24, 20, groundM, 0, 0, 0, -Math.PI / 2);

  const wallM = tm(THREE, TEX.wallStone, 4, 1);
  box(THREE, R.group, 22.0, 1.4, 0.4, wallM, 0, 0.7, 7.5);
  box(THREE, R.group, 0.4, 1.4, 18.0, wallM, 10.5, 0.7, -1.0);
  box(THREE, R.group, 0.4, 1.4, 18.0, wallM, -10.5, 0.7, -1.0);

  const stoneM = tm(THREE, TEX.stoneFloor, 3, 2);
  box(THREE, R.group, 5.5, 0.2, 4.0, stoneM, -1.5, 0.1, 3.5);
  box(THREE, R.group, 4.0, 0.2, 2.0, stoneM, -1.5, 0.25, 4.0);

  const mansionM = tm(THREE, TEX.wallStone, 2, 2);
  box(THREE, R.group, 8.5, 5.2, 6.5, mansionM, -1.5, 2.6, -1.5);

  box(THREE, R.group, 3.4, 9.0, 3.4, mansionM, -6.0, 4.5, 0.0);
  const towerRoof = new THREE.Mesh(new THREE.ConeGeometry(2.6, 3.5, 4), flat(THREE, 0x1a1e24));
  towerRoof.position.set(-6.0, 10.75, 0.0);
  towerRoof.rotation.y = Math.PI / 4;
  R.group.add(towerRoof);

  const roofL = box(THREE, R.group, 8.8, 0.18, 4.2, flat(THREE, 0x22262e), -1.5, 6.0, -2.8);
  roofL.rotation.x = 0.52;
  const roofR = box(THREE, R.group, 8.8, 0.18, 4.2, flat(THREE, 0x22262e), -1.5, 6.0, -0.2);
  roofR.rotation.x = -0.52;

  box(THREE, R.group, 2.4, 3.2, 0.35, flat(THREE, 0x161820), -1.5, 1.6, 1.8);
  plane(THREE, R.group, 1.9, 2.7, new THREE.MeshLambertMaterial({ map: TEX.doorWood }), -1.5, 1.5, 1.99, 0, 0);

  const winGlowM = new THREE.MeshBasicMaterial({ color: 0xffbb44 });
  plane(THREE, R.group, 1.1, 1.8, winGlowM, -6.0, 6.8, 1.72, 0, 0);
  box(THREE, R.group, 1.3, 2.0, 0.1, flat(THREE, 0x1a1c22), -6.0, 6.8, 1.68);
  plane(THREE, R.group, 1.2, 1.7, winGlowM, 0.5, 3.8, 1.77, 0, 0);
  plane(THREE, R.group, 1.2, 1.7, winGlowM, -3.5, 3.8, 1.77, 0, 0);

  pointLight(THREE, R, 0xffaa33, 8, 14, -1.5, 2.2, 3.0);
  pointLight(THREE, R, 0xffcc55, 6, 10, -6.0, 6.8, 2.5);

  const RN = 600;
  const rpos = new Float32Array(RN * 3);
  for (let i = 0; i < RN; i++) {
    rpos[i * 3] = (Math.random() - 0.5) * 22;
    rpos[i * 3 + 1] = 0.5 + Math.random() * 12.0;
    rpos[i * 3 + 2] = -5.0 + Math.random() * 15.0;
  }
  const rgeo = new THREE.BufferGeometry();
  rgeo.setAttribute('position', new THREE.BufferAttribute(rpos, 3));
  const rain = new THREE.Points(rgeo, new THREE.PointsMaterial({ color: 0x88bbff, size: 0.12, transparent: true, opacity: 0.8 }));
  R.group.add(rain);
  R.rain = rain;

  const stormLight = new THREE.DirectionalLight(0x7799ee, 0.35);
  stormLight.position.set(5, 12, 10);
  R.group.add(stormLight);
  R.stormLight = stormLight;

  pointLight(THREE, R, 0x223355, 8, 30, 0, 7.0, 5.0);

  solid(R, -11, 7.2, 11, 7.8);
  solid(R, -11, -9.0, 11, -8.2);
  solid(R, -11.2, -9.0, -10.5, 8.0);
  solid(R, 10.5, -9.0, 11.2, 8.0);
  solid(R, -8, -5, 5, 2);

  addDoor(R, -1.5, 2.5, 1.5, 'Entrar no Sanatório', 'saguao', 0.0, 4.8, 0);

  addCam(R, [-12, -10, 12, 10], [4.2, 4.5, 8.8], [-2.0, 2.4, -0.5], 54);

  let lightningTimer = 3.5;
  R.fx = (dt, t, game) => {
    if (R.rain) {
      const pos = R.rain.geometry.attributes.position.array;
      for (let i = 1; i < pos.length; i += 3) {
        pos[i] -= dt * 18.0;
        if (pos[i] < 0.2) pos[i] = 12.0;
      }
      R.rain.geometry.attributes.position.needsUpdate = true;
    }
    lightningTimer -= dt;
    if (lightningTimer <= 0) {
      lightningTimer = 4.5 + Math.random() * 6.0;
      if (R.stormLight) {
        R.stormLight.intensity = 4.0;
        setTimeout(() => { if (R.stormLight) R.stormLight.intensity = 0.5; }, 70);
        setTimeout(() => { if (R.stormLight) R.stormLight.intensity = 4.5; }, 140);
        setTimeout(() => { if (R.stormLight) R.stormLight.intensity = 0.35; }, 280);
      }
      if (game && game.flashBoost !== undefined) game.flashBoost = 0.5;
      if (game && game.audio) game.audio.sfx('thunder');
    }
  };

  return R;
}

// ==================== DICIONÁRIO DE SALAS ====================
const BUILDERS = {
  quarto: buildQuarto,
  corredor_quartos: buildCorredorQuartos,
  quarto2: buildQuarto2,
  saguao: buildSaguao,
  estufa: buildEstufa,
  cemiterio: buildCemiterio,
  jardim: buildJardim,
  casa_zelador: buildCasaZelador,
  mezanino: buildMezanino,
  enfermaria: buildEnfermaria,
  consultorio: buildConsultorio,
  porao: buildPorao,
  corredor_p3: buildCorredorP3,
  sala_dr_p3: buildSalaDrP3,
  terraco: buildTerraco,
  subsolo_corredor: buildSubsoloCorredor,
  culto: buildCulto,
  experimentos: buildExperimentos,
  floresta: buildFloresta,
  capela: buildCapela,
  title_diorama: buildTitleDiorama,
};

export function buildRoom(THREE, TEX, id) {
  const b = BUILDERS[id];
  if (!b) throw new Error('Sala desconhecida: ' + id);
  return b(THREE, TEX);
}

export const ROOM_IDS = Object.keys(BUILDERS);
