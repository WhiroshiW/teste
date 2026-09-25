// ============================================================
// ECOS DO VAZIO - Entidades: colisão, partículas, jogador, inimigos, NPCs
// Modelos low-poly construídos com primitivas (estilo PS1 autêntico).
// ============================================================
import { WEAPONS, ENEMIES, CAMPAIGNS } from './config.js';

// Colisão círculo x lista de AABBs {x0,z0,x1,z1}. Ajusta p in-place.
export function collideCircle(p, r, solids) {
  for (const s of solids) {
    const cx = Math.max(s.x0, Math.min(p.x, s.x1));
    const cz = Math.max(s.z0, Math.min(p.z, s.z1));
    let dx = p.x - cx, dz = p.z - cz;
    const d2 = dx * dx + dz * dz;
    if (d2 < r * r) {
      if (d2 > 1e-8) {
        const d = Math.sqrt(d2);
        p.x = cx + (dx / d) * r;
        p.z = cz + (dz / d) * r;
      } else {
        // centro dentro da caixa: empurra pelo eixo mais próximo
        const pushL = p.x - s.x0 + r, pushR = s.x1 - p.x + r;
        const pushU = p.z - s.z0 + r, pushD = s.z1 - p.z + r;
        const m = Math.min(pushL, pushR, pushU, pushD);
        if (m === pushL) p.x = s.x0 - r;
        else if (m === pushR) p.x = s.x1 + r;
        else if (m === pushU) p.z = s.z0 - r;
        else p.z = s.z1 + r;
      }
    }
  }
}

export function pointInSolids(x, z, solids) {
  for (const s of solids) {
    if (x >= s.x0 && x <= s.x1 && z >= s.z0 && z <= s.z1) return true;
  }
  return false;
}

// ------------------------------ PARTÍCULAS ------------------------------
export class Particles {
  constructor(THREE, scene, TEX) {
    this.THREE = THREE;
    this.N = 400;
    this.pos = new Float32Array(this.N * 3);
    this.vel = new Float32Array(this.N * 3);
    this.life = new Float32Array(this.N);
    this.maxLife = new Float32Array(this.N);
    this.grav = new Float32Array(this.N);
    this.col = new Float32Array(this.N * 3);
    this.sz = new Float32Array(this.N);

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(this.col, 3));
    this.geo = geo;

    const mat = new THREE.PointsMaterial({
      size: 0.12,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
    });
    this.p = new THREE.Points(geo, mat);
    scene.add(this.p);
    this.head = 0;
  }

  clear() {
    for (let i = 0; i < this.N; i++) this.life[i] = 0;
    this.geo.attributes.position.needsUpdate = true;
  }

  burst(x, y, z, count, type = 'blood') {
    for (let i = 0; i < count; i++) {
      const idx = this.head;
      this.head = (this.head + 1) % this.N;
      const i3 = idx * 3;
      this.pos[i3] = x; this.pos[i3 + 1] = y; this.pos[i3 + 2] = z;
      const sp = (type === 'spark' ? 3.5 : type === 'smoke' ? 0.6 : 1.8) * (0.5 + Math.random() * 0.8);
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI - Math.PI / 2;
      this.vel[i3] = Math.cos(theta) * Math.cos(phi) * sp;
      this.vel[i3 + 1] = (Math.sin(phi) + 0.6) * sp * 0.8;
      this.vel[i3 + 2] = Math.sin(theta) * Math.cos(phi) * sp;
      this.maxLife[idx] = this.life[idx] = type === 'smoke' ? 1.0 : (0.3 + Math.random() * 0.4);
      this.grav[idx] = type === 'smoke' ? -0.3 : 9.8;
      if (type === 'blood') {
        this.col[i3] = 0.55; this.col[i3 + 1] = 0.05; this.col[i3 + 2] = 0.05;
      } else if (type === 'spark') {
        this.col[i3] = 1.0; this.col[i3 + 1] = 0.8; this.col[i3 + 2] = 0.3;
      } else if (type === 'light') {
        this.col[i3] = 0.6; this.col[i3 + 1] = 0.9; this.col[i3 + 2] = 1.0;
      } else if (type === 'dark') {
        this.col[i3] = 0.1; this.col[i3 + 1] = 0.05; this.col[i3 + 2] = 0.15;
      } else {
        this.col[i3] = 0.4; this.col[i3 + 1] = 0.4; this.col[i3 + 2] = 0.45;
      }
    }
    this.geo.attributes.position.needsUpdate = true;
    this.geo.attributes.color.needsUpdate = true;
  }

  update(dt) {
    let alive = 0;
    for (let i = 0; i < this.N; i++) {
      if (this.life[i] <= 0) continue;
      this.life[i] -= dt;
      alive++;
      const i3 = i * 3;
      this.vel[i3 + 1] -= this.grav[i] * dt;
      this.pos[i3] += this.vel[i3] * dt;
      this.pos[i3 + 1] += this.vel[i3 + 1] * dt;
      this.pos[i3 + 2] += this.vel[i3 + 2] * dt;
      if (this.pos[i3 + 1] < 0.02) {
        this.pos[i3 + 1] = 0.02;
        this.vel[i3] *= 0.5; this.vel[i3 + 2] *= 0.5;
        this.vel[i3 + 1] = 0;
      }
    }
    if (alive > 0) this.geo.attributes.position.needsUpdate = true;
  }
}

// ------------------------------- JOGADOR -------------------------------
export class Player {
  constructor(THREE, TEX) {
    this.THREE = THREE;
    this.TEX = TEX;
    this.heroId = 'daniel';
    this.skinId = 'default';
    this.group = new THREE.Group();
    this.mats = [];

    const lam = (c, map = null, e = 0x000000) => {
      const m = new THREE.MeshLambertMaterial({ color: c, map, emissive: e });
      this.mats.push(m);
      return m;
    };
    this.lam = lam;

    this.skinMat = lam(0xc8a080);
    this.coatMat = lam(0x2a3448);
    this.coatDMat = lam(0x1c2434);
    this.pantsMat = lam(0x3a3a40);
    this.hairMat = lam(0x241812);
    this.shoesMat = lam(0x1a1412);

    const bx = (w, h, d, m, x, y, z, parent = this.group) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
      mesh.position.set(x, y, z);
      parent.add(mesh);
      return mesh;
    };

