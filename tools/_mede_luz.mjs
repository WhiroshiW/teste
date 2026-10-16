// ============================================================
// RÉGUA NUMÉRICA DE LUZ — mede luminância de um PNG (sem precisar de olho)
// (Equipe Nakamura) · uso: node tools/_mede_luz.mjs <arquivo.png> [...]
// Imprime grade de luminância + histograma + % de pixels quase-pretos.
// Serve p/ provar antes/depois de mudança de luz (ex.: v93 escuro → v94).
// ============================================================
import { createCanvas, loadImage } from '@napi-rs/canvas';
import fs from 'node:fs';

const lum = (d, i) => 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];

for (const f of process.argv.slice(2)) {
  if (!fs.existsSync(f)) { console.log(f, '→ AUSENTE'); continue; }
  const img = await loadImage(f);
  const c = createCanvas(img.width, img.height);
  const ctx = c.getContext('2d');
  ctx.drawImage(img, 0, 0);
  const { data: d } = ctx.getImageData(0, 0, img.width, img.height);

  let sum = 0, dark = 0, n = 0, max = 0;
  const hist = new Array(8).fill(0);
  for (let i = 0; i < d.length; i += 4) {
    const l = lum(d, i);
    sum += l; n++;
    if (l < 12) dark++;
    if (l > max) max = l;
    hist[Math.min(7, Math.floor(l / 32))]++;
  }

  console.log('══', f, `(${img.width}x${img.height})`);
  console.log('   luminância média:', (sum / n).toFixed(1), '/255   pico:', max.toFixed(0));
  console.log('   pixels quase-preto (<12):', (100 * dark / n).toFixed(1) + '%');
  console.log('   histograma 0-31→224-255:', hist.map((h) => (100 * h / n).toFixed(1) + '%').join(' '));

  const COLS = 8, ROWS = 5;
  const cw = Math.floor(img.width / COLS), ch = Math.floor(img.height / ROWS);
  console.log(`   grade ${COLS}x${ROWS} (média por célula):`);
  for (let r = 0; r < ROWS; r++) {
    const row = [];
    for (let cc = 0; cc < COLS; cc++) {
      let s = 0, m = 0;
      for (let y = r * ch; y < (r + 1) * ch; y++) {
        for (let x = cc * cw; x < (cc + 1) * cw; x++) { s += lum(d, (y * img.width + x) * 4); m++; }
      }
      row.push(String(Math.round(s / m)).padStart(4));
    }
    console.log('     ' + row.join(''));
  }

  let rs = 0, gs = 0, bs = 0, k = 0;
  for (let y = Math.floor(img.height * 0.2); y < Math.floor(img.height * 0.8); y++) {
    for (let x = Math.floor(img.width * 0.2); x < Math.floor(img.width * 0.8); x++) {
      const i = (y * img.width + x) * 4; rs += d[i]; gs += d[i + 1]; bs += d[i + 2]; k++;
    }
  }
  console.log('   RGB médio do miolo central:', Math.round(rs / k), Math.round(gs / k), Math.round(bs / k));
}
