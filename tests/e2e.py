"""Recorrido de la demo con Playwright. Uso: .venv/bin/python tests/e2e.py [carpeta_capturas]
Requiere `npm run dev` en marcha (puerto 5173)."""
import sys, re
from pathlib import Path
from playwright.sync_api import sync_playwright

URL = "http://localhost:5173"
OUT = Path(sys.argv[1] if len(sys.argv) > 1 else "/tmp/capturas"); OUT.mkdir(parents=True, exist_ok=True)
fallos = []

def ok(cond, msg):
    print(("OK   " if cond else "FALLA"), msg)
    if not cond: fallos.append(msg)

with sync_playwright() as p:
    b = p.chromium.launch()
    for nombre, (w, h) in {"movil": (390, 844), "tablet": (768, 1024), "escritorio": (1440, 900)}.items():
        ctx = b.new_context(viewport={"width": w, "height": h})
        pg = ctx.new_page(); logs = []
        pg.on("console", lambda m: logs.append(m.text) if m.type in ("error", "warning") else None)
        pg.on("pageerror", lambda e: logs.append(str(e)))
        pg.goto(URL); pg.wait_for_selector(".marca", timeout=15000); pg.wait_for_timeout(1500)
        ok(pg.locator(".marca").count() == 3, f"[{nombre}] 3 destinos en el mapa")
        ok(pg.evaluate("document.documentElement.scrollWidth <= innerWidth"), f"[{nombre}] sin desborde horizontal")
        pg.screenshot(path=str(OUT / f"{nombre}_1_inicio.png"))
        if nombre == "escritorio":
            for dest in ["Hayedo de Tejera Negra", "Brihuega", "Sevilla"]:
                pg.locator(".tarjeta", has_text=dest).click()
                pg.wait_for_selector(".ficha")
                t = pg.inner_text(".ficha")
                ok(t.index("Cuándo ir") < t.index("Evolución") and pg.locator(".ficha .bloque").first.get_attribute("aria-label") == "Cuándo ir", f"ficha {dest}: 'Cuándo ir' es el primer bloque")
                ok(not any(x in t for x in ["Cuánto confiar", "Probable", "Amplio", "Yo estuve aquí", "Para completar el viaje", "anuncios"]), f"ficha {dest}: sin confianza, rangos, verificación ni partners")
                ok(not re.search(r"\d+ % de (color|floración)", t), f"ficha {dest}: sin porcentaje de color/floración")
                pg.wait_for_function("document.querySelector('.tiempo')?.innerText.includes('Últimos 7 días') || document.querySelector('.tiempo')?.innerText.includes('No hay datos')", timeout=15000)
                tt = pg.inner_text(".tiempo")
                ok("Últimos 7 días" in tt and "Open-Meteo" in tt, f"ficha {dest}: tiempo de Open-Meteo ({tt.splitlines()[-1][:70]})")
                ok(pg.locator(".ficha .badge").count() >= 1, f"ficha {dest}: badge de origen")
                pg.screenshot(path=str(OUT / f"escritorio_ficha_{dest.split()[-1]}.png"), full_page=False)
                pg.get_by_text("← Todos los destinos").click()
            # Simulador
            antes = pg.locator(".marca").nth(2).inner_text()
            pg.get_by_role("combobox", name="Saltar a una fecha clave").select_option("2027-04-01")
            pg.wait_for_timeout(600)
            despues = pg.locator(".marca").nth(2).inner_text()
            ok(antes != despues, f"simulador cambia estado: «{antes}» → «{despues}»")
            pg.screenshot(path=str(OUT / "escritorio_2_abril2027.png"))
            pg.get_by_role("button", name="Hoy", exact=True).click()
            pg.locator(".tarjeta", has_text="Tejera Negra").click()
            pg.screenshot(path=str(OUT / "escritorio_3_ficha_hayedo.png"))
            # Alerta
            pg.get_by_role("button", name="Avísame cuando llegue la flor").click()
            pg.get_by_label("Tu correo").fill("a@b.es"); pg.get_by_role("button", name="Avísame", exact=True).click()
            ok("demo" in pg.inner_text(".modal").lower(), "alerta simulada confirma que es demo")
            pg.keyboard.press("Escape")
            ok(pg.get_by_role("link", name="Negocio").count() == 0 and pg.get_by_role("link", name="Anuncios").count() == 0, "la web no tiene secciones Negocio ni Anuncios")
        ok(not [l for l in logs if "tiles" not in l.lower() and "GL Driver" not in l and "fetch" not in l.lower()], f"[{nombre}] consola limpia {logs[:3]}")
        ctx.close()
    b.close()
print("\nRESULTADO:", "TODO OK" if not fallos else f"{len(fallos)} fallos")