    // pernas
    this.legL = new THREE.Group(); this.legL.position.set(-0.13, 0.78, 0);
    this.legR = new THREE.Group(); this.legR.position.set(0.13, 0.78, 0);
    this.group.add(this.legL, this.legR);
    this.legMeshL = bx(0.2, 0.78, 0.24, this.pantsMat, 0, -0.39, 0, this.legL);
    this.legMeshR = bx(0.2, 0.78, 0.24, this.pantsMat, 0, -0.39, 0, this.legR);
    bx(0.22, 0.12, 0.34, this.shoesMat, 0, -0.72, 0.04, this.legL);
    bx(0.22, 0.12, 0.34, this.shoesMat, 0, -0.72, 0.04, this.legR);

    // tronco
    this.torso = bx(0.52, 0.72, 0.32, this.coatMat, 0, 1.14, 0);
    this.torsoTrim = bx(0.56, 0.3, 0.36, this.coatDMat, 0, 0.72, 0);

    // braços
    this.armL = new THREE.Group(); this.armL.position.set(-0.33, 1.42, 0);
    this.armR = new THREE.Group(); this.armR.position.set(0.33, 1.42, 0);
    this.group.add(this.armL, this.armR);
    this.armMeshL = bx(0.14, 0.62, 0.16, this.coatMat, 0, -0.28, 0, this.armL);
    this.armMeshR = bx(0.14, 0.62, 0.16, this.coatMat, 0, -0.28, 0, this.armR);
    bx(0.13, 0.14, 0.14, this.skinMat, 0, -0.62, 0, this.armL);
    bx(0.13, 0.14, 0.14, this.skinMat, 0, -0.62, 0, this.armR);

