"""Pipeline de Cuándo Florece: lee /data y escribe JSON estáticos en /web/public/data.

Uso:  python pipeline/build.py
Nada se inventa aquí salvo lo marcado con `supuesto=True` (hitos derivados de datos reales).
"""
import json
from datetime import date, timedelta
from pathlib import Path

import numpy as np
import pandas as pd

RAIZ = Path(__file__).resolve().parent.parent
DATOS = RAIZ / "data"
SALIDA = RAIZ / "web" / "public" / "data"
HOY = date(2026, 10, 21)  # fecha de la demo (se puede sobrescribir con --hoy en el futuro)


def iso(d):
    return d.isoformat()


def doy_a_fecha(doy, anio):
    return date(anio, 1, 1) + timedelta(days=int(round(doy)) - 1)


def hito(id_, etiqueta, central, prob, amp, origen, nota="", supuesto=False, revisar=False):
    return {
        "id": id_, "etiqueta": etiqueta, "central": iso(central),
        "probable": [iso(prob[0]), iso(prob[1])], "amplia": [iso(amp[0]), iso(amp[1])],
        "origen": origen, "nota": nota, "supuesto": supuesto, "revisar": revisar,
    }


def d(s):
    return pd.Timestamp(s).date()


# ---------------------------------------------------------------- Sevilla (azahar)
LAT_SEV = 37.3891
BASES = [7, 8, 9, 10, 11, 12, 13]
FRACCIONES = {  # umbral de cada hito sobre a (inicio) -> b (pico) -> c (fin)
    "inicio": ("ab", 0.0), "floracion": ("ab", 0.33), "pico_ini": ("ab", 0.67),
    "pico_fin": ("bc", 0.33), "fin": ("bc", 1.0),
}


def gdd_anual(meteo, base):
    """Grados-día acumulados desde el 1 de enero: sum(max(0, (tmax+tmin)/2 - base))."""
    m = meteo.copy()
    m["gd"] = np.clip((m.tmax + m.tmin) / 2 - base, 0, None)
    m["anio"] = m.fecha.dt.year
    m["doy"] = m.fecha.dt.dayofyear
    m["gdd"] = m.groupby("anio").gd.cumsum()
    return m


def gdd_en(m, anio, doy):
    f = m[(m.anio == anio) & (m.doy == int(round(doy)))]
    return float(f.gdd.iloc[0])


def doy_cruce(m, anio, umbral):
    f = m[(m.anio == anio) & (m.gdd >= umbral)]
    return int(f.doy.iloc[0]) if len(f) else None


