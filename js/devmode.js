// ============================================================
// SANTA LÚCIA - Modo LABORATÓRIO (playtest) + editor de objetos
// Ativa com ?playtest na URL. Mundo real substituído por plano
// branco + grade; PS1 filter OFF; editor COMPLETO de objetos:
// gizmo de eixos (arraste por eixo), duplicar, deletar, undo,
// snap de grade, criação de caixas, câmera orbital (botão direito),
// salvar/carregar layout (localStorage) e exportação JSON (K).
// NÃO altera gameplay normal — tudo atrás do flag playtest.
// ============================================================
import { WEAPON_MODELS } from './model_weapons_data.js?v=1924_1997_v94';

const LAB_KEY = 'lab_layout_v1';

export function isPlaytest() {
  try {
    return typeof location !== 'undefined' && /playtest/.test(location.search);
  } catch (e) { return false; }
}

export class DevEditor {
  constructor(game) {
    this.game = game;
    const T = game.THREE;
    this.T = T;
    this.ray = new T.Raycaster();
    this.ray.params.Line = { threshold: 0.08 };
    this.ray.layers.enable(2); // armas vivem na camada 2 (full-res)
    this.selected = null;
    this.helper = null;          // caixa amarela
    this.axes = null;            // gizmo de eixos (3 linhas)
    this.dragging = false;       // arraste livre (plano XZ)
    this.axisDrag = null;        // 'x' | 'y' | 'z' quando arrastando por eixo
    this.axisT0 = 0;
    this.dragOff = new T.Vector3();
    this.dragPlane = new T.Plane(new T.Vector3(0, 1, 0), 0);
    this.registry = new Map();   // objeto -> snapshot
    this.undoStack = [];         // {obj, before}
    this.snapOn = false;
    this.orbiting = false;
    this.orbit = { yaw: 0, pitch: 0.5, dist: 4 };
    this._primN = 0;
    this.fps = 60;
    this.visible = true;

    this.el = document.createElement('div');
    this.el.style.cssText = 'position:fixed;top:10px;left:10px;z-index:999997;font:11px/1.45 monospace;color:#d8ffd8;background:rgba(0,0,0,.72);padding:10px 12px;border:1px solid #3a5;white-space:pre;pointer-events:none;border-radius:4px;';
    document.body.appendChild(this.el);

    const cv = game.renderer.domElement;
    const ndc = (e) => {
      const r = cv.getBoundingClientRect();
      return new T.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    };
    cv.addEventListener('contextmenu', (e) => e.preventDefault(), true);
    cv.addEventListener('pointerdown', (e) => {
      if (game.state !== 'play') return;
      if (e.button === 2) { e.stopPropagation(); this.startOrbit(); return; }
      if (e.button !== 0) return;
      e.stopPropagation();
      const hit = this.pick(ndc(e));
      if (hit) { this.select(hit); this.startDrag(ndc(e)); e.stopPropagation(); }
      else { this.deselect(); } // clique no vazio segue pro JOGO (mirando = facada)
    }, true);
    cv.addEventListener('pointermove', (e) => {
      if (this.orbiting) {
        this.orbit.yaw -= e.movementX * 0.005;
        this.orbit.pitch = Math.max(0.05, Math.min(1.45, this.orbit.pitch + e.movementY * 0.005));
        return;
      }
      if (this.axisDrag && this.selected) {
        e.stopPropagation();
        this.ray.setFromCamera(ndc(e), game.camera);
        const t = this.closestRayLine(this.ray.ray, this._dragC, this._dragA);
        const s = this.selected, o = this._dragStart;
        const delta = this.snapV(t - this.axisT0);
        s.position.set(
          this.axisDrag === 'x' ? this.snapV(o.x + delta) : o.x,
          this.axisDrag === 'y' ? this.snapV(o.y + delta) : o.y,
          this.axisDrag === 'z' ? this.snapV(o.z + delta) : o.z
        );
        this.snapshot();
        return;
      }
      if (!this.dragging || !this.selected) return;
      e.stopPropagation();
      this.ray.setFromCamera(ndc(e), game.camera);
      const pt = new T.Vector3();
      if (this.ray.ray.intersectPlane(this.dragPlane, pt)) {
        const s = this.selected, o = this._dragStart;
        s.position.set(
          this.snapV(pt.x + this.dragOff.x),
          o.y,
          this.snapV(pt.z + this.dragOff.z)
        );
        this.snapshot();
      }
    }, true);
    window.addEventListener('pointerup', () => { this.dragging = false; this.axisDrag = null; this.orbiting = false; }, true);
    cv.addEventListener('wheel', (e) => {
      if (this.orbiting) { e.stopPropagation(); e.preventDefault(); this.orbit.dist = Math.max(1, Math.min(30, this.orbit.dist * (e.deltaY > 0 ? 1.1 : 0.9))); return; }
      if (!this.selected) return;
      e.stopPropagation(); e.preventDefault();
      this.pushUndo();
      this.selected.position.y += (e.deltaY < 0 ? 1 : -1) * (e.shiftKey ? 0.05 : 0.01);
      if (this.snapOn) this.selected.position.y = this.snapV(this.selected.position.y);
      this.dragPlane.constant = -this.selected.position.y;
      this.snapshot();
    }, { capture: true, passive: false });

    document.addEventListener('keydown', (e) => {
      if (e.code === 'F3') { e.preventDefault(); this.visible = !this.visible; this.el.style.display = this.visible ? '' : 'none'; return; }
      if (game.state !== 'play') return;
      this._ctrlHeld = !!(e.ctrlKey || e.metaKey);
      // atalhos com Ctrl (funcionam com ou sem seleção)
      if (e.ctrlKey || e.metaKey) {
        if (e.code === 'KeyD') { e.preventDefault(); e.stopPropagation(); this.duplicate(); return; }
        if (e.code === 'KeyZ') { e.preventDefault(); e.stopPropagation(); this.undo(); return; }
        if (e.code === 'KeyS') { e.preventDefault(); e.stopPropagation(); this.save(); return; }
        if (e.code === 'KeyL') { e.preventDefault(); e.stopPropagation(); this.load(); return; }
        return;
      }
      if (e.ctrlKey && e.code === 'KeyG') { this.snapOn = !this.snapOn; this.game.ui.toast('🛠 snap ' + (this.snapOn ? 'ON (0.25m)' : 'OFF'), 1.5); return; }
      if (e.code === 'KeyN') { e.preventDefault(); this.addBox(); return; }
      if (e.code === 'KeyK') { e.preventDefault(); e.stopPropagation(); this.export(); return; }
      if (!this.selected) return;
      if (e.code === 'Delete' || e.code === 'Backspace') { e.preventDefault(); this.remove(); return; }
      if (e.code === 'KeyP') { e.preventDefault(); this.tpPlayer(); return; }
      const s = this.selected, st = e.shiftKey ? 0.5 : 0.1;
      const fwd = new T.Vector3();
      game.camera.getWorldDirection(fwd); fwd.y = 0;
      if (fwd.lengthSq() < 1e-6) fwd.set(0, 0, 1);
      fwd.normalize();
      const right = new T.Vector3(fwd.z, 0, -fwd.x);
      let used = true;
      switch (e.code) {
        case 'KeyW': this.pushUndo(); s.position.addScaledVector(fwd, st); break;
        case 'KeyS': this.pushUndo(); s.position.addScaledVector(fwd, -st); break;
        case 'KeyD': this.pushUndo(); s.position.addScaledVector(right, st); break;
        case 'KeyA': this.pushUndo(); s.position.addScaledVector(right, -st); break;
        case 'KeyR': this.pushUndo(); s.position.y += st; break;
        case 'KeyF': this.pushUndo(); s.position.y -= st; break;
        case 'KeyQ': this.pushUndo(); s.rotation.y += this.rotStep(); break;
        case 'KeyE': this.pushUndo(); s.rotation.y -= this.rotStep(); break;
        case 'KeyT': this.pushUndo(); s.rotation.x += this.rotStep(); break; // pitch (nariz pra baixo/cima)
        case 'KeyG': this.pushUndo(); s.rotation.x -= this.rotStep(); break;
        case 'KeyY': this.pushUndo(); s.rotation.z += this.rotStep(); break; // roll (tombar de lado)
        case 'KeyH': this.pushUndo(); s.rotation.z -= this.rotStep(); break;
        case 'KeyZ': this.pushUndo(); s.scale.multiplyScalar(0.9); break;
        case 'KeyX': this.pushUndo(); s.scale.multiplyScalar(1 / 0.9); break;
        case 'KeyC': this.pushUndo(); s.scale.set(1, 1, 1); break;
        case 'Escape': this.deselect(); break;
        default: used = false;
      }
      if (used) {
        e.preventDefault(); e.stopPropagation();
        if (this.snapOn) { s.position.set(this.snapV(s.position.x), this.snapV(s.position.y), this.snapV(s.position.z)); }
        this.snapshot();
      }
    }, true);
  }

