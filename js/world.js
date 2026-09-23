// ============================================================
// ECOS DO VAZIO - Mundo: salas 3D, câmeras fixas, colisões,
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
  // sólidos invisíveis nos vãos (impedem sair) + verga acima
  for (const g of gaps) {
    const lintelMat = wallMat;
    if (g.side === 'N' || g.side === 'S') {
      const z = g.side === 'N' ? -d / 2 : d / 2;
      solid(room, g.at - g.w / 2, z - 0.3, g.at + g.w / 2, z + 0.3);
      box(THREE, room.group, g.w + 0.4, h - 2.3, th, lintelMat, g.at, 2.3 + (h - 2.3) / 2, z);
    } else {
      const x = g.side === 'W' ? -w / 2 : w / 2;
      solid(room, x - 0.3, g.at - g.w / 2, x + 0.3, g.at + g.w / 2);
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
  room.doors.push({ x, z, r, label, target, sx, sz, sa, ...opts });
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

  addCam(R, [-5, -4, 1.2, 4], [-4.4, 2.5, 3.1], [-1, 0.8, -1.2], 62);
  addCam(R, [1.2, -4, 5, 4], [4.5, 2.4, 2.4], [1.5, 0.8, -1.6], 62);

  addDoor(R, 2.5, 3.3, 1.25, 'Abrir a porta', 'saguao', -5.5, 4.6, Math.PI);
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

  addCam(R, [-8, -6, -1, 6], [-7, 3.5, 4.8], [-2, 0.8, -1.5], 58);
  addCam(R, [-1, -6, 4, 6], [1.5, 3.7, 5.2], [0, 0.8, -2.5], 60);
  addCam(R, [4, -6, 8, 6], [7, 3.3, 4.4], [4, 0.8, -1], 58);

  addDoor(R, -5.5, 5.0, 1.3, 'Abrir a porta', 'quarto', 2.5, 2.8, Math.PI);
  addDoor(R, 7.1, 1, 1.3, 'Ir para a enfermaria', 'enfermaria', -8.2, 1, Math.PI / 2);
  addDoor(R, -7.1, -2, 1.3, 'Descer ao porão', 'porao', 7.2, -2, -Math.PI / 2,
    { need: { item: 'basekey' }, consume: true, setFlag: 'poraoOpen', msg: 'Trancada. A placa diz "PORÃO — PROIBIDO". Precisa da CHAVE DO PORÃO.' });
  addDoor(R, 3, -5.0, 1.5, 'Chamar o elevador', 'terraco', 3, 3.2, Math.PI,
    { need: { flag: 'fuseOn' }, elevator: true, msg: 'elevador_off' });
  addDoor(R, 0, 5.0, 1.4, 'Portão para os Jardins da Floresta', 'floresta', 0, -14.0, 0,
    { need: { item: 'forest_key' }, setFlag: 'forestUnlocked', msg: 'Portão de ferro fundido trancado. Precisa da CHAVE DO PORTÃO DE FERRO.' });
  addDoor(R, 7.1, -3.5, 1.3, 'Entrar na Capela', 'capela', 0, 8.5, Math.PI);

  addInteract(R, 0, -2.1, 1.5, 'Examinar a estátua', 'statue');
  addInteract(R, -6.5, 1.9, 1.4, 'Escrever no diário', 'save');
  addInteract(R, 6.5, -3.9, 1.2, 'Vasculhar o vaso', 'vase');
  addInteract(R, -6.4, -3.6, 1.6, 'Olhar a escada', 'stairs');

  addPickup(THREE, R, TEX, 'ribbon', -5.5, 2.5, 2);
  addPickup(THREE, R, TEX, 'page', -6.0, 3.4, 1, 1, 0.06);
  addPickup(THREE, R, TEX, 'ammo9', 6.8, 4.8, 12);

  addSpawn(R, 'sombra', 2.5, 1.5);

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

  addCam(R, [-9, -4, -3, 4], [-8.2, 2.4, 3.1], [-4, 0.8, -0.5], 60);
  addCam(R, [-3, -4, 3, 4], [0, 2.5, 3.5], [0, 0.8, -1.5], 62);
  addCam(R, [3, -4, 9, 4], [8.2, 2.4, 2.8], [4, 0.8, -0.5], 60);

  addDoor(R, -8.2, 1, 1.3, 'Voltar ao saguão', 'saguao', 7.2, 1, -Math.PI / 2);
  addDoor(R, 4, -3.2, 1.3, 'Abrir o consultório', 'consultorio', -1, 2.8, Math.PI,
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
  addSpawn(R, 'sombra', 5.5, 1.5);
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

  addCam(R, [-5, -4, 0.5, 4], [-4.2, 2.5, 3.2], [-1, 0.8, -1.5], 62);
  addCam(R, [0.5, -4, 5, 4], [4.2, 2.5, 3.0], [1, 0.8, -1.5], 62);

  addDoor(R, -1, 3.2, 1.3, 'Voltar à enfermaria', 'enfermaria', 4, -2.8, 0);

  addInteract(R, 2, -1.7, 1.4, 'Ler os papéis', 'desk');
  addInteract(R, -3, -3.0, 1.3, 'Abrir o cofre', 'safe');
  addInteract(R, 4.2, -1.5, 1.3, 'Vasculhar a estante', 'estante');
  addInteract(R, -4.4, 0.5, 1.3, 'Examinar o retrato', 'painting');

  addPickup(THREE, R, TEX, 'fuse', 3.9, 0.9, 1, null, 0.9);
  addPickup(THREE, R, TEX, 'ribbon', -3.5, 2.2, 1);
  addPickup(THREE, R, TEX, 'ammo9', 0.5, -3.3, 12);
  addPickup(THREE, R, TEX, 'page', 1.2, 0.8, 1, 4, 0.06);

  addSpawn(R, 'sombra', 0.5, 1.5);
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

  addCam(R, [0, -6, 8, 6], [7, 2.5, 4.6], [3, 0.7, -1.5], 60);
  addCam(R, [-4, -6, 0, 6], [-2, 2.5, 5.2], [-2, 0.7, -2], 62);
  addCam(R, [-8, -6, -4, 6], [-7, 2.5, 4.6], [-5, 0.7, -1], 60);

  addDoor(R, 7.2, -2, 1.3, 'Voltar ao saguão', 'saguao', -7.2, -2, Math.PI / 2);
  addDoor(R, -6.5, 3.5, 1.4, 'Subir pelo Alçapão para a Floresta', 'floresta', -8.5, 0.5, 0);

  addInteract(R, 1.5, -0.3, 1.5, 'Girar a válvula', 'valve');
  addInteract(R, 5, -3.7, 1.6, 'Examinar a caldeira', 'boiler');
  addInteract(R, -6, -3.8, 1.5, 'Vasculhar o engradado', 'crate');

  addPickup(THREE, R, TEX, 'shotgun', -6, 4.8, 1, null, 1.05);
  addPickup(THREE, R, TEX, 'shell', -5, -2.5, 12);
  addPickup(THREE, R, TEX, 'ammo9', 6.5, 0.5, 24);
  addPickup(THREE, R, TEX, 'pills', 2.5, 5.2, 1);
  addPickup(THREE, R, TEX, 'pills', -3, 5.2, 1);
  addPickup(THREE, R, TEX, 'ribbon', 2, 5.2, 1);
  addPickup(THREE, R, TEX, 'page', 6, 4.5, 1, 5, 0.06);
  addPickup(THREE, R, TEX, 'page', -7.2, 0.5, 1, 6, 0.06);

  addSpawn(R, 'sombra', 4, 2.5);
  addSpawn(R, 'lamento', -4, 2);
  addSpawn(R, 'lamento', -2.5, -4);

  R.fx = (dt, t, game) => {
    if (R.waterTex) { R.waterTex.offset.x = (t * 0.02) % 1; R.waterTex.offset.y = (t * 0.013) % 1; }
    const drained = game.flags.valveOpen;
    if (R.waterMesh) R.waterMesh.visible = !drained;
    if (R.valveWheel && drained) R.valveWheel.rotation.z += dt * 0.2;
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

  addCam(R, [-7, -1, 7, 6], [5.5, 3.4, 5.2], [0, 1, -2.5], 60);
  addCam(R, [-7, -6, 7, -1], [-5, 3.6, 1.5], [0, 1, -4], 60);

  addDoor(R, 3, 3.7, 1.4, 'Descer de elevador', 'saguao', 3, -4.8, 0, { elevator: true });

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
  addCam(R, [-13, 8, 13, 18], [0, 3.8, 16.5], [0, 1.2, 8], 62);
  addCam(R, [-13, -2, 13, 8], [6.5, 3.6, 5], [0, 1.0, 0], 60);
  addCam(R, [-2, -18, 13, -2], [8.0, 3.5, -12], [0, 1.2, -16], 62);
  addCam(R, [-13, -18, -2, -2], [-3.0, 3.5, -13], [-7, 0.8, -7], 60);

  // Portas
  addDoor(R, 0, -17.0, 1.6, 'Entrar no Sanatório (Saguão)', 'saguao', 0, 4.0, Math.PI);
  addDoor(R, 12.0, -4.0, 1.5, 'Entrar na Capela', 'capela', 5.5, 0, -Math.PI / 2);
  addDoor(R, -8.5, 1.5, 1.5, 'Descer pelo Alçapão ao Porão', 'porao', -6.0, 3.0, 0);

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

  // Bancos de madeira (fileiras à esquerda e à direita do corredor central)
  for (let z = -5; z <= 5; z += 2.5) {
    box(THREE, R.group, 3.2, 0.7, 0.6, pewM, -3.5, 0.35, z);
    solid(R, -5.2, z - 0.4, -1.8, z + 0.4);
    box(THREE, R.group, 3.2, 0.7, 0.6, pewM, 3.5, 0.35, z);
    solid(R, 1.8, z - 0.4, 5.2, z + 0.4);
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
  addCam(R, [-7, 2, 7, 11], [0, 3.6, 9.8], [0, 1.2, 2], 58);
  addCam(R, [-7, -4, 7, 2], [-4.5, 3.4, 0], [0, 1.0, -3], 60);
  addCam(R, [-7, -11, 7, -4], [0, 3.2, -4], [0, 1.2, -8.5], 62);

  // Portas
  addDoor(R, 0, 10.0, 1.5, 'Voltar ao Saguão Principal', 'saguao', 6.0, -3.5, -Math.PI / 2);
  addDoor(R, 6.0, 0, 1.5, 'Saída para os Jardins da Floresta', 'floresta', 10.5, -4.0, Math.PI / 2);

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

const BUILDERS = {
  quarto: buildQuarto,
  saguao: buildSaguao,
  enfermaria: buildEnfermaria,
  consultorio: buildConsultorio,
  porao: buildPorao,
  terraco: buildTerraco,
  floresta: buildFloresta,
  capela: buildCapela,
};

export function buildRoom(THREE, TEX, id) {
  const b = BUILDERS[id];
  if (!b) throw new Error('Sala desconhecida: ' + id);
  return b(THREE, TEX);
}

export const ROOM_IDS = Object.keys(BUILDERS);
