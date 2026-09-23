// ============================================================
// ECOS DO VAZIO - Boot
// ============================================================
import * as THREE from '../vendor/three.module.min.js';
import { Game } from './game.js';

function showErr(msg) {
  const e = document.getElementById('err');
  if (e) {
    e.className = '';
    e.style.cssText = 'position:fixed;top:12px;left:12px;right:12px;z-index:999999;background:#8b0000;color:#fff;padding:16px;border:3px solid #ff4d4d;font-family:monospace;font-size:14px;box-shadow:0 0 20px #000;line-height:1.5;';
    e.innerHTML = '<b>⚠️ ERRO DO JOGO:</b><br>' + msg;
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
