#!/usr/bin/env python3
"""Rasterizador offline do Player (mesmos dados que o jogo desenha).
Uso: python3 tools/render_player.py            # renderiza idle + aim em /tmp"""
import json, base64, io, math
import numpy as np
from PIL import Image

DUMP = json.load(open('/tmp/player_render.json'))
W, H = 480, 270   # 1.5x do RT do jogo (320x180) p/ leitura
TEXCACHE = {}

def tex_for(m, dump):
    if m['tag'] == 'knife_prop':
        if 'knife' not in TEXCACHE:
            b = base64.b64decode(dump['knifeTex'].split(',', 1)[1])
            TEXCACHE['knife'] = np.asarray(Image.open(io.BytesIO(b)).convert('RGB'), dtype=np.uint8)
        return TEXCACHE['knife']
    if m['texPath']:
        key = m['texPath']
        if key not in TEXCACHE:
            TEXCACHE[key] = np.asarray(Image.open(key).convert('RGB'), dtype=np.uint8)
        return TEXCACHE[key]
    return None

COLORS = {'proc': (90, 96, 108)}

def render(state, out):
    tris = []  # (v0,v1,v2, uv0,uv1,uv2, tex, color)
    for m in state['meshes']:
        w = np.array(m['world'], dtype=np.float64).reshape(-1, 3)
        tex = tex_for(m, state)
        base = COLORS.get(m['tag'], (140, 100, 90))
        if m['idx']:
            idx = np.array(m['idx'], dtype=np.int64)
        else:
            idx = np.arange(m['count'], dtype=np.int64)
        uv = np.array(m['uvs'], dtype=np.float64).reshape(-1, 2) if m['uvs'] else None
        for t in range(0, len(idx) - 2, 3):
            i0, i1, i2 = idx[t], idx[t+1], idx[t+2]
            tuv = None if uv is None else (uv[i0], uv[i1], uv[i2])
            tris.append((w[i0], w[i1], w[i2], tuv, tex, base))
    cam, tgt = CAM_OVERRIDE
    fw = tgt - cam; fw /= np.linalg.norm(fw)
    rt = np.cross(fw, [0.0, 1.0, 0.0]); rt /= np.linalg.norm(rt)
    up = np.cross(rt, fw)
    img = np.zeros((H, W, 3), dtype=np.uint8)
    zbuf = np.full((H, W), 1e9)
    for (p0, p1, p2, tuv, tex, base) in tris:
        pts = [p0, p1, p2]
        prj = []
        ok = True
        for p in pts:
            d = p - cam
            z = float(d @ fw)
            if z < 0.05: ok = False; break
            prj.append((float(d @ rt) / z, float(d @ up) / z, z))
        if not ok: continue
        xs = [pr[0] for pr in prj]; ys = [pr[1] for pr in prj]; zs = [pr[2] for pr in prj]
        n = np.cross(p1 - p0, p2 - p0)
        ln = np.linalg.norm(n)
        if ln < 1e-12: continue
        n /= ln
        L = np.array([0.35, 0.8, 0.45]); L /= np.linalg.norm(L)
        shade = 0.45 + 0.6 * max(0.0, float(n @ L))
        x0 = max(0, int((min(xs) / (max(xs) - min(xs) + 1e-9)) * 0 + (min(xs) * 0.9 + 0.5) * W))
        # mapeamento simples: x∈[-0.8,0.8] y∈[-0.45,0.45]
        def px(x, y):
            ix = int((x * 0.9 + 0.5) * W); iy = int((0.5 - y * 1.6) * H)
            return ix, iy
        P = [px(pr[0], pr[1]) for pr in prj]
        minx = max(0, min(p[0] for p in P) - 1); maxx = min(W - 1, max(p[0] for p in P) + 1)
        miny = max(0, min(p[1] for p in P) - 1); maxy = min(H - 1, max(p[1] for p in P) + 1)
        if minx > maxx or miny > maxy: continue
        ax, ay = P[0]; bx, by = P[1]; cx, cy = P[2]
        den = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy)
        if abs(den) < 1e-12: continue
        for yy in range(miny, maxy + 1):
            for xx in range(minx, maxx + 1):
                l0 = ((by - cy) * (xx + 0.5 - cx) + (cx - bx) * (yy + 0.5 - cy)) / den
                l1 = ((cy - ay) * (xx + 0.5 - cx) + (ax - cx) * (yy + 0.5 - cy)) / den
                l2 = 1 - l0 - l1
                if l0 < -0.001 or l1 < -0.001 or l2 < -0.001: continue
                z = l0 * zs[0] + l1 * zs[1] + l2 * zs[2]
                if z >= zbuf[yy, xx]: continue
                zbuf[yy, xx] = z
                if tex is not None and tuv:
                    u = l0 * tuv[0][0] + l1 * tuv[1][0] + l2 * tuv[2][0]
                    v = l0 * tuv[0][1] + l1 * tuv[1][1] + l2 * tuv[2][1]
                    th, tw = tex.shape[:2]
                    ix = min(tw - 1, max(0, int(u * tw)))
                    iy = min(th - 1, max(0, int((1 - v) * th)))
                    c = tex[iy, ix]
                else:
                    c = np.array(base, dtype=np.uint8)
                img[yy, xx] = np.clip(c.astype(np.float64) * shade, 0, 255).astype(np.uint8)
    Image.fromarray(img).resize((W * 2, H * 2), Image.NEAREST).save(out)
    print('OK', out)

import sys
ANG = sys.argv[1] if len(sys.argv) > 1 else 'front'
CAMS = {
  'front':  ([0.25, 1.35, 2.3],  [0.2, 0.95, 0.0]),
  'back':   ([0.25, 1.35, -2.3], [0.2, 0.95, 0.0]),
  'palm':   ([1.6, 0.9, 0.9],    [0.35, 0.8, 0.05]),
  'walk':   ([-1.1, 1.6, -1.3],  [0.3, 0.9, 0.0]),
  'game':   ([2.2, 2.5, 2.0],    [0.2, 0.85, 0.0]), # ~câmera de gameplay (canto alto, 33 graus)
}
_cam, _tgt = CAMS[ANG]
CAM_OVERRIDE = (np.array(_cam), np.array(_tgt))
for st in DUMP:
    render(st, f"/tmp/player_{st['mode']}_{ANG}.png")
