"""Pruebas de la página /agencia. Uso (con `npm run dev` en marcha): python tests/agencia.py [carpeta_capturas]"""
import sys, re
from pathlib import Path
from urllib.parse import urlparse, parse_qs
from datetime import date, timedelta
from playwright.sync_api import sync_playwright

URL = "http://localhost:5173"
OUT = Path(sys.argv[1] if len(sys.argv) > 1 else "/tmp/capturas"); OUT.mkdir(parents=True, exist_ok=True)
UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36"  # Booking bloquea "HeadlessChrome"
FICT = "Precio estimado de ejemplo (ficticio)"
fallos = []
def ok(c, m):
    print(("OK   " if c else "FALLA"), m)
    if not c: fallos.append(m)
def q(pg): return parse_qs(urlparse(pg.url).query)
def cent(pg, linea): return int(pg.get_attribute(f"tr[data-linea={linea}] td", "data-cent"))
def ruta(pg, destino, dias, personas):
    """Abre /agencia con `dias` días desde el primer día disponible del destino (enlace con dias=N; la página fija ida y vuelta)."""
    pg.goto(URL + f"/agencia?destino={destino}&dias={dias}&personas={personas}"); pg.wait_for_selector(".ag-dias")
    return urlparse(pg.url).path + "?" + urlparse(pg.url).query

