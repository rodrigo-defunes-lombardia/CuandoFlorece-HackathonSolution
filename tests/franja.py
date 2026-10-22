"""Franja de temporadas encima del mapa y su enlace a la Agencia.
Uso (con `npm run dev` en marcha): python tests/franja.py [carpeta_capturas]"""
import json, sys
from datetime import datetime
from pathlib import Path
from urllib.parse import urlparse, parse_qs
from playwright.sync_api import sync_playwright

URL = "http://localhost:5173"
OUT = Path(sys.argv[1] if len(sys.argv) > 1 else "/tmp/capturas"); OUT.mkdir(parents=True, exist_ok=True)
DEST = json.loads((Path(__file__).parent.parent / "web/public/data/destinos.json").read_text())["destinos"]
CAL = {d["id"]: d["calendario"] for d in DEST}
HOY = datetime(2026, 10, 21, 12, 0)
fallos = []
def ok(c, m):
    print(("OK   " if c else "FALLA"), m)
    if not c: fallos.append(m)
def q(pg): return parse_qs(urlparse(pg.url).query)
def nueva(b, w=1440, h=900):
    ctx = b.new_context(viewport={"width": w, "height": h}); pg = ctx.new_page(); errs = []
    pg.on("console", lambda m: m.type == "error" and errs.append(m.text)); pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.clock.set_fixed_time(HOY)  # «hoy» del navegador: 21/10/2026
    return ctx, pg, errs
INTERNOS = "() => [...document.querySelectorAll('*')].filter(e => e.scrollHeight > e.clientHeight + 1 && /auto|scroll/.test(getComputedStyle(e).overflowY)).map(e => e.className)"

