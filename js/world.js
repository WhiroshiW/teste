// ============================================================
// SANTA LÚCIA - Equipe Nakamura - Mundo 3D Remasterizado
// Cenários arquitetônicos fiéis às 4 folhas de projeto do caderno:
// P1 (Térreo & Externos), P2 (2º Andar & Caldeiras),
// P3 (3º Andar & Terraço Heliponto) e Extras (Subsolo & Culto).
// Modelos 3D autênticos estilo PS1 (Resident Evil / Silent Hill).
// ============================================================
import { pointInSolids } from './entities.js?v=1924_1997_v94';

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
  l.layers.enable(1); l.layers.enable(2); // luz ilumina as camadas das armas
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
    box(THREE, g, 0.16, 2.5, 0.45, fm, at - 0.92, 1.25, z);
    box(THREE, g, 0.16, 2.5, 0.45, fm, at + 0.92, 1.25, z);
    box(THREE, g, 2.0, 0.16, 0.45, fm, at, 2.5, z);
    plane(THREE, g, 1.84, 2.5, dm, at, 1.25, z + face, 0, side === 'N' ? 0 : Math.PI);
    box(THREE, g, 0.08, 0.12, 0.14, brassM, at + (side === 'N' ? 0.6 : -0.6), 1.05, z + face * 1.1);
  } else {
    const x = side === 'W' ? -w / 2 : w / 2;
    const face = side === 'W' ? 0.26 : -0.26;
    box(THREE, g, 0.45, 2.5, 0.16, fm, x, 1.25, at - 0.92);
    box(THREE, g, 0.45, 2.5, 0.16, fm, x, 1.25, at + 0.92);
    box(THREE, g, 0.45, 0.16, 2.0, fm, x, 2.5, at);
    plane(THREE, g, 1.84, 2.5, dm, x + face, 1.25, at, 0, side === 'W' ? Math.PI / 2 : -Math.PI / 2);
    box(THREE, g, 0.14, 0.12, 0.08, brassM, x + face * 1.1, 1.05, at + (side === 'W' ? -0.6 : 0.6));
  }
}

// ==================== MODELOS 3D AUTÊNTICOS DO SANATÓRIO ====================

// 1. Maca Hospitalar Psiquiátrica Clássica
// ---------- CAMA NORMAL (madeira + manta xadrez) — quartos residenciais ----------
function makeNormalBed(THREE, TEX, room, x, z, ry = 0) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.rotation.y = ry;
  room.group.add(g);
  const woodM = tm(THREE, TEX.woodFurn, 1, 1);
  const woodDark = flat(THREE, 0x3a2614);
  const mattM = tm(THREE, TEX.mattress, 1, 1);
  const sheetM = tm(THREE, TEX.sheet, 1, 1);
  const spreadM = tm(THREE, TEX.bedspread, 1, 1);

  // pés torneados + laterais (comprimento no eixo X, cabeceira no -X)
  for (const [px, pz] of [[-0.95, -0.42], [0.95, -0.42], [-0.95, 0.42], [0.95, 0.42]]) {
    box(THREE, g, 0.1, 0.42, 0.1, woodDark, px, 0.21, pz);
  }
  box(THREE, g, 2.0, 0.14, 0.07, woodM, 0, 0.42, -0.46);
  box(THREE, g, 2.0, 0.14, 0.07, woodM, 0, 0.42, 0.46);
  // cabeceira (x=-1) com topo arredondado fake + painel dos pés (x=+1)
  box(THREE, g, 0.09, 0.85, 1.15, woodM, -1.0, 0.7, 0);
  box(THREE, g, 0.09, 0.2, 0.9, woodM, -1.0, 1.2, 0);
  box(THREE, g, 0.09, 0.55, 1.15, woodM, 1.0, 0.55, 0);
  box(THREE, g, 0.09, 0.14, 0.9, woodM, 1.0, 0.88, 0);
  // colchão + travesseiro
  box(THREE, g, 1.92, 0.2, 0.95, mattM, 0, 0.58, 0);
  box(THREE, g, 0.52, 0.13, 0.68, sheetM, -0.6, 0.73, 0);
  // manta xadrez cobrindo os pés com caimento nas laterais
  box(THREE, g, 1.3, 0.06, 0.99, spreadM, 0.28, 0.71, 0);
  box(THREE, g, 0.06, 0.3, 0.99, spreadM, 0.95, 0.56, 0);
  box(THREE, g, 0.06, 0.3, 0.99, spreadM, -0.39, 0.56, 0);

  // footprint respeita a rotação (90° troca os eixos)
  if (Math.abs(Math.sin(ry)) > 0.7) solid(room, x - 0.55, z - 1.1, x + 0.55, z + 1.1);
  else solid(room, x - 1.1, z - 0.55, x + 1.1, z + 0.55);
  return g;
}

// ---------- CADEIRA COM URSO DE PELÚCIA (silhueta de urso em blocos) ----------
function makeTeddyChair(THREE, TEX, room, x, z, ry = 0) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.rotation.y = ry;
  room.group.add(g);
  const woodM = tm(THREE, TEX.woodFurn, 1, 1);
  const woodDark = flat(THREE, 0x3a2614);
  const plushM = tm(THREE, TEX.plush, 1, 1);
  const muzzleM = flat(THREE, 0xc8a878);
  // cadeira: 4 pernas, assento, encosto com ripa superior
  for (const [px, pz] of [[-0.2, -0.2], [0.2, -0.2], [-0.2, 0.2], [0.2, 0.2]]) {
    box(THREE, g, 0.06, 0.45, 0.06, woodDark, px, 0.225, pz);
  }
  box(THREE, g, 0.52, 0.06, 0.52, woodM, 0, 0.47, 0);
  box(THREE, g, 0.52, 0.3, 0.06, woodM, 0, 0.62, -0.23); // encosto bem baixo: urso domina
  // urso sentado no assento
  box(THREE, g, 0.34, 0.36, 0.24, plushM, 0, 0.68, 0.03);    // torso gordo
  box(THREE, g, 0.3, 0.28, 0.26, plushM, 0, 1.0, 0.02);      // cabeça grande
  box(THREE, g, 0.11, 0.11, 0.07, plushM, -0.12, 1.18, 0.02); // orelha E
  box(THREE, g, 0.11, 0.11, 0.07, plushM, 0.12, 1.18, 0.02);  // orelha D
  box(THREE, g, 0.12, 0.08, 0.06, muzzleM, 0, 0.95, 0.16);    // focinho
  box(THREE, g, 0.16, 0.18, 0.04, muzzleM, 0, 0.62, 0.16);    // barriga clara
  box(THREE, g, 0.1, 0.28, 0.1, plushM, -0.22, 0.68, 0.05);   // braço E
  box(THREE, g, 0.1, 0.28, 0.1, plushM, 0.22, 0.68, 0.05);    // braço D
  box(THREE, g, 0.1, 0.1, 0.3, plushM, -0.11, 0.56, 0.18);    // perna E esticada
  box(THREE, g, 0.1, 0.1, 0.3, plushM, 0.11, 0.56, 0.18);     // perna D esticada
  box(THREE, g, 0.1, 0.08, 0.07, muzzleM, -0.11, 0.56, 0.35); // pé E
  box(THREE, g, 0.1, 0.08, 0.07, muzzleM, 0.11, 0.56, 0.35);  // pé D
  solid(room, x - 0.35, z - 0.35, x + 0.35, z + 0.35);
  return g;
}

