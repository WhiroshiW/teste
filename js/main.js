// ============================================================
// SANTA LÚCIA - Equipe Nakamura - Boot
// ============================================================
import * as THREE from '../vendor/three.module.min.js';
import { Game } from './game.js?v=1924_1997_v54';

// CARIMBO DE BUILD: versão visível DENTRO do jogo (canto inferior) e no
// título da aba, vinda SEMPRE deste módulo (que carrega com timestamp
// fresco) — identifica a versão real rodando mesmo com HTML velho em cache.
const BUILD = 'v54';
if (typeof document !== 'undefined') {
  document.title = 'SANTA LÚCIA ' + BUILD;
  window.__BUILD = BUILD;
  const badge = document.createElement('div');
  badge.textContent = BUILD;
  badge.style.cssText = 'position:fixed;left:50%;transform:translateX(-50%);bottom:4px;z-index:999998;font:10px monospace;color:#9fe8a0;opacity:.55;text-shadow:0 1px 2px #000;pointer-events:none;';
  (document.body || document.documentElement).appendChild(badge);
  setInterval(() => {
    const d = window.__dbgFaca;
    badge.textContent = d
      ? BUILD + ' · faca ' + d.ang.toFixed(0) + '° aim' + d.aim + ' arm(' + d.ax + ',' + d.az + ') gun' + d.gx
      : BUILD;
  }, 200);
  console.log('%cSANTA LÚCIA ' + BUILD, 'color:#0f0;font-weight:bold');
}

function showErr(msg) {
  const e = document.getElementById('err');
  if (e) {
    e.className = '';
    e.style.cssText = 'position:fixed;top:12px;left:12px;right:12px;z-index:999999;background:#8b0000;color:#fff;padding:16px;border:3px solid #ff4d4d;font-family:monospace;font-size:14px;box-shadow:0 0 20px #000;line-height:1.5;';
    e.innerHTML = '<b>(!) ERRO DO JOGO:</b><br>' + msg;
  }
}

window.addEventListener('error', (ev) => {
  showErr(ev.message || 'falha desconhecida');
});

function boot() {
  try {
    const container = document.getElementById('screen');
    if (!container) throw new Error('elemento #screen não encontrado');
    if (!window.WebGLRenderingContext) throw new Error('WebGL não suportado neste navegador');
    window.__game = new Game(THREE, container);
  } catch (err) {
    console.error(err);
    showErr(err.message || String(err));
  }
}

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