  rotStep() {
    // passo de giro: 15 graus (padrao) · Ctrl+tecla = 3 graus (fino)
    // (a tecla chama com e.ctrlKey disponivel via handler — guardamos lá)
    return this._ctrlHeld ? 0.0524 : 0.2618;
  }

  // ---------- matemática do arraste por eixo ----------
  closestRayLine(ray, C, A) {
    // menor t ao longo da reta C + t*A atingido pelo raio (arraste de eixo)
    const w = new this.T.Vector3().subVectors(C, ray.origin);
    const a = ray.direction.dot(ray.direction);
    const b = ray.direction.dot(A);
    const c = A.dot(A);
    const d = ray.direction.dot(w);
    const f = A.dot(w);
    const den = a * c - b * b;
    if (Math.abs(den) < 1e-8) return 0;
    return (a * f - b * d) / den;
  }
  snapV(v) { return this.snapOn ? Math.round(v / 0.25) * 0.25 : +v.toFixed(3); }

  // ---------- picking ----------
  pick(ndcV) {
    this.ray.setFromCamera(ndcV, this.game.camera);
    const hits = this.ray.intersectObjects(this.game.scene.children, true);
    for (const h of hits) {
      const o = h.object;
      if (o.userData && o.userData.devSkip) continue;
      if (o.isGridHelper || o.type === 'GridHelper') continue;
      if (o.parent === this.game.player.group) return null; // player não é editável
      // gizmo de eixo? arraste restrito ao eixo
      const ax = o.userData && o.userData.devAxis;
      if (ax && this.selected) {
        this._dragC = this.selected.getWorldPosition(new this.T.Vector3());
        this._dragA = new this.T.Vector3(ax === 'x' ? 1 : 0, ax === 'y' ? 1 : 0, ax === 'z' ? 1 : 0);
        this._dragStart = this.selected.position.clone();
        this.axisT0 = this.closestRayLine(this.ray.ray, this._dragC, this._dragA);
        this.axisDrag = ax;
        return null;
      }
      const root = this.movableRoot(o);
      if (root) return root;
    }
    return null;
  }
  movableRoot(o) {
    const scene = this.game.scene, roomG = this.game.room && this.game.room.group;
    let q = o;
    while (q.parent && q.parent !== scene && q.parent !== roomG) q = q.parent;
    if (!q.parent) return null;
    return q;
  }

