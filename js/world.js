// ============================================================
// SANTA LÚCIA - Equipe Nakamura - Mundo: salas 3D, câmeras fixas, colisões,
// portas, itens, inimigos e efeitos por sala.
// ============================================================
import { pointInSolids } from './entities.js';

// ---------- helpers de construção ----------
function tm(THREE, tex, rx, ry, color = 0xffffff, emissive = 0x000000) {
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

// perímetro com vãos de porta. gaps: [{side:'N'|'S'|'E'|'W', at, w}]
function perimeter(THREE, room, w, d, h, wallMat, gaps = [], th = 0.5) {
  const gapsBy = { N: [], S: [], E: [], W: [] };
  gaps.forEach((g) => gapsBy[g.side].push(g));
  // implementação direta por lado
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
    const m = box(THREE, room.group, ww, h, dd, wallMat, cx, h / 2, cz);
    m.material = wallMat;
    solid(room, cx - ww / 2, cz - dd / 2, cx + ww / 2, cz + dd / 2);
  };
  for (const [a, b] of buildSide('N', -w / 2, w / 2)) mkWall((a + b) / 2, -d / 2, b - a, true);
  for (const [a, b] of buildSide('S', -w / 2, w / 2)) mkWall((a + b) / 2, d / 2, b - a, true);
  for (const [a, b] of buildSide('W', -d / 2, d / 2)) mkWall(-w / 2, (a + b) / 2, b - a, false);
  for (const [a, b] of buildSide('E', -d / 2, d / 2)) mkWall(w / 2, (a + b) / 2, b - a, false);
  // barreira nos vãos (lado externo da parede, sem invadir o interior) + verga acima
  for (const g of gaps) {
    const lintelMat = wallMat;
    if (g.side === 'N') {
      const z = -d / 2;
      solid(room, g.at - g.w / 2, z - 0.5, g.at + g.w / 2, z);
      box(THREE, room.group, g.w + 0.4, h - 2.3, th, lintelMat, g.at, 2.3 + (h - 2.3) / 2, z);
    } else if (g.side === 'S') {
      const z = d / 2;
      solid(room, g.at - g.w / 2, z, g.at + g.w / 2, z + 0.5);
      box(THREE, room.group, g.w + 0.4, h - 2.3, th, lintelMat, g.at, 2.3 + (h - 2.3) / 2, z);
    } else if (g.side === 'W') {
      const x = -w / 2;
      solid(room, x - 0.5, g.at - g.w / 2, x, g.at + g.w / 2);
      box(THREE, room.group, th, h - 2.3, g.w + 0.4, lintelMat, x, 2.3 + (h - 2.3) / 2, g.at);
    } else if (g.side === 'E') {
      const x = w / 2;
      solid(room, x, g.at - g.w / 2, x + 0.5, g.at + g.w / 2);
      box(THREE, room.group, th, h - 2.3, g.w + 0.4, lintelMat, x, 2.3 + (h - 2.3) / 2, g.at);
    }
  }
}

// visual de porta no vão
function doorVisual(THREE, room, side, at, d, w, tex, frameColor = 0x2a1c12) {
  const g = room.group;
  const fm = flat(THREE, frameColor);
  const dm = new THREE.MeshLambertMaterial({ map: tex });
  if (side === 'N' || side === 'S') {
    const z = side === 'N' ? -d / 2 : d / 2;
    const face = side === 'N' ? 0.28 : -0.28;
    box(THREE, g, 0.18, 2.3, 0.5, fm, at - 0.85, 1.15, z);
    box(THREE, g, 0.18, 2.3, 0.5, fm, at + 0.85, 1.15, z);
    box(THREE, g, 1.9, 0.18, 0.5, fm, at, 2.35, z);
    plane(THREE, g, 1.55, 2.25, dm, at, 1.12, z + face, 0, side === 'N' ? 0 : Math.PI);
  } else {
    const x = side === 'W' ? -w / 2 : w / 2;
    const face = side === 'W' ? 0.28 : -0.28;
    box(THREE, g, 0.5, 2.3, 0.18, fm, x, 1.15, at - 0.85);
    box(THREE, g, 0.5, 2.3, 0.18, fm, x, 1.15, at + 0.85);
    box(THREE, g, 0.5, 0.18, 1.9, fm, x, 2.35, at);
    plane(THREE, g, 1.55, 2.25, dm, x + face, 1.12, at, 0, side === 'W' ? Math.PI / 2 : -Math.PI / 2);
  }
}

function bloodDecal(THREE, room, TEX, x, z, s = 1.5, ry = 0) {
  const m = plane(THREE, room.group, s, s,
    new THREE.MeshBasicMaterial({ map: TEX.blood, transparent: true, opacity: 0.85, depthWrite: false }),
    x, 0.015, z, -Math.PI / 2, ry);
  m.renderOrder = 1;
  return m;
}

function pointLight(THREE, room, color, intensity, dist, x, y, z, flicker = null) {
  const L = new THREE.PointLight(color, intensity, dist, 2);
  L.position.set(x, y, z);
  if (flicker) L.userData.flicker = { base: intensity, ...flicker };
  room.group.add(L);
  room.lights.push(L);
  return L;
}

