# SANTA LÚCIA 🕯️
*Desenvolvido por Equipe Nakamura*

Um **survival horror 3D cinematográfico no autêntico estilo PlayStation 1** com **duas campanhas completas que se cruzam** (estilo Leon e Claire no Resident Evil 2 clássico), alternância em tempo real entre **Câmera Fixa (PS1 Clássico)** e **3ª Pessoa (estilo GTA / Livre)**, **3 Modos Extras**, **Loja de Pontos Secretos**, **Galeria 3D de Modelos** e iluminação de alto contraste e legibilidade.

**Tema:** terror psicológico sobre **depressão, luto e culpa** com uma profunda mensagem de resiliência e esperança. (Apoio à vida: **CVV 188**.)

> Tudo é gerado em código procedural: texturas pixel-art, modelos low-poly com vertex wobble, áudio sintetizado via WebAudio e Three.js vendored em `vendor/`. Roda **100% offline** e com suporte a celular (touch controls).

---

## 📋 STATUS DO PROJETO: ETAPA 2 CONCLUÍDA

### ✅ O Que Foi Feito na Etapa 2 (Melhorias Visuais e Cutscenes):
1. **Tela de Título Atmosférica (Diorama 3D em Tempo Real):**
   - Removido fundo preto estático e substituído por um **diorama 3D procedural do Sanatório Santa Lúcia (1997)**.
   - Cenário com mesa de carvalho envelhecida, **vela acesa com chama oscilante e luz dinâmica pulsante alaranjada**.
   - **Janela gótica com grades de ferro**, cortina rasgada balançando com o vento, **chuva torrencial de partículas 3D** lá fora e **relâmpagos volumétricos com som estéreo de trovão**.
   - Prontuário médico confidencial aberto de Lúcia Silva, fotografia antiga de Daniel e Lúcia, crucifixo de ferro, livros e frascos de medicamentos em vidro âmbar.
   - Câmera em travelling orbital suave e cinematográfico ao redor dos objetos.
   - Destaque autêntico: **"Equipe Nakamura apresenta"** e logotipo clássico em alto relevo **SANTA LÚCIA**.
2. **Cutscene de Introdução Animada e Estilizada (PS1):**
   - Introdução cinematográfica em 4 planos com faixas pretas (*letterbox* 2.35:1) e legendas datilografadas contextualizando o mistério do sanatório lacrado há dez anos e a dor da perda.
   - **Suporte completo para pular a qualquer instante**: basta pressionar `ENTER`, `ESPAÇO`, `E`, `ESC` ou clicar/tocar em qualquer parte da tela.
   - Opção dedicada no Menu Principal: **"ASSISTIR INTRO (1997)"** para rever a cutscene quando desejar.
3. **Cutscenes Dinâmicas nos Momentos Chave do Jogo:**
   - **Encontro de Daniel & Clara na Capela:** planos de câmera cinematográficos alternados entre os bancos góticos, personagens armados frente a frente, sincronização de falas e áudio dublado, e entrega solene da Chave do Portão de Ferro.
   - **Revelação no Memorial do Terraço:** órbita de câmera 3D em torno do monumento ao encaixar o 4º fragmento de memória, partículas azuis celestes ascendentes, relâmpago estrondoso e aparição assustadora do Boss Vulto com rugido.
   - **Confronto do Dr. Alencastro nas Caldeiras do Porão (Campanha Clara):** travelling rasteiro por entre canos de ferro e vapor, lâmpadas de emergência pulsando em vermelho sangue e diálogo tenso antes da batalha de chefe.
4. **Redesenho do Inventário, Máquina de Escrever e Cofre:**
   - **Inventário:** estética metálica de prontuário clínico com rebites, alto contraste e slots chanfrados em 3D (*bevel*) com badges nítidos de `[EQUIPADO]` e quantidade de munição.
   - **Monitor Cardíaco ECG:** moldura de osciloscópio hospitalar dos anos 90, grade milimetrada de fósforo verde, formas de onda P-Q-R-S-T sincronizadas e indicador de frequência em BPM (`72 BPM - FINO`, `116 BPM - ATENÇÃO`, `164 BPM - PERIGO`).
   - **Máquina de Escrever & Diário (Salvar):** visual estilizado de papel timbrado envelhecido do sanatório com fita de tinta e opções de confirmação de registro de prontuário.
   - **Cofre:** display de alta segurança de chapa de aço escovado com seletores numéricos chanfrados e iluminação âmbar.
5. **Limpeza e Reset de Saves Legados:**
   - Purga automática de chaves antigas e dados legados no carregamento, adotando versionamento isolado (`santa_lucia_*_v1`).

---

### ⏳ O Que Ainda Está Pendente (Para as Próximas Etapas):
- [ ] **Etapa 3 e seguintes:**
  - Expansão de novos enigmas/puzzles ambientais nos cenários.
  - Balanceamento de munição e tempo nos modos Mercenários e Sobrevivente.
  - Novos documentos de lore e diários médicos secretos para coletar.
  - Ajustes e polimentos adicionais conforme solicitado pelo usuário.

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
