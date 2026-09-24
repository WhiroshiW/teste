# SANTA LÚCIA 🕯️
*Desenvolvido por Equipe Nakamura*

Um **survival horror 3D cinematográfico no autêntico estilo PlayStation 1** com **duas campanhas completas que se cruzam** (estilo Leon e Claire no Resident Evil 2 clássico/remake), alternância em tempo real entre **Câmera Fixa (PS1 Clássico)** e **3ª Pessoa (estilo GTA / Livre)**, **3 Modos Extras**, **Loja de Pontos Secretos**, **Galeria 3D de Modelos** e iluminação de alto contraste e legibilidade.

**Tema:** terror psicológico sobre **depressão, luto e culpa** com uma profunda mensagem de resiliência e esperança. (Apoio à vida: **CVV 188**.)

> Tudo é gerado em código procedural: texturas pixel-art, modelos low-poly com vertex wobble, áudio sintetizado via WebAudio e Three.js vendored em `vendor/`. Roda **100% offline** e com suporte a celular (touch controls).

---

## 📋 STATUS DO PROJETO: ETAPA 1 CONCLUÍDA

### ✅ O Que Foi Corrigido na Etapa 1 (Bugs Críticos):
1. **Remoção Absoluta de Menus ao Iniciar o Jogo:**
   - Criada rotina estrita `hideAllOverlays()` em `UI` e `Game` que desativa todos os elementos de `.overlay` do DOM (`document.querySelectorAll('.overlay')`).
   - A classe `.hidden` no CSS agora força `display: none !important; pointer-events: none !important; opacity: 0 !important; visibility: hidden !important;`.
   - Ao iniciar qualquer campanha (**Daniel** ou **Clara**), continuar save, ou iniciar modo extra, nem a tela de título nem a de seleção de campanha permanecem na frente do jogo.
2. **Causa Raiz de Tela Preta / Inicialização Eliminada:**
   - Three.js importado via caminho relativo direto (`../vendor/three.module.min.js`), eliminando dependência do `importmap` que falhava em iframes/webviews.
   - Fallback robusto no construtor do `WebGLRenderer` (tentativa em modo `default`, prevenção de falha por GPU).
   - Servidor local sem cache (`serve.py`) com headers `no-store, no-cache, must-revalidate` e scripts versionados com cache-busting.
   - Exceções de áudio silenciadas com `.catch(() => {})` em `AudioContext.resume()`.
3. **Bloqueio Total dos 3 Modos Extras:**
   - **The Mercenaries** (1.000 PTS), **Sobrevivente** (1.000 PTS) e **O Turno da Noite / Bento** (1.200 PTS) agora começam estritamente bloqueados.
   - Qualquer tentativa de início direto ou por atalho sem compra é interceptada com recusa sonora e aviso para adquirir na Loja de Pontos.
   - Cartões na tela de Modos Extras mostram etiquetas `🔒 BLOQUEADO` e botão dinâmico para abrir a Loja.
4. **Sincronia Rigorosa de Dublagem e Legenda:**
   - Alinhadas todas as falas de Daniel e Clara na introdução e no Encontro da Capela em `js/story.js`, garantindo correspondência 100% palavra por palavra com as faixas de áudio dubladas.
5. **Iluminação e Contraste Aprimorados:**
   - Brilho ambiente elevado para `0.85` e luz hemisférica para `0.65`.
   - Facho da lanterna aumentado para intensidade `14` e alcance `22m`.
   - Vinheta CRT suavizada no shader pós-processamento de PS1 (`psx.js`), eliminando a escuridão excessiva nas bordas da tela e garantindo que o jogador enxergue o cenário com nitidez mantendo o clima gótico de PS1.
6. **Integridade de Cenários, Pickups e Inventário:**
   - Corrigido bug crítico de descarte em `pickupAt`: o jogo agora verifica se o inventário está cheio antes de remover o item do cenário, impedindo que pickups sejam perdidos.
   - Auditadas todas as 8 salas 3D (posicionamento de pickups, portas, câmeras e sólidos).
7. **Renomeação Geral:**
   - Nome atualizado para **SANTA LÚCIA** e produtora para **Equipe Nakamura** em todos os menus, cabeçalhos, títulos e documentação.

---

### ⏳ O Que Ainda Está Pendente (Para as Próximas Etapas):
- [ ] **Etapa 2 e seguintes:**
  - Melhorias visuais e cinematográficas na tela inicial (dioramas avançados, transições artísticas).
  - Novas animações de introdução e cutscenes com câmera dinâmica.
  - Novos puzzles e expansão de lore dos diários.
  - Testes de balanceamento de combate e munição nos modos extras.
  - Polimento adicional solicitado nas próximas etapas.

---

## 🎮 Visão Geral das Campanhas

### 🌓 Duas Campanhas Principais Cruzadas (Estilo RE2 Clássico)
- **Campanha A — Daniel Silva (O Luto e a Busca):**
  - Acorda no Quarto 3 do Sanatório demolido, buscando vestígios e fragmentos de memória de sua falecida irmã Lúcia.
  - Armas: Faca, Pistola M9, Espingarda Cal.12.
- **Campanha B — Dra. Clara Mendes (A Investigação Médica):**
  - Psiquiatra que chega pela misteriosa Floresta após seu carro bater no portão externo. Busca dossiês confidenciais para denunciar os experimentos ilegais do Dr. Alencastro.
  - Armas: Bisturi Cirúrgico, Revólver .38, Lança-Granadas.
- **Encontro na Capela:** Daniel e Clara se encontram sob o vitral gótico, trocam pistas, chaves e revelações sobre o passado de Lúcia!

### 📷 Câmera Dupla em Tempo Real
- **Câmera Fixa Cinemática (PS1 Clássico):** ângulos dramáticos com corte por sala e leve tremor de mão.
- **Câmera em 3ª Pessoa (GTA / Livre / Over-the-Shoulder):** visão livre atrás do personagem para explorar os cenários em 360°!
- **Alterne a qualquer momento** apertando a tecla **V** ou **C**, pelo botão no HUD ou nas Opções!

---

## 🕹️ Controles

| Tecla | Ação |
|---|---|
| W / ↑ | Andar para frente |
| S / ↓ | Andar para trás |
| A / ← — D / → | Girar (controles tanque) |
| **V ou C** | **Alternar Câmera (Fixa PS1 / 3ª Pessoa GTA)** |
| SHIFT | Correr (segurar) |
| ESPAÇO | Mirar com a arma (segurar) |
| J / X / F ou clique | Disparar / golpear (enquanto mira) |
| E | Interagir / confirmar / avançar texto |
| TAB ou I | Abrir Inventário (com ECG) |
| Q | Examinar item selecionado |
| ESC ou P | Pausar jogo / Voltar em menus |

📱 No celular, botões touch e botão de câmera aparecem automaticamente.

---

## ▶️ Como Rodar

```bash
python3 serve.py
# Acesse http://localhost:8000
```

## 🧪 Testes Automatizados

```bash
node test/headless.mjs
```
