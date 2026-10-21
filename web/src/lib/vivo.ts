/** Predicción de Sevilla actualizada con la temperatura real de la temporada en curso.
 *  Método de "años análogos": se acumula el calor real (observado + previsión) hasta hoy y, para lo que falta,
 *  se usa el calor diario de cada uno de los años históricos. Cada año da una fecha de cruce de cada umbral;
 *  el reparto de esas fechas da el central, el rango probable (p25–p75) y el amplio (p10 del umbral bajo – p90 del alto),
 *  igual que el pipeline. Sin datos de la temporada en curso, el resultado coincide con el del pipeline. */
import type { Destino, Hito, ModeloSevilla } from './tipos'
import type { DiaTiempo } from './tiempo'

export interface Vivo {
  activo: boolean; hasta?: string; diasReales: number; diasPrevision: number; texto: string
}

const percentil = (v: number[], q: number) => {
  const a = [...v].sort((x, y) => x - y), k = (a.length - 1) * q / 100, f = Math.floor(k), c = Math.min(f + 1, a.length - 1)
  return a[f] + (a[c] - a[f]) * (k - f)
}
/** Redondeo de mitades al par, igual que Python (`round`), para coincidir con el pipeline. */
const redondeo = (x: number) => { const r = Math.round(x); return Math.abs(x % 1) === 0.5 && r % 2 !== 0 ? r - 1 : r }
const doyAFecha = (doy: number, anio: number) => new Date(Date.UTC(anio, 0, redondeo(doy))).toISOString().slice(0, 10)
const doyDe = (iso: string) => Math.round((Date.parse(iso) - Date.parse(iso.slice(0, 4) + '-01-01')) / 86400000) + 1

/** Calor diario (°C·día) de la temporada actual por día del año; undefined = sin dato. */
export function calorDiario(dias: DiaTiempo[], base: number, anio: number) {
  const out: (number | undefined)[] = []
  for (const d of dias) {
    if (!d.fecha.startsWith(String(anio)) || d.tmax === null || d.tmin === null) continue
    out[doyDe(d.fecha) - 1] = Math.max(0, (d.tmax + d.tmin) / 2 - base)
  }
  return out
}

export function prediccionVivo(m: ModeloSevilla, hitosBase: Hito[], observado: (number | undefined)[], anio: number): Hito[] {
  const anios = Object.keys(m.gd_diario)
  // Último día con dato contiguo desde el 1 de enero: a partir de ahí manda el histórico
  let k = 0; while (k < observado.length && observado[k] !== undefined) k++
  const cruces = (umbral: number) => {
    const r: number[] = []
    for (const y of anios) {
      // tolerancia 1e-6: el umbral puede coincidir exactamente con el calor de un día
      const h = m.gd_diario[y]; let acc = 0
      for (let i = 0; i < h.length; i++) { acc += i < k ? (observado[i] as number) : h[i]; if (acc >= umbral - 1e-6) { r.push(i + 1); break } }
    }
    return r
  }
  return hitosBase.map(h => {
    const med = cruces(m.umbrales[h.id]), lo = cruces(m.umbrales_lo[h.id]), hi = cruces(m.umbrales_hi[h.id])
    if (!med.length || !lo.length || !hi.length) return h
    return {
      ...h, central: doyAFecha(percentil(med, 50), anio),
      probable: [doyAFecha(percentil(med, 25), anio), doyAFecha(percentil(med, 75), anio)] as [string, string],
      amplia: [doyAFecha(percentil(lo, 10), anio), doyAFecha(percentil(hi, 90), anio)] as [string, string],
    }
  })
}

/** Devuelve el destino con los hitos recalculados si estamos dentro de la temporada de acumulación. */
export function aplicarVivo(d: Destino, dias: DiaTiempo[] | undefined, hoy: string): { destino: Destino; vivo: Vivo } {
  const m = d.modelo
  if (!m) return { destino: d, vivo: { activo: false, diasReales: 0, diasPrevision: 0, texto: '' } }
  const anio = d.temporada
  const arranque = `${anio}-01-01`
  if (!dias || hoy < arranque) {
    return { destino: d, vivo: { activo: false, diasReales: 0, diasPrevision: 0,
      texto: `La acumulación de calor de la temporada ${anio} empieza el 1 de enero: hasta entonces mostramos la climatología de ${m.anios_clima.length} años.` } }
  }
  const obs = calorDiario(dias, m.base_c, anio)
  const hs = prediccionVivo(m, d.hitos, obs, anio)
  const f = Object.fromEntries(hs.map(h => [h.id, h]))
  const sum = (a: string, b: string) => new Date(Date.parse(a) + (Date.parse(b) - Date.parse(a)) / 2).toISOString().slice(0, 10)
  const curva: [string, number][] = [[f.inicio.central, 0], [sum(f.pico_ini.central, f.pico_fin.central), 100], [f.fin.central, 0]]
  const reales = dias.filter(x => x.fecha.startsWith(String(anio)) && !x.prevision && x.tmax !== null).length
  const prev = dias.filter(x => x.fecha.startsWith(String(anio)) && x.prevision).length
  const ultimo = dias.filter(x => x.fecha.startsWith(String(anio)) && x.tmax !== null).map(x => x.fecha).sort().pop()
  return {
    destino: { ...d, hitos: hs, curva, confianza: { ...d.confianza, texto: d.confianza.texto + ` Predicción actualizada con ${reales} días de temperatura real de ${anio} y ${prev} de previsión.` } },
    vivo: { activo: true, hasta: ultimo, diasReales: reales, diasPrevision: prev, texto: `Predicción actualizada con temperatura real de ${anio} hasta el ${ultimo} (${reales} días reales + ${prev} de previsión); el resto, con el calor de años anteriores.` },
  }
}