def modelo_sevilla():
    meteo = pd.read_csv(DATOS / "meteo_sevilla.csv", parse_dates=["fecha"])
    feno = pd.read_csv(DATOS / "fenologia_azahar_sevilla.csv")
    obs = pd.read_csv(DATOS / "obs_azahar_sevilla.csv", parse_dates=["fecha"])
    anios_meteo = sorted(meteo.fecha.dt.year.unique())

    # 1) Elegir la temperatura base: la que hace más estable el umbral entre los años observados
    tabla = []
    for base in BASES:
        m = gdd_anual(meteo, base)
        umbrales = [gdd_en(m, int(r.anio), r.doy_mediana) for r in feno.itertuples()]
        cv = float(np.std(umbrales, ddof=1) / np.mean(umbrales)) if len(umbrales) > 1 else None
        pico_doy = [doy_cruce(m, y, float(np.mean(umbrales))) for y in anios_meteo]
        tabla.append({"base": base, "umbral_pico": float(np.mean(umbrales)), "cv": cv,
                      "pico_central_doy": float(np.median(pico_doy))})
    base = min(tabla, key=lambda t: t["cv"])["base"]
    m = gdd_anual(meteo, base)

    # 2) Umbrales: se agrupan las 7 observaciones (GDD en la fecha de cada una).
    #    inicio = la más temprana, pico = mediana, fin = la más tardía. El rango "lo/hi" sale de comparar los 2 años.
    obs = obs.assign(anio=obs.fecha.dt.year, doy=obs.fecha.dt.dayofyear)
    obs["gdd"] = [gdd_en(m, int(r.anio), r.doy) for r in obs.itertuples()]
    a, b, c = float(obs.gdd.min()), float(obs.gdd.median()), float(obs.gdd.max())
    por = obs.groupby("anio").gdd.agg(["min", "median", "max"])
    a_l, b_l, c_l = list(por["min"]), list(por["median"]), list(por["max"])

    def umbral(par, fr, lista):
        a_, b_, c_ = lista
        return a_ + fr * (b_ - a_) if par == "ab" else b_ + fr * (c_ - b_)

    def umbrales_hito(nombre, modo):
        par, fr = FRACCIONES[nombre]
        trio = {"med": (a, b, c), "lo": (min(a_l), min(b_l), min(c_l)), "hi": (max(a_l), max(b_l), max(c_l))}[modo]
        return umbral(par, fr, trio)

    # 3) Fechas de cruce por cada año climático (14 años) y hito
    ETIQ = {"inicio": "Primeros brotes", "floracion": "Floración activa", "pico_ini": "Entra en pico",
            "pico_fin": "Sale del pico", "fin": "Fin de floración"}
    cruces = {}
    for nombre in FRACCIONES:
        cruces[nombre] = {
            modo: [doy_cruce(m, y, umbrales_hito(nombre, modo)) for y in anios_meteo]
            for modo in ("med", "lo", "hi")
        }

    def pct(v, q):
        v = [x for x in v if x is not None]
        return float(np.percentile(v, q))

    hitos = []
    for nombre in FRACCIONES:
        med = cruces[nombre]["med"]
        central = doy_a_fecha(np.median(med), 2027)
        prob = (doy_a_fecha(pct(med, 25), 2027), doy_a_fecha(pct(med, 75), 2027))
        amp = (doy_a_fecha(pct(cruces[nombre]["lo"], 10), 2027), doy_a_fecha(pct(cruces[nombre]["hi"], 90), 2027))
        hitos.append(hito(nombre, ETIQ[nombre], central, prob, amp, "Modelo grados-día",
                          f"Umbral {umbrales_hito(nombre, 'med'):.0f} °C·día (base {base} °C, desde 1 ene)."))

    # 4) Validación cruzada con los 2 años observados (leave-one-out) – honestidad sobre el error
    backtest = []
    for i, r in enumerate(feno.itertuples()):
        otros = [x for j, x in enumerate(b_l) if j != i]
        pred = doy_cruce(m, int(r.anio), float(np.mean(otros)))
        backtest.append({"anio": int(r.anio), "observado_doy": float(r.doy_mediana), "predicho_doy": pred,
                         "error_dias": None if pred is None else round(pred - float(r.doy_mediana), 1)})

    # 5) Series para el gráfico: GDD medio y banda min–max por día del año (1..120) + umbrales
    sub = m[m.doy <= 120].groupby("doy").gdd.agg(["mean", "min", "max"]).reset_index()
    serie_gdd = [[int(r.doy), round(r["mean"], 1), round(r["min"], 1), round(r["max"], 1)] for _, r in sub.iterrows()]

    # 6) Cruce de cada año para "este año va X días adelantado/retrasado"
    pico_med = cruces["pico_ini"]  # referencia: entrada en pico
    por_anio = {int(y): {"pico": cruces["pico_ini"]["med"][i]} for i, y in enumerate(anios_meteo)}
    mediana_pico_doy = float(np.median([v["pico"] for v in por_anio.values()]))

    por_anio_gdd_actual = {}
    for y in anios_meteo:
        por_anio_gdd_actual[int(y)] = {
            "doy_pico_ini": doy_cruce(m, y, umbrales_hito("pico_ini", "med")),
            "gdd_doy_75": round(gdd_en(m, y, 75), 1),
        }

    modelo = {
        "base_c": base, "inicio_acumulacion": "1 de enero",
        "justificacion_base": ("La floración del naranjo amargo arranca con temperaturas medias moderadas; se probaron bases "
                                "7–13 °C y se eligió la que hace más estable el umbral entre los años observados (menor CV). "
                                "Con solo 2 años, la elección es orientativa."),
        "bases_probadas": tabla,
        "umbral_pico": round(float(b), 1), "umbrales": {k: round(float(umbrales_hito(k, 'med')), 1) for k in FRACCIONES},
        "anios_calibracion": [int(x) for x in feno.anio],
        "n_obs": int(feno.n_obs.sum()), "obs_individuales": len(obs),
        "anios_clima": [int(x) for x in anios_meteo],
        "backtest_loo": backtest,
        "por_anio": por_anio_gdd_actual, "mediana_pico_ini_doy": mediana_pico_doy,
        "umbral_pico_ini": round(float(umbrales_hito('pico_ini', 'med')), 1),
        "serie_gdd": serie_gdd,
        "meteo_hasta": iso(meteo.fecha.max().date()),
        "observaciones": [{"fecha": iso(r.fecha.date()), "fuente": r.fuente, "calidad": r.calidad} for r in obs.itertuples()],
    }
    return hitos, modelo


