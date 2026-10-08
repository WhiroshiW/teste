// ============================================================
// SANTA LÚCIA — Biblioteca de Ícones SVG (Equipe Nakamura)
// Traço fino gótico, monocromático, herdando a cor do texto
// (currentColor). Os símbolos vivem no <defs> do index.html
// (#iconSprite) e são referenciados via <use href="#i-NOME">.
//
// Uso nos menus/toasts/HUD (sempre via innerHTML):
//   import { icon } from './icons.js?v=1924_1997_v54';
//   el.innerHTML = `${icon('key')} Chave Pequena`;
// ============================================================

/** Tokens válidos (devem existir como #i-<token> no sprite). */
export const ICONS = [
  // Armas
  'knife', 'scalpel', 'wrench', 'crowbar', 'handgun', 'revolver',
  'shotgun', 'launcher', 'magnum',
  // Munições
  'ammo9', 'shell', 'grenade',
  // Cura e utilitários
  'pills', 'flask', 'syringe', 'ribbon',
  // Chaves e quebra-cabeças
  'key', 'key-master', 'key-cross', 'key-ornate', 'keycard', 'fuse', 'crank',
  // Documentos e relíquias
  'page', 'folder', 'shard', 'locket', 'talisman', 'crest', 'shield',
  // Interface
  'gear', 'bolt', 'alert', 'lock', 'unlock',
  'camera', 'gamepad', 'keyboard', 'speaker', 'monitor', 'globe', 'sync', 'bulb',
  'star', 'heart', 'fire', 'box', 'gem', 'sparkle',
  'timer', 'infinity', 'bust', 'vhs', 'outfit',
];

const VALID = new Set(ICONS);

/**
 * Retorna o markup SVG do ícone solicitado.
 * @param {string} name token do ícone (ex.: 'key', 'handgun')
 * @param {string} [cls] classes extras opcionais
 */
export function icon(name, cls = '') {
  const token = VALID.has(name) ? name : 'star';
  return `<svg class="ic${cls ? ' ' + cls : ''}" aria-hidden="true"><use href="#i-${token}"></use></svg>`;
}
