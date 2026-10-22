"""Deslizador de la máquina del tiempo: estilo propio (no el nativo del navegador), arrastre, teclado y efecto en el mapa.
Uso (con `npm run dev` en marcha): python tests/simulador.py [carpeta_capturas]"""
import sys
from datetime import datetime
from pathlib import Path
from playwright.sync_api import sync_playwright

URL = "http://localhost:5173"
OUT = Path(sys.argv[1] if len(sys.argv) > 1 else "/tmp/capturas"); OUT.mkdir(parents=True, exist_ok=True)
fallos = []
def ok(c, m):
    print(("OK   " if c else "FALLA"), m)
    if not c: fallos.append(m)
# getComputedStyle no lee los pseudo-elementos del deslizador: se comprueban las reglas cargadas en la hoja de estilos
ESTILO = """() => { const reglas = [...document.styleSheets].flatMap(h => { try { return [...h.cssRules] } catch { return [] } }).flatMap(r => r instanceof CSSMediaRule ? [...r.cssRules] : [r]);
  const de = sel => reglas.filter(r => r.selectorText === sel).map(r => r.style)[0];
  const t = de('.sim-rango::-webkit-slider-thumb'), r = de('.sim-rango::-webkit-slider-runnable-track');
  return { aparicion: getComputedStyle(document.querySelector('.sim-rango')).appearance, pulgar: t && [t.borderRadius, t.background], pista: r && r.background.slice(0, 60) } }"""
# Chromium descarta las reglas -moz-: las de Firefox se comprueban en el propio CSS
CSS = (Path(__file__).parent.parent / "web/src/styles/app.css").read_text()
FIREFOX = all(f".sim-rango::-moz-range-{x}" in CSS for x in ("track", "progress", "thumb"))

with sync_playwright() as p:
    b = p.chromium.launch()
    for nombre, (w, h) in {"movil": (390, 844), "tableta": (768, 1024), "escritorio": (1440, 900)}.items():
        ctx = b.new_context(viewport={"width": w, "height": h}); pg = ctx.new_page(); errs = []
        pg.on("console", lambda m: m.type == "error" and errs.append(m.text)); pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.clock.set_fixed_time(datetime(2026, 10, 21, 12, 0))
        pg.goto(URL); pg.wait_for_selector(".marca"); pg.wait_for_timeout(1500)
        s, sim = pg.locator(".sim-rango"), pg.locator(".sim")

        # Estilo propio: sin aspecto nativo, control redondo ámbar, pista con relleno ámbar hasta el control
        e = pg.evaluate(ESTILO)
        ok(e["aparicion"] == "none" and e["pulgar"] and e["pulgar"][0] == "50%" and "amber" in e["pulgar"][1] and "linear-gradient" in e["pista"] and FIREFOX,
           f"[{nombre}] estilo propio: {e}")
        sim.screenshot(path=str(OUT / f"slider_{nombre}_1_reposo.png"))

        # Arrastre con el ratón: la fecha y el mapa cambian
        fecha0, mapa0 = pg.inner_text(".sim-fecha"), pg.locator(".marca").all_inner_texts()
        caja = s.bounding_box(); y = caja["y"] + caja["height"] / 2
        pg.mouse.move(caja["x"] + 10, y); pg.mouse.down(); pg.mouse.move(caja["x"] + caja["width"] * 0.45, y, steps=8); pg.mouse.up(); pg.wait_for_timeout(400)
        v = int(s.input_value())
        ok(100 < v < 230 and pg.inner_text(".sim-fecha") != fecha0, f"[{nombre}] arrastrar mueve la fecha: {fecha0!r} → {pg.inner_text('.sim-fecha')!r} (valor {v})")
        ok(pg.locator(".marca").all_inner_texts() != mapa0, f"[{nombre}] el mapa se actualiza al arrastrar")
        ok(pg.evaluate("document.querySelector('.sim-rango').style.getPropertyValue('--pct')") == f"{v / 365 * 100}%", f"[{nombre}] el relleno sigue al control")
        sim.screenshot(path=str(OUT / f"slider_{nombre}_2_intermedio.png"))

        # Teclado: Inicio, Fin y flechas, con foco visible
        s.focus(); pg.keyboard.press("Home"); pg.wait_for_timeout(150)
        ok(s.input_value() == "0" and "Hoy" in pg.inner_text(".sim-fecha"), f"[{nombre}] Inicio → hoy")
        pg.keyboard.press("End"); pg.wait_for_timeout(150)
        ok(s.input_value() == "365" and "+365 d" in pg.inner_text(".sim-fecha"), f"[{nombre}] Fin → +365 días ({pg.inner_text('.sim-fecha')})")
        for _ in range(5): pg.keyboard.press("ArrowLeft")
        ok(s.input_value() == "360", f"[{nombre}] flechas: 365 → {s.input_value()}")
        ok(pg.evaluate("getComputedStyle(document.activeElement).outlineStyle") == "solid" and pg.evaluate("document.activeElement.matches(':focus-visible')"), f"[{nombre}] foco visible")
        sim.screenshot(path=str(OUT / f"slider_{nombre}_3_foco.png"))
        ok(not errs, f"[{nombre}] sin errores de consola {errs[:2]}")
        ctx.close()
    b.close()
print("\nTODO OK" if not fallos else f"\n{len(fallos)} FALLOS")
sys.exit(1 if fallos else 0)