    // cabeça
    this.head = new THREE.Group(); this.head.position.set(0, 1.62, 0);
    this.group.add(this.head);
    this.faceMat = new THREE.MeshLambertMaterial({ color: 0xffffff, map: TEX.faceDaniel });
    this.mats.push(this.faceMat);
    this.headMesh = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.34, 0.3), [
      this.hairMat, this.hairMat, this.hairMat, this.skinMat, this.faceMat, this.hairMat,
    ]);
    this.head.add(this.headMesh);
    this.hairMesh = bx(0.32, 0.1, 0.32, this.hairMat, 0, 0.18, -0.01, this.head);

    // armas na mão direita
    this.gunPivot = new THREE.Group();
    this.gunPivot.position.set(0, -0.62, 0.05);
    this.armR.add(this.gunPivot);

    const gunM = lam(0x2a2a2e);
    const metalM = lam(0x889098);
    const darkWood = lam(0x4a3020);

    // 1. Pistola M9
    const pistol = new THREE.Group();
    const pm = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.1, 0.3), gunM);
    pm.position.set(0, 0, 0.12); pistol.add(pm);
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.16, 0.08), darkWood);
    grip.position.set(0, -0.1, 0.02); pistol.add(grip);
    this.pistolM = pistol;

    // 2. Espingarda Cal.12
    this.shotgunM = new THREE.Group();
    const sb = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.09, 0.62), lam(0x3a2c1c));
    sb.position.set(0, 0, 0.28); this.shotgunM.add(sb);
    const sb2 = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.6), gunM);
    sb2.position.set(0, 0.06, 0.28); this.shotgunM.add(sb2);

    // 3. Faca de Cozinha
    this.knifeM = new THREE.Group();
    const kb = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.05, 0.34), metalM);
    kb.position.set(0, 0, 0.2); this.knifeM.add(kb);
    const kh = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.07, 0.12), darkWood);
    kh.position.set(0, 0, 0); this.knifeM.add(kh);

    // 4. Revólver .38 (Clara)
    this.revolverM = new THREE.Group();
    const revB = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.08, 0.36), metalM);
    revB.position.set(0, 0.02, 0.15); this.revolverM.add(revB);
    const revCyl = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.1, 6), gunM);
    revCyl.rotation.x = Math.PI / 2; revCyl.position.set(0, 0.01, 0.04); this.revolverM.add(revCyl);
    const revGrip = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.14, 0.07), darkWood);
    revGrip.position.set(0, -0.09, -0.02); this.revolverM.add(revGrip);

    // 5. Bisturi Cirúrgico (Clara)
    this.scalpelM = new THREE.Group();
    const scB = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.03, 0.24), metalM);
    scB.position.set(0, 0, 0.12); this.scalpelM.add(scB);

    // 6. Chave Inglesa (Bento)
    this.wrenchM = new THREE.Group();
    const wrB = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.06, 0.44), lam(0x5a6068));
    wrB.position.set(0, 0, 0.22); this.wrenchM.add(wrB);
    const wrH = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.08, 0.12), lam(0x4a5058));
    wrH.position.set(0, 0.02, 0.44); this.wrenchM.add(wrH);

    // 7. Lança-Granadas
    this.grenadeM = new THREE.Group();
    const glTube = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.55, 7), lam(0x283424));
    glTube.rotation.x = Math.PI / 2; glTube.position.set(0, 0.03, 0.24); this.grenadeM.add(glTube);
    const glStock = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.12, 0.22), darkWood);
    glStock.position.set(0, -0.04, -0.06); this.grenadeM.add(glStock);

    // 8. Magnum .44
    this.magnumM = new THREE.Group();
    const magB = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.1, 0.46), lam(0xb0b8c0));
    magB.position.set(0, 0.03, 0.22); this.magnumM.add(magB);
    const magCyl = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.12, 6), lam(0x707880));
    magCyl.rotation.x = Math.PI / 2; magCyl.position.set(0, 0.02, 0.06); this.magnumM.add(magCyl);
    const magG = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.16, 0.09), lam(0x2e1810));
    magG.position.set(0, -0.1, -0.02); this.magnumM.add(magG);

    this.gunPivot.add(
      this.pistolM, this.shotgunM, this.knifeM, this.revolverM,
      this.scalpelM, this.wrenchM, this.grenadeM, this.magnumM
    );

    // sombra falsa
    const sh = new THREE.Mesh(
      new THREE.PlaneGeometry(0.9, 0.9),
      new THREE.MeshBasicMaterial({ map: TEX.blob, color: 0x000000, transparent: true, opacity: 0.45, depthWrite: false })
    );
    sh.rotation.x = -Math.PI / 2; sh.position.y = 0.02;
    this.group.add(sh);

    this.hp = 100; this.maxhp = 100;
    this.speedMult = 1.0;
    this.angle = 0;
    this.weapon = 'knife';
    this.aiming = false;
    this.fireCd = 0;
    this.iframes = 0;
    this.flash = 0;
    this.walkPhase = 0;
    this.moving = false;
    this.dead = false;

    this.setHero('daniel', 'default');
    this.setWeapon('knife');
  }

  setHero(heroId, skinId = 'default') {
    this.heroId = heroId;
    this.skinId = skinId;
    const cfg = CAMPAIGNS[heroId] || CAMPAIGNS.daniel;
    this.maxhp = cfg.hp;
    this.hp = Math.min(this.hp, this.maxhp);
    this.speedMult = cfg.speed || 1.0;

    if (skinId === 'tactical') {
      this.coatMat.color.setHex(0x1c221a);
      this.coatDMat.color.setHex(0x141812);
      this.pantsMat.color.setHex(0x1a1e18);
    } else if (heroId === 'clara') {
      this.coatMat.color.setHex(0xd8d8d4); // jaleco médico
      this.coatDMat.color.setHex(0x6b1d28); // vinho
      this.pantsMat.color.setHex(0x222228);
      this.hairMat.color.setHex(0x4a2c18);
      this.faceMat.map = this.TEX.claraBody || this.TEX.faceDaniel;
    } else if (heroId === 'bento') {
      this.coatMat.color.setHex(0x223854); // macacão azul
      this.coatDMat.color.setHex(0x1a283a);
      this.pantsMat.color.setHex(0x223854);
      this.hairMat.color.setHex(0x484848);
      this.faceMat.map = this.TEX.bentoBody || this.TEX.faceDaniel;
    } else {
      // Daniel
      this.coatMat.color.setHex(0x2a3448);
      this.coatDMat.color.setHex(0x1c2434);
      this.pantsMat.color.setHex(0x3a3a40);
      this.hairMat.color.setHex(0x241812);
      this.faceMat.map = this.TEX.faceDaniel;
    }
    this.faceMat.needsUpdate = true;
  }

  addTo(scene) { scene.add(this.group); }
  removeFrom(scene) { scene.remove(this.group); }
  place(x, z, angle = 0) {
    const validX = Number.isFinite(x) ? x : 0;
    const validZ = Number.isFinite(z) ? z : 0;
    const validAngle = Number.isFinite(angle) ? angle : 0;
    this.group.position.set(validX, 0, validZ);
    this.group.visible = true;
    this.dead = false;
    this.angle = validAngle;
    this.group.rotation.set(0, validAngle, 0);
    if (this.legL) this.legL.rotation.set(0, 0, 0);
    if (this.legR) this.legR.rotation.set(0, 0, 0);
    if (this.armL) this.armL.rotation.set(0, 0, 0);
    if (this.armR) this.armR.rotation.set(0, 0, 0);
    if (this.torso) this.torso.rotation.set(0, 0, 0);
    if (this.head) this.head.position.set(0, 1.62, 0);
    for (const m of this.mats) {
      if (m.emissive) m.emissive.setRGB(0, 0, 0);
      m.opacity = 1.0;
      m.transparent = false;
    }
  }
  get x() { return this.group.position.x; }
  get z() { return this.group.position.z; }

  setWeapon(w) {
    this.weapon = w;
    this.pistolM.visible = w === 'pistol';
    this.shotgunM.visible = w === 'shotgun';
    this.knifeM.visible = w === 'knife';
    this.revolverM.visible = w === 'revolver';
    this.scalpelM.visible = w === 'scalpel';
    this.wrenchM.visible = w === 'wrench';
    this.grenadeM.visible = w === 'grenade_launcher';
    this.magnumM.visible = w === 'magnum';
    this.gunPivot.visible = this.aiming;
  }

  setAim(b) {
    this.aiming = b;
    this.gunPivot.visible = b;
  }

  update(dt, input, room) {
    const ev = { step: false, run: false };
    if (this.dead) return ev;
    if (!Number.isFinite(this.angle)) this.angle = 0;
    if (!Number.isFinite(this.group.position.x)) this.group.position.x = 0;
    if (!Number.isFinite(this.group.position.z)) this.group.position.z = 0;
    this.fireCd = Math.max(0, this.fireCd - dt);
    this.iframes = Math.max(0, this.iframes - dt);
    if (this.flash > 0) {
      this.flash = Math.max(0, this.flash - dt * 4);
      for (const m of this.mats) m.emissive.setRGB(this.flash * 0.7, this.flash * 0.1, this.flash * 0.1);
    } else {
      for (const m of this.mats) m.emissive.setRGB(0, 0, 0);
    }
    const TURN = 2.6;
    const WALK = 2.3 * this.speedMult;
    const RUN = 4.2 * this.speedMult;

    if (this.aiming) {
      if (input.l) this.angle += TURN * 0.8 * dt;
      if (input.r) this.angle -= TURN * 0.8 * dt;
      this.moving = false;
      this.armR.rotation.set(-1.45, 0.18, 0);
      this.armL.rotation.set(-1.40, -0.22, 0);
      this.legL.rotation.x = 0; this.legR.rotation.x = 0;
      this.group.rotation.y = this.angle;
      return ev;
    }

    if (input.l) this.angle += TURN * dt;
    if (input.r) this.angle -= TURN * dt;
    this.group.rotation.y = this.angle;

    let v = 0;
    if (input.f) v = 1;
    else if (input.b) v = -0.65;

    if (v !== 0) {
      this.moving = true;
      const running = input.run && v > 0;
      const sp = (running ? RUN : WALK) * v;
      const prevPhase = this.walkPhase;
      this.walkPhase += dt * (running ? 11 : 7.5);

      const dx = Math.sin(this.angle) * sp * dt;
      const dz = Math.cos(this.angle) * sp * dt;
      this.group.position.x += dx;
      this.group.position.z += dz;

      collideCircle(this.group.position, 0.38, room.solids);

      const sw = Math.sin(this.walkPhase);
      this.legL.rotation.x = sw * 0.55;
      this.legR.rotation.x = -sw * 0.55;
      this.armL.rotation.x = -sw * 0.45;
      this.armR.rotation.x = sw * 0.45;
      this.armL.rotation.z = 0.05; this.armR.rotation.z = -0.05;
      this.torso.rotation.y = -sw * 0.06;

      if ((prevPhase % Math.PI) > (this.walkPhase % Math.PI)) {
        ev.step = true;
        ev.run = running;
      }
    } else {
      this.moving = false;
      this.legL.rotation.x *= Math.max(0, 1 - dt * 10);
      this.legR.rotation.x *= Math.max(0, 1 - dt * 10);
      this.armL.rotation.x *= Math.max(0, 1 - dt * 10);
      this.armR.rotation.x *= Math.max(0, 1 - dt * 10);
      this.torso.rotation.y *= Math.max(0, 1 - dt * 10);
      this.head.position.y = 1.62 + Math.sin(performance.now() / 600) * 0.015;
    }
    return ev;
  }

  damage(n) {
    if (this.iframes > 0 || this.dead) return false;
    this.hp = Math.max(0, this.hp - n);
    this.iframes = 1.0;
    this.flash = 1.0;
    if (this.hp <= 0) {
      this.dead = true;
      this.aiming = false;
      this.gunPivot.visible = false;
    }
    return true;
  }

  dieAnim(dt) {
    this.group.rotation.x = Math.max(-Math.PI / 2 + 0.1, this.group.rotation.x - dt * 2.5);
    this.group.position.y = Math.max(-0.4, this.group.position.y - dt * 0.4);
  }

  muzzleWorld(out) {
    out = out || new this.THREE.Vector3();
    this.gunPivot.getWorldPosition(out);
    out.y += 0.05;
    return out;
  }

  canFire() { return this.fireCd <= 0; }
  spendCooldown(rate = 0.4) { this.fireCd = rate; }
}

