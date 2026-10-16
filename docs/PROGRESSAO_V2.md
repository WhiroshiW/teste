═══════════════════════════════════════════════════════════════════
 PROGRESSÃO V2 — AS 3 HISTÓRIAS USANDO AS 20 SALAS
 (aguardando aprovação do produtor antes de codar)
═══════════════════════════════════════════════════════════════════

── DIAGNÓSTICO DA CADEIA ANTIGA (por que descartar) ──────────────
• A cadeia antiga até funciona (cofre 1402 → basekey → porão → 4 frags
  → memorial → boss), MAS:
  - os 4 fragmentos moram em só 3 salas (quarto/enfermaria/porão);
  - o cofre de senha fica no QUARTO 2 e a DICA no CONSULTÓRIO —
    lados opostos do mapa, sem pista de que se conectam;
  - 15 das 20 salas são 100% decorativas: estufa, cemitério, jardim,
    casa do zelador, mezanino, P3, diretoria, subsolo, culto,
    experimentos... nada disso trava ou destrava NADA;
  - o jogador se perde e não sabe o próximo passo (sensação de
    "não zerável / nem jogável").

── PRINCÍPIO DA V2 ────────────────────────────────────────────────
O SAGUÃO é o hub (9 portas). A progressão é uma ESPIRAL: cada ala
libera a chave que abre a ala seguinte. Toda sala tem UM motivo pra
existir na cadeia do Daniel. Clara e Bento usam os caminhos que fazem
sentido pra história deles (sem encher linguiça).

═══════════════════════════════════════════════════════════════════
 DANIEL — "O LUTO E A BUSCA"  (principal, todas as 20 salas)
═══════════════════════════════════════════════════════════════════
ATO 1 · A Ala de Internação
  1. QUARTO: cama→chave pequena → gaveta→PISTOLA+balas
             urso (teddy) → ★ FRAGMENTO 1/4
  2. CORREDOR DOS QUARTOS: quarto 2 trancado por enquanto (volta depois)
  3. SAGUÃO: estátua→CHAVE ENFERRUJADA · máquina de escrever (save)
             vaso→comprimidos

ATO 2 · Ala Médica
  4. ENFERMARIA [porta: CHAVE ENFERRUJADA ← estátua]:
     armário→MANIVELA + ★ FRAGMENTO 2/4
     quadro de força → "falta o fusível"
  5. CONSULTÓRIO: ficha vermelha: "código = data da neve (14/02)"
     mesa/cofre do dr → senha 1402 → ★ CHAVE DO PORÃO
     QUADRO AO ÓLEO (painting) → FUSÍVEL escondido atrás
  6. Volta à enfermaria: quadro de força + FUSÍVEL → ENERGIA LIGADA
     → elevador do terraço funciona (mantém flag fuseOn)

ATO 3 · Porão e Subsolo
  7. PORÃO [porta: CHAVE DO PORÃO ← cofre 1402]:
     válvula + MANIVELA → drena a água → engradado → ★ FRAGMENTO 3/4
     escada do subsolo: "a porta cede" (abre com a drenagem)
  8. SUBSOLO [porta: precisa drenagem]: 
     EXPERIMENTOS: mesa→DOSSIÊ ALENCASTRO (contém a senha da diretoria!)
     CULTO: altar→SÍMBOLO DO CULTO (metal frio, que abre pedra...)

ATO 4 · Ala Sul e Oeste (ramificações em paralelo)
  9. JARDIM: canil→CHAVE DA ESTUFA · CASA DO ZELADOR:
     bancada→PÉ DE CABRA · lareira→FRASCO DE LUZ
 10. ESTUFA [porta: CHAVE DA ESTUFA ← canil]:
     bancada→PESTICIDA → raízes carnívoras + pesticida → página+kit
 11. CEMITÉRIO: CRIPTA SELADA + SÍMBOLO DO CULTO → abre!
     → ★ FRAGMENTO 4/4 + ESCOPETA (a cripta da família Silva)
 12. QUARTO 2 (agora aberto): cofre simples → FUSÍVEL reserva + cartuchos

