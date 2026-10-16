// _probe.mjs — sonda o DOM real (temporário): o que está visível e com quais cores
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
  let buf = ''; const t = setTimeout(() => rej(new Error('timeout')), 40000);
  child.stderr.on('data', (d) => { buf += d.toString(); const m = buf.match(/DevTools listening on (ws:\/\/\S+)/); if (m) { clearTimeout(t); res(m[1]); } });
});
const browser = await puppeteer.connect({ browserWSEndpoint: wsUrl, protocolTimeout: 120000 });
const page = (await browser.pages())[0] || await browser.newPage();
await page.setViewport({ width: +(process.env.VW||1280), height: +(process.env.VH||720) });
page.on('console', (m) => { if (m.type() === 'error') console.log('CONSOLE-ERR:', m.text().slice(0, 160)); });
page.on('requestfailed', (r) => console.log('REQ-FAILED:', r.url().slice(0, 120), r.failure()?.errorText));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
await page.goto('http://127.0.0.1:8000/', { waitUntil: 'networkidle2', timeout: 90000 });
await sleep(3000);

const alvo = process.argv[2] || 'inventory';
if (alvo !== 'title') {
  await page.evaluate(() => {
    const el = [...document.querySelectorAll('#titleMenu *, .menu *')].find((b) => /^JOGAR$/.test(b.textContent));
    if (el) el.click();
  });
  await sleep(2500);
  await page.click('#btnSelectDaniel').catch(async () => {
    await page.evaluate(() => { const b = [...document.querySelectorAll('.campBtn')].find((x) => /DANIEL/.test(x.textContent)); if (b) b.click(); });
  });
  for (let i = 0; i < 40; i++) {
    const st = await page.evaluate(() => window.__game?.state);
    if (st === 'play') {
      const ainda = await page.evaluate(() => ['dialog', 'banner', 'choiceBox'].some((id) => {
        const el = document.getElementById(id); return el && !el.classList.contains('hidden');
      }));
      if (!ainda) { await sleep(1000); if ((await page.evaluate(() => window.__game?.state)) === 'play') break; }
    }
    await page.keyboard.press('Enter'); await sleep(700);
  }
  await sleep(2000);
}
if (alvo === 'inventory' || alvo === 'map') {
  await page.evaluate((isMap) => window.__game.openInventory(isMap), alvo === 'map');
  await sleep(1500);
  if (alvo === 'inventory') { await page.keyboard.press('Enter'); await sleep(800); }
}

const info = await page.evaluate(() => {
  const pick = (sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const r = el.getBoundingClientRect(); const cs = getComputedStyle(el);
    return { sel, rect: [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)],
      display: cs.display, visibility: cs.visibility, opacity: cs.opacity, zIndex: cs.zIndex,
      bg: cs.backgroundColor, bgImage: cs.backgroundImage.slice(0, 60), color: cs.color };
  };
  const sels = ['.panel.inv.reInv', '.invMain.v2', '.invProfile', '.invGridWrap', '#invGrid', '#invPortrait',
    '.invSide', '.invDetail', '.ecgMonitor', '#ecgCanvas', '.invVoltar', '.invFoot', '#hud', '#inventory'];
  const out = { state: window.__game?.state, overlays: [], candidates: [] };
  for (const s of sels) { const p = pick(s); if (p) out.candidates.push(p); }
  const grid = document.getElementById('invGrid');
  if (grid) {
    out.gridInfo = {
      children: grid.children.length,
      cols: getComputedStyle(grid).gridTemplateColumns,
      rects: [...grid.children].slice(0, 4).map((c) => {
        const r = c.getBoundingClientRect();
        return [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height), (c.textContent || '').trim().slice(0, 12)];
      }),
    };
  }
  const inv = document.querySelector('.panel.inv.reInv');
  if (inv) out.panelWidth = inv.getBoundingClientRect().width;
  document.querySelectorAll('body *').forEach((el) => {
    const cs = getComputedStyle(el); const r = el.getBoundingClientRect();
    if (cs.position === 'fixed' || cs.position === 'absolute') {
      if (r.width > 200 && r.height > 150 && cs.display !== 'none' && cs.visibility !== 'hidden' && +cs.opacity > 0.05) {
        out.overlays.push({ tag: el.tagName + (el.id ? '#' + el.id : '') + (el.className && typeof el.className === 'string' ? '.' + el.className.split(' ')[0] : ''),
          rect: [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)], z: cs.zIndex, op: cs.opacity, bg: cs.backgroundColor });
      }
    }
  });
  out.overlays = out.overlays.slice(0, 25);
  return out;
});
console.log('STATE:', info.state);
console.log('PAINEL largura:', info.panelWidth); console.log('GRID:', JSON.stringify(info.gridInfo)); console.log('CANDIDATOS:', JSON.stringify(info.candidates.map(c=>c.sel+' -> '+JSON.stringify(c.rect))));
console.log('OVERLAYS VISÍVEIS:', JSON.stringify(info.overlays, null, 1));

fs.mkdirSync('docs/refs/_debug', { recursive: true });
await page.screenshot({ path: `docs/refs/_debug/probe_${alvo}.png` });
console.log('SALVO: docs/refs/_debug/probe_' + alvo + '.png');
await browser.disconnect(); child.kill('SIGKILL'); process.exit(0);