// ---------- mesh de item coletável ----------
export function makePickupMesh(THREE, TEX, item, page) {
  const g = new THREE.Group();
  const M = (c, e = 0x000000) => new THREE.MeshLambertMaterial({ color: c, emissive: e });
  const addGlow = (tex, color, s) => {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({
      map: tex, color, transparent: true, opacity: 0.6,
      blending: THREE.AdditiveBlending, depthWrite: false,
    }));
    sp.scale.set(s, s, 1);
    g.add(sp);
  };
  switch (item) {
    case 'pistol': {
      box(THREE, g, 0.09, 0.12, 0.36, M(0x2a2a2e), 0, 0, 0);
      box(THREE, g, 0.08, 0.18, 0.1, M(0x4a3020), 0, -0.12, -0.1);
      break;
    }
    case 'shotgun': {
      box(THREE, g, 0.1, 0.1, 0.9, M(0x3a2c1c), 0, 0, 0);
      box(THREE, g, 0.06, 0.06, 0.9, M(0x2a2a2e), 0, 0.07, 0);
      break;
    }
    case 'ammo9': box(THREE, g, 0.34, 0.2, 0.24, M(0x4a5a2a), 0, 0, 0); break;
    case 'shell': box(THREE, g, 0.34, 0.2, 0.24, M(0x8a1a1a), 0, 0, 0); break;
    case 'pills': {
      const b = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.24, 8), M(0xd8d4c8));
      g.add(b);
      box(THREE, g, 0.1, 0.05, 0.1, M(0x2a5a8a), 0, 0.14, 0);
      break;
    }
    case 'lightflask': {
      const b = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.3, 8),
        new THREE.MeshLambertMaterial({ color: 0x9ae8ff, emissive: 0x2288aa }));
      g.add(b);
      addGlow(TEX.glowCyan, 0x66ddff, 1.1);
      break;
    }
    case 'ribbon': box(THREE, g, 0.26, 0.1, 0.2, M(0xa02838), 0, 0, 0); break;
    case 'revolver': {
      box(THREE, g, 0.08, 0.12, 0.4, M(0x889098), 0, 0, 0);
      box(THREE, g, 0.07, 0.18, 0.1, M(0x3a2010), 0, -0.12, -0.12);
      break;
    }
    case 'ammo38': box(THREE, g, 0.32, 0.2, 0.22, M(0x224488), 0, 0, 0); break;
    case 'grenade_launcher': {
      box(THREE, g, 0.12, 0.14, 0.7, M(0x2d3a28), 0, 0, 0);
      break;
    }
    case 'grenade_rounds': box(THREE, g, 0.36, 0.24, 0.26, M(0xaa6622), 0, 0, 0); break;
    case 'magnum': {
      box(THREE, g, 0.09, 0.14, 0.5, M(0xd0d8e0, 0x334455), 0, 0, 0);
      box(THREE, g, 0.08, 0.2, 0.12, M(0x3a1810), 0, -0.13, -0.14);
      addGlow(TEX.glowWarm, 0xffe066, 1.2);
      break;
    }
    case 'magnum_ammo': box(THREE, g, 0.34, 0.22, 0.24, M(0xb8860b), 0, 0, 0); break;
    case 'antidote': {
      const b = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.28, 8), M(0x44bb77, 0x114422));
      g.add(b);
      addGlow(TEX.glowCyan, 0x55ffaa, 0.9);
      break;
    }
    case 'clara_card': {
      box(THREE, g, 0.34, 0.04, 0.22, M(0x1188cc, 0x052244), 0, 0, 0);
      addGlow(TEX.glowCyan, 0x44bbff, 0.8);
      break;
    }
    case 'forest_key': case 'bento_key': case 'chapel_key': {
      const col = item === 'forest_key' ? 0x557766 : item === 'bento_key' ? 0x8899aa : 0xaa7733;
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.028, 6, 10), M(col));
      ring.position.y = 0.1; g.add(ring);
      box(THREE, g, 0.05, 0.24, 0.05, M(col), 0, -0.06, 0);
      box(THREE, g, 0.12, 0.05, 0.05, M(col), 0.04, -0.14, 0);
      addGlow(TEX.glowWarm, 0xffcc66, 0.85);
      break;
    }
    case 'lucia_locket': {
      const o = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), M(0xd4af37, 0x443311));
      g.add(o);
      addGlow(TEX.glowWarm, 0xffd700, 1.0);
      break;
    }
    case 'alencastro_dossier': {
      box(THREE, g, 0.34, 0.06, 0.46, M(0x8b6508), 0, 0, 0);
      addGlow(TEX.glowWarm, 0xffeedd, 0.7);
      break;
    }
    case 'smallkey': case 'rustkey': case 'basekey': {
      const col = item === 'rustkey' ? 0x7a4a22 : 0xc8a028;
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.025, 6, 10), M(col));
      ring.position.y = 0.1; g.add(ring);
      box(THREE, g, 0.05, 0.2, 0.05, M(col), 0, -0.05, 0);
      box(THREE, g, 0.1, 0.04, 0.05, M(col), 0.03, -0.12, 0);
      addGlow(TEX.glowWarm, 0xffcc66, 0.8);
      break;
    }
    case 'fuse': {
      const b = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.3, 8), M(0xd8d4c8));
      b.rotation.z = Math.PI / 2; g.add(b);
      box(THREE, g, 0.06, 0.1, 0.1, M(0x8a8f96), 0.16, 0, 0);
      box(THREE, g, 0.06, 0.1, 0.1, M(0x8a8f96), -0.16, 0, 0);
      addGlow(TEX.glowWarm, 0xffcc66, 0.8);
      break;
    }
    case 'crank': {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.04, 6, 12), M(0x5a5a62));
      g.add(ring);
      box(THREE, g, 0.05, 0.05, 0.25, M(0x5a5a62), 0, 0, 0.1);
      addGlow(TEX.glowWarm, 0xffcc66, 0.9);
      break;
    }
    case 'frag': {
      const o = new THREE.Mesh(new THREE.OctahedronGeometry(0.16),
        new THREE.MeshLambertMaterial({ color: 0x9ae8ff, emissive: 0x1899bb }));
      g.add(o);
      addGlow(TEX.glowCyan, 0x66eeff, 1.3);
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
// SALAS
// ============================================================
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

// ---------------- QUARTO ----------------
function buildQuarto(THREE, TEX) {
  const R = baseRoom(THREE, TEX, 'quarto', 'QUARTO 3', 10, 8, 3.0);
  R.fog = { c: 0x05050c, n: 5, f: 20 };
  R.ambient = 'quarto';
  const floorM = tm(THREE, TEX.floorWood, 3, 3);
  const wallM = tm(THREE, TEX.wallpaper, 4, 1.4);
  const ceilM = tm(THREE, TEX.ceiling, 4, 3);
  plane(THREE, R.group, 10, 8, floorM, 0, 0, 0, -Math.PI / 2);
  plane(THREE, R.group, 10, 8, ceilM, 0, 3.0, 0, Math.PI / 2);
  perimeter(THREE, R, 10, 8, 3.0, wallM, [{ side: 'S', at: 2.5, w: 1.7 }]);
  doorVisual(THREE, R, 'S', 2.5, 8, 10, TEX.doorWood);

  const woodM = tm(THREE, TEX.wood, 1, 1);
  const woodD = flat(THREE, 0x2e2014);
  // cama
  box(THREE, R.group, 2.2, 0.35, 1.6, woodM, -2.8, 0.3, -2.2);
  box(THREE, R.group, 2.2, 0.9, 0.12, woodM, -2.8, 0.7, -3.0);
  box(THREE, R.group, 2.0, 0.22, 1.44, tm(THREE, TEX.mattress, 1, 1), -2.8, 0.58, -2.2);
  box(THREE, R.group, 1.9, 0.1, 0.95, tm(THREE, TEX.blanket, 1, 1), -2.8, 0.68, -1.95);
  box(THREE, R.group, 0.7, 0.14, 0.5, tm(THREE, TEX.sheet, 1, 1), -3.3, 0.72, -2.75);
  box(THREE, R.group, 0.7, 0.14, 0.5, tm(THREE, TEX.sheet, 1, 1), -2.3, 0.72, -2.75);
  solid(R, -3.95, -3.05, -1.65, -1.35);
  // cadeira + urso
  box(THREE, R.group, 0.55, 0.08, 0.55, woodD, -3.6, 0.5, 1.6);
  box(THREE, R.group, 0.55, 0.7, 0.08, woodD, -3.6, 0.85, 1.32);
  for (const [lx, lz] of [[-3.85, 1.4], [-3.35, 1.4], [-3.85, 1.8], [-3.35, 1.8]])
    box(THREE, R.group, 0.07, 0.5, 0.07, woodD, lx, 0.25, lz);
  const tedM = tm(THREE, TEX.teddy, 1, 1);
  const ted = new THREE.Group(); ted.position.set(-3.6, 0.54, 1.6); R.group.add(ted);
  box(THREE, ted, 0.3, 0.34, 0.24, tedM, 0, 0.2, 0);
  const tedHead = new THREE.Mesh(new THREE.SphereGeometry(0.14, 7, 6), tedM);
  tedHead.position.set(0, 0.48, 0); ted.add(tedHead);
  box(THREE, ted, 0.1, 0.22, 0.1, tedM, -0.19, 0.2, 0);
  box(THREE, ted, 0.1, 0.22, 0.1, tedM, 0.19, 0.2, 0);
  solid(R, -3.95, 1.25, -3.25, 1.95);
  // gaveteiro
  box(THREE, R.group, 1.4, 1.0, 0.7, woodM, 2.8, 0.5, -3.4);
  box(THREE, R.group, 1.5, 0.06, 0.78, woodD, 2.8, 1.03, -3.4);
  for (let i = 0; i < 2; i++) {
    box(THREE, R.group, 1.2, 0.32, 0.03, woodD, 2.8, 0.32 + i * 0.4, -3.04);
    box(THREE, R.group, 0.08, 0.08, 0.05, flat(THREE, 0xc8a028), 2.8, 0.32 + i * 0.4, -3.0);
  }
  solid(R, 2.05, -3.8, 3.55, -3.0);
  // vela sobre o gaveteiro
  box(THREE, R.group, 0.08, 0.22, 0.08, flat(THREE, 0xd8ccb0), 3.2, 1.17, -3.4);
  box(THREE, R.group, 0.05, 0.09, 0.05, new THREE.MeshBasicMaterial({ color: 0xffb03a }), 3.2, 1.32, -3.4);
  pointLight(THREE, R, 0xff9a4a, 5, 8, 3.2, 1.6, -3.2, { amp: 1.6, speed: 9 });
  // relógio
  plane(THREE, R.group, 0.55, 0.55, new THREE.MeshLambertMaterial({ map: TEX.clock }), -1, 2.1, -3.96, 0, 0);
  box(THREE, R.group, 0.65, 0.65, 0.08, woodD, -1, 2.1, -4.0);
  // janela + cortinas
  plane(THREE, R.group, 1.3, 1.8, new THREE.MeshBasicMaterial({ map: TEX.window }), 1.5, 1.8, -3.96, 0, 0);
  box(THREE, R.group, 1.5, 0.12, 0.1, woodD, 1.5, 2.75, -3.9);
  box(THREE, R.group, 1.5, 0.12, 0.14, woodD, 1.5, 0.85, -3.9);
  plane(THREE, R.group, 0.4, 2.1, tm(THREE, TEX.curtain, 1, 1), 0.6, 1.75, -3.88, 0, 0);
  plane(THREE, R.group, 0.4, 2.1, tm(THREE, TEX.curtain, 1, 1), 2.4, 1.75, -3.88, 0, 0);
  pointLight(THREE, R, 0x5a7ac8, 6, 9, 1.5, 1.9, -2.8);
  // tapete
  plane(THREE, R.group, 3, 2, tm(THREE, TEX.rug, 1, 1), 0, 0.012, 0.3, -Math.PI / 2);
  // quadro
  plane(THREE, R.group, 0.8, 1.0, new THREE.MeshLambertMaterial({ map: TEX.paint3 }), -4.96, 1.8, -0.5, 0, Math.PI / 2);
  // luz geral fraca
  pointLight(THREE, R, 0x8a7a5a, 4, 12, 0, 2.6, 0.5);

  addCam(R, [-5, -4, 0.8, 4], [-4.2, 2.5, 3.2], [-1, 1.2, -1.0], 62);
  addCam(R, [0.8, -4, 5, 4], [4.2, 2.5, -3.2], [2.5, 1.2, 1.8], 62);

  addDoor(R, 2.5, 3.3, 1.25, 'Sair para o Corredor dos Quartos', 'corredor_quartos', -4.0, -2.5, 0);
  addInteract(R, -2.8, -1.1, 1.5, 'Examinar a cama', 'bed');
  addInteract(R, 2.8, -2.7, 1.3, 'Abrir a gaveta', 'drawer');
  addInteract(R, -3.6, 1.9, 1.2, 'Pegar o urso', 'teddy');
  addInteract(R, -1, -3.1, 1.2, 'Olhar o relógio', 'clock');
  addInteract(R, 1.5, -3.0, 1.3, 'Olhar a janela', 'window_q');
  addPickup(THREE, R, TEX, 'page', -0.5, 1.6, 1, 0, 0.06);

  R.fx = (dt, t) => {
    for (const L of R.lights) {
      if (L.userData.flicker) {
        const f = L.userData.flicker;
        L.intensity = f.base + Math.sin(t * f.speed) * f.amp * 0.5 + Math.sin(t * f.speed * 2.7) * f.amp * 0.3;
      }
    }
  };
  return R;
}

// ---------------- SAGUÃO ----------------
function buildSaguao(THREE, TEX) {
  const R = baseRoom(THREE, TEX, 'saguao', 'SAGUÃO PRINCIPAL', 16, 12, 4.2);
  R.fog = { c: 0x030304, n: 7, f: 30 };
  R.ambient = 'saguao';
  R.music = 'save';
  const floorM = tm(THREE, TEX.floorTile, 5, 4);
  const wallM = tm(THREE, TEX.wallDirty, 6, 2);
  const ceilM = tm(THREE, TEX.ceiling, 6, 5);
  plane(THREE, R.group, 16, 12, floorM, 0, 0, 0, -Math.PI / 2);
  plane(THREE, R.group, 16, 12, ceilM, 0, 4.2, 0, Math.PI / 2);
  perimeter(THREE, R, 16, 12, 4.2, wallM, [
    { side: 'S', at: -5.5, w: 1.9 },
    { side: 'E', at: 1, w: 1.9 },
    { side: 'W', at: -2, w: 1.9 },
  ]);
  doorVisual(THREE, R, 'S', -5.5, 12, 16, TEX.doorWood);
  doorVisual(THREE, R, 'E', 1, 12, 16, TEX.doorWood);
  doorVisual(THREE, R, 'W', -2, 12, 16, TEX.doorMetal);

  const woodD = flat(THREE, 0x2e2014);
  const marM = tm(THREE, TEX.statue, 1, 1);
  // carpete central
  plane(THREE, R.group, 2.6, 10.5, tm(THREE, TEX.carpet, 1, 5), 0, 0.012, 0.3, -Math.PI / 2);
  // estátua
  box(THREE, R.group, 1.4, 0.5, 1.4, marM, 0, 0.25, -3);
  box(THREE, R.group, 0.9, 1.0, 0.9, marM, 0, 1.0, -3);
  const st = new THREE.Group(); st.position.set(0, 1.5, -3); R.group.add(st);
  const robe = new THREE.Mesh(new THREE.ConeGeometry(0.42, 1.3, 7), marM);
  robe.position.y = 0.65; st.add(robe);
  const stHead = new THREE.Mesh(new THREE.SphereGeometry(0.17, 7, 6), marM);
  stHead.position.y = 1.45; st.add(stHead);
  box(THREE, st, 0.7, 0.14, 0.14, marM, 0, 1.15, 0.1);
  solid(R, -0.75, -3.75, 0.75, -2.25);
  // escada bloqueada (decoração NW)
  for (let i = 0; i < 5; i++) {
    box(THREE, R.group, 2.6 - i * 0.35, 0.28, 0.8, woodD, -6.4, 0.2 + i * 0.3, -4.6 + i * 0.05);
  }
  box(THREE, R.group, 2.4, 0.12, 0.12, flat(THREE, 0x3a3a3e), -6.4, 2.2, -4.2, 0.5);
  box(THREE, R.group, 0.5, 0.4, 0.7, flat(THREE, 0x4a4a4e), -5.6, 0.2, -4.0);
  box(THREE, R.group, 0.7, 0.3, 0.5, flat(THREE, 0x3a3a3e), -7.0, 0.15, -3.6);
  solid(R, -7.8, -5.2, -5.0, -3.9);
  // mesa do diário + vela
  box(THREE, R.group, 1.6, 0.1, 0.9, tm(THREE, TEX.wood, 1, 1), -6.5, 0.78, 2.5);
  for (const [lx, lz] of [[-7.2, 2.15], [-5.8, 2.15], [-7.2, 2.85], [-5.8, 2.85]])
    box(THREE, R.group, 0.09, 0.75, 0.09, woodD, lx, 0.38, lz);
  box(THREE, R.group, 0.42, 0.1, 0.55, tm(THREE, TEX.diaryCover, 1, 1), -6.7, 0.88, 2.5);
  box(THREE, R.group, 0.07, 0.25, 0.07, flat(THREE, 0xd8ccb0), -6.1, 0.95, 2.6);
  box(THREE, R.group, 0.05, 0.09, 0.05, new THREE.MeshBasicMaterial({ color: 0xffb03a }), -6.1, 1.1, 2.6);
  solid(R, -7.35, 2.0, -5.65, 3.0);
  pointLight(THREE, R, 0xff9a4a, 6, 9, -6.1, 1.5, 2.6, { amp: 1.8, speed: 8 });

  // Balcão de Recepção em 'U' (Folha P1)
  const cntM = tm(THREE, TEX.receptionCounter, 1, 1);
  box(THREE, R.group, 3.2, 1.0, 0.6, cntM, 2.0, 0.5, 0.0);
  box(THREE, R.group, 0.6, 1.0, 1.8, cntM, 3.3, 0.5, 0.9);
  box(THREE, R.group, 0.6, 1.0, 1.8, cntM, 0.7, 0.5, 0.9);
  solid(R, 0.4, -0.3, 3.6, 1.8);

  // Máquina de Escrever clássica (Typewriter) em cima do Balcão de Recepção
  box(THREE, R.group, 0.44, 0.15, 0.38, tm(THREE, TEX.typewriter, 1, 1), 2.0, 1.08, 0.0);
  box(THREE, R.group, 0.32, 0.32, 0.18, flat(THREE, 0x1b4d2e), 1.2, 1.25, 0.0);
  pointLight(THREE, R, 0xffdd99, 7, 7, 2.0, 1.45, 0.0);

  // Bebedouro com galão de água (Folha P1)
  box(THREE, R.group, 0.4, 1.3, 0.4, flat(THREE, 0xd0d8e0), -3.5, 0.65, 4.6);
  solid(R, -3.8, 4.3, -3.2, 4.9);

  // Planta ornamental em vaso (Folha P1)
  const plantVase = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.35, 0.7, 8), tm(THREE, TEX.vase, 1, 1));
  plantVase.position.set(-3.5, 0.35, -4.5); R.group.add(plantVase);
  solid(R, -3.8, -4.8, -3.2, -4.2);

  // vaso
  const vase = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.3, 0.7, 8), tm(THREE, TEX.vase, 1, 1));
  vase.position.set(6.5, 0.35, -4.5); R.group.add(vase);
  solid(R, 6.2, -4.8, 6.8, -4.2);
  // elevador (parede N, x=3)
  box(THREE, R.group, 2.6, 3.0, 0.3, flat(THREE, 0x1c1e22), 3, 1.5, -5.9);
  plane(THREE, R.group, 1.7, 2.4, new THREE.MeshLambertMaterial({ map: TEX.doorMetal }), 3, 1.2, -5.73, 0, 0);
  box(THREE, R.group, 2.6, 0.25, 0.35, flat(THREE, 0x33363c), 3, 2.95, -5.9);
  const elevLampM = new THREE.MeshBasicMaterial({ color: 0x331111 });
  box(THREE, R.group, 0.5, 0.12, 0.1, elevLampM, 3, 2.95, -5.7);
  R.elevLampM = elevLampM;
  solid(R, 1.65, -6.1, 4.35, -5.7);
  R.elevLight = pointLight(THREE, R, 0xaac8ff, 0, 7, 3, 2.6, -4.9);
  // lustre
  box(THREE, R.group, 0.08, 1.0, 0.08, flat(THREE, 0x1a1a1a), 0, 3.7, 0);
  const ch = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.08, 6, 12), flat(THREE, 0x6a5a28));
  ch.position.set(0, 3.15, 0); ch.rotation.x = Math.PI / 2; R.group.add(ch);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    box(THREE, R.group, 0.07, 0.2, 0.07, flat(THREE, 0xd8ccb0), Math.cos(a) * 0.7, 3.25, Math.sin(a) * 0.7);
  }
  const chGlow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: TEX.glowWarm, color: 0xffcc88, transparent: true, opacity: 0.5,
    blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  chGlow.scale.set(3, 3, 1); chGlow.position.set(0, 3.1, 0); R.group.add(chGlow);
  R.chandelier = pointLight(THREE, R, 0xffb060, 0, 16, 0, 2.9, 0);
  R.chGlow = chGlow;
  // quadros
  plane(THREE, R.group, 1.0, 1.25, new THREE.MeshLambertMaterial({ map: TEX.paint2 }), 7.96, 2.2, -3, 0, -Math.PI / 2);
  plane(THREE, R.group, 1.0, 1.25, new THREE.MeshLambertMaterial({ map: TEX.paint1 }), -7.96, 2.2, 3.5, 0, Math.PI / 2);
  // janelas altas
  for (const wx of [-2, 5]) {
    plane(THREE, R.group, 1.2, 1.6, new THREE.MeshBasicMaterial({ map: TEX.window }), wx, 2.8, -5.96, 0, 0);
  }
  pointLight(THREE, R, 0x4a5a88, 5, 14, 1.5, 2.8, -4.5);
  bloodDecal(THREE, R, TEX, 4.5, 2.5, 1.8, 0.5);

  addCam(R, [-8, 0, -1, 6], [-2.0, 3.5, 1.2], [-5.2, 1.2, 3.6], 60);
  addCam(R, [-8, -6, -1, 0], [-2.5, 3.5, 0.5], [-5.4, 1.2, -2.0], 60);
  addCam(R, [-1, -6, 3, 6], [1.0, 3.7, -1.2], [0.0, 1.2, 2.0], 60);
  addCam(R, [3, -6, 8, 6], [3.5, 3.5, -0.5], [6.0, 1.2, 0.0], 58);

  addDoor(R, -7.1, 3.5, 1.4, 'Ala de Internação (Corredor dos Quartos)', 'corredor_quartos', 5.5, 0.0, -Math.PI / 2);
  addDoor(R, 7.1, 1, 1.3, 'Ir para a enfermaria', 'enfermaria', -6.4, 1.0, Math.PI / 2);
  addDoor(R, -7.1, -2, 1.3, 'Descer ao porão', 'porao', 5.4, -2.0, -Math.PI / 2,
    { need: { item: 'basekey' }, consume: true, setFlag: 'poraoOpen', msg: 'Trancada. A placa diz "PORÃO — PROIBIDO". Precisa da CHAVE DO PORÃO.' });
  addDoor(R, 3, -5.0, 1.5, 'Chamar o elevador', 'terraco', 3.0, 1.8, Math.PI,
    { need: { flag: 'fuseOn' }, elevator: true, msg: 'elevador_off' });
  addDoor(R, 0, 5.0, 1.4, 'Portão para os Jardins da Floresta', 'floresta', 0, -14.0, 0,
    { need: { item: 'forest_key' }, setFlag: 'forestUnlocked', msg: 'Portão de ferro fundido trancado. Precisa da CHAVE DO PORTÃO DE FERRO.' });
  addDoor(R, 7.1, -3.5, 1.3, 'Entrar na Capela', 'capela', 0, 8.0, Math.PI);
  addDoor(R, -2.5, 5.0, 1.3, 'Ir à Estufa Botânica (Ala Sul)', 'estufa', 0, -4.0, 0);
  addDoor(R, -2.0, -5.0, 1.3, 'Ir ao Cemitério das Lápides (Ala Norte)', 'cemiterio', 0, 4.5, Math.PI);
  addDoor(R, 7.1, -1.0, 1.3, 'Pátio Externo & Canil (Ala Leste)', 'jardim', -7.5, -1.0, Math.PI / 2);
  addDoor(R, -6.4, -4.0, 1.4, 'Subir ao Mezanino (2º Andar)', 'mezanino', 5.5, 3.0, 0);

  addInteract(R, 0, -2.1, 1.5, 'Examinar a estátua', 'statue');
  addInteract(R, 2.0, 1.1, 1.6, 'Usar a Máquina de Escrever da Recepção', 'save');
  addInteract(R, 6.5, -3.9, 1.2, 'Vasculhar o vaso', 'vase');
  addInteract(R, -6.4, -3.6, 1.6, 'Olhar a escada', 'stairs');

  addPickup(THREE, R, TEX, 'ribbon', 2.8, 1.0, 2);
  addPickup(THREE, R, TEX, 'page', -6.0, 3.4, 1, 1, 0.06);
  addPickup(THREE, R, TEX, 'ammo9', 6.8, 4.8, 12);

  addSpawn(R, 'sombra', -2.5, 2.5);
  addSpawn(R, 'infectado', -2.0, 1.0);
  addSpawn(R, 'rastejador', -4.5, -2.5);
  addSpawn(R, 'infectado', 5.0, -1.5);

  R.fx = (dt, t, game) => {
    const on = game.flags.fuseOn;
    R.chandelier.intensity += (((on ? 26 : 0)) - R.chandelier.intensity) * Math.min(1, dt * 2);
    R.chGlow.material.opacity += (((on ? 0.55 : 0.02)) - R.chGlow.material.opacity) * Math.min(1, dt * 2);
    R.elevLight.intensity += (((on ? 8 : 0)) - R.elevLight.intensity) * Math.min(1, dt * 2);
    R.elevLampM.color.setHex(on ? 0x66ff88 : 0x331111);
    for (const L of R.lights) {
      if (L.userData.flicker) {
        const f = L.userData.flicker;
        L.intensity = f.base + Math.sin(t * f.speed) * f.amp * 0.5 + Math.sin(t * f.speed * 2.7) * f.amp * 0.3;
      }
    }
  };
  return R;
}

