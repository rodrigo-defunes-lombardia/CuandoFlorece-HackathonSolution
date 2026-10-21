import type { Destino, Hito, Observacion } from './tipos'
import { aMs, diasEntre, sumaDias } from './fechas'

/** Parámetros de la verificación ciudadana (ver README: "Cómo afecta la comunidad a la predicción"). */
export const CIUDADANA = {
  VIDA_MEDIA_DIAS: 7,   // una observación pierde la mitad de su peso cada 7 días
  VENTANA_DIAS: 21,     // las observaciones más antiguas no cuentan
  K_PRIOR: 2,           // λ = n_eff / (n_eff + K): con 1 observación mueve ~33 %, con 6 ~75 %
  ESTRECHAR: 0.25,      // f = 1 / (1 + 0.25 · n_eff), mínimo 0,4
  MAX_DESPLAZ: 21,      // nunca se mueve la predicción más de 3 semanas
  MARGEN_TEMPORADA: 45, // observaciones a más de 45 días de la temporada se guardan pero no cuentan
  MAX_DISTANCIA_KM: 10, // umbral de distancia al destino
}

export interface Ajuste { desplazamiento: number; factor: number; n: number; nEff: number; ultima?: string; demos: number }
export const SIN_AJUSTE: Ajuste = { desplazamiento: 0, factor: 1, n: 0, nEff: 0, demos: 0 }

export interface HitoAj extends Hito { c: string; prob: [string, string]; amp: [string, string] }

/** Aplica desplazamiento y estrechamiento a los hitos (y los pasa al año de la fecha consultada). */
export function hitosAjustados(d: Destino, aj: Ajuste, anioExtra = 0): HitoAj[] {
  const mover = (iso: string) => sumaDias(iso, aj.desplazamiento + anioExtra * 365)
  const est = (c: string, x: string) => sumaDias(mover(c), (aMs(x) - aMs(c)) / 86400000 * aj.factor)
  return d.hitos.map(h => ({
    ...h, c: mover(h.central),
    prob: [est(h.central, h.probable[0]), est(h.central, h.probable[1])],
    amp: [est(h.central, h.amplia[0]), est(h.central, h.amplia[1])],
  }))
}

export interface Estado {
  faseId: string; etiqueta: string; pct: number; enTemporada: boolean
  hitos: HitoAj[]; ventana: { desde: string; hasta: string; probable: [string, string]; amplia: [string, string] }
  proxima?: string; anioExtra: number
}

export function estadoEn(d: Destino, fecha: string, aj: Ajuste): Estado {
  // Los hayedos repiten su calendario cada año; el resto tiene una sola temporada publicada.
  let anioExtra = 0
  const fin0 = d.hitos.find(h => h.id === d.fin)!.central
  if (d.tipo === 'hayedo' && diasEntre(fin0, fecha) > 30) anioExtra = Math.floor((diasEntre(fin0, fecha) - 30) / 365) + 1
  const hs = hitosAjustados(d, aj, anioExtra)
  const get = (id: string) => hs.find(h => h.id === id)!
  const fin = get(d.fin)
  const [v0, v1] = [get(d.ventana[0]), get(d.ventana[1])]
  const ventana = {
    desde: v0.c, hasta: v1.c,
    probable: [v0.prob[0], v1.prob[1]] as [string, string], amplia: [v0.amp[0], v1.amp[1]] as [string, string],
  }
  // Curva de intensidad
  const pts = d.curva.map(([f, p]) => [sumaDias(f, aj.desplazamiento + anioExtra * 365), p] as [string, number])
  let pct = 0
  if (fecha >= pts[pts.length - 1][0]) pct = 0
  else for (let i = 0; i < pts.length - 1; i++) {
    const [f0, p0] = pts[i], [f1, p1] = pts[i + 1]
    if (fecha >= f0 && fecha < f1) pct = p0 + (p1 - p0) * (diasEntre(f0, fecha) / Math.max(1, diasEntre(f0, f1)))
  }
  let fase = null as null | (typeof d.fases)[number]
  for (const f of d.fases) if (get(f.hito_inicio).c <= fecha) fase = f
  const fuera = !fase || fecha >= fin.c
  const inicio = hs[0].c
  const verde = d.tipo === 'hayedo' && fecha < inicio
  return {
    faseId: verde ? 'previa' : fuera ? 'fuera' : fase!.id,
    etiqueta: verde ? 'Verde' : fuera ? (fecha < inicio ? 'Fuera de temporada' : d.tipo === 'hayedo' ? 'Hayedo desnudo' : 'Temporada terminada') : fase!.etiqueta,
    pct: Math.round(pct), enTemporada: !fuera, hitos: hs, ventana,
    proxima: fecha < inicio ? inicio : undefined, anioExtra,
  }
}