  // ---------- seleção / gizmo ----------
  select(obj) {
    this.deselect();
    this.selected = obj;
    if (!obj.name) obj.name = 'obj_' + Date.now().toString(36);
    const T = this.T;
    this.helper = new T.Box3Helper(new T.Box3(), 0xffdd00);
    this.helper.userData.devSkip = true;
    this.game.scene.add(this.helper);
    // gizmo: eixos coloridos (X vermelho, Y verde, Z azul)
    this.axes = new T.Group();
    const mk = (dir, color, axName) => {
      const g = new T.BufferGeometry().setFromPoints([new T.Vector3(), dir.clone().multiplyScalar(1.4)]);
      const line = new T.Line(g, new T.LineBasicMaterial({ color }));
      line.userData.devSkip = true; line.userData.devAxis = axName;
      this.ray.layers.enable(0);
      return line;
    };
    this.axes.add(mk(new T.Vector3(1, 0, 0), 0xff4444, 'x'));
    this.axes.add(mk(new T.Vector3(0, 1, 0), 0x44ff44, 'y'));
    this.axes.add(mk(new T.Vector3(0, 0, 1), 0x4488ff, 'z'));
    this.axes.userData.devSkip = true;
    this.game.scene.add(this.axes);
    this.snapshot();
    this.game.ui.toast('🛠 ' + obj.name, 1.5);
  }
  deselect() {
    if (this.helper) { this.game.scene.remove(this.helper); this.helper = null; }
    if (this.axes) { this.game.scene.remove(this.axes); this.axes = null; }
    this.selected = null; this.dragging = false; this.axisDrag = null; this.orbiting = false;
  }