// ---------- ARMÁRIO DE MADEIRA (flush na parede) ----------
function makeWardrobe(THREE, TEX, room, x, z, ry = 0) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.rotation.y = ry;
  room.group.add(g);
  const woodM = tm(THREE, TEX.woodFurn, 1, 1);
  const woodDark = flat(THREE, 0x3a2614);
  const brassM = flat(THREE, 0xb89030);
  box(THREE, g, 1.7, 2.0, 0.5, woodM, 0, 1.15, 0);          // corpo
  box(THREE, g, 1.8, 0.12, 0.56, woodM, 0, 2.2, 0);         // cornija
  box(THREE, g, 1.74, 0.08, 0.54, woodDark, 0, 0.12, 0);     // plinto rente ao chão
  box(THREE, g, 0.72, 1.66, 0.05, woodM, -0.42, 1.15, 0.26); // porta E
  box(THREE, g, 0.72, 1.66, 0.05, woodM, 0.42, 1.15, 0.26);  // porta D
  box(THREE, g, 0.56, 1.2, 0.02, woodDark, -0.42, 1.15, 0.29); // painel rebaixado E
  box(THREE, g, 0.56, 1.2, 0.02, woodDark, 0.42, 1.15, 0.29);  // painel rebaixado D
  box(THREE, g, 0.035, 0.22, 0.035, brassM, -0.09, 1.15, 0.31); // puxador E
  box(THREE, g, 0.035, 0.22, 0.035, brassM, 0.09, 1.15, 0.31);  // puxador D
  // footprint respeita a rotação (90° troca os eixos)
  if (Math.abs(Math.sin(ry)) > 0.7) solid(room, x - 0.35, z - 0.95, x + 0.35, z + 0.95);
  else solid(room, x - 0.95, z - 0.35, x + 0.95, z + 0.35);
  return g;
}

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
  box(THREE, g, 1.32, 1.52, 0.08, steelM, 0, 0.725, 0.565); // porta em BUTT JOINT (não afunda no corpo)
  plane(THREE, g, 1.15, 1.35, safeFaceM, 0, 0.725, 0.615, 0, 0);
  box(THREE, g, 0.32, 0.06, 0.06, chromeM, 0, 0.725, 0.66);
  box(THREE, g, 0.06, 0.32, 0.06, chromeM, 0, 0.725, 0.66);
  box(THREE, g, 0.16, 0.16, 0.04, flat(THREE, 0xc8a028), 0.28, 0.95, 0.635);

  // footprint respeita a rotação (90° troca os eixos)
  if (Math.abs(Math.sin(ry)) > 0.7) solid(room, x - 0.6, z - 0.75, x + 0.6, z + 0.75);
  else solid(room, x - 0.75, z - 0.6, x + 0.75, z + 0.6);
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
  room.pickups.push({ idx: room.pickups.length, uid: room.id + ':' + room.pickups.length, item, qty, page, x, z, y, mesh, taken: false, phase: Math.random() * 6 });
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

// ============================================================
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
  const wallM = tm(THREE, TEX.wallpaper, 4, 2);
  plane(THREE, R.group, 10, 8, tm(THREE, TEX.floorWood, 4, 3), 0, 0, 0, -Math.PI / 2);
  plane(THREE, R.group, 10, 8, tm(THREE, TEX.ceiling, 4, 3), 0, 3.2, 0, Math.PI / 2);
  perimeter(THREE, R, 10, 8, 3.2, wallM, [{ side: 'N', at: 0.0, w: 2.0 }]);
  doorVisual(THREE, R, 'N', 0.0, 8, 10, TEX.doorWood);
  pointLight(THREE, R, 0xffeebb, 3, 9, 0, 2.8, 0);

  addDoor(R, 0.0, -3.5, 1.4, 'Sair ao Corredor dos Quartos', 'corredor', -4, 2.2, 0);

  makeNormalBed(THREE, TEX, R, -3.65, -2.0); // encostada na parede oeste (interior x=-4.75), cabeceira NA parede
  box(THREE, R.group, 1.3, 0.9, 0.5, tm(THREE, TEX.woodFurn, 1, 1), -3.0, 0.45, -3.45); // gaveta no canto SO, rente à parede sul
  box(THREE, R.group, 1.34, 0.06, 0.54, flat(THREE, 0x6a4a2c), -3.0, 0.93, -3.45); // tampo da gaveta
  solid(R, -3.65, -3.7, -2.35, -3.2);
  makeTeddyChair(THREE, TEX, R, -4.3, 1.8, Math.PI / 2 + 0.45); // cadeira em 3/4, urso vira pra porta
  makeWardrobe(THREE, TEX, R, 4.5, -1.0, -Math.PI / 2); // armário flush na parede leste (interior x=4.75)
  addCam(R, [-5, -4, 0, 4], [-4.0, 2.8, 3.2], [0, 1.0, 0], 62);

  addInteract(R, -3.2, -2.0, 1.4, 'Examinar a cama', 'bed');
  addInteract(R, -3.0, -3.2, 1.3, 'Abrir a gaveta trancada', 'drawer');
  addInteract(R, -4.0, 1.8, 1.3, 'Pegar o ursinho de pelúcia da cadeira', 'teddy');
  addInteract(R, 3.9, -1.0, 1.4, 'Examinar o armário', 'clock');
  addPickup(THREE, R, TEX, 'pills', 2.0, 2.4, 1);
  // sem spawn de inimigo aqui: é a sala onde o player ACORDA (segura, clássico RE)
  return R;
}

// ---------------- L1: QUARTO 2 ----------------
function buildQuarto2(THREE, TEX) {
  const R = baseRoom(THREE, TEX, 'quarto2', 'QUARTO 2 · COFRE CONFIDENCIAL', 10, 8, 3.2);
  R.fog = { c: 0x05050c, n: 5, f: 20 };
  R.music = 'creepy';
  const wallM = tm(THREE, TEX.wallpaper, 4, 2);
  plane(THREE, R.group, 10, 8, tm(THREE, TEX.floorWood, 4, 3), 0, 0, 0, -Math.PI / 2);
  plane(THREE, R.group, 10, 8, tm(THREE, TEX.ceiling, 4, 3), 0, 3.2, 0, Math.PI / 2);
  perimeter(THREE, R, 10, 8, 3.2, wallM, [{ side: 'N', at: 0.0, w: 2.0 }]);
  doorVisual(THREE, R, 'N', 0.0, 8, 10, TEX.doorWood);
  pointLight(THREE, R, 0xffeebb, 3, 9, 0, 2.8, 0);

  addDoor(R, 0.0, -3.5, 1.4, 'Sair ao Corredor dos Quartos', 'corredor', 4, 2.2, 0);

  makeSafeConfidential(THREE, TEX, R, -4.22, 1.8, Math.PI / 2); // cofre flush na parede oeste (interior x=-4.75), dial pro quarto
  box(THREE, R.group, 0.5, 2.4, 1.8, tm(THREE, TEX.woodFurn, 1, 1), -4.5, 1.2, -1.2); // estante: fundo 0.5 na parede oeste, face 1.8 pro quarto
  box(THREE, R.group, 0.44, 0.08, 1.7, flat(THREE, 0x3a2614), -4.5, 2.42, -1.2); // cornija recuada
  const shelfM = flat(THREE, 0x3a2614);
  for (const sy of [0.62, 1.18, 1.74]) { // prateleiras salientes na face
    box(THREE, R.group, 0.06, 0.05, 1.7, shelfM, -4.22, sy, -1.2);
  }
  // pastas de prontuários DE FRENTE pra face, apoiadas nas prateleiras (2 fileiras)
  const pastas = (yBase, lista) => {
    for (const [cor, pz] of lista) box(THREE, R.group, 0.18, 0.42, 0.1, flat(THREE, cor), -4.18, yBase + 0.235, pz);
  };
  pastas(0.645, [[0xe8e2d0, -1.9], [0xb0a890, -1.77], [0x8a929a, -1.64], [0xe8e2d0, -1.51], [0xb0a890, -1.38],
                 [0x9a6a4a, -1.05], [0xe8e2d0, -0.92], [0xb0a890, -0.79], [0x8a929a, -0.66], [0xe8e2d0, -0.53]]);
  pastas(1.205, [[0xb0a890, -1.85], [0xe8e2d0, -1.7], [0x9a6a4a, -1.55], [0xb0a890, -1.4], [0x8a929a, -1.25],
                 [0xe8e2d0, -0.9], [0xb0a890, -0.75], [0xe8e2d0, -0.6]]);
  solid(R, -4.75, -2.1, -4.25, -0.3); // solid = volume exato
  makeNormalBed(THREE, TEX, R, 3.65, -1.5, Math.PI); // encostada na parede leste (interior x=4.75), cabeceira NA parede
  addCam(R, [-5, -4, 0, 4], [4.0, 2.8, 3.2], [0, 1.0, 0], 62);

  addInteract(R, -3.4, 1.8, 1.5, 'Abrir o cofre confidencial', 'safe');
  addInteract(R, -3.2, -1.2, 1.4, 'Examinar a estante de prontuários', 'shelf2');
  addInteract(R, 3.2, -1.5, 1.4, 'Examinar a cama antiga', 'bed2');
  addPickup(THREE, R, TEX, 'ribbon', 1.5, 2.2, 1);
  return R;
}

