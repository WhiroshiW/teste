// ============================================================
// OLHOS DE VERDADE — chromium headless fotografando o DOM/canvas REAL
// (Equipe Nakamura) · uso: node tools/_shot.mjs <cena> [heroi]
//   cenas: title · play · inventory · map
// Requer servidor: python3 serve.py (porta 8000)
// ============================================================
import puppeteer from 'puppeteer-core';
import { spawn } from 'node:child_process';
import { brotliDecompressSync } from 'node:zlib';
import fs from 'node:fs';

process.env.LD_LIBRARY_PATH = '/tmp/al2libs/lib:/tmp/al2swift';

// --- prepara libs (uma vez; fica em /tmp, fora do git) ---
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
const exePath = await chromium.executablePath(); // extrai /tmp/chromium

// --- sobe o browser na mão e captura a URL de debug ---
const child = spawn(exePath, [
  '--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage',
  '--no-zygote', '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
  '--remote-debugging-port=0', 'about:blank',
], { env: process.env, stdio: ['ignore', 'ignore', 'pipe'] });

const wsUrl = await new Promise((res, rej) => {
  let buf = '';
  const t = setTimeout(() => rej(new Error('browser não abriu DevTools em 40s')), 40000);
  child.stderr.on('data', (d) => {
    buf += d.toString();
    const m = buf.match(/DevTools listening on (ws:\/\/\S+)/);
    if (m) { clearTimeout(t); res(m[1]); }
  });
});

const browser = await puppeteer.connect({ browserWSEndpoint: wsUrl, protocolTimeout: 120000 });
const page = (await browser.pages())[0] || await browser.newPage();
await page.setViewport({ width: 1280, height: 720 });
page.on('pageerror', (e) => console.log('PAGEERROR:', e.message.slice(0, 140)));

await page.goto('http://127.0.0.1:8000/', { waitUntil: 'networkidle2', timeout: 90000 });
await new Promise((r) => setTimeout(r, 3000));
console.log('BUILD:', await page.evaluate(() => window.BUILD_TAG || '(sem tag)'));
console.log('WEBGL:', await page.evaluate(() => {
  const c = document.createElement('canvas');
  const g = c.getContext('webgl2') || c.getContext('webgl');
  if (!g) return '❌ sem webgl';
  const ext = g.getExtension('WEBGL_debug_renderer_info');
  return ext ? g.getParameter(ext.UNMASKED_RENDERER_WEBGL) : 'webgl (renderer oculto)';
}));

const scene = process.argv[2] || 'title';
const hero = process.argv[3] || 'daniel';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const clickText = (sel, re) => page.evaluate((sel, re) => {
  const el = [...document.querySelectorAll(sel)].find((b) => new RegExp(re).test(b.textContent));
  if (el) el.click();
  return !!el;
}, sel, re);
const hudVisivel = () => page.evaluate(() => {
  const h = document.getElementById('hud');
  return h && !h.classList.contains('hidden');
});

if (scene !== 'title') {
  console.log('clique JOGAR:', await clickText('#titleMenu *, .menu *', '^JOGAR$'));
  for (let i = 0; i < 10; i++) {
    if (await page.evaluate(() => { const b = document.getElementById('btnSelectDaniel'); return b && !b.closest('.hidden') && b.offsetParent !== null; })) break;
    await sleep(600);
  }
  await page.click('#btnSelectDaniel').catch(async () => { await clickText('.campBtn', 'DANIEL'); });
  for (let i = 0; i < 30 && !(await hudVisivel()); i++) await sleep(700);
  console.log('HUD visível:', await hudVisivel());
  // descarta TODA a cadeia de diálogos/banners (espera state==='play' estável)
  for (let i = 0; i < 40; i++) {
    const st = await page.evaluate(() => window.__game?.state);
    if (st === 'play') {
      const ainda = await page.evaluate(() => ['dialog','banner','choiceBox'].some((id) => {
        const el = document.getElementById(id);
        return el && !el.classList.contains('hidden');
      }));
      if (!ainda) { await sleep(1200); if ((await page.evaluate(() => window.__game?.state)) === 'play') break; }
    }
    await page.keyboard.press('Enter');
    await sleep(800);
  }
  console.log('pós-intro:', await page.evaluate(() => window.__game?.state));
  await sleep(2000); // deixa a sala renderizar
}
if (scene === 'inventory' || scene === 'map') {
  await page.evaluate((isMap) => window.__game.openInventory(isMap), scene === 'map');
  await sleep(1200);
  if (scene === 'inventory') { await page.keyboard.press('Enter'); await sleep(700); } // cmds do 1º item
}
console.log('estado:', await page.evaluate(() => window.__game?.state + ' · cam=' + window.__game?.camMode));
fs.mkdirSync('docs/refs/_debug', { recursive: true });
const name = `docs/refs/_debug/shot_${scene}.png`;
await page.screenshot({ path: name });
console.log('SALVO:', name);
await browser.disconnect();
child.kill('SIGKILL');
process.exit(0);
