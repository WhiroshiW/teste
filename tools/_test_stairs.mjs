import { createCanvas } from '@napi-rs/canvas';
import fs from 'fs';
const W = 480, H = 270;
const cv = createCanvas(W, H);
const x = cv.getContext('2d');
const SP = (22.5 * Math.PI) / 180;
function draw(t) {
  const g = x.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#05060a'); g.addColorStop(0.45, '#131620'); g.addColorStop(1, '#020204');
  x.fillStyle = g; x.fillRect(0, 0, W, H);
  x.strokeStyle = 'rgba(255,255,255,0.04)'; x.lineWidth = 1;
  for (let yy = ((t * 40) % 26) - 26; yy < H; yy += 26) { x.beginPath(); x.moveTo(0, yy); x.lineTo(W, yy); x.stroke(); }
  const pg = x.createLinearGradient(W * 0.46, 0, W * 0.54, 0);
  pg.addColorStop(0, '#17141a'); pg.addColorStop(0.5, '#3a3340'); pg.addColorStop(1, '#0e0c10');
  x.fillStyle = pg; x.fillRect(W * 0.46, 0, W * 0.08, H);
  const scroll = t * 3.4;
  const passos = [];
  for (let j = 0; j < 14; j++) { const prog = j - (scroll % 1); const ang = prog * SP; passos.push({ prog, ang, depth: Math.cos(ang), side: Math.sin(ang) }); }
  passos.sort((a, b) => a.depth - b.depth);
  for (const p of passos) {
    if (p.depth < -0.25) continue;
    const cx = W * 0.5 + p.side * W * 0.17;
    const cy = H * 0.5 - p.depth * H * 0.30 + p.prog * H * 0.018;
    const half = W * (0.13 + 0.21 * Math.max(0, p.depth));
    const hh = H * (0.028 + 0.02 * Math.max(0, p.depth));
    x.save(); x.translate(cx, cy); x.rotate(p.side * 0.35);
    const lum = 40 + 42 * Math.max(0, p.depth);
    x.fillStyle = `rgb(${lum | 0},${(lum * 0.86) | 0},${(lum * 0.72) | 0})`;
    x.fillRect(-half, -hh / 2, half * 2, hh);
    x.fillStyle = 'rgba(255,214,150,0.20)';
    x.fillRect(-half, -hh / 2, half * 2, Math.max(1, hh * 0.18));
    x.restore();
  }
  const flick = 0.10 + 0.05 * Math.sin(t * 37) * Math.sin(t * 13.7);
  const vg = x.createRadialGradient(W / 2, H * 0.8, 10, W / 2, H * 0.8, H * 0.7);
  vg.addColorStop(0, `rgba(255,170,80,${flick})`); vg.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = vg; x.fillRect(0, 0, W, H);
}
let i = 0;
for (const t of [0.3, 0.55, 0.8]) { draw(t); fs.writeFileSync(`/tmp/stairs_f${i++}.png`, cv.toBuffer('image/png')); }
console.log('3 frames ok');
