"""Cada destino debe caer donde dice su fuente. Compara las coordenadas de destinos.json (COORDENADAS en
pipeline/build.py) con referencias de OpenStreetMap y Wikidata consultadas el 21/10/2026.
Uso: python tests/coordenadas.py            (referencias guardadas, sin red)
     python tests/coordenadas.py --online   (vuelve a consultar Nominatim y Wikidata)"""
import json, sys
from math import asin, cos, radians, sin, sqrt
from pathlib import Path
from urllib.parse import quote
from urllib.request import Request, urlopen

DEST = {d["id"]: d for d in json.loads((Path(__file__).parent.parent / "web/public/data/destinos.json").read_text())["destinos"]}
UA = {"User-Agent": "CuandoFlorece-hackathon/1.0 (prototipo educativo)"}

def km(a, b):
    (la1, lo1), (la2, lo2) = a, b
    x = sin(radians(la2 - la1) / 2) ** 2 + cos(radians(la1)) * cos(radians(la2)) * sin(radians(lo2 - lo1) / 2) ** 2
    return 2 * 6371 * asin(sqrt(x))

# Referencias: (fuente, id, coordenada, umbral km). El umbral es 2 km en ciudad y 5 km en zonas rurales.
REF = {
    "tejera_negra": [("OSM Parque Natural del Hayedo de Tejera Negra", "W291428852", (41.2362711, -3.3769312), 5),
                     ("Wikidata Hayedo de Tejera Negra", "Q11682361", (41.2153, -3.39649), 5)],
    "sevilla": [("OSM barrio de Santa Cruz", "R4649140", (37.3853641, -5.9910470), 2),
                ("OSM Catedral de Sevilla", "R5641600", (37.3859150, -5.9931406), 2),
                ("OSM Real Alcázar de Sevilla", "W22747187", (37.3832105, -5.9901835), 2)],
    "brihuega": [("Wikidata Brihuega (municipio)", "Q52615", (40.760555555556, -2.8691666666667), 5),
                 ("OSM Brihuega (municipio)", "R341304", (40.7592489, -2.8703477), 5)],
}
# Además, el punto debe caer DENTRO de la zona (no en sus bordes ni fuera): caja de la fuente, en grados (sur, norte, oeste, este)
CAJA = {
    "tejera_negra": ("OSM W291428852 (límites del parque)", (41.1993503, 41.2732207, -3.4156308, -3.3474814)),
    "sevilla": ("OSM R4649140 (límites del barrio de Santa Cruz)", (37.3753111, 37.3896574, -5.9971333, -5.9863625)),
    "brihuega": ("OSM R341304 (término municipal)", (40.6176866, 40.8702924, -2.9877652, -2.7182239)),
}

def en_linea(fuente_id):
    """Vuelve a pedir la coordenada a la fuente (Nominatim para OSM, Wikidata para Q…)."""
    if fuente_id.startswith("Q"):
        e = json.load(urlopen(Request(f"https://www.wikidata.org/wiki/Special:EntityData/{fuente_id}.json", headers=UA), timeout=30))
        c = e["entities"][fuente_id]["claims"]["P625"][0]["mainsnak"]["datavalue"]["value"]
        return c["latitude"], c["longitude"]
    r = json.load(urlopen(Request(f"https://nominatim.openstreetmap.org/lookup?format=jsonv2&osm_ids={quote(fuente_id)}", headers=UA), timeout=30))[0]
    return float(r["lat"]), float(r["lon"])

fallos = []
def ok(c, m):
    print(("OK   " if c else "FALLA"), m)
    if not c: fallos.append(m)

online = "--online" in sys.argv
for id_, refs in REF.items():
    d = DEST[id_]; p = (d["lat"], d["lon"])
    for nombre, fid, coord, umbral in refs:
        if online:
            coord = en_linea(fid)
        dist = km(p, coord)
        ok(dist < umbral, f"{id_}: a {dist:.2f} km de {nombre} ({fid}{', en línea' if online else ''}; máx. {umbral} km)")
    fuente, (s, n, o, e) = CAJA[id_]
    margen = min(p[0] - s, n - p[0], p[1] - o, e - p[1])
    ok(margen > 0, f"{id_}: dentro de {fuente} (margen al borde más cercano {margen * 111:.1f} km)")
print("\nTODO OK" if not fallos else f"\n{len(fallos)} FALLOS")
sys.exit(1 if fallos else 0)