ATO 5 · Andares de cima
 13. MEZANINO [porta empenada: PÉ DE CABRA ← casa do zelador]
 14. CORREDOR P3 → SALA DA DIRETORIA:
     cofre executivo → senha está NO DOSSIÊ (1997) → ★ CHAVE DO HELIPONTO
 15. TERRAÇO [elevador (energia) OU porta do heliponto (chave)]:
     MEMORIAL + 4 FRAGMENTOS → o VULTO DA NEBLINA (BOSS)
     → FINAL: portal de luz + epílogo na beirada (CVV 188)

Cobertura do Daniel: 20/20 salas ✔

═══════════════════════════════════════════════════════════════════
 CLARA — "A INVESTIGAÇÃO MÉDICA"  (10 salas)
═══════════════════════════════════════════════════════════════════
 1. FLORESTA (start): monólito (lê o nome) · CHAVE DO PORTÃO no chão
 2. SAGUÃO → ENFERMARIA (chave enferrujada): armário→MANIVELA
 3. CONSULTÓRIO: cofre 1402 → ★ CHAVE DO PORÃO
 4. PORÃO: válvula+manivela → SUBSOLO
 5. EXPERIMENTOS: DOSSIÊ ALENCASTRO  → PROVA 1 (claraDossierGot)
 6. CULTO: altar → SÍMBOLO DO CULTO  → PROVA 2
 7. CEMITÉRIO: cripta + símbolo → MEDALHÃO DA LÚCIA → PROVA 3
 8. FLORESTA: monólito + medalhão → Daniel surge e corre pra capela
    (flag chapelEncounterMet)
 9. CAPELA: confronto → BOSS (a coisa na capela)
    → FINAL DA CLARA (Redenção / Fuga)

═══════════════════════════════════════════════════════════════════
 BENTO — "O TURNO DA NOITE"  (8 salas)
═══════════════════════════════════════════════════════════════════
 1. PORÃO (start): sobreviver às aberrações das caldeiras
    → pega a CHAVE MESTRA do zelador
 2. SUBSOLO: limpar CULTO (destruir altar) + EXPERIMENTOS
 3. SAGUÃO → JARDIM: canil → CHAVE DA FLORESTA
 4. CASA DO ZELADOR: a cama dele ("uma noite que não é sua") 
 5. FLORESTA: FECHAR O PORTÃO → FINAL "O Último Turno"

═══════════════════════════════════════════════════════════════════
 TABELA DE TRAVAS (o que muda em world.js / game.js)
═══════════════════════════════════════════════════════════════════
 PORTA/COISA           | TRAVA            | CHAVE VEM DE
 ----------------------+------------------+---------------------------
 saguão→enfermaria     | rustkey  (NOVO)  | estátua do saguão
 saguão→porão          | basekey (mantém) | cofre 1402 consultório
 porão→subsolo         | valveOpen (NOVO) | válvula + manivela
 saguão→estufa         | greenhouse (NOVO)| canil do jardim
 saguão→mezanino       | crowbar  (NOVO)  | casa do zelador
 cripta (ação)         | cult_symbol(NOVO)| altar do culto
 elevador→terraço      | fuseOn  (mantém) | quadro força + fusível
 P3→terraço (porta)    | terrace_key(NOVO)| cofre diretoria (1997)
 floresta (Daniel)     | ABERTA (cosmética p/ ele)
 floresta (Clara/Bento)| forest_key       | floresta/canil

 ACTS REMAPEADOS:
 quadro consultório     → FUSÍVEL (era fragmento)
 cofre do consultório   → senha 1402 → CHAVE DO PORÃO (era do quarto2)
 cofre do quarto 2      → FUSÍVEL reserva + cartuchos (simples)
 engradado porão        → FRAGMENTO 3 (mantém, precisa drenagem)
 mesa experimentos      → DOSSIÊ (senha da diretoria dentro)
 altar culto            → SÍMBOLO DO CULTO
 cripta cemitério       → FRAGMENTO 4 + ESCOPETA
 cofre diretoria        → senha 1997 → CHAVE DO HELIPONTO
 monólito floresta      → Clara: medalhão → encontro na capela

 LOTES DE IMPLEMENTAÇÃO (um commit por lote):
 L1: Daniel completo (gates + acts + objectiveFor) + suíte flow
 L2: Clara (objectiveFor + monólito/encontro + boss capela)
 L3: Bento (objectiveFor + final no portão)
 L4: testes jogáveis + build + tag
═══════════════════════════════════════════════════════════════════