// ------------------------------ INIMIGOS ------------------------------
let ENEMY_ID = 1;

export class Enemy {
  constructor(THREE, TEX, type, x, z, dead = false) {
    this.THREE = THREE;
    this.TEX = TEX;
    this.type = type;
    this.cfg = ENEMIES[type] || ENEMIES.sombra;
    this.id = ENEMY_ID++;
    this.hp = this.cfg.hp;
    this.maxhp = this.cfg.hp;
    this.state = dead ? 'dead' : 'dormant';
    this.stateT = 0;
    this.atkCd = 0;
    this.flash = 0;
    this.phase = Math.random() * 10;
    this.noticed = false;
    this.chargeDir = { x: 0, z: 0 };
    this.growlT = Math.random() * 3;
    this.mats = [];
    this.arms = [];
    this.legs = [];
    this.tentacles = [];
    this.group = new THREE.Group();
    this.buildMesh();
    this.group.position.set(x, 0, z);
    if (dead) {
      this.group.rotation.x = -Math.PI / 2 + 0.15;
      this.group.position.y = -0.55;
      this.deadSettled = true;
    }
    this.dead = dead;
  }

  buildMesh() {
    const s = this.cfg.scale;
    const lam = (c, e = 0x000000, map = null) => {
      const m = new this.THREE.MeshLambertMaterial({ color: c, emissive: e, map });
      this.mats.push(m);
      return m;
    };

    // ================= 1. CARNIÇAL RASTEJADOR =================
    if (this.type === 'rastejador') {
      const skinM = lam(0x384838, 0x000000, this.TEX.crawlerSkin);
      const darkM = lam(0x182418);
      // corpo horizontal baixo
      const torso = new this.THREE.Mesh(new this.THREE.BoxGeometry(0.4 * s, 0.28 * s, 0.7 * s), skinM);
      torso.position.y = 0.35 * s;
      this.group.add(torso);
      this.torso = torso;

      // cabeça projetada para frente
      const head = new this.THREE.Mesh(new this.THREE.BoxGeometry(0.24 * s, 0.2 * s, 0.32 * s), darkM);
      head.position.set(0, 0.42 * s, 0.42 * s);
      this.group.add(head);

      // olhos verdes luminescentes
      const eyeM = new this.THREE.MeshBasicMaterial({ color: 0x55ff66 });
      this.mats.push(eyeM);
      const eL = new this.THREE.Mesh(new this.THREE.PlaneGeometry(0.06 * s, 0.04 * s), eyeM);
      eL.position.set(-0.08 * s, 0.44 * s, 0.59 * s);
      const eR = new this.THREE.Mesh(new this.THREE.PlaneGeometry(0.06 * s, 0.04 * s), eyeM);
      eR.position.set(0.08 * s, 0.44 * s, 0.59 * s);
      this.group.add(eL, eR);

      // 4 membros rastejantes
      for (const [sx, sz] of [[-0.25, 0.2], [0.25, 0.2], [-0.25, -0.2], [0.25, -0.2]]) {
        const leg = new this.THREE.Group();
        leg.position.set(sx * s, 0.35 * s, sz * s);
        const lmesh = new this.THREE.Mesh(new this.THREE.BoxGeometry(0.08 * s, 0.45 * s, 0.08 * s), skinM);
        lmesh.position.y = -0.2 * s;
        leg.add(lmesh);
        this.group.add(leg);
        this.legs.push(leg);
      }
      return;
    }

    // ================= 2. O CARRASCO (BRUTO) =================
    if (this.type === 'carrasco') {
      const hoodM = lam(0x3a342c, 0x000000, this.TEX.executionerBody);
      const skinM = lam(0x2a2420);
      const ironM = lam(0x5a6068, 0x000000, this.TEX.rustyCleaver);

      // pernas grossas
      for (const side of [-0.28, 0.28]) {
        const leg = new this.THREE.Mesh(new this.THREE.BoxGeometry(0.32 * s, 0.9 * s, 0.36 * s), skinM);
        leg.position.set(side * s, 0.45 * s, 0);
        this.group.add(leg);
      }
      // torso maciço
      const torso = new this.THREE.Mesh(new this.THREE.BoxGeometry(0.9 * s, 1.1 * s, 0.55 * s), hoodM);
      torso.position.y = 1.35 * s;
      this.group.add(torso);

      // cabeça encapuzada
      const head = new this.THREE.Mesh(new this.THREE.BoxGeometry(0.45 * s, 0.55 * s, 0.45 * s), hoodM);
      head.position.y = 2.05 * s;
      this.group.add(head);

      // olhos vermelhos sob a fenda
      const eyeM = new this.THREE.MeshBasicMaterial({ color: 0xff1111 });
      this.mats.push(eyeM);
      const fenda = new this.THREE.Mesh(new this.THREE.PlaneGeometry(0.24 * s, 0.05 * s), eyeM);
      fenda.position.set(0, 2.08 * s, 0.235 * s);
      this.group.add(fenda);

      // braço esquerdo
      const armL = new this.THREE.Group(); armL.position.set(-0.55 * s, 1.7 * s, 0);
      const alMesh = new this.THREE.Mesh(new this.THREE.BoxGeometry(0.24 * s, 0.95 * s, 0.24 * s), skinM);
      alMesh.position.y = -0.4 * s; armL.add(alMesh);
      this.group.add(armL); this.arms.push(armL);

      // braço direito com cutelo gigante
      const armR = new this.THREE.Group(); armR.position.set(0.55 * s, 1.7 * s, 0);
      const arMesh = new this.THREE.Mesh(new this.THREE.BoxGeometry(0.24 * s, 0.95 * s, 0.24 * s), skinM);
      arMesh.position.y = -0.4 * s; armR.add(arMesh);

      // Cutelo
      const cleaver = new this.THREE.Group();
      cleaver.position.set(0, -0.75 * s, 0.15 * s);
      const handle = new this.THREE.Mesh(new this.THREE.BoxGeometry(0.08 * s, 0.75 * s, 0.08 * s), lam(0x3a2010));
      handle.position.y = 0.2 * s; cleaver.add(handle);
      const blade = new this.THREE.Mesh(new this.THREE.BoxGeometry(0.06 * s, 0.7 * s, 0.45 * s), ironM);
      blade.position.set(0, 0.7 * s, 0.15 * s); cleaver.add(blade);
      armR.add(cleaver);
      this.group.add(armR); this.arms.push(armR);
      return;
    }

    // ================= 3. CÃO SOMBRIO =================
    if (this.type === 'cao') {
      const furM = lam(0x181820);
      const darkM = lam(0x0e0e14);
      // corpo horizontal
      const body = new this.THREE.Mesh(new this.THREE.BoxGeometry(0.35 * s, 0.4 * s, 0.85 * s), furM);
      body.position.y = 0.45 * s; this.group.add(body);
      // cabeça canina
      const head = new this.THREE.Mesh(new this.THREE.BoxGeometry(0.28 * s, 0.3 * s, 0.4 * s), darkM);
      head.position.set(0, 0.65 * s, 0.48 * s); this.group.add(head);
      // focinho
      const snout = new this.THREE.Mesh(new this.THREE.BoxGeometry(0.18 * s, 0.16 * s, 0.25 * s), darkM);
      snout.position.set(0, 0.58 * s, 0.72 * s); this.group.add(snout);
      // olhos âmbar
      const eyeM = new this.THREE.MeshBasicMaterial({ color: 0xffaa22 });
      this.mats.push(eyeM);
      const eL = new this.THREE.Mesh(new this.THREE.PlaneGeometry(0.05 * s, 0.04 * s), eyeM);
      eL.position.set(-0.09 * s, 0.68 * s, 0.66 * s);
      const eR = new this.THREE.Mesh(new this.THREE.PlaneGeometry(0.05 * s, 0.04 * s), eyeM);
      eR.position.set(0.09 * s, 0.68 * s, 0.66 * s);
      this.group.add(eL, eR);

      // 4 patas
      for (const [sx, sz] of [[-0.18, 0.3], [0.18, 0.3], [-0.18, -0.3], [0.18, -0.3]]) {
        const leg = new this.THREE.Mesh(new this.THREE.BoxGeometry(0.1 * s, 0.5 * s, 0.12 * s), furM);
        leg.position.set(sx * s, 0.25 * s, sz * s);
        this.group.add(leg);
        this.legs.push(leg);
      }
      return;
    }

    // ================= 4. DR. ALENCASTRO MUTADO (CHEFE B) =================
    if (this.type === 'alencastro') {
      const suitM = lam(0x181422);
      const skinM = lam(0x5a4868);
      const tentacleM = lam(0x281238, 0x180628);

      const torso = new this.THREE.Mesh(new this.THREE.BoxGeometry(0.65 * s, 0.9 * s, 0.45 * s), suitM);
      torso.position.y = 1.35 * s; this.group.add(torso);
      const head = new this.THREE.Mesh(new this.THREE.BoxGeometry(0.35 * s, 0.42 * s, 0.35 * s), skinM);
      head.position.y = 1.95 * s; this.group.add(head);

      // olhos roxos brilhantes
      const eyeM = new this.THREE.MeshBasicMaterial({ color: 0xaa44ff });
      this.mats.push(eyeM);
      const f1 = new this.THREE.Mesh(new this.THREE.PlaneGeometry(0.12 * s, 0.06 * s), eyeM);
      f1.position.set(0, 1.96 * s, 0.185 * s); this.group.add(f1);

      // tentáculos que saem das costas
      for (let i = 0; i < 4; i++) {
        const tGroup = new this.THREE.Group();
        const a = (i - 1.5) * 0.35;
        tGroup.position.set(Math.sin(a) * 0.3 * s, 1.5 * s, -0.22 * s);
        const tMesh = new this.THREE.Mesh(new this.THREE.CylinderGeometry(0.04 * s, 0.09 * s, 1.6 * s, 5), tentacleM);
        tMesh.position.y = 0.8 * s;
        tMesh.rotation.x = -0.4;
        tMesh.rotation.z = (i - 1.5) * 0.3;
        tGroup.add(tMesh);
        this.group.add(tGroup);
        this.tentacles.push(tGroup);
      }

      // braços longos
      for (const side of [-1, 1]) {
        const g = new this.THREE.Group(); g.position.set(side * 0.42 * s, 1.6 * s, 0);
        const a = new this.THREE.Mesh(new this.THREE.BoxGeometry(0.16 * s, 1.1 * s, 0.16 * s), skinM);
        a.position.y = -0.45 * s; g.add(a);
        this.group.add(g); this.arms.push(g);
      }
      return;
    }

    // ================= 5. SOMBRA / LAMENTO / VULTO (PADRÃO) =================
    const bodyM = lam(0x0c0c12);
    const darkM = lam(0x060608);

    const cloak = new this.THREE.Mesh(
      new this.THREE.ConeGeometry(0.42 * s, 1.5 * s, 7),
      bodyM
    );
    cloak.position.y = 0.75 * s;
    this.group.add(cloak);
    this.cloak = cloak;

    const torso = new this.THREE.Mesh(new this.THREE.BoxGeometry(0.5 * s, 0.6 * s, 0.34 * s), bodyM);
    torso.position.y = 1.35 * s;
    this.group.add(torso);

    const head = new this.THREE.Mesh(
      new this.THREE.SphereGeometry(0.19 * s, 7, 6),
      darkM
    );
    head.position.y = 1.8 * s;
    this.group.add(head);

    const eyeG = new this.THREE.PlaneGeometry(0.09 * s, 0.05 * s);
    const eyeM = new this.THREE.MeshBasicMaterial({ color: this.cfg.eye });
    this.mats.push(eyeM);
    const eL = new this.THREE.Mesh(eyeG, eyeM);
    eL.position.set(-0.08 * s, 1.82 * s, 0.16 * s);
    const eR = new this.THREE.Mesh(eyeG, eyeM);
    eR.position.set(0.08 * s, 1.82 * s, 0.16 * s);
    this.group.add(eL, eR);

    const glow = new this.THREE.Sprite(new this.THREE.SpriteMaterial({
      map: this.TEX.eye, color: this.cfg.eye, transparent: true,
      opacity: 0.55, blending: this.THREE.AdditiveBlending, depthWrite: false,
    }));
    glow.scale.set(0.7 * s, 0.35 * s, 1);
    glow.position.set(0, 1.82 * s, 0.1 * s);
    this.group.add(glow);
    this.eyeGlow = glow;

    this.arms = [];
    for (const side of [-1, 1]) {
      const g = new this.THREE.Group();
      g.position.set(side * 0.32 * s, 1.5 * s, 0);
      const a = new this.THREE.Mesh(new this.THREE.BoxGeometry(0.11 * s, 0.95 * s, 0.11 * s), darkM);
      a.position.y = -0.4 * s; g.add(a);
      for (let c = 0; c < 3; c++) {
        const claw = new this.THREE.Mesh(new this.THREE.BoxGeometry(0.03 * s, 0.18 * s, 0.03 * s), lam(0x8a8a92));
        claw.position.set((c - 1) * 0.045 * s, -0.92 * s, 0.02);
        g.add(claw);
      }
      g.rotation.z = side * 0.18;
      this.group.add(g);
      this.arms.push(g);
    }

    if (this.cfg.boss) {
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const spike = new this.THREE.Mesh(new this.THREE.ConeGeometry(0.09, 0.7, 5), darkM);
        spike.position.set(Math.cos(a) * 0.5, 2.2 + (i % 2) * 0.4, Math.sin(a) * 0.5);
        spike.rotation.set(Math.sin(a) * 0.7, 0, -Math.cos(a) * 0.7);
        this.group.add(spike);
      }
      const crown = new this.THREE.Mesh(new this.THREE.TorusGeometry(0.35, 0.06, 5, 9), lam(0x1a1a22));
      crown.position.y = 4.15;
      crown.rotation.x = Math.PI / 2 + 0.2;
      this.group.add(crown);
      this.crown = crown;
    }

