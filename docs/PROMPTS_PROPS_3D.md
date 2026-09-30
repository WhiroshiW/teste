# 🗿 PROMPTS 3D — Props & Armas (SANTA LÚCIA)

> Fluxo: gera na IA grátis (Tripo → tripo3d.ai / Hunyuan → huggingface.co/spaces/tencent/hunyuan3d-2)
> → baixa `.glb` → sobe na pasta `modelos 3d/` do main → chama o agente.

## Regras de ouro
- **UM objeto por GLB** (nunca agrupe dois objetos)
- Fundo cinza liso, objeto centrado, vista 3/4, sem sombra, sem texto
- Polígonos: **baixo** (5k–15k) se a IA perguntar
- Nome do arquivo: **minúsculo, underline** (ex.: `cadeira_rodas.glb`)
- Escala livre — o pipeline normaliza

## Prompt base (trocando [OBJECT])
```
Single [OBJECT] only, isolated, centered, three-quarter view,
survival horror 1998 abandoned sanatorium prop, worn and dirty,
faceted low-poly shading, clean hard-edged planes, flat light gray
background, even lighting, no ground shadow, no text, no other objects.
```

## LOTE 1 — Armas & itens (prioridade máxima: aparecem na mão do personagem)
| Objeto | Arquivo | [OBJECT] no prompt |
|---|---|---|
| Faca | `faca.glb` | rusty kitchen knife with worn wooden handle |
| Pistola | `pistola.glb` | old .38 revolver-style pistol... *(na real: pistola semiauto)* old semi-automatic pistol, scratched blue steel |
| Bisturi | `bisturi.glb` | surgical scalpel with steel blade and worn handle |
| Chave inglesa | `chave_inglesa.glb` | rusty adjustable wrench |
| Munição | `municao.glb` | small ammo box with loose bullets on top |
| Chave | `chave.glb` | old ornate iron key |

## LOTE 2 — Mobiliário (impacto visual das 21 salas)
| Objeto | Arquivo | [OBJECT] |
|---|---|---|
| Cama hospitalar | `cama_hospital.glb` | old hospital bed with stained mattress and metal frame |
| Maca | `maca.glb` | hospital gurney with wheels and wrinkled sheet |
| Cadeira de rodas | `cadeira_rodas.glb` | rusty vintage wheelchair |
| Armário | `armario.glb` | tall metal locker, dented, one door ajar |
| Porta de madeira | `porta_madeira.glb` | old wooden door with frame, closed |
| Porta com grades | `porta_grades.glb` | iron barred gate door |
| Janela com grades | `janela_grades.glb` | window with rusty iron bars, dirty glass |
| Mesa | `mesa.glb` | worn wooden desk with drawers |
| Cadeira | `cadeira.glb` | old wooden chair |
| Sofá | `sofa.glb` | tattered old sofa with stained cushions |
| Vela | `vela.glb` | melting candle with wax drips (no flame) |
| Pia | `pia.glb` | dirty porcelain sink with rust stains |

## LOTE 3 — Deco (quando sobrarem créditos)
`quadro.glb` (crooked old framed painting) · `estante.glb` (old wooden bookshelf) ·
`lampada.glb` (hanging industrial lamp) · `corredor_tile.glb` (short modular
sanatorium corridor section with doorway — EXPERIMENTAL)

## 🗺️ ROTEIRO OFICIAL (definido pelo produtor)
1. **AGORA:** pistola do Daniel (`pistola.glb`) + faca (`faca.glb`) — modelagem mínima e essencial
2. Armas da Dra. Clara (bisturi `bisturi.glb`)
3. **PAUSA: produtor testa se o jogo está JOGÁVEL e ZERÁVEL** — só depois segue
4. Inimigos em 3D
5. Animações exclusivas por personagem (correr, atirar, segurar faca, golpes etc.)

## Pendente (delegado, não esquecer)
- [ ] Braços abertos na pose de ATAQUE do modelo IA — a mira esquece de
  aplicar o fechamento Z antes de levantar o braço (fix: aplicar restZ na
  pose de aim antes do rotation.x) — produtor pediu pra resolver depois.
