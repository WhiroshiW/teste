// ============================================================
// ECOS DO VAZIO - Entidades: colisão, partículas, jogador, inimigos
// Modelos low-poly construídos com primitivas (estilo PS1).
// ============================================================
import { WEAPONS, ENEMIES } from './config.js';

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
    this.head = 0;
    for (let i = 0; i < this.N; i++) { this.life[i] = 0; this.pos[i * 3 + 1] = -999; }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    g.setAttribute('color', new THREE.BufferAttribute(this.col, 3));
    const m = new THREE.PointsMaterial({
      size: 0.09, vertexColors: true, map: TEX.blob,
      transparent: true, opacity: 0.95, depthWrite: false, sizeAttenuation: true,
    });
    this.points = new THREE.Points(g, m);
    this.points.frustumCulled = false;
    scene.add(this.points);
    this.geo = g;
    this.tmpC = new THREE.Color();
  }
  burst(x, y, z, { color = 0xffffff, n = 12, speed = 2.5, up = 1.5, grav = 6, life = 0.6 } = {}) {
    this.tmpC.set(color);
    for (let k = 0; k < n; k++) {
      const i = this.head; this.head = (this.head + 1) % this.N;
      this.pos[i * 3] = x; this.pos[i * 3 + 1] = y; this.pos[i * 3 + 2] = z;
      const a = Math.random() * Math.PI * 2;
      const sp = speed * (0.4 + Math.random() * 0.6);
      this.vel[i * 3] = Math.cos(a) * sp;
      this.vel[i * 3 + 1] = up * (0.3 + Math.random());
      this.vel[i * 3 + 2] = Math.sin(a) * sp;
      this.grav[i] = grav;
      this.maxLife[i] = life * (0.6 + Math.random() * 0.7);
      this.life[i] = this.maxLife[i];
      const v = 0.7 + Math.random() * 0.3;
      this.col[i * 3] = this.tmpC.r * v;
      this.col[i * 3 + 1] = this.tmpC.g * v;
      this.col[i * 3 + 2] = this.tmpC.b * v;
    }
  }
  update(dt) {
    let any = false;
    for (let i = 0; i < this.N; i++) {
      if (this.life[i] <= 0) continue;
      any = true;
      this.life[i] -= dt;
      if (this.life[i] <= 0) { this.pos[i * 3 + 1] = -999; continue; }
      this.vel[i * 3 + 1] -= this.grav[i] * dt;
      this.pos[i * 3] += this.vel[i * 3] * dt;
      this.pos[i * 3 + 1] += this.vel[i * 3 + 1] * dt;
      this.pos[i * 3 + 2] += this.vel[i * 3 + 2] * dt;
      if (this.pos[i * 3 + 1] < 0.02) { this.pos[i * 3 + 1] = 0.02; this.vel[i * 3 + 1] = 0; }
    }
    if (any) {
      this.geo.attributes.position.needsUpdate = true;
      this.geo.attributes.color.needsUpdate = true;
    }
  }
  clear() {
    for (let i = 0; i < this.N; i++) { this.life[i] = 0; this.pos[i * 3 + 1] = -999; }
    this.geo.attributes.position.needsUpdate = true;
  }
}