def construir_fases(hitos, ids_fases):
    return [{"id": f, "etiqueta": e, "hito_inicio": h} for f, e, h in ids_fases]


def destino_sevilla():
    hitos, modelo = modelo_sevilla()
    h = {x["id"]: x for x in hitos}
    ini, flo, pi, pf, fin = (d(h[k]["central"]) for k in ("inicio", "floracion", "pico_ini", "pico_fin", "fin"))
    mid = d(h["pico_ini"]["central"]) + (d(h["pico_fin"]["central"]) - d(h["pico_ini"]["central"])) / 2
    curva = [[iso(ini), 0], [iso(mid), 100], [iso(fin), 0]]
    return {
        "id": "sevilla", "nombre": "Azahar de Sevilla", "especie": "Azahar (naranjo amargo)", "tipo": "flor",
        "region": "Andalucía", "lat": 37.3891, "lon": -5.9845, "simulado": False,
        "temporada": 2027,
        "resumen": "Los naranjos de las calles de Sevilla perfuman la ciudad entre marzo y abril.",
        "hitos": hitos,
        "fases": construir_fases(hitos, [("brote", "Brote", "inicio"), ("floracion", "Floración activa", "floracion"),
                                        ("pico", "Pico", "pico_ini"), ("caida", "Caída", "pico_fin")]),
        "fin": "fin", "ventana": ["pico_ini", "pico_fin"], "curva": curva,
        "confianza": {"nivel": "baja", "anios": len(modelo["anios_calibracion"]), "observaciones": modelo["obs_individuales"],
                      "texto": ("Solo 2 años con observaciones fenológicas (7 fotos casuales de iNaturalist). "
                                "La temperatura sí viene de 14 años, pero el umbral de floración está poco calibrado: "
                                "por eso los márgenes son anchos.")},
        "origenes": ["Modelo grados-día"],
        "modelo": modelo,
        "enlaces": {"fuente_meteo": "Serie diaria 2012–2025 (CSV) · Open-Meteo opcional en vivo"},
    }


