import { describe, expect, it } from 'vitest'
import type { Datos } from './tipos'
import json from '../../public/data/destinos.json'
import { enTemporada, origenTexto, plantasFranja, plantasPorMes, tramos } from './franja'

const datos = json as unknown as Datos

describe('franja de temporadas', () => {
  it('una barra por planta, en el orden del año, con los meses del pipeline', () => {
    const p = plantasFranja(datos.destinos)
    expect(p.map(x => [x.planta, x.cal.mes_desde, x.cal.mes_hasta, x.destinos.map(d => d.id).join()])).toEqual([
      ['Azahar', 3, 4, 'sevilla'], ['Lavanda', 6, 7, 'brihuega'], ['Hayedo', 9, 12, 'tejera_negra']])
  })
  it('agrupa destinos con la misma planta y omite los que no tienen meses', () => {
    const [a, b, c] = datos.destinos
    const p = plantasFranja([a, { ...a, id: 'otro' }, { ...b, calendario: undefined }, c])
    expect(p.find(x => x.planta === 'Hayedo')!.destinos.map(d => d.id)).toEqual(['tejera_negra', 'otro'])
    expect(p.some(x => x.planta === 'Lavanda')).toBe(false)
  })
  it('tramos y meses en temporada, también cruzando el año', () => {
    expect(tramos(3, 4)).toEqual([[3, 4]])
    expect(tramos(11, 2)).toEqual([[11, 12], [1, 2]])
    const cal = { planta: 'x', mes_desde: 11, mes_hasta: 2, desde: '', hasta: '', base: '', origen: '' }
    expect([10, 11, 1, 2, 3].map(m => enTemporada(cal, m))).toEqual([false, true, true, true, false])
  })
  it('cada planta se repite en todos los meses que toca su rango', () => {
    const meses = plantasPorMes(plantasFranja(datos.destinos)).map(ps => ps.map(p => p.planta))
    expect(meses).toEqual([[], [], ['Azahar'], ['Azahar'], [], ['Lavanda'], ['Lavanda'], [], ['Hayedo'], ['Hayedo'], ['Hayedo'], ['Hayedo']])
    expect(origenTexto(plantasFranja(datos.destinos))).toBe('Meses según calendario histórico.')
  })
})