// ------------------------------ JOGADOR ------------------------------
export class Player {
  constructor(THREE, TEX) {
    this.THREE = THREE;
    this.group = new THREE.Group();
    this.mats = [];
    const lam = (c, map = null, e = 0x000000) => {
      const m = new THREE.MeshLambertMaterial({ color: c, map, emissive: e });
      this.mats.push(m);
      return m;
    };
    const skin = lam(0xc8a080);
    const coat = lam(0x2a3448);
    const coatD = lam(0x1c2434);
    const pants = lam(0x3a3a40);
    const hair = lam(0x241812);

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
    bx(0.2, 0.78, 0.24, pants, 0, -0.39, 0, this.legL);
    bx(0.2, 0.78, 0.24, pants, 0, -0.39, 0, this.legR);
    bx(0.22, 0.12, 0.34, lam(0x1a1412), 0, -0.72, 0.04, this.legL);
    bx(0.22, 0.12, 0.34, lam(0x1a1412), 0, -0.72, 0.04, this.legR);
    // tronco (casaco)
    this.torso = bx(0.52, 0.72, 0.32, coat, 0, 1.14, 0);
    bx(0.56, 0.3, 0.36, coatD, 0, 0.72, 0); // barra do casaco
    // braços
    this.armL = new THREE.Group(); this.armL.position.set(-0.33, 1.42, 0);
    this.armR = new THREE.Group(); this.armR.position.set(0.33, 1.42, 0);
    this.group.add(this.armL, this.armR);
    bx(0.14, 0.62, 0.16, coat, 0, -0.28, 0, this.armL);
    bx(0.14, 0.62, 0.16, coat, 0, -0.28, 0, this.armR);
    bx(0.13, 0.14, 0.14, skin, 0, -0.62, 0, this.armL);
    bx(0.13, 0.14, 0.14, skin, 0, -0.62, 0, this.armR);
    // cabeça
    this.head = new THREE.Group(); this.head.position.set(0, 1.62, 0);
    this.group.add(this.head);
    const faceM = new THREE.MeshLambertMaterial({ color: 0xffffff, map: TEX.faceDaniel });
    this.mats.push(faceM);
    const headMesh = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.34, 0.3), [
      hair, hair, hair, skin, faceM, hair,
    ]);
    this.head.add(headMesh);
    bx(0.32, 0.1, 0.32, hair, 0, 0.18, -0.01, this.head);
    // armas na mão direita
    this.gunPivot = new THREE.Group();
    this.gunPivot.position.set(0, -0.62, 0.05);
    this.armR.add(this.gunPivot);
    const gunM = lam(0x2a2a2e);
    const pistol = new THREE.Group();
    const pm = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.1, 0.3), gunM);
    pm.position.set(0, 0, 0.12); pistol.add(pm);
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.16, 0.08), lam(0x4a3020));
    grip.position.set(0, -0.1, 0.02); pistol.add(grip);
    this.shotgunM = new THREE.Group();
    const sb = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.09, 0.62), lam(0x3a2c1c));
    sb.position.set(0, 0, 0.28); this.shotgunM.add(sb);
    const sb2 = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.6), gunM);
    sb2.position.set(0, 0.06, 0.28); this.shotgunM.add(sb2);
    this.knifeM = new THREE.Group();
    const kb = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.05, 0.34), lam(0x9aa0a8));
    kb.position.set(0, 0, 0.2); this.knifeM.add(kb);
    const kh = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.07, 0.12), lam(0x2a2018));
    kh.position.set(0, 0, 0); this.knifeM.add(kh);
    this.gunPivot.add(pistol, this.shotgunM, this.knifeM);
    this.pistolM = pistol;
    // sombra falsa
    const shTex = TEX.blob;
    const sh = new THREE.Mesh(
      new THREE.PlaneGeometry(0.9, 0.9),
      new THREE.MeshBasicMaterial({ map: shTex, color: 0x000000, transparent: true, opacity: 0.45, depthWrite: false })
    );
    sh.rotation.x = -Math.PI / 2; sh.position.y = 0.02;
    this.group.add(sh);

    this.hp = 100; this.maxhp = 100;
    this.angle = 0;
    this.weapon = 'knife';
    this.aiming = false;
    this.fireCd = 0;
    this.iframes = 0;
    this.flash = 0;
    this.walkPhase = 0;
    this.moving = false;
    this.dead = false;
    this.setWeapon('knife');
  }

  addTo(scene) { scene.add(this.group); }
  removeFrom(scene) { scene.remove(this.group); }
  place(x, z, angle) {
    this.group.position.set(x, 0, z);
    this.angle = angle;
    this.group.rotation.y = angle;
  }
  get x() { return this.group.position.x; }
  get z() { return this.group.position.z; }

  setWeapon(w) {
    this.weapon = w;
    this.pistolM.visible = w === 'pistol';
    this.shotgunM.visible = w === 'shotgun';
    this.knifeM.visible = w === 'knife';
    this.gunPivot.visible = this.aiming;
  }
  setAim(b) {
    this.aiming = b;
    this.gunPivot.visible = b;
  }

  update(dt, input, room) {
    const ev = { step: false, run: false };
    if (this.dead) return ev;
    this.fireCd = Math.max(0, this.fireCd - dt);
    this.iframes = Math.max(0, this.iframes - dt);
    if (this.flash > 0) {
      this.flash = Math.max(0, this.flash - dt * 4);
      for (const m of this.mats) m.emissive.setRGB(this.flash * 0.7, this.flash * 0.1, this.flash * 0.1);
    }
    const TURN = 2.6, WALK = 2.2, RUN = 4.1;
    if (this.aiming) {
      if (input.l) this.angle += TURN * 0.8 * dt;
      if (input.r) this.angle -= TURN * 0.8 * dt;
      this.moving = false;
    } else {
      if (input.l) this.angle += TURN * dt;
      if (input.r) this.angle -= TURN * dt;
      let mv = 0;
      if (input.f) mv = 1;
      else if (input.b) mv = -0.6;
      this.moving = mv !== 0;
      if (mv !== 0) {
        const sp = (input.run && mv > 0 ? RUN : WALK) * mv;
        const p = this.group.position;
        p.x += Math.sin(this.angle) * sp * dt;
        p.z += Math.cos(this.angle) * sp * dt;
        collideCircle(p, 0.35, room.solids);
        this.walkPhase += dt * (input.run && mv > 0 ? 11 : 7.5);
        ev.run = input.run && mv > 0;
        // passo a cada meio ciclo
        const cyc = Math.floor(this.walkPhase / Math.PI);
        if (cyc !== this.lastStepCyc) { this.lastStepCyc = cyc; ev.step = true; }
      }
    }
    this.group.rotation.y = this.angle;
    this.animate(dt);
    return ev;
  }

  animate(dt) {
    const t = this.walkPhase;
    if (this.moving && !this.aiming) {
      const s = Math.sin(t) * 0.55;
      this.legL.rotation.x = s; this.legR.rotation.x = -s;
      this.armL.rotation.x = -s * 0.7; this.armR.rotation.x = s * 0.7;
      this.group.position.y = Math.abs(Math.sin(t)) * 0.04;
    } else if (this.aiming) {
      this.legL.rotation.x = 0; this.legR.rotation.x = 0;
      this.armL.rotation.x = -Math.PI / 2 + 0.15;
      this.armR.rotation.x = -Math.PI / 2 + 0.15;
      this.group.position.y = 0;
      // respiração da mira
      this.gunPivot.position.y = -0.62 + Math.sin(performance.now() / 300) * 0.006;
    } else {
      this.legL.rotation.x *= 0.85; this.legR.rotation.x *= 0.85;
      this.armL.rotation.x = Math.sin(performance.now() / 900) * 0.05;
      this.armR.rotation.x = -Math.sin(performance.now() / 900) * 0.05;
      this.group.position.y = 0;
      this.armL.rotation.z = 0.08; this.armR.rotation.z = -0.08;
    }
    if (!this.aiming) { this.armL.rotation.x *= 1; }
    // pisca
    this.head.rotation.x = this.aiming ? -0.06 : Math.sin(performance.now() / 1400) * 0.03;
    void dt;
  }

  muzzleWorld(out) {
    out = out || new this.THREE.Vector3();
    this.gunPivot.getWorldPosition(out);
    out.y = 1.35;
    out.x += Math.sin(this.angle) * 0.5;
    out.z += Math.cos(this.angle) * 0.5;
    return out;
  }

  canFire() { return !this.dead && this.fireCd <= 0; }
  spendCooldown() { this.fireCd = WEAPONS[this.weapon].rate; }

  damage(n) {
    if (this.dead || this.iframes > 0) return false;
    this.hp = Math.max(0, this.hp - n);
    this.iframes = 0.7;
    this.flash = 1;
    if (this.hp <= 0) { this.dead = true; }
    return true;
  }
  heal(n) {
    this.hp = Math.min(this.maxhp, this.hp + n);
    this.flash = 0.4;
  }
  dieAnim(dt) {
    // cai de joelhos e tomba
    this.group.rotation.x = Math.min(Math.PI / 2.2, this.group.rotation.x + dt * 2);
    this.group.position.y = Math.max(-0.5, this.group.position.y - dt * 0.6);
  }
}