// ---------------- ENFERMARIA ----------------
function buildEnfermaria(THREE, TEX) {
  const R = baseRoom(THREE, TEX, 'enfermaria', 'ENFERMARIA — ALA LESTE', 18, 8, 3.0);
  R.fog = { c: 0x04060a, n: 6, f: 26 };
  R.ambient = 'enfermaria';
  const floorM = tm(THREE, TEX.floorTile, 6, 3);
  const wallM = tm(THREE, TEX.wallTile, 7, 1.4);
  const ceilM = tm(THREE, TEX.ceiling, 7, 3);
  plane(THREE, R.group, 18, 8, floorM, 0, 0, 0, -Math.PI / 2);
  plane(THREE, R.group, 18, 8, ceilM, 0, 3.0, 0, Math.PI / 2);
  perimeter(THREE, R, 18, 8, 3.0, wallM, [
    { side: 'W', at: 1, w: 1.9 },
    { side: 'N', at: 4, w: 1.7 },
  ]);
  doorVisual(THREE, R, 'W', 1, 8, 18, TEX.doorWood);
  doorVisual(THREE, R, 'N', 4, 8, 18, TEX.doorWood);

  const frameM = flat(THREE, 0x8a8f96);
  const sheetM = tm(THREE, TEX.sheet, 1, 1);
  const blankM = tm(THREE, TEX.blanket, 1, 1);
  const bed = (x, z, ry = 0) => {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; R.group.add(g);
    box(THREE, g, 2.0, 0.12, 0.9, frameM, 0, 0.55, 0);
    box(THREE, g, 1.9, 0.18, 0.85, sheetM, 0, 0.68, 0);
    box(THREE, g, 1.1, 0.08, 0.87, blankM, -0.35, 0.78, 0);
    box(THREE, g, 0.45, 0.12, 0.6, sheetM, 0.7, 0.8, 0);
    for (const [lx, lz] of [[-0.9, -0.38], [0.9, -0.38], [-0.9, 0.38], [0.9, 0.38]])
      box(THREE, g, 0.07, 0.55, 0.07, frameM, lx, 0.28, lz);
    box(THREE, g, 0.07, 1.0, 0.9, frameM, 0.95, 0.5, 0);
    box(THREE, g, 0.07, 1.0, 0.9, frameM, -0.95, 0.5, 0);
  };
  // leitos norte e sul
  bed(-6, -3.1); bed(-2, -3.1); bed(2, -3.1);
  bed(-4, 3.1); bed(0, 3.1); bed(6.5, 3.1);
  solid(R, -7.1, -3.6, -4.9, -2.6);
  solid(R, -3.1, -3.6, -0.9, -2.6);
  solid(R, 0.9, -3.6, 3.1, -2.6);
  solid(R, -5.1, 2.6, -2.9, 3.6);
  solid(R, -1.1, 2.6, 1.1, 3.6);
  solid(R, 5.4, 2.6, 7.6, 3.6);
  // cortinas
  const curtM = tm(THREE, TEX.curtain, 1, 1);
  for (const [cx, cz] of [[-4, -2.5], [0, -2.5], [-2, 2.5], [2.5, 2.5]]) {
    box(THREE, R.group, 2.2, 0.06, 0.06, frameM, cx, 2.1, cz);
    plane(THREE, R.group, 2.0, 1.7, curtM, cx, 1.2, cz, 0, 0);
  }
  // quadro de força
  box(THREE, R.group, 0.7, 0.9, 0.18, flat(THREE, 0x3c4046), -4, 1.6, -3.9);
  plane(THREE, R.group, 0.6, 0.8, new THREE.MeshLambertMaterial({ map: TEX.fusebox }), -4, 1.6, -3.79, 0, 0);
  // armário de remédios
  box(THREE, R.group, 1.2, 2.1, 0.6, tm(THREE, TEX.cabinet, 1, 1), 7.5, 1.05, -3.5);
  solid(R, 6.85, -3.85, 8.15, -3.15);
  // cadeira de rodas
  const wc = new THREE.Group(); wc.position.set(-7, 0, -1); wc.rotation.y = 0.6; R.group.add(wc);
  for (const s of [-1, 1]) {
    const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.04, 6, 12), frameM);
    wheel.position.set(s * 0.3, 0.3, 0); wc.add(wheel);
  }
  box(THREE, wc, 0.5, 0.08, 0.45, flat(THREE, 0x2a2a30), 0, 0.5, 0);
  box(THREE, wc, 0.5, 0.5, 0.08, flat(THREE, 0x2a2a30), 0, 0.75, -0.22);
  solid(R, -7.5, -1.5, -6.5, -0.5);
  // macas / sujeira
  bloodDecal(THREE, R, TEX, -1, 0.5, 2.0, 0.3);
  bloodDecal(THREE, R, TEX, 5.5, -1.5, 1.4, 1.2);
  // luminárias (uma piscando)
  for (const fx of [-6, 0, 6]) {
    box(THREE, R.group, 1.6, 0.08, 0.4, flat(THREE, 0x9a9a9a), fx, 2.94, 0);
    box(THREE, R.group, 1.4, 0.05, 0.3, new THREE.MeshBasicMaterial({ color: 0xcfe8ff }), fx, 2.89, 0);
  }
  pointLight(THREE, R, 0xbfe0ff, 14, 12, -6, 2.6, 0);
  R.flickLight = pointLight(THREE, R, 0xbfe0ff, 12, 12, 0, 2.6, 0, { amp: 8, speed: 23, hard: true });
  pointLight(THREE, R, 0x9fd0c8, 12, 12, 6, 2.6, 0);

  addCam(R, [-9, -4, -3, 4], [-4.5, 2.6, 1.8], [-6.4, 1.2, 1.0], 60);
  addCam(R, [-3, -4, 3, 4], [0.0, 2.6, 1.8], [0, 1.2, -1.0], 62);
  addCam(R, [3, -4, 9, 4], [5.5, 2.6, 1.8], [4.0, 1.2, -1.5], 60);

  addDoor(R, -8.2, 1, 1.3, 'Voltar ao saguão', 'saguao', 5.4, 1.0, -Math.PI / 2);
  addDoor(R, 4, -3.2, 1.3, 'Abrir o consultório', 'consultorio', -1.0, 1.5, Math.PI,
    { need: { item: 'rustkey' }, consume: true, setFlag: 'consultOpen', msg: 'Trancada. A fechadura está enferrujada. Precisa da CHAVE ENFERRUJADA.' });

  addInteract(R, -4, -3.0, 1.4, 'Examinar o quadro de força', 'fusebox');
  addInteract(R, 7.5, -2.8, 1.4, 'Vasculhar o armário', 'armario');
  addInteract(R, 2, -2.4, 1.4, 'Examinar o leito 3', 'cama3');
  addInteract(R, -7, -0.4, 1.3, 'Olhar a cadeira de rodas', 'cadeira');
  addInteract(R, 0, -2.4, 1.2, 'Olhar atrás da cortina', 'cortina');

  addPickup(THREE, R, TEX, 'ammo9', -8.2, -3.2, 12);
  addPickup(THREE, R, TEX, 'shell', 8.3, 3.3, 6);
  addPickup(THREE, R, TEX, 'pills', 0.5, -2.2, 1);
  addPickup(THREE, R, TEX, 'page', -6, 2.4, 1, 2, 0.06);
  addPickup(THREE, R, TEX, 'page', 2, -2.2, 1, 3, 0.85);

  addSpawn(R, 'sombra', -3, 0.5);
  addSpawn(R, 'enfermeira', 5.5, 1.5);
  addSpawn(R, 'infectado', 0.5, 0.8);
  addSpawn(R, 'lamento', 7.8, -1.5);

  R.fx = (dt, t) => {
    const f = R.flickLight;
    // pisca-pisca agressivo estilo hospital
    const n = Math.sin(t * 23) * Math.sin(t * 7.3) * Math.sin(t * 41);
    f.intensity = n > -0.2 ? 13 : 1.5;
  };
  return R;
}

// ---------------- CONSULTÓRIO ----------------
function buildConsultorio(THREE, TEX) {
  const R = baseRoom(THREE, TEX, 'consultorio', 'CONSULTÓRIO', 10, 8, 3.0);
  R.fog = { c: 0x060503, n: 5, f: 20 };
  R.ambient = 'consultorio';
  const floorM = tm(THREE, TEX.floorWood, 3, 3);
  const wallM = tm(THREE, TEX.wallpaper, 4, 1.4);
  const ceilM = tm(THREE, TEX.ceiling, 4, 3);
  plane(THREE, R.group, 10, 8, floorM, 0, 0, 0, -Math.PI / 2);
  plane(THREE, R.group, 10, 8, ceilM, 0, 3.0, 0, Math.PI / 2);
  perimeter(THREE, R, 10, 8, 3.0, wallM, [{ side: 'S', at: -1, w: 1.7 }]);
  doorVisual(THREE, R, 'S', -1, 8, 10, TEX.doorWood);

  const woodM = tm(THREE, TEX.wood, 1, 1);
  const woodD = flat(THREE, 0x2e2014);
  // escrivaninha
  box(THREE, R.group, 2.2, 0.12, 1.1, woodM, 2, 0.78, -2.5);
  box(THREE, R.group, 0.12, 0.75, 1.0, woodD, 1.0, 0.38, -2.5);
  box(THREE, R.group, 0.12, 0.75, 1.0, woodD, 3.0, 0.38, -2.5);
  box(THREE, R.group, 1.0, 0.55, 0.9, woodD, 2.55, 0.35, -2.5);
  // papéis + poema
  plane(THREE, R.group, 0.35, 0.45, new THREE.MeshLambertMaterial({ map: TEX.paper }), 1.7, 0.85, -2.4, -Math.PI / 2, 0.3);
  plane(THREE, R.group, 0.35, 0.45, new THREE.MeshLambertMaterial({ map: TEX.paper }), 2.3, 0.85, -2.6, -Math.PI / 2, -0.2);
  // luminária de mesa
  box(THREE, R.group, 0.25, 0.05, 0.25, flat(THREE, 0x1a1a1a), 2.8, 0.87, -2.8);
  box(THREE, R.group, 0.05, 0.4, 0.05, flat(THREE, 0x1a1a1a), 2.8, 1.05, -2.8);
  box(THREE, R.group, 0.3, 0.15, 0.2, new THREE.MeshBasicMaterial({ color: 0xffe0a0 }), 2.7, 1.25, -2.7);
  pointLight(THREE, R, 0xffc070, 7, 8, 2.7, 1.4, -2.5);
  // cadeira
  box(THREE, R.group, 0.55, 0.08, 0.55, woodD, 2, 0.5, -1.5);
  box(THREE, R.group, 0.55, 0.7, 0.08, woodD, 2, 0.85, -1.25);
  solid(R, 0.85, -3.1, 3.15, -1.9);
  solid(R, 1.7, -1.8, 2.3, -1.2);
  // cofre
  box(THREE, R.group, 0.9, 1.1, 0.7, flat(THREE, 0x2e3238), -3, 0.55, -3.55);
  plane(THREE, R.group, 0.8, 1.0, new THREE.MeshLambertMaterial({ map: TEX.safe }), -3, 0.55, -3.19, 0, 0);
  solid(R, -3.5, -3.95, -2.5, -3.15);
  // estante
  box(THREE, R.group, 0.5, 2.4, 3.6, woodD, 4.65, 1.2, -0.5);
  plane(THREE, R.group, 3.5, 2.3, tm(THREE, TEX.bookcase, 2, 1), 4.38, 1.2, -0.5, 0, -Math.PI / 2);
  solid(R, 4.35, -2.4, 4.95, 1.4);
  // quadro do fundador
  plane(THREE, R.group, 0.9, 1.15, new THREE.MeshLambertMaterial({ map: TEX.paint1 }), -4.96, 1.8, 0.5, 0, Math.PI / 2);
  // mesa lateral + remédios
  box(THREE, R.group, 1.0, 0.75, 0.6, woodM, -3.5, 0.38, 2.8);
  box(THREE, R.group, 0.15, 0.25, 0.15, flat(THREE, 0xd8d4c8), -3.6, 0.88, 2.8);
  box(THREE, R.group, 0.12, 0.2, 0.12, flat(THREE, 0x7a2a2a), -3.3, 0.85, 2.9);
  solid(R, -4.05, 2.45, -2.95, 3.15);
  // tapete
  plane(THREE, R.group, 2.6, 1.8, tm(THREE, TEX.rug, 1, 1), 0, 0.012, 0.5, -Math.PI / 2);
  pointLight(THREE, R, 0x8a7a5a, 4, 12, 0, 2.6, 0.5);

  addCam(R, [-5, -4, 0.5, 4], [-3.5, 2.5, -2.8], [-1.0, 1.2, 1.5], 62);
  addCam(R, [0.5, -4, 5, 4], [3.5, 2.5, -2.8], [2.0, 1.2, 0.0], 62);

  addDoor(R, -1, 3.2, 1.3, 'Voltar à enfermaria', 'enfermaria', 4.0, -1.5, 0);

  addInteract(R, 2, -1.7, 1.4, 'Ler os papéis', 'desk');
  addInteract(R, -3, -3.0, 1.3, 'Abrir o cofre', 'safe');
  addInteract(R, 4.2, -1.5, 1.3, 'Vasculhar a estante', 'estante');
  addInteract(R, -4.4, 0.5, 1.3, 'Examinar o retrato', 'painting');

  addPickup(THREE, R, TEX, 'fuse', 3.9, 0.9, 1, null, 0.9);
  addPickup(THREE, R, TEX, 'ribbon', -3.5, 2.2, 1);
  addPickup(THREE, R, TEX, 'ammo9', 0.5, -3.3, 12);
  addPickup(THREE, R, TEX, 'page', 1.2, 0.8, 1, 4, 0.06);

  addSpawn(R, 'enfermeira', -1.5, 1.2);
  addSpawn(R, 'infectado', 1.5, 1.5);
  return R;
}