with sync_playwright() as p:
    b = p.chromium.launch()
    ctx, pg, errs = nueva(b)

    MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"]
    # Meses esperados de cada planta, a partir del calendario del pipeline (un mes cuenta si el rango lo toca)
    ESPERADO = {id_: list(range(c["mes_desde"], c["mes_hasta"] + 1)) for id_, c in CAL.items()}

    # 1. Encima del mapa; solo la fila de 12 meses y chips debajo (sin columna izquierda ni barras)
    pg.goto(URL); pg.wait_for_selector(".franja-chip")
    yf, ym, yb = (pg.locator(s).bounding_box()["y"] for s in (".franja", ".vista", ".barra"))
    ok(yb < yf < ym, "la franja está entre la cabecera y el mapa")
    ok(pg.locator(".franja-col").count() == 12 and pg.locator(".franja-mes").count() == 12, "12 meses")
    ok(pg.locator(".franja .badge, .franja-etq, .franja-barra, .franja-planta").count() == 0, "sin columna izquierda, badges ni barras")
    x0 = pg.locator(".franja-col").first.bounding_box()["x"]
    ok(x0 < 20, f"los meses empiezan en el borde izquierdo (x={x0:.0f})")
    ok(pg.locator(".franja-origen").inner_text().startswith("Meses según calendario histórico"), f"línea de origen: «{pg.inner_text('.franja-origen')}»")

    # 2. Chips en los meses correctos, repetidos en cada mes de la temporada; guion en los meses vacíos
    for id_, c in CAL.items():
        meses = [i + 1 for i in range(12) if pg.locator(".franja-col").nth(i).locator(f".franja-chip[href^='/agencia?destino={id_}']").count()]
        ok(meses == ESPERADO[id_], f"{c['planta']}: chip en los meses {meses} (esperado {ESPERADO[id_]})")
    vacios = [i + 1 for i in range(12) if not any(i + 1 in m for m in ESPERADO.values())]
    ok(all(pg.locator(".franja-col").nth(m - 1).locator(".franja-vacio").count() == 1 for m in vacios), f"guion en los meses sin planta {vacios}")
    ok(pg.locator(".franja-chip").count() == sum(len(m) for m in ESPERADO.values()), f"{pg.locator('.franja-chip').count()} chips en total")

    # 3 (hoy). Octubre es «Hoy» y contiene el chip del hayedo
    hoy = pg.locator(".franja-col--hoy")
    ok(hoy.count() == 1 and "OCT" in hoy.locator(".franja-mes").inner_text().upper() and "HOY" in hoy.locator(".franja-mes").inner_text().upper(), f"octubre resaltado como Hoy ({hoy.locator('.franja-mes').inner_text()!r})")
    ok(hoy.locator(".franja-chip[href^='/agencia?destino=tejera_negra']").count() == 1, "octubre contiene el chip del hayedo")

    # 7. Teclado y aria-label
    chips = pg.locator(".franja-chip")
    etiquetas = chips.evaluate_all("as => as.map(a => a.getAttribute('aria-label'))")
    ok(all(e and e.endswith("Planear viaje") and e.count(",") >= 2 for e in etiquetas), f"aria-label con planta, destino y mes: {etiquetas[0]!r}")
    ok("Azahar, Sevilla, marzo" in etiquetas[0], "el primer chip es «Azahar, Sevilla, marzo»")
    pg.locator(".menu a").last.focus(); vistos = []
    for _ in range(chips.count() + 3):
        pg.keyboard.press("Tab")
        if pg.evaluate("document.activeElement.classList.contains('franja-chip')"):
            vistos.append(pg.evaluate("document.activeElement.getAttribute('aria-label')"))
            ok(pg.evaluate("getComputedStyle(document.activeElement).outlineStyle") == "solid", f"foco visible en «{vistos[-1]}»")
    ok(len(vistos) == chips.count(), f"el tabulador recorre los {len(vistos)} chips en orden")
    pg.locator(".franja-chip").last.focus(); pg.keyboard.press("Enter"); pg.wait_for_selector(".ag-form")
    ok(urlparse(pg.url).path == "/agencia" and pg.locator(".franja-chip").count() == 0, "Enter sobre un chip navega a la Agencia (enlace real)")

    # 3. Pulsar cada planta: /agencia?destino=<id>, destino fijado, fechas y personas vacías, sin ruta ni precio
    for id_, c in CAL.items():
        pg.goto(URL); pg.wait_for_selector(".franja-chip")
        pg.locator(f".franja-chip[href^='/agencia?destino={id_}']").first.click(); pg.wait_for_selector(".ag-form"); pg.wait_for_timeout(900)
        ok(urlparse(pg.url).path == "/agencia" and q(pg) == {"destino": [id_]}, f"{c['planta']}: → {pg.url.replace(URL, '')}")
        ok(pg.input_value(".ag-form select") == id_, f"{c['planta']}: el selector muestra {id_}")
        ok(pg.locator(".ag-sel input:checked").count() == 0 and "cal-boton--vacio" in pg.get_attribute(".cal-boton", "class"), f"{c['planta']}: días y personas vacíos")
        ok(pg.locator(".ag-dias, .ag-desglose, .precio").count() == 0 and pg.locator(".ag-falta").count() == 1, f"{c['planta']}: sin ruta ni precio, con mensaje de ayuda")
        foco = pg.evaluate("document.activeElement.className")
        caja = pg.locator(".ag-form").bounding_box()
        ok("cal-boton" in foco and 0 <= caja["y"] < 200, f"{c['planta']}: baja hasta el formulario (y={caja['y']:.0f}) con el foco en las fechas")

    # 4. Solo personas o solo fechas: sigue sin ruta
    pg.goto(URL + "/agencia?destino=tejera_negra"); pg.wait_for_selector(".ag-form")
    pg.click(".ag-sel label:has-text('2')")
    ok(pg.locator(".ag-dias").count() == 0 and "días del viaje" in pg.inner_text(".ag-falta"), f"solo personas: sin ruta («{pg.inner_text('.ag-falta')}»)")
    pg.goto(URL + "/agencia?destino=tejera_negra"); pg.wait_for_selector(".ag-form")
    pg.click(".cal-boton"); pg.locator(".cal-dia:not([aria-disabled=true])").nth(0).click(); pg.locator(".cal-dia:not([aria-disabled=true])").nth(2).click()
    ok(pg.locator(".ag-dias").count() == 0 and "personas" in pg.inner_text(".ag-falta"), f"solo fechas: sin ruta («{pg.inner_text('.ag-falta')}»)")

    # 5. Con los dos, ruta y URL completa
    pg.click(".ag-sel label:has-text('3')"); pg.wait_for_selector(".ag-dias")
    ok(pg.locator(".ag-dia").count() == 3 and pg.locator(".ag-desglose").count() == 1 and {"destino", "ida", "vuelta", "personas"} <= set(q(pg)),
       f"fechas + personas generan la ruta y la URL ({pg.url.replace(URL, '')})")

    # 6. Enlace compartido con los tres parámetros
    pg.goto(URL + "/agencia?destino=brihuega&dias=3&personas=2"); pg.wait_for_selector(".ag-dias")
    ok(pg.locator(".ag-dia").count() == 3 and pg.locator(".ag-sel input:checked").get_attribute("value") == "2", "?destino=…&dias=3&personas=2 genera la ruta directamente")
    ok(not errs, f"sin errores de consola {errs[:3]}")
    ctx.close()

    # 8. Capturas: sin desbordes, sin scroll vertical interno, el mes actual visible en móvil
    for nombre, (w, h) in {"movil": (390, 844), "tableta": (768, 1024), "escritorio": (1440, 900)}.items():
        ctx, pg, errs = nueva(b, w, h)
        pg.goto(URL); pg.wait_for_selector(".franja-chip"); pg.wait_for_timeout(1500)
        r = pg.locator(".franja-col--hoy").bounding_box()
        sc = pg.evaluate("(() => { const f = document.querySelector('.franja-scroll'); return [f.scrollWidth, f.clientWidth, getComputedStyle(f).overflowY] })()")
        ok(pg.evaluate("document.documentElement.scrollWidth <= innerWidth"), f"{nombre}: sin desborde horizontal de la página")
        ok(r["x"] >= 0 and r["x"] + r["width"] <= w, f"{nombre}: el mes actual se ve ({r['x']:.0f}–{r['x'] + r['width']:.0f} de {w})")
        ok(not [c for c in pg.evaluate(INTERNOS) if "franja" in c], f"{nombre}: la franja no tiene scroll vertical interno")
        if nombre == "escritorio": ok(sc[0] <= sc[1], f"escritorio: los 12 meses caben sin scroll ({sc[0]} ≤ {sc[1]})")
        if nombre == "movil": ok(sc[0] > sc[1], f"móvil: la franja se desplaza en horizontal ({sc[0]} > {sc[1]})")
        trunc = pg.evaluate("[...document.querySelectorAll('.franja-chip')].filter(e => e.scrollWidth > e.clientWidth + 1).map(e => e.textContent)")
        ok(not trunc, f"{nombre}: ningún texto cortado {trunc}")
        pg.screenshot(path=str(OUT / f"franja_{nombre}.png"), clip={"x": 0, "y": 0, "width": w, "height": 260})
        if nombre == "movil": ok(abs((r["x"] + r["width"] / 2) - w / 2) < 30, f"móvil: el mes actual está centrado ({r['x'] + r['width'] / 2:.0f} de {w / 2:.0f})")
        ok(not errs, f"{nombre}: sin errores de consola {errs[:2]}")
        ctx.close()
    b.close()
print("\nTODO OK" if not fallos else f"\n{len(fallos)} FALLOS")
sys.exit(1 if fallos else 0)