// ---------------- L1: CORREDOR DOS QUARTOS ----------------
function buildCorredor(THREE, TEX) {
  const R = baseRoom(THREE, TEX, 'corredor', 'CORREDOR DOS QUARTOS', 16, 7, 3.0);
  R.fog = { c: 0x040409, n: 5, f: 16 };
  R.music = 'creepy';
  const wallM = tm(THREE, TEX.wallpaper, 6, 2);
  plane(THREE, R.group, 16, 7, tm(THREE, TEX.floorWood, 6, 3), 0, 0, 0, -Math.PI / 2);
  plane(THREE, R.group, 16, 7, tm(THREE, TEX.ceiling, 6, 3), 0, 3.0, 0, Math.PI / 2);
  perimeter(THREE, R, 16, 7, 3.0, wallM, [
    { side: 'N', at: 0.0, w: 2.0 },
    { side: 'S', at: -4.0, w: 2.0 },
    { side: 'S', at: 4.0, w: 2.0 },
  ]);
  doorVisual(THREE, R, 'N', 0.0, 7, 16, TEX.doorWood);
  doorVisual(THREE, R, 'S', -4.0, 7, 16, TEX.doorWood);
  doorVisual(THREE, R, 'S', 4.0, 7, 16, TEX.doorWood);
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
  const wallM = tm(THREE, TEX.wallpaper, 8, 3);
  plane(THREE, R.group, 26, 18, tm(THREE, TEX.floorWood, 8, 6), 0, 0, 0, -Math.PI / 2);
  plane(THREE, R.group, 26, 18, tm(THREE, TEX.ceiling, 8, 6), 0, 4.4, 0, Math.PI / 2);
  perimeter(THREE, R, 26, 18, 4.4, wallM, [
    { side: 'S', at: -4.0, w: 2.0 },
    { side: 'W', at: -2.0, w: 2.0 },
    { side: 'E', at: -2.0, w: 2.0 },
    { side: 'N', at: 0.0, w: 2.0 },
  ]);
  doorVisual(THREE, R, 'S', -4.0, 18, 26, TEX.doorWood);
  doorVisual(THREE, R, 'W', -2.0, 18, 26, TEX.doorWood);
  doorVisual(THREE, R, 'E', -2.0, 18, 26, TEX.doorWood);
  doorVisual(THREE, R, 'N', 0.0, 18, 26, TEX.doorMetal); // d/w estavam INVERTIDOS: folha nascia a 4m fora da sala (buraco preto)
  pointLight(THREE, R, 0xffddaa, 5, 16, 0, 3.8, 0, { amp: 0.4, speed: 3 });
  pointLight(THREE, R, 0x8899ff, 3, 12, -8, 3.2, -5);
  pointLight(THREE, R, 0x8899ff, 3, 12, 8, 3.2, 5);

  addDoor(R, -4.0, 8.4, 1.4, 'Voltar ao Corredor dos Quartos', 'corredor', 0, -2.2, 0);
  addDoor(R, -12.4, -2.0, 1.4, 'Ir ao Cemitério', 'cemiterio', 6.4, 0.0, -Math.PI / 2);
  addDoor(R, 12.4, -2.0, 1.4, 'Ir à Estufa Botânica', 'estufa', -4.4, 0.0, Math.PI / 2,
    { need: { item: 'greenhouse_key' }, msg: 'Trancada. A placa diz "ESTUFA BOTÂNICA — só o jardineiro entra". Precisa da CHAVE DE LATÃO.' });
  addDoor(R, 0.0, -8.4, 1.4, 'Passagem Norte (Recepção Técnica)', 'corredor_n', -7.4, 0.0, Math.PI / 2,
    { need: { item: 'basekey' }, consume: true, setFlag: 'hallNorthOpen', msg: 'Porta de aço trancada. A placa diz "ADMINISTRAÇÃO — PROIBIDO". Precisa da CHAVE DE ACESSO.' });
  addDoor(R, -8.4, -6.5, 1.5, 'Subir a Escada Espiral (2º Andar)', 'hall2', -8.5, 5.8, 0, { stairs: true });

  // Tapete central e recepção
  const rug = plane(THREE, R.group, 6, 9, flat(THREE, 0x5a1420), 0, 0.02, 0, -Math.PI / 2);
  R.decor = R.decor || []; R.decor.push(rug);
  makeReceptionCounterU(THREE, TEX, R, 2.0, 3.0);
  solid(R, 0.4, 1.4, 3.6, 4.6);
  // ESCADARIA em ESPIRAL (cenário; o 2º andar se acessa pela porta da ala norte)
  // colada na parede oeste, subindo ATÉ O TETO (4.4m) num fuso de pedra
  {
    // espiral ENCAIXADA no cantão sudoeste (pole a 0.55 das duas paredes, degraus
    // a até 1.25 do pole = sem cortar parede nem flutuar no vão)
    const stoneM = tm(THREE, TEX.wallStone, 1, 1);
    const ironM = flat(THREE, 0x4a4440);
    const brassM = flat(THREE, 0x8a7430);
    const PX = -10.0, PZ = -7.3; // degraus chegam a exatamente 0.05 da parede oeste
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.17, 4.4, 8), ironM);
    pole.position.set(PX, 2.2, PZ);
    R.group.add(pole);
    box(THREE, R.group, 0.34, 0.1, 0.34, brassM, PX, 4.42, PZ); // remate do fuso
    const N = 16;
    for (let i = 0; i < N; i++) {
      const a = i * (Math.PI * 2) / N;
      // degrau CANTILEVER: entra no fuso (r=0.08) e vai até r=1.35 — sem flutuar
      const st = box(THREE, R.group, 1.27, 0.13, 0.62, stoneM, 0, 0, 0);
      st.position.set(PX + Math.cos(a) * 0.72, 0.26 + i * 0.25, PZ + Math.sin(a) * 0.72);
      st.rotation.y = -a;
      // corrimão HELICOIDAL: um elo por degrau, subindo contínuo
      const ra = a + (Math.PI * 2) / N / 2;
      const rail = box(THREE, R.group, 0.5, 0.07, 0.07, ironM, 0, 0, 0);
      rail.position.set(PX + Math.cos(ra) * 1.22, 0.26 + i * 0.25 + 1.0, PZ + Math.sin(ra) * 1.22);
      rail.rotation.y = -ra - Math.PI / 2;
      if (i % 3 === 0) { // balaústre ligando degrau ao corrimão
        box(THREE, R.group, 0.055, 0.9, 0.055, ironM, PX + Math.cos(a) * 1.22, 0.26 + i * 0.25 + 0.55, PZ + Math.sin(a) * 1.22);
      }
    }
    // patamar no alto encontrando a parede oeste
    box(THREE, R.group, 1.3, 0.12, 1.3, stoneM, PX, 4.34, PZ);
    pointLight(THREE, R, 0xffcc88, 1.2, 5.0, PX + 1.4, 1.6, PZ + 1.4); // vela na base
    pointLight(THREE, R, 0x8899ff, 1.0, 5.0, PX + 1.2, 3.9, PZ + 1.2); // luar no topo
  }
  solid(R, -11.25, -8.75, -8.9, -5.85); // volume varrido pelos degraus (flush nas paredes)
  // ESTÁTUA de Santa Lúcia (pedra, com o prato dos olhos — o símbolo dela)
  {
    const sta = new THREE.Group();
    sta.position.set(0.0, 0, -4.5);
    const stone = flat(THREE, 0x7e8288);
    const stoneDark = flat(THREE, 0x5a5e64);
    const veilM = flat(THREE, 0x8e9298);
    box(THREE, sta, 1.7, 0.35, 1.7, stoneDark, 0, 0.175, 0);   // base larga
    box(THREE, sta, 1.25, 0.4, 1.25, stone, 0, 0.55, 0);        // pedestal
    box(THREE, sta, 0.62, 1.05, 0.5, stone, 0, 1.28, 0);        // manto (saia)
    box(THREE, sta, 0.5, 0.75, 0.42, stone, 0, 2.13, 0);        // torso afunilado
    box(THREE, sta, 0.58, 0.22, 0.4, stone, 0, 2.55, 0);        // ombros
    box(THREE, sta, 0.13, 0.42, 0.16, stone, -0.3, 2.0, 0.05);  // braço E
    box(THREE, sta, 0.13, 0.42, 0.16, stone, 0.3, 2.0, 0.05);   // braço D
    box(THREE, sta, 0.3, 0.05, 0.26, veilM, 0, 1.82, 0.3);      // PRATO nas mãos
    box(THREE, sta, 0.06, 0.04, 0.04, flat(THREE, 0xe8e4d8), -0.07, 1.86, 0.32); // olho E
    box(THREE, sta, 0.06, 0.04, 0.04, flat(THREE, 0xe8e4d8), 0.07, 1.86, 0.32);  // olho D
    box(THREE, sta, 0.32, 0.32, 0.3, veilM, 0, 2.82, 0);        // cabeça
    box(THREE, sta, 0.4, 0.08, 0.38, veilM, 0, 3.0, -0.02);     // véu
    box(THREE, sta, 0.38, 0.5, 0.08, veilM, 0, 2.6, -0.2);      // véu nas costas
    pointLight(THREE, R, 0xffcc88, 1.4, 4.5, 0, 1.2, -3.6);     // vela aos pés (mundo)
    R.group.add(sta);
  }
  solid(R, -0.9, -5.4, 0.9, -3.6);
  // QUADRO DE FORÇA: gabinete metálico FLUSH na parede leste, com eletrodutos até o teto
  {
    const panel = new THREE.Group();
    panel.position.set(12.66, 0, 4.0);
    const ironM = flat(THREE, 0x3c434b);
    const steelM = flat(THREE, 0x5a646e);
    box(THREE, panel, 0.18, 1.5, 1.15, ironM, 0, 1.55, 0);      // gabinete
    box(THREE, panel, 0.04, 1.34, 1.0, steelM, -0.11, 1.55, 0); // porta c/ moldura
    box(THREE, panel, 0.03, 0.09, 0.09, flat(THREE, 0x20242a), -0.14, 1.55, 0.42); // dobradiça
    box(THREE, panel, 0.03, 0.09, 0.09, flat(THREE, 0x20242a), -0.14, 1.55, -0.42);
    box(THREE, panel, 0.05, 0.22, 0.06, flat(THREE, 0x8a929a), -0.15, 1.55, -0.48); // maçaneta
    box(THREE, panel, 0.05, 0.1, 1.0, flat(THREE, 0xc8a028), -0.13, 0.92, 0);  // faixa de PERIGO
    for (const pz of [-0.28, 0, 0.28]) { // disjuntores na face
      box(THREE, panel, 0.04, 0.16, 0.09, flat(THREE, 0x1a1e24), -0.14, 1.78, pz);
    }
    const ledOk = box(THREE, panel, 0.04, 0.05, 0.05, flat(THREE, 0x1a3a22), -0.14, 2.0, 0.35);  // led ON (apagado sem fusível)
    const ledFail = box(THREE, panel, 0.04, 0.05, 0.05, flat(THREE, 0xff4030), -0.14, 2.0, 0.22); // led falha
    R.fuseLeds = { ok: ledOk, fail: ledFail }; // o jogo acende o verde quando o fusível entra
    for (const pz of [-0.35, 0.0, 0.35]) { // eletrodutos sobem até o teto
      box(THREE, panel, 0.07, 4.4 - 2.32, 0.07, flat(THREE, 0x4a525a), 0, 2.32 + (4.4 - 2.32) / 2, pz);
    }
    R.group.add(panel);
  }
  solid(R, 12.4, 3.3, 12.75, 4.7);
  addCam(R, [-13, -9, 0, 9], [-10.0, 3.6, 6.5], [0, 1.0, 0], 64);
  addCam(R, [0, -9, 13, 9], [10.0, 3.6, 6.5], [0, 1.0, 0], 64);

  addInteract(R, 2.0, 0.4, 1.7, 'Usar a Máquina de Escrever da Recepção', 'save');
  addInteract(R, 11.9, 4.0, 1.7, 'Abrir o quadro de força', 'fusebox');
  addInteract(R, 0.0, -4.5, 1.6, 'Orar diante da estátua de Santa Lúcia', 'statue');
  addInteract(R, -2.7, 0.5, 1.3, 'Beber água do bebedouro', 'vase');
  addPickup(THREE, R, TEX, 'page', -4.0, 2.5, 1, 1, 0.06);
  addPickup(THREE, R, TEX, 'ammo9', 10.0, 6.5, 8);
    addPickup(THREE, R, TEX, 'ribbon', 4.6, 2.6, 1);
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
  doorVisual(THREE, R, 'E', 0.0, 10, 16, TEX.doorWood);
  doorVisual(THREE, R, 'N', 0.0, 10, 16, TEX.doorWood);
  pointLight(THREE, R, 0x99bbff, 3, 14, 0, 3.0, 0, { amp: 0.5, speed: 5 });
  pointLight(THREE, R, 0xccddff, 2, 13, 0, 4.0, 0);

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
  addSpawn(R, 'sombra', -2.2, 2.6);
  addSpawn(R, 'rastejador', 0.0, -1.0);
  addSpawn(R, 'sombra', 4.0, 2.0);
  return R;
}