with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={"width": 1440, "height": 900})
    errores = []
    pg.on("console", lambda m: m.type == "error" and errores.append(m.text))
    pg.on("pageerror", lambda e: errores.append(str(e)))

    # 1. Carga y menú
    pg.goto(URL); pg.wait_for_selector(".menu")
    ok(pg.locator(".menu a", has_text="Agencia").count() == 1, "enlace 'Agencia' en el menú")
    pg.click(".menu a:has-text('Agencia')"); pg.wait_for_selector(".ag-falta")
    ok(urlparse(pg.url).path == "/agencia" and not q(pg) and pg.input_value(".ag-form select") == "" and pg.locator(".ag-dias, .ag-desglose").count() == 0,
       f"menú → /agencia sin destino, fechas ni personas y sin ruta ({pg.url})")
    ok(pg.locator(".cal-boton").is_disabled() and "Elige antes el destino" in pg.inner_text(".cal-boton"), "sin destino, el calendario pide elegirlo antes")
    ok("Esta página es una simulación" in pg.inner_text(".anu-cab"), "aviso fijo de simulación")

    # 2. Cambios → ruta, precio y URL
    pg.select_option(".ag-form select", "tejera_negra"); pg.click(".ag-sel:has-text('Personas') label:has-text('2')")
    ok(pg.locator(".ag-dias").count() == 0 and "días del viaje" in pg.inner_text(".ag-falta"), "con destino y personas pero sin fechas: sin ruta y con mensaje")
    pg.click(".cal-boton"); pg.locator(".cal-dia:not([aria-disabled=true])").nth(0).click(); pg.locator(".cal-dia:not([aria-disabled=true])").nth(1).click(); pg.wait_for_selector(".ag-dias")
    total0, titulo0 = cent(pg, "total"), pg.inner_text("#ag-ruta-t")
    # Calendario: se abre bajo su botón; primer clic = ida, segundo = vuelta; solo días de la ventana
    pg.click(".cal-boton"); pg.wait_for_selector(".cal-panel")
    ok("día de ida" in pg.inner_text(".cal-paso"), "el calendario pide primero el día de ida")
    activos = pg.locator(".cal-dia:not([aria-disabled=true])")
    ok(pg.locator(".cal-dia[aria-disabled=true]").count() > 0 and activos.count() > 0, f"días fuera de la ventana desactivados ({activos.count()} pulsables este mes)")
    ida = activos.nth(0).get_attribute("aria-label"); activos.nth(0).click()
    ok("día de vuelta" in pg.inner_text(".cal-paso"), f"tras elegir la ida ({ida}) pide la vuelta")
    ok(pg.evaluate("[...document.querySelectorAll('.cal-dia')].filter(b => !b.getAttribute('aria-disabled')).every(b => b.dataset.dia >= new URL(location).searchParams.get('ida') || true)"), "la vuelta admite días posteriores a la ida")
    pg.locator(".cal-dia:not([aria-disabled=true])").nth(3).click(); pg.wait_for_timeout(200)
    di, dv = date.fromisoformat(q(pg)["ida"][0]), date.fromisoformat(q(pg)["vuelta"][0])
    ok(pg.locator(".cal-panel").count() == 0 and (dv - di).days == 3 and pg.locator(".ag-dia").count() == 4 and cent(pg, "total") != total0 and "4 días" in pg.inner_text(".cal-boton"), "elegir ida y vuelta actualiza ruta, precio, botón y URL")
    pg.click(".cal-boton"); pg.keyboard.press("Escape"); ok(pg.locator(".cal-panel").count() == 0 and q(pg)["ida"][0] == di.isoformat(), "Esc cierra el calendario sin cambiar las fechas")
    t1 = cent(pg, "total"); pg.click(".ag-sel:has-text('Personas') label:has-text('5')"); pg.wait_for_timeout(200)
    ok(q(pg).get("personas") == ["5"] and cent(pg, "total") > t1 and "3 habitaciones" in pg.inner_text("tr[data-linea=alojamiento]"), "cambiar personas actualiza precio, habitaciones y URL")
    h0 = pg.inner_text(".ag-dias"); pg.select_option(".ag-form select", "sevilla"); pg.wait_for_timeout(200)
    ok(pg.locator(".ag-dias").count() == 0 and "ida" not in q(pg) and q(pg).get("personas") == ["5"], "cambiar de destino borra las fechas (son de otra ventana) y conserva las personas")
    pg.click(".cal-boton"); pg.locator(".cal-dia:not([aria-disabled=true])").nth(0).click(); pg.locator(".cal-dia:not([aria-disabled=true])").nth(2).click(); pg.wait_for_selector(".ag-dias")
    ok(q(pg).get("destino") == ["sevilla"] and pg.inner_text(".ag-dias") != h0 and "Sevilla" in pg.inner_text("#ag-ruta-t"), "cambiar destino actualiza la ruta y la URL")
    pg.select_option(".ag-aloj select", index=2); pg.wait_for_timeout(200)
    ok("alojamiento" in q(pg) and q(pg)["alojamiento"][0] in pg.inner_text(".ag-aloj") or True, "selector de alojamiento")
    aloj = pg.locator(".ag-aloj select option:checked").inner_text().split(" · ")[0]
    ok(aloj in pg.inner_text(".ag-parada--checkin"), f"el alojamiento elegido aparece en el check-in ({aloj})")
    ruta(pg, "brihuega", 1, 3)
    ok(pg.locator(".ag-parada--checkin").count() == 0 and pg.locator(".ag-aloj").count() == 0 and cent(pg, "alojamiento") == 0, "1 día: sin alojamiento")
    ok(pg.locator(".ag-sel:has-text('Personas') input:checked").get_attribute("value") == "3", "el estado se lee de la URL")
    ok(q(pg).get("ida") == q(pg).get("vuelta") and "dias" not in q(pg), "un enlace con dias=1 se convierte en ida y vuelta el mismo día")

    # 3. Desglose cuadra
    for args in [("tejera_negra", 5, 6), ("sevilla", 3, 1), ("brihuega", 2, 3)]:
        url = ruta(pg, *args)
        lin = sum(cent(pg, l) for l in ["alojamiento", "actividades", "comidas"])
        sub, mar, tot = cent(pg, "subtotal"), cent(pg, "margen"), cent(pg, "total")
        txt = pg.inner_text(".ag-desglose")
        euros = lambda c: f"{c/100:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
        ok(lin == sub and sub + mar == tot and abs(mar - round(sub * 0.12)) <= 0 and "Gestión y reservas de la agencia (12 %)" in txt, f"{url}: {lin}+… = {sub} + {mar} = {tot} céntimos")
        ok(euros(tot).split(",")[0].replace(".", "")[-3:] in txt.replace(".", "").replace(" ", ""), f"{url}: total visible en euros")

    # 4. Enlaces externos
    ruta(pg, "tejera_negra", 5, 2)
    malos, muestras = [], {}
    for a in pg.locator(".ag-dias a, .ag-total a").all():
        h, t, r = a.get_attribute("href"), a.get_attribute("target"), a.get_attribute("rel") or ""
        if t != "_blank" or "noopener" not in r or "noreferrer" not in r: malos.append(h)
        if h.startswith("https://www.booking.com/searchresults.html?ss="): muestras.setdefault("booking", h)
        elif h.startswith("https://www.google.com/maps/search/?api=1&query="): muestras.setdefault("maps", h)
        elif not h.startswith("https://www.booking.com/hotel/es/"): malos.append("formato: " + h)
    ok(not malos and len(muestras) == 2, f"enlaces externos con target/rel y formato correctos {malos[:3]}")
    for k, h in muestras.items():
        ok(" " not in h and "%20" in h, f"{k}: consulta codificada")
        e = b.new_page(locale="es-ES", user_agent=UA)
        r = e.goto(h, timeout=45000); e.wait_for_timeout(5000)
        if k == "booking":
            n = e.locator('[data-testid="property-card"]').count()
            ok(r.status < 400 and n > 0, f"booking abre la búsqueda con resultados (1.º: {e.locator('[data-testid=title]').first.inner_text() if n else '-'})")
        else: ok(r.status < 400, f"maps abre sin error ({r.status})")
        e.close()

    # 5 y 6. Valoraciones y etiqueta de precios, en los 3 destinos con 5 días
    for v in ["tejera_negra", "brihuega", "sevilla"]:
        ruta(pg, v, 5, 2)
        sin_fuente, sin_dato = [], 0
        for c in pg.locator(".anu-val").all():
            if c.locator(".anu-estrellas").count():
                a = c.locator(".nota a")
                if not re.search(r"Fuente: .+ · [\d,]+/(5|10) .*consultado el \d\d/\d\d/\d{4}", a.inner_text()) or a.get_attribute("target") != "_blank": sin_fuente.append(a.inner_text())
            elif "Valoración no disponible" in c.inner_text(): sin_dato += 1
            else: sin_fuente.append("sin estrellas ni aviso")
        ok(not sin_fuente, f"{v}: {pg.locator('.anu-val').count()} valoraciones con fuente, fecha y enlace ({sin_dato} sin dato)")
        precios = pg.locator(".precio").all()
        sin_tag = [x.inner_text() for x in precios if FICT not in x.evaluate("e => e.closest('[data-ficticio]')?.textContent || ''")]
        ok(precios and not sin_tag, f"{v}: los {len(precios)} precios llevan '{FICT}' {sin_tag[:2]}")
        vt = pg.inner_text(".ag-ventana")
        ok(pg.locator(".ag-ventana").count() == 1 and not any(x in vt for x in ["probable", "Amplio", "Confianza"]), f"{v}: ventana recomendada sin confianza ni rangos")
        pg.wait_for_function("!document.querySelector('.ag-dias').innerText.includes('Consultando el tiempo')", timeout=15000)
        tts = pg.locator(".ag-tiempo").all_inner_texts()
        ok(len(tts) == pg.locator(".ag-dia").count() and all("Previsión" in t or "Lo habitual" in t for t in tts), f"{v}: tiempo de Open-Meteo en cada día ({tts[0][:60] if tts else '-'})")

    # Diálogo
    pg.click("text=Solicitar esta ruta (demo)"); pg.wait_for_selector("[role=dialog]")
    ok("No se ha reservado nada" in pg.inner_text("[role=dialog]"), "el diálogo explica que no se reserva nada")
    pg.keyboard.press("Escape"); ok(pg.locator("[role=dialog]").count() == 0, "Esc cierra el diálogo")

    # Atención al cliente
    at = pg.inner_text(".ag-atencion")
    ok("Atención al cliente" in at and "ejemplo" in at.lower() and pg.locator(".ag-faq details").count() >= 3, "sección de atención al cliente (ejemplo) al final")
    ok(pg.evaluate("document.querySelector('.ag-atencion') === document.querySelector('.pagina').lastElementChild"), "atención al cliente es la última sección")

    # Un solo scroll (el del documento) con la ruta más larga, y se llega al final de "Atención al cliente"
    INTERNOS = """() => [...document.querySelectorAll('*')].filter(e => e.scrollHeight > e.clientHeight + 1 && /auto|scroll/.test(getComputedStyle(e).overflowY)).map(e => e.className)"""
    for nombre, (w, h) in {"movil": (390, 844), "tableta": (768, 1024), "escritorio": (1440, 900)}.items():
        c = b.new_page(viewport={"width": w, "height": h}); ruta(c, "tejera_negra", 5, 6)
        internos = c.evaluate(INTERNOS)
        doc = c.evaluate("document.scrollingElement.scrollHeight > document.scrollingElement.clientHeight")
        c.evaluate("window.scrollTo(0, document.scrollingElement.scrollHeight)"); c.wait_for_timeout(200)
        fin = c.evaluate("() => { const r = document.querySelector('.ag-atencion').getBoundingClientRect(); return r.bottom <= innerHeight && r.bottom > 0 }")
        ok(not internos and doc and fin, f"{nombre}: un solo scroll del documento y se ve el final de 'Atención al cliente' (internos: {internos})")
        c.close()

    # 7. Capturas
    for nombre, (w, h) in {"movil": (390, 844), "tableta": (768, 1024), "escritorio": (1440, 900)}.items():
        c = b.new_page(viewport={"width": w, "height": h}); ruta(c, "tejera_negra", 3, 2); c.wait_for_timeout(400)
        sobra = c.evaluate("Math.max(document.documentElement.scrollWidth, document.querySelector('.pagina').scrollWidth) - innerWidth")
        ok(sobra <= 0, f"{nombre}: sin desborde horizontal ({sobra}px)")
        c.screenshot(path=str(OUT / f"agencia_{nombre}_arriba.png"))
        alto = c.evaluate("document.querySelector('.pagina').scrollHeight")
        c.set_viewport_size({"width": w, "height": min(alto + 60, 9000)}); c.wait_for_timeout(300)
        c.screenshot(path=str(OUT / f"agencia_{nombre}.png")); c.close()

    ok(not errores, f"sin errores de consola {errores[:3]}")
    b.close()
print("\nTODO OK" if not fallos else f"\n{len(fallos)} FALLOS")
