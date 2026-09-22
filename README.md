# ECOS DO VAZIO 🕯️

Um **survival horror 3D estilo Resident Evil clássico de PS1**, feito como se fosse para o PlayStation 1 de verdade: **câmeras fixas**, **controles tanque**, portas com animação, máquina de escrever (diário + fitas de tinta), puzzles, munição escassa e dois finais.

**Tema:** terror psicológico sobre **depressão, luto e culpa** — com uma mensagem de esperança. (Se a escuridão pesar: **CVV 188**.)

> Tudo é gerado em código: texturas pixel-art procedurais, modelos low-poly, músicas e efeitos 100% sintetizados via WebAudio. Zero assets externos. O Three.js vai vendored em `vendor/` — o jogo roda **offline**.

## ▶️ Como jogar

Sirva a pasta com qualquer servidor estático e abra no navegador:

```bash
python3 -m http.server 8000
# abra http://localhost:8000
```

(Ou use a Live Preview do Arena.)

## 🎮 Controles

| Tecla | Ação |
|---|---|
| W / ↑ | Andar para frente |
| S / ↓ | Andar para trás |
| A / ← — D / → | Girar (controles tanque) |
| SHIFT | Correr (segurar) |
| ESPAÇO | Mirar com a arma (segurar) |
| J / X / F ou clique | Atirar (enquanto mira) |
| E | Interagir / confirmar / avançar texto |
| TAB ou I | Inventário |
| Q | Examinar item (no inventário) |
| ESC ou P | Pausar |

📱 No celular, controles touch aparecem automaticamente.

## 🕹️ O jogo

- **6 cenários 3D**: Quarto 3, Saguão Principal, Enfermaria, Consultório, Porão e Terraço (com chuva e relâmpagos).
- **Câmeras fixas** que cortam como no RE1, com tremor de mão.
- **Inimigos**: Sombras, Lamentos e o chefe **VULTO** (com investidas).
- **Armas**: Faca Enferrujada, Pistola M9 e Espingarda, com mira automática.
- **Puzzles**: chave escondida, gaveta, cofre com senha, fusível/energia, manivela/válvula, 4 Fragmentos de Memória.
- **História completa**: intro, 8 páginas de diário, poemas, bilhetes e **2 finais** (normal + verdadeiro).
- **Sistema RE**: status FINO/CUIDADO/PERIGO, save no diário com Fita de Tinta, rank S/A/B/C por tempo e saves.
- **Estética PS1**: render em baixa resolução, vertex wobble, dithering Bayer, cor 15-bit, scanlines e vinheta.

### 💡 Dicas (spoilers!)

- A chave da gaveta está **sob o travesseiro** (examine a cama).
- A senha do cofre é o **aniversário de Lúcia**: 14 de fevereiro.
- Fragmentos: **urso do quarto**, armário da enfermaria, atrás do retrato no consultório, engradado do porão (drene a água!).
- O **Fusível** está no consultório; o **quadro de força**, na enfermaria.
- Munição é escassa — **correr** também é estratégia.

## 🧪 Testes

```bash
node test/headless.mjs   # salas, entidades, texturas, UI (Three.js real, DOM stub)
```

## 📁 Estrutura

```
index.html          todas as telas (título, HUD, inventário, diálogos…)
css/style.css       visual retrô + scanlines + touch
js/main.js          boot
js/game.js          laço, estados, combate, puzzles, save/load
js/world.js         os 6 cenários 3D, câmeras, colisões, portas
js/entities.js      jogador, inimigos (IA), partículas, colisão
js/textures.js      47 texturas procedurais + retratos pixel-art
js/audio.js         SFX + ambientes + músicas sintetizados
js/psx.js           pós-processamento PS1 (low-res, dither, wobble)
js/story.js         roteiro, diário, objetivos, finais
js/ui.js            HUD, menus, inventário, cofre, animação de porta
js/config.js        itens, armas, inimigos, rank
vendor/             three.module.min.js (offline)
test/headless.mjs   suite de testes
```

Feito com 💠 carinho — e lembre-se: **pedir ajuda é resistir.**
