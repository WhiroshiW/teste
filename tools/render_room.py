#!/usr/bin/env python3
"""Rasterizador offline de sala (olhos): lê /tmp/room_render.json (do render_room_dump.mjs)
e desenha com z-buffer + textura real + sombreamento por normal."""
import json, base64, io
import numpy as np
from PIL import Image

D = json.load(open('/tmp/room_render.json'))
W, H = 640, 360
FOV = 62.0
TEXCACHE = {}

def tex_for(key):
    if key is None:
        return None
    if key not in TEXCACHE:
        b = base64.b64decode(D['textures'][key])
        TEXCACHE[key] = np.asarray(Image.open(io.BytesIO(b)).convert('RGB'), dtype=np.uint8)
    return TEXCACHE[key]

tris = []  # (v0, v1, v2, uv0, uv1, uv2, tex, col)
for m in D['meshes']:
    w = np.array(m['world'], dtype=np.float64).reshape(-1, 3)
    tex = tex_for(m.get('texKey'))
    col = tuple(m.get('col', (150, 120, 100)))
    idx = np.array(m['idx'], dtype=np.int64) if m.get('idx') else np.arange(m['count'], dtype=np.int64)
    uv = np.array(m['uvs'], dtype=np.float64).reshape(-1, 2) if m.get('uvs') else None
    for t in range(0, len(idx) - 2, 3):
        i0, i1, i2 = idx[t], idx[t+1], idx[t+2]
        tuv = None if uv is None else (uv[i0], uv[i1], uv[i2])
        tris.append((w[i0], w[i1], w[i2], tuv, tex, col))

def render(camdef, out):
    cam = np.array(camdef['pos'], dtype=np.float64)
    tgt = np.array(camdef['tgt'], dtype=np.float64)
    fw = tgt - cam; fw /= np.linalg.norm(fw)
    rt = np.cross(fw, [0.0, 1.0, 0.0]); rt /= np.linalg.norm(rt)
    up = np.cross(rt, fw)
    f = (H / 2.0) / np.tan(np.radians(FOV) / 2.0)
    img = np.zeros((H, W, 3), dtype=np.uint8)
    img[:] = (10, 10, 16)
    zbuf = np.full((H, W), 1e9)

    def proj(p):
        d = p - cam
        z = float(np.dot(d, fw))
        if z < 0.05:
            return None
        x = float(np.dot(d, rt)) * f / z + W / 2.0
        y = H / 2.0 - float(np.dot(d, up)) * f / z
        return x, y, z

    LIGHT = np.array([0.35, 0.85, 0.4]); LIGHT /= np.linalg.norm(LIGHT)
    for (p0, p1, p2, tuv, tex, col) in tris:
        n = np.cross(p1 - p0, p2 - p0)
        ln = np.linalg.norm(n)
        if ln < 1e-9:
            continue
        n /= ln
        # backface (normal apontando pra longe da câmera) — pula
        if float(np.dot(n, p0 - cam)) > 0:
            continue
        shade = 0.5 + 0.6 * abs(float(np.dot(n, LIGHT)))
        prj = [proj(p0), proj(p1), proj(p2)]
        if any(q is None for q in prj):
            continue
        (x0, y0, z0), (x1, y1, z1), (x2, y2, z2) = prj
        minx = max(0, int(min(x0, x1, x2))); maxx = min(W - 1, int(max(x0, x1, x2)) + 1)
        miny = max(0, int(min(y0, y1, y2))); maxy = min(H - 1, int(max(y0, y1, y2)) + 1)
        if minx > maxx or miny > maxy:
            continue
        area = (x1 - x0) * (y2 - y0) - (x2 - x0) * (y1 - y0)
        if abs(area) < 1e-9:
            continue
        for py in range(miny, maxy + 1):
            for px in range(minx, maxx + 1):
                w0 = ((x1 - px) * (y2 - py) - (x2 - px) * (y1 - py)) / area
                w1 = ((x2 - px) * (y0 - py) - (x0 - px) * (y2 - py)) / area
                w2 = 1.0 - w0 - w1
                if w0 < -1e-6 or w1 < -1e-6 or w2 < -1e-6:
                    continue
                z = w0 * z0 + w1 * z1 + w2 * z2
                if z >= zbuf[py, px]:
                    continue
                zbuf[py, px] = z
                if tex is not None and tuv is not None:
                    u = w0 * tuv[0][0] + w1 * tuv[1][0] + w2 * tuv[2][0]
                    vv = w0 * tuv[0][1] + w1 * tuv[1][1] + w2 * tuv[2][1]
                    th, tw = tex.shape[:2]
                    tx = min(tw - 1, max(0, int((u % 1.0) * tw)))
                    ty = min(th - 1, max(0, int((vv % 1.0) * th)))
                    c = tex[ty, tx].astype(np.float64)
                else:
                    c = np.array(col, dtype=np.float64)
                img[py, px] = np.clip(c * shade, 0, 255).astype(np.uint8)
    Image.fromarray(img).save(out)
    print('render:', out)

for cam in D['CAMS']:
    render(cam, cam['out'])
