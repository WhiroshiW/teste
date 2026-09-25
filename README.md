# SANTA LÚCIA 🕯️
*Desenvolvido por Equipe Nakamura*

Um **survival horror 3D cinematográfico no autêntico estilo PlayStation 1** com **duas campanhas completas que se cruzam** (estilo Leon e Claire no clássico Resident Evil 2), alternância instantânea entre **Câmera Fixa Cinemática (PS1 Clássico com tracking dinâmico)** e **3ª Pessoa (estilo GTA / Livre)**, **3 Modos Extras**, **Loja de Pontos Secretos**, **Galeria 3D de Modelos Interativa** e iluminação de alto contraste e legibilidade.

**Tema:** Terror psicológico sobre **depressão, luto e culpa** com uma profunda mensagem de resiliência, cura e esperança. (Apoio à vida: **CVV 188**.)

> Produzido com gráficos procedurais autorais: texturas pixel-art feitas em canvas, modelos low-poly com vertex wobble retrô, trilha e efeitos sintetizados via WebAudio, leitor vocal em tempo real para as legendas e Three.js empacotado localmente em `vendor/`. Roda **100% offline** e com suporte completo a celular e tablets (touch controls adaptativos).

---

## 📋 STATUS DO PROJETO: REVISÃO GERAL E RIGOROSA DE VISIBILIDADE, CÂMERAS E PORTAS

### ✅ Correções Estruturais e Auditoria Completa:
1. **Sistema de Câmera Cinemática com Rastreamento Dinâmico (Estilo Silent Hill / Dino Crisis):**
   - Eliminado o problema de o personagem ficar invisível ou fora de enquadramento ao transicionar entre salas.
   - A câmera física permanece posicionada nos ângulos elevados pré-programados de cada canto, mas o ponto de mira (*lookAt*) interpola suavemente em direção ao tronco do personagem (`y = 1.25m`).
   - O jogador está **100% visível no centro da tela em todas as salas e em todas as portas do jogo**, sem risco de ficar atrás da câmera ou oculto por quinas de paredes.
2. **Revisão e Validação Rigorosa de Todas as Portas e Spawns (8 Salas):**
   - Testadas todas as conexões no Three.js real com cálculo de raio do jogador (`0.38m`) e frustum de projeção.
   - **Quarto 3:** Câmera 1 elevada no canto nordeste (`[4.2, 2.5, -3.2]`), com visão ampla da descida da porta e da janela.
   - **Saguão Principal:** Mapeamento em 4 quadrantes (`Sudoeste`, `Noroeste`, `Centro/Sul` e `Leste`), cobrindo as 6 portas sem pontos cegos.
   - **Enfermaria:** Câmera 0 reposicionada para o sul-centro (`[-4.5, 2.6, 2.6]`), eliminando o bug de câmera sobreposta à porta oeste.
   - **Consultório:** Câmeras elevadas no norte (`[-3.5, 2.5, -2.8]`), enquadrando frontalmente a entrada vinda da enfermaria.
   - **Porão:** Câmeras cobrindo a porta leste, a válvula central e o alçapão seguro em solo seco (`3.5, 4.2`).
   - **Terraço:** Câmeras elevadas na descida do elevador e no altar do memorial.
   - **Floresta & Jardins:** 4 quadrantes cobrindo o carro de Clara, a cabana do Bento, o cemitério e a entrada da Capela.
   - **Capela:** Câmeras cobrindo o confessionário, o altar do vitral e o corredor livre da porta lateral leste.
3. **Estabilidade de Shaders e Eliminação de Transparências Acidentais:**
   - Proteção de divisão por zero no vertex snap do PS1 (`if (gl_Position.w > 0.001)`) para evitar projeções corrompidas de vértices na câmera.
   - Isolamento de chaves de cache de programas na GPU por tipo e mapa (`psx-snap-map / psx-snap-nomap`), eliminando qualquer conflito de materiais entre o corpo e a cabeça do personagem.
   - Em `place(x, z, angle)`, todos os materiais do jogador têm opacidade e emissive forçados a `1.0` e `0.0`, prevenindo qualquer estado translúcido residual.
