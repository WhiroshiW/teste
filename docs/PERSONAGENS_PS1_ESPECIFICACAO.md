# SANTA LÚCIA — ESPECIFICAÇÃO DE MODELOS 3D PS1 (Equipe Nakamura)
**Documento de produção para modelagem externa (IA/3Dista) · v1.0 · 28/09/2026**
Objetivo: orientar a criação dos modelos low-poly estilo PlayStation 1 de TODOS os personagens do jogo. O modelo final será integrado ao motor Three.js do jogo (importação GLB), substituindo os bonecos procedurais atuais.

---

## 1. PADRÃO TÉCNICO GLOBAL (vale para TODOS os modelos)

### 1.1 Estilo visual
- **Estética PS1 autêntica (1996–1998, estilo Resident Evil 1/2/3, Silent Hill 1):**
  - Low-poly com formas chunky e legíveis; **silhueta clara** > detalhe.
  - **Texturas pixel-art** pintadas à mão (visual de textura de PS1, com dithering sutil permitido).
  - **SEM suavização (smoothing/AA)** nas texturas; visual "crocante".
  - Rosto com olhos brilhantes emitindo luz nos inimigos (o motor já aplica glow).
- Iluminação é feita no motor (luzes dinâmicas + névoa); os materiais devem ser **Lambert/Standard foscos** (roughness ~1, metalness 0), **exceto olhos** (material emissivo/unlit).

### 1.2 Malha e orçamento de polígonos
| Classe | Triângulos (máx.) | Textura |
|---|---|---|
| Herói jogável (corpo) | 900 tris | 128×128 (atlas único) |
| NPC importante (Lúcia, Dr. Matias) | 700 tris | 128×128 |
| Inimigo padrão | 500 tris | 128×128 |
| Bruto / Carrasco / Aberração | 800 tris | 128×128 |
| Chefe (Vulto / Alencastro) | 1.200 tris | 256×256 |
| Cão / Rastejador | 400 tris | 128×128 |
| Armas em primeira mão (acessório) | 150 tris cada | 64×64 |

- Malha **triangulada**, sem ngons, sem vértices soltos.
- **1 único material/textura por personagem** (atlas UV), para manter 1 draw call.
- Módulo de cabeça/tronco/braços/pernas separados na hierarquia (ver 1.4).

### 1.3 Texturas
- Formato: **PNG**, fundo já pintado (sem canal alfa no corpo; alfa só para capas/bandeirolas).
- Paleta máx. **32 cores** por personagem (paleta fechada, tom sujo/dessaturado).
- Não usar gradientes suaves; usar bandas de cor/dithering.
- **Olhos brilhantes**: pintar num cantinho do atlas em cor saturada pura (a cor exata de cada criatura está na ficha de cada uma) — o motor aplica emissivo.
- Nome do arquivo: `tex_<nome>.png` (ex.: `tex_daniel.png`, `tex_vulto.png`).

### 1.4 Hierarquia / Rig
```
<raiz>                ← pivô NO CHÃO, entre os pés (Y=0)
 ├─ hips
 │   ├─ leg_L / leg_R (com joelho simples se possível)
 │   └─ spine
 │       ├─ arm_L / arm_R (ombro + cotovelo simples)
 │       │   └─ hand_R   ← osso OBRIGATÓRIO com esse nome (arma encaixa aqui)
 │       └─ head
 └─ (vestes/capuz/tentáculos como filhos de spine)
```
- Convenções: **Y para cima**, personagem de frente para **+Z**, escala em **metros**.
- Rig simples de 8–12 ossos basta (PS1 não tinha skinning pesado); blender-per-character.
- Alternativa aceitável: modelo **segmentado por peças** (estilo boneco de PS1 real: antebraço, braço, coxa etc. como meshes separadas parentadas), sem skin weights.

### 1.5 Animações (nomes EXATOS dos clips no GLB)
| Clip | Uso no jogo | Todos têm? |
|---|---|---|
| `idle` | parado, respiração/balanço sutil | ✔ obrigatório |
| `walk` | caminhada/perseguição | ✔ obrigatório |
| `attack` | golpe/disparo do inimigo ou herói | ✔ obrigatório |
| `hurt` | dano recebido (recoil curto) | ✔ obrigatório |
| `death` | morte (desmoronar/dissolver) | ✔ obrigatório |
| `scream` | bosses: grito de ativação | só bosses |
| `crawl` | rastejador: locomoção quadrúpede | só rastejador |
| `sprint` | cão/lamento: investida | só velozes |
- Taxa alvo: 10–15 fps de keyframes (era PS1); sem interpolação polida demais.
- Loop correto em idle/walk; attack/hurt/death one-shot.