/** Distancia entre dos puntos (km), fórmula de haversine. */
export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371, rad = (x: number) => (x * Math.PI) / 180
  const a = Math.sin(rad(lat2 - lat1) / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lon2 - lon1) / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}

/** Opciones de estado para el formulario: una "previa" + las fases del destino. */
export function opcionesFase(d: Destino) {
  const previa = d.tipo === 'hayedo' ? { id: 'previa', etiqueta: 'Verde' } : { id: 'previa', etiqueta: 'Aún sin flor' }
  return [previa, ...d.fases.map(f => ({ id: f.id, etiqueta: f.etiqueta }))]
}

/** Qué desplazamiento (días) implica una observación respecto a lo que dice el modelo base. */
function desplazamientoImplicito(d: Destino, o: Observacion): number | null {
  const hs = d.hitos
  const central = (id: string) => hs.find(h => h.id === id)!.central
  const orden = d.fases.map(f => central(f.hito_inicio))
  const i = o.fase === 'previa' ? -1 : d.fases.findIndex(f => f.id === o.fase)
  const desde = i < 0 ? null : orden[i]
  const hasta = i + 1 < orden.length ? orden[i + 1] : central(d.fin)
  const t = o.fecha
  if (diasEntre(central(d.fin), t) > CIUDADANA.MARGEN_TEMPORADA || diasEntre(t, hs[0].central) > CIUDADANA.MARGEN_TEMPORADA) return null
  if (desde && t < desde) return diasEntre(desde, t)             // se ve antes de lo previsto → negativo (adelantado)
  if (t >= hasta) return diasEntre(hasta, t) + 1                 // sigue en esa fase pasado su final → positivo (retrasado)
  return 0                                                       // coherente con el modelo
}

/** Combina las observaciones válidas en un ajuste. Método simple y explicado, primer enfoque. */
export function calcularAjuste(d: Destino, obs: Observacion[], hoy: string): Ajuste {
  let sw = 0, sws = 0, n = 0, demos = 0, ultima: string | undefined
  for (const o of obs) {
    if (o.destinoId !== d.id) continue
    n++; if (o.demo) demos++
    if (!ultima || o.fecha > ultima) ultima = o.fecha
    const edad = diasEntre(o.fecha, hoy)
    if (edad > CIUDADANA.VENTANA_DIAS || edad < 0) continue
    const s = desplazamientoImplicito(d, o)
    if (s === null) continue
    const w = Math.pow(0.5, edad / CIUDADANA.VIDA_MEDIA_DIAS)
    sw += w; sws += w * s
  }
  if (sw === 0) return { ...SIN_AJUSTE, n, demos, ultima }
  const lambda = sw / (sw + CIUDADANA.K_PRIOR)
  const des = Math.max(-CIUDADANA.MAX_DESPLAZ, Math.min(CIUDADANA.MAX_DESPLAZ, lambda * (sws / sw)))
  return { desplazamiento: Math.round(des * 10) / 10, factor: Math.max(0.4, 1 / (1 + CIUDADANA.ESTRECHAR * sw)), n, nEff: sw, ultima, demos }
}