    const sh = new this.THREE.Mesh(
      new this.THREE.PlaneGeometry(1.1 * s, 1.1 * s),
      new this.THREE.MeshBasicMaterial({ map: this.TEX.blob, color: 0x000000, transparent: true, opacity: 0.5, depthWrite: false })
    );
    sh.rotation.x = -Math.PI / 2; sh.position.y = 0.02;
    this.group.add(sh);
  }

  addTo(scene) { scene.add(this.group); }
  get alive() { return !this.dead; }
  get x() { return this.group.position.x; }
  get z() { return this.group.position.z; }

  chestPos(out) {
    out = out || new this.THREE.Vector3();
    out.set(this.x, 1.35 * this.cfg.scale, this.z);
    return out;
  }

  alert() { this.noticed = true; if (this.state === 'dormant') this.state = 'chase'; }

  damage(n, dx, dz) {
    if (this.dead) return true;
    this.hp -= n;
    this.flash = 1;
    this.alert();
    if (this.hp <= 0) {
      this.dead = true;
      this.state = 'dead';
      this.stateT = 0;
      return true;
    }
    if (this.cfg.stagger > 0) {
      this.state = 'hurt';
      this.stateT = this.cfg.stagger;
      this.group.position.x += dx * 0.25;
      this.group.position.z += dz * 0.25;
    } else if (this.cfg.boss && n >= 60 && Math.random() < 0.25) {
      this.state = 'hurt';
      this.stateT = 0.35;
    }
    return false;
  }

  update(dt, player, room) {
    let ev = null;
    this.phase += dt * 3;
    this.atkCd = Math.max(0, this.atkCd - dt);
    if (this.flash > 0) {
      this.flash = Math.max(0, this.flash - dt * 5);
      for (const m of this.mats) {
        if (m.emissive) m.emissive.setRGB(this.flash * 0.8, this.flash * 0.15, this.flash * 0.15);
      }
    }
    if (this.dead) {
      if (!this.deadSettled) {
        this.stateT += dt;
        this.group.rotation.x = Math.max(-Math.PI / 2 + 0.15, this.group.rotation.x - dt * 3);
        if (this.stateT > 0.6) {
          this.group.position.y = Math.max(-0.55, this.group.position.y - dt * 0.5);
          if (this.group.position.y <= -0.54) this.deadSettled = true;
        }
      }
      return null;
    }
    const p = this.group.position;
    const dx = player.x - p.x, dz = player.z - p.z;
    const dist = Math.hypot(dx, dz);
    const dirX = dist > 0.001 ? dx / dist : 0;
    const dirZ = dist > 0.001 ? dz / dist : 0;

    if (this.state === 'dormant') {
      this.idleSway();
      const sees = !room.los || room.los(p.x, p.z, player.x, player.z);
      if (dist < this.cfg.notice && !player.dead && sees) {
        this.alert();
        ev = 'growl';
      }
      return ev;
    }
    if (this.state === 'hurt') {
      this.stateT -= dt;
      this.group.rotation.z = Math.sin(this.stateT * 30) * 0.08;
      if (this.stateT <= 0) { this.state = 'chase'; this.group.rotation.z = 0; }
      return ev;
    }
    if (player.dead) { this.idleSway(); this.state = 'chase'; return ev; }

    const targetAngle = Math.atan2(dx, dz);
    this.group.rotation.y = targetAngle;

    // Investidas especiais de chefe
    if (this.cfg.boss) {
      if (this.state === 'chargeTele') {
        this.stateT -= dt;
        this.group.position.x += (Math.random() - 0.5) * 0.06;
        this.group.position.z += (Math.random() - 0.5) * 0.06;
        if (this.eyeGlow) this.eyeGlow.material.opacity = 0.6 + Math.random() * 0.4;
        if (this.stateT <= 0) {
          this.state = 'charge';
          this.stateT = 0.7;
          this.chargeDir.x = dirX; this.chargeDir.z = dirZ;
          ev = 'chargeStart';
        }
        return ev;
      }
      if (this.state === 'charge') {
        this.stateT -= dt;
        p.x += this.chargeDir.x * 7.5 * dt;
        p.z += this.chargeDir.z * 7.5 * dt;
        collideCircle(p, 0.6, room.solids);
        if (dist < this.cfg.range + 0.4 && this.atkCd <= 0) {
          this.atkCd = this.cfg.cooldown;
          this.state = 'chase';
          ev = 'hit';
        } else if (this.stateT <= 0) {
          this.state = 'chase';
          this.atkCd = 0.8;
          ev = 'slam';
        }
        return ev;
      }
      if (this.state === 'chase' && dist > 4 && dist < 12 && Math.random() < dt * 0.7) {
        this.state = 'chargeTele';
        this.stateT = 0.8;
        ev = 'chargeTele';
        return ev;
      }
    }

    if (this.state === 'chase') {
      if (dist > this.cfg.range) {
        const sp = this.cfg.speed * (this.type === 'lamento' ? (1 + Math.sin(this.phase * 0.7) * 0.15) : 1);
        p.x += dirX * sp * dt;
        p.z += dirZ * sp * dt;
        collideCircle(p, this.cfg.boss ? 0.65 : 0.4, room.solids);
      } else if (this.atkCd <= 0) {
        this.state = 'attack';
        this.stateT = 0.45;
      }
      this.walkAnim();
    } else if (this.state === 'attack') {
      this.stateT -= dt;
      const k = 1 - this.stateT / 0.45;
      for (const a of this.arms) a.rotation.x = k < 0.4 ? -2.2 * (k / 0.4) : -2.2 + 3.0 * ((k - 0.4) / 0.6);
      if (this.stateT <= 0) {
        this.state = 'chase';
        for (const a of this.arms) a.rotation.x = 0;
        if (dist < this.cfg.range + 0.5) {
          this.atkCd = this.cfg.cooldown;
          ev = 'hit';
        } else {
          this.atkCd = 0.4;
        }
      }
      return ev;
    }

    this.growlT -= dt;
    if (this.growlT <= 0 && dist < 12) {
      this.growlT = 4 + Math.random() * 5;
      ev = ev || 'growl';
    }
    return ev;
  }

  idleSway() {
    this.group.position.y = Math.sin(this.phase) * 0.05 + 0.02;
    if (this.cloak) this.cloak.rotation.y += 0.004;
    for (let i = 0; i < this.arms.length; i++) {
      this.arms[i].rotation.x = Math.sin(this.phase + i * 2) * 0.12;
    }
    if (this.eyeGlow) this.eyeGlow.material.opacity = 0.45 + Math.sin(this.phase * 0.8) * 0.12;
    for (let i = 0; i < this.tentacles.length; i++) {
      this.tentacles[i].rotation.z = Math.sin(this.phase * 1.5 + i) * 0.15;
    }
  }

  walkAnim() {
    this.group.position.y = Math.abs(Math.sin(this.phase * 1.6)) * 0.09;
    for (let i = 0; i < this.arms.length; i++) {
      this.arms[i].rotation.x = Math.sin(this.phase * 1.6 + i * Math.PI) * 0.4;
    }
    for (let i = 0; i < this.legs.length; i++) {
      this.legs[i].rotation.x = Math.sin(this.phase * 2.2 + (i % 2) * Math.PI) * 0.5;
    }
    for (let i = 0; i < this.tentacles.length; i++) {
      this.tentacles[i].rotation.z = Math.sin(this.phase * 2.5 + i) * 0.35;
    }
    if (this.cloak) this.cloak.rotation.y += 0.01;
    if (this.crown) this.crown.rotation.z += 0.02;
  }
}

