// ============================================================
// SANTA LÚCIA - Equipe Nakamura - Texturas procedurais (estética PS1)
// Todas as texturas são geradas em canvas, baixa resolução,
// filtro Nearest e cores quantizadas (15-bit) para o clima PS1.
// ============================================================

function cv(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return [c, c.getContext('2d')];
}
function rnd(a, b) { return a + Math.random() * (b - a); }
function ri(a, b) { return Math.floor(rnd(a, b + 1)); }

// granulado
function grain(x, w, h, n, alpha) {
  for (let i = 0; i < n; i++) {
    const v = Math.random() < 0.5 ? 0 : 255;
    x.fillStyle = `rgba(${v},${v},${v},${alpha * Math.random()})`;
    x.fillRect(ri(0, w - 1), ri(0, h - 1), 1, 1);
  }
}
// manchas escuras
function stains(x, w, h, n, col, rMin, rMax) {
  for (let i = 0; i < n; i++) {
    const r = rnd(rMin, rMax);
    const g = x.createRadialGradient(0, 0, 0, 0, 0, r);
    g.addColorStop(0, col);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    x.save();
    x.translate(rnd(0, w), rnd(0, h));
    x.fillStyle = g;
    x.fillRect(-r, -r, r * 2, r * 2);
    x.restore();
  }
}
// rachaduras
function cracks(x, w, h, n) {
  x.strokeStyle = 'rgba(10,8,6,0.7)';
  x.lineWidth = 1;
  for (let i = 0; i < n; i++) {
    let px = rnd(0, w), py = rnd(0, h);
    x.beginPath(); x.moveTo(px, py);
    for (let s = 0; s < 6; s++) { px += rnd(-9, 9); py += rnd(2, 10); x.lineTo(px, py); }
    x.stroke();
  }
}
// quantiza para 32 níveis por canal (15-bit PS1)
function poster15(x, w, h) {
  const img = x.getImageData(0, 0, w, h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    d[i] = Math.round(d[i] / 8) * 8;
    d[i + 1] = Math.round(d[i + 1] / 8) * 8;
    d[i + 2] = Math.round(d[i + 2] / 8) * 8;
  }
  x.putImageData(img, 0, 0);
}