4. **Lanterna Dinâmica com Facho Universal:**
   - A lanterna posicional segue continuamente o tronco do jogador em tempo real em qualquer estado (`play`, `dialog`, `cutscene`), garantindo que ele nunca fique na escuridão total.
5. **Voz Exclusiva das Legendas (Sem MP3s Pré-Gravados):**
   - Removidos todos os arquivos MP3 de vozes pré-programadas e tags `voiceClip`.
   - Síntese de voz em tempo real via `speakSubtitle(text, who)` lendo diretamente cada linha de diálogo exibida na tela com vozes e timbres diferenciados.
   - Corte imediato (`stopVoice`) ao avançar o texto ou fechar a janela de diálogo.

---

## 🎮 Visão Geral das Campanhas

### 🌓 Duas Campanhas Principais Cruzadas (Estilo RE2 Clássico)
- **Campanha A — Daniel Silva (O Luto e a Busca):**
  - Acorda no Quarto 3 do Sanatório demolido, buscando vestígios e fragmentos de memória de sua falecida irmã Lúcia.
  - Armas: Faca de Combate, Pistola M9, Espingarda Cal.12.
- **Campanha B — Dra. Clara Mendes (A Investigação Médica):**
  - Psiquiatra forense que chega pela misteriosa Floresta após seu carro bater no portão externo. Busca dossiês confidenciais para denunciar os experimentos ilegais do Dr. Alencastro.
  - Armas: Bisturi Cirúrgico, Revólver .38 Especial, Lança-Granadas.
- **Encontro na Capela:** Daniel e Clara se encontram sob o vitral gótico, trocam pistas, chaves e revelações sobre o passado de Lúcia.

---

## 📷 Câmera Dupla em Tempo Real & Correções Críticas
- **Câmera Fixa Cinemática (PS1 Clássico com Rastreamento):** ângulos dramáticos de cinema com corte por quadrante e enquadramento dinâmico no tronco do protagonista. Todas as câmeras foram calibradas com verificação de frustum e livres de colisões com sólidos ou teto.
- **Câmera em 3ª Pessoa (GTA / Livre / Over-the-Shoulder):** visão dinâmica sobre o ombro do personagem com amortecimento suave, proteção contra paredes externas e colisão física esférica nos sólidos do cenário.
- **Alterne a qualquer momento** pressionando a tecla **V** ou **C**, pelo botão de câmera no HUD ou no menu de Opções.
- **Correção de Tela Preta nas Portas:** resolvido erro de propagação de ângulo de rotação (`srot`/`sa`) que gerava valores `NaN` na matriz de projeção da câmera e na rotação do jogador nas transições de portas. Todas as 18 passagens entre cenários agora possuem enquadramento imediato, coordenadas auditadas e proteção contra qualquer valor indefinido.

---

## 🕹️ Controles

| Tecla / Comando | Ação |
|---|---|
| W / ↑ | Andar para frente |
| S / ↓ | Andar para trás |
| A / ← — D / → | Girar personagem (controles tanque clássicos) |
| **V ou C** | **Alternar Câmera (Fixa PS1 / 3ª Pessoa Livre)** |
| SHIFT | Correr (segurar) |
| ESPAÇO | Mirar arma (segurar) |
| J / X / F ou clique | Disparar / atacar (enquanto mira) |
| E | Interagir / confirmar / avançar diálogo |
| TAB ou I | Abrir Inventário (com monitor ECG em tempo real) |
| Q | Examinar item selecionado no inventário |
| ESC ou P | Pausar jogo / Voltar nos menus |

📱 No celular e tablet, os botões virtuais na tela e botão de alternância de câmera surgem automaticamente.

---

## ▶️ Como Rodar Localmente

```bash
python3 serve.py
# Acesse http://localhost:8000 no navegador
```

## 🧪 Bateria de Testes Automatizados

```bash
node test/headless.mjs
```
