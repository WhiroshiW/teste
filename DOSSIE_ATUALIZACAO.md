# SANTA LÚCIA — Dossiê de Continuidade & Atualização
**Desenvolvedor:** Equipe Nakamura  
**Data:** 28 de Setembro de 2026  
**Status:** Remaster 3D, Menus Góticos, Vinheta RE Remake, Áudio Procedural e Transições Suaves Finalizados

---

## 1. O que foi feito nesta sessão

### A. Vinheta Cinemática dos Patrocinadores (Estilo Resident Evil Remake)
- **ChatGPT (`assets/sponsor_chatgpt.jpg`)**: Emblema monolítico em pedra e espinhos de ferro, estrela rubra central e legenda *"APOIANDO ESTE PROJETO — IDEIAS QUE GANHAM VIDA DE OUTRA FORMA"*. Efeito sonoro `sponsorChatGPT` com sub-grave profundo, ranger de portão de ferro centenário abrindo na neblina e sino sombrio.
- **Grok xAI (`assets/sponsor_grok.jpg`)**: Granito cinzento esculpido com sangue escorrendo, cruzeta em agulha sobre o "O" e arcos ogivais sob chuva. Efeito sonoro `sponsorGrok` com estalo de chicote de relâmpago atingindo a pedra, trovão ribombante, chuva batendo na rocha fria e nota pedal gravíssima de órgão gótico (36.7Hz).
- **Arena.ai / Equipe Nakamura (`assets/sponsor_arena.jpg`)**: Brasão de obsidiana imperial, coroa em coliseu, adagas cruzadas e núcleo dual em chamas frias (*"ARENA.AI · AGENT MODE · CO-PRODUZIDO COM EQUIPE NAKAMURA"*). Efeito sonoro `sponsorArena` com choque de lâminas de aço ressoando, crescendo espectral de coro gótico, impacto cinemático de fechamento e rajada de vento uivante.
- **Mecânica**: Animação `@keyframes sponsorPushZoom` com aproximação suave, vinheta analógica, grão de película, botão `[ ESPAÇO / CLIQUE ] PULAR` e botão de replay em **EXTRAS ➔ INTRO PATROCINADORES**.

### B. Novo Design de Menus e Telas (Baseado nos Desenhos)
1. **Menu Principal**: Diorama 3D à esquerda sob chuva e tempestade, e coluna lateral direita com exatamente 4 opções: `JOGAR`, `CARREGAR`, `CONFIGURAÇÕES`, `EXTRA`.
2. **Tela de Configurações**: Fundo de painel elétrico industrial (`assets/options_panel_bg.jpg`) com chaves, fusíveis e luzes piloto animadas.
3. **Tela de Extras & Loja de Pontos**: Estante de madeira com miniaturas/colecionáveis (`assets/extras_bg.jpg` e `assets/shop_bg.jpg`), mesa de investigação e visualizador 3D 360°.
4. **Tela de Carregar e Salvar**: 6 slots góticos com prontuários de 1924, mariposa *Acherontia atropos* e mecânica de fita de máquina de escrever.