// ---------------- L1: ESTUFA BOTÂNICA ----------------
function buildEstufa(THREE, TEX) {
  const R = baseRoom(THREE, TEX, 'estufa', 'ESTUFA BOTÂNICA', 12, 10, 3.6);
  R.fog = { c: 0x04120a, n: 6, f: 18 };
  R.music = 'creepy';
  const wallM = tm(THREE, TEX.wallpaper, 5, 2, 0xaabb99);
  plane(THREE, R.group, 12, 10, tm(THREE, TEX.stoneFloor, 5, 4, 0x99aa88), 0, 0, 0, -Math.PI / 2);
  plane(THREE, R.group, 12, 10, tm(THREE, TEX.ceiling, 5, 4), 0, 3.6, 0, Math.PI / 2);
  perimeter(THREE, R, 12, 10, 3.6, wallM, [{ side: 'W', at: 0.0, w: 2.0 }]);
  doorVisual(THREE, R, 'W', 0.0, 10, 12, TEX.doorWood);
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
  pointLight(THREE, R, 0xaabbdd, 1.8, 15, 4, 4.4, 2);

  addDoor

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
  addSpawn(R, 'sombra', -4.2, 2.8);
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
  pointLight(THREE, R, 0xffaa66, 2.2, 12, 0, 4.0, 3);

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
  addCam(R, [0, -6, 8, 6], [6.8, 3.9, 5.4], [0, 1.0, -1], 60);

  addInteract(R, -4.0, 2.0, 1.7, 'Vasculhar o carro do zelador', 'carro_zelador');
  addPickup(THREE, R, TEX, 'ammo9', 6.0, 4.5, 10);
  addPickup(THREE, R, TEX, 'pills', -6.0, -4.0, 1);
  addSpawn(R, 'infectado', 2.0, -2.0);
  addSpawn(R, 'rastejador', -2.0, -3.5);
    addPickup(THREE, R, TEX, 'ribbon', 2.2, 3.0, 1);
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
  addDoor(R, 0.0, -3.5, 1.4, 'Passagem Secreta', 'passagem', 0, 7.4, 0,
    { need: { flag: 'secretOpen' }, msg: 'Um ARMÁRIO DE FERRAMENTAS pesado cobre o vão. Empurrar não resolve — examine o armário.' });

  // bancada de trabalho do Bento (na parede leste, livre da porta norte)
  box(THREE, R.group, 1.0, 0.9, 2.6, wallM, 3.8, 0.45, 0.8);
  solid(R, 3.3, -0.5, 4.3, 2.1);
  // armário de ferramentas que esconde a passagem
  const arm = new THREE.Mesh(new THREE.BoxGeometry(1.8, 2.2, 0.6), wallM);
  arm.position.set(-3.6, 1.1, -0.5); R.group.add(arm);
  solid(R, -4.4, -0.8, -2.8, -0.2);
  makeNormalBed(THREE, TEX, R, 3.4, -1.8, Math.PI / 2); // casa residencial, não hospital
  solid(R, 2.9, -2.6, 3.9, -1.0);
  // rádio amador
  box(THREE, R.group, 0.8, 0.5, 0.5, flat(THREE, 0x334455), 3.5, 1.2, 1.8);
  solid(R, 3.1, 1.5, 3.9, 2.1);
  addCam(R, [-5, -4, 0, 4], [-4.0, 2.6, 3.0], [0, 1.0, 0], 62);

  addInteract(R, 3.6, 0.8, 1.5, 'Vasculhar a bancada de trabalho de Bento', 'cabana_bento');
  addInteract(R, -3.6, -0.5, 1.5, 'Examinar o armário de ferramentas', 'armario_secreto');
  addInteract(R, 3.5, 1.8, 1.4, 'Ouvir o rádio amador', 'bento_radio');
  addPickup(THREE, R, TEX, 'pills', -2.5, 2.2, 1);
    addPickup(THREE, R, TEX, 'ribbon', 2.5, 2.5, 1);
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

  addDoor(R, 0.0, 8.4, 1.4, 'Voltar à Casa do Zelador', 'casa_zelador', 0, -2.4, Math.PI);
  addDoor(R, 0.0, -8.4, 1.4, 'Sair na Recepção Técnica', 'corredor_n', 4, 2.2, Math.PI);

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
  const wallM = tm(THREE, TEX.wallpaper, 7, 2);
  plane(THREE, R.group, 18, 7, tm(THREE, TEX.floorWood, 7, 3), 0, 0, 0, -Math.PI / 2);
  plane(THREE, R.group, 18, 7, tm(THREE, TEX.ceiling, 7, 3), 0, 3.4, 0, Math.PI / 2);
  perimeter(THREE, R, 18, 7, 3.4, wallM, [
    { side: 'W', at: 0.0, w: 2.0 },
    { side: 'S', at: 4.0, w: 2.0 },
    { side: 'E', at: 0.0, w: 2.0 },
    { side: 'N', at: 4.0, w: 2.0 },
    { side: 'N', at: -4.0, w: 2.0 },
  ]);
  doorVisual(THREE, R, 'W', 0.0, 7, 18, TEX.doorMetal);
  doorVisual(THREE, R, 'S', 4.0, 7, 18, wallM);
  doorVisual(THREE, R, 'E', 0.0, 7, 18, TEX.doorWood);
  doorVisual(THREE, R, 'N', 4.0, 7, 18, TEX.doorWood);
  doorVisual(THREE, R, 'N', -4.0, 7, 18, TEX.doorMetal);
  pointLight(THREE, R, 0xffddaa, 3, 10, -4, 3.0, 0);
  pointLight(THREE, R, 0xffddaa, 3, 10, 6, 3.0, 0, { amp: 0.6, speed: 5 });

  addDoor(R, -8.4, 0.0, 1.4, 'Voltar ao Hall Principal', 'saguao', 0, -7.4, 0);
  addDoor(R, 4.0, 3.0, 1.4, 'Entrar na Passagem Secreta', 'passagem', 0, -7.4, Math.PI);
  addDoor(R, 8.4, 0.0, 1.4, 'Entrar na Sala de Experimentos', 'experimentos', -4.4, 0.0, Math.PI / 2);
  addDoor(R, 4.0, -3.0, 1.4, 'Entrar na Catedral', 'catedral', 4, 6.4, Math.PI,
    { need: { flag: 'chapelSignal' }, msg: 'Um selo de pedra negra veda a porta. O MEDALHÃO de Lúcia vibrou no MONÓLITO da floresta... é lá que o caminho se revela.' });
  addDoor(R, -4.0, -3.0, 1.4, 'Subir a Escada de Serviço (2º Andar)', 'hall2', 0, 6.2, 0);

  // nicho do ELEVADOR (painel de andares)
  box(THREE, R.group, 2.6, 3.0, 0.5, tm(THREE, TEX.wallStone, 2, 1, 0x667788), 0.0, 1.5, -2.8);
  solid(R, -1.4, -3.1, 1.4, -2.5);
  box(THREE, R.group, 0.9, 1.2, 0.15, flat(THREE, 0x223322), 0.0, 1.4, -2.45);
  addCam(R, [-9, -3.5, 0, 3.5], [-7.0, 2.8, 2.8], [0, 1.0, 0], 62);
  addCam(R, [0, -3.5, 9, 3.5], [7.0, 2.8, 2.8], [0, 1.0, 0], 62);

  addInteract(R, 0.0, -1.8, 1.7, 'Usar o painel do elevador', 'elevator');
  addPickup(THREE, R, TEX, 'fuse', -4.0, -1.5, 1);
  addPickup(THREE, R, TEX, 'ammo9', -6.0, 2.0, 8);
  addSpawn(R, 'rastejador', 6.0, -1.5);
    addPickup(THREE, R, TEX, 'ribbon', -6.5, 2.5, 1);
return R;
}

