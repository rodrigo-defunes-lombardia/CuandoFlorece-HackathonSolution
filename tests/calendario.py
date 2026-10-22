"""Selector de fechas de /agencia: ida y luego vuelta (de la ida al final de la ventana, sin tope de 5 días).
Usa Brihuega, cuya mejor ventana es 1 jul – 1 ago 2027. Uso (con `npm run dev` en marcha): python tests/calendario.py [carpeta_capturas]"""
import sys
from datetime import datetime
from pathlib import Path
from urllib.parse import urlparse, parse_qs
from playwright.sync_api import sync_playwright

URL = "http://localhost:5173"
OUT = Path(sys.argv[1] if len(sys.argv) > 1 else "/tmp/capturas"); OUT.mkdir(parents=True, exist_ok=True)
fallos = []
def ok(c, m):
    print(("OK   " if c else "FALLA"), m)
    if not c: fallos.append(m)
def q(pg): return parse_qs(urlparse(pg.url).query)
def dia(pg, iso): return pg.locator(f'.cal-dia[data-dia="{iso}"]')
def activo(pg, iso): return dia(pg, iso).get_attribute("aria-disabled") is None
def abrir(pg):
    pg.goto(URL + "/agencia?destino=brihuega"); pg.wait_for_selector(".ag-form"); pg.click(".cal-boton"); pg.wait_for_selector(".cal-panel")