### C. Design Sonoro Procedural (WebAudio Puro)
- **Chuva Contínua (`title_storm`)**: Ruído com filtragem dupla (bandpass 2600Hz para chiado de gotas + lowpass 1100Hz para massa d'água) e goteiras aleatórias em cornijas de pedra.
- **Vento Uivante da Mantiqueira**: Filtro ressonante com duplo LFO (0.065Hz de varredura de afinação entre 100Hz e 540Hz + 0.038Hz de modulação de respiração de volume).
- **Trovões Realistas**: Estalo de chicote inicial, sub-grave sísmico de 75Hz a 24Hz e eco reverberante nos desfiladeiros sincronizado com o relâmpago do diorama 3D.
- **Sino Fúnebre da Capela**: Toque solene a cada 32 segundos com harmônicos inarmônicos clássicos e terça menor gótica (110Hz, 131Hz, 164Hz, 220Hz).

### D. Transições Cinemáticas Suaves (*Premium*)
- Cortina radial `#screenCurtain` com fade suave de 280ms (`cubic-bezier(0.4, 0, 0.2, 1)`) que dissolve a escuridão entre todas as trocas de tela (`ui.transitionTo`).
- Efeito sonoro procedural `uiTransition` (deslocamento de ar frio sombrio).
- Animações CSS de entrada para abas, slots de save e cards de itens.

### E. Limpeza Agressiva de Cache
- Cabeçalho HTTP `Clear-Site-Data: "cache"` e `Cache-Control: no-store` em `serve.py`.
- Meta tags de no-cache e auto-purga de Service Workers no `<head>` de `index.html`.
- Versionamento `v=1924_1997_v5` com cache-busters dinâmicos.

---

## 2. Suíte de Testes (9 Suítes Aprovadas)
Execute para validar:
```bash
node test/headless.mjs && node test/test_new_menus.mjs && node test/test_save_load_screen.mjs && node test/test_linear_flow.mjs && node test/test_shop_and_extras.mjs && node test/test_particles_and_re_hud.mjs && node test/test_remastered_plant.mjs && node test/test_sponsor_intro.mjs && node test/test_screen_transitions.mjs
```
Todas as 9 suítes passam com 100% de sucesso.

---

## 3. Validação, Entrega e Correções (Sessão de 28/09/2026 — continuidade)

### A. Auditoria do Patch e do Snapshot
- `patch_etapa_re_remake.diff` auditado: a **parte textual aplica 100% limpa** sobre a base da Etapa 3 (commit `2670947`) com `git apply --check`. Os 6 binários de sponsors/backgrounds entram como stubs (`Binary files differ`), pois o patch foi gerado sem `--binary` — as artes finais estão versionadas em `assets/`.
- Snapshot do `main` (commit `88641c5`) conferido arquivo a arquivo: é exatamente **patch aplicado + binários + extras de download** (`baixar.html`, `download.html`, botões no `index.html` e este dossiê).
- Todos os itens do Dossiê (vinheta com skip/replay, menu de 4 opções, `#screenCurtain`, `uiTransition`, áudio procedural com LFO 0.065Hz, cabeçalhos `Clear-Site-Data`) foram verificados diretamente no código-fonte.

### B. Resultado dos Testes (executado nesta sessão)
| # | Suíte | Resultado |
|---|-------|-----------|
| 1 | `headless.mjs` | ✔ PASSOU |
| 2 | `test_new_menus.mjs` | ✔ PASSOU |
| 3 | `test_save_load_screen.mjs` | ✔ PASSOU |
| 4 | `test_linear_flow.mjs` | ✔ PASSOU |
| 5 | `test_shop_and_extras.mjs` | ✔ PASSOU |
| 6 | `test_particles_and_re_hud.mjs` | ✔ PASSOU |
| 7 | `test_remastered_plant.mjs` | ✔ PASSOU |
| 8 | `test_sponsor_intro.mjs` | ✔ PASSOU |
| 9 | `test_screen_transitions.mjs` | ✔ PASSOU |

**9/9 aprovadas — 100% de sucesso.**

### C. Correção Aplicada: Pacote de Download
- **Defeito encontrado:** `santa_lucia_remaster.zip` era referenciado por `index.html`, `baixar.html` e `download.html`, mas não existia no repositório (os botões retornavam 404).
- **Correção:** criado `tools/make_release_zip.py`, gerador determinístico do pacote (data fixa, sem `.git`, sem o próprio zip). Pacote regenerado na raiz com 40 arquivos, ~2.7 MB — consistente com o "~2.8 MB" anunciado nas páginas de download.
- **Regeneração após qualquer alteração do projeto:**
```bash
python3 tools/make_release_zip.py
```

> **⚠️ Nota de encerramento (limpeza posterior):** com a decisão de design de **remover todos os botões de download** da tela de título e das configurações, os itens abaixo foram apagados do projeto nesta mesma branch:
> - `baixar.html` e `download.html` (páginas de download órfãs)
> - `santa_lucia_remaster.zip` (sem mais botões que o sirvam)
> - `tools/make_release_zip.py` (gerador sem mais pacote a gerar)
> - `vendor/three.module.js` (Three.js não-minificado de 1,27 MB sem nenhuma referência — o import map usa apenas `three.module.min.js`)
>
> Todo o conteúdo permanece recuperável pelo histórico do Git. O **backup do gerador do mapa 3D** (`js/world.js`, 21 ambientes) está em `backup/` (local, fora do versionamento) e cada versão commitada do arquivo fica preservada no histórico da branch.