// ---------------- PORÃO ----------------
function buildPorao(THREE, TEX) {
  const R = baseRoom(THREE, TEX, 'porao', 'PORÃO', 16, 12, 3.0);
  R.fog = { c: 0x020203, n: 4, f: 19 };
  R.ambient = 'porao';
  const floorM = tm(THREE, TEX.stoneFloor, 5, 4);
  const wallM = tm(THREE, TEX.wallStone, 6, 1.4);
  const ceilM = tm(THREE, TEX.ceiling, 6, 5);
  plane(THREE, R.group, 16, 12, floorM, 0, 0, 0, -Math.PI / 2);
  plane(THREE, R.group, 16, 12, ceilM, 0, 3.0, 0, Math.PI / 2);
  perimeter(THREE, R, 16, 12, 3.0, wallM, [{ side: 'E', at: -2, w: 1.9 }]);
  doorVisual(THREE, R, 'E', -2, 12, 16, TEX.doorMetal);

  const rustM = tm(THREE, TEX.rust, 1, 1);
  const pipeM = tm(THREE, TEX.pipe, 1, 3);
  // caldeira
  box(THREE, R.group, 2.4, 2.2, 1.6, tm(THREE, TEX.boiler, 1, 1), 5, 1.1, -4.8);
  box(THREE, R.group, 2.6, 0.25, 1.8, rustM, 5, 2.3, -4.8);
  solid(R, 3.7, -5.7, 6.3, -3.9);
  pointLight(THREE, R, 0xff6a22, 14, 11, 5, 1.2, -3.6, { amp: 4, speed: 11 });
  // canos no teto
  for (const pz of [-2, 0, 2]) {
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 15, 8), pipeM);
    pipe.rotation.z = Math.PI / 2;
    pipe.position.set(0, 2.75, pz);
    R.group.add(pipe);
  }
  const vpipe = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 2.7, 8), pipeM);
  vpipe.position.set(1.5, 1.35, -1); R.group.add(vpipe);
  box(THREE, R.group, 0.5, 0.6, 0.5, rustM, 1.5, 0.3, -1);
  // volante da válvula
  const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.05, 6, 12), flat(THREE, 0x8a1a1a));
  wheel.position.set(1.5, 1.5, -0.82); R.group.add(wheel);
  R.valveWheel = wheel;
  solid(R, 1.2, -1.3, 1.8, -0.7);
  // água (alagamento) — metade oeste
  const waterT = TEX.water.clone(); waterT.needsUpdate = true; waterT.repeat.set(5, 7);
  const water = plane(THREE, R.group, 7.5, 11.5,
    new THREE.MeshBasicMaterial({ map: waterT, transparent: true, opacity: 0.88 }),
    -4.25, 0.32, 0, -Math.PI / 2);
  water.renderOrder = 2;
  R.waterMesh = water;
  R.waterTex = waterT;
  plane(THREE, R.group, 7.5, 11.5, basic(THREE, 0x020608), -4.25, 0.01, 0, -Math.PI / 2);
  // degrau / borda da área alagada
  box(THREE, R.group, 0.3, 0.4, 11.5, flat(THREE, 0x3a3a3e), -0.4, 0.2, 0);
  solid(R, -8, -6, -0.55, 6, 'water'); // removido ao drenar
  // cavalete da escopeta (área oeste)
  box(THREE, R.group, 1.6, 0.1, 0.5, tm(THREE, TEX.wood, 1, 1), -6, 0.9, 4.8);
  box(THREE, R.group, 0.1, 0.9, 0.1, tm(THREE, TEX.wood, 1, 1), -6.6, 0.45, 4.8);
  box(THREE, R.group, 0.1, 0.9, 0.1, tm(THREE, TEX.wood, 1, 1), -5.4, 0.45, 4.8);
  solid(R, -6.85, 4.5, -5.15, 5.1);
  // engradados
  const crateM = tm(THREE, TEX.wood, 1, 1);
  box(THREE, R.group, 1.1, 1.1, 1.1, crateM, -6, 0.55, -4.5);
  box(THREE, R.group, 0.9, 0.9, 0.9, crateM, -4.8, 0.45, -4.8);
  box(THREE, R.group, 0.8, 0.8, 0.8, crateM, -5.9, 1.5, -4.5);
  solid(R, -6.6, -5.1, -4.3, -3.9);
  // prateleiras leste
  box(THREE, R.group, 0.6, 2.0, 3.0, rustM, 7.5, 1.0, 3.5);
  for (let i = 0; i < 3; i++) box(THREE, R.group, 0.65, 0.06, 3.0, flat(THREE, 0x2a2a2e), 7.5, 0.6 + i * 0.6, 3.5);
  box(THREE, R.group, 0.4, 0.3, 0.5, flat(THREE, 0x6a6a6e), 7.5, 0.8, 2.8);
  box(THREE, R.group, 0.35, 0.4, 0.4, flat(THREE, 0x4a5a2a), 7.5, 1.4, 4.2);
  solid(R, 7.15, 1.9, 7.85, 5.1);
  bloodDecal(THREE, R, TEX, 3, 2, 2.2, 0.8);
  bloodDecal(THREE, R, TEX, -3, -3, 1.6, 2.0);
  pointLight(THREE, R, 0xff8a3a, 6, 9, 3, 2.4, 2, { amp: 2, speed: 6 });
  pointLight(THREE, R, 0x3a5a7a, 5, 12, -5, 2.4, 0);

  // Alçapão para a Floresta (lado seco leste) com escada de ferro
  plane(THREE, R.group, 1.4, 1.4, new THREE.MeshLambertMaterial({ map: TEX.doorMetal }), 3.5, 0.02, 4.2, -Math.PI / 2);
  for (let ry = 0.4; ry <= 2.8; ry += 0.5) {
    box(THREE, R.group, 0.8, 0.05, 0.08, flat(THREE, 0x4a4a4e), 3.5, ry, 5.85);
  }

  // Portal de luz pós-chefe (conclusão da campanha de Clara)
  const portal = new THREE.Group(); portal.position.set(0, 1.6, 0); portal.visible = false;
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.0, 0.12, 8, 20),
    new THREE.MeshBasicMaterial({ color: 0xbfefff }));
  portal.add(ring);
  const disc = new THREE.Mesh(new THREE.CircleGeometry(0.95, 20),
    new THREE.MeshBasicMaterial({ color: 0xeafcff, transparent: true, opacity: 0.9 }));
  portal.add(disc);
  const pglow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: TEX.glowWarm, color: 0xfff2cc, transparent: true, opacity: 0.8,
    blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  pglow.scale.set(4, 4, 1); portal.add(pglow);
  R.group.add(portal);
  R.portal = portal;
  R.portalLight = pointLight(THREE, R, 0xfff2cc, 0, 14, 0, 1.6, 0);

  addCam(R, [0, -6, 8, 6], [5.5, 2.5, 4.0], [5.0, 1.2, -2.0], 60);
  addCam(R, [-4, -6, 0, 6], [-1.5, 2.5, 4.5], [0.0, 1.2, 0.0], 62);
  addCam(R, [-8, -6, -4, 6], [-5.5, 2.5, 4.0], [-5.0, 1.2, -1.0], 60);

  addDoor(R, 7.2, -2, 1.3, 'Voltar ao saguão', 'saguao', -5.4, -2.0, Math.PI / 2);
  addDoor(R, 3.5, 4.2, 1.4, 'Subir pelo Alçapão para a Floresta', 'floresta', -8.5, -0.5, 0);

  addInteract(R, 1.5, -0.3, 1.5, 'Girar a válvula', 'valve');
  addInteract(R, 5, -3.7, 1.6, 'Examinar a caldeira', 'boiler');
  addInteract(R, -6, -3.8, 1.5, 'Vasculhar o engradado', 'crate');
  addInteract(R, 0, 0, 1.6, 'Atravessar o portal de luz', 'portal', (f) => !!f.bossDead);

  addPickup(THREE, R, TEX, 'shotgun', -6, 4.8, 1, null, 1.05);
  addPickup(THREE, R, TEX, 'shell', -5, -2.5, 12);
  addPickup(THREE, R, TEX, 'ammo9', 6.5, 0.5, 24);
  addPickup(THREE, R, TEX, 'pills', 2.5, 5.2, 1);
  addPickup(THREE, R, TEX, 'pills', -3, 5.2, 1);
  addPickup(THREE, R, TEX, 'ribbon', 2, 5.2, 1);
  addPickup(THREE, R, TEX, 'page', 6, 4.5, 1, 5, 0.06);
  addPickup(THREE, R, TEX, 'page', -7.2, 0.5, 1, 6, 0.06);

  addSpawn(R, 'aberracao', -2.5, -4);
  addSpawn(R, 'rastejador', 4, 2.5);
  addSpawn(R, 'lamento', -4, 2);
  addSpawn(R, 'infectado', 3.0, -1.5);

  R.fx = (dt, t, game) => {
    if (R.waterTex) { R.waterTex.offset.x = (t * 0.02) % 1; R.waterTex.offset.y = (t * 0.013) % 1; }
    const drained = game.flags.valveOpen;
    if (R.waterMesh) R.waterMesh.visible = !drained;
    if (R.valveWheel && drained) R.valveWheel.rotation.z += dt * 0.2;
    if (R.portal) R.portal.visible = !!game.flags.bossDead;
    if (R.portalLight) R.portalLight.intensity = game.flags.bossDead ? 16 + Math.sin(t * 6) * 4 : 0;
    for (const L of R.lights) {
      if (L.userData.flicker) {
        const f = L.userData.flicker;
        L.intensity = f.base + Math.sin(t * f.speed) * f.amp * 0.5 + Math.sin(t * f.speed * 2.7) * f.amp * 0.3;
      }
    }
  };
  return R;
}

// ---------------- TERRAÇO ----------------
function buildTerraco(THREE, TEX) {
  const R = baseRoom(THREE, TEX, 'terraco', 'TERRAÇO — MEMORIAL', 14, 12, 0);
  R.fog = { c: 0x05070f, n: 10, f: 55 };
  R.ambient = 'terraco';
  R.openSky = true;
  const floorM = tm(THREE, TEX.stoneFloor, 5, 4);
  plane(THREE, R.group, 14, 12, floorM, 0, 0, 0, -Math.PI / 2);
  // céu
  const skyM = new THREE.MeshBasicMaterial({ map: TEX.sky, fog: false });
  const skyN = plane(THREE, R.group, 80, 26, skyM, 0, 10, -34, 0, 0);
  const skyS = plane(THREE, R.group, 80, 26, skyM, 0, 10, 34, 0, Math.PI);
  const skyE = plane(THREE, R.group, 80, 26, skyM, 34, 10, 0, 0, -Math.PI / 2);
  const skyW = plane(THREE, R.group, 80, 26, skyM, -34, 10, 0, 0, Math.PI / 2);
  for (const s of [skyN, skyS, skyE, skyW]) { s.renderOrder = -10; s.frustumCulled = false; }
  // parapeito + cerca
  const parM = tm(THREE, TEX.stoneFloor, 4, 1);
  const mkPar = (x, z, w, d) => {
    box(THREE, R.group, w, 1.1, d, parM, x, 0.55, z);
    solid(R, x - w / 2, z - d / 2, x + w / 2, z + d / 2);
  };
  mkPar(0, -6, 14.8, 0.5); mkPar(0, 6, 14.8, 0.5);
  mkPar(-7, 0, 0.5, 12.5); mkPar(7, 0, 0.5, 12.5);
  const fenceT = (wdt, x, y, z, ry) => {
    const t = TEX.fence.clone(); t.needsUpdate = true; t.repeat.set(wdt / 1.2, 1.4);
    const m = new THREE.MeshBasicMaterial({ map: t, transparent: true, alphaTest: 0.3, side: THREE.DoubleSide });
    plane(THREE, R.group, wdt, 1.6, m, x, y, z, 0, ry);
  };
  fenceT(14, 0, 1.9, -6, 0); fenceT(14, 0, 1.9, 6, 0);
  fenceT(12, -7, 1.9, 0, Math.PI / 2); fenceT(12, 7, 1.9, 0, Math.PI / 2);
  // casa do elevador
  box(THREE, R.group, 3.4, 2.8, 1.3, tm(THREE, TEX.wallStone, 2, 2), 3, 1.4, 5.2);
  plane(THREE, R.group, 1.7, 2.3, new THREE.MeshLambertMaterial({ map: TEX.doorMetal }), 3, 1.15, 4.53, 0, Math.PI);
  box(THREE, R.group, 0.5, 0.12, 0.1, new THREE.MeshBasicMaterial({ color: 0x66ff88 }), 3, 2.6, 4.5);
  solid(R, 1.25, 4.5, 4.75, 5.85);
  pointLight(THREE, R, 0xaac8ff, 7, 8, 3, 2.5, 3.8);
  // memorial
  const altM = tm(THREE, TEX.altar, 1, 1);
  box(THREE, R.group, 2.6, 0.3, 2.6, altM, 0, 0.15, -4);
  box(THREE, R.group, 1.6, 0.9, 1.6, altM, 0, 0.75, -4);
  box(THREE, R.group, 0.7, 2.2, 0.7, altM, 0, 2.2, -4);

  // Heliponto demarcado no chão de concreto (Folha P3)
  plane(THREE, R.group, 7.5, 7.5, new THREE.MeshLambertMaterial({ map: TEX.heliPad }), 2.0, 0.015, 0.5, -Math.PI / 2);

  // brasas/velas do memorial
  for (const [cx, cz] of [[-1.0, -3.2], [1.0, -3.2], [-1.0, -4.8], [1.0, -4.8]]) {
    box(THREE, R.group, 0.12, 0.3, 0.12, flat(THREE, 0xd8ccb0), cx, 0.45, cz);
  }
  solid(R, -1.35, -5.35, 1.35, -2.65);
  // gemas dos fragmentos (aparecem conforme coleta)
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.11),
      new THREE.MeshLambertMaterial({ color: 0x9ae8ff, emissive: 0x1899bb }));
    gem.position.set(Math.cos(a) * 0.95, 1.32, -4 + Math.sin(a) * 0.95);
    gem.visible = false;
    R.group.add(gem);
    R.memorialGems.push(gem);
  }
  R.memorialLight = pointLight(THREE, R, 0x66ccff, 0, 10, 0, 1.8, -4);
  // portal de luz (após o chefe) — ao sul do altar, em área aberta
  const portal = new THREE.Group(); portal.position.set(0, 1.7, -1.2); portal.visible = false;
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.0, 0.12, 8, 20),
    new THREE.MeshBasicMaterial({ color: 0xbfefff }));
  portal.add(ring);
  const disc = new THREE.Mesh(new THREE.CircleGeometry(0.95, 20),
    new THREE.MeshBasicMaterial({ color: 0xeafcff, transparent: true, opacity: 0.9 }));
  portal.add(disc);
  const pglow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: TEX.glowWarm, color: 0xfff2cc, transparent: true, opacity: 0.8,
    blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  pglow.scale.set(4, 4, 1); portal.add(pglow);
  R.group.add(portal);
  R.portal = portal;
  R.portalLight = pointLight(THREE, R, 0xfff2cc, 0, 14, 0, 1.7, -4);
  // caixas / antena
  box(THREE, R.group, 1.0, 1.0, 1.0, tm(THREE, TEX.wood, 1, 1), -5.5, 0.5, 4.5);
  box(THREE, R.group, 0.8, 0.8, 0.8, tm(THREE, TEX.wood, 1, 1), -5.4, 1.4, 4.4);
  solid(R, -6.1, 3.9, -4.9, 5.1);
  box(THREE, R.group, 0.12, 4.5, 0.12, flat(THREE, 0x3a3d42), 5.8, 2.25, 4.8);
  box(THREE, R.group, 0.9, 0.08, 0.08, flat(THREE, 0x3a3d42), 5.8, 3.8, 4.8);
  box(THREE, R.group, 0.08, 0.08, 0.08, new THREE.MeshBasicMaterial({ color: 0xff2222 }), 5.8, 4.55, 4.8);
  solid(R, 5.6, 4.6, 6.0, 5.0);
  // poças
  const pudT = TEX.water.clone(); pudT.needsUpdate = true;
  plane(THREE, R.group, 3, 2, new THREE.MeshBasicMaterial({ map: pudT, transparent: true, opacity: 0.7 }), -3, 0.015, 1, -Math.PI / 2);
  plane(THREE, R.group, 2.4, 1.8, new THREE.MeshBasicMaterial({ map: pudT, transparent: true, opacity: 0.7 }), 3.5, 0.015, -0.5, -Math.PI / 2, 0.5);
  // chuva
  const RN = 500;
  const rpos = new Float32Array(RN * 3);
  for (let i = 0; i < RN; i++) {
    rpos[i * 3] = (Math.random() - 0.5) * 18;
    rpos[i * 3 + 1] = Math.random() * 10;
    rpos[i * 3 + 2] = (Math.random() - 0.5) * 16;
  }
  const rg = new THREE.BufferGeometry();
  rg.setAttribute('position', new THREE.BufferAttribute(rpos, 3));
  const rain = new THREE.Points(rg, new THREE.PointsMaterial({
    map: TEX.rain, size: 0.22, transparent: true, opacity: 0.7,
    depthWrite: false, color: 0x9ab8d8,
  }));
  rain.frustumCulled = false;
  R.group.add(rain);
  R.rain = rain;
  R.rainPos = rpos;
  // luz fria da lua
  pointLight(THREE, R, 0x5a7ac8, 10, 30, 0, 8, 0);

  addCam(R, [-7, -1, 7, 6], [4.5, 3.4, 3.6], [0, 1.2, 0], 60);
  addCam(R, [-7, -6, 7, -1], [-4.5, 3.5, 0.5], [0, 1.2, -3.5], 60);

  addDoor(R, 3, 3.7, 1.4, 'Descer de elevador', 'saguao', 3.0, -3.2, 0, { elevator: true });

  addInteract(R, 0, -2.4, 1.9, 'Examinar o memorial', 'memorial');
  addInteract(R, 0, -1.0, 1.4, 'Atravessar a luz', 'portal', (f) => !!f.bossDead);
  addInteract(R, -6.3, 0, 1.4, 'Olhar a cidade', 'edge');

  addPickup(THREE, R, TEX, 'page', -5.5, 3.2, 1, 7, 0.06);
  addPickup(THREE, R, TEX, 'lightflask', -1.8, -2.6, 1);
  addPickup(THREE, R, TEX, 'shell', 5.5, -3.2, 6);

  R.fx = (dt, t, game) => {
    // chuva
    const p = R.rainPos;
    for (let i = 0; i < p.length; i += 3) {
      p[i + 1] -= dt * 13;
      if (p[i + 1] < 0) {
        p[i + 1] = 10;
        p[i] = (Math.random() - 0.5) * 18;
        p[i + 2] = (Math.random() - 0.5) * 16;
      }
    }
    R.rain.geometry.attributes.position.needsUpdate = true;
    // gemas do memorial
    const n = (game.flags.frags || []).filter(Boolean).length;
    R.memorialGems.forEach((g, i) => {
      g.visible = i < n || !!game.flags.memorialOpen;
      g.rotation.y += dt * 2;
    });
    if (R.memorialLight) {
      const target = game.flags.memorialOpen ? 20 + Math.sin(t * 6) * 5 : n * 1.5;
      R.memorialLight.intensity += (target - R.memorialLight.intensity) * Math.min(1, dt * 3);
    }
    if (R.portal) {
      R.portal.visible = !!game.flags.bossDead;
      if (R.portal.visible) {
        R.portal.rotation.z += dt * 0.8;
        R.portalLight.intensity = 22 + Math.sin(t * 5) * 6;
      }
    }
  };
  return R;
}

