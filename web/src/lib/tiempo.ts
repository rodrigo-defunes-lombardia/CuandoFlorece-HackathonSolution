/** Cliente de Open-Meteo (gratuito, sin clave): histórico reciente + previsión a 16 días.
 *  Orden de respaldo: red → caché local → CSV (solo Tejera Negra lo trae) → sin datos. */
export interface DiaTiempo { fecha: string; tmax: number | null; tmin: number | null; lluvia: number | null; prevision: boolean }
export interface Tiempo {
  origen: 'vivo' | 'cache' | 'csv' | 'ninguno'; actualizado: string; dias: DiaTiempo[]; nota: string
}

const TTL_MS = 30 * 60 * 1000
const claveCache = (id: string) => `cf.tiempo.${id}`
const HOY = () => new Date().toISOString().slice(0, 10)
const resta = (iso: string, n: number) => new Date(Date.parse(iso) - n * 86400000).toISOString().slice(0, 10)

async function pedir(url: string) {
  const ctl = new AbortController(); const to = setTimeout(() => ctl.abort(), 8000)
  try {
    const r = await fetch(url, { signal: ctl.signal })
    if (!r.ok) throw new Error(String(r.status))
    return await r.json()
  } finally { clearTimeout(to) }
}
const aDias = (j: { daily: { time: string[]; temperature_2m_max: (number | null)[]; temperature_2m_min: (number | null)[]; precipitation_sum: (number | null)[] } }, hoy: string): DiaTiempo[] =>
  j.daily.time.map((f, i) => ({ fecha: f, tmax: j.daily.temperature_2m_max[i], tmin: j.daily.temperature_2m_min[i], lluvia: j.daily.precipitation_sum[i], prevision: f > hoy }))
const DAILY = 'daily=temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=Europe%2FMadrid'

export interface OpcionesTiempo { id: string; lat: number; lon: number; desde?: string; csv?: DiaTiempo[]; forzar?: boolean }

/** `desde`: primer día que se necesita (p. ej. 1 de enero para acumular grados-día). Por defecto, 30 días atrás. */
export async function cargarTiempo({ id, lat, lon, desde, csv, forzar }: OpcionesTiempo): Promise<Tiempo> {
  const hoy = HOY()
  const leerCache = (): Tiempo | null => { try { return JSON.parse(localStorage.getItem(claveCache(id)) || 'null') } catch { return null } }
  const cache = leerCache()
  const fresca = cache && Date.now() - Date.parse(cache.actualizado) < TTL_MS && (!desde || cache.dias[0]?.fecha <= desde)
  if (!forzar && cache && fresca) return { ...cache, origen: 'cache', nota: 'Open-Meteo (caché de menos de 30 min)' }
  try {
    const inicio = desde ?? resta(hoy, 30)
    const reciente = 7
    let dias: DiaTiempo[] = []
    // La API de previsión solo trae ~40 días hacia atrás (los anteriores llegan vacíos): más allá de 30 días se usa la de archivo.
    if (inicio < resta(hoy, 30)) {
      // Tramo antiguo: API de archivo (retraso de unos días); los últimos 7 días y la previsión, con la API de previsión.
      const fin = resta(hoy, reciente + 1)
      const ar = await pedir(`https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&start_date=${inicio}&end_date=${fin}&${DAILY}`)
      dias = aDias(ar, hoy)
      const pr = await pedir(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&past_days=${reciente}&forecast_days=16&${DAILY}`)
      const ya = new Set(dias.filter(d => d.tmax !== null).map(d => d.fecha))
      dias = dias.filter(d => d.tmax !== null).concat(aDias(pr, hoy).filter(d => !ya.has(d.fecha)))
    } else {
      const pas = Math.max(1, Math.min(30, Math.round((Date.parse(hoy) - Date.parse(inicio)) / 86400000)))
      dias = aDias(await pedir(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&past_days=${pas}&forecast_days=16&${DAILY}`), hoy)
    }
    const t: Tiempo = { origen: 'vivo', actualizado: new Date().toISOString(), dias, nota: 'Open-Meteo en vivo' }
    try { localStorage.setItem(claveCache(id), JSON.stringify(t)) } catch { /* caché opcional */ }
    return t
  } catch {
    if (cache) return { ...cache, origen: 'cache', nota: `Sin conexión con Open-Meteo: último dato guardado (${cache.actualizado.slice(0, 16).replace('T', ' ')})` }
    if (csv?.length) return { origen: 'csv', actualizado: '', dias: csv, nota: 'Sin conexión con Open-Meteo: usamos el CSV histórico' }
    return { origen: 'ninguno', actualizado: '', dias: [], nota: 'Sin conexión con Open-Meteo y sin datos guardados' }
  }
}

/** Une el CSV (histórico) con los datos en vivo; en caso de solape manda Open-Meteo. */
export function fusionar(csv: DiaTiempo[], vivo: DiaTiempo[]): DiaTiempo[] {
  const m = new Map(csv.map(d => [d.fecha, d]))
  for (const d of vivo) if (d.tmax !== null || d.tmin !== null) m.set(d.fecha, d)
  return [...m.values()].sort((a, b) => a.fecha.localeCompare(b.fecha))
}