  startDrag(ndcV) {
    this.dragging = true;
    this.pushUndo();
    this.dragPlane.set(new this.T.Vector3(0, 1, 0), -this.selected.position.y);
    this.ray.setFromCamera(ndcV, this.game.camera);
    const pt = new this.T.Vector3();
    if (this.ray.ray.intersectPlane(this.dragPlane, pt)) this.dragOff.copy(this.selected.position).sub(pt);
    else this.dragOff.set(0, 0, 0);
    this._dragStart = this.selected.position.clone();
  }

  startOrbit() {
    const cam = this.game.camera;
    const target = this.selected ? this.selected.getWorldPosition(new this.T.Vector3()) : this.game.player.group.position.clone().setY(1.2);
    const off = cam.position.clone().sub(target);
    this.orbit.dist = Math.max(1, off.length());
    this.orbit.yaw = Math.atan2(off.x, off.z);
    this.orbit.pitch = Math.max(0.05, Math.min(1.45, Math.asin(off.y / this.orbit.dist)));
    this.orbit.target = target;
    this.orbiting = true;
  }

  // ---------- histórico ----------
  pushUndo() {
    const s = this.selected;
    if (!s) return;
    this.undoStack.push({ obj: s, before: { pos: s.position.clone(), rot: s.rotation.clone(), scale: s.scale.clone() } });
    if (this.undoStack.length > 100) this.undoStack.shift();
  }
  undo() {
    const u = this.undoStack.pop();
    if (!u) { this.game.ui.toast('🛠 nada p/ desfazer', 1.2); return; }
    if (!u.obj.parent) { this.game.ui.toast('🛠 objeto removido — sem undo', 1.2); return; }
    u.obj.position.copy(u.before.pos);
    u.obj.rotation.copy(u.before.rot);
    u.obj.scale.copy(u.before.scale);
    if (this.selected === u.obj) this.snapshot();
    this.game.ui.toast('↩ undo', 0.8);
  }

  // ---------- operações ----------
  duplicate() {
    const s = this.selected;
    if (!s) { this.game.ui.toast('selecione um objeto p/ duplicar', 1.2); return; }
    const c = s.clone(true);
    c.name = (s.name || 'obj') + '_copia';
    c.position.x += 0.5;
    (this.game.room.group).add(c);
    this.select(c);
    this.game.ui.toast('⧉ duplicado — ' + c.name, 1.2);
  }
  remove() {
    const s = this.selected;
    if (!s) return;
    this.pushUndo();
    this.undoStack[this.undoStack.length - 1].removed = true;
    if (s.parent) s.parent.remove(s);
    this.registry.delete(s);
    this.deselect();
    this.game.ui.toast('🗑 removido (Ctrl+Z desfaz transformação, não remoção)', 2);
  }
  addBox() {
    const T = this.T, p = this.game.player;
    const m = new T.Mesh(new T.BoxGeometry(1, 1, 1), new T.MeshLambertMaterial({ color: 0xb0b8c0 }));
    const fwd = new T.Vector3();
    this.game.camera.getWorldDirection(fwd); fwd.y = 0; fwd.normalize();
    m.position.set(p.x + fwd.x * 2.2, 0.5, p.z + fwd.z * 2.2);
    m.name = 'prim_' + (++this._primN);
    this.game.room.group.add(m);
    this.select(m);
    this.game.ui.toast('📦 caixa criada (' + m.name + ')', 1.2);
  }
  tpPlayer() {
    const s = this.selected, p = this.game.player;
    if (!s) return;
    p.group.position.set(s.position.x + 1.0, 0, s.position.z);
    this.game.selectCam(true);
    this.game.ui.toast('🚶 player teleportado', 1);
  }

