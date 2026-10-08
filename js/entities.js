// ============================================================
// SANTA LÚCIA - Equipe Nakamura - Entidades: colisão, partículas, jogador, inimigos, NPCs
// Modelos low-poly construídos com primitivas (estilo PS1 autêntico).
// ============================================================
import { WEAPONS, ENEMIES, CAMPAIGNS } from './config.js?v=1924_1997_v51';

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

    // Inicializa todos os vértices fora da câmera para nunca poluir o mapa
    for (let i = 0; i < this.N; i++) {
      this.pos[i * 3 + 1] = -9999;
      this.life[i] = 0;
    }

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
    for (let i = 0; i < this.N; i++) {
      this.life[i] = 0;
      this.pos[i * 3 + 1] = -9999;
    }
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
    let modified = false;
    for (let i = 0; i < this.N; i++) {
      if (this.life[i] <= 0) continue;
      this.life[i] -= dt;
      if (this.life[i] <= 0) {
        this.life[i] = 0;
        this.pos[i * 3 + 1] = -9999;
        modified = true;
        continue;
      }
      modified = true;
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
    if (modified) this.geo.attributes.position.needsUpdate = true;
  }
}

// ------------------------------- JOGADOR -------------------------------
import { CLARA_MODEL } from './model_clara_data.js?v=1924_1997_v51';
import { DANIEL_MODEL } from './model_daniel_data.js?v=1924_1997_v51';
import { WEAPON_MODELS } from './model_weapons_data.js?v=1924_1997_v51';

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
    this.coatMat = lam(0x2a3448, this.TEX.facet);   // facetas de tecido tingidas pela cor
    this.coatDMat = lam(0x1c2434, this.TEX.facet);
    this.armMat = lam(0x2a3448, this.TEX.facet);    // mangas (Bento usa camisa creme)
    this.pantsMat = lam(0x3a3a40, this.TEX.facet);
    this.hairMat = lam(0x241812);
    this.shoesMat = lam(0x1a1412);
    this.soleMat = lam(0x0e0e10);

    this._bxAll = [];
    const bx = (w, h, d, m, x, y, z, parent = this.group) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
      mesh.position.set(x, y, z);
      parent.add(mesh);
      this._bxAll.push(mesh);
      return mesh;
    };

    // pernas (calça facetada + bota com sola, como na turnaround)
    this.legL = new THREE.Group(); this.legL.position.set(-0.13, 0.78, 0);
    this.legR = new THREE.Group(); this.legR.position.set(0.13, 0.78, 0);
    this.group.add(this.legL, this.legR);
    this.legMeshL = bx(0.2, 0.78, 0.24, this.pantsMat, 0, -0.39, 0, this.legL);
    this.legMeshR = bx(0.2, 0.78, 0.24, this.pantsMat, 0, -0.39, 0, this.legR);
    bx(0.22, 0.13, 0.34, this.shoesMat, 0, -0.715, 0.04, this.legL);
    bx(0.22, 0.13, 0.34, this.shoesMat, 0, -0.715, 0.04, this.legR);
    bx(0.24, 0.05, 0.36, this.soleMat, 0, -0.755, 0.05, this.legL);
    bx(0.24, 0.05, 0.36, this.soleMat, 0, -0.755, 0.05, this.legR);

    // quadril (continuidade calça/jaqueta)
    bx(0.46, 0.12, 0.3, this.pantsMat, 0, 0.82, 0);

    // tronco (jaqueta facetada com barra mais larga)
    this.torso = bx(0.52, 0.72, 0.32, this.coatMat, 0, 1.14, 0);
    this.torsoTrim = bx(0.56, 0.32, 0.36, this.coatDMat, 0, 0.78, 0);
    // fenda central da jaqueta
    bx(0.045, 0.66, 0.012, this.coatDMat, 0, 1.16, 0.165);
    // gola alta levantada (silhueta da turnaround)
    this.collarMesh = bx(0.3, 0.1, 0.3, this.coatMat, 0, 1.53, -0.01);
    bx(0.3, 0.09, 0.05, this.coatDMat, 0, 1.55, -0.16);
    // banda dos ombros
    bx(0.58, 0.09, 0.34, this.coatMat, 0, 1.47, 0);

    // braços
    this.armL = new THREE.Group(); this.armL.position.set(-0.33, 1.42, 0);
    this.armR = new THREE.Group(); this.armR.position.set(0.33, 1.42, 0);
    this.group.add(this.armL, this.armR);
    this.armMeshL = bx(0.14, 0.62, 0.16, this.armMat, 0, -0.28, 0, this.armL);
    this.armMeshR = bx(0.14, 0.62, 0.16, this.armMat, 0, -0.28, 0, this.armR);
    bx(0.13, 0.14, 0.14, this.skinMat, 0, -0.62, 0, this.armL);
    bx(0.13, 0.14, 0.14, this.skinMat, 0, -0.62, 0, this.armR);

    // extras específicos de herói (tufos de cabelo, cabelo longo, bib do macacão)
    this.heroExtras = new THREE.Group();
    this.group.add(this.heroExtras);

    // cabeça
    this.head = new THREE.Group(); this.head.position.set(0, 1.62, 0);
    this.group.add(this.head);
    this.faceMat = new THREE.MeshLambertMaterial({ color: 0xffffff, map: TEX.faceDaniel });
    this.mats.push(this.faceMat);
    this.headMesh = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.34, 0.3), [
      this.hairMat, this.hairMat, this.hairMat, this.skinMat, this.faceMat, this.hairMat,
    ]);
    this.head.add(this.headMesh);
    this._bxAll.push(this.headMesh); // esconde junto quando o modelo 3D IA está ativo
    this.hairMesh = bx(0.32, 0.1, 0.32, this.hairMat, 0, 0.18, -0.01, this.head);

    // peças procedurais do corpo (para alternar com o modelo IA)
    this._boxParts = this._bxAll;
    this.aiModelData = CLARA_MODEL || null; // MODELO: Dra. Clara (dr.glb) no slot do Daniel, temporariamente
    this.aiMeshes = null;

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
    pistol.rotation.x = 1.57; // cano segue o eixo dos dedos: baixo no descanso, frente na mira
    if (WEAPON_MODELS.pistola) { // prop IA substitui o procedural (escala near-camera)
      const g = this.buildPropMesh(WEAPON_MODELS.pistola);
      g.scale.setScalar(0.55);
      pistol.add(g);
      pm.visible = false; grip.visible = false;
    }

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
    this.knifeM.rotation.set(1.57, 0, -0.25); // lâmina alinhada ao eixo dos DEDOS (local -Y):
    this.knifeM.position.set(0, -0.02, 0.04);  // desce no descanso e aponta pra frente na mira sozinha
    if (WEAPON_MODELS.faca) { // prop IA substitui o procedural (escala near-camera)
      const f = this.buildPropMesh(WEAPON_MODELS.faca);
      f.scale.setScalar(1.35); // 30% maior (pedido do produtor)
      this.knifeM.add(f);
      kb.visible = false; kh.visible = false;
    }

    // 4. Revólver .38 (Clara)
    this.revolverM = new THREE.Group();
    const revB = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.08, 0.36), metalM);
    revB.position.set(0, 0.02, 0.15); this.revolverM.add(revB);
    const revCyl = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.1, 6), gunM);
    revCyl.rotation.x = Math.PI / 2; revCyl.position.set(0, 0.01, 0.04); this.revolverM.add(revCyl);
    const revGrip = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.14, 0.07), darkWood);
    revGrip.position.set(0, -0.09, -0.02); this.revolverM.add(revGrip);
    this.revolverM.rotation.x = 1.57; // cano segue o eixo dos dedos
    if (WEAPON_MODELS.revolver) { // prop IA (Dra. Clara)
      const r = this.buildPropMesh(WEAPON_MODELS.revolver);
      r.scale.setScalar(0.55);
      this.revolverM.add(r);
      revB.visible = false; revCyl.visible = false; revGrip.visible = false;
    }

    // 5. Bisturi Cirúrgico (Clara)
    this.scalpelM = new THREE.Group();
    const scB = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.03, 0.24), metalM);
    scB.position.set(0, 0, 0.12); this.scalpelM.add(scB);
    this.scalpelM.rotation.x = 1.57; // lâmina segue o eixo dos dedos
    if (WEAPON_MODELS.bisturi) { // prop IA (Dra. Clara)
      const s = this.buildPropMesh(WEAPON_MODELS.bisturi);
      s.scale.setScalar(0.7);
      this.scalpelM.add(s);
      scB.visible = false;
    }

    // 6. Chave Inglesa (Bento)
    this.wrenchM = new THREE.Group();
    const wrB = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.06, 0.44), lam(0x5a6068));
    wrB.position.set(0, 0, 0.22); this.wrenchM.add(wrB);
    const wrH = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.08, 0.12), lam(0x4a5058));
    wrH.position.set(0, 0.02, 0.44); this.wrenchM.add(wrH);
    this.wrenchM.rotation.x = 1.57; // cabeça segue o eixo dos dedos
    if (WEAPON_MODELS.chave_inglesa) { // prop IA (Bento)
      const c = this.buildPropMesh(WEAPON_MODELS.chave_inglesa);
      c.scale.setScalar(0.6);
      this.wrenchM.add(c);
      wrB.visible = false; wrH.visible = false;
    }

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
    this.gunPivot.traverse((o) => { if (o.isMesh) o.layers.set(2); }); // armas na passada leve (camada 2)
    this.group.traverse((o) => { if (o.isMesh && !o.userData.arma) o.layers.enable(1); }); // corpo = oclusor
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

  // ==================== MODELO 3D IA (Daniel — fatiado em peças PS1) ====================
  // O GLB do produtor é fatiado em 6 peças (build script) e cada peça é
  // rigidamente parentada aos grupos do rig procedural — as animações
  // existentes (walk/attack/hurt/death) funcionam sem alteração.
  applyAIModel(enabled) {
    this.aiActive = false;
    if (!enabled || !this.aiModelData) {
      // restaura os bonecos procedurais
      if (this.aiMeshes) for (const m of this.aiMeshes) m.visible = false;
      for (const m of this._boxParts || []) m.visible = true;
      if (this.heroExtras) this.heroExtras.visible = true;
      if (this.legL) this.legL.position.set(-0.13, 0.78, 0);
      if (this.legR) this.legR.position.set(0.13, 0.78, 0);
      if (this.armL) { this.armL.position.set(-0.33, 1.42, 0); this.armL.rotation.z = 0.05; }
      if (this.armR) { this.armR.position.set(0.33, 1.42, 0); this.armR.rotation.z = -0.05; }
      if (this.gunPivot) this.gunPivot.position.set(0, -0.62, 0.05);
      if (this.knifeM) { this.knifeM.rotation.set(1.57, 0, 0); this.knifeM.position.set(0, 0, 0); }
      if (this.head) this.head.position.set(0, 1.62, 0);
      if (this.gunPivot) this.gunPivot.position.set(0, -0.62, 0.05);
      return;
    }
    if (!this.aiMeshes || this._aiBuiltFor !== this.aiModelData) {
      if (this.aiMeshes) for (const m of this.aiMeshes) if (m.parent) m.parent.remove(m);
      this.aiMeshes = [];
      this._aiBuiltFor = this.aiModelData;
      const canTex = typeof document !== 'undefined' && typeof document.createElementNS === 'function' && this.THREE.TextureLoader;
      let tex = null;
      if (canTex) {
        try {
          tex = new this.THREE.TextureLoader().load(this.aiModelData.tex);
          if ('colorSpace' in tex && this.THREE.SRGBColorSpace) tex.colorSpace = this.THREE.SRGBColorSpace;
          tex.magFilter = this.THREE.NearestFilter;  // pixels crocantes PS1
          tex.minFilter = this.THREE.NearestFilter;
          tex.generateMipmaps = false;
          if ('wrapS' in tex) { tex.wrapS = this.THREE.RepeatWrapping; tex.wrapT = this.THREE.RepeatWrapping; }
        } catch (e) { tex = null; }
      }
      const decB64 = (b64) => {
        const bin = atob(b64);
        const bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        return bytes.buffer;
      };
      for (const [name, part] of Object.entries(this.aiModelData.parts)) {
        const i16 = new Int16Array(decB64(part.p));
        const u16 = new Uint16Array(decB64(part.u));
        const pos = new Float32Array(part.n * 3);
        const uv = new Float32Array(part.n * 2);
        for (let i = 0; i < part.n; i++) {
          pos[i * 3] = i16[i * 3] / 2048; pos[i * 3 + 1] = i16[i * 3 + 1] / 2048; pos[i * 3 + 2] = i16[i * 3 + 2] / 2048;
          // wrap UV (Tripo exporta fora de [0,1]) — clamp pegava a borda do atlas
          let uu = u16[i * 2] / 65535, vv = u16[i * 2 + 1] / 65535;
          uv[i * 2] = uu - Math.floor(uu); uv[i * 2 + 1] = vv - Math.floor(vv);
        }
        const geo = new this.THREE.BufferGeometry();
        geo.setAttribute('position', new this.THREE.BufferAttribute(pos, 3));
        geo.setAttribute('uv', new this.THREE.BufferAttribute(uv, 2));
        geo.computeVertexNormals(); // normais de face = facetado PS1 autêntico
        const mat = tex ? new this.THREE.MeshLambertMaterial({ map: tex }) : new this.THREE.MeshLambertMaterial({ color: 0x8a94a2 });
        this.mats.push(mat);
        const mesh = new this.THREE.Mesh(geo, mat);
        mesh.frustumCulled = false;
        mesh.visible = false;
        this.aiMeshes.push(mesh);
        // parentea na peça do rig correspondente
        const parentMap = { torso: this.group, head: this.head, armL: this.armL, armR: this.armR, legL: this.legL, legR: this.legR };
        const g = parentMap[name];
        if (g) g.add(mesh);
        mesh.userData.part = name;
      }
    }
    // ativa as peças AI e desliga os boxes
    for (const m of this.aiMeshes) m.visible = true;
    for (const m of this._boxParts || []) m.visible = false;
    if (this.heroExtras) this.heroExtras.visible = false;
    // reposiciona os pivôs para a anatomia do modelo AI
    const J = {};
    for (const [name, part] of Object.entries(this.aiModelData.parts)) J[name] = part.j;
    if (this.legL) this.legL.position.set(...J.legL);
    if (this.legR) this.legR.position.set(...J.legR);
    if (this.armL) this.armL.position.set(...J.armL);
    if (this.armR) this.armR.position.set(...J.armR);
    if (this.head) this.head.position.set(...J.head);
    this._aiHeadY = J.head[1];
    // pose por modelo: fecha braços abertos (A-pose) via rotação Z do pivô
    const pose = this.aiModelData.pose || { armOpen: 0, gun: [0, -0.6, 0.08] };
    // fechamento parcial: braços ficam VISÍVEIS ao lado do corpo (fechar
    // 100% os afunda dentro do torso do modelo)
    const restZ = Math.max(0.14, (pose.armOpen || 0) * 0.62);
    this._aiArmZ = { L: restZ, R: -restZ };
    if (this.armL) { this.armL.rotation.z = restZ; this.armL.position.x = this.aiModelData.parts.armL.j[0] - 0.022; }
    if (this.armR) { this.armR.rotation.z = -restZ; this.armR.position.x = this.aiModelData.parts.armR.j[0] + 0.022; }
    // arma no frame local da mão (acompanha o fechamento do braço)
    if (this.gunPivot) this.gunPivot.position.set(...pose.gun);
    // lâmina/cano presos ao EIXO DO BRAÇO (ombro->palma): desce no descanso,
    // aponta pra frente na mira — a rotação do braço transporta o prop
    if (this.knifeM) {
      // lâmina segue o EIXO DOS DEDOS (medido da geometria real, frame local)
      // faca DE PÉ na mão fechada (ref. do produtor): cabo na palma,
      // lâmina pra CIMA; a rotação Z de descanso não tumba o +Y (fica ereta)
      this.knifeM.position.set(-0.03, 0, 0);
      // Y=-0.49 cancela EXATAMENTE o tombamento do braço de descanso
      // (derivado: tan(phi)=-tan(restZ)) -> lâmina VERTICAL no mundo; Z=-0.45 = roll do flat
      this.knifeM.rotation.set(-1.57, -0.49, -0.45);
    }
    this.aiActive = true;
  }

  buildPropMesh(data) {
    const bin = atob(data.geo), bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const i16 = new Int16Array(bytes.buffer, 0, data.n * 3);
    const u16 = new Uint16Array(bytes.buffer, data.n * 6, data.n * 2);
    const pos = new Float32Array(data.n * 3), uv = new Float32Array(data.n * 2);
    for (let i = 0; i < data.n; i++) {
      pos[i*3] = i16[i*3]/2048; pos[i*3+1] = i16[i*3+1]/2048; pos[i*3+2] = i16[i*3+2]/2048;
      let uu = u16[i*2]/65535, vv = u16[i*2+1]/65535;
      uv[i*2] = uu - Math.floor(uu); uv[i*2+1] = vv - Math.floor(vv);
    }
    const geo = new this.THREE.BufferGeometry();
    geo.setAttribute('position', new this.THREE.BufferAttribute(pos, 3));
    geo.setAttribute('uv', new this.THREE.BufferAttribute(uv, 2));
    geo.computeVertexNormals();
    let mat = null;
    if (typeof document !== 'undefined' && this.THREE.TextureLoader) {
      try {
        const tex = new this.THREE.TextureLoader().load(data.tex);
        if ('colorSpace' in tex && this.THREE.SRGBColorSpace) tex.colorSpace = this.THREE.SRGBColorSpace;
        tex.magFilter = this.THREE.NearestFilter; tex.minFilter = this.THREE.NearestFilter; tex.generateMipmaps = false;
        mat = new this.THREE.MeshLambertMaterial({ map: tex });
      } catch (e) { mat = null; }
    }
    if (!mat) mat = new this.THREE.MeshLambertMaterial({ color: data.color || 0x777777 });
    mat.userData.noPsx = true;      // fora do vertex-snap
    if (mat.emissive) mat.emissive.setHex(0x232833); // brilho sutil p/ a arma ler no escuro
    this.mats.push(mat);
    const mesh = new this.THREE.Mesh(geo, mat);
    mesh.layers.set(2); // passada full-res: efeito PS1 leve só nas armas
    mesh.frustumCulled = false;
    return mesh;
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
      this.armMat.color.setHex(0x1c221a);
      this.pantsMat.color.setHex(0x1a1e18);
      this.shoesMat.color.setHex(0x141416);
    } else if (heroId === 'clara') {
      this.coatMat.color.setHex(0xd8d8d4); // jaleco médico (turnaround: manchas na barra)
      this.coatDMat.color.setHex(0x6b1d28); // blusa vinho
      this.armMat.color.setHex(0xd8d8d4);
      this.pantsMat.color.setHex(0x465064); // jeans azul-acinzentado
      this.shoesMat.color.setHex(0xcfcfc8); // tênis brancos
      this.hairMat.color.setHex(0x4a2c18);
      this.faceMat.map = this.TEX.faceClara || this.TEX.faceDaniel;
    } else if (heroId === 'bento') {
      this.coatMat.color.setHex(0x2c4666); // macacão jeans azul (turnaround)
      this.coatDMat.color.setHex(0xd8d0c0); // camisa creme por baixo
      this.armMat.color.setHex(0xd8d0c0); // mangas da camisa arregaçadas
      this.pantsMat.color.setHex(0x2c4666);
      this.shoesMat.color.setHex(0x141416); // botas de borracha
      this.hairMat.color.setHex(0x8a8a88);
      this.faceMat.map = this.TEX.faceBento || this.TEX.faceDaniel;
    } else {
      // Daniel
      this.coatMat.color.setHex(0x2a3448);
      this.coatDMat.color.setHex(0x1c2434);
      this.armMat.color.setHex(0x2a3448);
      this.pantsMat.color.setHex(0x3a3a40);
      this.shoesMat.color.setHex(0x1a1412);
      this.hairMat.color.setHex(0x241812);
      this.faceMat.map = this.TEX.faceDaniel;
    }
    this.aiModelData = (heroId === 'daniel' && DANIEL_MODEL) ? DANIEL_MODEL
      : (heroId === 'clara' && CLARA_MODEL) ? CLARA_MODEL : null;
    this.applyAIModel(!!this.aiModelData && skinId === 'default');
    this.updateHeroExtras(heroId);
    this.group.traverse((o) => { if (o.isMesh && !o.userData.arma) o.layers.enable(1); }); // oclusor p/ peças novas
    this.faceMat.needsUpdate = true;
  }

  // Detalhes visuais por herói: tufos de cabelo, cabelo longo, bib do macacão
  updateHeroExtras(heroId) {
    if (!this.heroExtras) return;
    while (this.heroExtras.children.length) {
      const ch = this.heroExtras.children[0];
      this.heroExtras.remove(ch);
    }
    const bx = (w, h, d, m, x, y, z, rx = 0, rz = 0) => {
      const mesh = new this.THREE.Mesh(new this.THREE.BoxGeometry(w, h, d), m);
      mesh.position.set(x, y, z);
      mesh.rotation.x = rx;
      mesh.rotation.z = rz;
      this.heroExtras.add(mesh);
      return mesh;
    };
    if (heroId === 'clara') {
      // cabelo longo da turnaround: costas + laterais até o peito
      bx(0.27, 0.7, 0.12, this.hairMat, 0, -0.26, -0.16);
      bx(0.09, 0.6, 0.14, this.hairMat, -0.14, -0.2, 0.02);
      bx(0.09, 0.6, 0.14, this.hairMat, 0.14, -0.2, 0.02);
      // jaleco LONGO até o joelho (turnaround)
      bx(0.54, 0.52, 0.34, this.coatMat, 0, 0.56, 0);
      // abas dos bolsos frontais do jaleco
      bx(0.12, 0.06, 0.02, this.coatDMat, -0.13, 0.88, 0.175);
      bx(0.12, 0.06, 0.02, this.coatDMat, 0.13, 0.88, 0.175);
      // tênis brancos com sola
      bx(0.24, 0.04, 0.36, this.soleMat, 0, -0.775, 0.05, this.legL);
      bx(0.24, 0.04, 0.36, this.soleMat, 0, -0.775, 0.05, this.legR);
    } else if (heroId === 'bento') {
      // barriga saliente do zelador (turnaround)
      bx(0.5, 0.42, 0.38, this.coatMat, 0, 1.08, 0.04);
      // bib do macacão + bolso frontal + alças com fivelas metálicas
      bx(0.4, 0.32, 0.02, this.coatMat, 0, 1.24, 0.165);
      bx(0.18, 0.14, 0.012, this.coatDMat, 0, 1.2, 0.178);
      bx(0.06, 0.38, 0.02, this.coatMat, -0.13, 1.4, 0.168);
      bx(0.06, 0.38, 0.02, this.coatMat, 0.13, 1.4, 0.168);
      const buckle = this.lam(0x9aa2ac);
      bx(0.07, 0.05, 0.028, buckle, -0.13, 1.52, 0.168);
      bx(0.07, 0.05, 0.028, buckle, 0.13, 1.52, 0.168);
      // chaveiro grosso pendurado na alça (turnaround)
      bx(0.05, 0.16, 0.03, this.soleMat, -0.16, 1.02, 0.18);
      bx(0.09, 0.06, 0.022, buckle, -0.16, 0.93, 0.18);
      bx(0.02, 0.1, 0.022, buckle, -0.13, 0.96, 0.18);
    } else {
      // Daniel: franja bagunçada da turnaround
      bx(0.26, 0.06, 0.05, this.hairMat, 0, 0.155, 0.145, 0.35);
      bx(0.07, 0.05, 0.07, this.hairMat, -0.1, 0.17, 0.1, 0, -0.3);
      bx(0.07, 0.05, 0.07, this.hairMat, 0.11, 0.165, 0.09, 0, 0.35);
      // tufo no topo
      bx(0.08, 0.06, 0.1, this.hairMat, 0.02, 0.25, -0.04, -0.25);
    }
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
    if (this.armL) this.armL.rotation.set(0, 0, (this.aiActive && this._aiArmZ) ? this._aiArmZ.L : 0.05);
    if (this.armR) this.armR.rotation.set(0, 0, (this.aiActive && this._aiArmZ) ? this._aiArmZ.R : -0.05);
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
    // arma SEMPRE na mão (estilo survival horror) — some só ao morrer
    this.gunPivot.visible = !this.dead;
  }

  setAim(b) {
    this.aiming = b;
    this.gunPivot.visible = !this.dead; // arma sempre na mão
    if (!b && this.gunPivot) this.gunPivot.rotation.x = 0;
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
      if (this.aiActive) { // mira compacta: braços à frente, arma nivelada
        this.armR.rotation.set(-1.52, -0.04, -0.05);
        this.armL.rotation.set(-1.44, 0.05, 0.05);
        if (this.gunPivot) this.gunPivot.rotation.x = 0.92; // nivela o cano da pistola
        if (this.knifeM) this.knifeM.rotation.set(3.77, 0, -0.45); // fallback; o updateKnifeWorldUp abaixo corrige por frame
        this.updateKnifeWorldUp(0); // mira APROVADA: sem lean, nada muda
      }
      else { this.armR.rotation.set(-1.45, 0.18, 0); this.armL.rotation.set(-1.40, -0.22, 0); }
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
      // modelo IA (peças rígidas, sem joelho): passos mais curtos e
      // compensação de quadril para os pés não flutuarem no arco
      const legAmp = this.aiActive ? 0.30 : 0.55;
      const armAmp = this.aiActive ? 0.26 : 0.45;
      this.legL.rotation.x = sw * legAmp;
      this.legR.rotation.x = -sw * legAmp;
      this.armL.rotation.x = -sw * armAmp;
      this.armR.rotation.x = sw * armAmp;
      this.armL.rotation.z = this.aiActive ? this._aiArmZ.L : 0.05;
      this.armR.rotation.z = this.aiActive ? this._aiArmZ.R : -0.05;
      this.torso.rotation.y = -sw * 0.06;
      if (this.aiActive) this.torso.position.y = 1.14 - Math.abs(sw) * 0.045;

      if ((prevPhase % Math.PI) > (this.walkPhase % Math.PI)) {
        ev.step = true;
        ev.run = running;
      }
    } else {
      this.moving = false;
      if (this.aiActive && this.torso) this.torso.position.y += (1.14 - this.torso.position.y) * Math.min(1, dt * 8);
      this.legL.rotation.x *= Math.max(0, 1 - dt * 10);
      this.legR.rotation.x *= Math.max(0, 1 - dt * 10);
      this.armL.rotation.x *= Math.max(0, 1 - dt * 10);
      this.armR.rotation.x *= Math.max(0, 1 - dt * 10);
      if (this.aiActive && this._aiArmZ) { // recompõe o fechamento (ataque/teleporte zeravam Z)
        this.armL.rotation.z += (this._aiArmZ.L - this.armL.rotation.z) * Math.min(1, dt * 8);
        this.armR.rotation.z += (this._aiArmZ.R - this.armR.rotation.z) * Math.min(1, dt * 8);
      }
      this.torso.rotation.y *= Math.max(0, 1 - dt * 10);
      const headBase = (this.aiActive && this._aiHeadY) ? this._aiHeadY : 1.62;
      this.head.position.y = headBase + Math.sin(performance.now() / 600) * 0.015;
    }
    this.updateKnifeWorldUp(); // lâmina vertical no mundo em idle E andar
    return ev;
  }

  // FACA DE PÉ EM TODA ANIMAÇÃO: em vez de ângulos estáticos por estado
  // (o swing do andar tombava a lâmina), compensa POR FRAME a rotação da
  // cadeia do braço (idle/walk/mira) forçando a lâmina VERTICAL no mundo.
  updateKnifeWorldUp(lean = 0.21) {
    if (!this.knifeM || !this.knifeM.visible || !this.knifeM.parent) return;
    const pv = new this.THREE.Vector3(), pq = new this.THREE.Quaternion(), ps = new this.THREE.Vector3();
    this.knifeM.parent.updateWorldMatrix(true, false);
    this.knifeM.parent.matrixWorld.decompose(pv, pq, ps);
    // remove o yaw do grupo: o lean acompanha o CORPO (lâmina inclina p/ fora da mão
    // em qualquer direção que ele esteja virado) sem tocar a posição — cabo segue no punho
    const gq = new this.THREE.Quaternion();
    this.group.matrixWorld.decompose(pv, gq, ps);
    gq.invert();
    pq.premultiply(gq); // cadeia de descanso sem o yaw
    pq.invert();
    // alvo no MUNDO: lâmina (+Z local) -> +Y (de pé, ref. do produtor/foto do chef)
    const mundo = new this.THREE.Quaternion().setFromAxisAngle(new this.THREE.Vector3(1, 0, 0), -Math.PI / 2);
    // lean ~12° em torno do eixo frontal do corpo: tira a lâmina de cima da manga
    // (dist. lâmina↔manga era 0.001) sem destravar o cabo do punho; 0 na mira (aprovada)
    const fora = new this.THREE.Quaternion().setFromAxisAngle(new this.THREE.Vector3(0, 0, 1), -lean);
    this.knifeM.quaternion.copy(pq).multiply(fora).multiply(mundo);
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

    // ================= PACIENTE CONTORCIDO (INFECTADO) =================
    if (this.type === 'infectado') {
      const jacketM = lam(0x7a766c, 0x000000, this.TEX.straitjacket);
      const skinM = lam(0x8a928c);
      const pantsM = lam(0x404448);

      for (const side of [-0.14, 0.14]) {
        const leg = new this.THREE.Mesh(new this.THREE.BoxGeometry(0.14 * s, 0.75 * s, 0.16 * s), pantsM);
        leg.position.set(side * s, 0.38 * s, 0);
        this.group.add(leg);
        this.legs.push(leg);
      }
      const torso = new this.THREE.Mesh(new this.THREE.BoxGeometry(0.48 * s, 0.72 * s, 0.32 * s), jacketM);
      torso.position.y = 1.05 * s;
      torso.rotation.x = 0.18;
      this.group.add(torso);
      this.torso = torso;

      const head = new this.THREE.Mesh(new this.THREE.BoxGeometry(0.26 * s, 0.28 * s, 0.26 * s), skinM);
      head.position.set(0, 1.55 * s, 0.08 * s);
      head.rotation.z = 0.22;
      this.group.add(head);

      const eyeM = new this.THREE.MeshBasicMaterial({ color: 0xff2222 });
      this.mats.push(eyeM);
      const f1 = new this.THREE.Mesh(new this.THREE.PlaneGeometry(0.06 * s, 0.04 * s), eyeM);
      f1.position.set(-0.06 * s, 1.57 * s, 0.22 * s);
      const f2 = new this.THREE.Mesh(new this.THREE.PlaneGeometry(0.06 * s, 0.04 * s), eyeM);
      f2.position.set(0.06 * s, 1.57 * s, 0.22 * s);
      this.group.add(f1, f2);

      const armM = new this.THREE.Mesh(new this.THREE.BoxGeometry(0.44 * s, 0.16 * s, 0.22 * s), jacketM);
      armM.position.set(0, 1.05 * s, 0.18 * s);
      this.group.add(armM);
      return;
    }

    // ================= SOMBRA CIRÚRGICA (ENFERMEIRA) =================
    if (this.type === 'enfermeira') {
      const dressM = lam(0xd0d4dc, 0x000000, this.TEX.nurseUniform);
      const skinM = lam(0x828a88);
      const metalM = lam(0xa0a8b4);

      for (const side of [-0.13, 0.13]) {
        const leg = new this.THREE.Mesh(new this.THREE.BoxGeometry(0.12 * s, 0.75 * s, 0.14 * s), skinM);
        leg.position.set(side * s, 0.38 * s, 0);
        this.group.add(leg);
        this.legs.push(leg);
      }
      const dress = new this.THREE.Mesh(new this.THREE.CylinderGeometry(0.2 * s, 0.32 * s, 0.75 * s, 7), dressM);
      dress.position.y = 1.02 * s;
      this.group.add(dress);
      this.torso = dress;

      const head = new this.THREE.Mesh(new this.THREE.BoxGeometry(0.24 * s, 0.26 * s, 0.24 * s), skinM);
      head.position.set(0, 1.52 * s, 0);
      this.group.add(head);

      const cap = new this.THREE.Mesh(new this.THREE.BoxGeometry(0.2 * s, 0.08 * s, 0.16 * s), dressM);
      cap.position.set(0, 1.68 * s, -0.02 * s);
      this.group.add(cap);

      const eyeM = new this.THREE.MeshBasicMaterial({ color: 0xffee44 });
      this.mats.push(eyeM);
      const eL = new this.THREE.Mesh(new this.THREE.PlaneGeometry(0.05 * s, 0.04 * s), eyeM);
      eL.position.set(-0.06 * s, 1.54 * s, 0.13 * s);
      const eR = new this.THREE.Mesh(new this.THREE.PlaneGeometry(0.05 * s, 0.04 * s), eyeM);
      eR.position.set(0.06 * s, 1.54 * s, 0.13 * s);
      this.group.add(eL, eR);

      const armL = new this.THREE.Group(); armL.position.set(-0.28 * s, 1.35 * s, 0);
      const alMesh = new this.THREE.Mesh(new this.THREE.BoxGeometry(0.1 * s, 0.65 * s, 0.1 * s), skinM);
      alMesh.position.y = -0.28 * s; armL.add(alMesh);
      this.group.add(armL); this.arms.push(armL);

      const armR = new this.THREE.Group(); armR.position.set(0.28 * s, 1.35 * s, 0);
      const arMesh = new this.THREE.Mesh(new this.THREE.BoxGeometry(0.1 * s, 0.65 * s, 0.1 * s), skinM);
      arMesh.position.y = -0.28 * s; armR.add(arMesh);

      const blade = new this.THREE.Mesh(new this.THREE.BoxGeometry(0.03 * s, 0.35 * s, 0.08 * s), metalM);
      blade.position.set(0, -0.58 * s, 0.12 * s);
      blade.rotation.x = Math.PI / 4;
      armR.add(blade);
      this.group.add(armR); this.arms.push(armR);
      return;
    }

    // ================= AMÁLGAMA DE CINZAS (ABERRAÇÃO DAS CALDEIRAS) =================
    if (this.type === 'aberracao') {
      const emberM = lam(0x221a16, 0x331005, this.TEX.emberBody);
      const rockM = lam(0x141010);

      for (const side of [-0.22, 0.22]) {
        const leg = new this.THREE.Mesh(new this.THREE.BoxGeometry(0.22 * s, 0.85 * s, 0.24 * s), rockM);
        leg.position.set(side * s, 0.42 * s, 0);
        this.group.add(leg);
        this.legs.push(leg);
      }
      const torso = new this.THREE.Mesh(new this.THREE.BoxGeometry(0.72 * s, 0.95 * s, 0.48 * s), emberM);
      torso.position.y = 1.25 * s;
      this.group.add(torso);
      this.torso = torso;

      const head = new this.THREE.Mesh(new this.THREE.BoxGeometry(0.36 * s, 0.42 * s, 0.36 * s), rockM);
      head.position.set(0, 1.85 * s, 0.05 * s);
      this.group.add(head);

      const eyeM = new this.THREE.MeshBasicMaterial({ color: 0xff5511 });
      this.mats.push(eyeM);
      const eG = new this.THREE.PlaneGeometry(0.12 * s, 0.06 * s);
      const f1 = new this.THREE.Mesh(eG, eyeM);
      f1.position.set(0, 1.86 * s, 0.24 * s);
      this.group.add(f1);

      for (const side of [-1, 1]) {
        const arm = new this.THREE.Group(); arm.position.set(side * 0.45 * s, 1.55 * s, 0);
        const aMesh = new this.THREE.Mesh(new this.THREE.BoxGeometry(0.2 * s, 0.95 * s, 0.2 * s), emberM);
        aMesh.position.y = -0.4 * s; arm.add(aMesh);
        this.group.add(arm); this.arms.push(arm);
      }
      return;
    }

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
    // Turnaround: espectro flutuante com capa facetada, capuz pontudo,
    // bainha esfarrapada, vazio negro no rosto e névoa espectral na base.
    const bodyM = lam(0x0c0c12, 0x000000, this.TEX.facet);
    const darkM = lam(0x060608);

    const cloak = new this.THREE.Mesh(
      new this.THREE.ConeGeometry(0.42 * s, 1.5 * s, 7),
      bodyM
    );
    cloak.position.y = 0.75 * s;
    this.group.add(cloak);
    this.cloak = cloak;

    // bainha esfarrapada: pontas em zigue-zague na base (turnaround)
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      const spikeH = (i % 2 === 0 ? 0.34 : 0.22) * s;
      const spike = new this.THREE.Mesh(
        new this.THREE.ConeGeometry(0.055 * s, spikeH, 4),
        darkM
      );
      spike.rotation.x = Math.PI; // aponta para baixo
      spike.position.set(Math.sin(a) * 0.33 * s, spikeH / 2 + 0.05 * s, Math.cos(a) * 0.33 * s);
      this.group.add(spike);
    }

    // capuz pontudo sobre os ombros
    const hood = new this.THREE.Mesh(
      new this.THREE.ConeGeometry(0.3 * s, 0.62 * s, 5),
      bodyM
    );
    hood.position.set(0, 1.72 * s, -0.02 * s);
    hood.rotation.x = 0.1;
    this.group.add(hood);

    // vazio negro do rosto (os olhos brilham contra o absolutamente escuro)
    const voidM = new this.THREE.MeshBasicMaterial({ color: 0x030306 });
    this.mats.push(voidM);
    const faceVoid = new this.THREE.Mesh(new this.THREE.PlaneGeometry(0.22 * s, 0.26 * s), voidM);
    faceVoid.position.set(0, 1.74 * s, 0.185 * s);
    faceVoid.rotation.x = -0.08;
    this.group.add(faceVoid);

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
    eL.position.set(-0.08 * s, 1.77 * s, 0.19 * s);
    const eR = new this.THREE.Mesh(eyeG, eyeM);
    eR.position.set(0.08 * s, 1.77 * s, 0.19 * s);
    this.group.add(eL, eR);

    const glow = new this.THREE.Sprite(new this.THREE.SpriteMaterial({
      map: this.TEX.eye, color: this.cfg.eye, transparent: true,
      opacity: 0.55, blending: this.THREE.AdditiveBlending, depthWrite: false,
    }));
    glow.scale.set(0.7 * s, 0.35 * s, 1);
    glow.position.set(0, 1.77 * s, 0.12 * s);
    this.group.add(glow);
    this.eyeGlow = glow;

    // névoa espectral na base (turnaround: nuvem de píxeis acinzentada)
    this.mist = [];
    for (let i = 0; i < 3; i++) {
      const puff = new this.THREE.Sprite(new this.THREE.SpriteMaterial({
        map: this.TEX.blob, color: 0x9aa0a8, transparent: true,
        opacity: 0.28, depthWrite: false,
      }));
      const ps = (0.75 + i * 0.22) * s;
      puff.scale.set(ps, ps * 0.5, 1);
      puff.position.set((i - 1) * 0.16 * s, (0.1 + (i % 2) * 0.08) * s, (i % 2 ? 0.1 : -0.12) * s);
      this.group.add(puff);
      this.mist.push(puff);
    }

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
    if (this.mist) {
      const t = performance.now() / 1000;
      this.mist.forEach((puff, i) => {
        puff.material.opacity = 0.2 + Math.sin(t * 1.3 + i * 2.1) * 0.1;
        puff.position.x = Math.sin(t * 0.7 + i * 2.1) * 0.12 * this.cfg.scale;
      });
    }
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

    if (this.who === 'lucia') {
      // LÚCIA (turnaround): franzina, vestido rosa-terra longo, franja,
      // cabelo na cintura, pingente do medalhão, mãos postas à frente
      const dress = lam(0xa8847c);
      const dressD = lam(0x8f6e66);
      const hair = lam(0x2a1a12);
      const skin = lam(0xecd0b4);
      // vestido longo (saia + torso)
      bx(0.44, 0.78, 0.32, dress, 0, 0.52, 0);
      bx(0.5, 0.06, 0.36, dressD, 0, 0.15, 0); // barra
      bx(0.36, 0.55, 0.26, dress, 0, 1.18, 0);
      // braços delicados com mãos postas à frente
      bx(0.08, 0.48, 0.1, dress, -0.2, 1.22, 0, this.group).rotation.z = 0.12;
      bx(0.08, 0.48, 0.1, dress, 0.2, 1.22, 0, this.group).rotation.z = -0.12;
      bx(0.14, 0.08, 0.1, skin, 0, 1.02, 0.16); // mãos postas
      // cabeça + cabelo: franja reta + laterais + costas na cintura
      this.head = bx(0.26, 0.3, 0.26, skin, 0, 1.62, 0);
      bx(0.3, 0.12, 0.3, hair, 0, 1.77, -0.01);
      bx(0.3, 0.09, 0.05, hair, 0, 1.7, 0.145); // franja
      bx(0.3, 0.62, 0.1, hair, 0, 1.42, -0.15); // costas
      bx(0.06, 0.52, 0.12, hair, -0.16, 1.44, 0);
      bx(0.06, 0.52, 0.12, hair, 0.16, 1.44, 0);
      // pingente do medalhão
      bx(0.05, 0.07, 0.02, lam(0x6a2a20), 0, 1.38, 0.14);
      // sapatinhos simples
      bx(0.16, 0.08, 0.24, lam(0x4a3428), -0.09, 0.04, 0.02);
      bx(0.16, 0.08, 0.24, lam(0x4a3428), 0.09, 0.04, 0.02);
    } else if (this.who === 'clara') {
      const coat = lam(0xd8d8d4);
      const wine = lam(0x6b1d28);
      const dark = lam(0x465064);
      const skin = lam(0xdcb194);
      const hair = lam(0x4a2c18);
      bx(0.2, 0.78, 0.24, dark, -0.12, 0.39, 0);
      bx(0.2, 0.78, 0.24, dark, 0.12, 0.39, 0);
      // jaleco longo aberto com blusa vinho
      bx(0.48, 0.5, 0.3, coat, 0, 1.14, 0);
      bx(0.5, 0.5, 0.32, coat, 0, 0.66, 0);
      bx(0.24, 0.42, 0.32, wine, 0, 1.18, 0.01);
      bx(0.2, 0.78, 0.24, skin, -0.12, 1.44, 0.02); // antebraço à mostra
      bx(0.2, 0.78, 0.24, skin, 0.12, 1.44, 0.02);
      this.head = bx(0.28, 0.32, 0.28, skin, 0, 1.62, 0);
      bx(0.3, 0.14, 0.3, hair, 0, 1.76, -0.01);
      bx(0.3, 0.6, 0.1, hair, 0, 1.44, -0.15); // cabelo longo
      bx(0.06, 0.5, 0.12, hair, -0.16, 1.46, 0);
      bx(0.06, 0.5, 0.12, hair, 0.16, 1.46, 0);
      bx(0.2, 0.1, 0.3, lam(0xcfcfc8), -0.12, 0.04, 0.04); // tênis brancos
      bx(0.2, 0.1, 0.3, lam(0xcfcfc8), 0.12, 0.04, 0.04);
    } else if (this.who === 'bento') {
      const blue = lam(0x2c4666);
      const cream = lam(0xd8d0c0);
      const skin = lam(0xba9476);
      bx(0.22, 0.78, 0.26, blue, -0.13, 0.39, 0);
      bx(0.22, 0.78, 0.26, blue, 0.13, 0.39, 0);
      bx(0.54, 0.72, 0.34, blue, 0, 1.14, 0);
      bx(0.5, 0.42, 0.38, blue, 0, 1.06, 0.04); // barriga
      bx(0.4, 0.3, 0.02, blue, 0, 1.24, 0.185); // bib
      bx(0.3, 0.24, 0.02, cream, 0, 1.3, 0.005); // camisa creme no peito
      bx(0.14, 0.5, 0.16, cream, -0.34, 1.3, 0); // mangas arregaçadas
      bx(0.14, 0.5, 0.16, cream, 0.34, 1.3, 0);
      bx(0.12, 0.24, 0.14, skin, -0.34, 0.94, 0); // antebraços
      bx(0.12, 0.24, 0.14, skin, 0.34, 0.94, 0);
      this.head = bx(0.3, 0.34, 0.3, skin, 0, 1.62, 0);
      bx(0.32, 0.1, 0.34, lam(0x8a8a88), 0, 1.78, -0.02); // cabelo grisalho lateral
      bx(0.24, 0.12, 0.28, lam(0x9a9a96), 0, 1.48, 0.06); // barba grisalha
      bx(0.22, 0.12, 0.3, lam(0x141416), -0.12, 0.04, 0.05); // botas
      bx(0.22, 0.12, 0.3, lam(0x141416), 0.12, 0.04, 0.05);
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