// ---------------- L1: SALA DE EXPERIMENTOS ----------------
function buildExperimentos(THREE, TEX) {
  const R = baseRoom(THREE, TEX, 'experimentos', 'SALA DE EXPERIMENTOS', 12, 10, 3.2);
  R.fog = { c: 0x060408, n: 5, f: 16 };
  R.music = 'creepy';
  const wallM = tm(THREE, TEX.wallpaper, 5, 2, 0x99aaaa);
  plane(THREE, R.group, 12, 10, tm(THREE, TEX.stoneFloor, 5, 4, 0x99aabb), 0, 0, 0, -Math.PI / 2);
  plane(THREE, R.group, 12, 10, tm(THREE, TEX.ceiling, 5, 4), 0, 3.2, 0, Math.PI / 2);
  perimeter(THREE, R, 12, 10, 3.2, wallM, [{ side: 'W', at: 0.0, w: 2.0 }]);
  doorVisual(THREE, R, 'W', 0.0, 10, 12, TEX.doorWood);
  pointLight(THREE, R, 0xaaffee, 2.5, 11, 0, 2.9, 0, { amp: 0.5, speed: 8 });

  addDoor(R, -5.4, 0.0, 1.4, 'Voltar ao Corredor Norte', 'corredor_n', 7.4, 0.0, -Math.PI / 2);

  // maca de aço central e mesa
  makeHospitalBed(THREE, TEX, R, 0.0, -2.0);
  solid(R, -0.8, -2.8, 0.8, -1.2);
  box(THREE, R.group, 2.4, 0.9, 1.2, tm(THREE, TEX.wallpaper, 2, 1, 0xaabbbb), 2.5, 0.45, 2.2);
  solid(R, 1.3, 1.6, 3.7, 2.8);
  addCam(R, [-6, -5, 0, 5], [-4.0, 2.8, 3.4], [0, 1.0, 0], 62);

  addInteract(R, 0.0, -2.0, 1.6, 'Examinar a maca com correias', 'exam_table');
  addInteract(R, 2.5, 2.2, 1.5, 'Vasculhar as pias de formol', 'exam_sink');
  addInteract(R, -2.5, 2.2, 1.5, 'Ler a mesa do Dr. Alencastro', 'desk_dr');
  addPickup(THREE, R, TEX, 'alencastro_dossier', -3.0, -2.5, 1);
  addPickup(THREE, R, TEX, 'shell', 4.0, -3.5, 4);
  addSpawn(R, 'infectado', -2.0, 0.5);
  addSpawn(R, 'enfermeira', 2.0, -1.0);
    addPickup(THREE, R, TEX, 'ribbon', -1.5, 3.5, 1);
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
  addCam(R, [8, -8, 11, 8], [9.6, 4.6, 7.0], [0, 1.2, -3], 60);

  addInteract(R, 0.0, -5.0, 1.8, 'Aproximar-se do altar', 'altar_capela');
  addInteract(R, -6.5, 0.0, 1.5, 'Examinar o confessionário', 'confessionario');
  addInteract(R, 6.5, 0.0, 1.5, 'Examinar a estátua do anjo', 'anjo_capela');
  addPickup(THREE, R, TEX, 'shotgun', 9.7, 1.7, 1); // faixa leste entre os bancos (à vista)
  addPickup(THREE, R, TEX, 'shell', 9.7, 1.0, 12);
  addPickup(THREE, R, TEX, 'antidote', -8.0, 5.5, 1);
  addPickup(THREE, R, TEX, 'antidote', 8.0, -5.0, 1);
  addSpawn(R, 'sombra', -5.0, 2.0);
  addSpawn(R, 'sombra', 5.0, -1.0);
  return R;
}