### 1.6 Formato de entrega
- **.GLB** (glTF binário) com texturas embutidas; **sem compressão Draco**.
- Um GLB por personagem: `modelo_<nome>.glb` (ex.: `modelo_daniel.glb`).
- Nome do arquivo = id interno listado nas fichas abaixo.

---

## 2. HERÓIS JOGÁVEIS

### 2.1 DANIEL SILVA — `modelo_daniel.glb`
- **Quem é:** Protagonista da Campanha A, 27 anos. Acordou internado no Sanatório Santa Lúcia aos 17; procura a irmã Lúcia. Cansaço e luto no olhar.
- **Corpo:** 1,75 m, magro/trançado, ombros levemente caídos, postura defensiva.
- **Rosto:** pele clara pálida `#e8c9a8`, olhos castanhos com **olheiras roxas fortes**, sobrancelhas retas, boca reta e triste, cabelo castanho-escuro **bagunçado e desalinhado** caindo sobre a testa `#241812`.
- **Roupas:**
  - Casaco/jaqueta de gola alta azul-marinho com dobras: principal `#2a3448`, sombra/dobra `#1c2434`.
  - Calça cinza-escura `#3a3a40`; sapatos pretos `#141416`.
  - **Skin alternativa "Tático"** (mesma malha, troca de textura): casaco verde-militar `#1c221a` / `#141812`, calça `#1a1e18`.
- **Itens visíveis no modelo:** nada pendurado — armas entram na mão via `hand_R`.
- **Linguagem de animação:** movimentos contidos, guardas baixas, estilo sobrevivente assustado.

### 2.2 DRA. CLARA MENDES — `modelo_clara.glb`
- **Quem é:** Protagonista da Campanha B, 32 anos. Psiquiatra que chega pela floresta na chuva para expor os experimentos do Dr. Alencastro.
- **Corpo:** 1,68 m, porte esguio, postura ereta e contida (médica acostumada ao plantão).
- **Rosto:** pele clara `#e8c9a8`, olhos castanho-esverdeados cansados porém firmes, expressão decidida, **cabelo castanho médio longo e liso** caindo por cima dos ombros `#4a2c18`, repartido levemente fora do centro.
- **Roupas:**
  - **Jaleco médico branco** com colarinho: principal `#d8d8d4`, sombras nas dobras `#b8b8b2`.
  - Blusa vinho/bordô por baixo (visível no colarinho aberto): `#6b1d28`.
  - Calça social cinza-azulada escura `#222228`; sapatos brancos sujos `#cfcfc8`.
- **Skin alternativa "Investigador"**: versão escura do jaleco (verde-militar `#1c221a`/`#141812`, calça `#1a1e18`).
- **Linguagem de animação:** precisa e econômica; ao mirar, braços firmes de duas mãos.

### 2.3 BENTO (Zelador) — `modelo_bento.glb`
- **Quem é:** Zelador do sanatório há décadas; tem as chaves mestras e conhece os porões. Herói extra de "O Turno da Noite".
- **Corpo:** 1,72 m, **robusto e troncudo** (trabalho pesado), barriga levemente saliente, ombros largos.
- **Rosto:** pele bronzeada de trabalho `#c9a07a`, **cabelo grisalho curto** `#484848`, barba por fazer grisalha, olhos castanhos pequenos e atentos, expressão durona mas bondosa; rugas na testa.
- **Roupas:**
  - **Macacão de zelador azul de trabalho** (jardineira de uma peça): principal `#223854`, sombra `#1a283a`.
  - Camiseta branca suja por baixo `#d8d8d0` (aparece no peito aberto do macacão).
  - Botas de borracha pretas `#141416`.
  - Detalhe: chaveiro grosso pendurado no cinto (2–3 chaves de metal cinza `#8a929e` — baixo detalhe).
- **Linguagem de animação:** pesado e firme, passos largos.

