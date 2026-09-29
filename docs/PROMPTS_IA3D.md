# SANTA LÚCIA — PROMPTS PARA IAs 3D GENERATIVAS (Equipe Nakamura)
**Complemento de `docs/PERSONAGENS_PS1_ESPECIFICACAO.md` · v1.0 · 28/09/2026**
Como usar: gere cada personagem numa IA 3D (Meshy, Tripo3D, Luma Genie, Rodin/Hyper3D) com as instruções abaixo, baixe o `.glb` e me envie para integração no motor.

---

## 1. FLUXO RECOMENDADO (qualquer serviço)

1. **Modo preferido: IMAGE-TO-3D** com a turnaround do personagem (front/side/three-quarter — como a do Daniel). Turnaround multiplica a qualidade vs. texto puro.
2. Se o serviço tiver modo TEXT-TO-3D, use o prompt em inglês da ficha abaixo.
3. **Configurações ideais:**
   - Estilo/Category: *Character / Stylized* (nunca "realistic")
   - Polygon: **Low-poly** (ou reduzir/retopologizar depois para os orçamentos do dossiê)
   - Symmetry: ON
   - Texture: *Vertex color ou difuso simples*, resolução **256** (o motor aceita; rebaixo para 128 se precisar)
   - PBR: OFF/metálico=0, roughness=1 (estilo fosco PS1)
   - Pose de saída: **T-pose ou A-pose** (necessário para eu animar/integrar)
4. **Rig & animações** (se o serviço oferecer — Meshy/Rodin têm auto-rig):
   - Auto-rig humanóide padrão; garantir osso da mão direita nomeado **`hand_R`**
   - Animations: `idle`, `walk`, `attack`, `hurt`, `death` (e `scream` para bosses, `crawl` para rastejador, `sprint` para cão/lamento)
   - Se não tiver rig: tudo bem — me mande o modelo parado em T-pose que eu animo aqui.
5. **Export: `.glb`, SEM compressão Draco**, texturas embutidas.

## 2. PROMPT BASE (cole junto de qualquer ficha)

```
PS1-era survival horror character, PlayStation 1 1998 aesthetic (Resident Evil 2 / Silent Hill style). Low-poly game asset, chunky readable silhouette, flat faceted shading, hand-painted pixel-art texture with visible chunky pixels and limited muted desaturated palette. matte finish, no PBR, no smooth gradients. Full body, A-pose, centered, feet on ground plane, real-world scale in meters.
```

## 3. FICHAS POR PERSONAGEM (usar SEMPRE com a seção 4 do dossiê de specs)

### 3.1 DANIEL (prioridade máxima) — usar com `docs/refs/daniel_turnaround.png`
```
Young Brazilian man, 27, survival horror protagonist. Skinny, tired posture, slightly sloped shoulders. Messy dark brown hair falling over forehead. Pale tired face with strong purple dark circles under brown eyes, straight sad mouth. High-collar navy blue jacket (#2a3448 main, #1c2434 shadows) with visible fabric facets, slightly flared hem; plain dark gray trousers (#3a3a40); black chunky boots with thick dark soles. Hands relaxed when not aiming. Height 1.75m.
```

### 3.2 CLARA
```
Brazilian woman, 32, psychiatrist investigator. Slim, upright contained posture. Long straight medium-brown hair over both shoulders (#4a2c18), pale firm face, calm tired hazel eyes, determined expression. White medical lab coat (#d8d8d4) with collar over dark wine-red blouse (#6b1d28), dark blue-gray formal trousers (#222228), worn white shoes. Height 1.68m.
```

### 3.3 BENTO
```
Brazilian caretaker, 60s, robust and thickset with slight belly and broad shoulders. Short gray hair, gray stubble, small attentive dark eyes, tough but kind weathered tan face (#c9a07a) with forehead wrinkles. Blue one-piece work coverall (#223854) over dirty white undershirt, black rubber boots, heavy key ring hanging from belt. Height 1.72m.
```

### 3.4 VULTO (CHEFE)
```
Monstrous wraith 3.6m tall: monumental hooded cloak like a tattered cone with wide shoulders and a crown of rags, absolute void inside the hood, no face. Near-black cold-blue cloak (#0c0c12 / #060608). Long thin claws emerging from sleeves. Two glowing blood-red eyes (#ff3b30) deep in the void — the ONLY emissive part. Floating, no legs.
```

### 3.5 DR. ALENCASTRO MUTADO (CHEFE)
```
Mutated mad-scientist director, 3.4m tall. Torn dark night-purple suit (#181422), mutated lilac-gray skin (#5a4868), single fused glowing violet eye cluster (#aa44ff). Four deep-purple tentacles (#281238) growing from the back, ~1.6m, funnel tips. Human arms elongated beyond normal proportion with long fingers.
```

### 3.6 DEMAIS INIMIGOS
Sintam-se livres para gerar também: Sombra, Infectado (camisa de força), Enfermeira (Sombra Cirúrgica), Aberração de Cinzas, Lamento, Rastejador, Cão Sombrio, Carrasco — usar fichas 4.1–4.8 do `docs/PERSONAGENS_PS1_ESPECIFICACAO.md` + Prompt Base. Mesmo fluxo.

## 4. CHECKLIST ANTES DE ME ENVIAR
- [ ] `.glb` abre num visualizador (ex.: threejs.org/editor ou gltf.report) sem erros
- [ ] Em pé sobre a origem (pés em Y=0), A-pose/T-pose
- [ ] Textura visível e sem material PBR metálico brilhante
- [ ] Sem Draco/KTX2 (comprimido = o motor não carrega)
- [ ] Se rigado: osso `hand_R` existe (heróis)

**Entrega:** arquivo(s) `modelo_<nome>.glb` aqui no chat. Eu cuidarei de: normalização de escala, material (Lambert fosco), snap de vértices PS1, integrar às animações existentes do motor (ou usar as do GLB), testar nas 9 suítes e mostrar no preview.