// ---------------- 21. DIORAMA DO TÍTULO (FACHADA EXTERNA 3D) ----------------
function buildTitleDiorama(THREE, TEX) {
  const R = baseRoom(THREE, TEX, 'title_diorama', 'SANATÓRIO SANTA LÚCIA (1997)', 24, 20, 12);
  R.ambient = 'title_storm';
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
      lightningTimer = 6.0 + Math.random() * 8.0;
      if (R.stormLight) {
        R.stormLight.intensity = 4.5;
        setTimeout(() => { if (R.stormLight) R.stormLight.intensity = 0.6; }, 70);
        setTimeout(() => { if (R.stormLight) R.stormLight.intensity = 4.8; }, 140);
        setTimeout(() => { if (R.stormLight) R.stormLight.intensity = 0.35; }, 280);
      }
      if (game && game.ui && typeof game.ui.triggerTitleLightning === 'function') {
        game.ui.triggerTitleLightning();
      } else {
        if (game && game.flashBoost !== undefined) game.flashBoost = 0.55;
        if (game && game.audio) game.audio.thunder({ close: true });
      }
    }
  };

  return R;
}

// ==================== DICIONÁRIO DE SALAS ====================
// ==================== L2: HALL DO 2º ANDAR (hub) ====================
function buildHall2(THREE, TEX) {
  const R = baseRoom(THREE, TEX, 'hall2', 'HALL DO 2º ANDAR · ALA CLÍNICA', 20, 14, 4.0);
  R.fog = { c: 0x05060c, n: 6, f: 20 };
  R.music = 'creepy';
  const wallM = tm(THREE, TEX.wallpaper, 7, 2, 0xaab8b8);
  const tileM = tm(THREE, TEX.wallTile, 6, 2);
  plane(THREE, R.group, 20, 14, tm(THREE, TEX.floorWood, 7, 5), 0, 0, 0, -Math.PI / 2);
  plane(THREE, R.group, 20, 14, tm(THREE, TEX.ceiling, 7, 5), 0, 4.0, 0, Math.PI / 2);
  perimeter(THREE, R, 20, 14, 4.0, wallM, [
    { side: 'S', at: 0.0, w: 2.0 },
    { side: 'E', at: 0.0, w: 2.0 },
    { side: 'W', at: 0.0, w: 2.0 },
    { side: 'N', at: 4.0, w: 2.0 },
  ]);
  doorVisual(THREE, R, 'S', 0.0, 14, 20, TEX.doorMetal);
  doorVisual(THREE, R, 'E', 0.0, 14, 20, TEX.doorWood);
  doorVisual(THREE, R, 'W', 0.0, 14, 20, TEX.doorWood);
  doorVisual(THREE, R, 'N', 4.0, 14, 20, TEX.doorMetal);
  pointLight(THREE, R, 0xffeecc, 3.5, 12, -5, 3.4, 0);
  pointLight(THREE, R, 0xffeecc, 3, 12, 6, 3.4, 0, { amp: 0.6, speed: 6 });

  addDoor(R, 0.0, 6.4, 1.4, 'Descer a Escada de Serviço (Térreo)', 'corredor_n', -4, -2.0, 0);
  addDoor(R, -8.5, 6.4, 1.4, 'Descer a Escada Espiral (Térreo)', 'saguao', -8.4, -6.5, -Math.PI / 2, { stairs: true });
  addDoor(R, 9.4, 0.0, 1.4, 'Entrar na Enfermaria Geral', 'enfermaria', -8.4, 0.0, Math.PI / 2);
  addDoor(R, -9.4, 0.0, 1.4, 'Entrar no Escritório Clínico', 'escritorio2', 4.4, 0.0, -Math.PI / 2);
  addDoor(R, 4.0, -6.4, 1.4, 'Entrar na Casa das Fornalhas', 'fornalhas', 4, 5.2, 0);

  // nicho do ELEVADOR (parede norte, x=-4): painéis P1/P3
  box(THREE, R.group, 2.8, 3.4, 0.5, tileM, -4.0, 1.7, -6.75);
  solid(R, -5.4, -7.05, -2.6, -6.45);
  box(THREE, R.group, 1.0, 1.3, 0.15, flat(THREE, 0x223322), -4.0, 1.5, -6.4);
  addCam(R, [-10, -7, 0, 7], [-8.0, 3.2, 5.2], [0, 1.0, 0], 62);
  addCam(R, [0, -7, 10, 7], [8.0, 3.2, 5.2], [0, 1.0, 0], 62);
  addCam(R, [0, -7, 10, 7], [8.8, 3.4, 6.4], [0, 1.0, -2], 60);

  // recepção da ala (balcão a leste) e bancos
  box(THREE, R.group, 2.6, 1.0, 1.0, wallM, 5.0, 0.5, 2.0);
  solid(R, 3.7, 1.5, 6.3, 2.5);
  box(THREE, R.group, 2.2, 0.7, 0.8, wallM, -6.0, 0.35, 3.5);
  solid(R, -7.1, 3.1, -4.9, 3.9);

  addInteract(R, -4.0, -5.8, 1.6, 'Painel do elevador: subir ao 3º ANDAR', 'elevator_up');
  addInteract(R, -2.6, -5.8, 1.2, 'Painel do elevador: descer ao TÉRREO', 'elevator_down');
  addInteract(R, 5.0, 3.2, 1.5, 'Examinar a recepção da ala clínica', 'placa2');
  addPickup(THREE, R, TEX, 'mezanino_emblem', 6.8, 2.0, 1);
  addPickup(THREE, R, TEX, 'ammo9', -8.0, 4.5, 8);
  addPickup(THREE, R, TEX, 'pills', 8.0, -4.5, 1);
  addSpawn(R, 'rastejador', -6.0, -3.0);
  return R;
}

// ==================== L2: ENFERMARIA GERAL (sala do SAVE) ====================
function buildEnfermaria(THREE, TEX) {
  const R = baseRoom(THREE, TEX, 'enfermaria', 'ENFERMARIA GERAL', 18, 12, 3.4);
  R.fog = { c: 0x05070a, n: 5, f: 18 };
  R.music = 'creepy';
  const wallM = tm(THREE, TEX.wallTile, 6, 2, 0xb8c4c0);
  plane(THREE, R.group, 18, 12, tm(THREE, TEX.wallTile, 7, 4, 0x889494), 0, 0, 0, -Math.PI / 2);
  plane(THREE, R.group, 18, 12, tm(THREE, TEX.ceiling, 6, 4), 0, 3.4, 0, Math.PI / 2);
  perimeter(THREE, R, 18, 12, 3.4, wallM, [{ side: 'W', at: 0.0, w: 2.0 }]);
  doorVisual(THREE, R, 'W', 0.0, 12, 18, TEX.doorWood);
  pointLight(THREE, R, 0xd8ffee, 3, 12, 0, 3.0, 0);
  pointLight(THREE, R, 0xd8ffee, 2.5, 10, -5, 3.0, 2, { amp: 0.4, speed: 3 });

  addDoor(R, -8.4, 0.0, 1.4, 'Voltar ao Hall do 2º Andar', 'hall2', 7.4, 0.0, Math.PI / 2);

  // fileiras de camas
  for (const [bx, bz] of [[-4.5, -3.0], [0.5, -3.0], [5.5, -3.0], [-4.5, 2.5], [5.5, 2.5]]) {
    makeHospitalBed(THREE, TEX, R, bx, bz);
    solid(R, bx - 0.85, bz - 0.85, bx + 0.85, bz + 0.85);
  }
  // mesinha da enfermeira-chefe com a MÁQUINA DE ESCREVER (SAVE)
  box(THREE, R.group, 1.0, 0.8, 0.7, wallM, -7.5, 0.4, -4.6);
  solid(R, -8.0, -4.95, -7.0, -4.25);
  addCam(R, [-9, -6, 0, 6], [-7.0, 2.8, 4.6], [0, 1.0, 0], 62);
  addCam(R, [0, -6, 9, 6], [7.0, 2.8, 4.6], [0, 1.0, 0], 62);
  addCam(R, [0, -6, 9, 6], [7.8, 2.9, 5.0], [0, 1.0, -1], 60);

  addInteract(R, -7.5, -3.6, 1.6, 'Usar a Máquina de Escrever da Enfermaria', 'save');
  addInteract(R, -2.0, -5.0, 1.5, 'Ler os prontuários da ala clínica', 'prontuario_e');
  addPickup(THREE, R, TEX, 'ribbon', -6.4, 3.6, 1);
  addPickup(THREE, R, TEX, 'pills', 6.0, -4.6, 1);
  addPickup(THREE, R, TEX, 'ammo38', 6.0, 4.0, 6);
  return R; // sala LIMPA: nenhum inimigo (regra das salas de save)
}

