/** Predicción de Sevilla actualizada con la temperatura real de la temporada en curso.
 *  Método de "años análogos": se acumula el calor real (observado + previsión) hasta hoy y, para lo que falta,
 *  se usa el calor diario de cada uno de los años históricos. Cada año da una fecha de cruce de cada umbral;
 *  el reparto de esas fechas da el central, el rango probable (p25–p75) y el amplio (p10 del umbral bajo – p90 del alto),
 *  igual que el pipeline. Sin datos de la temporada en curso, el resultado coincide con el del pipeline. */
import type { Destino, Hito, ModeloSevilla, ModeloTermico } from './tipos'
import type { DiaTiempo } from './tiempo'

export interface Vivo {
  activo: boolean; hasta?: string; diasReales: number; diasPrevision: number; texto: string
  experimental?: boolean // modelo térmico de Brihuega y Tejera Negra (no validado)
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

/** Primer día de la temporada en curso cuya temperatura usa la predicción en vivo (undefined si el destino no tiene modelo). */
export const inicioAcumulacion = (d: Destino) => d.modelo ? `${d.temporada}-01-01` : d.termico ? `${d.temporada}-${d.termico.inicio}` : undefined

// ---------------------------------------------------------------- Modelo térmico experimental (Brihuega y Tejera Negra)
// Mismo cálculo que `desplazamiento` en pipeline/build.py: para cada temperatura base, día de cruce del umbral con la
// temperatura real (y, para lo que falta, la de cada año de referencia) menos el día de cruce climatológico; mediana de los años
// y luego mediana de las bases. Las fechas del CSV se desplazan esos días, sin estrechar los márgenes.
const indice = (t: number, tipo: ModeloTermico['tipo'], b: number) => (tipo === 'calor' ? Math.max(0, t - b) : Math.max(0, b - t))
const cruce = (serie: number[], umbral: number) => {
  let acc = 0
  for (let i = 0; i < serie.length; i++) { acc += serie[i]; if (acc >= umbral - 1e-6) return i }
  return null
}
const medianaDe = (v: (number | null)[]) => percentil(v.filter((x): x is number => x !== null), 50)

export function desplazamientoTermico(m: ModeloTermico, tmedReal: (number | undefined)[]) {
  let k = 0; while (k < tmedReal.length && tmedReal[k] !== undefined) k++
  const porBase = m.bases.map(b => {
    const U = m.umbrales[String(b)]
    const clim: (number | null)[] = [], real: (number | null)[] = []
    for (const y of m.anios) {
      const h = m.tmed_diario[String(y)].map(t => indice(t, m.tipo, b))
      clim.push(cruce(h, U))
      real.push(cruce(h.map((v, i) => (i < k ? indice(tmedReal[i] as number, m.tipo, b) : v)), U))
    }
    return medianaDe(real) - medianaDe(clim)
  })
  return { dias: percentil(porBase, 50), porBase, k }
}

/** Temperatura media diaria de la temporada en curso, indexada desde el día de inicio del modelo. */
export function tmedTemporada(dias: DiaTiempo[], arranque: string, n: number) {
  const out: (number | undefined)[] = []
  const t0 = Date.parse(arranque)
  for (const d of dias) {
    const i = Math.round((Date.parse(d.fecha) - t0) / 86400000)
    if (i < 0 || i >= n || d.tmax === null || d.tmin === null) continue
    out[i] = (d.tmax + d.tmin) / 2
  }
  return out
}

const mover = (iso: string, n: number) => new Date(Date.parse(iso) + n * 86400000).toISOString().slice(0, 10)
const fechaCorta = (iso: string) => `${Number(iso.slice(8))} ${['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'][Number(iso.slice(5, 7)) - 1]}`
const fmt = (x: number) => x.toLocaleString('es-ES', { maximumFractionDigits: 1 })

function aplicarTermico(d: Destino, m: ModeloTermico, dias: DiaTiempo[] | undefined, hoy: string): { destino: Destino; vivo: Vivo } {
  const arranque = `${d.temporada}-${m.inicio}`
  const que = m.tipo === 'frio' ? 'frío' : 'calor'
  const base = d.tipo === 'hayedo' ? 'el calendario histórico' : 'la climatología del CSV'
  if (!dias || hoy < arranque) {
    return { destino: d, vivo: { activo: false, experimental: true, diasReales: 0, diasPrevision: 0,
      texto: `El ${que} acumulado de la temporada ${d.temporada} empieza a contar el ${fechaCorta(arranque)}: hasta entonces mostramos ${base}.` } }
  }
  const n = m.tmed_diario[String(m.anios[0])].length
  const tmed = tmedTemporada(dias, arranque, n)
  const { dias: delta0, porBase, k } = desplazamientoTermico(m, tmed)
  if (k === 0) return { destino: d, vivo: { activo: false, experimental: true, diasReales: 0, diasPrevision: 0, texto: `Sin temperatura de esta temporada: mostramos ${base}.` } }
  // Nunca fuera del margen amplio del hito de referencia (rango histórico)
  const ref = d.hitos.find(h => h.id === m.hito_ref)!
  const dia = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 86400000)
  const delta = Math.max(dia(ref.central, ref.amplia[0]), Math.min(dia(ref.central, ref.amplia[1]), Math.round(delta0)))
  const hitos = d.hitos.map(h => ({ ...h, central: mover(h.central, delta),
    probable: [mover(h.probable[0], delta), mover(h.probable[1], delta)] as [string, string], amplia: [mover(h.amplia[0], delta), mover(h.amplia[1], delta)] as [string, string] }))
  const curva = d.curva.map(([f, p]) => [mover(f, delta), p] as [string, number])
  const enTemp = dias.filter(x => x.fecha >= arranque && x.tmax !== null && x.tmin !== null)
  const reales = enTemp.filter(x => !x.prevision).length, prev = enTemp.filter(x => x.prevision).length
  const hasta = enTemp.filter(x => !x.prevision).map(x => x.fecha).sort().pop()
  const movimiento = delta === 0 ? 'no movemos las fechas' : `movemos las fechas ${Math.abs(delta)} días ${delta < 0 ? 'antes' : 'después'}`
  const texto = `Ajuste con temperatura real: el ${que} acumulado desde el ${fechaCorta(arranque)} (${reales} días reales + ${prev} de previsión) comparado con ${m.anios[0]}–${m.anios[m.anios.length - 1]}: ${movimiento}`
    + `${delta !== Math.round(delta0) ? ' (limitado al rango histórico)' : ''}. Según la temperatura base supuesta, el desplazamiento va de ${fmt(Math.min(...porBase))} a ${fmt(Math.max(...porBase))} días. `
    + 'Modelo experimental, no validado: los márgenes no se estrechan.'
  return {
    destino: { ...d, hitos, curva, confianza: { ...d.confianza, texto: `${d.confianza.texto} Fechas desplazadas ${delta} días con un modelo térmico experimental (Open-Meteo).` } },
    vivo: { activo: true, experimental: true, hasta, diasReales: reales, diasPrevision: prev, texto },
  }
}

/** Devuelve el destino con los hitos recalculados si estamos dentro de la temporada de acumulación. */
export function aplicarVivo(d: Destino, dias: DiaTiempo[] | undefined, hoy: string): { destino: Destino; vivo: Vivo } {
  if (!d.modelo && d.termico) return aplicarTermico(d, d.termico, dias, hoy)
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
