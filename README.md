# SANTA LÚCIA 🕯️
*Desenvolvido por Equipe Nakamura*

Um **survival horror 3D cinematográfico no autêntico estilo PlayStation 1** com **duas campanhas completas que se cruzam** (estilo Leon e Claire no clássico Resident Evil 2), alternância instantânea entre **Câmera Fixa Cinemática (PS1 Clássico com tracking dinâmico)** e **3ª Pessoa (estilo GTA / Livre)**, **3 Modos Extras**, **Loja de Pontos Secretos**, **Galeria 3D de Modelos Interativa** e iluminação de alto contraste e legibilidade.

**Tema:** Terror psicológico sobre **depressão, luto e culpa** com uma profunda mensagem de resiliência, cura e esperança. (Apoio à vida: **CVV 188**.)

> Produzido com gráficos procedurais autorais: texturas pixel-art feitas em canvas, modelos low-poly com vertex wobble retrô, trilha e efeitos sintetizados via WebAudio, leitor vocal em tempo real para as legendas e Three.js empacotado localmente em `vendor/`. Roda **100% offline** e com suporte completo a celular e tablets (touch controls adaptativos).

---

## 📋 ETAPA 3: POLIMENTO FINAL, FLUXO LINEAR E CONTEÚDO EXTRA

### ✅ 1. Auditoria e Correção Completa do Fluxo de Jogo (Zero Bloqueios / Zero Softlocks):
1. **Destrancamento Permanente de Portas (`useDoor`):**
   - Corrigido o bug onde portas com consumo de chave (`consume: true`) continuavam exigindo a chave após serem destrancadas, impedindo o retorno do jogador se ele não a tivesse mais.
   - Implementada a checagem `if (door.setFlag && this.flags[door.setFlag])`: portas já abertas permanecem destrancadas permanentemente em todas as salas.
   - Suporte a chaves de campanha alternativas: Dra. Clara usa seu **Cartão Magnético Médico** para liberar o consultório; Zelador Bento usa sua **Chave Mestra** para transitar pelas caldeiras e passagens de serviço.
   - Feedback sonoro clássico (`puzzle`) e mensagem narrada ao destravar a fechadura.
2. **Resolução de Softlock no Cofre Secreto:**
   - O código especial Resident Evil 1996 (`1996`) agora abre um compartimento secreto clássico (concedendo Balas Magnum e Frasco de Luz) sem travar `safeOpened = true`. O cofre principal permanece acessível para a combinação canônica da gaveta (`1402`), garantindo a obtenção da **Chave do Porão** (`basekey`).
3. **Persistência da Drenagem de Água no Porão:**
   - Ao drenar a água com a Manivela de Ferro na válvula, os sólidos com tag `'water'` e a malha de água são removidos.
   - `loadRoom('porao')` agora verifica `flags.valveOpen`, garantindo que o solo do porão continue permanentemente seco e desobstruído ao entrar e sair da sala.
4. **Inventário Estilo Resident Evil Clássico & Sistema de Combinação:**
   - Maleta de sobrevivência com acabamento chanfrado PS1 (`border: 4px outset #5a647d`), slots nítidos e monitor **ECG** hospitalar animado em tempo real com CRT scanlines e frequência cardíaca em BPM.
   - **Sistema de Combinação Autêntico (COMBINAR):** botão dedicado na maleta que permite combinar munição com armas de fogo (recarregando e preparando a arma) e agrupar doses de remédios e fitas.
   - **Uso / Equipar Rápido (Duplo Clique / ENTER):** dê 2 cliques em qualquer remédio para curar instantaneamente ou em qualquer arma para equipar sem burocracia.
   - Fragmentos de Memória (`frag`) agora empilham em um **único slot**, liberando espaço vital na maleta de 12 slots.
5. **Máquina de Escrever & Salvamento Estilo Resident Evil Clássico:**
   - Redesenhada como uma ficha clínica datilografada autêntica de 1997 do arquivo confidencial do Sanatório Santa Lúcia.
   - Exibe em tempo real o Sobrevivente, Sala Atual, Tempo Decorrido, Contagem de Salvamentos e Fitas de Tinta restantes.
   - Efeito sonoro percussivo de datilografia e sino (*ding!*) acompanhado do carimbo vermelho em relevo escarlate **[ARQUIVADO]** que bate na folha ao salvar.
6. **Eliminação de Resíduos de Partículas no Mapa:**
   - Partículas mortas (`life <= 0`) agora são imediatamente descartadas para fora do frustum da câmera (`y = -9999`), impedindo que pontos fiquem congelados no chão poluindo o cenário.
   - `loadRoom()` e `resetRun()` executam limpeza total imediata (`clear()`) em todas as transições de cenários.
7. **Novos Inimigos & Maior Tensão na Campanha de Daniel:**
   - **Paciente Contorcido (`infectado`):** internos do sanatório em camisas de força arrebentadas, com marcha espasmódica e investidas ferozes.
   - **Sombra Cirúrgica (`enfermeira`):** enfermeiras corrompidas com aventais manchados, toucas hospitalares e bisturis afiados que atacam no corpo a corpo.
   - **Amálgama de Cinzas (`aberracao`):** criatura carbonizada resistente que emergiu das fornalhas do porão, com carvão em brasa ardente no peito.
   - Densidade de inimigos expandida estrategicamente no Saguão, Enfermaria, Consultório e Porão para combates tensos e gratificantes.