// ------------------------------ INIMIGOS ------------------------------
let ENEMY_ID = 0;

export class Enemy {
  constructor(THREE, TEX, type, x, z, dead = false) {
    this.THREE = THREE;
    this.TEX = TEX;
    this.type = type;
    this.cfg = ENEMIES[type];
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
    const lam = (c, e = 0x000000) => {
      const m = new this.THREE.MeshLambertMaterial({ color: c, emissive: e });
      this.mats.push(m);
      return m;
    };
    const bodyM = lam(0x0c0c12);
    const darkM = lam(0x060608);
    // manto (cone baixo-poly)
    const cloak = new this.THREE.Mesh(
      new this.THREE.ConeGeometry(0.42 * s, 1.5 * s, 7),
      bodyM
    );
    cloak.position.y = 0.75 * s;
    this.group.add(cloak);
    this.cloak = cloak;
    // torso
    const torso = new this.THREE.Mesh(new this.THREE.BoxGeometry(0.5 * s, 0.6 * s, 0.34 * s), bodyM);
    torso.position.y = 1.35 * s;
    this.group.add(torso);
    // cabeça
    const head = new this.THREE.Mesh(
      new this.THREE.SphereGeometry(0.19 * s, 7, 6),
      darkM
    );
    head.position.y = 1.8 * s;
    this.group.add(head);
    this.headM = head;
    // olhos brilhantes
    const eyeG = new this.THREE.PlaneGeometry(0.09 * s, 0.05 * s);
    const eyeM = new this.THREE.MeshBasicMaterial({ color: this.cfg.eye });
    this.mats.push(eyeM);
    const eL = new this.THREE.Mesh(eyeG, eyeM);
    eL.position.set(-0.08 * s, 1.82 * s, 0.16 * s);
    const eR = new this.THREE.Mesh(eyeG, eyeM);
    eR.position.set(0.08 * s, 1.82 * s, 0.16 * s);
    this.group.add(eL, eR);
    // brilho atrás dos olhos
    const glow = new this.THREE.Sprite(new this.THREE.SpriteMaterial({
      map: this.TEX.eye, color: this.cfg.eye, transparent: true,
      opacity: 0.55, blending: this.THREE.AdditiveBlending, depthWrite: false,
    }));
    glow.scale.set(0.7 * s, 0.35 * s, 1);
    glow.position.set(0, 1.82 * s, 0.1 * s);
    this.group.add(glow);
    this.eyeGlow = glow;
    // braços longos
    this.arms = [];
    for (const side of [-1, 1]) {
      const g = new this.THREE.Group();
      g.position.set(side * 0.32 * s, 1.5 * s, 0);
      const a = new this.THREE.Mesh(new this.THREE.BoxGeometry(0.11 * s, 0.95 * s, 0.11 * s), darkM);
      a.position.y = -0.4 * s;
      g.add(a);
      // garras
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
      // espinhos do chefe
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const spike = new this.THREE.Mesh(new this.THREE.ConeGeometry(0.09, 0.7, 5), darkM);
        spike.position.set(Math.cos(a) * 0.5, 2.2 + (i % 2) * 0.4, Math.sin(a) * 0.5);
        spike.rotation.set(Math.sin(a) * 0.7, 0, -Math.cos(a) * 0.7);
        this.group.add(spike);
      }
      // coroa de trevas
      const crown = new this.THREE.Mesh(new this.THREE.TorusGeometry(0.35, 0.06, 5, 9), lam(0x1a1a22));
      crown.position.y = 4.15;
      crown.rotation.x = Math.PI / 2 + 0.2;
      this.group.add(crown);
      this.crown = crown;
    }
    // sombra falsa
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
      // recuo
      this.group.position.x += dx * 0.25;
      this.group.position.z += dz * 0.25;
    } else if (this.type === 'vulto' && n >= 60 && Math.random() < 0.25) {
      this.state = 'hurt';
      this.stateT = 0.4;
    }
    return false;
  }

  update(dt, player, room) {
    // retorna 'hit' quando acerta o jogador, 'growl' ocasional
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
      // animação de morte: desaba e afunda levemente
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

    // mira no jogador
    const targetAngle = Math.atan2(dx, dz);
    this.group.rotation.y = targetAngle;

    // ---- chefe: investida ----
    if (this.type === 'vulto') {
      if (this.state === 'chargeTele') {
        this.stateT -= dt;
        this.group.position.x += (Math.random() - 0.5) * 0.06;
        this.group.position.z += (Math.random() - 0.5) * 0.06;
        this.eyeGlow.material.opacity = 0.6 + Math.random() * 0.4;
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
      // decide investida
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
        collideCircle(p, this.cfg.boss ? 0.6 : 0.4, room.solids);
      } else if (this.atkCd <= 0) {
        this.state = 'attack';
        this.stateT = 0.45;
      }
      this.walkAnim();
    } else if (this.state === 'attack') {
      this.stateT -= dt;
      // golpe: braços para cima e para baixo
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

    // rosnado ambiente
    this.growlT -= dt;
    if (this.growlT <= 0 && dist < 12) {
      this.growlT = 4 + Math.random() * 5;
      ev = ev || 'growl';
    }
    return ev;
  }

  idleSway() {
    this.group.position.y = Math.sin(this.phase) * 0.05 + 0.02;
    this.cloak.rotation.y += 0.004;
    for (let i = 0; i < this.arms.length; i++) {
      this.arms[i].rotation.x = Math.sin(this.phase + i * 2) * 0.12;
    }
    this.eyeGlow.material.opacity = 0.45 + Math.sin(this.phase * 0.8) * 0.12;
  }
  walkAnim() {
    this.group.position.y = Math.abs(Math.sin(this.phase * 1.6)) * 0.09;
    for (let i = 0; i < this.arms.length; i++) {
      this.arms[i].rotation.x = Math.sin(this.phase * 1.6 + i * Math.PI) * 0.4;
    }
    this.cloak.rotation.y += 0.01;
    if (this.crown) this.crown.rotation.z += 0.02;
  }
}
