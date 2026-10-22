"""La web sin WebGL, con WebGL y con fallos forzados. Uso: .venv/bin/python tests/sin_webgl.py [carpeta_capturas]
Requiere `npm run dev` en marcha (puerto 5173)."""
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright

URL = "http://localhost:5173"
OUT = Path(sys.argv[1] if len(sys.argv) > 1 else "/tmp/capturas"); OUT.mkdir(parents=True, exist_ok=True)
SIN_WEBGL = ["--disable-gpu", "--disable-webgl", "--disable-3d-apis"]
VIEWPORTS = {"movil": (390, 844), "tablet": (768, 1024), "escritorio": (1440, 900)}
# Sustituye MapLibre (dependencia pre-empaquetada por Vite) por un módulo cuyo constructor lanza, como sin WebGL
MAPLIBRE_ROTO = """class Fallo { constructor() { throw new Error('Fallo forzado: new maplibregl.Map') } }
export default { Map: Fallo, NavigationControl: class {}, LngLatBounds: class { extend() {} } }"""
fallos = []

def ok(cond, msg):
    print(("OK   " if cond else "FALLA"), msg)
    if not cond: fallos.append(msg)

def pagina(b, w=1440, h=900):
    ctx = b.new_context(viewport={"width": w, "height": h})
    pg = ctx.new_page(); pg.errores = []; pg.consola = []
    pg.on("pageerror", lambda e: pg.errores.append(str(e)[:200]))
    # Los fallos de red forzados salen en consola como "Failed to load resource": no son errores de la app
    pg.on("console", lambda m: pg.consola.append(m.text[:200]) if m.type == "error" and "Failed to load resource" not in m.text else None)
    return ctx, pg

def sin_desbordes(pg, nombre, vertical=True):
    ok(pg.evaluate("document.documentElement.scrollWidth <= innerWidth"), f"[{nombre}] sin desborde horizontal")
    if vertical: ok(pg.evaluate("document.documentElement.scrollHeight <= innerHeight + 1"), f"[{nombre}] sin scroll vertical de página en el mapa")

def limpio(pg, nombre):
    ok(not pg.errores, f"[{nombre}] sin errores sin capturar {pg.errores[:2]}")
    ok(not pg.consola, f"[{nombre}] sin errores en consola {pg.consola[:2]}")

