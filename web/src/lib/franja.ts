/** Franja de temporadas encima del mapa: agrupa los destinos por planta y pone cada planta bajo los meses de su temporada.
 *  Funciones puras, probadas en `franja.test.ts`. */
import type { CalendarioPlanta, Destino } from './tipos'

export const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

/** Una entrada por planta. `destinos` es una lista para que, si en el futuro hay varios destinos con la misma planta,
 *  el chip pueda abrir un selector de destino; hoy cada planta tiene un único destino y el chip enlaza directamente. */
export interface PlantaFranja { planta: string; cal: CalendarioPlanta; destinos: Destino[] }

export function plantasFranja(destinos: Destino[]): PlantaFranja[] {
  const grupos = new Map<string, PlantaFranja>()
  for (const d of destinos) {
    if (!d.calendario) continue // sin meses calculados: no se inventa una barra
    const g = grupos.get(d.calendario.planta)
    if (g) g.destinos.push(d)
    else grupos.set(d.calendario.planta, { planta: d.calendario.planta, cal: d.calendario, destinos: [d] })
  }
  // En el orden del año
  return [...grupos.values()].sort((a, b) => a.cal.mes_desde - b.cal.mes_desde)
}

/** Tramos de columnas [desde, hasta] (1–12). Una temporada que cruza el año (nov–feb) se parte en dos. */
export function tramos(desde: number, hasta: number): [number, number][] {
  return desde <= hasta ? [[desde, hasta]] : [[desde, 12], [1, hasta]]
}

export const enTemporada = (cal: CalendarioPlanta, mes: number) => tramos(cal.mes_desde, cal.mes_hasta).some(([a, b]) => mes >= a && mes <= b)

/** Plantas en temporada en cada mes (índice 0 = enero). Un mes cuenta si el rango de la planta toca cualquier día de él,
 *  así que una planta de varios meses aparece en todos ellos. */
export function plantasPorMes(plantas: PlantaFranja[]): PlantaFranja[][] {
  return MESES.map((_, i) => plantas.filter(p => enTemporada(p.cal, i + 1)))
}

/** Línea de origen bajo la franja, p. ej. "Meses según calendario histórico." */
export function origenTexto(plantas: PlantaFranja[]) {
  const o = [...new Set(plantas.map(p => p.cal.origen.toLowerCase()))]
  return o.length ? `Meses según ${o.join(' y ')}.` : ''
}
