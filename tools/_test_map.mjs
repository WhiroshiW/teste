// Preview offline da aba MAPA (espelho do renderMap p/ inspeção de olhos)
import { createCanvas } from '@napi-rs/canvas';
import fs from 'fs';
const cv = createCanvas(620, 380);
const x = cv.getContext('2d');
const W = 620, H = 380;
const FLOORS = {
  L1: [
    { id:'saguao', l:'HALL PRINCIPAL', x:240, y:150, w:150, h:105, save:true },
    { id:'corredor', l:'CORREDOR DOS QUARTOS', x:115, y:135, w:110, h:38 },
    { id:'quarto', l:'QUARTO 1', x:55, y:100, w:72, h:52 },
    { id:'quarto2', l:'QUARTO 2', x:55, y:162, w:72, h:52 },
    { id:'passagem', l:'PASSAGEM', x:150, y:85, w:78, h:32 },
    { id:'corredor_n', l:'RECEPÇÃO TÉCNICA', x:240, y:75, w:150, h:38, elev:true },
    { id:'catedral', l:'CATEDRAL', x:410, y:60, w:110, h:75 },
    { id:'experimentos', l:'EXPERIMENTOS', x:430, y:155, w:105, h:70 },
    { id:'estufa', l:'ESTUFA', x:455, y:250, w:100, h:75 },
    { id:'cemiterio', l:'CEMITÉRIO', x:95, y:240, w:110, h:75 },
    { id:'casa_zelador', l:'CASA DO ZELADOR', x:230, y:280, w:95, h:50 },
    { id:'floresta', l:'FLORESTA', x:230, y:345, w:150, h:38 },
    { id:'estacionamento', l:'ESTAC.', x:70, y:330, w:75, h:40 },
  ],
  L2: [
    { id:'hall2', l:'HALL DO 2º ANDAR', x:230, y:150, w:150, h:105, elev:true },
    { id:'escritorio2', l:'ESCRITÓRIO CLÍNICO', x:90, y:155, w:105, h:80 },
    { id:'enfermaria', l:'ENFERMARIA', x:410, y:150, w:120, h:90, save:true },
    { id:'fornalhas', l:'FORNALHAS', x:255, y:290, w:120, h:65 },
  ],
};
const visited = new Set(['saguao','corredor','quarto','corredor_n','estufa','cemiterio','quarto2','hall2','enfermaria','escritorio2']);
const atual = 'saguao';
function drawFloor(salas) {
  x.fillStyle = '#0a0a0e'; x.fillRect(0, 0, W, H);
  x.strokeStyle = 'rgba(200,184,136,0.05)'; x.lineWidth = 1;
  for (let gx = 0; gx < W; gx += 31) { x.beginPath(); x.moveTo(gx, 0); x.lineTo(gx, H); x.stroke(); }
  for (let gy = 0; gy < H; gy += 31) { x.beginPath(); x.moveTo(0, gy); x.lineTo(W, gy); x.stroke(); }
  x.textAlign = 'center';
  for (const r of salas) {
    const vista = visited.has(r.id);
    if (vista) {
      x.fillStyle = '#181b21'; x.fillRect(r.x, r.y, r.w, r.h);
      x.strokeStyle = '#7a6a45'; x.lineWidth = 2; x.strokeRect(r.x, r.y, r.w, r.h);
      x.fillStyle = '#cfc5a5'; x.font = 'bold 10px monospace';
      if (x.measureText(r.l).width > r.w - 8 && r.l.includes(' ')) {
        const pal = r.l.split(' ');
        const m = Math.ceil(pal.length / 2);
        x.fillText(pal.slice(0, m).join(' '), r.x + r.w / 2, r.y + r.h / 2 - 2);
        x.fillText(pal.slice(m).join(' '), r.x + r.w / 2, r.y + r.h / 2 + 9);
      } else x.fillText(r.l, r.x + r.w / 2, r.y + r.h / 2 + 3);
      if (r.save) { x.fillStyle = '#c8b888'; x.fillRect(r.x + 7, r.y + r.h - 16, 14, 9); x.fillRect(r.x + 9, r.y + r.h - 20, 10, 4); }
      if (r.elev) { x.strokeStyle = '#c8b888'; x.lineWidth = 1.5; x.strokeRect(r.x + r.w - 21, r.y + r.h - 18, 14, 12); x.fillStyle = '#c8b888'; x.font = 'bold 9px monospace'; x.fillText('E', r.x + r.w - 14, r.y + r.h - 8.5); }
    } else {
      x.strokeStyle = '#33333c'; x.lineWidth = 1.5; x.setLineDash([5, 4]); x.strokeRect(r.x, r.y, r.w, r.h); x.setLineDash([]);
      x.fillStyle = '#55555f'; x.font = 'bold 16px monospace';
      x.fillText('?', r.x + r.w / 2, r.y + r.h / 2 + 5);
    }
  }
  if (salas.some((r) => r.id === atual)) {
    const r = salas.find((q) => q.id === atual);
    const px = r.x + r.w / 2 + 20, py = r.y + r.h / 2;
    x.fillStyle = 'rgba(255,48,32,0.25)'; x.beginPath(); x.arc(px, py, 10, 0, Math.PI * 2); x.fill();
    x.fillStyle = '#ff3020'; x.shadowColor = '#ff3020'; x.shadowBlur = 9;
    x.beginPath(); x.arc(px, py, 4.5, 0, Math.PI * 2); x.fill(); x.shadowBlur = 0;
  }
  x.textAlign = 'left'; x.fillStyle = '#6a6152'; x.font = '10px monospace';
}
drawFloor(FLOORS.L1);
fs.writeFileSync('docs/refs/_debug/mapa_L1.png', cv.toBuffer('image/png'));
drawFloor(FLOORS.L2);
fs.writeFileSync('docs/refs/_debug/mapa_L2.png', cv.toBuffer('image/png'));
console.log('mapas ok');
