#!/usr/bin/env python3
"""Gera todos os tamanhos de ícone PWA a partir da imagem master 2048x2048."""

from PIL import Image
import os

src = "/home/ubuntu/webdev-static-assets/plakr-icon-512.png"
out_dir = "/home/ubuntu/apostai/client/public"

sizes = [
    ("favicon-16x16.png", 16),
    ("favicon-32x32.png", 32),
    ("apple-touch-icon.png", 180),
    ("icon-192.png", 192),
    ("icon-512.png", 512),
]

img = Image.open(src).convert("RGBA")

for filename, size in sizes:
    resized = img.resize((size, size), Image.LANCZOS)
    out_path = os.path.join(out_dir, filename)
    resized.save(out_path, "PNG", optimize=True)
    print(f"✓ {filename} ({size}x{size}) → {out_path}")

# Gerar favicon.ico com múltiplos tamanhos embutidos
ico_img = img.resize((256, 256), Image.LANCZOS)
ico_path = os.path.join(out_dir, "favicon.ico")
ico_img.save(ico_path, format="ICO", sizes=[(16,16),(32,32),(48,48),(64,64),(128,128),(256,256)])
print(f"✓ favicon.ico (multi-size) → {ico_path}")

print("\nTodos os ícones gerados com sucesso!")