// ============================================================
// FLORESTA / JARDINS EXTERNOS DO SANATÓRIO
// ============================================================
function buildFloresta(THREE, TEX) {
  const R = baseRoom(THREE, TEX, 'floresta', 'Jardins da Floresta', 26, 36, 9);
  R.ambient = 'floresta';
  R.fog = { c: 0x080e18, n: 6, f: 36 };

  const groundM = tm(THREE, TEX.forestGround, 8, 12);
  const stoneM = tm(THREE, TEX.wallStone, 4, 2);
  const barkM = tm(THREE, TEX.bark, 1, 2);
  const leavesM = tm(THREE, TEX.leaves, 2, 2);
  const ironGateM = new THREE.MeshBasicMaterial({ map: TEX.ironGate, transparent: true, alphaTest: 0.3, side: THREE.DoubleSide });

  // chão
  plane(THREE, R.group, 26, 36, groundM, 0, 0, 0, -Math.PI / 2);

  // Muros de perímetro
  // Norte (parede do sanatório com portão central)
  box(THREE, R.group, 11, 4, 0.6, stoneM, -7.5, 2, -17.7); solid(R, -13, -18, -2, -17.4);
  box(THREE, R.group, 11, 4, 0.6, stoneM, 7.5, 2, -17.7); solid(R, 2, -18, 13, -17.4);
  plane(THREE, R.group, 4, 3.5, ironGateM, 0, 1.75, -17.65, 0, 0);

  // Sul (limite da floresta / cerca de pedra)
  box(THREE, R.group, 26, 3, 0.6, stoneM, 0, 1.5, 17.7); solid(R, -13, 17.4, 13, 18);
  // Leste (muro da capela)
  box(THREE, R.group, 0.6, 4, 36, stoneM, 12.7, 2, 0); solid(R, 12.4, -18, 13, 18);
  // Oeste (muro do bosque)
  box(THREE, R.group, 0.6, 4, 36, stoneM, -12.7, 2, 0); solid(R, -13, -18, -12.4, 18);

  // Árvores com tronco e copas
  const tree = (x, z, h = 4.5, r = 1.6) => {
    box(THREE, R.group, 0.7, h, 0.7, barkM, x, h / 2, z);
    const foliage = new THREE.Mesh(new THREE.ConeGeometry(r, h * 0.75, 6), leavesM);
    foliage.position.set(x, h * 0.85, z); R.group.add(foliage);
    solid(R, x - 0.45, z - 0.45, x + 0.45, z + 0.45);
  };

  // Bosque à esquerda (Oeste)
  tree(-9, -12, 5, 1.8);
  tree(-10, -5, 5.5, 2.0);
  tree(-5, -2, 4.8, 1.7);
  tree(-9, 10, 5.2, 1.9);
  tree(-6, 13, 4.6, 1.6);

  // Bosque à direita (Leste)
  tree(9, -11, 5, 1.8);
  tree(5, -6, 5.2, 1.8);
  tree(8, 2, 4.7, 1.7);
  tree(6, 9, 5.4, 2.0);
  tree(10, 12, 4.8, 1.7);

  // Carro da Dra. Clara acidentado ao sul (z = 13.5, x = 0)
  const carGroup = new THREE.Group(); carGroup.position.set(0, 0, 13.5); R.group.add(carGroup);
  const carBody = flat(THREE, 0x1c2b3d);
  box(THREE, carGroup, 2.0, 0.9, 4.2, carBody, 0, 0.55, 0);
  box(THREE, carGroup, 1.7, 0.7, 2.2, flat(THREE, 0x141e2b), 0, 1.3, -0.2);
  pointLight(THREE, R, 0xfff2cc, 22, 24, 0, 0.8, 11);
  solid(R, -1.2, 11.2, 1.2, 15.8);

  // Cemitério com lápides ao noroeste (-7, -6)
  const tombM = tm(THREE, TEX.tombstone, 1, 1);
  for (let tz = -10; tz <= -4; tz += 3) {
    for (let tx = -9; tx <= -5; tx += 2) {
      box(THREE, R.group, 0.5, 0.8, 0.2, tombM, tx, 0.4, tz);
      solid(R, tx - 0.35, tz - 0.25, tx + 0.35, tz + 0.25);
    }
  }
  box(THREE, R.group, 1.0, 0.2, 1.8, tombM, -7, 0.1, -7);
  box(THREE, R.group, 0.8, 1.2, 0.25, tombM, -7, 0.7, -7.8);
  pointLight(THREE, R, 0x66aaff, 12, 12, -7, 1.5, -7);

  // Cabana do Bento a sudoeste (-8.5, 4.5)
  const cabinM = tm(THREE, TEX.wood, 2, 2);
  box(THREE, R.group, 3.5, 3.0, 3.5, cabinM, -8.5, 1.5, 4.5);
  solid(R, -10.4, 2.6, -6.6, 6.4);
  plane(THREE, R.group, 1.6, 1.6, new THREE.MeshLambertMaterial({ map: TEX.doorMetal }), -8.5, 0.02, 1.5, -Math.PI / 2);

  // Postes de iluminação de ferro
  const lampPost = (px, pz) => {
    box(THREE, R.group, 0.14, 3.2, 0.14, flat(THREE, 0x1a1a20), px, 1.6, pz);
    box(THREE, R.group, 0.4, 0.1, 0.4, flat(THREE, 0x2a2a30), px, 3.2, pz);
    pointLight(THREE, R, 0xffcc88, 16, 18, px, 2.9, pz);
    solid(R, px - 0.2, pz - 0.2, px + 0.2, pz + 0.2);
  };
  lampPost(2.5, -6);
  lampPost(-2.5, 4);

  // Câmeras PS1
  addCam(R, [-13, 8, 13, 18], [3.5, 3.8, 14.0], [0, 1.2, 8], 62);
  addCam(R, [-13, -2, 13, 8], [5.5, 3.6, 4.5], [0, 1.0, 0], 60);
  addCam(R, [-2, -18, 13, -2], [6.5, 3.5, -10], [0, 1.2, -15], 62);
  addCam(R, [-13, -18, -2, -2], [-3.0, 3.5, -11], [-7, 0.8, -7], 60);

  // Portas
  addDoor(R, 0, -17.0, 1.6, 'Entrar no Sanatório (Saguão)', 'saguao', 0.0, 3.2, Math.PI);
  addDoor(R, 12.0, -4.0, 1.5, 'Entrar na Capela', 'capela', 4.0, 0, -Math.PI / 2);
  addDoor(R, -8.5, 1.5, 1.5, 'Descer pelo Alçapão ao Porão', 'porao', 3.5, 2.5, 0);

  // Interações
  addInteract(R, 0, 11.8, 1.6, 'Examinar o carro da Dra. Clara', 'carro_clara');
  addInteract(R, -7, -6.5, 1.6, 'Examinar o túmulo de Lúcia', 'tumulo_lucia');
  addInteract(R, -8.5, 3.0, 1.5, 'Examinar a cabana de Bento', 'cabana_bento');

  // Itens
  addPickup(THREE, R, TEX, 'pills', 0.8, 12.5, 1);
  addPickup(THREE, R, TEX, 'ammo38', -0.8, 12.5, 12);
  addPickup(THREE, R, TEX, 'lucia_locket', -7, -7.0, 1);
  addPickup(THREE, R, TEX, 'ribbon', -7.5, 3.5, 1);
  addPickup(THREE, R, TEX, 'frag', -7, -8.0, 1);

  // Inimigos
  addSpawn(R, 'cao', 2.0, -1.0, 0);
  addSpawn(R, 'rastejador', -4.0, 7.0, 1);
  addSpawn(R, 'sombra', 3.0, 8.0, 2);

  return R;
}

// ============================================================
// CAPELA ESQUECIDA DO SANATÓRIO
// ============================================================
function buildCapela(THREE, TEX) {
  const R = baseRoom(THREE, TEX, 'capela', 'Capela Esquecida', 14, 22, 6.5);
  R.ambient = 'capela';
  R.music = 'safe';
  R.fog = { c: 0x0a0c16, n: 5, f: 26 };

  const floorM = tm(THREE, TEX.floorTile, 4, 6);
  const wallM = tm(THREE, TEX.wallStone, 5, 2);
  const pewM = tm(THREE, TEX.pewWood, 1, 1);
  const vitralM = new THREE.MeshBasicMaterial({ map: TEX.vitral });

  // chão e teto
  plane(THREE, R.group, 14, 22, floorM, 0, 0, 0, -Math.PI / 2);
  plane(THREE, R.group, 14, 22, wallM, 0, 6.5, 0, Math.PI / 2);

  perimeter(THREE, R, 14, 22, 6.5, wallM, [
    { side: 'S', at: 0, w: 2.2 },
    { side: 'E', at: 0, w: 2.2 },
  ]);
  doorVisual(THREE, R, 'S', 0, 22, 14, TEX.doorWood);
  doorVisual(THREE, R, 'E', 0, 22, 14, TEX.doorMetal);

  // Altar de mármore ao fundo (Norte, z = -8.5)
  box(THREE, R.group, 4.0, 1.0, 1.6, tm(THREE, TEX.statue, 2, 1), 0, 0.5, -8.5);
  box(THREE, R.group, 1.2, 0.3, 0.6, flat(THREE, 0x3a2010), 0, 1.15, -8.5);
  solid(R, -2.2, -9.5, 2.2, -7.5);

  // Vitral Gótico iluminado acima do altar
  plane(THREE, R.group, 4.0, 4.5, vitralM, 0, 4.0, -10.9, 0, 0);
  pointLight(THREE, R, 0xbbaaff, 18, 20, 0, 3.5, -7.5);

  // Bancos de madeira (fileiras à esquerda e à direita do corredor central; vão livre na porta leste z = 0)
  for (let z = -5; z <= 5; z += 2.5) {
    box(THREE, R.group, 3.2, 0.7, 0.6, pewM, -3.5, 0.35, z);
    solid(R, -5.2, z - 0.4, -1.8, z + 0.4);
    if (z !== 0) {
      box(THREE, R.group, 3.2, 0.7, 0.6, pewM, 3.5, 0.35, z);
      solid(R, 1.8, z - 0.4, 5.2, z + 0.4);
    }
  }

  // Estátua de pedra de anjo no centro (z = -2)
  box(THREE, R.group, 1.0, 0.4, 1.0, tm(THREE, TEX.statue, 1, 1), 0, 0.2, -2);
  const angel = new THREE.Mesh(new THREE.ConeGeometry(0.35, 1.4, 6), tm(THREE, TEX.statue, 1, 1));
  angel.position.set(0, 1.1, -2); R.group.add(angel);
  solid(R, -0.6, -2.6, 0.6, -1.4);

  // Confessionário de madeira (SE, x = 5.2, z = 6.5)
  box(THREE, R.group, 1.8, 3.2, 1.4, tm(THREE, TEX.wood, 1, 2), 5.2, 1.6, 6.5);
  solid(R, 4.1, 5.6, 6.2, 7.4);

  // Iluminação
  pointLight(THREE, R, 0xffaa55, 14, 16, -4.5, 3.0, 0);
  pointLight(THREE, R, 0xffaa55, 14, 16, 4.5, 3.0, 0);
  pointLight(THREE, R, 0xffd088, 12, 16, 0, 3.2, 7.0);

  // Câmeras
  addCam(R, [-7, 2, 7, 11], [0, 3.6, 8.5], [0, 1.2, 2], 58);
  addCam(R, [-7, -4, 7, 2], [-4.5, 3.4, 1.6], [0, 1.0, -3], 60);
  addCam(R, [-7, -11, 7, -4], [0, 3.2, -4], [0, 1.2, -8.5], 62);

  // Portas
  addDoor(R, 0, 10.0, 1.5, 'Voltar ao Saguão Principal', 'saguao', 5.3, -3.5, -Math.PI / 2);
  addDoor(R, 6.0, 0, 1.5, 'Saída para os Jardins da Floresta', 'floresta', 9.8, -4.0, -Math.PI / 2);

  // Interações
  addInteract(R, 0, -7.0, 1.6, 'Examinar o Altar', 'altar_capela');
  addInteract(R, 4.5, 6.5, 1.5, 'Examinar o Confessionário', 'confessionario');
  addInteract(R, 0, -1.0, 1.4, 'Olhar a Estátua do Anjo', 'anjo_capela');

  // Itens
  addPickup(THREE, R, TEX, 'antidote', -0.5, -7.5, 1);
  addPickup(THREE, R, TEX, 'grenade_rounds', 5.2, 4.5, 4);
  addPickup(THREE, R, TEX, 'alencastro_dossier', 4.5, 7.5, 1);

  // Inimigo
  addSpawn(R, 'carrasco', 0, -4.5, 0);

  return R;
}