with sync_playwright() as p:
    # 1 · Sin WebGL: mapa alternativo (Leaflet) en los tres tamaños
    b = p.chromium.launch(args=SIN_WEBGL)
    for nombre, (w, h) in VIEWPORTS.items():
        ctx, pg = pagina(b, w, h)
        pg.goto(URL); pg.wait_for_selector(".pin", timeout=20000); pg.wait_for_timeout(2500)
        ok(not pg.evaluate("!!document.createElement('canvas').getContext('webgl')"), f"[sin WebGL {nombre}] el navegador no tiene WebGL")
        ok(pg.locator(".pin").count() == 3, f"[sin WebGL {nombre}] 3 flores en el mapa alternativo")
        ok(pg.locator(".maplibregl-canvas").count() == 0, f"[sin WebGL {nombre}] no hay lienzo de MapLibre")
        ok("versión alternativa" in pg.inner_text(".aviso-mapa"), f"[sin WebGL {nombre}] aviso de versión alternativa")
        att = pg.locator(".leaflet-control-attribution")
        ok(att.is_visible() and "Esri" in att.inner_text(), f"[sin WebGL {nombre}] atribución visible ({att.inner_text()[:60]})")
        ok(pg.locator(".tarjeta").count() == 3, f"[sin WebGL {nombre}] lista de destinos")
        sin_desbordes(pg, f"sin WebGL {nombre}")
        pg.screenshot(path=str(OUT / f"sinwebgl_{nombre}.png"))
        limpio(pg, f"sin WebGL {nombre}")
        ctx.close()

    # 4 · Recorrido sin WebGL: ficha desde el mapa (teclado), simulador, franja → agencia
    ctx, pg = pagina(b)
    pg.goto(URL); pg.wait_for_selector(".pin", timeout=20000); pg.wait_for_timeout(1500)
    sev = pg.locator(".pin[aria-label^='Azahar de Sevilla']")
    antes = sev.get_attribute("aria-label"); color_antes = sev.locator("svg").get_attribute("style")
    pg.get_by_role("combobox", name="Saltar a una fecha clave").select_option("2027-04-01"); pg.wait_for_timeout(600)
    despues = sev.get_attribute("aria-label"); color_despues = sev.locator("svg").get_attribute("style")
    ok(antes != despues and color_antes != color_despues, f"simulador cambia estado y color en el mapa alternativo: «{antes}» → «{despues}»")
    pg.screenshot(path=str(OUT / "sinwebgl_simulador.png"))
    pg.get_by_role("button", name="Hoy", exact=True).click()
    pg.locator(".pin[aria-label^='Brihuega']").focus(); pg.keyboard.press("Enter")
    pg.wait_for_selector(".ficha")
    ok("Brihuega" in pg.inner_text(".ficha"), "ficha abierta con Enter sobre la flor")
    ok(pg.locator(".pin--sel").count() == 1, "la flor seleccionada se destaca")
    pg.wait_for_timeout(1200); pg.screenshot(path=str(OUT / "sinwebgl_ficha.png"))
    pg.get_by_text("← Todos los destinos").click()
    pg.locator(".pin[aria-label^='Hayedo']").click(); pg.wait_for_selector(".ficha")
    ok("Tejera Negra" in pg.inner_text(".ficha"), "ficha abierta con clic sobre la flor")
    pg.get_by_text("← Todos los destinos").click()
    pg.locator(".pin[aria-label^='Azahar']").focus(); pg.keyboard.press(" ")
    ok("Sevilla" in pg.inner_text(".ficha"), "ficha abierta con Espacio sobre la flor")
    pg.get_by_text("← Todos los destinos").click()
    pg.locator(".franja-chip").first.click(); pg.wait_for_selector(".ag-form", timeout=10000)
    ok("/agencia?destino=" in pg.url, f"chip de la franja lleva a la agencia ({pg.url.replace(URL, '')})")
    pg.wait_for_timeout(800); pg.screenshot(path=str(OUT / "sinwebgl_agencia.png"), full_page=True)
    pg.get_by_role("link", name="Mapa", exact=True).click(); pg.wait_for_selector(".pin", timeout=10000)
    ok(pg.locator(".pin").count() == 3, "volver de la agencia al mapa alternativo")
    limpio(pg, "recorrido sin WebGL")
    ctx.close(); b.close()

    # 2 · Con WebGL: el mapa 3D de siempre, sin avisos
    b = p.chromium.launch()
    for nombre, (w, h) in VIEWPORTS.items():
        ctx, pg = pagina(b, w, h)
        pg.goto(URL); pg.wait_for_selector(".maplibregl-canvas", timeout=20000); pg.wait_for_timeout(3000)
        ok(pg.locator(".marca").count() == 3 and pg.locator(".pin").count() == 0, f"[WebGL {nombre}] mapa 3D con 3 destinos")
        ok(pg.locator(".aviso-mapa").count() == 0, f"[WebGL {nombre}] sin aviso de modo alternativo")
        ok(pg.evaluate("!performance.getEntriesByType('resource').some(r => /leaflet|MapaPlano/i.test(r.name))"), f"[WebGL {nombre}] Leaflet no se descarga")
        sin_desbordes(pg, f"WebGL {nombre}")
        pg.screenshot(path=str(OUT / f"webgl_{nombre}.png"))
        limpio(pg, f"WebGL {nombre}")
        ctx.close()

    # 3a · MapLibre lanza y las teselas fallan → mapa alternativo con aviso de red
    ctx, pg = pagina(b, 390, 844)
    pg.route("**/node_modules/.vite/deps/maplibre-gl.js*", lambda r: r.fulfill(status=200, content_type="text/javascript", body=MAPLIBRE_ROTO))
    pg.route("**/server.arcgisonline.com/**", lambda r: r.abort())
    pg.goto(URL); pg.wait_for_selector(".pin", timeout=20000); pg.wait_for_timeout(1500)
    ok(pg.locator(".pin").count() == 3, "[MapLibre roto] cae al mapa alternativo")
    ok("sin conexión" in pg.inner_text(".mapa-aviso"), "[teselas caídas] aviso de mapa base sin conexión")
    pg.screenshot(path=str(OUT / "fallo_teselas_movil.png"))
    ok(not pg.errores, f"[MapLibre roto] sin errores sin capturar {pg.errores[:2]}")
    ctx.close()

    # 3b · MapLibre lanza y Leaflet tampoco carga → solo la lista, con su aviso
    for nombre, (w, h) in VIEWPORTS.items():
        ctx, pg = pagina(b, w, h)
        pg.route("**/node_modules/.vite/deps/maplibre-gl.js*", lambda r: r.fulfill(status=200, content_type="text/javascript", body=MAPLIBRE_ROTO))
        pg.route("**/src/components/MapaPlano.tsx*", lambda r: r.abort())
        pg.goto(URL); pg.wait_for_selector(".aviso-mapa", timeout=20000); pg.wait_for_timeout(800)
        ok("aceleración por hardware" in pg.inner_text(".aviso-mapa") and pg.locator(".tarjeta").count() == 3, f"[sin mapa {nombre}] lista como vista principal con aviso")
        ok(pg.locator(".mapa").count() == 0, f"[sin mapa {nombre}] no queda un hueco de mapa")
        ok(pg.evaluate("getComputedStyle(document.querySelector('.panel')).overflowY") == "visible", f"[sin mapa {nombre}] la lista usa el scroll de la página, sin scroll interno")
        sin_desbordes(pg, f"sin mapa {nombre}", vertical=False)
        pg.screenshot(path=str(OUT / f"sinmapa_{nombre}.png"), full_page=True)
        if nombre == "escritorio":
            pg.locator(".tarjeta", has_text="Brihuega").click(); pg.wait_for_selector(".ficha")
            ok("Brihuega" in pg.inner_text(".ficha"), "[sin mapa] la ficha se abre desde la lista")
            pg.get_by_role("button", name="+14 días").click(); pg.wait_for_timeout(400)
            ok(pg.locator(".ficha").count() == 1, "[sin mapa] el simulador funciona con la ficha abierta")
            pg.get_by_role("link", name="Agencia").click(); pg.wait_for_timeout(800)
            ok("/agencia" in pg.url and pg.locator(".ag-form").count() == 1, "[sin mapa] la agencia funciona")
        ok(not pg.errores, f"[sin mapa {nombre}] sin errores sin capturar {pg.errores[:2]}")
        ctx.close()

    # 3c · destinos.json no llega → mensaje claro con «Reintentar», sin pantalla en blanco
    ctx, pg = pagina(b, 390, 844)
    pg.route("**/data/destinos.json", lambda r: r.fulfill(status=500, body="error"))
    pg.goto(URL); pg.wait_for_selector("[role=alert]", timeout=10000)
    ok("No hemos podido cargar los datos" in pg.inner_text("[role=alert]"), "[destinos.json caído] mensaje en lenguaje llano")
    pg.screenshot(path=str(OUT / "fallo_datos_movil.png"))
    pg.get_by_role("link", name="Agencia").click(); pg.wait_for_timeout(300)
    ok("/agencia" in pg.url and pg.locator("[role=alert]").count() == 1, "[destinos.json caído] la navegación sigue funcionando")
    pg.unroute("**/data/destinos.json")
    pg.get_by_role("button", name="Reintentar").click(); pg.wait_for_selector(".ag-form", timeout=10000)
    ok(pg.locator("[role=alert]").count() == 0, "[destinos.json caído] «Reintentar» recupera la app cuando vuelve la red")
    ok(not pg.errores, f"[destinos.json caído] sin errores sin capturar {pg.errores[:2]}")
    ctx.close()

    # 3d · Un fallo de render cualquiera → pantalla de error con «Recargar» y detalle técnico
    ctx, pg = pagina(b, 390, 844)
    pg.route("**/src/components/Franja.tsx*", lambda r: r.fulfill(status=200, content_type="text/javascript",
             body="export function Franja() { throw new Error('Fallo forzado de render') }"))
    pg.goto(URL); pg.wait_for_selector(".fallo", timeout=10000)
    ok(pg.get_by_role("button", name="Recargar").is_visible(), "[fallo de render] botón Recargar")
    pg.get_by_text("Detalle técnico").click()
    ok("Fallo forzado de render" in pg.inner_text(".fallo-det pre"), "[fallo de render] detalle técnico desplegable")
    pg.screenshot(path=str(OUT / "fallo_render_movil.png"), full_page=True)
    ctx.close(); b.close()

print(f"\n{len(fallos)} fallos" if fallos else "\nTodo OK")
sys.exit(1 if fallos else 0)