with sync_playwright() as p:
    b = p.chromium.launch()
    for nombre, (w, h) in {"movil": (390, 844), "escritorio": (1440, 900)}.items():
        ctx = b.new_context(viewport={"width": w, "height": h}); pg = ctx.new_page(); errs = []
        pg.on("console", lambda m: m.type == "error" and errs.append(m.text)); pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.clock.set_fixed_time(datetime(2026, 10, 21, 12, 0))
        abrir(pg)
        ok("julio 2027" in pg.inner_text(".cal-mes").lower() and activo(pg, "2027-07-01") and not pg.locator(".cal-flecha[aria-label='Mes anterior']").is_enabled(),
           f"[{nombre}] paso 1: julio 2027, desde el 1 jul y sin poder ir a junio")

        # Ida el 21 jul: del 1 al 20 deshabilitados (aria-disabled, no responden); del 21 al 31 habilitados
        dia(pg, "2027-07-21").click()
        paso = pg.inner_text(".cal-paso")
        ok("Ahora el día de vuelta (ida: 21 jul)" in paso and "máximo" not in paso, f"[{nombre}] texto del paso 2: «{paso}»")
        antes = [d for d in range(1, 21) if activo(pg, f"2027-07-{d:02d}")]
        ok(not antes, f"[{nombre}] 1–20 jul deshabilitados {antes}")
        ok(all(activo(pg, f"2027-07-{d:02d}") for d in range(21, 32)), f"[{nombre}] 21–31 jul habilitados (incluido el 26 y el 31)")
        dia(pg, "2027-07-10").click(force=True); pg.wait_for_timeout(150)
        ok(pg.locator(".cal-panel").count() == 1 and "ida: 21 jul" in pg.inner_text(".cal-paso"), f"[{nombre}] pulsar un día anterior no hace nada")
        ok("cal-dia--extremo" in dia(pg, "2027-07-21").get_attribute("class"), f"[{nombre}] la ida queda marcada")
        pg.locator(".cal-panel").screenshot(path=str(OUT / f"calendario_{nombre}_paso2.png"))

        # Vuelta el 1 ago, cruzando de mes con la flecha
        pg.click(".cal-flecha[aria-label='Mes siguiente']")
        ok("agosto 2027" in pg.inner_text(".cal-mes").lower() and activo(pg, "2027-08-01") and not activo(pg, "2027-08-02")
           and not pg.locator(".cal-flecha[aria-label='Mes siguiente']").is_enabled(), f"[{nombre}] agosto: el 1 habilitado, el 2 no, y no se pasa de agosto")
        dia(pg, "2027-08-01").click()
        ok(pg.locator(".cal-panel").count() == 0 and "12 días" in pg.inner_text(".cal-boton") and q(pg).get("ida") == ["2027-07-21"] and q(pg).get("vuelta") == ["2027-08-01"],
           f"[{nombre}] 21 jul – 1 ago: {pg.inner_text('.cal-boton')!r}")
        pg.click(".ag-sel label:has-text('2')"); pg.wait_for_selector(".ag-dias")
        av = pg.inner_text(".ag-avisos") if pg.locator(".ag-avisos").count() else ""
        ok(pg.locator(".ag-dia").count() == 12 and "tiempo libre, sin coste" in av, f"[{nombre}] ruta de 12 días con aviso de días libres («{av[:90]}»)")
        tot = [int(pg.get_attribute(f"tr[data-linea={l}] td", "data-cent")) for l in ("alojamiento", "actividades", "comidas", "subtotal", "margen", "total")]
        ok(tot[0] + tot[1] + tot[2] == tot[3] and tot[3] + tot[4] == tot[5] and "11 noches" in pg.inner_text("tr[data-linea=alojamiento]"), f"[{nombre}] desglose cuadra con 11 noches ({tot})")

        # Mismo día de ida y vuelta → 1 día
        pg.click(".cal-boton"); dia(pg, "2027-07-15").click(); dia(pg, "2027-07-15").click(); pg.wait_for_timeout(200)
        ok("1 día" in pg.inner_text(".cal-boton") and pg.locator(".ag-dia").count() == 1, f"[{nombre}] misma fecha de ida y vuelta: ruta de 1 día")

        # Cambiar día de ida reinicia la selección; al reabrir se empieza por el paso 1
        pg.click(".cal-boton"); dia(pg, "2027-07-20").click()
        pg.get_by_role("button", name="Cambiar día de ida").click()
        ok("Elige el día de ida" in pg.inner_text(".cal-paso") and activo(pg, "2027-07-05"), f"[{nombre}] «Cambiar día de ida» vuelve al paso 1")
        dia(pg, "2027-07-05").click(); dia(pg, "2027-07-07").click(); pg.wait_for_timeout(200)
        ok(q(pg).get("ida") == ["2027-07-05"] and "3 días" in pg.inner_text(".cal-boton"), f"[{nombre}] nueva ida 5 jul, vuelta 7 jul")
        pg.click(".cal-boton")
        ok("Elige el día de ida" in pg.inner_text(".cal-paso"), f"[{nombre}] al reabrir empieza por el paso 1")
        pg.keyboard.press("Escape"); ok(pg.locator(".cal-panel").count() == 0, f"[{nombre}] Escape cierra")

        # Teclado: el foco entra en un día; flechas para moverse (también entre meses); Enter elige; los deshabilitados no
        pg.click(".cal-boton")
        f0 = pg.evaluate("document.activeElement.dataset.dia")
        ok(f0 == "2027-07-05" and pg.evaluate("document.activeElement.tabIndex") == 0 and pg.locator(".cal-dia[tabindex='0']").count() == 1, f"[{nombre}] el foco empieza en la ida actual ({f0}) con un solo día tabulable")
        pg.keyboard.press("ArrowRight"); pg.keyboard.press("ArrowDown")
        ok(pg.evaluate("document.activeElement.dataset.dia") == "2027-07-13", "flechas: → y ↓ llevan al 13 jul")
        ok(pg.evaluate("getComputedStyle(document.activeElement).outlineStyle") == "solid", f"[{nombre}] foco visible")
        pg.keyboard.press("Enter")
        ok("ida: 13 jul" in pg.inner_text(".cal-paso"), f"[{nombre}] Enter elige la ida")
        pg.keyboard.press("ArrowUp"); pg.keyboard.press("Enter")
        ok(pg.evaluate("document.activeElement.dataset.dia") == "2027-07-06" and pg.evaluate("document.activeElement.getAttribute('aria-disabled')") == "true" and "ida: 13 jul" in pg.inner_text(".cal-paso"),
           f"[{nombre}] un día deshabilitado (6 jul) recibe el foco pero Enter no lo elige")
        for _ in range(3): pg.keyboard.press("ArrowDown")
        ok(pg.evaluate("document.activeElement.dataset.dia") == "2027-07-27", "↓ avanza semanas")
        pg.keyboard.press("ArrowDown"); pg.wait_for_timeout(100)
        ok(pg.evaluate("document.activeElement.dataset.dia") == "2027-08-03" and "agosto" in pg.inner_text(".cal-mes").lower(), "↓ cruza a agosto")
        pg.keyboard.press("ArrowLeft"); pg.keyboard.press("ArrowLeft"); pg.keyboard.press(" ")
        ok(pg.locator(".cal-panel").count() == 0 and q(pg).get("vuelta") == ["2027-08-01"] and "20 días" in pg.inner_text(".cal-boton"), f"[{nombre}] Espacio elige la vuelta 1 ago ({pg.inner_text('.cal-boton')})")
        ok(pg.evaluate("document.activeElement.classList.contains('cal-boton')"), f"[{nombre}] al cerrar, el foco vuelve al botón")
        ok(not errs, f"[{nombre}] sin errores de consola {errs[:2]}")
        ctx.close()
    b.close()
print("\nTODO OK" if not fallos else f"\n{len(fallos)} FALLOS")
sys.exit(1 if fallos else 0)