# ---------------------------------------------------------------- Brihuega (lavanda)
def destino_brihuega():
    pred = pd.read_csv(DATOS / "prediccion_2027_brihuega.csv", parse_dates=["central", "probable_desde", "probable_hasta",
                                                                          "amplia_desde", "amplia_hasta", "fecha_emision"])
    avance = pd.read_csv(DATOS / "avance_brihuega.csv")
    temp = pd.read_csv(DATOS / "temporada_brihuega.csv").iloc[0]
    s2 = pd.read_csv(DATOS / "s2_brihuega.csv", usecols=["parcela", "tipo", "fecha"])
    p = {r.hito: r for r in pred.itertuples()}

    def h_de(id_, etiqueta, clave, nota=""):
        r = p[clave]
        return hito(id_, etiqueta, r.central.date(), (r.probable_desde.date(), r.probable_hasta.date()),
                    (r.amplia_desde.date(), r.amplia_hasta.date()), "Calendario histórico", nota)

    pl = p["plena_flor"]
    # Inicio y "floración activa" no tienen dato propio: se derivan del margen de plena flor (supuesto marcado)
    inicio = hito("inicio", "Primeras flores", pl.amplia_desde.date(),
                  (pl.amplia_desde.date() - timedelta(days=3), pl.amplia_desde.date() + timedelta(days=3)),
                  (pl.amplia_desde.date() - timedelta(days=10), pl.amplia_desde.date() + timedelta(days=6)),
                  "Calendario histórico", "Derivado del margen amplio de plena flor; no hay dato propio.", supuesto=True)
    flor = hito("floracion", "Floración activa", pl.probable_desde.date(),
                (pl.probable_desde.date() - timedelta(days=3), pl.probable_desde.date() + timedelta(days=3)),
                (pl.amplia_desde.date(), pl.central.date()),
                "Calendario histórico", "Derivado del margen probable de plena flor; no hay dato propio.", supuesto=True)
    hitos = [inicio, flor,
             h_de("pico_ini", "Plena flor", "plena_flor", "Predicción climatológica v0 (10 temporadas)."),
             h_de("pico_fin", "Primeros cortes (10 %)", "cosecha_10", "Cosecha detectada por satélite (±3 días)."),
             h_de("fin", "Cosecha casi completa", "cosecha_final", "Cosecha detectada por satélite (±3 días).")]
    ini, fl, pi, pf, fin = (d(x["central"]) for x in hitos)
    curva = [[iso(ini), 0], [iso(pi), 100], [iso(pf), 100], [iso(fin), 0]]

    historia = [{"fecha": r.fecha, "pct_cortado": r.pct_cortado, "pct_probable": r.pct_probable} for r in avance.itertuples()]
    real26 = {"cosecha_10": temp.cosecha_10, "cosecha_50": temp.cosecha_50, "cosecha_final": temp.cosecha_final,
              "cosecha_10_directo": temp.cosecha_10_directo, "cosecha_50_directo": temp.cosecha_50_directo,
              "frac_cortada": float(temp.frac_cortada)}
    return {
        "id": "brihuega", "nombre": "Brihuega", "especie": "Lavanda y lavandín", "tipo": "flor",
        "region": "Castilla-La Mancha (Guadalajara)", "lat": 40.7688, "lon": -2.8693, "simulado": False, "temporada": 2027,
        "resumen": "Campos violetas de la Alcarria: la temporada alcanza su plenitud en julio.",
        "hitos": hitos,
        "fases": construir_fases(hitos, [("brote", "Brote", "inicio"), ("floracion", "Floración activa", "floracion"),
                                        ("pico", "Pico", "pico_ini"), ("caida", "Cosecha", "pico_fin")]),
        "fin": "fin", "ventana": ["pico_ini", "pico_fin"], "curva": curva,
        "confianza": {"nivel": "media", "anios": int(p["plena_flor"].anios), "observaciones": 0,
                      "texto": (f"Climatología de {int(p['plena_flor'].anios)} temporadas (modelo {p['plena_flor'].version_modelo}); "
                                "aún no incorpora el tiempo de 2027. Los hitos de cosecha son cortes detectados por "
                                "satélite (±3 días), una estimación desde el espacio, no una medida.")},
        "origenes": ["Calendario histórico", "Satélite"],
        "historia": {"avance_2026": historia, "real_2026": real26, "emision_prediccion": iso(pred.fecha_emision.iloc[0].date()),
                     "parcelas": int(s2.parcela.nunique()), "imagenes_desde": s2.fecha.min(), "imagenes_hasta": s2.fecha.max(),
                     "nota_comparacion": ("No se guardó una predicción de 2026 anterior a la cosecha, así que no se puede medir "
                                          "el acierto del año pasado; se muestra lo que ocurrió en 2026 junto a la predicción de 2027.")},
        "enlaces": {},
    }