// ==================== L2: ESCRITÓRIO CLÍNICO ====================
function buildEscritorio2(THREE, TEX) {
  const R = baseRoom(THREE, TEX, 'escritorio2', 'ESCRITÓRIO CLÍNICO', 12, 9, 3.2);
  R.fog = { c: 0x060508, n: 5, f: 15 };
  R.music = 'creepy';
  const wallM = tm(THREE, TEX.wallpaper, 4, 2, 0x99a088);
  plane(THREE, R.group, 12, 9, tm(THREE, TEX.floorWood, 4, 3), 0, 0, 0, -Math.PI / 2);
  plane(THREE, R.group, 12, 9, tm(THREE, TEX.ceiling, 4, 3), 0, 3.2, 0, Math.PI / 2);
  perimeter(THREE, R, 12, 9, 3.2, wallM, [{ side: 'E', at: 0.0, w: 2.0 }]);
  doorVisual(THREE, R, 'E', 0.0, 9, 12, TEX.doorWood);
  pointLight(THREE, R, 0xffddaa, 2.5, 9, 0, 2.8, 0, { amp: 0.5, speed: 7 });

  addDoor(R, 5.4, 0.0, 1.4, 'Voltar ao Hall do 2º Andar', 'hall2', -7.4, 0.0, -Math.PI / 2);

  box(THREE, R.group, 2.4, 0.9, 1.2, wallM, -2.0, 0.45, -2.6); // escrivaninha
  solid(R, -3.2, -3.2, -0.8, -2.0);
  box(THREE, R.group, 1.8, 2.4, 0.5, wallM, -4.6, 1.2, 1.0); // estante
  solid(R, -5.0, 0.6, -4.2, 1.4);
  addCam(R, [-6, -4.5, 0, 4.5], [-4.5, 2.7, 3.6], [0, 1.0, 0], 62);

  addInteract(R, -2.0, -1.4, 1.5, 'Examinar a escrivaninha médica', 'desk2');
  addInteract(R, -4.6, 1.8, 1.4, 'Examinar a estante de laudos', 'estante2');
  addInteract(R, 3.6, -3.8, 1.4, 'Examinar o quadro a óleo da faculdade', 'quadro2');
  addPickup(THREE, R, TEX, 'ammo38', -4.0, 3.2, 6);
  addSpawn(R, 'enfermeira', -1.5, 1.5);
  return R;
}

// ==================== L2: CASA DAS FORNALHAS (válvulas) ====================
function buildFornalhas(THREE, TEX) {
  const R = baseRoom(THREE, TEX, 'fornalhas', 'CASA DAS FORNALHAS', 16, 12, 4.2);
  R.fog = { c: 0x0a0503, n: 5, f: 16 };
  R.music = 'creepy';
  const wallM = tm(THREE, TEX.wallStone, 5, 2, 0x887766);
  plane(THREE, R.group, 16, 12, tm(THREE, TEX.stoneFloor, 6, 4, 0x665544), 0, 0, 0, -Math.PI / 2);
  plane(THREE, R.group, 16, 12, tm(THREE, TEX.ceiling, 6, 4), 0, 4.2, 0, Math.PI / 2);
  perimeter(THREE, R, 16, 12, 4.2, wallM, [{ side: 'S', at: 4.0, w: 2.0 }]);
  doorVisual(THREE, R, 'S', 4.0, 12, 16, TEX.doorMetal);
  pointLight(THREE, R, 0xff6633, 3, 11, 0, 2.6, -2, { amp: 0.9, speed: 4 });
  pointLight(THREE, R, 0xff9944, 2, 9, -5, 2.4, 2);
  pointLight(THREE, R, 0xff8844, 2, 10, 0, 3.8, 3);

  addDoor(R, 4.0, 5.4, 1.4, 'Voltar ao Hall do 2º Andar', 'hall2', 4, -5.2, 0);

  // caldeiras em fila + válvulas vermelhas (o poço do elevador escuta elas)
  for (const bx of [-5.0, 0.0, 5.0]) {
    makeIndustrialBoiler(THREE, TEX, R, bx, -2.5);
    solid(R, bx - 0.95, -3.45, bx + 0.95, -1.55);
  }
  addCam(R, [-8, -6, 0, 6], [-6.5, 3.4, 4.6], [0, 1.0, 0], 62);
  addCam(R, [0, -6, 8, 6], [6.5, 3.4, 4.6], [0, 1.0, 0], 62);
  addCam(R, [0, -6, 8, 6], [7.2, 3.6, 5.2], [0, 1.0, -2], 60);

  addInteract(R, -5.0, -1.0, 1.5, 'Girar a VÁLVULA oeste', 'valve_a');
  addInteract(R, 0.0, -1.0, 1.5, 'Girar a VÁLVULA central', 'valve_b');
  addInteract(R, 5.0, -1.0, 1.5, 'Girar a VÁLVULA leste', 'valve_c');
  addPickup(THREE, R, TEX, 'frag', -6.5, 3.5, 1);
  addPickup(THREE, R, TEX, 'shotgun', 4.8, 4.2, 1); // rack de manutenção COLADO NA ENTRADA (sweep pega primeiro)
  addPickup(THREE, R, TEX, 'shell', 5.8, 4.2, 6);
  addPickup(THREE, R, TEX, 'shell', 6.5, -4.0, 6);
  addPickup(THREE, R, TEX, 'pills', 6.5, 3.5, 1);
  addSpawn(R, 'infectado', -2.0, 2.5);
  addSpawn(R, 'infectado', 2.5, 3.0);
  return R;
}

// ==================== L3: CORREDOR DO 3º ANDAR ====================
function buildCorredor3(THREE, TEX) {
  const R = baseRoom(THREE, TEX, 'corredor3', 'CORREDOR DO 3º ANDAR · ARQUIVO MORTO', 20, 6, 3.4);
  R.fog = { c: 0x04050a, n: 4, f: 14 };
  R.music = 'creepy';
  const wallM = tm(THREE, TEX.wallDirty, 7, 2);
  plane(THREE, R.group, 20, 6, tm(THREE, TEX.stoneFloor, 7, 2, 0x777788), 0, 0, 0, -Math.PI / 2);
  plane(THREE, R.group, 20, 6, tm(THREE, TEX.ceiling, 7, 2), 0, 3.4, 0, Math.PI / 2);
  perimeter(THREE, R, 20, 6, 3.4, wallM, [
    { side: 'E', at: 0.0, w: 2.0 },
    { side: 'N', at: 2.0, w: 2.0 },
  ]);
  doorVisual(THREE, R, 'E', 0.0, 6, 20, TEX.doorWood);
  doorVisual(THREE, R, 'N', 2.0, 6, 20, TEX.doorMetal);
  doorVisual(THREE, R, 'S', 0.0, 6, 20, TEX.doorMetal); // porta do elevador (visual)
  pointLight(THREE, R, 0xffcc88, 2.5, 10, -5, 3.0, 0, { amp: 0.7, speed: 5 });
  pointLight(THREE, R, 0xffcc88, 2.5, 10, 6, 3.0, 0);

  addDoor(R, 9.4, 0.0, 1.4, 'Entrar no Escritório do Supervisor', 'escritorio_sup', -4.4, 0.0, Math.PI / 2);
  addDoor(R, 2.0, -2.6, 1.4, 'Subir à COBERTURA (Porta de Serviço)', 'telhado', 0, 6.2, Math.PI,
    { need: { item: 'terrace_key' }, msg: 'A porta de serviço tem um LEITOR DE CARTÕES. O painel do elevador disse: P3 exige o CARTÃO DA COBERTURA.' });

  // painel do elevador (descida) — ao lado da porta visual sul
  box(THREE, R.group, 0.9, 1.2, 0.15, flat(THREE, 0x223322), 1.8, 1.4, 2.7);
  addCam(R, [-10, -3, 0, 3], [-7.5, 2.8, 2.6], [0, 1.0, 0], 62);
  addCam(R, [0, -3, 10, 3], [7.5, 2.8, 2.6], [0, 1.0, 0], 62);

  addInteract(R, 0.6, 2.3, 1.6, 'Painel do elevador: descer ao 2º ANDAR', 'elevator_p3');
  addPickup(THREE, R, TEX, 'ammo9', -8.0, -1.0, 8);
  addSpawn(R, 'enfermeira', -6.0, 0.5);
  return R;
}

