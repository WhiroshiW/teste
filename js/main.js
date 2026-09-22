// ============================================================
// ECOS DO VAZIO - Boot
// ============================================================
import * as THREE from 'three';
import { Game } from './game.js';

function showErr(msg) {
  const e = document.getElementById('err');
  if (e) {
    e.classList.remove('hidden');
    e.textContent = 'ERRO: ' + msg;
  }
}

window.addEventListener('error', (ev) => {
  showErr(ev.message || 'falha desconhecida');
});

window.addEventListener('DOMContentLoaded', () => {
  try {
    const container = document.getElementById('screen');
    if (!container) throw new Error('elemento #screen não encontrado');
    if (!window.WebGLRenderingContext) throw new Error('WebGL não suportado neste navegador');
    new Game(THREE, container);
  } catch (err) {
    console.error(err);
    showErr(err.message);
  }
});
