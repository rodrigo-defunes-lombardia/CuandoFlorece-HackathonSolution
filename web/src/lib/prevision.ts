/** Tiempo de los días del viaje con Open-Meteo (gratis, sin clave).
 *  Hasta 15 días vista: previsión real (API de previsión). Más allá: lo habitual esos mismos días en los 5 años anteriores (API de archivo).
 *  Caché de 30 min en localStorage; sin red y sin caché devuelve null y la ruta lo dice. */
import { habitual, type TiempoDia } from './viaje'
import { diasEntre, sumaDias } from './fechas'

const TTL_MS = 30 * 60 * 1000
const ALCANCE = 15 // la API de previsión acepta hasta hoy + 15
const ANIOS = 5

async function pedir(url: string) {
  const ctl = new AbortController(); const to = setTimeout(() => ctl.abort(), 8000)
  try {
    const r = await fetch(url, { signal: ctl.signal })
    if (!r.ok) throw new Error(String(r.status))
    return await r.json()
  } finally { clearTimeout(to) }
}

export async function tiempoViaje(id: string, lat: number, lon: number, ida: string, vuelta: string, hoy: string): Promise<TiempoDia[] | null> {
  const clave = `cf.viaje.${id}.${ida}.${vuelta}`
  try { const c = JSON.parse(localStorage.getItem(clave) || 'null'); if (c && Date.now() - c.t < TTL_MS) return c.dias } catch { /* caché opcional */ }
  const fechas = Array.from({ length: diasEntre(ida, vuelta) + 1 }, (_, i) => sumaDias(ida, i))
  const limite = sumaDias(hoy, ALCANCE)
  const cerca = fechas.filter(f => f <= limite), lejos = fechas.filter(f => f > limite)
  const pos = `latitude=${lat}&longitude=${lon}&timezone=Europe%2FMadrid`
  try {
    const dias: TiempoDia[] = []
    if (cerca.length) {
      const j = await pedir(`https://api.open-meteo.com/v1/forecast?${pos}&start_date=${cerca[0]}&end_date=${cerca[cerca.length - 1]}&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max`)
      j.daily.time.forEach((f: string, i: number) => {
        const tmax = j.daily.temperature_2m_max[i], tmin = j.daily.temperature_2m_min[i]
        if (tmax !== null && tmin !== null) dias.push({ tipo: 'prevision', fecha: f, tmax: Math.round(tmax), tmin: Math.round(tmin), probLluvia: j.daily.precipitation_probability_max[i], codigo: j.daily.weather_code[i] })
      })
    }
    if (lejos.length) {
      const anio = Number(lejos[0].slice(0, 4))
      // Un solo pedido que cubre los 5 años anteriores; luego se filtran las mismas fechas de cada año.
      const j = await pedir(`https://archive-api.open-meteo.com/v1/archive?${pos}&start_date=${anio - ANIOS}${lejos[0].slice(4)}&end_date=${anio - 1}${lejos[lejos.length - 1].slice(4)}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum`)
      const archivo = j.daily.time.map((f: string, i: number) => ({ fecha: f, tmax: j.daily.temperature_2m_max[i], tmin: j.daily.temperature_2m_min[i], lluvia: j.daily.precipitation_sum[i] }))
      dias.push(...habitual(lejos, archivo))
    }
    try { localStorage.setItem(clave, JSON.stringify({ t: Date.now(), dias })) } catch { /* caché opcional */ }
    return dias
  } catch { return null }
}