// ==================== L3: ESCRITÓRIO DO SUPERVISOR ====================
function buildEscritorioSup(THREE, TEX) {
  const R = baseRoom(THREE, TEX, 'escritorio_sup', 'ESCRITÓRIO DO SUPERVISOR MOROZOV', 12, 9, 3.3);
  R.fog = { c: 0x050408, n: 5, f: 15 };
  R.music = 'creepy';
  const wallM = tm(THREE, TEX.wallpaper, 4, 2, 0x778088);
  plane(THREE, R.group, 12, 9, tm(THREE, TEX.floorWood, 4, 3, 0x887766), 0, 0, 0, -Math.PI / 2);
  plane(THREE, R.group, 12, 9, tm(THREE, TEX.ceiling, 4, 3), 0, 3.3, 0, Math.PI / 2);
  perimeter(THREE, R, 12, 9, 3.3, wallM, [{ side: 'W', at: 0.0, w: 2.0 }]);
  doorVisual(THREE, R, 'W', 0.0, 9, 12, TEX.doorWood);
  pointLight(THREE, R, 0xffcc88, 2.5, 9, 0, 2.8, 0, { amp: 0.4, speed: 9 });

  addDoor(R, -5.4, 0.0, 1.4, 'Voltar ao Corredor do 3º Andar', 'corredor3', 8.4, 0.0, -Math.PI / 2);

  // mesa pesada ao norte + cofre aberto + quadro do sanatório
  box(THREE, R.group, 2.6, 1.0, 1.3, wallM, 0.0, 0.5, -2.8);
  solid(R, -1.3, -3.45, 1.3, -2.15);
  box(THREE, R.group, 1.4, 1.0, 0.7, tm(THREE, TEX.wallStone, 1, 1, 0x556677), -4.4, 0.5, -3.2);
  solid(R, -5.1, -3.55, -3.7, -2.85);
  box(THREE, R.group, 1.8, 2.4, 0.5, wallM, 4.6, 1.2, -0.5); // arquivos
  solid(R, 4.2, -1.2, 5.0, 0.2);
  addCam(R, [-6, -4.5, 0, 4.5], [-4.5, 2.8, 3.6], [0, 1.0, 0], 62);

  addInteract(R, 0.0, -1.6, 1.6, 'Examinar a mesa do supervisor', 'mesa_sup');
  addInteract(R, -4.4, -2.4, 1.5, 'Abrir o cofre do supervisor', 'cofre_sup');
  addInteract(R, 4.4, -1.8, 1.5, 'Examinar os arquivos confidenciais', 'arq_sup');
  addPickup(THREE, R, TEX, 'terrace_key', 1.6, -2.6, 1);
  addPickup(THREE, R, TEX, 'frag', -3.0, 3.0, 1);
  addPickup(THREE, R, TEX, 'page', 3.0, 3.2, 1);
  addPickup(THREE, R, TEX, 'pills', -3.0, -1.0, 1);
  addSpawn(R, 'rastejador', 2.5, 1.5);
  return R;
}

// ==================== L3: COBERTURA · HELIPONTO (final de Daniel/Bento) ====================
function buildTelhado(THREE, TEX) {
  const R = baseRoom(THREE, TEX, 'telhado', 'COBERTURA · HELIPONTO', 24, 16, 4.6);
  R.fog = { c: 0x03040a, n: 6, f: 24 };
  R.music = 'creepy';
  const wallM = tm(THREE, TEX.wallStone, 8, 2, 0x556066);
  plane(THREE, R.group, 24, 16, tm(THREE, TEX.stoneFloor, 8, 5, 0x4c4c56), 0, 0, 0, -Math.PI / 2);
  // céu aberto: SEM teto (a lua da SANTA LÚCIA fica a vista)
  perimeter(THREE, R, 24, 16, 4.6, wallM, [{ side: 'S', at: 0.0, w: 2.0 }]);
  doorVisual(THREE, R, 'S', 0.0, 16, 24, TEX.doorMetal);
  pointLight(THREE, R, 0xaabbff, 3.5, 18, 0, 4.2, -4);
  pointLight(THREE, R, 0xaabbff, 2.5, 14, -8, 4.0, 4);
  pointLight(THREE, R, 0xff3322, 2.5, 8, 4.4, 2.6, -8.2, { amp: 1.4, speed: 2 }); // farol do heliponto

  addDoor(R, 0.0, 7.4, 1.4, 'Descer ao 3º Andar', 'corredor3', 2, -1.6, 0);

  // HELIPONTO: círculo de asfalto + H amarelo
  const pad = new THREE.Mesh(new THREE.CylinderGeometry(4.4, 4.4, 0.12, 22), flat(THREE, 0x2e2e34));
  pad.position.set(0, 0.07, -4); R.group.add(pad);
  const hm = flat(THREE, 0xd8c832);
  box(THREE, R.group, 0.5, 0.06, 3.2, hm, -1.2, 0.16, -4);
  box(THREE, R.group, 0.5, 0.06, 3.2, hm, 1.2, 0.16, -4);
  box(THREE, R.group, 1.9, 0.06, 0.5, hm, 0.0, 0.16, -4);

  // HELICÓPTERO de resgate (fuga)
  const heliM = flat(THREE, 0x223326);
  box(THREE, R.group, 2.2, 1.5, 4.8, heliM, 7.0, 1.0, 3.0);
  box(THREE, R.group, 0.5, 0.5, 3.2, heliM, 7.0, 1.2, 5.9); // cauda (flush, antes furava o parapeito)
  box(THREE, R.group, 0.2, 1.1, 0.9, heliM, 7.0, 1.9, 6.95);
  box(THREE, R.group, 5.8, 0.1, 0.35, flat(THREE, 0x111111), 7.0, 2.4, 3.0);
  box(THREE, R.group, 0.3, 0.5, 3.4, flat(THREE, 0x111111), 6.2, 0.25, 3.0);
  box(THREE, R.group, 0.3, 0.5, 3.4, flat(THREE, 0x111111), 7.8, 0.25, 3.0);
  solid(R, 5.9, 0.6, 8.1, 5.4);

  // cabine dos mecânicos com o diário de bordo (SAVE da cobertura)
  box(THREE, R.group, 1.1, 0.85, 0.8, wallM, -8.0, 0.42, 4.4);
  solid(R, -8.55, 4.0, -7.45, 4.8);
  addCam(R, [-12, -8, 0, 8], [-9.0, 3.8, 6.0], [0, 1.0, 0], 64);
  addCam(R, [0, -8, 12, 8], [9.0, 3.8, 6.0], [0, 1.0, 0], 64);

  addInteract(R, -8.0, 3.4, 1.6, 'Registrar no diário de bordo da cobertura', 'save');
  addInteract(R, 5.2, 3.0, 2.0, 'Entrar no HELICÓPTERO', 'helicoptero');
  addInteract(R, -10.8, -1.0, 1.6, 'Olhar a cidade lá embaixo', 'borda_telhado');
  addPickup(THREE, R, TEX, 'shell', -4.0, -6.5, 8);
  addPickup(THREE, R, TEX, 'pills', 8.0, -5.5, 1);
  addPickup(THREE, R, TEX, 'antidote', -10.0, -6.0, 1);
  addPickup(THREE, R, TEX, 'ribbon', -6.4, 4.2, 1);
  return R;
}

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
  hall2: buildHall2,
  enfermaria: buildEnfermaria,
  escritorio2: buildEscritorio2,
  fornalhas: buildFornalhas,
  corredor3: buildCorredor3,
  escritorio_sup: buildEscritorioSup,
  telhado: buildTelhado,
  title_diorama: buildTitleDiorama,
};


export function buildRoom(THREE, TEX, id) {
  const b = BUILDERS[id];
  if (!b) throw new Error('Sala desconhecida: ' + id);
  return b(THREE, TEX);
}

export const ROOM_IDS = Object.keys(BUILDERS);