export function buildTextures(THREE) {
  const T = {};
  const reg = (name, c, srgb = true) => {
    const t = new THREE.CanvasTexture(c);
    t.magFilter = THREE.NearestFilter;
    t.minFilter = THREE.NearestFilter;
    t.generateMipmaps = false;
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    T[name] = t;
  };

  // ---------- piso de madeira ----------
  {
    const [c, x] = cv(128, 128);
    x.fillStyle = '#4a3420'; x.fillRect(0, 0, 128, 128);
    for (let r = 0; r < 8; r++) {
      const y = r * 16;
      x.fillStyle = `rgb(${ri(58, 78)},${ri(40, 54)},${ri(24, 36)})`;
      x.fillRect(0, y, 128, 15);
      x.fillStyle = 'rgba(0,0,0,0.6)'; x.fillRect(0, y + 15, 128, 1);
      x.fillRect(((r * 53) % 128), y, 1, 15);
      for (let i = 0; i < 14; i++) {
        x.fillStyle = 'rgba(0,0,0,0.25)';
        x.fillRect(ri(0, 127), y + ri(0, 14), ri(3, 14), 1);
      }
    }
    stains(x, 128, 128, 5, 'rgba(0,0,0,0.35)', 8, 26);
    grain(x, 128, 128, 700, 0.16); poster15(x, 128, 128);
    reg('floorWood', c);
  }
  // ---------- piso quadriculado ----------
  {
    const [c, x] = cv(128, 128);
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
      const dark = (i + j) % 2 === 0;
      x.fillStyle = dark ? '#3d3a36' : '#8a8478';
      x.fillRect(i * 32, j * 32, 32, 32);
      x.fillStyle = 'rgba(0,0,0,0.35)';
      x.fillRect(i * 32, j * 32 + 31, 32, 1); x.fillRect(i * 32 + 31, j * 32, 1, 32);
    }
    stains(x, 128, 128, 7, 'rgba(20,10,5,0.4)', 6, 24);
    grain(x, 128, 128, 800, 0.2); poster15(x, 128, 128);
    reg('floorTile', c);
  }
  // ---------- carpete vermelho ----------
  {
    const [c, x] = cv(64, 64);
    x.fillStyle = '#5e1f22'; x.fillRect(0, 0, 64, 64);
    grain(x, 64, 64, 900, 0.25);
    stains(x, 64, 64, 4, 'rgba(0,0,0,0.45)', 5, 16);
    poster15(x, 64, 64);
    reg('carpet', c);
  }
  // ---------- tapete ornamentado ----------
  {
    const [c, x] = cv(128, 128);
    x.fillStyle = '#571d20'; x.fillRect(0, 0, 128, 128);
    x.strokeStyle = '#a8874f'; x.lineWidth = 3; x.strokeRect(6, 6, 116, 116);
    x.strokeStyle = '#7a5f33'; x.lineWidth = 1; x.strokeRect(12, 12, 104, 104);
    x.save(); x.translate(64, 64); x.rotate(Math.PI / 4);
    x.strokeStyle = '#a8874f'; x.lineWidth = 2; x.strokeRect(-30, -30, 60, 60);
    x.restore();
    x.fillStyle = '#7a2a2e';
    for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) {
      if ((i + j) % 2 === 0) x.fillRect(16 + i * 12, 16 + j * 12, 4, 4);
    }
    stains(x, 128, 128, 4, 'rgba(0,0,0,0.4)', 10, 30);
    grain(x, 128, 128, 900, 0.2); poster15(x, 128, 128);
    reg('rug', c);
  }
  // ---------- papel de parede ----------
  {
    const [c, x] = cv(128, 128);
    x.fillStyle = '#4c5240'; x.fillRect(0, 0, 128, 128);
    x.fillStyle = '#5d6350';
    for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) {
      const px = i * 16 + (j % 2 ? 8 : 0), py = j * 16;
      x.fillRect(px + 6, py + 2, 4, 12); x.fillRect(px + 2, py + 6, 12, 4);
    }
    const g = x.createLinearGradient(0, 60, 0, 128);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(10,8,4,0.55)');
    x.fillStyle = g; x.fillRect(0, 0, 128, 128);
    stains(x, 128, 128, 5, 'rgba(30,25,10,0.35)', 8, 30);
    cracks(x, 128, 128, 2);
    grain(x, 128, 128, 700, 0.18); poster15(x, 128, 128);
    reg('wallpaper', c);
  }
  // ---------- parede suja ----------
  {
    const [c, x] = cv(128, 128);
    x.fillStyle = '#5a5a52'; x.fillRect(0, 0, 128, 128);
    x.fillStyle = '#4e5a52'; x.fillRect(0, 84, 128, 44);
    x.fillStyle = 'rgba(0,0,0,0.5)'; x.fillRect(0, 82, 128, 2);
    stains(x, 128, 128, 8, 'rgba(15,12,8,0.4)', 6, 26);
    cracks(x, 128, 128, 3);
    grain(x, 128, 128, 900, 0.2); poster15(x, 128, 128);
    reg('wallDirty', c);
  }
  // ---------- parede azulejo ----------
  {
    const [c, x] = cv(128, 128);
    for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) {
      x.fillStyle = `rgb(${ri(120, 140)},${ri(135, 155)},${ri(130, 150)})`;
      x.fillRect(i * 16, j * 16, 16, 16);
      x.fillStyle = 'rgba(0,0,0,0.4)';
      x.fillRect(i * 16, j * 16 + 15, 16, 1); x.fillRect(i * 16 + 15, j * 16, 1, 16);
    }
    const g = x.createLinearGradient(0, 70, 0, 128);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(20,15,5,0.5)');
    x.fillStyle = g; x.fillRect(0, 0, 128, 128);
    stains(x, 128, 128, 5, 'rgba(60,20,10,0.3)', 4, 14);
    grain(x, 128, 128, 600, 0.18); poster15(x, 128, 128);
    reg('wallTile', c);
  }
  // ---------- parede pedra (porão) ----------
  {
    const [c, x] = cv(128, 128);
    x.fillStyle = '#3a3a3c'; x.fillRect(0, 0, 128, 128);
    for (let r = 0; r < 8; r++) {
      const off = (r % 2) * 16;
      for (let i = -1; i < 5; i++) {
        x.fillStyle = `rgb(${ri(48, 66)},${ri(48, 66)},${ri(50, 70)})`;
        x.fillRect(i * 32 + off, r * 16, 31, 15);
      }
    }
    stains(x, 128, 128, 8, 'rgba(0,0,0,0.5)', 8, 30);
    stains(x, 128, 128, 4, 'rgba(20,40,25,0.4)', 5, 18);
    grain(x, 128, 128, 900, 0.22); poster15(x, 128, 128);
    reg('wallStone', c);
  }
  // ---------- teto ----------
  {
    const [c, x] = cv(64, 64);
    x.fillStyle = '#6a675e'; x.fillRect(0, 0, 64, 64);
    x.fillStyle = 'rgba(0,0,0,0.4)'; x.fillRect(0, 0, 64, 1); x.fillRect(0, 0, 1, 64);
    stains(x, 64, 64, 3, 'rgba(40,30,10,0.45)', 5, 18);
    grain(x, 64, 64, 300, 0.2); poster15(x, 64, 64);
    reg('ceiling', c);
  }
  // ---------- madeira tábuas ----------
  {
    const [c, x] = cv(64, 64);
    x.fillStyle = '#4c3620'; x.fillRect(0, 0, 64, 64);
    for (let i = 0; i < 4; i++) {
      x.fillStyle = `rgb(${ri(60, 86)},${ri(42, 60)},${ri(24, 38)})`;
      x.fillRect(i * 16, 0, 15, 64);
      x.fillStyle = 'rgba(0,0,0,0.6)'; x.fillRect(i * 16 + 15, 0, 1, 64);
      for (let k = 0; k < 8; k++) {
        x.fillStyle = 'rgba(0,0,0,0.25)';
        x.fillRect(i * 16 + ri(0, 14), ri(0, 63), 1, ri(3, 10));
      }
    }
    grain(x, 64, 64, 300, 0.2); poster15(x, 64, 64);
    reg('wood', c);
  }
  // ---------- metal ----------
  {
    const [c, x] = cv(64, 64);
    x.fillStyle = '#5c6066'; x.fillRect(0, 0, 64, 64);
    for (let i = 0; i < 20; i++) {
      x.fillStyle = `rgba(255,255,255,${rnd(0.02, 0.09)})`;
      x.fillRect(0, ri(0, 63), 64, 1);
    }
    stains(x, 64, 64, 4, 'rgba(60,30,10,0.5)', 4, 14);
    x.fillStyle = '#3a3d42';
    [[4, 4], [56, 4], [4, 56], [56, 56]].forEach(([px, py]) => { x.fillRect(px, py, 4, 4); });
    grain(x, 64, 64, 300, 0.2); poster15(x, 64, 64);
    reg('metal', c);
  }
  // ---------- metal enferrujado ----------
  {
    const [c, x] = cv(64, 64);
    x.fillStyle = '#5a3a22'; x.fillRect(0, 0, 64, 64);
    for (let i = 0; i < 40; i++) {
      x.fillStyle = `rgba(${ri(90, 140)},${ri(40, 70)},${ri(15, 30)},0.5)`;
      x.fillRect(ri(0, 60), ri(0, 63), ri(2, 8), ri(2, 20));
    }
    stains(x, 64, 64, 5, 'rgba(0,0,0,0.5)', 4, 16);
    grain(x, 64, 64, 400, 0.25); poster15(x, 64, 64);
    reg('rust', c);
  }
  // ---------- porta madeira ----------
  {
    const [c, x] = cv(64, 96);
    x.fillStyle = '#3e2c1a'; x.fillRect(0, 0, 64, 96);
    x.strokeStyle = '#241809'; x.lineWidth = 3;
    x.strokeRect(8, 8, 48, 34); x.strokeRect(8, 52, 48, 36);
    x.strokeStyle = '#5e442a'; x.lineWidth = 1;
    x.strokeRect(11, 11, 42, 28); x.strokeRect(11, 55, 42, 30);
    x.fillStyle = '#a8874f'; x.fillRect(50, 48, 5, 5);
    stains(x, 64, 96, 3, 'rgba(0,0,0,0.4)', 5, 18);
    grain(x, 64, 96, 400, 0.2); poster15(x, 64, 96);
    reg('doorWood', c);
  }
  // ---------- porta metal ----------
  {
    const [c, x] = cv(64, 96);
    x.fillStyle = '#4a4e55'; x.fillRect(0, 0, 64, 96);
    x.fillStyle = '#33363c';
    for (let i = 0; i < 6; i++) x.fillRect(6, 6 + i * 15, 52, 3);
    x.fillStyle = '#22242a'; x.fillRect(0, 46, 64, 4);
    x.fillStyle = '#8a8f96'; x.fillRect(52, 48, 6, 10);
    stains(x, 64, 96, 4, 'rgba(60,30,10,0.45)', 5, 16);
    grain(x, 64, 96, 400, 0.2); poster15(x, 64, 96);
    reg('doorMetal', c);
  }
  // ---------- céu noturno ----------
  {
    const [c, x] = cv(256, 128);
    const g = x.createLinearGradient(0, 0, 0, 128);
    g.addColorStop(0, '#05060f'); g.addColorStop(0.6, '#0b1026'); g.addColorStop(1, '#1a2038');
    x.fillStyle = g; x.fillRect(0, 0, 256, 128);
    for (let i = 0; i < 120; i++) {
      x.fillStyle = `rgba(255,255,255,${rnd(0.2, 0.9)})`;
      x.fillRect(ri(0, 255), ri(0, 100), 1, 1);
    }
    // lua
    x.fillStyle = '#e8ecda'; x.beginPath(); x.arc(200, 30, 14, 0, 7); x.fill();
    x.fillStyle = '#c8ccba'; x.beginPath(); x.arc(195, 26, 3, 0, 7); x.fill();
    x.beginPath(); x.arc(204, 34, 2, 0, 7); x.fill();
    // silhueta cidade
    x.fillStyle = '#04050c';
    let bx = 0;
    while (bx < 256) { const bw = ri(10, 30), bh = ri(10, 34); x.fillRect(bx, 128 - bh, bw, bh); bx += bw + ri(0, 6); }
    x.fillStyle = 'rgba(255,200,100,0.8)';
    for (let i = 0; i < 40; i++) x.fillRect(ri(0, 255), ri(100, 126), 1, 1);
    poster15(x, 256, 128);
    reg('sky', c);
  }
  // ---------- janela acesa ----------
  {
    const [c, x] = cv(64, 96);
    x.fillStyle = '#2a2018'; x.fillRect(0, 0, 64, 96);
    const g = x.createLinearGradient(0, 0, 0, 96);
    g.addColorStop(0, '#8fa3c8'); g.addColorStop(1, '#4a5a80');
    x.fillStyle = g; x.fillRect(6, 6, 52, 84);
    x.fillStyle = '#cdd8ee'; x.beginPath(); x.arc(44, 22, 9, 0, 7); x.fill();
    x.fillStyle = '#2a2018';
    x.fillRect(30, 6, 4, 84); x.fillRect(6, 46, 52, 4);
    x.fillRect(6, 6, 52, 3); x.fillRect(6, 87, 52, 3);
    // chuva na janela
    x.fillStyle = 'rgba(255,255,255,0.35)';
    for (let i = 0; i < 30; i++) x.fillRect(ri(8, 56), ri(8, 86), 1, 3);
    poster15(x, 64, 96);
    reg('window', c);
  }
  // ---------- cortina ----------
  {
    const [c, x] = cv(64, 64);
    for (let i = 0; i < 16; i++) {
      x.fillStyle = i % 2 ? '#3d2a35' : '#54404b';
      x.fillRect(i * 4, 0, 4, 64);
    }
    stains(x, 64, 64, 3, 'rgba(0,0,0,0.4)', 5, 16);
    grain(x, 64, 64, 300, 0.2); poster15(x, 64, 64);
    reg('curtain', c);
  }
  // ---------- lençol ----------
  {
    const [c, x] = cv(64, 64);
    x.fillStyle = '#9a958a'; x.fillRect(0, 0, 64, 64);
    for (let i = 0; i < 12; i++) {
      x.fillStyle = 'rgba(0,0,0,0.18)';
      x.fillRect(ri(0, 63), 0, 1, 64);
    }
    stains(x, 64, 64, 4, 'rgba(70,50,30,0.35)', 4, 14);
    grain(x, 64, 64, 300, 0.18); poster15(x, 64, 64);
    reg('sheet', c);
  }
  // ---------- cobertor ----------
  {
    const [c, x] = cv(64, 64);
    x.fillStyle = '#4a4a58'; x.fillRect(0, 0, 64, 64);
    x.fillStyle = '#5c3a3a';
    for (let i = 0; i < 8; i++) { x.fillRect(i * 8, 0, 2, 64); x.fillRect(0, i * 8, 64, 2); }
    stains(x, 64, 64, 3, 'rgba(0,0,0,0.4)', 5, 16);
    grain(x, 64, 64, 300, 0.2); poster15(x, 64, 64);
    reg('blanket', c);
  }
  // ---------- colchão ----------
  {
    const [c, x] = cv(64, 32);
    x.fillStyle = '#8a8578'; x.fillRect(0, 0, 64, 32);
    x.fillStyle = '#7a7568';
    for (let i = 0; i < 8; i++) x.fillRect(i * 8, 0, 2, 32);
    stains(x, 64, 32, 4, 'rgba(60,40,20,0.45)', 3, 10);
    grain(x, 64, 32, 200, 0.2); poster15(x, 64, 32);
    reg('mattress', c);
  }
  // ---------- quadros ----------
  const paint = (name, fn) => { const [c, x] = cv(64, 80); fn(x); x.strokeStyle = '#6a5228'; x.lineWidth = 5; x.strokeRect(0, 0, 64, 80); grain(x, 64, 80, 250, 0.2); poster15(x, 64, 80); reg(name, c); };
  paint('paint1', (x) => { // retrato sombrio
    x.fillStyle = '#1c1a20'; x.fillRect(0, 0, 64, 80);
    x.fillStyle = '#8a7a62'; x.fillRect(24, 20, 16, 22);
    x.fillStyle = '#0a0a0c'; x.fillRect(27, 27, 4, 4); x.fillRect(35, 27, 4, 4);
    x.fillRect(20, 10, 24, 12); x.fillRect(14, 42, 36, 30);
    x.fillStyle = '#5a4a3a'; x.fillRect(14, 42, 36, 6);
  });
  paint('paint2', (x) => { // paisagem com lago
    const g = x.createLinearGradient(0, 0, 0, 80);
    g.addColorStop(0, '#2a3448'); g.addColorStop(0.55, '#4a5a70'); g.addColorStop(0.56, '#1a2636'); g.addColorStop(1, '#0c1420');
    x.fillStyle = g; x.fillRect(0, 0, 64, 80);
    x.fillStyle = '#d8dce8'; x.beginPath(); x.arc(46, 16, 6, 0, 7); x.fill();
    x.fillStyle = '#0a0e14'; x.fillRect(0, 40, 64, 5);
  });
  paint('paint3', (x) => { // criança com urso (borrado)
    x.fillStyle = '#3a3038'; x.fillRect(0, 0, 64, 80);
    x.fillStyle = '#7a5c48'; x.fillRect(26, 26, 12, 16);
    x.fillStyle = '#2a1c14'; x.fillRect(24, 20, 16, 8);
    x.fillStyle = '#5a4028'; x.fillRect(14, 44, 12, 14); x.fillRect(40, 44, 10, 12);
    x.fillStyle = '#8a2a2a'; x.fillRect(22, 42, 20, 26);
  });
  // ---------- estante ----------
  {
    const [c, x] = cv(128, 96);
    x.fillStyle = '#33241a'; x.fillRect(0, 0, 128, 96);
    for (let s = 0; s < 3; s++) {
      const y = s * 32;
      let px = 4;
      while (px < 120) {
        const bw = ri(5, 10), bh = ri(20, 26);
        x.fillStyle = `rgb(${ri(60, 130)},${ri(30, 70)},${ri(25, 60)})`;
        x.fillRect(px, y + 30 - bh, bw, bh);
        x.fillStyle = 'rgba(255,220,150,0.5)';
        x.fillRect(px + 1, y + 32 - bh, bw - 2, 2);
        px += bw + 1;
      }
      x.fillStyle = '#1c130c'; x.fillRect(0, y + 30, 128, 2);
    }
    grain(x, 128, 96, 400, 0.22); poster15(x, 128, 96);
    reg('bookcase', c);
  }
  // ---------- relógio ----------
  {
    const [c, x] = cv(48, 48);
    x.fillStyle = '#d8d2c2'; x.beginPath(); x.arc(24, 24, 21, 0, 7); x.fill();
    x.strokeStyle = '#2a2018'; x.lineWidth = 3; x.beginPath(); x.arc(24, 24, 21, 0, 7); x.stroke();
    x.fillStyle = '#2a2018';
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      x.fillRect(24 + Math.cos(a) * 17 - 1, 24 + Math.sin(a) * 17 - 1, 2, 2);
    }
    // ponteiros parados 3:07
    x.strokeStyle = '#1a1a1a'; x.lineWidth = 2;
    x.beginPath(); x.moveTo(24, 24); x.lineTo(36, 26); x.stroke();
    x.beginPath(); x.moveTo(24, 24); x.lineTo(28, 12); x.stroke();
    poster15(x, 48, 48);
    reg('clock', c);
  }
  // ---------- cofre ----------
  {
    const [c, x] = cv(64, 64);
    x.fillStyle = '#2e3238'; x.fillRect(0, 0, 64, 64);
    x.strokeStyle = '#15171b'; x.lineWidth = 3; x.strokeRect(4, 4, 56, 56);
    x.fillStyle = '#4a4f57'; x.beginPath(); x.arc(32, 30, 12, 0, 7); x.fill();
    x.strokeStyle = '#15171b'; x.lineWidth = 2; x.beginPath(); x.arc(32, 30, 12, 0, 7); x.stroke();
    x.beginPath(); x.moveTo(32, 30); x.lineTo(40, 24); x.stroke();
    x.fillStyle = '#6a6f78'; x.fillRect(46, 40, 8, 14); x.fillRect(42, 44, 16, 4);
    grain(x, 64, 64, 250, 0.2); poster15(x, 64, 64);
    reg('safe', c);
  }
  // ---------- quadro de força ----------
  {
    const [c, x] = cv(48, 64);
    x.fillStyle = '#3c4046'; x.fillRect(0, 0, 48, 64);
    x.fillStyle = '#181a1e'; x.fillRect(8, 8, 32, 48);
    x.fillStyle = '#c8a028';
    x.fillRect(12, 12, 6, 10); x.fillRect(22, 12, 6, 10);
    x.fillStyle = '#222'; x.fillRect(32, 12, 6, 10);
    x.fillStyle = '#781818'; x.beginPath(); x.arc(24, 44, 5, 0, 7); x.fill();
    x.fillStyle = '#e8d8a0';
    x.font = '7px monospace'; x.fillText('ALTA', 12, 32); x.fillText('TENSAO', 8, 40);
    grain(x, 48, 64, 200, 0.2); poster15(x, 48, 64);
    reg('fusebox', c);
  }
  // ---------- caldeira ----------
  {
    const [c, x] = cv(96, 96);
    x.fillStyle = '#3a2e26'; x.fillRect(0, 0, 96, 96);
    for (let r = 0; r < 6; r++) {
      x.fillStyle = 'rgba(0,0,0,0.5)'; x.fillRect(0, r * 16 + 15, 96, 1);
      x.fillStyle = '#57504a';
      for (let i = 0; i < 8; i++) x.fillRect(i * 12 + 4, r * 16 + 2, 3, 3);
    }
    // fornalha acesa
    const g = x.createRadialGradient(48, 66, 2, 48, 66, 20);
    g.addColorStop(0, '#ffb03a'); g.addColorStop(0.5, '#c85a1a'); g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = '#0a0a0a'; x.fillRect(34, 54, 28, 24);
    x.fillStyle = g; x.fillRect(28, 46, 40, 40);
    x.fillStyle = '#181410'; x.fillRect(34, 54, 4, 24); x.fillRect(58, 54, 4, 24);
    // manômetro
    x.fillStyle = '#d8d2c2'; x.beginPath(); x.arc(48, 22, 9, 0, 7); x.fill();
    x.strokeStyle = '#8a1a1a'; x.lineWidth = 2;
    x.beginPath(); x.moveTo(48, 22); x.lineTo(53, 16); x.stroke();
    stains(x, 96, 96, 4, 'rgba(0,0,0,0.5)', 6, 20);
    grain(x, 96, 96, 400, 0.22); poster15(x, 96, 96);
    reg('boiler', c);
  }
  // ---------- cano ----------
  {
    const [c, x] = cv(32, 64);
    x.fillStyle = '#5a4030'; x.fillRect(0, 0, 32, 64);
    x.fillStyle = '#7a5840'; x.fillRect(8, 0, 8, 64);
    x.fillStyle = 'rgba(0,0,0,0.5)'; x.fillRect(0, 0, 4, 64); x.fillRect(28, 0, 4, 64);
    x.fillStyle = '#2a1c12'; x.fillRect(0, 10, 32, 3); x.fillRect(0, 40, 32, 3);
    grain(x, 32, 64, 200, 0.22); poster15(x, 32, 64);
    reg('pipe', c);
  }
  // ---------- água ----------
  {
    const [c, x] = cv(64, 64);
    x.fillStyle = '#0e2230'; x.fillRect(0, 0, 64, 64);
    x.strokeStyle = 'rgba(120,180,200,0.35)'; x.lineWidth = 1;
    for (let i = 0; i < 10; i++) {
      x.beginPath();
      const y = i * 7 + ri(0, 4);
      x.moveTo(0, y);
      for (let px = 0; px <= 64; px += 8) x.lineTo(px, y + Math.sin(px / 6 + i) * 2);
      x.stroke();
    }
    poster15(x, 64, 64);
    reg('water', c);
  }
  // ---------- piso pedra / concreto ----------
  {
    const [c, x] = cv(128, 128);
    x.fillStyle = '#4e4e50'; x.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
      x.fillStyle = `rgb(${ri(70, 88)},${ri(70, 88)},${ri(72, 90)})`;
      x.fillRect(i * 64 + 1, j * 64 + 1, 62, 62);
    }
    x.fillStyle = 'rgba(0,0,0,0.5)';
    x.fillRect(63, 0, 2, 128); x.fillRect(0, 63, 128, 2);
    stains(x, 128, 128, 8, 'rgba(0,0,0,0.45)', 6, 26);
    cracks(x, 128, 128, 2);
    grain(x, 128, 128, 800, 0.2); poster15(x, 128, 128);
    reg('stoneFloor', c);
  }
  // ---------- altar ----------
  {
    const [c, x] = cv(96, 96);
    x.fillStyle = '#3c3c40'; x.fillRect(0, 0, 96, 96);
    x.strokeStyle = '#191a1e'; x.lineWidth = 2;
    x.beginPath(); x.arc(48, 48, 30, 0, 7); x.stroke();
    x.beginPath(); x.arc(48, 48, 22, 0, 7); x.stroke();
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      x.fillStyle = '#101114';
      x.beginPath();
      x.ellipse(48 + Math.cos(a) * 26, 48 + Math.sin(a) * 26, 4, 6, a, 0, 7);
      x.fill();
    }
    stains(x, 96, 96, 4, 'rgba(0,0,0,0.5)', 6, 20);
    grain(x, 96, 96, 400, 0.2); poster15(x, 96, 96);
    reg('altar', c);
  }
  // ---------- cerca (chain-link, com alpha) ----------
  {
    const [c, x] = cv(64, 64);
    x.clearRect(0, 0, 64, 64);
    x.strokeStyle = 'rgba(140,145,150,0.9)'; x.lineWidth = 1;
    for (let i = -64; i < 128; i += 8) {
      x.beginPath(); x.moveTo(i, 0); x.lineTo(i + 64, 64); x.stroke();
      x.beginPath(); x.moveTo(i + 64, 0); x.lineTo(i, 64); x.stroke();
    }
    const t = new THREE.CanvasTexture(c);
    t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter;
    t.generateMipmaps = false;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    T.fence = t;
  }
  // ---------- sangue (decalque, com alpha) ----------
  {
    const [c, x] = cv(64, 64);
    x.clearRect(0, 0, 64, 64);
    for (let i = 0; i < 3; i++) {
      const px = rnd(15, 49), py = rnd(15, 49), r = rnd(8, 16);
      const g = x.createRadialGradient(px, py, 0, px, py, r);
      g.addColorStop(0, 'rgba(110,10,12,0.85)');
      g.addColorStop(0.7, 'rgba(80,8,10,0.7)');
      g.addColorStop(1, 'rgba(60,5,8,0)');
      x.fillStyle = g;
      x.beginPath(); x.arc(px, py, r, 0, 7); x.fill();
    }
    for (let i = 0; i < 12; i++) {
      x.fillStyle = 'rgba(90,8,10,0.8)';
      x.fillRect(ri(0, 63), ri(0, 63), ri(1, 3), ri(1, 3));
    }
    const t = new THREE.CanvasTexture(c);
    t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter;
    t.generateMipmaps = false;
    T.blood = t;
  }
  // ---------- papel / página ----------
  {
    const [c, x] = cv(32, 42);
    x.fillStyle = '#c8c0ac'; x.fillRect(0, 0, 32, 42);
    x.fillStyle = 'rgba(40,30,20,0.6)';
    for (let i = 0; i < 9; i++) x.fillRect(4, 6 + i * 4, 24 - (i % 3) * 4, 1);
    stains(x, 32, 42, 2, 'rgba(80,60,20,0.3)', 3, 10);
    poster15(x, 32, 42);
    reg('paper', c);
  }
  // ---------- capa do diário ----------
  {
    const [c, x] = cv(48, 64);
    x.fillStyle = '#3a1e22'; x.fillRect(0, 0, 48, 64);
    x.strokeStyle = '#8a6f3f'; x.lineWidth = 2; x.strokeRect(5, 5, 38, 54);
    x.fillStyle = '#8a6f3f'; x.font = '9px serif'; x.fillText('DIÁRIO', 8, 34);
    stains(x, 48, 64, 2, 'rgba(0,0,0,0.4)', 4, 12);
    grain(x, 48, 64, 200, 0.2); poster15(x, 48, 64);
    reg('diaryCover', c);
  }
  // ---------- estátua (mármore) ----------
  {
    const [c, x] = cv(64, 64);
    x.fillStyle = '#8e8c86'; x.fillRect(0, 0, 64, 64);
    x.strokeStyle = 'rgba(60,58,55,0.5)';
    for (let i = 0; i < 8; i++) {
      x.beginPath(); x.moveTo(ri(0, 64), 0);
      x.bezierCurveTo(ri(0, 64), 20, ri(0, 64), 40, ri(0, 64), 64);
      x.stroke();
    }
    stains(x, 64, 64, 4, 'rgba(30,35,25,0.4)', 5, 16);
    grain(x, 64, 64, 300, 0.2); poster15(x, 64, 64);
    reg('statue', c);
  }
  // ---------- vaso ----------
  {
    const [c, x] = cv(32, 48);
    x.fillStyle = '#7a8a96'; x.fillRect(0, 0, 32, 48);
    x.fillStyle = '#3a4a5a';
    x.fillRect(0, 6, 32, 3); x.fillRect(0, 38, 32, 3);
    x.fillRect(14, 10, 4, 26);
    stains(x, 32, 48, 2, 'rgba(0,0,0,0.35)', 3, 10);
    poster15(x, 32, 48);
    reg('vase', c);
  }
  // ---------- armário metal ----------
  {
    const [c, x] = cv(64, 96);
    x.fillStyle = '#6a7076'; x.fillRect(0, 0, 64, 96);
    x.fillStyle = '#4a4f55'; x.fillRect(30, 0, 4, 96);
    x.fillStyle = '#3a3d42'; x.fillRect(26, 44, 4, 10); x.fillRect(34, 44, 4, 10);
    x.fillStyle = 'rgba(255,255,255,0.12)'; x.fillRect(4, 0, 8, 96);
    stains(x, 64, 96, 4, 'rgba(60,30,10,0.4)', 4, 14);
    x.fillStyle = '#a02828'; x.font = '8px monospace'; x.fillText('+', 6, 14);
    grain(x, 64, 96, 300, 0.2); poster15(x, 64, 96);
    reg('cabinet', c);
  }
  // ---------- rosto do Daniel (para modelo 3D) ----------
  {
    const [c, x] = cv(32, 32);
    x.fillStyle = '#c8a080'; x.fillRect(0, 0, 32, 32);
    x.fillStyle = '#2a1a12'; x.fillRect(0, 0, 32, 8);
    x.fillRect(0, 0, 5, 32); x.fillRect(27, 0, 5, 32);
    // olhos cansados
    x.fillStyle = '#1a1210'; x.fillRect(8, 14, 4, 3); x.fillRect(20, 14, 4, 3);
    x.fillStyle = 'rgba(90,60,60,0.6)'; x.fillRect(7, 17, 6, 2); x.fillRect(19, 17, 6, 2);
    // boca
    x.fillStyle = '#6a4038'; x.fillRect(13, 24, 6, 1);
    poster15(x, 32, 32);
    reg('faceDaniel', c);
  }
  // ---------- sprites: olho / brilho / tiro ----------
  const glow = (name, inner, outer) => {
    const [c, x] = cv(32, 32);
    const g = x.createRadialGradient(16, 16, 0, 16, 16, 16);
    g.addColorStop(0, inner); g.addColorStop(0.4, outer); g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g; x.fillRect(0, 0, 32, 32);
    const t = new THREE.CanvasTexture(c);
    T[name] = t;
  };
  glow('eye', 'rgba(255,255,255,1)', 'rgba(255,240,200,0.5)');
  glow('glowCyan', 'rgba(180,255,255,1)', 'rgba(60,200,220,0.4)');
  glow('glowWarm', 'rgba(255,230,180,1)', 'rgba(255,150,60,0.35)');
  glow('blob', 'rgba(255,255,255,1)', 'rgba(255,255,255,0.25)');
  {
    const [c, x] = cv(32, 32);
    x.clearRect(0, 0, 32, 32);
    x.fillStyle = 'rgba(255,220,120,1)';
    x.fillRect(14, 2, 4, 28); x.fillRect(2, 14, 28, 4);
    x.fillStyle = 'rgba(255,140,40,0.9)';
    x.save(); x.translate(16, 16); x.rotate(Math.PI / 4);
    x.fillRect(-2, -13, 4, 26); x.fillRect(-13, -2, 26, 4);
    x.restore();
    x.fillStyle = '#fff'; x.beginPath(); x.arc(16, 16, 5, 0, 7); x.fill();
    const t = new THREE.CanvasTexture(c);
    T.muzzle = t;
  }
  // ---------- gota de chuva ----------
  {
    const [c, x] = cv(8, 16);
    x.clearRect(0, 0, 8, 16);
    x.fillStyle = 'rgba(170,200,230,0.8)';
    x.fillRect(3, 0, 2, 16);
    const t = new THREE.CanvasTexture(c);
    T.rain = t;
  }
  // ---------- pelo do urso ----------
  {
    const [c, x] = cv(32, 32);
    x.fillStyle = '#6a4a28'; x.fillRect(0, 0, 32, 32);
    grain(x, 32, 32, 400, 0.3);
    stains(x, 32, 32, 2, 'rgba(0,0,0,0.4)', 3, 10);
    poster15(x, 32, 32);
    reg('teddy', c);
  }

  // ---------- CHÃO DA FLORESTA / JARDIM ----------
  {
    const [c, x] = cv(128, 128);
    x.fillStyle = '#221c16'; x.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 200; i++) {
      const g = ri(28, 52);
      x.fillStyle = `rgb(${ri(26, 44)},${g},${ri(20, 35)})`;
      x.fillRect(ri(0, 127), ri(0, 127), ri(2, 6), ri(2, 5));
    }
    // folhas secas caídas
    for (let i = 0; i < 40; i++) {
      x.fillStyle = Math.random() < 0.5 ? '#5a3418' : '#384422';
      x.fillRect(ri(0, 126), ri(0, 126), 3, 2);
    }
    grain(x, 128, 128, 600, 0.2);
    poster15(x, 128, 128);
    reg('forestGround', c);
  }

  // ---------- TRONCO DE ÁRVORE (CASCA) ----------
  {
    const [c, x] = cv(64, 128);
    x.fillStyle = '#2c221a'; x.fillRect(0, 0, 64, 128);
    for (let i = 0; i < 50; i++) {
      x.fillStyle = `rgb(${ri(28, 48)},${ri(20, 36)},${ri(14, 28)})`;
      x.fillRect(ri(0, 62), 0, ri(1, 3), 128);
    }
    stains(x, 64, 128, 8, 'rgba(10,20,10,0.45)', 4, 14);
    grain(x, 64, 128, 500, 0.25);
    poster15(x, 64, 128);
    reg('bark', c);
  }

  // ---------- FOLHAS DE PINHEIRO / ÁRVORE ----------
  {
    const [c, x] = cv(64, 64);
    x.fillStyle = '#182414'; x.fillRect(0, 0, 64, 64);
    for (let i = 0; i < 180; i++) {
      x.fillStyle = Math.random() < 0.5 ? '#243b1e' : '#142210';
      x.fillRect(ri(0, 62), ri(0, 62), ri(2, 5), ri(2, 5));
    }
    grain(x, 64, 64, 300, 0.25);
    poster15(x, 64, 64);
    reg('leaves', c);
  }

  // ---------- GRADE DE FERRO GÓTICO ----------
  {
    const [c, x] = cv(64, 64);
    x.clearRect(0, 0, 64, 64);
    x.fillStyle = '#1c1f24';
    x.fillRect(0, 0, 64, 4);
    x.fillRect(0, 60, 64, 4);
    for (let i = 4; i < 64; i += 12) {
      x.fillRect(i, 0, 4, 64);
      // ponta de lança
      x.fillRect(i - 1, 2, 6, 3);
      x.fillRect(i, 0, 4, 2);
    }
    grain(x, 64, 64, 120, 0.3);
    const t = new THREE.CanvasTexture(c);
    t.magFilter = THREE.NearestFilter;
    t.minFilter = THREE.NearestFilter;
    t.generateMipmaps = false;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    T.ironGate = t;
  }

  // ---------- LÁPIDE DE CEMITÉRIO ----------
  {
    const [c, x] = cv(64, 64);
    x.fillStyle = '#484c50'; x.fillRect(0, 0, 64, 64);
    stains(x, 64, 64, 4, 'rgba(15,25,15,0.4)', 6, 18); // musgo
    cracks(x, 64, 64, 4);
    // cruz entalhada
    x.fillStyle = '#22252a';
    x.fillRect(30, 14, 4, 24);
    x.fillRect(24, 20, 16, 4);
    grain(x, 64, 64, 400, 0.2);
    poster15(x, 64, 64);
    reg('tombstone', c);
  }

  // ---------- BANCO DE MADEIRA DA CAPELA ----------
  {
    const [c, x] = cv(64, 64);
    x.fillStyle = '#342014'; x.fillRect(0, 0, 64, 64);
    for (let y = 0; y < 64; y += 16) {
      x.fillStyle = 'rgba(0,0,0,0.4)'; x.fillRect(0, y, 64, 1);
      x.fillStyle = 'rgba(255,255,255,0.06)'; x.fillRect(0, y + 1, 64, 1);
    }
    grain(x, 64, 64, 300, 0.2);
    poster15(x, 64, 64);
    reg('pewWood', c);
  }

  // ---------- VITRAL GÓTICO COLORIDO ----------
  {
    const [c, x] = cv(64, 128);
    x.fillStyle = '#101420'; x.fillRect(0, 0, 64, 128);
    const cols = ['#8a2233', '#1e4488', '#aa7722', '#2a6644', '#7a2288'];
    for (let r = 8; r < 120; r += 20) {
      for (let col = 6; col < 60; col += 18) {
        x.fillStyle = cols[ri(0, cols.length - 1)];
        x.fillRect(col, r, 14, 16);
      }
    }
    // armação de chumbo preta
    x.strokeStyle = '#050608'; x.lineWidth = 3;
    x.strokeRect(2, 2, 60, 124);
    for (let r = 8; r < 120; r += 20) {
      x.beginPath(); x.moveTo(2, r); x.lineTo(62, r); x.stroke();
    }
    grain(x, 64, 128, 400, 0.15);
    reg('vitral', c);
  }

  // ---------- CORPO DE CLARA (JALECO & VINHO) ----------
  {
    const [c, x] = cv(32, 64);
    x.fillStyle = '#dcdcd8'; x.fillRect(0, 0, 32, 64); // jaleco
    x.fillStyle = '#6b1d28'; x.fillRect(10, 0, 12, 34); // blusa vinho
    x.fillStyle = '#1a1820'; x.fillRect(0, 34, 32, 4);  // cinto
    x.fillStyle = '#222228'; x.fillRect(4, 38, 24, 26); // calça escura
    grain(x, 32, 64, 200, 0.2); poster15(x, 32, 64);
    reg('claraBody', c);
  }

  // ---------- CORPO DE BENTO (MACACÃO ZELADOR) ----------
  {
    const [c, x] = cv(32, 64);
    x.fillStyle = '#223854'; x.fillRect(0, 0, 32, 64); // macacão azul
    x.fillStyle = '#3a2418'; x.fillRect(0, 32, 32, 4); // cinto de couro
    stains(x, 32, 64, 5, 'rgba(10,8,6,0.5)', 3, 8); // graxa
    grain(x, 32, 64, 240, 0.25); poster15(x, 32, 64);
    reg('bentoBody', c);
  }

  // ---------- TRAJE TÁTICO MILITAR (LOJA) ----------
  {
    const [c, x] = cv(32, 64);
    x.fillStyle = '#1c221a'; x.fillRect(0, 0, 32, 64);
    for (let i = 0; i < 40; i++) {
      x.fillStyle = Math.random() < 0.5 ? '#2d3826' : '#141812';
      x.fillRect(ri(0, 28), ri(0, 60), ri(3, 7), ri(3, 6));
    }
    x.fillStyle = '#0a0a0c'; x.fillRect(0, 32, 32, 5); // cinturão
    grain(x, 32, 64, 250, 0.2); poster15(x, 32, 64);
    reg('tacticalSuit', c);
  }

  // ---------- PELE DO CARNIÇAL RASTEJADOR ----------
  {
    const [c, x] = cv(32, 32);
    x.fillStyle = '#384838'; x.fillRect(0, 0, 32, 32);
    stains(x, 32, 32, 3, 'rgba(20,10,10,0.6)', 3, 9);
    grain(x, 32, 32, 300, 0.3); poster15(x, 32, 32);
    reg('crawlerSkin', c);
  }

  // ---------- CAPUZ / CORPO DO CARRASCO ----------
  {
    const [c, x] = cv(32, 64);
    x.fillStyle = '#3a342c'; x.fillRect(0, 0, 32, 64); // estopa
    stains(x, 32, 64, 6, 'rgba(50,10,10,0.55)', 4, 12); // sangue seco
    grain(x, 32, 64, 300, 0.3); poster15(x, 32, 64);
    reg('executionerBody', c);
  }

  // ---------- CUTELO ENFERRUJADO ----------
  {
    const [c, x] = cv(32, 32);
    x.fillStyle = '#585e64'; x.fillRect(0, 0, 32, 32);
    stains(x, 32, 32, 4, 'rgba(100,20,10,0.6)', 3, 10);
    grain(x, 32, 32, 200, 0.3); poster15(x, 32, 32);
    reg('rustyCleaver', c);
  }

  // ---------- TOTEM DO MODO MERCENÁRIOS ----------
  {
    const [c, x] = cv(32, 64);
    x.fillStyle = '#103058'; x.fillRect(0, 0, 32, 64);
    const grad = x.createLinearGradient(0, 0, 32, 64);
    grad.addColorStop(0, '#50c0ff'); grad.addColorStop(0.5, '#ffd700'); grad.addColorStop(1, '#2060b0');
    x.fillStyle = grad; x.fillRect(4, 4, 24, 56);
    grain(x, 32, 64, 200, 0.2); poster15(x, 32, 64);
    reg('mercenaryTotem', c);
  }

  // ---------- CAMISA DE FORÇA (PACIENTE INFECTADO) ----------
  {
    const [c, x] = cv(32, 64);
    x.fillStyle = '#7a766c'; x.fillRect(0, 0, 32, 64);
    // correias de couro marrom
    x.fillStyle = '#3c2616';
    x.fillRect(0, 16, 32, 5); x.fillRect(0, 34, 32, 5); x.fillRect(0, 52, 32, 4);
    // fivelas de ferro
    x.fillStyle = '#8a8e98';
    x.fillRect(14, 15, 6, 7); x.fillRect(14, 33, 6, 7);
    stains(x, 32, 64, 5, 'rgba(80,15,15,0.6)', 3, 10);
    grain(x, 32, 64, 300, 0.25); poster15(x, 32, 64);
    reg('straitjacket', c);
  }

  // ---------- UNIFORME DE ENFERMEIRA CIRÚRGICA ----------
  {
    const [c, x] = cv(32, 64);
    x.fillStyle = '#cfd3d8'; x.fillRect(0, 0, 32, 64);
    // gola e avental
    x.fillStyle = '#b0b6c0'; x.fillRect(0, 28, 32, 36);
    // cruz médica vermelha
    x.fillStyle = '#aa1c22';
    x.fillRect(14, 8, 4, 12); x.fillRect(10, 12, 12, 4);
    stains(x, 32, 64, 6, 'rgba(110,18,24,0.7)', 3, 11);
    grain(x, 32, 64, 250, 0.25); poster15(x, 32, 64);
    reg('nurseUniform', c);
  }

  // ---------- CORPO DE CINZAS E BRASAS (CRIATURA DAS CALDEIRAS) ----------
  {
    const [c, x] = cv(32, 64);
    x.fillStyle = '#1c1816'; x.fillRect(0, 0, 32, 64);
    // veios de fogo/magma
    x.fillStyle = '#ff5511';
    x.fillRect(4, 10, 24, 3); x.fillRect(8, 25, 18, 4); x.fillRect(6, 44, 20, 3);
    x.fillStyle = '#ffaa22';
    x.fillRect(6, 11, 20, 1); x.fillRect(10, 26, 14, 2);
    stains(x, 32, 64, 4, 'rgba(255,100,20,0.5)', 4, 8);
    grain(x, 32, 64, 300, 0.3); poster15(x, 32, 64);
    reg('emberBody', c);
  }

  // ---------- HELIPONTO DO TERRAÇO (P3) ----------
  {
    const [c, x] = cv(128, 128);
    x.fillStyle = '#22252a'; x.fillRect(0, 0, 128, 128);
    // círculo de demarcação
    x.strokeStyle = '#d6ad2a'; x.lineWidth = 6;
    x.beginPath(); x.arc(64, 64, 52, 0, Math.PI * 2); x.stroke();
    // 'H' central
    x.fillStyle = '#d6ad2a';
    x.fillRect(40, 36, 10, 56);
    x.fillRect(78, 36, 10, 56);
    x.fillRect(40, 60, 48, 10);
    // desgaste e rachaduras do tempo
    cracks(x, 128, 128, 4);
    stains(x, 128, 128, 6, 'rgba(10,12,14,0.5)', 6, 20);
    grain(x, 128, 128, 400, 0.25); poster15(x, 128, 128);
    reg('heliPad', c);
  }

  // ---------- ESTUFA: VIDRO E CAIXILHOS ----------
  {
    const [c, x] = cv(64, 64);
    x.fillStyle = '#1c2826'; x.fillRect(0, 0, 64, 64);
    x.fillStyle = 'rgba(70,120,105,0.4)'; x.fillRect(4, 4, 26, 26);
    x.fillRect(34, 4, 26, 26); x.fillRect(4, 34, 26, 26); x.fillRect(34, 34, 26, 26);
    x.strokeStyle = '#101614'; x.lineWidth = 4;
    x.strokeRect(2, 2, 60, 60);
    x.beginPath(); x.moveTo(32, 2); x.lineTo(32, 62); x.moveTo(2, 32); x.lineTo(62, 32); x.stroke();
    stains(x, 64, 64, 5, 'rgba(30,50,20,0.5)', 4, 12);
    grain(x, 64, 64, 200, 0.2); poster15(x, 64, 64);
    reg('greenhouseGlass', c);
  }

  // ---------- ESTUFA: CANTEIRO DE TERRA E FOLHAGEM ----------
  {
    const [c, x] = cv(64, 64);
    x.fillStyle = '#1e140d'; x.fillRect(0, 0, 64, 64);
    for (let i = 0; i < 40; i++) {
      x.fillStyle = Math.random() < 0.5 ? '#120b06' : '#2d1e13';
      x.fillRect(rnd(0, 60), rnd(0, 60), rnd(3, 8), rnd(2, 6));
    }
    // brotos e folhas caídas
    for (let i = 0; i < 15; i++) {
      x.fillStyle = Math.random() < 0.6 ? '#2f4b23' : '#4d6934';
      x.fillRect(rnd(2, 60), rnd(2, 60), rnd(2, 5), rnd(2, 4));
    }
    grain(x, 64, 64, 300, 0.3); poster15(x, 64, 64);
    reg('greenhouseSoil', c);
  }

  // ---------- CANIL: GRADES DE FERRO E TIJOLOS ----------
  {
    const [c, x] = cv(64, 64);
    x.fillStyle = '#2a2420'; x.fillRect(0, 0, 64, 64);
    x.fillStyle = '#3a3430';
    for (let y = 0; y < 64; y += 12) {
      x.fillRect(0, y, 64, 2);
    }
    // barras de ferro verticais
    x.fillStyle = '#15171a';
    for (let bx = 6; bx < 64; bx += 10) {
      x.fillRect(bx, 0, 3, 64);
      x.fillStyle = '#32363e'; x.fillRect(bx, 0, 1, 64);
      x.fillStyle = '#15171a';
    }
    stains(x, 64, 64, 4, 'rgba(70,20,10,0.4)', 4, 12);
    grain(x, 64, 64, 250, 0.25); poster15(x, 64, 64);
    reg('dogKennel', c);
  }

  // ---------- ALTAR DO CULTO (SUBSOLO) ----------
  {
    const [c, x] = cv(64, 64);
    x.fillStyle = '#121016'; x.fillRect(0, 0, 64, 64);
    // círculo de runas
    x.strokeStyle = '#8a1824'; x.lineWidth = 2;
    x.beginPath(); x.arc(32, 32, 22, 0, Math.PI * 2); x.stroke();
    // triângulo invertido com olho
    x.beginPath();
    x.moveTo(18, 20); x.lineTo(46, 20); x.lineTo(32, 48); x.lineTo(18, 20);
    x.stroke();
    // gotas de cera de vela e sangue
    stains(x, 64, 64, 6, 'rgba(120,10,15,0.7)', 3, 10);
    grain(x, 64, 64, 300, 0.25); poster15(x, 64, 64);
    reg('cultAltar', c);
  }

  // ---------- MACA DE EXPERIMENTOS CIRÚRGICOS ----------
  {
    const [c, x] = cv(64, 64);
    x.fillStyle = '#4a5056'; x.fillRect(0, 0, 64, 64);
    // correias de contenção
    x.fillStyle = '#22150f';
    x.fillRect(10, 0, 6, 64); x.fillRect(48, 0, 6, 64);
    // fivelas
    x.fillStyle = '#c0c4cc';
    x.fillRect(11, 28, 4, 8); x.fillRect(49, 28, 4, 8);
    stains(x, 64, 64, 5, 'rgba(90,15,20,0.6)', 4, 12);
    grain(x, 64, 64, 250, 0.25); poster15(x, 64, 64);
    reg('examTable', c);
  }

  // ---------- BALCÃO DE RECEPÇÃO EM U ----------
  {
    const [c, x] = cv(64, 64);
    x.fillStyle = '#3a2012'; x.fillRect(0, 0, 64, 64);
    // frisos e molduras clássicas de madeira nobre
    x.fillStyle = '#52301c';
    x.fillRect(4, 4, 56, 12); x.fillRect(4, 24, 56, 36);
    x.strokeStyle = '#1c0f08'; x.lineWidth = 2;
    x.strokeRect(6, 26, 52, 32);
    stains(x, 64, 64, 3, 'rgba(20,10,5,0.4)', 6, 14);
    grain(x, 64, 64, 200, 0.2); poster15(x, 64, 64);
    reg('receptionCounter', c);
  }

  // ---------- LÁPIDE DO CEMITÉRIO ----------
  {
    const [c, x] = cv(32, 64);
    x.fillStyle = '#3c3e42'; x.fillRect(0, 0, 32, 64);
    // topo arredondado
    x.fillStyle = '#2a2b2e';
    x.fillRect(0, 0, 32, 12);
    // cruz entalhada
    x.fillStyle = '#1e2022';
    x.fillRect(14, 16, 4, 20); x.fillRect(8, 22, 16, 4);
    // musgo
    stains(x, 32, 64, 4, 'rgba(35,55,25,0.6)', 3, 8);
    cracks(x, 32, 64, 2);
    grain(x, 32, 64, 200, 0.25); poster15(x, 32, 64);
    reg('tombstone', c);
  }

  return T;
}