// ---------------- DIORAMA DO TÍTULO (FACHADA EXTERNA DO SANATÓRIO 3D - FOLHA DO CADERNO) ----------------
function buildTitleDiorama(THREE, TEX) {
  const R = baseRoom(THREE, TEX, 'title_diorama', 'SANATÓRIO SANTA LÚCIA (1997)', 24, 20, 12);
  R.ambient = 'floresta';
  R.openSky = true;

  // Gramado e terreno do sanatório sob tempestade
  const groundM = tm(THREE, TEX.forestGround, 6, 5);
  plane(THREE, R.group, 24, 20, groundM, 0, 0, 0, -Math.PI / 2);

  // Muro perimetral baixo de pedra
  const wallM = tm(THREE, TEX.wallStone, 4, 1);
  box(THREE, R.group, 22.0, 1.4, 0.4, wallM, 0, 0.7, 7.5);
  box(THREE, R.group, 0.4, 1.4, 18.0, wallM, 10.5, 0.7, -1.0);
  box(THREE, R.group, 0.4, 1.4, 18.0, wallM, -10.5, 0.7, -1.0);

  // Calçada de pedra da entrada
  const stoneM = tm(THREE, TEX.stoneFloor, 3, 2);
  box(THREE, R.group, 5.5, 0.2, 4.0, stoneM, -1.5, 0.1, 3.5);
  box(THREE, R.group, 4.0, 0.2, 2.0, stoneM, -1.5, 0.25, 4.0);

  // 1. Bloco Principal da Mansão (Sanatório Santa Lúcia)
  const mansionM = tm(THREE, TEX.wallStone, 2, 2);
  box(THREE, R.group, 8.5, 5.2, 6.5, mansionM, -1.5, 2.6, -1.5);

  // 2. Torre Sineira / Torreão à esquerda (Folha Superior do Caderno)
  box(THREE, R.group, 3.4, 9.0, 3.4, mansionM, -6.0, 4.5, 0.0);
  const towerRoof = new THREE.Mesh(new THREE.ConeGeometry(2.6, 3.5, 4), flat(THREE, 0x1a1e24));
  towerRoof.position.set(-6.0, 10.75, 0.0);
  towerRoof.rotation.y = Math.PI / 4;
  R.group.add(towerRoof);

  // 3. Telhado em duas águas do bloco principal
  const roofL = box(THREE, R.group, 8.8, 0.18, 4.2, flat(THREE, 0x22262e), -1.5, 6.0, -2.8);
  roofL.rotation.x = 0.52;
  const roofR = box(THREE, R.group, 8.8, 0.18, 4.2, flat(THREE, 0x22262e), -1.5, 6.0, -0.2);
  roofR.rotation.x = -0.52;

  // 4. A Grande Porta Dupla Frontal em Arco (Folha do Caderno)
  box(THREE, R.group, 2.4, 3.2, 0.35, flat(THREE, 0x161820), -1.5, 1.6, 1.8);
  plane(THREE, R.group, 1.9, 2.7, new THREE.MeshLambertMaterial({ map: TEX.doorWood }), -1.5, 1.5, 1.99, 0, 0);

  // 5. Janelas iluminadas com luz interna amarelada
  const winGlowM = new THREE.MeshBasicMaterial({ color: 0xffbb44 });
  // Janela na Torre
  plane(THREE, R.group, 1.1, 1.8, winGlowM, -6.0, 6.8, 1.72, 0, 0);
  box(THREE, R.group, 1.3, 2.0, 0.1, flat(THREE, 0x1a1c22), -6.0, 6.8, 1.68);
  // Janelas do andar superior da mansão
  plane(THREE, R.group, 1.2, 1.7, winGlowM, 0.5, 3.8, 1.77, 0, 0);
  plane(THREE, R.group, 1.2, 1.7, winGlowM, -3.5, 3.8, 1.77, 0, 0);

  // Iluminação que vaza das janelas e portas
  pointLight(THREE, R, 0xffaa33, 8, 14, -1.5, 2.2, 3.0);
  pointLight(THREE, R, 0xffcc55, 6, 10, -6.0, 6.8, 2.5);

  // Chuva de partículas volumétrica em toda a fachada externa
  const RN = 600;
  const rpos = new Float32Array(RN * 3);
  for (let i = 0; i < RN; i++) {
    rpos[i * 3] = (Math.random() - 0.5) * 22;
    rpos[i * 3 + 1] = 0.5 + Math.random() * 12.0;
    rpos[i * 3 + 2] = -5.0 + Math.random() * 15.0;
  }
  const rgeo = new THREE.BufferGeometry();
  rgeo.setAttribute('position', new THREE.BufferAttribute(rpos, 3));
  const rmat = new THREE.PointsMaterial({ color: 0x88bbff, size: 0.12, transparent: true, opacity: 0.8 });
  const rain = new THREE.Points(rgeo, rmat);
  R.group.add(rain);
  R.rain = rain;

  // Luz da tempestade (relâmpagos)
  const stormLight = new THREE.DirectionalLight(0x7799ee, 0.35);
  stormLight.position.set(5, 12, 10);
  R.group.add(stormLight);
  R.stormLight = stormLight;

  // Luz ambiente fria da noite
  pointLight(THREE, R, 0x223355, 8, 30, 0, 7.0, 5.0);

  // Sólidos
  solid(R, -11, 7.2, 11, 7.8);
  solid(R, -11, -9.0, 11, -8.2);
  solid(R, -11.2, -9.0, -10.5, 8.0);
  solid(R, 10.5, -9.0, 11.2, 8.0);
  solid(R, -8, -5, 5, 2);

  // Porta para o saguão
  addDoor(R, -1.5, 2.5, 1.5, 'Entrar no Sanatório', 'saguao', 0, 0, 0);

  // Câmera Isométrica (mostrando a Mansão 3D na metade esquerda da tela)
  addCam(R, [-12, -10, 12, 10], [4.2, 4.5, 8.8], [-2.0, 2.4, -0.5], 54);

  // Animação da chuva e relâmpagos
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
      if (game && game.flashBoost !== undefined) {
        game.flashBoost = 0.5;
      }
      if (game && game.audio) {
        game.audio.sfx('thunder');
      }
    }
  };

  return R;
}

// ---------------- CORREDOR DOS QUARTOS (P1 - FOLHA P1) ----------------
function buildCorredorQuartos(THREE, TEX) {
  const R = baseRoom(THREE, TEX, 'corredor_quartos', 'ALA DE INTERNAÇÃO · CORREDOR OESTE', 14, 8, 3.2);
  R.fog = { c: 0x05050c, n: 6, f: 22 };
  R.ambient = 'quarto';
  const floorM = tm(THREE, TEX.floorWood, 4, 2);
  const wallM = tm(THREE, TEX.wallpaper, 5, 1.4);
  const ceilM = tm(THREE, TEX.ceiling, 5, 3);
  plane(THREE, R.group, 14, 8, floorM, 0, 0, 0, -Math.PI / 2);
  plane(THREE, R.group, 14, 8, ceilM, 0, 3.2, 0, Math.PI / 2);
  perimeter(THREE, R, 14, 8, 3.2, wallM, [
    { side: 'N', at: -4.0, w: 1.8 },
    { side: 'S', at: -4.0, w: 1.8 },
    { side: 'E', at: 0.0, w: 1.8 },
  ]);
  doorVisual(THREE, R, 'N', -4.0, 8, 14, TEX.doorWood);
  doorVisual(THREE, R, 'S', -4.0, 8, 14, TEX.doorWood);
  doorVisual(THREE, R, 'E', 0.0, 8, 14, TEX.doorWood);

  // Carpete longo central
  plane(THREE, R.group, 11, 2.0, tm(THREE, TEX.carpet, 4, 1), 0.5, 0.012, 0, -Math.PI / 2);

  // Aparador com remédios
  box(THREE, R.group, 1.4, 0.8, 0.5, flat(THREE, 0x2e2014), 2.0, 0.4, -3.6);
  solid(R, 1.2, -3.9, 2.8, -3.3);

  // Janelas na parede norte com luz fria
  plane(THREE, R.group, 1.6, 2.0, tm(THREE, TEX.window, 1, 1), 2.0, 1.8, -3.96);
  pointLight(THREE, R, 0x4a6a9a, 3, 7, 2.0, 2.0, -2.8);
  pointLight(THREE, R, 0x9a8060, 4, 8, -4.0, 2.2, 0);

  addCam(R, [-7, -4, 0, 4], [-4.5, 2.5, 3.0], [-1.0, 1.2, 0.0], 65);
  addCam(R, [0, -4, 7, 4], [4.5, 2.5, 3.0], [0.5, 1.2, 0.0], 65);

  addDoor(R, -4.0, -3.5, 1.3, 'Entrar no Quarto 1', 'quarto', 2.5, 2.5, 0);
  addDoor(R, -4.0, 3.5, 1.3, 'Entrar no Quarto 2 (Ala Trancada)', 'quarto2', 0, -2.8, Math.PI);
  addDoor(R, 6.5, 0.0, 1.4, 'Ir ao Hall Principal', 'saguao', -5.5, 4.0, -Math.PI / 2);

  addPickup(THREE, R, TEX, 'ammo9', 2.0, -3.2, 15);
  addSpawn(R, 'infectado', 0.0, 0.0);
  return R;
}

// ---------------- QUARTO 2 / COFRE (P1 - FOLHA P1) ----------------
function buildQuarto2(THREE, TEX) {
  const R = baseRoom(THREE, TEX, 'quarto2', 'QUARTO 2 · COFRE CONFIDENCIAL', 10, 8, 3.0);
  R.fog = { c: 0x06050b, n: 5, f: 20 };
  R.ambient = 'quarto';
  const floorM = tm(THREE, TEX.floorWood, 3, 3);
  const wallM = tm(THREE, TEX.wallpaper, 4, 1.4);
  const ceilM = tm(THREE, TEX.ceiling, 4, 3);
  plane(THREE, R.group, 10, 8, floorM, 0, 0, 0, -Math.PI / 2);
  plane(THREE, R.group, 10, 8, ceilM, 0, 3.0, 0, Math.PI / 2);
  perimeter(THREE, R, 10, 8, 3.0, wallM, [{ side: 'N', at: 0.0, w: 1.8 }]);
  doorVisual(THREE, R, 'N', 0.0, 8, 10, TEX.doorWood);

  const woodM = tm(THREE, TEX.wood, 1, 1);
  const woodD = flat(THREE, 0x2e2014);

  // Cama no canto superior direito
  box(THREE, R.group, 2.2, 0.35, 1.6, woodM, 3.0, 0.3, -2.5);
  box(THREE, R.group, 2.2, 0.9, 0.12, woodM, 3.0, 0.7, -3.3);
  box(THREE, R.group, 2.0, 0.22, 1.44, tm(THREE, TEX.mattress, 1, 1), 3.0, 0.58, -2.5);
  solid(R, 1.8, -3.4, 4.2, -1.6);

  // Estante de livros na parede oeste
  box(THREE, R.group, 0.5, 2.2, 2.4, woodD, -4.6, 1.1, -1.5);
  solid(R, -4.9, -2.8, -4.2, -0.2);

  // Tapete central
  plane(THREE, R.group, 2.4, 3.0, tm(THREE, TEX.rug, 1, 1), 0, 0.012, 0.5, -Math.PI / 2);

  // O GRANDE COFRE DE FERRO no canto inferior esquerdo (Folha P1)
  box(THREE, R.group, 1.0, 1.2, 0.8, flat(THREE, 0x25282e), -3.5, 0.6, 2.8);
  plane(THREE, R.group, 0.9, 1.1, new THREE.MeshLambertMaterial({ map: TEX.safe }), -3.5, 0.6, 2.39, 0, Math.PI);
  solid(R, -4.1, 2.3, -2.9, 3.3);

  pointLight(THREE, R, 0x9a8060, 4, 9, 0, 2.4, 0);
  pointLight(THREE, R, 0x3a5a7a, 2, 6, -3.5, 1.8, 2.0);

  addCam(R, [-5, -4, 0, 4], [-3.2, 2.4, -2.5], [-0.5, 1.1, 1.0], 62);
  addCam(R, [0, -4, 5, 4], [3.2, 2.4, 2.5], [0.0, 1.1, 0.0], 62);

  addDoor(R, 0.0, -3.5, 1.3, 'Sair para o corredor dos quartos', 'corredor_quartos', -4.0, 2.5, 0);

  addInteract(R, -3.5, 2.0, 1.4, 'Abrir o cofre confidencial', 'safe');
  addInteract(R, 3.0, -1.5, 1.3, 'Examinar a cama antiga', 'bed2');
  addInteract(R, -4.0, -1.5, 1.3, 'Vasculhar a estante de prontuários', 'shelf2');

  addPickup(THREE, R, TEX, 'pills', 3.0, -1.8, 1, null, 0.7);
  addSpawn(R, 'lamento', 2.0, 1.5);
  return R;
}

