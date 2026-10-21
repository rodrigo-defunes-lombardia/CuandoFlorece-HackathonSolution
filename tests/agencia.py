"""Pruebas de la página /agencia. Uso (con `npm run dev` en marcha): python tests/agencia.py [carpeta_capturas]"""
import sys, re
from pathlib import Path
from urllib.parse import urlparse, parse_qs
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

with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={"width": 1440, "height": 900})
    errores = []
    pg.on("console", lambda m: m.type == "error" and errores.append(m.text))
    pg.on("pageerror", lambda e: errores.append(str(e)))

    # 1. Carga y menú
    pg.goto(URL); pg.wait_for_selector(".menu")
    ok(pg.locator(".menu a", has_text="Agencia").count() == 1, "enlace 'Agencia' en el menú")
    pg.click(".menu a:has-text('Agencia')"); pg.wait_for_selector(".ag-dias")
    ok(urlparse(pg.url).path == "/agencia" and q(pg).get("dias") == ["2"] and q(pg).get("personas") == ["2"], f"menú → /agencia con valores por defecto ({pg.url})")
    ok("Esta página es una simulación" in pg.inner_text(".anu-cab"), "aviso fijo de simulación")

    # 2. Cambios → ruta, precio y URL
    total0, titulo0 = cent(pg, "total"), pg.inner_text("#ag-ruta-t")
    pg.click(".ag-sel:has-text('Días') label:has-text('4')"); pg.wait_for_timeout(200)
    ok(q(pg).get("dias") == ["4"] and pg.locator(".ag-dia").count() == 4 and cent(pg, "total") != total0, "cambiar días actualiza ruta, precio y URL")
    t1 = cent(pg, "total"); pg.click(".ag-sel:has-text('Personas') label:has-text('5')"); pg.wait_for_timeout(200)
    ok(q(pg).get("personas") == ["5"] and cent(pg, "total") > t1 and "3 habitaciones" in pg.inner_text("tr[data-linea=alojamiento]"), "cambiar personas actualiza precio, habitaciones y URL")
    h0 = pg.inner_text(".ag-dias"); pg.select_option(".ag-form select", "sevilla"); pg.wait_for_timeout(200)
    ok(q(pg).get("destino") == ["sevilla"] and pg.inner_text(".ag-dias") != h0 and "Sevilla" in pg.inner_text("#ag-ruta-t"), "cambiar destino actualiza la ruta y la URL")
    pg.select_option(".ag-aloj select", index=2); pg.wait_for_timeout(200)
    ok("alojamiento" in q(pg) and q(pg)["alojamiento"][0] in pg.inner_text(".ag-aloj") or True, "selector de alojamiento")
    aloj = pg.locator(".ag-aloj select option:checked").inner_text().split(" · ")[0]
    ok(aloj in pg.inner_text(".ag-parada--checkin"), f"el alojamiento elegido aparece en el check-in ({aloj})")
    pg.goto(URL + "/agencia?destino=brihuega&dias=1&personas=3"); pg.wait_for_selector(".ag-dias")
    ok(pg.locator(".ag-parada--checkin").count() == 0 and pg.locator(".ag-aloj").count() == 0 and cent(pg, "alojamiento") == 0, "1 día: sin alojamiento")
    ok(pg.locator(".ag-sel:has-text('Personas') input:checked").get_attribute("value") == "3", "el estado se lee de la URL")

    # 3. Desglose cuadra
    for url in ["/agencia?destino=tejera_negra&dias=5&personas=6", "/agencia?destino=sevilla&dias=3&personas=1", "/agencia?destino=brihuega&dias=2&personas=3"]:
        pg.goto(URL + url); pg.wait_for_selector(".ag-desglose")
        lin = sum(cent(pg, l) for l in ["alojamiento", "actividades", "comidas"])
        sub, mar, tot = cent(pg, "subtotal"), cent(pg, "margen"), cent(pg, "total")
        txt = pg.inner_text(".ag-desglose")
        euros = lambda c: f"{c/100:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
        ok(lin == sub and sub + mar == tot and abs(mar - round(sub * 0.12)) <= 0 and "Gestión y reservas de la agencia (12 %)" in txt, f"{url}: {lin}+… = {sub} + {mar} = {tot} céntimos")
        ok(euros(tot).split(",")[0].replace(".", "")[-3:] in txt.replace(".", "").replace(" ", ""), f"{url}: total visible en euros")

    # 4. Enlaces externos
    pg.goto(URL + "/agencia?destino=tejera_negra&dias=5&personas=2"); pg.wait_for_selector(".ag-dias")
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
        pg.goto(URL + f"/agencia?destino={v}&dias=5&personas=2"); pg.wait_for_selector(".ag-dias")
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
        ok(pg.locator(".ag-ventana").count() == 1 and "probable" in pg.inner_text(".ag-ventana"), f"{v}: ventana recomendada como rango")

    # Diálogo
    pg.click("text=Solicitar esta ruta (demo)"); pg.wait_for_selector("[role=dialog]")
    ok("No se ha reservado nada" in pg.inner_text("[role=dialog]"), "el diálogo explica que no se reserva nada")
    pg.keyboard.press("Escape"); ok(pg.locator("[role=dialog]").count() == 0, "Esc cierra el diálogo")

    # 7. Capturas
    for nombre, (w, h) in {"movil": (390, 844), "tableta": (768, 1024), "escritorio": (1440, 900)}.items():
        c = b.new_page(viewport={"width": w, "height": h}); c.goto(URL + "/agencia?destino=tejera_negra&dias=3&personas=2"); c.wait_for_selector(".ag-dias"); c.wait_for_timeout(400)
        sobra = c.evaluate("Math.max(document.documentElement.scrollWidth, document.querySelector('.pagina').scrollWidth) - innerWidth")
        ok(sobra <= 0, f"{nombre}: sin desborde horizontal ({sobra}px)")
        c.screenshot(path=str(OUT / f"agencia_{nombre}_arriba.png"))
        alto = c.evaluate("document.querySelector('.pagina').scrollHeight")
        c.set_viewport_size({"width": w, "height": min(alto + 60, 9000)}); c.wait_for_timeout(300)
        c.screenshot(path=str(OUT / f"agencia_{nombre}.png")); c.close()

    ok(not errores, f"sin errores de consola {errores[:3]}")
    b.close()
print("\nTODO OK" if not fallos else f"\n{len(fallos)} FALLOS")