---

## 3. ALIADOS / NPC

### 3.1 LÚCIA MENDES SILVA — `modelo_lucia.glb`
- **Quem é:** Irmã mais nova de Daniel (19 anos). Internada "voluntariamente"; suas memórias e o medalhão guiam as duas campanhas. Aparece em memórias/cutscenes e no final.
- **Corpo:** 1,60 m, franzina, postura frágil/recolhida, mãos juntas na frente.
- **Rosto:** pele pálida `#d8b090`, **olhos verdes suaves** `#2a4a3a`, **sorriso triste** `#b87870`, expressão entre doçura e melancolia.
- **Cabelo:** castanho **longo até a cintura** com franja `#3a2a1a`.
- **Roupas:**
  - Vestido/túnica de internada longo tom rosa-terra **`#7a3a44`** com mangas compridas.
  - **Pingente/cordão vermelho** `#8a2a2a` no pescoço (o medalhão de Lúcia — item chave da história!).
  - Pés descalços ou sapatinhos simples `#5a4438`.
- **Linguagem de animação:** lenta, delicada; idle com leve tremer de frio.

### 3.2 DR. MATIAS — `modelo_matias.glb`
- **Quem é:** Médico senhor do sanatório (1997), aliado ambíguo que aparece em prontuários/rádio e cenas.
- **Corpo:** 1,74 m, meia-idade, leve corcunda de escritório.
- **Rosto:** pele clara `#dfc0a0`, **cabelo grisalho curto e ralo** `#8a8a88`, óculos de aro fino (metal `#9aa2ac`), bigode grisalho aparado, olhos castanhos cansados.
- **Roupas:** jaleco branco-amarelado de época `#d4d4cc` sobre terno cinza `#3a3a42`, gravata escura `#26262e`, calça `#3a3a42`, sapatos marrons `#4a342a`.

---

## 4. INIMIGOS (as cores de olhos são OBRIGATÓRIAS — o motor aplica o glow nesses pixels)

### 4.1 SOMBRA — `modelo_sombra.glb` (inimigo comum)
- Espectro encapuzado flutuante, **sem pernas**: manto cônico esfarrapado.
- Manto: `#0c0c12` com sombras `#060608` (quase preto, azul-frio).
- Rosto: vazio na penumbra do capuz; **olhos brilhantes amarelo-pálidos `#fff6c8`**.
- Leve névoa espectral na base (pintar no atlas faixa translúcida alfa opcional).
- Animação extra: flutuar (idle sem passos), glide no walk.

### 4.2 PACIENTE CONTORCIDO (infectado) — `modelo_infectado.glb`
- Interno em **camisa de força arrebentada**, andar espasmódico, cabeça **tombada para o lado** (inclinação ~12°).
- Camisa de força bege-sujo com listras/desgaste: `#7a766c`; calça carcerária `#404448`.
- Pele cinza-esverdeada de doente: `#8a928c`;** olhos brilhando vermelho `#ff3333`**.
- Braços cruzados/amarrados na frente (mangas vazias amarradas), ombros tortos, joelhos para dentro.

### 4.3 SOMBRA CIRÚRGICA (enfermeira) — `modelo_enfermeira.glb`
- Enfermeira corrompida em **uniforme branco-cinza de época** (vestido + touca), sangue antigo nas barras (pintar manchas marrom-escuras).
- Uniforme: `#d0d4dc` com sombras `#a8acb8`; pele cinza-verde `#828a88`.
- **Olhos amarelos brilhantes `#ffee55`**; bisturi de metal na mão direita (`hand_R`): lâmina `#a0a8b4`.
- Corpo: vestido em cone (saia larga), pernas à mostra pálidas; andar rígido, cabeça levemente inclinada.

### 4.4 AMÁLGAMA DE CINZAS (aberração) — `modelo_aberracao.glb`
- **Brutamontes carbonizado** das fornalhas (1,25× maior): corpo de carvão rachado com **brasas acesas** nas rachaduras do peito/ombros (pintar veios laranja no atlas).
- Carvão: base `#221a16` com brasas `#331005`/`#ff7722` nos veios; pedra escura das mãos/pernas `#141010`.
- **Olho único largo brilhante laranja `#ff5511`** no rosto.
- Braços compridos até quase o chão, punhos grossos; 2,0 m de altura efetiva.