# ---------------------------------------------------------------- Tejera Negra (hayedo)
def destino_tejera():
    ref = pd.read_csv(DATOS / "referencia_fechas.csv")
    hit = pd.read_csv(DATOS / "otono_hitos.csv").iloc[0]
    avance = pd.read_csv(DATOS / "otono_avance_tejera_negra.csv")
    clima = pd.read_csv(DATOS / "otono_clima_tejera_negra.csv")
    r = {x.hito: x for x in ref[ref.hayedo == "tejera_negra"].itertuples()}
    A = 2026

    def h_ref(id_, etiqueta, clave):
        x = r[clave]
        c = doy_a_fecha(x.doy_mediana, A)
        cuarto = (x.doy_max - x.doy_min) / 4  # el CSV no trae percentiles: probable ≈ mediana ± ¼ del rango
        return hito(id_, etiqueta, c, (doy_a_fecha(x.doy_mediana - cuarto, A), doy_a_fecha(x.doy_mediana + cuarto, A)),
                    (doy_a_fecha(x.doy_min, A), doy_a_fecha(x.doy_max, A)), "Calendario histórico",
                    f"Mediana de {int(x.anios)} otoños (rango {x.doy_min:.0f}–{x.doy_max:.0f} del año). "
                    "Margen probable ≈ mediana ± ¼ del rango.")

    inicio = h_ref("inicio", "Empieza a cambiar", "inicio")
    inicio["detectado_2026"] = {"fecha": hit.fecha, "confirmado": hit.confirmado, "revisar": bool(hit.revisar)}
    if bool(hit.revisar):
        inicio["revisar"] = True
        inicio["nota"] += (f" Este año el satélite marcó el inicio el {hit.fecha}, mucho antes que cualquier otoño "
                           "anterior: pendiente de revisar.")
    avanz = h_ref("floracion", "Color avanzado", "avanzado")
    pleno = h_ref("pico_ini", "Pleno color", "pleno")
    pc = d(pleno["central"])
    caida_fecha = pc + timedelta(days=7)
    caida = hito("pico_fin", "Empieza a caer la hoja", caida_fecha, (caida_fecha - timedelta(days=4), caida_fecha + timedelta(days=4)),
                 (d(pleno["amplia"][0]) + timedelta(days=4), d(pleno["amplia"][1]) + timedelta(days=7)),
                 "Calendario histórico", "Supuesto: sin dato de referencia sobre la caída; se asume ≈ 7 días tras el pleno.", supuesto=True)
    fin_f = caida_fecha + timedelta(days=21)
    fin = hito("fin", "Hayedo desnudo", fin_f, (fin_f - timedelta(days=5), fin_f + timedelta(days=5)),
               (fin_f - timedelta(days=12), fin_f + timedelta(days=14)),
               "Calendario histórico", "Supuesto: ≈ 3 semanas tras empezar la caída.", supuesto=True)
    hitos = [inicio, avanz, pleno, caida, fin]
    ini, av, pl, ca, fi = (d(x["central"]) for x in hitos)
    curva = [[iso(ini), 0], [iso(pl), 100], [iso(ca), 100], [iso(fi), 0]]

    ult_clima = clima.dropna(subset=["tmax"]).fecha.max()
    serie = [{"fecha": x.fecha, "color": x.color, "p25": x.color_p25, "p75": x.color_p75, "hoja_perdida": x.hoja_perdida,
              "zonas": int(x.zonas)} for x in avance.itertuples()]
    cl = [{"fecha": x.fecha, "tmax": None if pd.isna(x.tmax) else x.tmax, "tmin": None if pd.isna(x.tmin) else x.tmin,
           "lluvia": None if pd.isna(x.lluvia) else x.lluvia} for x in clima.itertuples()]
    return {
        "id": "tejera_negra", "nombre": "Hayedo de Tejera Negra", "especie": "Hayedo (otoño)", "tipo": "hayedo",
        "region": "Castilla-La Mancha (Guadalajara)", "lat": 41.1550, "lon": -3.4230, "simulado": False, "temporada": 2026,
        "resumen": "El hayedo más meridional de Europa se tiñe de ocre y cobre cada otoño.",
        "hitos": hitos,
        "fases": construir_fases(hitos, [("verde", "Verde", ""), ("brote", "Cambiando", "inicio"), ("floracion", "Color avanzado", "floracion"),
                                        ("pico", "Pleno color", "pico_ini"), ("caida", "Hoja cayendo", "pico_fin")])[1:] if False else
                 [{"id": "brote", "etiqueta": "Cambiando", "hito_inicio": "inicio"},
                  {"id": "floracion", "etiqueta": "Color avanzado", "hito_inicio": "floracion"},
                  {"id": "pico", "etiqueta": "Pleno color", "hito_inicio": "pico_ini"},
                  {"id": "caida", "etiqueta": "Hoja cayendo", "hito_inicio": "pico_fin"}],
        "fin": "fin", "ventana": ["pico_ini", "pico_fin"], "curva": curva,
        "confianza": {"nivel": "baja" if bool(hit.revisar) else "media", "anios": int(r["pleno"].anios), "observaciones": 0,
                      "texto": (f"Calendario de {int(r['pleno'].anios)} otoños; el color que se ve desde el espacio es una estimación, no una medida. "
                                "Este año el satélite adelantó el inicio de forma anómala (pendiente de revisar), por eso la confianza es baja.")},
        "origenes": ["Calendario histórico", "Satélite"],
        "serie": {"color": serie, "clima": cl, "clima_hasta": ult_clima, "color_hasta": avance.fecha.max()},
        "enlaces": {},
    }


def main():
    SALIDA.mkdir(parents=True, exist_ok=True)
    destinos = [destino_tejera(), destino_brihuega(), destino_sevilla()]
    salida = {"generado": iso(HOY), "hoy_demo": iso(HOY), "destinos": destinos}
    (SALIDA / "destinos.json").write_text(json.dumps(salida, ensure_ascii=False, default=str), encoding="utf-8")
    m = destinos[2]["modelo"]
    print(f"OK destinos.json · Sevilla base {m['base_c']} °C, umbral pico {m['umbral_pico']} °C·día")
    for t in m["bases_probadas"]:
        print("   base", t["base"], "umbral", round(t["umbral_pico"], 1), "cv", round(t["cv"], 3))
    for h in destinos[2]["hitos"]:
        print("  ", h["id"], h["central"], h["probable"], h["amplia"])
    print("   backtest", m["backtest_loo"])


if __name__ == "__main__":
    main()
