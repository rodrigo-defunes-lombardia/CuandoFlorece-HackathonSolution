import type { ModeloSevilla } from './tipos'

export interface Anomalia {
  origen: 'live' | 'csv'; anio: number; diasAdelanto: number; gdd75: number; gdd75Media: number; nota: string
}

/** ¿La temporada de azahar fue adelantada o retrasada? Open-Meteo (sin clave) con fallback automático al CSV. */
export async function anomaliaSevilla(m: ModeloSevilla, lat: number, lon: number, hoy: string): Promise<Anomalia> {
  const media75 = Object.values(m.por_anio).reduce((s, v) => s + v.gdd_doy_75, 0) / Object.keys(m.por_anio).length
  const anio = Number(hoy.slice(0, 4))
  try {
    const fin = `${anio}-04-30`
    const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&start_date=${anio}-01-01&end_date=${fin}&daily=temperature_2m_max,temperature_2m_min&timezone=Europe%2FMadrid`
    const ctl = new AbortController(); const to = setTimeout(() => ctl.abort(), 5000)
    const r = await fetch(url, { signal: ctl.signal }); clearTimeout(to)
    if (!r.ok) throw new Error(String(r.status))
    const j = await r.json()
    const tmax: (number | null)[] = j.daily.temperature_2m_max, tmin: (number | null)[] = j.daily.temperature_2m_min
    let acc = 0, cruce: number | null = null, g75 = 0
    for (let i = 0; i < tmax.length; i++) {
      if (tmax[i] == null || tmin[i] == null) continue
      acc += Math.max(0, ((tmax[i] as number) + (tmin[i] as number)) / 2 - m.base_c)
      if (i + 1 === 75) g75 = acc
      if (cruce === null && acc >= m.umbral_pico_ini) cruce = i + 1
    }
    if (cruce === null) throw new Error('sin cruce')
    return { origen: 'live', anio, diasAdelanto: Math.round(m.mediana_pico_ini_doy - cruce), gdd75: g75, gdd75Media: media75,
      nota: `Open-Meteo (en vivo) · temporada ${anio}` }
  } catch {
    const ultimo = Math.max(...m.anios_clima)
    const doy = m.por_anio[String(ultimo)].doy_pico_ini ?? m.mediana_pico_ini_doy
    return { origen: 'csv', anio: ultimo, diasAdelanto: Math.round(m.mediana_pico_ini_doy - doy), gdd75: m.por_anio[String(ultimo)].gdd_doy_75,
      gdd75Media: media75, nota: `Sin conexión con Open-Meteo: usamos el CSV histórico (último año: ${ultimo})` }
  }
}