// ------------------------------------------------------------
// Retratos pixel-art para as caixas de diálogo (canvas 2D)
// ------------------------------------------------------------
export function drawPortrait(canvas, who) {
  const x = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  x.imageSmoothingEnabled = false;
  x.fillStyle = '#060608';
  x.fillRect(0, 0, W, H);
  const px = (cx, cy, w, h, col) => { x.fillStyle = col; x.fillRect(cx * (W / 48), cy * (H / 48), w * (W / 48), h * (H / 48)); };
  if (who === 'n') return; // narrador: sem retrato
  // fundo
  for (let i = 0; i < 48; i += 2) px(i, 0, 1, 48, i % 4 ? '#0c0c14' : '#101018');
  if (who === 'daniel') {
    px(10, 6, 28, 10, '#241812');           // cabelo
    px(12, 12, 24, 24, '#c8a080');           // rosto
    px(10, 14, 2, 14, '#241812'); px(36, 14, 2, 14, '#241812');
    px(15, 22, 6, 3, '#f0e8dc'); px(27, 22, 6, 3, '#f0e8dc'); // olhos
    px(17, 22, 3, 3, '#1a1210'); px(29, 22, 3, 3, '#1a1210');
    px(15, 25, 6, 2, '#7a5048'); px(27, 25, 6, 2, '#7a5048'); // olheiras
    px(22, 28, 4, 3, '#a87858');             // nariz
    px(19, 33, 10, 1, '#6a4038');            // boca
    px(8, 38, 32, 10, '#2a3448');            // casaco
    px(22, 38, 4, 10, '#3d4a63');
  } else if (who === 'lucia') {
    px(8, 4, 32, 14, '#3a2a1a');             // cabelo longo
    px(8, 4, 6, 40, '#3a2a1a'); px(34, 4, 6, 40, '#3a2a1a');
    px(14, 14, 20, 20, '#d8b090');           // rosto
    px(17, 22, 5, 4, '#fff'); px(27, 22, 5, 4, '#fff');
    px(18, 23, 3, 3, '#2a4a3a'); px(28, 23, 3, 3, '#2a4a3a');
    px(21, 30, 6, 2, '#b87870');             // sorriso triste
    px(26, 44, 2, 4, '#8a2a2a');             // pingente
    px(10, 40, 28, 8, '#7a3a44');            // roupa
  } else if (who === 'medico') {
    px(12, 8, 24, 8, '#b8b4a8');             // cabelo grisalho
    px(14, 14, 20, 22, '#c0a488');           // rosto
    px(16, 22, 16, 1, '#222');               // óculos
    px(16, 20, 6, 5, 'rgba(200,220,230,0.5)'); px(26, 20, 6, 5, 'rgba(200,220,230,0.5)');
    px(18, 22, 2, 2, '#111'); px(28, 22, 2, 2, '#111');
    px(14, 32, 20, 4, '#9a988e');            // barba
    px(8, 38, 32, 10, '#e0e0dc');            // jaleco
    px(22, 38, 4, 10, '#8899aa');
  } else if (who === 'clara') {
    px(10, 4, 28, 12, '#4a2c18');            // cabelo castanho
    px(8, 12, 6, 22, '#4a2c18'); px(34, 12, 6, 22, '#4a2c18');
    px(13, 14, 22, 22, '#ddb294');           // rosto
    px(16, 21, 5, 4, '#fff'); px(27, 21, 5, 4, '#fff'); // olhos
    px(17, 22, 3, 3, '#2a6a4a'); px(28, 22, 3, 3, '#2a6a4a'); // íris verde
    px(22, 27, 4, 3, '#b88264');             // nariz
    px(20, 32, 8, 2, '#a05058');             // lábios
    px(8, 38, 32, 10, '#e4e4e0');            // jaleco médico
    px(20, 38, 8, 10, '#6b1d28');            // gola vinho
  } else if (who === 'bento') {
    px(10, 4, 28, 8, '#3a3e44');             // boné/boina
    px(8, 12, 32, 6, '#282b30');             // aba
    px(14, 16, 20, 20, '#ba9476');           // rosto envelhecido
    px(16, 22, 4, 3, '#1a1814'); px(28, 22, 4, 3, '#1a1814'); // olhos fundos
    px(14, 28, 20, 5, '#88847e');            // bigode grisalho farto
    px(22, 24, 4, 4, '#9c765a');             // nariz largo
    px(8, 38, 32, 10, '#223854');            // macacão azul de trabalho
    px(22, 38, 4, 10, '#d8d8d0');            // camiseta por baixo
  } else if (who === 'alencastro') {
    px(12, 6, 24, 8, '#707074');             // cabelo grisalho penteado
    px(14, 14, 20, 22, '#a89890');           // rosto pálido
    px(15, 21, 18, 1, '#222');               // óculos finos
    px(16, 19, 6, 5, 'rgba(180,200,220,0.6)'); px(26, 19, 6, 5, 'rgba(180,200,220,0.6)');
    px(18, 21, 2, 2, '#441155'); px(28, 21, 2, 2, '#441155'); // olhos sombrios
    // veias escuras no rosto
    px(12, 24, 3, 8, '#3b1248'); px(33, 22, 3, 10, '#3b1248');
    px(20, 33, 8, 1, '#443834');             // boca fria
    px(8, 38, 32, 10, '#1c1822');            // terno escuro
    px(22, 38, 4, 10, '#882233');            // gravata
  } else if (who === 'radio') {
    px(10, 8, 28, 32, '#1a1e24');            // carcaça do walkie-talkie
    px(14, 2, 4, 8, '#3a4048');              // antena
    px(14, 12, 20, 8, '#2a603a');            // display LCD verde
    px(16, 14, 16, 4, '#50c868');            // texto no visor
    px(14, 22, 20, 14, '#0e1014');           // grade do alto-falante
    for (let gy = 23; gy < 35; gy += 3) {
      for (let gx = 15; gx < 33; gx += 3) px(gx, gy, 2, 1, '#283038');
    }
    px(32, 10, 2, 2, '#ff3020');             // led de sinal
    px(8, 40, 32, 8, '#101216');
  } else if (who === 'vulto') {
    px(12, 8, 24, 30, '#050508');            // rosto negro
    px(10, 4, 28, 8, '#0e0e16');
    px(15, 20, 7, 4, '#ff3b30'); px(26, 20, 7, 4, '#ff3b30'); // olhos vermelhos
    px(17, 32, 14, 2, '#400a0a');            // boca
    for (let i = 0; i < 12; i++) px(ri2(i * 7 % 40 + 4), 38 + (i % 3) * 2, 3, 6, '#0a0a12');
  } else { // 'q' voz desconhecida
    for (let i = 0; i < 48; i += 3) px(i, 10 + (i % 9), 2, 28, '#1a2a3a');
    px(14, 18, 20, 12, '#0a1420');
    px(19, 22, 10, 2, '#7ad0e0');
  }
  // vinheta do retrato
  x.fillStyle = 'rgba(0,0,0,0.35)';
  x.fillRect(0, 0, W, 3); x.fillRect(0, H - 3, W, 3);
}
function ri2(n) { return n; }