// ------------------------------- NPC -------------------------------
export class NPC {
  constructor(THREE, TEX, who, x, z, rotY = 0) {
    this.THREE = THREE;
    this.TEX = TEX;
    this.who = who;
    this.group = new THREE.Group();
    this.group.position.set(x, 0, z);
    this.group.rotation.y = rotY;
    this.mats = [];
    this.buildMesh();
  }

  buildMesh() {
    const lam = (c, map = null) => {
      const m = new this.THREE.MeshLambertMaterial({ color: c, map });
      this.mats.push(m);
      return m;
    };
    const bx = (w, h, d, m, x, y, z, parent = this.group) => {
      const mesh = new this.THREE.Mesh(new this.THREE.BoxGeometry(w, h, d), m);
      mesh.position.set(x, y, z);
      parent.add(mesh);
      return mesh;
    };

    if (this.who === 'clara') {
      const coat = lam(0xdcdcd8);
      const wine = lam(0x6b1d28);
      const dark = lam(0x222228);
      const skin = lam(0xddb294);
      bx(0.2, 0.78, 0.24, dark, -0.12, 0.39, 0);
      bx(0.2, 0.78, 0.24, dark, 0.12, 0.39, 0);
      bx(0.48, 0.72, 0.3, coat, 0, 1.14, 0);
      bx(0.24, 0.4, 0.32, wine, 0, 1.16, 0.01);
      this.head = bx(0.28, 0.32, 0.28, skin, 0, 1.62, 0);
      bx(0.3, 0.14, 0.3, lam(0x4a2c18), 0, 1.76, -0.01); // cabelo
    } else if (this.who === 'bento') {
      const blue = lam(0x223854);
      const skin = lam(0xba9476);
      bx(0.22, 0.78, 0.26, blue, -0.13, 0.39, 0);
      bx(0.22, 0.78, 0.26, blue, 0.13, 0.39, 0);
      bx(0.54, 0.72, 0.34, blue, 0, 1.14, 0);
      this.head = bx(0.3, 0.34, 0.3, skin, 0, 1.62, 0);
      bx(0.32, 0.12, 0.34, lam(0x3a3e44), 0, 1.76, 0); // boné
    } else {
      // Daniel
      const coat = lam(0x2a3448);
      const skin = lam(0xc8a080);
      bx(0.2, 0.78, 0.24, lam(0x3a3a40), -0.13, 0.39, 0);
      bx(0.2, 0.78, 0.24, lam(0x3a3a40), 0.13, 0.39, 0);
      bx(0.52, 0.72, 0.32, coat, 0, 1.14, 0);
      this.head = bx(0.3, 0.34, 0.3, skin, 0, 1.62, 0);
      bx(0.32, 0.1, 0.32, lam(0x241812), 0, 1.78, -0.01);
    }
  }