### 4.5 LAMENTO — `modelo_lamento.glb`
- Variante espectral do Sombra (mesma base de capa), porém **mais alta (1,12×) e magra**, com véu/manto em farrapos LONGOS arrastando.
- **Olhos azul-gelo `#bfe8ff`**; leve tonalidade azulada no manto `#10121c`.
- Animação sprint (investida fantasmagórica).

### 4.6 CARNIÇAL RASTEJADOR — `modelo_rastejador.glb`
- Humanoide **rastejante** (0,75×): arrasta-se com braços fortes, pernas arrastadas.
- Pele pálida acinzentada `#9a9284` com manchas `#6a6258`; roupa de internado rasgada bege `#8a8272`.
- **Olhos verdes brilhantes `#88ff88`**; boca aberta larga (mandíbula caída).
- Animação própria: `crawl` (locomoção quadrúpede baixa).

### 4.7 CÃO SOMBRIO — `modelo_cao.glb`
- Cão negro espectral (0,85×), corpo quadrúpede baixo e esguio tipo cachorro da canil.
- Pelagem preta `#181820`, focinho/cabeça `#0e0e14`; **olhos âmbar brilhantes `#ffaa33`**.
- Costelas levemente marcadas (magro), orelhas em pé, cauda baixa; baba espectral opcional no atlas.
- Animação sprint rápida + investida (attack = bote).

### 4.8 O CARRASCO — `modelo_carrasco.glb`
- Brutamontes encapuzado gigante (1,55×, ~2,7 m): ex-funcionário da morgue.
- Capuz e túnica de couro escuro `#241c18`/`#181210`, avental de trabalho com manchas `#2e2018`.
- Pele pálida morta `#8a8478`; **olhos vermelhos `#ff2222`**.
- **Cutelo/machadinha de bombeiro grande na mão direita** (metal `#707880`, cabo madeira `#4a3428` — parte do modelo, 150 tris extra).
- Passos lentos que sacodem a câmera (attack = golpe de cima para baixo).

### 4.9 VULTO (CHEFE FINAL — Campanha A) — `modelo_vulto.glb`
- O espectro primordial: **2,1× escala (~3,6 m)**. Capa/túnica monumental em cone com ombros largos e coroa de farrapos; "rosto" é um vazio absoluto.
- Túnica: `#0c0c12` / `#060608`; garras longas e finas nas mangas.
- **Olhos vermelho-sangue `#ff3b30`** (pontos grandes no atlas — são o farol do boss).
- Animação extra `scream` (abrir o vazio do rosto + erguer braços).

### 4.10 DR. ALENCASTRO MUTADO (CHEFE FINAL — Campanha B) — `modelo_alencastro.glb`
- O diretor transformado pelas próprias experiências (1,95×, ~3,4 m).
- Terno rasgado escuro roxo-noite `#181422`; **pele mutada lilás-acinzentada `#5a4868`**.
- **Olho(s) violeta brilhante `#aa44ff`** (visão ciclope ou par de olhos fundidos — manter um bloco único de olhos no atlas).
- **4 tentáculos saindo das costas** (roxo profundo `#281238`/`#180628`, comprimento ~1,6 m, pontas em funil) — animar com oscilação própria no idle/walk.
- Braços humanos alongados demais (1,1 m), mãos com dedos compridos.

---

## 5. CHECKLIST DE ENTREGA (por personagem)
- [ ] `modelo_<id>.glb` dentro do orçamento de tris da classe
- [ ] Textura única embutida, paleta ≤32 cores, pixels visíveis
- [ ] Olhos na cor exata da ficha (bloco separado no atlas)
- [ ] Pivô nos pés, Y-up, frente +Z, escala em metros
- [ ] Osso `hand_R` (heróis) ou braço/membro de ataque (inimigos)
- [ ] Clips: `idle`, `walk`, `attack`, `hurt`, `death` (+ `scream`/`crawl`/`sprint` quando marcado)
- [ ] 10–15 fps de animação, loops limpos

**Prioridade de produção (ordem sugerida):** daniel → clara → vulto → alencastro → enfermeira → infectado → aberracao → cao → carrasco → lamento → rastejador → sombra → lucia → matias → bento.
