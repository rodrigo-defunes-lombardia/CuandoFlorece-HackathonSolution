import type { Destino, Hito } from './tipos'
import { aMs, diasEntre, sumaDias } from './fechas'

/** Desplazamiento y estrechamiento opcionales de los hitos (hoy siempre SIN_AJUSTE). */
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
  /** Cómo va la temporada en lenguaje llano (sustituye al porcentaje) y días que faltan para el mejor momento. */
  momento: string; diasAlPico?: number
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
  // Momento de la temporada: antes del máximo de la curva "va a más"; después, "va a menos".
  const max = Math.max(...pts.map(p => p[1])), fPico = pts.find(p => p[1] === max)![0], fPicoFin = pts.filter(p => p[1] === max).slice(-1)[0][0]
  const diasAlPico = fecha < fPico ? diasEntre(fecha, fPico) : undefined
  const momento = diasAlPico !== undefined
    ? (pct < 35 ? 'Acaba de empezar' : pct < 70 ? 'A medio camino' : 'Casi en su mejor momento')
    : fecha <= fPicoFin ? 'En su mejor momento' : pct >= 50 ? 'Empieza a pasar' : 'Últimos días'
  let fase = null as null | (typeof d.fases)[number]
  for (const f of d.fases) if (get(f.hito_inicio).c <= fecha) fase = f
  const fuera = !fase || fecha >= fin.c
  const inicio = hs[0].c
  const verde = d.tipo === 'hayedo' && fecha < inicio
  return {
    faseId: verde ? 'previa' : fuera ? 'fuera' : fase!.id,
    etiqueta: verde ? 'Verde' : fuera ? (fecha < inicio ? 'Fuera de temporada' : d.tipo === 'hayedo' ? 'Hayedo desnudo' : 'Temporada terminada') : fase!.etiqueta,
    pct: Math.round(pct), enTemporada: !fuera, momento, diasAlPico, hitos: hs, ventana,
    proxima: fecha < inicio ? inicio : undefined, anioExtra,
  }
}

/** Momento de la temporada con los días que faltan para el mejor momento, p. ej. "A medio camino · pleno color en ~5 días". */
export function momentoTexto(e: Estado, tipo: Destino['tipo']): string {
  if (!e.enTemporada) return ''
  const mejor = tipo === 'hayedo' ? 'pleno color' : 'plena floración'
  return e.diasAlPico ? `${e.momento} · ${mejor} en ~${e.diasAlPico} ${e.diasAlPico === 1 ? 'día' : 'días'}` : e.momento
}