  // ---------- snapshot / persistência ----------
  snapshot() {
    const s = this.selected;
    if (!s) return;
    this.registry.set(s, {
      name: s.name,
      pos: s.position.toArray().map((v) => +v.toFixed(3)),
      rot: [s.rotation.x, s.rotation.y, s.rotation.z].map((v) => +v.toFixed(3)),
      scale: s.scale.toArray().map((v) => +v.toFixed(3)),
    });
  }
  collect() {
    // tudo editado + toda primitiva (mesmo não-editada)
    const out = new Map();
    for (const [, snap] of this.registry) out.set(snap.name, snap);
    const roomG = this.game.room && this.game.room.group;
    if (roomG) roomG.traverse((o) => {
      if ((o.name || '').startsWith('prim_') && !out.has(o.name)) {
        out.set(o.name, {
          name: o.name,
          pos: o.position.toArray().map((v) => +v.toFixed(3)),
          rot: [o.rotation.x, o.rotation.y, o.rotation.z].map((v) => +v.toFixed(3)),
          scale: o.scale.toArray().map((v) => +v.toFixed(3)),
          prim: true,
        });
      }
    });
    return Array.from(out.values());
  }
  save() {
    try {
      const data = this.collect();
      localStorage.setItem(LAB_KEY, JSON.stringify(data));
      this.game.ui.toast('💾 layout salvo (' + data.length + ' objetos) — sobrevive ao F5', 2.5);
    } catch (e) { this.game.ui.toast('✗ falhou ao salvar', 2); }
  }
  load() {
    try {
      const raw = localStorage.getItem(LAB_KEY);
      if (!raw) { this.game.ui.toast('sem layout salvo ainda', 1.5); return; }
      const data = JSON.parse(raw);
      const roomG = this.game.room.group;
      let n = 0;
      for (const snap of data) {
        let o = roomG.getObjectByName(snap.name) || this.game.scene.getObjectByName(snap.name);
        if (!o && snap.prim) {
          o = new this.T.Mesh(new this.T.BoxGeometry(1, 1, 1), new this.T.MeshLambertMaterial({ color: 0xb0b8c0 }));
          o.name = snap.name;
          roomG.add(o);
        }
        if (!o) continue;
        o.position.fromArray(snap.pos);
        o.rotation.set(snap.rot[0], snap.rot[1], snap.rot[2]);
        o.scale.fromArray(snap.scale);
        n++;
      }
      this.game.ui.toast('📂 layout carregado (' + n + ' objetos)', 2.5);
    } catch (e) { this.game.ui.toast('✗ falhou ao carregar', 2); }
  }
  export() {
    const data = this.collect();
    const json = JSON.stringify(data, null, 2);
    console.log('%c[LAB] Objetos posicionados:', 'color:#0f0;font-weight:bold', json);
    this.lastExport = json;
    const ok = this.copyText(json);
    const n = data.length;
    this.game.ui.toast(ok
      ? '📋 ' + n + ' objeto(s) COPIADOS! (cola com Ctrl+V)'
      : '⚠ cópia bloqueada pelo navegador — abre o console (F12) e copia de lá (' + n + ' obj.)', 4);
    // painel de export: JSON na tela, selecionável/copiável à mão (área de
    // transferência do preview costuma ser bloqueada — garante acesso SEMPRE)
    let box = document.getElementById('labExport');
    if (!box) {
      box = document.createElement('textarea');
      box.id = 'labExport';
      box.spellcheck = false;
      box.style.cssText = 'position:fixed;right:10px;bottom:34px;width:340px;height:200px;z-index:999999;font:10px monospace;background:#001208;color:#7fff9f;border:1px solid #3a5;display:none;';
      document.body.appendChild(box);
    }
    box.value = json;
    box.style.display = 'block';
    box.focus(); box.select();
    setTimeout(() => { box.style.display = 'none'; }, 15000);
  }
  copyText(txt) {
    let ok = false;
    try { ok = document.execCommand && document.execCommand('copy'); } catch (e) { ok = false; }
    if (!ok && navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(txt).then(() => {}, () => {});
      return true; // promessa: tratamos como tentativa (toast informa fallback)
    }
    return ok;
  }