// ---------------- ESTUFA BOTÂNICA (P1 - FOLHA P1) ----------------
function buildEstufa(THREE, TEX) {
  const R = baseRoom(THREE, TEX, 'estufa', 'ESTUFA BOTÂNICA', 16, 10, 3.8);
  R.fog = { c: 0x050e0a, n: 6, f: 24 };
  R.ambient = 'enfermaria';
  const floorM = tm(THREE, TEX.floorTile, 5, 3);
  const wallM = tm(THREE, TEX.greenhouseGlass, 6, 2);
  const glassM = tm(THREE, TEX.greenhouseGlass, 5, 3);
  plane(THREE, R.group, 16, 10, floorM, 0, 0, 0, -Math.PI / 2);
  plane(THREE, R.group, 16, 10, glassM, 0, 3.8, 0, Math.PI / 2);
  perimeter(THREE, R, 16, 10, 3.8, wallM, [{ side: 'N', at: 0.0, w: 1.8 }]);
  doorVisual(THREE, R, 'N', 0.0, 10, 16, TEX.doorWood);

  // Dois canteiros longitudinais centrais de terra fofa (Folha P1)
  const soilM = tm(THREE, TEX.greenhouseSoil, 4, 1);
  const curbM = flat(THREE, 0x3a3630);
  box(THREE, R.group, 10.0, 0.35, 1.6, soilM, 0, 0.18, -1.6);
  box(THREE, R.group, 10.4, 0.45, 0.15, curbM, 0, 0.22, -2.45);
  box(THREE, R.group, 10.4, 0.45, 0.15, curbM, 0, 0.22, -0.75);
  solid(R, -5.2, -2.5, 5.2, -0.7);

  box(THREE, R.group, 10.0, 0.35, 1.6, soilM, 0, 0.18, 1.6);
  box(THREE, R.group, 10.4, 0.45, 0.15, curbM, 0, 0.22, 0.75);
  box(THREE, R.group, 10.4, 0.45, 0.15, curbM, 0, 0.22, 2.45);
  solid(R, -5.2, 0.7, 5.2, 2.5);

  // Bancada de químicos / pulverizador na parede oeste
  box(THREE, R.group, 0.7, 0.85, 2.2, flat(THREE, 0x2e3532), -7.2, 0.42, 0);
  solid(R, -7.6, -1.2, -6.7, 1.2);

  pointLight(THREE, R, 0x306644, 4, 10, 0, 2.6, 0);
  pointLight(THREE, R, 0x669988, 3, 8, -6.5, 2.2, 0);

  addCam(R, [-8, -5, 0, 5], [-5.5, 2.6, 3.5], [-2.0, 1.2, 0.0], 65);
  addCam(R, [0, -5, 8, 5], [5.5, 2.6, 3.5], [2.0, 1.2, 0.0], 65);

  addDoor(R, 0.0, -4.5, 1.3, 'Voltar ao Hall Principal', 'saguao', -2.5, 4.5, Math.PI);

  addInteract(R, -6.5, 0.0, 1.4, 'Bancada de compostos da estufa', 'greenhouse_bench');
  addInteract(R, 0.0, 3.0, 1.4, 'Examinar as plantas medicinais', 'greenhouse_plants');

  addPickup(THREE, R, TEX, 'herbicide', -6.5, 0.0, 1, null, 0.9);
  addPickup(THREE, R, TEX, 'pills', 4.5, 1.6, 1, null, 0.5);
  addSpawn(R, 'rastejador', 3.0, 0.0);
  return R;
}

// ---------------- JARDIM FÚNEBRE / CEMITÉRIO (P1 - FOLHA P1) ----------------
function buildCemiterio(THREE, TEX) {
  const R = baseRoom(THREE, TEX, 'cemiterio', 'JARDIM FÚNEBRE · LÁPIDES', 18, 12, 0);
  R.fog = { c: 0x040608, n: 6, f: 28 };
  R.ambient = 'floresta';
  R.openSky = true;
  const groundM = tm(THREE, TEX.forestGround, 5, 4);
  plane(THREE, R.group, 18, 12, groundM, 0, 0, 0, -Math.PI / 2);

  const stoneM = tm(THREE, TEX.wallStone, 4, 1);
  const mkWall = (x, z, w, d) => {
    box(THREE, R.group, w, 2.2, d, stoneM, x, 1.1, z);
    solid(R, x - w / 2, z - d / 2, x + w / 2, z + d / 2);
  };
  mkWall(0, -6.0, 18.5, 0.5);
  mkWall(-9.0, 0, 0.5, 12.5);
  mkWall(9.0, 0, 0.5, 12.5);
  mkWall(-5.0, 6.0, 8.5, 0.5);
  mkWall(5.0, 6.0, 8.5, 0.5);

  doorVisual(THREE, R, 'S', 0.0, 12, 18, TEX.doorMetal, 0x1a1a1a);

  // Fileiras de lápides fúnebres (Folha P1)
  const tombM = tm(THREE, TEX.tombstone, 1, 1);
  const places = [
    [-5, -3], [-2.5, -3], [2.5, -3], [5, -3],
    [-5, 0],  [-2.5, 0],  [2.5, 0],  [5, 0],
    [-5, 3],  [-2.5, 3],  [2.5, 3],  [5, 3],
  ];
  for (const [tx, tz] of places) {
    box(THREE, R.group, 0.6, 0.9, 0.25, tombM, tx, 0.45, tz);
    solid(R, tx - 0.4, tz - 0.3, tx + 0.4, tz + 0.3);
  }

  // Mausoléu antigo ao norte
  box(THREE, R.group, 3.2, 2.4, 2.4, tm(THREE, TEX.wallStone, 2, 2), 0, 1.2, -4.5);
  solid(R, -1.8, -5.8, 1.8, -3.2);

  pointLight(THREE, R, 0x4a6a8a, 4, 14, 0, 3.0, 0);

  addCam(R, [-9, -6, 0, 6], [-6.5, 3.0, 4.5], [-2.0, 1.2, 0.0], 65);
  addCam(R, [0, -6, 9, 6], [6.5, 3.0, 4.5], [2.0, 1.2, 0.0], 65);

  addDoor(R, 0.0, 5.5, 1.4, 'Voltar ao Hall Principal', 'saguao', -2.0, -4.5, 0);

  addInteract(R, 0.0, -2.8, 1.4, 'Examinar o mausoléu dos fundadores', 'mausoleum');
  addPickup(THREE, R, TEX, 'ribbon', 0.0, -2.5, 1, null, 0.5);
  addSpawn(R, 'lamento', -4.0, 1.5);
  addSpawn(R, 'lamento', 4.0, -1.5);
  return R;
}

// ---------------- JARDIM TRASEIRO, ESTACIONAMENTO & CANIL (P1 - FOLHA P1) ----------------
function buildJardim(THREE, TEX) {
  const R = baseRoom(THREE, TEX, 'jardim', 'PÁTIO EXTERNO & CANIL', 18, 16, 0);
  R.fog = { c: 0x05080c, n: 8, f: 32 };
  R.ambient = 'floresta';
  R.openSky = true;
  const groundM = tm(THREE, TEX.forestGround, 6, 5);
  plane(THREE, R.group, 18, 16, groundM, 0, 0, 0, -Math.PI / 2);

  const stoneM = tm(THREE, TEX.wallStone, 4, 1);
  const mkWall = (x, z, w, d) => {
    box(THREE, R.group, w, 2.4, d, stoneM, x, 1.2, z);
    solid(R, x - w / 2, z - d / 2, x + w / 2, z + d / 2);
  };
  mkWall(0, -8.0, 18.5, 0.5);
  mkWall(0, 8.0, 18.5, 0.5);
  mkWall(9.0, 0, 0.5, 16.5);
  mkWall(-9.0, 4.0, 0.5, 8.5);
  mkWall(-9.0, -5.0, 0.5, 6.5);

  doorVisual(THREE, R, 'W', -1.0, 16, 18, TEX.doorMetal, 0x1a1a1a);

  // Canil ao leste: jaulas com grades de ferro (Folha P1)
  const kennelM = tm(THREE, TEX.dogKennel, 1, 1);
  for (let kz = -4; kz <= 4; kz += 3.5) {
    box(THREE, R.group, 3.2, 2.0, 2.8, kennelM, 6.5, 1.0, kz);
    solid(R, 4.8, kz - 1.5, 8.2, kz + 1.5);
  }

  // Cabana da Casa do Zelador no canto sudoeste (Folha P1)
  const woodM = tm(THREE, TEX.wood, 2, 2);
  box(THREE, R.group, 4.2, 2.6, 4.2, woodM, -5.5, 1.3, 4.5);
  plane(THREE, R.group, 1.4, 2.1, new THREE.MeshLambertMaterial({ map: TEX.doorWood }), -3.35, 1.05, 4.5, 0, Math.PI / 2);
  solid(R, -7.8, 2.3, -3.3, 6.7);

  // Árvores retorcidas no jardim
  const barkM = tm(THREE, TEX.bark, 1, 2);
  for (const [tx, tz] of [[-1, -3], [1, 2], [-2, 1]]) {
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.45, 4.0, 7), barkM);
    trunk.position.set(tx, 2.0, tz); R.group.add(trunk);
    solid(R, tx - 0.5, tz - 0.5, tx + 0.5, tz + 0.5);
  }

  pointLight(THREE, R, 0x3a5a7a, 5, 16, 0, 3.5, 0);
  pointLight(THREE, R, 0xffaa44, 3, 7, -3.0, 2.0, 4.5);

  addCam(R, [-9, -8, 0, 8], [-6.0, 3.2, -5.0], [-1.0, 1.2, 0.0], 65);
  addCam(R, [0, -8, 9, 8], [5.0, 3.2, 5.0], [0.0, 1.2, 0.0], 65);

  addDoor(R, -8.5, -1.0, 1.4, 'Voltar ao Hall Principal', 'saguao', 6.5, -1.0, Math.PI / 2);
  addDoor(R, -3.0, 4.5, 1.3, 'Entrar na Casa do Zelador', 'casa_zelador', 0.0, 2.5, 0);

  addInteract(R, 4.5, 0.0, 1.4, 'Inspecionar as jaulas do canil', 'kennel');
  addPickup(THREE, R, TEX, 'greenhouse_key', 4.5, 0.0, 1, null, 0.6);
  addPickup(THREE, R, TEX, 'shell', 1.0, 2.5, 4, null, 0.4);
  addSpawn(R, 'rastejador', 2.0, -2.0);
  addSpawn(R, 'infectado', 4.0, 2.0);
  return R;
}

// ---------------- CASA DO ZELADOR BENTO (EXTRAS - FOLHA EXTRAS) ----------------
function buildCasaZelador(THREE, TEX) {
  const R = baseRoom(THREE, TEX, 'casa_zelador', 'CASA DO ZELADOR BENTO', 8, 8, 2.8);
  R.fog = { c: 0x080604, n: 4, f: 18 };
  R.ambient = 'quarto';
  const floorM = tm(THREE, TEX.floorWood, 3, 3);
  const wallM = tm(THREE, TEX.wood, 3, 2);
  const ceilM = tm(THREE, TEX.ceiling, 3, 3);
  plane(THREE, R.group, 8, 8, floorM, 0, 0, 0, -Math.PI / 2);
  plane(THREE, R.group, 8, 8, ceilM, 0, 2.8, 0, Math.PI / 2);
  perimeter(THREE, R, 8, 8, 2.8, wallM, [{ side: 'S', at: 0.0, w: 1.6 }]);
  doorVisual(THREE, R, 'S', 0.0, 8, 8, TEX.doorWood);

  // Cama no canto superior direito
  box(THREE, R.group, 2.0, 0.35, 1.4, tm(THREE, TEX.wood, 1, 1), 2.6, 0.25, -2.8);
  box(THREE, R.group, 1.8, 0.2, 1.2, tm(THREE, TEX.mattress, 1, 1), 2.6, 0.5, -2.8);
  solid(R, 1.5, -3.6, 3.7, -2.0);

  // Armário de ferramentas no canto superior esquerdo
  box(THREE, R.group, 1.6, 1.9, 0.6, flat(THREE, 0x3a4048), -2.8, 0.95, -3.3);
  solid(R, -3.7, -3.7, -1.9, -2.9);

  // Mesa de trabalho no canto inferior esquerdo
  box(THREE, R.group, 1.6, 0.8, 0.8, flat(THREE, 0x3e2818), -2.8, 0.4, 2.0);
  solid(R, -3.7, 1.5, -1.9, 2.5);

  // Tapete central
  plane(THREE, R.group, 2.0, 2.0, tm(THREE, TEX.rug, 1, 1), 0, 0.012, 0, -Math.PI / 2);

  pointLight(THREE, R, 0xffa044, 4, 8, -2.5, 1.8, 1.8);

  addCam(R, [-4, -4, 0, 4], [-2.5, 2.2, -2.2], [0.5, 1.0, 0.5], 65);
  addCam(R, [0, -4, 4, 4], [2.5, 2.2, 2.2], [-0.5, 1.0, -0.5], 65);

  addDoor(R, 0.0, 3.5, 1.3, 'Sair para o Jardim', 'jardim', -2.0, 4.5, Math.PI);

  addInteract(R, -2.8, -2.6, 1.3, 'Armário de ferramentas de Bento', 'bento_locker');
  addInteract(R, -2.8, 1.4, 1.3, 'Bancada com rádio transmissor', 'bento_radio');

  addPickup(THREE, R, TEX, 'crowbar', -2.8, 2.0, 1, null, 0.85);
  addPickup(THREE, R, TEX, 'bento_key', -2.8, -2.9, 1, null, 0.85);
  return R;
}

// ---------------- MEZANINO / 2º ANDAR (P2 - FOLHA P2) ----------------
function buildMezanino(THREE, TEX) {
  const R = baseRoom(THREE, TEX, 'mezanino', 'MEZANINO · 2º ANDAR', 18, 14, 3.8);
  R.fog = { c: 0x040408, n: 6, f: 26 };
  R.ambient = 'saguao';
  R.music = 'save';
  const floorM = tm(THREE, TEX.floorTile, 6, 4);
  const wallM = tm(THREE, TEX.wallDirty, 6, 2);
  const ceilM = tm(THREE, TEX.ceiling, 6, 5);
  plane(THREE, R.group, 18, 14, floorM, 0, 0, 0, -Math.PI / 2);
  plane(THREE, R.group, 18, 14, ceilM, 0, 3.8, 0, Math.PI / 2);

  perimeter(THREE, R, 18, 14, 3.8, wallM, [
    { side: 'S', at: 0.0, w: 1.8 },
    { side: 'N', at: 0.0, w: 1.8 },
  ]);
  doorVisual(THREE, R, 'S', 0.0, 14, 18, TEX.doorWood);
  doorVisual(THREE, R, 'N', 0.0, 14, 18, TEX.doorMetal);

  // Vão central vazado com guarda-corpo de ferro (Folha P2)
  const railM = tm(THREE, TEX.fence, 3, 1);
  plane(THREE, R.group, 8.0, 1.1, railM, 0, 0.55, -2.5, 0, 0);
  plane(THREE, R.group, 8.0, 1.1, railM, 0, 0.55, 2.5, 0, Math.PI);
  plane(THREE, R.group, 5.0, 1.1, railM, -4.0, 0.55, 0, 0, Math.PI / 2);
  plane(THREE, R.group, 5.0, 1.1, railM, 4.0, 0.55, 0, 0, -Math.PI / 2);
  solid(R, -4.2, -2.6, 4.2, 2.6);

  // Escadaria descendo para o Saguão no canto sudeste
  box(THREE, R.group, 2.5, 1.2, 1.8, flat(THREE, 0x2e2014), 6.5, 0.6, 4.5);
  solid(R, 5.2, 3.5, 7.8, 5.5);

  // Escadaria subindo para o 3º Andar no canto noroeste
  box(THREE, R.group, 2.5, 1.2, 1.8, flat(THREE, 0x2e2014), -6.5, 0.6, -4.5);
  solid(R, -7.8, -5.5, -5.2, -3.5);

  // Elevador na parede leste com painel de controle (Folha P2)
  box(THREE, R.group, 0.4, 2.8, 2.4, flat(THREE, 0x1c1e22), 8.8, 1.4, 0);
  plane(THREE, R.group, 2.0, 2.2, new THREE.MeshLambertMaterial({ map: TEX.doorMetal }), 8.58, 1.1, 0, 0, -Math.PI / 2);
  solid(R, 8.4, -1.3, 9.1, 1.3);

  pointLight(THREE, R, 0x8a7a5a, 4, 11, 0, 2.8, 0);
  pointLight(THREE, R, 0x3a5a7a, 3, 7, 7.5, 2.2, 0);

  addCam(R, [-9, -7, 0, 7], [-6.5, 3.0, 5.0], [-1.0, 1.2, 0.0], 65);
  addCam(R, [0, -7, 9, 7], [6.5, 3.0, -5.0], [1.0, 1.2, 0.0], 65);

  addDoor(R, 6.0, 3.5, 1.4, 'Descer para o Hall Principal (P1)', 'saguao', -5.5, -3.5, 0);
  addDoor(R, -6.0, -3.5, 1.4, 'Subir as escadas para o 3º Andar (P3)', 'corredor_p3', 0.0, 1.5, 0);
  addDoor(R, 0.0, 6.5, 1.3, 'Entrar na Ala Médica (Enfermaria)', 'enfermaria', 0.0, -2.2, 0);
  addDoor(R, 0.0, -6.5, 1.3, 'Entrar na Ala das Caldeiras', 'porao', 0.0, 3.5, Math.PI);

  addInteract(R, 7.8, 0.0, 1.4, 'Painel do elevador do 2º Andar', 'elevator_p2');
  addSpawn(R, 'enfermeira', -4.5, 3.5);
  return R;
}

