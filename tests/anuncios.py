"""Pruebas de la página /anuncios. Uso (con `npm run dev` en marcha): python tests/anuncios.py [carpeta_capturas]"""
import sys, re
from pathlib import Path
from urllib.parse import urlparse, parse_qs
from playwright.sync_api import sync_playwright

URL = "http://localhost:5173"
OUT = Path(sys.argv[1] if len(sys.argv) > 1 else "/tmp/capturas"); OUT.mkdir(parents=True, exist_ok=True)
fallos = []
def ok(c, m):
    print(("OK   " if c else "FALLA"), m)
    if not c: fallos.append(m)

with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={"width": 1440, "height": 900})
    errores = []
    pg.on("console", lambda m: m.type == "error" and errores.append(m.text))
    pg.on("pageerror", lambda e: errores.append(str(e)))

    # 1. Carga y menú
    pg.goto(URL); pg.wait_for_selector(".menu")
    ok(pg.locator(".menu a", has_text="Anuncios").count() == 1, "enlace 'Anuncios' en el menú principal")
    pg.click(".menu a:has-text('Anuncios')"); pg.wait_for_selector(".anu-ayto")
    ok(urlparse(pg.url).path == "/anuncios", f"el menú lleva a /anuncios ({pg.url})")
    pg.goto(URL + "/anuncios"); pg.wait_for_selector(".anu-ayto")
    ok("Esta página es una demostración" in pg.inner_text(".anu-cab"), "aviso fijo de demostración en la cabecera")

    # 2. Dropdown → ayuntamiento, tarjetas y URL
    vistos = {}
    for v in ["brihuega", "sevilla", "tejera_negra"]:
        pg.select_option("select", v); pg.wait_for_timeout(200)
        ayto = pg.inner_text("#anu-ayto-t"); n = pg.locator(".anu-local").count()
        vistos[v] = (ayto, pg.inner_text(".anu-local h3 >> nth=0"))
        ok(parse_qs(urlparse(pg.url).query).get("destino") == [v], f"URL guarda destino={v}")
        ok(6 <= n <= 8, f"{v}: {n} tarjetas ({ayto})")
    ok(len({a for a, _ in vistos.values()}) == 3 and len({t for _, t in vistos.values()}) == 3, "cada destino cambia ayuntamiento y tarjetas")
    pg.goto(URL + "/anuncios?destino=sevilla"); pg.wait_for_selector(".anu-ayto")
    ok(pg.input_value("select") == "sevilla" and "Sevilla" in pg.inner_text("#anu-ayto-t"), "el destino se lee de la query string")

    # 3. Enlaces externos
    malos, muestras = [], {}
    for v in ["tejera_negra", "brihuega", "sevilla"]:
        pg.select_option("select", v); pg.wait_for_timeout(150)
        for a in pg.locator(".anu-local a").all():
            h, t, r = a.get_attribute("href"), a.get_attribute("target"), a.get_attribute("rel") or ""
            if t != "_blank" or "noopener" not in r or "noreferrer" not in r: malos.append(h)
            if h.startswith("https://www.booking.com/searchresults.html?ss="): muestras.setdefault("booking", h)
            elif h.startswith("https://www.google.com/maps/search/?api=1&query="): muestras.setdefault("maps", h)
            elif h.startswith("https://www.tripadvisor.es/Search?q="): muestras.setdefault("tripadvisor", h)
            elif not h.startswith("https://www.booking.com/hotel/es/"): malos.append("formato: " + h)
    ok(not malos, f"todos los enlaces externos con target/rel y formato correctos {malos[:3]}")
    UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36"  # Booking bloquea el agente "HeadlessChrome"
    for k, h in muestras.items():
        q = urlparse(h).query; ok("%20" in q and " " not in h, f"{k}: consulta codificada")
        e = b.new_page(locale="es-ES", user_agent=UA)
        try:
            r = e.goto(h, timeout=45000); e.wait_for_timeout(5000)
            if k == "booking":
                n = e.locator('[data-testid="property-card"]').count()
                ok(r.status < 400 and n > 0, f"booking abre la búsqueda con resultados ({n} alojamientos · 1.º: {e.locator('[data-testid=title]').first.inner_text() if n else '-'})")
            elif k == "tripadvisor":
                # TripAdvisor responde 403 a navegadores automatizados: solo se informa, no se puede comprobar desde aquí
                print(f"INFO  tripadvisor responde {r.status} a navegadores automatizados (formato de búsqueda estándar, no verificable aquí)")
            else:
                ok(r.status < 400, f"{k} abre sin error ({r.status} · {e.title()[:50]})")
        except Exception as x: ok(False, f"{k} no abre: {x}")
        e.close()

    # 4. Valoraciones con fuente
    for v in ["tejera_negra", "brihuega", "sevilla"]:
        pg.select_option("select", v); pg.wait_for_timeout(150)
        for c in pg.locator(".anu-local").all():
            nombre = c.locator("h3").inner_text()
            if c.locator(".anu-estrellas").count():
                f = c.locator(".anu-val .nota a"); txt = f.inner_text()
                ok(re.search(r"Fuente: .+ · [\d,]+/(5|10) .*consultado el \d\d/\d\d/\d{4}", txt) is not None and f.get_attribute("target") == "_blank"
                   and "de 5 según" in c.locator(".anu-estrellas").get_attribute("aria-label"), f"{nombre}: {txt}")
            else:
                ok("Valoración no disponible" in c.inner_text(), f"{nombre}: sin estrellas → 'Valoración no disponible'")

    # 5. Banner de alta sin navegar
    antes = pg.url; pg.evaluate("document.querySelector('.pagina').scrollTop = 200"); s0 = pg.evaluate("document.querySelector('.pagina').scrollTop")
    pg.click(".anu-alta-btn", force=True); pg.wait_for_timeout(300)
    ok(pg.url == antes and pg.evaluate("document.querySelector('.pagina').scrollTop") == s0, "el enlace de alta de ayuntamientos no navega")

    # Ficha → anuncios con destino
    pg.goto(URL); pg.wait_for_selector(".tarjeta"); pg.click(".tarjeta:has-text('Brihuega')")
    pg.click("text=Ver anuncios de la zona (demo)"); pg.wait_for_selector(".anu-ayto")
    ok(pg.input_value("select") == "brihuega", f"la ficha pasa el destino ({pg.url})")
    pg.go_back(); pg.wait_for_timeout(500); ok(pg.locator(".mapa").count() == 1, "atrás vuelve al mapa")

    # 6. Capturas y desbordes
    for nombre, (w, h) in {"movil": (390, 844), "tableta": (768, 1024), "escritorio": (1440, 900)}.items():
        q = b.new_page(viewport={"width": w, "height": h}); q.goto(URL + "/anuncios?destino=brihuega"); q.wait_for_selector(".anu-local"); q.wait_for_timeout(500)
        sobra = q.evaluate("Math.max(document.documentElement.scrollWidth, document.querySelector('.pagina').scrollWidth) - innerWidth")
        ok(sobra <= 0, f"{nombre}: sin desborde horizontal ({sobra}px)")
        cards = q.locator(".anu-local, .anu-anuncio").all()
        ok(all(c.locator(".tag-ej", has_text="Ejemplo · ficticio").is_visible() for c in cards), f"{nombre}: 'Ejemplo · ficticio' visible en las {len(cards)} tarjetas")
        alto = q.evaluate("document.querySelector('.pagina').scrollHeight")
        q.set_viewport_size({"width": w, "height": min(alto + 60, 6000)}); q.wait_for_timeout(300)
        q.screenshot(path=str(OUT / f"anuncios_{nombre}.png")); q.close()

    ok(not errores, f"sin errores de consola {errores[:3]}")
    b.close()
print("\nTODO OK" if not fallos else f"\n{len(fallos)} FALLOS")
