// ============================================================
// NAVEGADOR DE TELAS — pula a intro, fotografa as telas reais, lista os
// textos visíveis de cada uma e (com imagem de referência) diz qual bate.
// (Equipe Nakamura) · uso: node tools/_nav_shots.mjs [imagem_referencia.png]
// ============================================================
import puppeteer from 'puppeteer-core';
import { spawn } from 'node:child_process';
import { brotliDecompressSync } from 'node:zlib';
import fs from 'node:fs';

process.env.LD_LIBRARY_PATH = '/tmp/al2libs/lib:/tmp/al2swift';
if (!fs.existsSync('/tmp/al2libs/lib/libnss3.so')) {
  fs.mkdirSync('/tmp/al2libs', { recursive: true });
  fs.writeFileSync('/tmp/al2023.tar', brotliDecompressSync(fs.readFileSync('node_modules/@sparticuz/chromium/bin/al2023.tar.br')));
  const { execSync } = await import('node:child_process');
  execSync('tar -xf /tmp/al2023.tar -C /tmp/al2libs');
}
if (!fs.existsSync('/tmp/al2swift')) {
  fs.mkdirSync('/tmp/al2swift', { recursive: true });
  fs.writeFileSync('/tmp/swift.tar', brotliDecompressSync(fs.readFileSync('node_modules/@sparticuz/chromium/bin/swiftshader.tar.br')));
  const { execSync } = await import('node:child_process');
  execSync('tar -xf /tmp/swift.tar -C /tmp/al2swift');
}
const chromium = (await import('@sparticuz/chromium')).default;
const exePath = await chromium.executablePath();
const child = spawn(exePath, ['--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage',
  '--no-zygote', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--remote-debugging-port=0', 'about:blank'],
  { env: process.env, stdio: ['ignore', 'ignore', 'pipe'] });
const wsUrl = await new Promise((res, rej) => {
  let buf = ''; const t = setTimeout(() => rej(new Error('browser não abriu')), 40000);
  child.stderr.on('data', (d) => { buf += d.toString(); const m = buf.match(/DevTools listening on (ws:\/\/\S+)/); if (m) { clearTimeout(t); res(m[1]); } });
});
const browser = await puppeteer.connect({ browserWSEndpoint: wsUrl, protocolTimeout: 120000 });
const page = (await browser.pages())[0] || await browser.newPage();
await page.setViewport({ width: 1280, height: 720 });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
await page.goto('http://127.0.0.1:8000/', { waitUntil: 'networkidle2', timeout: 90000 });
await sleep(3000);

const textosVisiveis = () => page.evaluate(() => {
  const out = [];
  document.querySelectorAll('body *').forEach((el) => {
    if (el.closest('svg')) return;
    const t = (el.textContent || '').trim();
    if (!t || el.children.length > 0) return;
    const r = el.getBoundingClientRect(); const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity <= 0.05 || el.offsetParent === null) return;
    if (r.width < 1 || r.height < 1) return;
    out.push({ y: Math.round(r.y), x: Math.round(r.x), t: t.slice(0, 70),
      tag: el.tagName + (el.id ? '#' + el.id : '') + (typeof el.className === 'string' && el.className ? '.' + el.className.split(' ')[0] : '') });
  });
  out.sort((a, b) => a.y - b.y);
  return { lista: out, state: window.__game?.state };
});

const clickText = (src, sel = 'button, .menu *, #titleMenu *, .extrasCard, .card, .btn, [onclick]') =>
  page.evaluate((sel, s) => {
    const rx = new RegExp(s, 'i');
    const el = [...document.querySelectorAll(sel)].find((b) => rx.test((b.textContent || '').trim()) && b.offsetParent !== null);
    if (el) { el.click(); return (el.textContent || '').trim().slice(0, 40); }
    return null;
  }, sel, src);

// --- pula a vinheta dos patrocinadores ---
for (let i = 0; i < 25; i++) {
  const st = await page.evaluate(() => ({ s: window.__game?.state, menu: !!document.querySelector('#titleMenu') && document.querySelector('#titleMenu').offsetParent !== null }));
  if (st.s === 'title' && st.menu) break;
  await page.keyboard.press('Space'); await sleep(700);
}
await sleep(1500);

const OUT = 'docs/refs/_debug';
fs.mkdirSync(OUT, { recursive: true });
const shots = [];
const shot = async (nome) => {
  const p = `${OUT}/nav_${nome}.png`;
  await page.screenshot({ path: p });
  shots.push(p);
  const info = await textosVisiveis();
  console.log('\n=== TELA ' + nome.toUpperCase() + ' (state=' + info.state + ') -> ' + p);
  info.lista.slice(0, 22).forEach((t) => console.log('    y=' + String(t.y).padStart(4) + ' x=' + String(t.x).padStart(4) + ' [' + t.tag + '] "' + t.t + '"'));
};

await shot('title');
console.log('  click EXTRA:', await clickText('^EXTRA$'));
await sleep(2500); await shot('extras');
console.log('  click LOJA:', await clickText('LOJA DE PONTOS'));
await sleep(2500); await shot('shop');
await page.keyboard.press('Escape'); await sleep(1800);
console.log('  click CONFIG:', await clickText('CONFIGURA'));
await sleep(2500); await shot('options');
await page.keyboard.press('Escape'); await sleep(1800);
console.log('  click CARREGAR:', await clickText('CARREGAR'));
await sleep(2500); await shot('load');

const ref = process.argv[2];
if (ref) {
  const { createCanvas, loadImage } = await import('@napi-rs/canvas');
  const hist = async (f) => {
    const img = await loadImage(f);
    const c = createCanvas(img.width, img.height); const ctx = c.getContext('2d');
    ctx.drawImage(img, 0, 0);
    const d = ctx.getImageData(0, 0, img.width, img.height).data;
    const h = new Float64Array(64); let n = 0;
    for (let i = 0; i < d.length; i += 4 * 5) { h[((d[i] >> 6) << 4) | ((d[i + 1] >> 6) << 2) | (d[i + 2] >> 6)]++; n++; }
    for (let i = 0; i < 64; i++) h[i] /= n;
    return h;
  };
  const href = await hist(ref);
  console.log('\n── DISTÂNCIA DE COR (0 = idêntico) vs ' + ref);
  const res = [];
  for (const p of shots) { const h = await hist(p); let s = 0; for (let i = 0; i < 64; i++) s += Math.abs(h[i] - href[i]); res.push([p, s]); }
  res.sort((a, b) => a[1] - b[1]);
  res.forEach(([p, s]) => console.log('   ' + s.toFixed(3) + '  ' + p));
  console.log('   → mais parecida: ' + res[0][0]);
}

await browser.disconnect(); child.kill('SIGKILL'); process.exit(0);
