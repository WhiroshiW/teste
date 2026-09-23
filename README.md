# ECOS DO VAZIO 🕯️

Um **survival horror 3D cinematográfico estilo PlayStation 1** com **duas campanhas completas que se cruzam** (estilo Leon e Claire no Resident Evil 2 Remake), alternância em tempo real entre **Câmera Fixa (PS1 Clássico)** e **3ª Pessoa (estilo GTA / Livre)**, **3 Modos Extras**, **Loja de Pontos Secretos**, **Galeria 3D de Modelos** e iluminação balanceada de alta legibilidade!

**Tema:** terror psicológico sobre **depressão, luto e culpa** com uma profunda mensagem de resiliência e esperança. (Apoio à vida: **CVV 188**.)

> Tudo é gerado em código procedural: texturas pixel-art, modelos low-poly com vertex wobble, áudio sintetizado via WebAudio e Three.js vendored em `vendor/`. Roda **100% offline** e com suporte a celular (touch controls).

---

## 🎮 O Que Há de Novo (Edição Indie Premium)

### 🌓 Duas Campanhas Principais Cruzadas (Estilo RE2 Remake)
- **Campanha A — Daniel Silva (O Luto e a Busca):**
  - Acorda no Quarto 3 do Sanatório demolido, buscando vestígios e fragmentos de memória de sua falecida irmã Lúcia.
  - Armas: Faca, Pistola M9, Espingarda Cal.12.
- **Campanha B — Dra. Clara Mendes (A Investigação Médica):**
  - Psiquiatra que chega pela misteriosa Floresta após seu carro bater no portão externo. Busca dossiês confidenciais para denunciar as terapias de choque e experimentos ilegais do Dr. Alencastro.
  - Armas: Bisturi Cirúrgico, Revólver .38, Lança-Granadas.
- **Encontro Cinematográfico na Capela:** Daniel e Clara se encontram sob o vitral gótico, trocam pistas, chaves e revelações sobre o passado de Lúcia!

### 📷 Câmera Dupla em Tempo Real
- **Câmera Fixa Cinemática (PS1 Clássico):** ângulos dramáticos com corte por sala e leve tremor de mão.
- **Câmera em 3ª Pessoa (GTA / Livre / Over-the-Shoulder):** visão livre atrás do personagem para explorar os cenários em 360°!
- **Alterne a qualquer momento** apertando a tecla **V** ou **C**, pelo botão no HUD ou nas Opções!

### 🌲 Cenários Novos e Iluminação Clara
- **Jardins da Floresta Externa:** árvores retorcidas, névoa, postes de ferro iluminados, o carro batido de Clara, o cemitério com o túmulo de Lúcia e a cabana do zelador Bento.
- **Capela Esquecida:** bancos de madeira, confessionário com confissões gravadas, altar de mármore e um imponente vitral gótico iluminado.
- **Gráficos e Luzes Otimizados:** iluminação ambiente e lanterna calibradas para visual claro, nítido e perfeitamente legível sem perder a atmosfera soturna de PS1.

### 🧟 Variedade de Inimigos e Chefes
- **Sombra da Culpa:** aparição rápida que cerca a vítima.
- **Lamento:** criatura veloz com passos erráticos.
- **Carniçal Rastejador (Crawler):** rasteja rente ao chão em alta velocidade e salta no ar.
- **Cão Sombrio:** investidas fulminantes pelos jardins e corredores.
- **O Carrasco:** gigante encapuzado armado com um cutelo colossal e passos que estremecem a terra.
- **VULTO:** entidade primordial do luto no Terraço (Chefe da Campanha A).
- **Dr. Alencastro Mutado:** o diretor consumido por suas próprias drogas e tentáculos (Chefe da Campanha B).

### 🕹️ 3 Modos Extras (Além da História)
1. **Modo Mercenários (The Mercenaries):**
   - Luta contra o relógio (2 minutos iniciais)!
   - Elimine criaturas para ganhar segundos extras (+6s, +30s) e acumular combos com multiplicadores de pontos.
   - Destrua Cristais/Totens de Tempo para estender o cronômetro.
   - Sistema de Ranks: D, C, B, A, S e SS com premiações em pontos!
2. **Modo Sobrevivente (Survival):**
   - Horda de ondas crescentes com munição e ervas extremamente escassas.
   - Registre seu recorde de ondas sobrevividas.
3. **O Turno da Noite (Campanha Curta de Bento):**
   - Jogue como o velho zelador Bento nas caldeiras na noite em que o laboratório ruiu. Tranque os portões da floresta e salve a cidade antes do amanhecer!

### 💎 Loja de Pontos Secretos & Galeria 3D
- Acumule pontos jogando a história, eliminando monstros, desvendando puzzles e conquistando ranks altos.
- Itens desbloqueáveis:
  - **Munição Infinita** (ative/desative nas opções)
  - **Magnum .44 "Julgamento"** (mata a maioria dos inimigos em 1 tiro)
  - **Lança-Granadas Militar**
  - **Trajes Táticos Secretos** para Daniel e Clara
  - **Galeria 3D Interativa:** inspecione em 360° todos os modelos 3D dos personagens e monstros com fichas biográficas completas!
  - **Filtros Vintage VHS & Sépia Retrô**

### 💓 Inventário com ECG Cardíaco
- Monitor cardíaco (ECG) animado em tempo real com traçado P-Q-R-S-T oscilante (verde/amarelo/vermelho) conforme o estado de saúde, no autêntico estilo Resident Evil!

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
| ESC ou P | Pausar jogo |

📱 No celular, botões touch e botão de câmera aparecem automaticamente.

---

## ▶️ Como Jogar

```bash
python3 -m http.server 8000
# Abra http://localhost:8000 no navegador
```

## 🧪 Testes Automatizados

```bash
node test/headless.mjs
```
*Testa 8 salas 3D, colisões, spawns, portas, 61 texturas procedurais, entidades, áudio WebAudio e interface.*
