"""Comprueba que cada destino se dibuja exactamente en su coordenada a distintos zooms.
Mira el píxel donde cae la coordenada: debe ser el punto crema del centro de la flor.
Uso (con `npm run dev` en marcha): python tests/precision_mapa.py [carpeta_capturas]"""
import sys, json
from pathlib import Path
from playwright.sync_api import sync_playwright

OUT = Path(sys.argv[1] if len(sys.argv) > 1 else "/tmp/capturas"); OUT.mkdir(parents=True, exist_ok=True)
# Coordenadas de destinos.json (fuente única: COORDENADAS en pipeline/build.py)
DEST = {d["id"]: (d["lon"], d["lat"]) for d in json.loads((Path(__file__).parent.parent / "web/public/data/destinos.json").read_text())["destinos"]}
fallos = 0
with sync_playwright() as p:
    b = p.chromium.launch()
    vistas = {"movil": (390, 844), "escritorio": (1440, 900)}
    for nombre, (w, h) in ([(sys.argv[2], vistas[sys.argv[2]])] if len(sys.argv) > 2 else vistas.items()):
        pg = b.new_page(viewport={"width": w, "height": h}, device_scale_factor=1)
        pg.goto("http://localhost:5173"); pg.wait_for_function("window.__mapa && window.__mapa.getSource('destinos')"); pg.wait_for_timeout(1500)
        for zoom in (3.5, 5, 7, 9, 12, 14.5):
            for id_, (lon, lat) in DEST.items():
                pg.evaluate(f"window.__mapa.jumpTo({{center: [{lon}, {lat}], zoom: {zoom}}})"); pg.wait_for_timeout(500)
                x, y = pg.evaluate(f"(() => {{ const r = window.__mapa.getCanvas().getBoundingClientRect(); const q = window.__mapa.project([{lon}, {lat}]); return [r.left + q.x, r.top + q.y] }})()")
                pg.screenshot(path=str(OUT / "_p.png"), clip={"x": x - 1, "y": y - 1, "width": 3, "height": 3})
                from PIL import Image
                px = Image.open(OUT / "_p.png").convert("RGB").getpixel((1, 1))
                # ¿Otro destino a menos de una flor (≈ 44 px)? Entonces el solape es esperado a este zoom
                cerca = pg.evaluate(f"(() => {{ const q = window.__mapa.project([{lon}, {lat}]); return {[list(v) for k, v in DEST.items() if k != id_]}.some(([a, b]) => {{ const r = window.__mapa.project([a, b]); return Math.hypot(r.x - q.x, r.y - q.y) < 44 }}) }})()")
                ok = min(px) > 170 and max(px) - min(px) < 25  # crema #FAF7F0 (claro y casi neutro; ningún pétalo lo es)
                if not ok and cerca:
                    print(f"SOLAPE {nombre} zoom {zoom} {id_}: otro destino a menos de 44 px; se dibuja el prioritario encima"); continue
                fallos += not ok
                print(("OK   " if ok else "FALLA"), f"{nombre} zoom {zoom} {id_}: píxel en la coordenada = {px}")
        pg.screenshot(path=str(OUT / f"precision_{nombre}.png")); pg.close()
    b.close()
print("\nTODO OK" if not fallos else f"\n{fallos} fallos"); sys.exit(1 if fallos else 0)
