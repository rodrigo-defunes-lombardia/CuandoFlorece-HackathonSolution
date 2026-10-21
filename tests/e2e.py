"""Recorrido de la demo con Playwright. Uso: .venv/bin/python tests/e2e.py [carpeta_capturas]
Requiere `npm run dev` en marcha (puerto 5173)."""
import sys, base64
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
        ctx = b.new_context(viewport={"width": w, "height": h}, permissions=["geolocation"], geolocation={"latitude": 40.7688, "longitude": -2.8693})
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
                ok("Cuánto confiar" in t and "Cuándo ir" in t, f"ficha {dest}: estado, rango y confianza")
                pg.wait_for_function("document.querySelector('.tiempo')?.innerText.includes('Últimos 7 días') || document.querySelector('.tiempo')?.innerText.includes('No hay datos')", timeout=15000)
                tt = pg.inner_text(".tiempo")
                ok("Últimos 7 días" in tt and "Open-Meteo" in tt, f"ficha {dest}: tiempo de Open-Meteo ({tt.splitlines()[-1][:70]})")
                ok(pg.locator(".ficha .badge").count() >= 1, f"ficha {dest}: badge de origen")
                pg.screenshot(path=str(OUT / f"escritorio_ficha_{dest.split()[-1]}.png"), full_page=False)
                pg.get_by_text("← Todos los destinos").click()
            # Simulador
            antes = pg.locator(".marca").nth(2).get_attribute("aria-label")
            pg.get_by_role("combobox", name="Saltar a una fecha clave").select_option("2027-04-01")
            pg.wait_for_timeout(600)
            despues = pg.locator(".marca").nth(2).get_attribute("aria-label")
            ok(antes != despues, f"simulador cambia estado: «{antes}» → «{despues}»")
            pg.screenshot(path=str(OUT / "escritorio_2_abril2027.png"))
            pg.get_by_role("button", name="Hoy", exact=True).click()
            # Verificación ciudadana: lejos y cerca
            pg.locator(".tarjeta", has_text="Tejera Negra").click()
            ant = pg.inner_text(".ficha .estado")
            pg.get_by_role("button", name="Yo estuve aquí").click()
            pg.get_by_label("Pleno color").check(force=True) if False else pg.locator(".radio", has_text="Pleno color").click()
            pg.set_input_files("input[type=file]", {"name": "f.png", "mimeType": "image/png", "buffer": base64.b64decode("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==")})
            pg.get_by_role("button", name="Demo: estoy lejos").click()
            pg.get_by_role("button", name="Enviar observación").click()
            ok("descartada" in pg.inner_text(".modal"), "ubicación lejana rechazada con mensaje")
            pg.get_by_role("button", name="Demo: estoy aquí").click()
            pg.get_by_role("button", name="Enviar observación").click()
            pg.wait_for_selector(".modal .ok"); ok(True, "observación cercana aceptada: " + pg.inner_text(".modal .ok"))
            pg.get_by_role("button", name="Cerrar").last.click()
            ok("Verificado por 4" in pg.inner_text(".ficha"), "ficha muestra 'Verificado por 4 personas'")
            pg.screenshot(path=str(OUT / "escritorio_3_verificada.png"))
            # Alerta
            pg.get_by_role("button", name="Avísame cuando llegue la flor").click()
            pg.get_by_label("Tu correo").fill("a@b.es"); pg.get_by_role("button", name="Avísame", exact=True).click()
            ok("demo" in pg.inner_text(".modal").lower(), "alerta simulada confirma que es demo")
            pg.keyboard.press("Escape")
            ok(pg.get_by_role("link", name="Negocio").count() == 0, "la web ya no tiene sección Negocio")
        ok(not [l for l in logs if "tiles" not in l.lower() and "GL Driver" not in l and "fetch" not in l.lower()], f"[{nombre}] consola limpia {logs[:3]}")
        ctx.close()
    b.close()
print("\nRESULTADO:", "TODO OK" if not fallos else f"{len(fallos)} fallos")