  // ---------- por frame ----------
  update(dt) {
    this.fps += (1 / Math.max(1e-4, dt) - this.fps) * 0.08;
    if (this.helper && this.selected) this.helper.box.setFromObject(this.selected);
    if (this.axes && this.selected) {
      this.axes.position.copy(this.selected.getWorldPosition(new this.T.Vector3()));
      const s = this.selected.scale;
      this.axes.scale.set(Math.max(0.2, Math.abs(s.x)), Math.max(0.2, Math.abs(s.y)), Math.max(0.2, Math.abs(s.z)));
    }
    // câmera orbital (por cima do selectCam do jogo, que já rodou neste frame)
    if (this.orbiting && this.orbit.target) {
      const { yaw, pitch, dist, target } = this.orbit;
      this.game.camera.position.set(
        target.x + Math.sin(yaw) * Math.cos(pitch) * dist,
        target.y + Math.sin(pitch) * dist,
        target.z + Math.cos(yaw) * Math.cos(pitch) * dist
      );
      this.game.camera.lookAt(target);
    }
    if (!this.visible) return;
    const g = this.game, p = g.player;
    let txt = '🛠 LAB — FPS ' + this.fps.toFixed(0) + ' · snap[G] ' + (this.snapOn ? 'ON' : 'off');
    if (p) txt += '\nplayer: (' + p.x.toFixed(2) + ', ' + p.z.toFixed(2) + ') ang ' + ((p.angle * 180 / Math.PI) % 360).toFixed(0) + '°';
    txt += '\n[N] caixa · [Ctrl+D] duplica · [Del] apaga · [Ctrl+Z] undo';
    txt += '\n[Ctrl+S] salva layout · [Ctrl+L] carrega · [K] JSON';
    txt += '\n[botão direito] orbita câmera · [roda] altura/zoom';
    if (this.selected) {
      const s = this.selected;
      txt += '\nSEL ' + s.name;
      txt += '\n  pos (' + s.position.x.toFixed(3) + ', ' + s.position.y.toFixed(3) + ', ' + s.position.z.toFixed(3) + ')';
      txt += '\n  rotY ' + ((s.rotation.y * 180 / Math.PI) % 360).toFixed(1) + '° · esc ' + s.scale.x.toFixed(2);
      txt += '\n[giro: Q/E yaw · T/G pitch · Y/H roll · Ctrl+tecla = fino 3°]';
      txt += '\n[WASD move · R/F altura · Z/X/C escala · gizmo por eixo · [P] teleporta aqui]';
    } else {
      txt += '\nclique num objeto p/ selecionar (caixa amarela + eixos RGB)';
    }
    this.el.textContent = txt;
  }
}

