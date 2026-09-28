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
