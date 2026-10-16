#!/usr/bin/env python3
# ============================================================
# OLHOS DO BOT — radar PNG por sala a partir do eyes_<camp>.jsonl
# Mostra COMO a sala foi criada: paredes/sólidos, portas (e trancas),
# pickups, interacts, spawns de inimigos e a trilha que o bot andou.
# Uso: python3 tools/eyes_radar.py [daniel|clara|bento]
# ============================================================
import json, sys, os, math
from PIL import Image, ImageDraw

CAMP = sys.argv[1] if len(sys.argv) > 1 else 'daniel'
SRC = f'docs/refs/_debug/eyes_{CAMP}.jsonl'
OUT = 'docs/refs/_debug'
S = 46  # pixels por metro

def load():
    rooms = {}
    if not os.path.exists(SRC):
        print('sem', SRC); sys.exit(1)
    for line in open(SRC, encoding='utf-8'):
        rec = json.loads(line)
        rooms[rec['room']] = rec  # fica com o ÚLTIMO snapshot da sala
    return rooms

def draw(rec):
    r = rec['room']
    W = int(rec['stats']['cams'] and (max([max([d['x'] for d in rec['doors']] + [p['x'] for p in rec['pickups']] + [i['x'] for i in rec['interacts']] + [12]) + 4 for _ in [0]])))
    xs = [d['x'] for d in rec['doors']] + [p['x'] for p in rec['pickups']] + [i['x'] for i in rec['interacts']] + [e['x'] for e in rec['enemies']] + [s['x'] for s in rec['spawns']] + [0]
    zs = [d['z'] for d in rec['doors']] + [p['z'] for p in rec['pickups']] + [i['z'] for i in rec['interacts']] + [e['z'] for e in rec['enemies']] + [s['z'] for s in rec['spawns']] + [0]
    minx, maxx, minz, maxz = min(xs) - 3, max(xs) + 3, min(zs) - 3, max(zs) + 3
    Wpx, Hpx = int((maxx - minx) * S), int((maxz - minz) * S)
    img = Image.new('RGB', (max(Wpx, 60), max(Hpx, 60)), (14, 13, 18))
    dr = ImageDraw.Draw(img)
    tx = lambda x: int((x - minx) * S)
    tz = lambda z: int((z - minz) * S)

    # trilha do bot
    tr = rec.get('trail') or []
    if len(tr) > 1:
        dr.line([(tx(q['x']), tz(q['z'])) for q in tr], fill=(40, 90, 60), width=2)

    # portas
    for d in rec['doors']:
        x, z = tx(d['x']), tz(d['z'])
        col = (120, 200, 255) if not d['need'] else ((255, 210, 80) if rec['player']['hp'] >= 0 and d['need'] else (255, 210, 80))
        dr.rectangle([x - 5, z - 5, x + 5, z + 5], outline=col, width=2)
        dr.text((x + 8, z - 6), d['target'] + (f"[{d['need']}]" if d['need'] else ''), fill=(160, 200, 230))

    # pickups (ouro se não pego, cinza se pego)
    for p in rec['pickups']:
        x, z = tx(p['x']), tz(p['z'])
        if p['taken']:
            dr.ellipse([x - 3, z - 3, x + 3, z + 3], fill=(70, 70, 70))
        else:
            dr.ellipse([x - 4, z - 4, x + 4, z + 4], fill=(240, 200, 60))
            dr.text((x + 6, z + 2), p['item'], fill=(240, 210, 110))

    # interacts (azul)
    for i in rec['interacts']:
        x, z = tx(i['x']), tz(i['z'])
        dr.rectangle([x - 4, z - 4, x + 4, z + 4], outline=(110, 140, 250), width=2)
        dr.text((x + 6, z - 10), i['act'], fill=(150, 170, 250))

    # spawns (vermelho escuro) e inimigos vivos (vermelho vivo)
    for s in rec['spawns']:
        x, z = tx(s['x']), tz(s['z'])
        dr.ellipse([x - 5, z - 5, x + 5, z + 5], outline=(140, 60, 60), width=2)
        dr.text((x - 20, z + 6), s['type'], fill=(170, 90, 90))
    for e in rec['enemies']:
        x, z = tx(e['x']), tz(e['z'])
        dr.ellipse([x - 6, z - 6, x + 6, z + 6], fill=(230, 60, 60))
        dr.text((x + 8, z - 12), f"{e['type']} {int(e['hp'])}", fill=(255, 120, 120))

    # player final
    px, pz = tx(rec['player']['x']), tz(rec['player']['z'])
    dr.ellipse([px - 4, pz - 4, px + 4, pz + 4], fill=(120, 255, 140))
    a = rec['player']['angle']
    dr.line([px, pz, px + math.sin(a) * 14, pz + math.cos(a) * 14], fill=(120, 255, 140), width=2)

    # cabeçalho
    dr.text((6, 4), f"{rec['roomName']}  |  t={rec['t']}s  hp={rec['player']['hp']}  frags={rec.get('frags',0)}/4  meshes={rec['stats']['meshes']} lights={rec['stats']['lights']}", fill=(230, 230, 210))
    dr.text((6, 16), (rec.get('objective') or '')[:110], fill=(180, 220, 180))

    return img

rooms = load()
os.makedirs(OUT, exist_ok=True)
made = []
for rid, rec in sorted(rooms.items()):
    img = draw(rec)
    path = f'{OUT}/radar_{CAMP}_{rid}.png'
    img.save(path)
    made.append(path)
print(f'👁 {len(made)} radar(s):', ', '.join(rid for rid in rooms))