export function buildLab(game) {
  const T = game.THREE;
  if (game.room && game.room.group) game.scene.remove(game.room.group);
  game.scene.fog = null;

  const group = new T.Group();
  const plane = new T.Mesh(
    new T.PlaneGeometry(60, 60),
    new T.MeshBasicMaterial({ color: 0xefefef })
  );
  plane.rotation.x = -Math.PI / 2;
  plane.name = 'lab_plano';
  group.add(plane);
  const grid = new T.GridHelper(60, 60, 0x999999, 0xcccccc);
  grid.name = 'lab_grade';
  grid.userData.devSkip = true;
  group.add(grid);

  game.scene.add(group);
  game.scene.background && game.scene.background.setHex(0xf4f4f4);

  // luzes: camera enxerga camada 2 (armas) + todas as luzes globais iluminam
  // a camada das armas + lanterna POSICIONADA (o lab não roda loadRoom, que
  // é quem posiciona a lanterna no jogo real — sem isso a faca fica escura)
  game.camera.layers.enable(2);
  for (const l of [game.ambLight, game.hemiLight, game.dirLight, game.lantern]) {
    if (l && l.layers) l.layers.enable(2);
  }
  if (game.lantern) game.lantern.position.set(0, 1.7, 0);

  // ---------- MESA-VITRINE DAS ARMAS ----------
  const mesa = new T.Group();
  const tampo = new T.Mesh(new T.BoxGeometry(2.8, 0.08, 1.2), new T.MeshLambertMaterial({ color: 0x8a6a45 }));
  tampo.position.y = 0.9;
  tampo.name = 'mesa_tampo';
  mesa.add(tampo);
  const pernaG = new T.BoxGeometry(0.09, 0.9, 0.09);
  const pernaM = new T.MeshLambertMaterial({ color: 0x6e5334 });
  for (const [lx, lz] of [[-1.28, -0.48], [1.28, -0.48], [-1.28, 0.48], [1.28, 0.48]]) {
    const perna = new T.Mesh(pernaG, pernaM);
    perna.position.set(lx, 0.45, lz);
    perna.name = 'mesa_perna';
    mesa.add(perna);
  }
  mesa.position.set(0, 0, 2.6);
  mesa.name = 'mesa_vitrine';
  group.add(mesa);

  // Vitrine das 5 armas: modelo REAL quando existe no soup (hoje: faca);
  // clone do placeholder procedural nos demais (lote pendente).
  // MODO CALIBRAÇÃO (sequência do produtor): SOMENTE a arma da vez fica na
  // mesa, em destaque central. A lista é processada em ordem — quando aprovar
  // uma, eu a removo daqui e a próxima entra. (pedido: 'vou calibrar uma por uma')
  // RECALIBRAÇÃO (produtor): vitrine VAZIA — armas voltam uma a uma quando
  // os novos modelos forem aprovados (a faca atual saiu da mão também)
  const SLOTS = [
    // ['faca', 0.0, null],
    // ['pistola', -0.5, 'pistolM'],
    // ['revolver', 0.0, 'revolverM'],
    // ['bisturi', 0.5, 'scalpelM'],
    // ['chave', 1.0, 'wrenchM'],
  ];
  for (const [id, sx, procKey] of SLOTS) {
    let m = null;
    const data = WEAPON_MODELS[id];
    if (data && game.player.buildPropMesh) { try { m = game.player.buildPropMesh(data); } catch (e) { m = null; } }
    if (!m && procKey && game.player[procKey]) m = game.player[procKey].clone(true);
    if (!m) continue;
    m.visible = true;
    m.traverse && m.traverse((o) => { o.visible = true; if (o.isMesh) o.layers.set(2); });
    m.position.set(sx, 1.02, 2.6);
    if (id === 'pistola' || id === 'revolver') m.rotation.y = -1.5708;
    m.name = 'exibe_' + id;
    group.add(m);
  }

  game.room = {
    group, solids: [], cams: [], doors: [], pickups: [], interacts: [], spawns: [],
    lights: [], fx: null, ambient: 'lab', music: null,
    waterMesh: null, portal: null, portalLight: null, memorialGems: [], elevLight: null, rain: null,
    w: 60, d: 60, id: 'lab', name: 'LABORATÓRIO',
    npcs: [], totems: [],
  };
  game.enemies = []; game.npcs = []; game.totems = []; game.boss = null;

  game.player.place(0, 0, 0);
  game.player.group.visible = true;
  game.fadeVal = 0; game.fadeTarget = 0;
  game.state = 'play';
  game.camMode = 'chase';
  game.ui.crosshair(false);
  game.ui.showHud(true);
  game.selectCam(true);
  game.ui.toast('🛠 MODO LABORATÓRIO — botão direito orbita, N cria caixas, Ctrl+S salva', 4);
  game.editor = new DevEditor(game);
  try { window.__PLAYTEST = 1; } catch (e) {}
  return game.room;
}
