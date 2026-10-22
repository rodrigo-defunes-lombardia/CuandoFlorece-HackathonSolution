/** Fechas del viaje de la agencia: qué días se pueden elegir, cómo funciona el calendario (ida → vuelta)
 *  y cómo se resume el tiempo de esos días. Funciones puras, probadas en `viaje.test.ts`. */
import type { Destino } from './tipos'
import { estadoEn, SIN_AJUSTE } from './estado'
import { diasEntre, sumaDias } from './fechas'
import { MAX_DIAS } from '../config/agencia'

export interface RangoViaje { desde: string; hasta: string; ventana: [string, string] }

/** Días que se pueden elegir: la mejor ventana para ir del modelo de la app, sin días pasados.
 *  Si la ventana de este año ya pasó (hayedo), se ofrece la del año siguiente. Null si no queda ningún día. */
export function rangoViaje(d: Destino, hoy: string): RangoViaje | null {
  let e = estadoEn(d, hoy, SIN_AJUSTE)
  if (e.ventana.probable[1] < hoy && d.tipo === 'hayedo') e = estadoEn(d, sumaDias(e.hitos.find(h => h.id === d.fin)!.c, 31), SIN_AJUSTE)
  const [v0, v1] = e.ventana.probable
  const desde = v0 < hoy ? hoy : v0
  return desde > v1 ? null : { desde, hasta: v1, ventana: [v0, v1] }
}

export interface Fechas { ida: string; vuelta: string }
export const diasViaje = (f: Fechas) => diasEntre(f.ida, f.vuelta) + 1

/** Días que se pueden elegir como vuelta dada la ida: de la propia ida (viaje de 1 día) al final de la ventana,
 *  o hasta el tope de MAX_DIAS si está configurado. */
export function diasVuelta(r: RangoViaje, ida: string): { desde: string; hasta: string } {
  const tope = MAX_DIAS ? sumaDias(ida, MAX_DIAS - 1) : r.hasta
  return { desde: ida, hasta: tope < r.hasta ? tope : r.hasta }
}

/** Fechas válidas dentro del rango: las de la URL si caben; si no, los 2 primeros días disponibles. */
export function normalizarFechas(r: RangoViaje, ida?: string, vuelta?: string): Fechas {
  const dentro = (x?: string): x is string => !!x && /^\d{4}-\d{2}-\d{2}$/.test(x) && x >= r.desde && x <= r.hasta
  if (dentro(ida) && dentro(vuelta) && vuelta >= ida && vuelta <= diasVuelta(r, ida).hasta) return { ida, vuelta }
  const i = dentro(ida) ? ida : r.desde, v = sumaDias(i, 1)
  return { ida: i, vuelta: v > r.hasta ? i : v }
}

/** Fechas al abrir la página: las de la URL (ida/vuelta, corregidas si no caben) o, en enlaces con `dias`,
 *  ese número de días desde el primero disponible. Sin nada en la URL, null: el usuario las elige. */
export function fechasIniciales(r: RangoViaje, ida?: string, vuelta?: string, dias?: number): Fechas | null {
  if (ida || vuelta) return normalizarFechas(r, ida, vuelta)
  if (!dias) return null
  const v = sumaDias(r.desde, dias - 1), max = diasVuelta(r, r.desde).hasta
  return { ida: r.desde, vuelta: v < max ? v : max }
}

/** Selección en curso del calendario: sin ida elegida todavía, o con la ida esperando la vuelta. */
export type Seleccion = { fase: 'ida' } | { fase: 'vuelta'; ida: string }

/** Un clic en el calendario: el primero fija la ida; el segundo, la vuelta (el mismo día = excursión de un día).
 *  Para cambiar la ida se vuelve al paso 1 (botón «Cambiar día de ida»). Devuelve la nueva selección y, si se completó, las fechas. */
export function clicDia(sel: Seleccion, dia: string): { sel: Seleccion; fechas?: Fechas } {
  if (sel.fase === 'ida') return { sel: { fase: 'vuelta', ida: dia } }
  if (dia < sel.ida) return { sel } // un día anterior a la ida no es una vuelta válida
  return { sel: { fase: 'ida' }, fechas: { ida: sel.ida, vuelta: dia } }
}

/** ¿Se puede pulsar este día? Paso 1: cualquier día de la ventana. Paso 2: de la ida al final de la ventana (o al tope). */
export function diaElegible(r: RangoViaje, sel: Seleccion, dia: string) {
  if (dia < r.desde || dia > r.hasta) return false
  if (sel.fase === 'ida') return true
  const v = diasVuelta(r, sel.ida)
  return dia >= v.desde && dia <= v.hasta
}

/** Semanas de un mes (lunes primero); null en los huecos. `mes` es 'AAAA-MM'. */
export function semanasMes(mes: string): (string | null)[][] {
  const primero = `${mes}-01`
  const hueco = (new Date(primero + 'T00:00:00Z').getUTCDay() + 6) % 7
  const dias: (string | null)[] = Array(hueco).fill(null)
  for (let d = primero; d.startsWith(mes); d = sumaDias(d, 1)) dias.push(d)
  while (dias.length % 7) dias.push(null)
  return Array.from({ length: dias.length / 7 }, (_, i) => dias.slice(i * 7, i * 7 + 7))
}
export const mesDe = (iso: string) => iso.slice(0, 7)
export const mesSiguiente = (mes: string, n: number) => {
  const [a, m] = mes.split('-').map(Number), t = a * 12 + (m - 1) + n
  return `${Math.floor(t / 12)}-${String((t % 12) + 1).padStart(2, '0')}`
}

/** Tiempo de un día del viaje: previsión real (hasta 16 días vista) o lo habitual en esas fechas los años anteriores. */
export type TiempoDia =
  | { tipo: 'prevision'; fecha: string; tmax: number; tmin: number; probLluvia: number | null; codigo: number }
  | { tipo: 'habitual'; fecha: string; tmax: number; tmin: number; aniosLluvia: number; anios: number; desde: number; hasta: number }

/** Media de las mismas fechas (mes-día) en los años del archivo; lluvia = años con 1 mm o más ese día. */
export function habitual(fechas: string[], archivo: { fecha: string; tmax: number | null; tmin: number | null; lluvia: number | null }[]): TiempoDia[] {
  return fechas.flatMap(f => {
    const md = f.slice(5)
    const xs = archivo.filter(a => a.fecha.slice(5) === md && a.tmax !== null && a.tmin !== null)
    if (!xs.length) return []
    const media = (k: 'tmax' | 'tmin') => Math.round(xs.reduce((s, a) => s + (a[k] as number), 0) / xs.length)
    const anios = xs.map(a => Number(a.fecha.slice(0, 4)))
    return [{ tipo: 'habitual' as const, fecha: f, tmax: media('tmax'), tmin: media('tmin'), aniosLluvia: xs.filter(a => (a.lluvia ?? 0) >= 1).length,
      anios: xs.length, desde: Math.min(...anios), hasta: Math.max(...anios) }]
  })
}

/** Código WMO de Open-Meteo en palabras. */
export function cielo(codigo: number): string {
  if (codigo === 0) return 'Despejado'
  if (codigo <= 2) return 'Sol y nubes'
  if (codigo === 3) return 'Nublado'
  if (codigo <= 48) return 'Niebla'
  if (codigo <= 57) return 'Llovizna'
  if (codigo <= 67 || (codigo >= 80 && codigo <= 82)) return 'Lluvia'
  if (codigo <= 77 || codigo === 85 || codigo === 86) return 'Nieve'
  return 'Tormenta'
}