  addTo(scene) { scene.add(this.group); }

  update(dt, player) {
    // respiração
    this.group.position.y = Math.sin(performance.now() / 800) * 0.015;
    // vira suavemente para o jogador se estiver perto (< 5m)
    const dx = player.x - this.group.position.x;
    const dz = player.z - this.group.position.z;
    if (Math.hypot(dx, dz) < 5) {
      const target = Math.atan2(dx, dz);
      let diff = target - this.group.rotation.y;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      this.group.rotation.y += diff * Math.min(1, dt * 3.5);
    }
  }
}

// ------------------------------ TOTEM DE TEMPO (MERCENÁRIOS) ------------------------------
export class TimeTotem {
  constructor(THREE, TEX, x, z, timeBonus = 30) {
    this.THREE = THREE;
    this.bonus = timeBonus;
    this.alive = true;
    this.group = new THREE.Group();
    this.group.position.set(x, 1.0, z);

    const geo = new THREE.OctahedronGeometry(0.35, 0);
    const mat = new THREE.MeshBasicMaterial({ color: 0x44ddff, wireframe: false });
    this.mesh = new THREE.Mesh(geo, mat);
    this.group.add(this.mesh);

    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.04, 4, 8), new THREE.MeshBasicMaterial({ color: 0xffd700 }));
    ring.rotation.x = Math.PI / 2;
    this.group.add(ring);
    this.ring = ring;
  }

  addTo(scene) { scene.add(this.group); }

  update(dt) {
    if (!this.alive) return;
    this.mesh.rotation.y += dt * 2.0;
    this.ring.rotation.z += dt * 1.5;
    this.group.position.y = 1.0 + Math.sin(performance.now() / 400) * 0.1;
  }

  smash() {
    this.alive = false;
    this.group.visible = false;
    return this.bonus;
  }
}