8. **HUD Tático de Gameplay:**
   - Monitor de pulso cardíaco no canto inferior esquerdo com status clássico de sobrevivência: `[FINE]` verde, `[CAUTION]` amarelo e `[DANGER]` vermelho pulsante.
   - Caixa de munição tática chanfrada no canto inferior direito com nome da arma ativa em dourado, ícone e mostrador digital limpo (`15 / 60`).
   - Título cinematográfico de locação com subtítulo ao entrar em qualquer sala (`roomNameBanner`).

---

## 🎭 Cutscenes e Dublagem em Tempo Real

- **Dublagem Exclusiva das Legendas:** em conformidade com o direcionamento do projeto, foram eliminados todos os áudios pré-programados de arquivos MP3 externos. Toda a narrativa e diálogos são dublados dinamicamente via síntese de voz (Web Speech Synthesis API em `pt-BR`) em perfeita sincronia com as legendas.
- **Timbres e Afinações Personalizadas:**
  - **Daniel Silva:** tom reflexivo e equilibrado (`pitch: 1.0, rate: 1.0`).
  - **Dra. Clara Mendes:** voz articulada e ágil (`pitch: 1.25, rate: 1.05`).
  - **Zelador Bento:** voz grave e cansada de idoso (`pitch: 0.72, rate: 0.95`).
  - **Vulto / Dr. Alencastro:** frequências ressonantes sombrias (`pitch: 0.55, rate: 0.85`).
  - **Lúcia:** suave e etérea (`pitch: 1.35, rate: 0.92`).
  - **Narrador:** tom neutro clássico de adventure investigativo.
- **Corte Imediato de Áudio (`stopVoice`):** ao avançar diálogos, fechar janelas ou mudar de cena, a fala anterior é pausada instantaneamente para prevenir sobreposição acústica.

---

## 🏆 Modos Extras e Loja Secreta

### 1. The Mercenaries (⏱️ Contra o Relógio)
- Combate cronometrado no Saguão do Sanatório.
- Elimine monstros para acumular pontuação, quebre cristais totêmicos para estender o cronômetro (+30 segundos) e encadeie sequências de eliminações para multiplicar seus bônus de combo até o Rank S e SS.

### 2. Modo Sobrevivente (🛡️ Ondas Infinitas)
- Sobrevivência desafiadora na Floresta Noturna sob tempestade torrencial.
- Enfrente levas sucessivas com aumento progressivo de dificuldade, gerenciando munição e cura a cada onda superada.

### 3. O Turno da Noite (🗝️ Campanha Extra de Bento)
- Jogue como o **Zelador Bento**, armado com Chave Inglesa e Pistola nas profundezas do Porão.
- Confronte as aberrações que escaparam dos laboratórios e garanta a contenção das caldeiras.

### 4. Loja de Pontos Secretos & Galeria 3D
- Acumule pontos jogando as campanhas e modos extras para adquirir:
  - Modos Extras (`Mercenários`, `Sobrevivente`, `Turno de Bento`).
  - Vantagens (`Munição Infinita`, `Magnum .44`, `Lança-Granadas Tático`, `Fita Infinita`).
  - Trajes Alternativos (`Daniel Tático`, `Clara Investigadora`).
  - **Galeria 3D de Modelos:** visualizador interativo em 360° com rotação, zoom e prontuários biográficos de todos os personagens e criaturas do jogo.

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

## 📷 Câmera Dupla em Tempo Real
- **Câmera Fixa Cinemática (PS1 Clássico com Rastreamento):** ângulos dramáticos de cinema com corte por quadrante e enquadramento dinâmico no tronco do protagonista. Todas as câmeras foram calibradas com verificação de frustum e livres de colisões com sólidos ou teto.
- **Câmera em 3ª Pessoa (GTA / Livre / Over-the-Shoulder):** visão dinâmica sobre o ombro do personagem com amortecimento suave, proteção contra paredes externas e colisão física esférica nos sólidos do cenário.
- **Alterne a qualquer momento** pressionando a tecla **V** ou **C**, pelo botão de câmera no HUD ou no menu de Opções.

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

O projeto conta com suítes de testes automatizados com cobertura completa de gráficos, geometria, fluxo linear e persistência:

```bash
# 1. Teste de conformidade de salas, câmeras, shaders PS1, UI e colisões
node test/headless.mjs

# 2. Teste de fluxo linear ponta a ponta (Quarto -> Saguão -> Enfermaria -> Consultório -> Porão -> Terraço -> Final)
node test/test_linear_flow.mjs

# 3. Teste de compra, persistência e inicialização da Loja Secreta e Modos Extras
node test/test_shop_and_extras.mjs

# 4. Teste de partículas limpas, novos inimigos e HUD clássico de Resident Evil
node test/test_particles_and_re_hud.mjs
```