// ---------------- CORREDOR DO 3º ANDAR (P3 - FOLHA P3) ----------------
function buildCorredorP3(THREE, TEX) {
  const R = baseRoom(THREE, TEX, 'corredor_p3', '3º ANDAR · CORREDOR SUPERIOR', 14, 6, 3.2);
  R.fog = { c: 0x04050a, n: 6, f: 22 };
  R.ambient = 'quarto';
  const floorM = tm(THREE, TEX.floorWood, 4, 2);
  const wallM = tm(THREE, TEX.wallpaper, 5, 1.4);
  const ceilM = tm(THREE, TEX.ceiling, 5, 2);
  plane(THREE, R.group, 14, 6, floorM, 0, 0, 0, -Math.PI / 2);
  plane(THREE, R.group, 14, 6, ceilM, 0, 3.2, 0, Math.PI / 2);

  perimeter(THREE, R, 14, 6, 3.2, wallM, [
    { side: 'W', at: 0.0, w: 1.8 },
    { side: 'N', at: 4.0, w: 1.8 },
    { side: 'S', at: 0.0, w: 1.8 },
  ]);
  doorVisual(THREE, R, 'W', 0.0, 6, 14, TEX.doorWood);
  doorVisual(THREE, R, 'N', 4.0, 6, 14, TEX.doorMetal);
  doorVisual(THREE, R, 'S', 0.0, 6, 14, TEX.doorWood);

  // Mesas de apoio nas pontas (Folha P3)
  box(THREE, R.group, 0.6, 0.8, 1.6, flat(THREE, 0x2e2014), 6.2, 0.4, 0);
  solid(R, 5.8, -0.9, 6.7, 0.9);

  box(THREE, R.group, 0.6, 0.8, 1.6, flat(THREE, 0x2e2014), -6.2, 0.4, 1.8);
  solid(R, -6.7, 0.9, -5.8, 2.7);

  pointLight(THREE, R, 0x3a5a8a, 4, 8, 0, 2.2, 0);

  addCam(R, [-7, -3, 0, 3], [-4.5, 2.4, 2.0], [0.0, 1.1, 0.0], 65);
  addCam(R, [0, -3, 7, 3], [4.5, 2.4, 2.0], [0.0, 1.1, 0.0], 65);

  addDoor(R, 0.0, 2.5, 1.3, 'Descer para o 2º Andar', 'mezanino', -6.0, -2.0, 0);
  addDoor(R, -6.5, 0.0, 1.3, 'Entrar na Sala do Dr. Alencastro', 'sala_dr_p3', 3.5, 0.0, Math.PI);
  addDoor(R, 4.0, -2.5, 1.4, 'Porta blindada de acesso ao Terraço', 'terraco', 3.0, 3.5, 0);

  addPickup(THREE, R, TEX, 'ammo9', 6.0, 0.0, 15, null, 0.85);
  addSpawn(R, 'infectado', -2.0, 0.0);
  return R;
}

// ---------------- SALA DO DR. ALENCASTRO (P3 - FOLHA P3) ----------------
function buildSalaDrP3(THREE, TEX) {
  const R = baseRoom(THREE, TEX, 'sala_dr_p3', 'SALA CONFIDENCIAL DO DR. ALENCASTRO', 10, 8, 3.2);
  R.fog = { c: 0x05040a, n: 5, f: 20 };
  R.ambient = 'consultorio';
  const floorM = tm(THREE, TEX.floorWood, 3, 3);
  const wallM = tm(THREE, TEX.wallpaper, 4, 1.4);
  const ceilM = tm(THREE, TEX.ceiling, 4, 3);
  plane(THREE, R.group, 10, 8, floorM, 0, 0, 0, -Math.PI / 2);
  plane(THREE, R.group, 10, 8, ceilM, 0, 3.2, 0, Math.PI / 2);
  perimeter(THREE, R, 10, 8, 3.2, wallM, [{ side: 'E', at: 0.0, w: 1.8 }]);
  doorVisual(THREE, R, 'E', 0.0, 8, 10, TEX.doorWood);

  const woodD = flat(THREE, 0x241810);
  // Estantes com pesquisas avançadas (Folha P3)
  box(THREE, R.group, 2.4, 2.4, 0.5, woodD, -2.5, 1.2, -3.6);
  plane(THREE, R.group, 2.3, 2.3, tm(THREE, TEX.bookcase, 1, 1), -2.5, 1.2, -3.34, 0, 0);
  solid(R, -3.8, -3.9, -1.2, -3.3);

  box(THREE, R.group, 2.4, 2.4, 0.5, woodD, 2.5, 1.2, -3.6);
  plane(THREE, R.group, 2.3, 2.3, tm(THREE, TEX.bookcase, 1, 1), 2.5, 1.2, -3.34, 0, 0);
  solid(R, 1.2, -3.9, 3.8, -3.3);

  // Mesa executiva central com papéis e microscópio (Folha P3)
  box(THREE, R.group, 2.2, 0.8, 1.2, woodD, 0.0, 0.4, 0.0);
  solid(R, -1.2, -0.7, 1.2, 0.7);

  // Tapete elegante
  plane(THREE, R.group, 3.2, 2.4, tm(THREE, TEX.rug, 1, 1), 0.0, 0.012, 0.0, -Math.PI / 2);

  pointLight(THREE, R, 0x8a7050, 4, 9, 0, 2.4, 0);

  addCam(R, [-5, -4, 0, 4], [-3.2, 2.4, 2.5], [0.0, 1.1, 0.0], 62);
  addCam(R, [0, -4, 5, 4], [3.2, 2.4, 2.5], [0.0, 1.1, 0.0], 62);

  addDoor(R, 4.5, 0.0, 1.3, 'Voltar ao Corredor P3', 'corredor_p3', -6.5, 0.0, -Math.PI / 2);

  addInteract(R, 0.0, 0.9, 1.4, 'Examinar a mesa do Dr. Alencastro', 'alencastro_desk_p3');
  addInteract(R, -2.5, -2.5, 1.3, 'Examinar as estantes de fórmulas', 'alencastro_books_p3');

  addPickup(THREE, R, TEX, 'terrace_key', 0.0, 0.0, 1, null, 0.85);
  addPickup(THREE, R, TEX, 'pills', 2.5, -3.0, 1, null, 0.5);
  return R;
}

// ---------------- SUBSOLO / CORREDOR (EXTRAS - FOLHA EXTRAS) ----------------
function buildSubsoloCorredor(THREE, TEX) {
  const R = baseRoom(THREE, TEX, 'subsolo_corredor', 'SUBSOLO · TÚNEIS DAS CATACUMBAS', 14, 6, 3.0);
  R.fog = { c: 0x060204, n: 5, f: 18 };
  R.ambient = 'porao';
  const floorM = tm(THREE, TEX.stoneFloor, 4, 2);
  const wallM = tm(THREE, TEX.wallStone, 5, 1.4);
  const ceilM = tm(THREE, TEX.stoneFloor, 5, 2);
  plane(THREE, R.group, 14, 6, floorM, 0, 0, 0, -Math.PI / 2);
  plane(THREE, R.group, 14, 6, ceilM, 0, 3.0, 0, Math.PI / 2);

  perimeter(THREE, R, 14, 6, 3.0, wallM, [
    { side: 'W', at: 0.0, w: 1.8 },
    { side: 'E', at: 0.0, w: 1.8 },
    { side: 'N', at: 0.0, w: 1.8 },
  ]);
  doorVisual(THREE, R, 'W', 0.0, 6, 14, TEX.doorMetal);
  doorVisual(THREE, R, 'E', 0.0, 6, 14, TEX.doorWood);
  doorVisual(THREE, R, 'N', 0.0, 6, 14, TEX.doorMetal);

  // Tubos de vapor no teto
  box(THREE, R.group, 13.0, 0.2, 0.2, flat(THREE, 0x4a4a4e), 0, 2.7, 1.8);
  box(THREE, R.group, 13.0, 0.2, 0.2, flat(THREE, 0x3a3a3e), 0, 2.5, 1.9);

  pointLight(THREE, R, 0x882020, 4, 8, 0, 2.2, 0);

  addCam(R, [-7, -3, 0, 3], [-4.0, 2.2, 2.0], [0.0, 1.0, 0.0], 65);
  addCam(R, [0, -3, 7, 3], [4.0, 2.2, 2.0], [0.0, 1.0, 0.0], 65);

  addDoor(R, 0.0, -2.5, 1.3, 'Subir para a Ala das Caldeiras', 'porao', 3.5, 3.5, 0);
  addDoor(R, -6.5, 0.0, 1.3, 'Entrar no Santuário do Culto', 'culto', 4.5, 0.0, -Math.PI / 2);
  addDoor(R, 6.5, 0.0, 1.3, 'Entrar na Sala de Experimentos', 'experimentos', -3.5, 0.0, Math.PI / 2);

  addSpawn(R, 'aberracao', 0.0, 0.0);
  return R;
}

// ---------------- SANTUÁRIO DO CULTO (EXTRAS - FOLHA EXTRAS) ----------------
function buildCulto(THREE, TEX) {
  const R = baseRoom(THREE, TEX, 'culto', 'SANTUÁRIO OCULTO · SALA DO CULTO', 14, 10, 4.0);
  R.fog = { c: 0x080204, n: 6, f: 22 };
  R.ambient = 'porao';
  const floorM = tm(THREE, TEX.stoneFloor, 4, 3);
  const wallM = tm(THREE, TEX.wallStone, 4, 2);
  const ceilM = tm(THREE, TEX.stoneFloor, 4, 3);
  plane(THREE, R.group, 14, 10, floorM, 0, 0, 0, -Math.PI / 2);
  plane(THREE, R.group, 14, 10, ceilM, 0, 4.0, 0, Math.PI / 2);

  perimeter(THREE, R, 14, 10, 4.0, wallM, [{ side: 'E', at: 0.0, w: 1.8 }]);
  doorVisual(THREE, R, 'E', 0.0, 10, 14, TEX.doorMetal);

  // Fileiras de cadeiras cerimoniais (Folha Extras)
  const woodD = flat(THREE, 0x241810);
  for (let z = -2.5; z <= 2.5; z += 2.5) {
    for (let x = 0; x <= 3; x += 1.5) {
      box(THREE, R.group, 0.6, 0.8, 0.6, woodD, x, 0.4, z);
      solid(R, x - 0.35, z - 0.35, x + 0.35, z + 0.35);
    }
  }

  // O GRANDE ALTAR DO CULTO na parede oeste (Folha Extras)
  const altM = tm(THREE, TEX.cultAltar, 1, 1);
  box(THREE, R.group, 1.8, 1.1, 3.2, altM, -4.8, 0.55, 0.0);
  solid(R, -5.8, -1.8, -3.8, 1.8);

  // Candelabros com fogo místico
  pointLight(THREE, R, 0xd02020, 6, 12, -4.5, 2.0, 0, { amp: 2, speed: 7 });

  addCam(R, [-7, -5, 0, 5], [-3.5, 2.6, 3.5], [-1.0, 1.2, 0.0], 65);
  addCam(R, [0, -5, 7, 5], [4.5, 2.6, 3.5], [0.0, 1.2, 0.0], 65);

  addDoor(R, 6.5, 0.0, 1.3, 'Voltar ao Corredor do Subsolo', 'subsolo_corredor', -6.5, 0.0, Math.PI / 2);

  addInteract(R, -3.6, 0.0, 1.5, 'Examinar o Altar Profanado', 'cult_altar');
  addPickup(THREE, R, TEX, 'cult_symbol', -4.5, 0.0, 1, null, 1.15);
  addSpawn(R, 'lamento', -1.5, 0.0);
  return R;
}

// ---------------- SALA DE EXPERIMENTOS SECRETOS (EXTRAS - FOLHA EXTRAS) ----------------
function buildExperimentos(THREE, TEX) {
  const R = baseRoom(THREE, TEX, 'experimentos', 'LABORATÓRIO DE EXPERIMENTOS SECRETOS', 10, 8, 3.2);
  R.fog = { c: 0x040608, n: 5, f: 20 };
  R.ambient = 'consultorio';
  const floorM = tm(THREE, TEX.floorTile, 3, 3);
  const wallM = tm(THREE, TEX.wallDirty, 4, 1.4);
  const ceilM = tm(THREE, TEX.ceiling, 4, 3);
  plane(THREE, R.group, 10, 8, floorM, 0, 0, 0, -Math.PI / 2);
  plane(THREE, R.group, 10, 8, ceilM, 0, 3.2, 0, Math.PI / 2);

  perimeter(THREE, R, 10, 8, 3.2, wallM, [{ side: 'W', at: 0.0, w: 1.8 }]);
  doorVisual(THREE, R, 'W', 0.0, 8, 10, TEX.doorWood);

  // MACA CIRÚRGICA CENTRAL DE DISSECAÇÃO com amarras (Folha Extras)
  const examM = tm(THREE, TEX.examTable, 1, 1);
  box(THREE, R.group, 2.2, 0.85, 1.1, examM, 0.0, 0.42, 0.0);
  solid(R, -1.2, -0.65, 1.2, 0.65);

  // Pia de aço cirúrgico no canto (Folha Extras)
  box(THREE, R.group, 1.2, 0.85, 0.7, flat(THREE, 0x6a7078), 3.8, 0.42, -2.8);
  solid(R, 3.1, -3.3, 4.5, -2.3);

  pointLight(THREE, R, 0x4a8090, 4, 9, 0, 2.4, 0);

  addCam(R, [-5, -4, 0, 4], [-3.0, 2.4, 2.5], [0.0, 1.0, 0.0], 62);
  addCam(R, [0, -4, 5, 4], [3.0, 2.4, 2.5], [0.0, 1.0, 0.0], 62);

  addDoor(R, -4.5, 0.0, 1.3, 'Voltar ao Corredor do Subsolo', 'subsolo_corredor', 6.5, 0.0, -Math.PI / 2);

  addInteract(R, 0.0, 1.0, 1.4, 'Examinar a maca de contenção de cobaias', 'exam_table');
  addInteract(R, 3.8, -1.8, 1.3, 'Inspecionar a pia e os frascos de órgãos', 'exam_sink');

  addPickup(THREE, R, TEX, 'alencastro_dossier', 0.0, 0.0, 1, null, 0.9);
  addPickup(THREE, R, TEX, 'antidote', 3.8, -2.8, 1, null, 0.9);
  addSpawn(R, 'enfermeira', 2.0, 1.5);
  return R;
}

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
