// ============================================================
// COMPARATIVO LADO A LADO — monta uma régua visual de PNGs
// (Equipe Nakamura) · canónico do projeto: referência → render → comparar
// uso: node tools/_comparativo.mjs <saida.png> <cols> <img1> <rotulo1> [<img2> <rotulo2> ...]
// ex.: node tools/_comparativo.mjs docs/refs/_debug/comparativo_luz.png 2 a.png "A 75%" b.png "B 60%"
//      (use --medir p/ imprimir luminância média de cada imagem no rodapé)
// ============================================================
import { createCanvas, loadImage } from '@napi-rs/canvas';
import fs from 'node:fs';

const args = process.argv.slice(2);
const medir = args.includes('--medir');
const rest = args.filter((a) => a !== '--medir');
const [saida, colsStr, ...pares] = rest;
const cols = Math.max(1, +(colsStr || 2));
const itens = [];
for (let i = 0; i < pares.length; i += 2) itens.push({ path: pares[i], label: pares[i + 1] || '' });
if (!saida || !itens.length) { console.log('uso: node tools/_comparativo.mjs <saida.png> <cols> <img> <rotulo> [...]'); process.exit(1); }

const CW = 640, CH = 360, BAR = 30, GAP = 6;
const rows = Math.ceil(itens.length / cols);
const W = cols * CW + (cols + 1) * GAP;
const H = rows * (CH + BAR) + (rows + 1) * GAP;
const canvas = createCanvas(W, H);
const ctx = canvas.getContext('2d');
ctx.fillStyle = '#0a0a0c'; ctx.fillRect(0, 0, W, H);

const lum = (d, i) => 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];

for (let k = 0; k < itens.length; k++) {
  const it = itens[k];
  const cx = GAP + (k % cols) * (CW + GAP);
  const cy = GAP + Math.floor(k / cols) * (CH + BAR + GAP);
  let media = null;
  if (fs.existsSync(it.path)) {
    const img = await loadImage(it.path);
    ctx.drawImage(img, cx, cy + BAR, CW, CH);
    if (medir) {
      const c2 = createCanvas(img.width, img.height); const x2 = c2.getContext('2d');
      x2.drawImage(img, 0, 0);
      const d = x2.getImageData(0, 0, img.width, img.height).data;
      let s = 0, n = 0; for (let i = 0; i < d.length; i += 4) { s += lum(d, i); n++; }
      media = (s / n).toFixed(1);
    }
  } else {
    ctx.fillStyle = '#201010'; ctx.fillRect(cx, cy + BAR, CW, CH);
    ctx.fillStyle = '#c04040'; ctx.font = '20px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('AUSENTE: ' + it.path, cx + CW / 2, cy + BAR + CH / 2);
  }
  ctx.fillStyle = '#141416'; ctx.fillRect(cx, cy, CW, BAR);
  ctx.fillStyle = '#e8d9a8'; ctx.font = 'bold 17px monospace'; ctx.textAlign = 'left';
  const txt = media !== null ? `${it.label}   ·  média ${media}/255` : it.label;
  ctx.fillText(txt, cx + 8, cy + 20);
  ctx.strokeStyle = '#3a3226'; ctx.lineWidth = 1;
  ctx.strokeRect(cx + 0.5, cy + BAR + 0.5, CW - 1, CH - 1);
}

fs.mkdirSync(saida.split('/').slice(0, -1).join('/') || '.', { recursive: true });
fs.writeFileSync(saida, canvas.toBuffer('image/png'));
console.log('COMPARATIVO SALVO:', saida, `(${W}x${H})`);
