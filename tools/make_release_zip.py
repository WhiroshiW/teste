#!/usr/bin/env python3
"""
SANTA LÚCIA (Equipe Nakamura) — Gerador do pacote de release .ZIP
Gera o `santa_lucia_remaster.zip` na raiz do projeto com conteúdo determinístico.

Uso:
    python3 tools/make_release_zip.py

O arquivo gerado é o mesmo apontado por index.html, baixar.html e download.html
(botões "BAIXAR PROJETO (.ZIP)").
"""
import os
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "santa_lucia_remaster.zip"

# Pastas/arquivos que nunca entram no pacote
EXCLUDE_DIRS = {".git", ".github", ".codespaces", "__pycache__", "node_modules", "tools"}
EXCLUDE_FILES = {"santa_lucia_remaster.zip", ".gitignore"}
# Data fixa para build determinístico (28/09/2026 — data do dossiê de atualização)
FIXED_DATE = (2026, 9, 28, 12, 0, 0)


def collect():
    files = []
    for dirpath, dirnames, filenames in os.walk(ROOT):
        rel_dir = Path(dirpath).relative_to(ROOT)
        dirnames[:] = [d for d in dirnames if d not in EXCLUDE_DIRS]
        for name in sorted(filenames):
            if name in EXCLUDE_FILES:
                continue
            files.append(Path(dirpath) / name)
    return sorted(files)


def main():
    if OUT.exists():
        OUT.unlink()
    count = 0
    with zipfile.ZipFile(OUT, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as zf:
        for f in collect():
            arcname = f.relative_to(ROOT).as_posix()
            info = zipfile.ZipInfo(arcname, date_time=FIXED_DATE)
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = 0o644 << 16
            zf.writestr(info, f.read_bytes())
            count += 1
    size = OUT.stat().st_size
    print(f"✔ {OUT.name} gerado: {count} arquivos, {size / (1024 * 1024):.1f} MB")


if __name__ == "__main__":
    main()
