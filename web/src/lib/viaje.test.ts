import { describe, expect, it } from 'vitest'
import type { Datos } from './tipos'
import json from '../../public/data/destinos.json'
import { cielo, clicDia, diaElegible, diasVuelta, fechasIniciales, habitual, mesSiguiente, normalizarFechas, rangoViaje, semanasMes, type RangoViaje } from './viaje'

const datos = json as unknown as Datos
const dest = (id: string) => datos.destinos.find(d => d.id === id)!
const R: RangoViaje = { desde: '2026-10-21', hasta: '2026-11-07', ventana: ['2026-10-08', '2026-11-07'] }

describe('rangoViaje', () => {
  it('Tejera Negra: la ventana probable, sin días pasados', () => {
    const r = rangoViaje(dest('tejera_negra'), '2026-10-21')!
    expect(r.ventana).toEqual(['2026-09-30', '2026-10-30'])
    expect(r.desde).toBe('2026-10-21'); expect(r.hasta).toBe('2026-10-30')
  })
  it('antes de la ventana se puede elegir entera', () => {
    const r = rangoViaje(dest('sevilla'), '2026-10-21')!
    expect(r.desde).toBe(r.ventana[0]); expect(r.hasta).toBe(r.ventana[1])
  })
  it('hayedo con la ventana ya pasada: ofrece la del año siguiente', () => {
    const r = rangoViaje(dest('tejera_negra'), '2026-11-05')!
    expect(r.desde.slice(0, 4)).toBe('2027'); expect(r.desde).toBe(r.ventana[0])
  })
  it('flor con la temporada pasada: no hay fechas', () => {
    expect(rangoViaje(dest('sevilla'), '2027-05-01')).toBeNull()
  })
})

describe('calendario', () => {
  it('primer clic = ida, segundo = vuelta', () => {
    const a = clicDia({ fase: 'ida' }, '2026-10-25')
    expect(a).toEqual({ sel: { fase: 'vuelta', ida: '2026-10-25' } })
    expect(clicDia(a.sel, '2026-10-27')).toEqual({ sel: { fase: 'ida' }, fechas: { ida: '2026-10-25', vuelta: '2026-10-27' } })
  })
  it('el mismo día es una excursión de un día; un día anterior a la ida no hace nada', () => {
    expect(clicDia({ fase: 'vuelta', ida: '2026-10-25' }, '2026-10-25').fechas).toEqual({ ida: '2026-10-25', vuelta: '2026-10-25' })
    expect(clicDia({ fase: 'vuelta', ida: '2026-10-25' }, '2026-10-22')).toEqual({ sel: { fase: 'vuelta', ida: '2026-10-25' } })
  })
  it('días de vuelta: de la ida al final de la ventana, sin tope de 5 días (también cruzando de mes)', () => {
    const V: RangoViaje = { desde: '2027-07-01', hasta: '2027-08-01', ventana: ['2027-07-01', '2027-08-01'] }
    expect(diasVuelta(V, '2027-07-21')).toEqual({ desde: '2027-07-21', hasta: '2027-08-01' })
    const vuelta = { fase: 'vuelta' as const, ida: '2027-07-21' }
    expect(['2027-07-01', '2027-07-20'].map(d => diaElegible(V, vuelta, d))).toEqual([false, false])
    expect(['2027-07-21', '2027-07-26', '2027-07-31', '2027-08-01'].map(d => diaElegible(V, vuelta, d))).toEqual([true, true, true, true])
    expect(diaElegible(V, vuelta, '2027-08-02')).toBe(false)
    expect(clicDia(vuelta, '2027-08-01').fechas).toEqual({ ida: '2027-07-21', vuelta: '2027-08-01' })
  })
  it('paso 1: cualquier día de la ventana', () => {
    expect(diaElegible(R, { fase: 'ida' }, '2026-10-20')).toBe(false)
    expect(diaElegible(R, { fase: 'ida' }, '2026-10-21')).toBe(true)
    expect(diaElegible(R, { fase: 'ida' }, '2026-11-07')).toBe(true)
    expect(diaElegible(R, { fase: 'ida' }, '2026-11-08')).toBe(false)
  })
  it('normaliza fechas de la URL', () => {
    expect(normalizarFechas(R, '2026-10-25', '2026-10-27')).toEqual({ ida: '2026-10-25', vuelta: '2026-10-27' })
    expect(normalizarFechas(R)).toEqual({ ida: '2026-10-21', vuelta: '2026-10-22' })
    expect(normalizarFechas(R, '2026-10-01', '2026-10-03')).toEqual({ ida: '2026-10-21', vuelta: '2026-10-22' })
    expect(normalizarFechas(R, '2026-10-22', '2026-10-30')).toEqual({ ida: '2026-10-22', vuelta: '2026-10-30' })
    expect(normalizarFechas(R, '2026-10-30', '2026-10-22')).toEqual({ ida: '2026-10-30', vuelta: '2026-10-31' })
    expect(normalizarFechas(R, '2026-11-07', 'x')).toEqual({ ida: '2026-11-07', vuelta: '2026-11-07' })
  })
  it('fechas iniciales: vacías sin URL, de ida/vuelta o de `dias`', () => {
    expect(fechasIniciales(R)).toBeNull()
    expect(fechasIniciales(R, '2026-10-25', '2026-10-27')).toEqual({ ida: '2026-10-25', vuelta: '2026-10-27' })
    expect(fechasIniciales(R, undefined, undefined, 3)).toEqual({ ida: '2026-10-21', vuelta: '2026-10-23' })
    expect(fechasIniciales(R, undefined, undefined, 9)).toEqual({ ida: '2026-10-21', vuelta: '2026-10-29' })
    expect(fechasIniciales(R, undefined, undefined, 99)).toEqual({ ida: '2026-10-21', vuelta: '2026-11-07' })
    expect(fechasIniciales({ ...R, hasta: '2026-10-22' }, undefined, undefined, 4)).toEqual({ ida: '2026-10-21', vuelta: '2026-10-22' })
  })
  it('semanas del mes empiezan en lunes', () => {
    const s = semanasMes('2026-10') // 1 oct 2026 es jueves
    expect(s[0].slice(0, 4)).toEqual([null, null, null, '2026-10-01'])
    expect(s.flat().filter(Boolean)).toHaveLength(31)
    expect(mesSiguiente('2026-12', 1)).toBe('2027-01'); expect(mesSiguiente('2027-01', -1)).toBe('2026-12')
  })
})

describe('tiempo', () => {
  it('lo habitual promedia las mismas fechas de cada año', () => {
    const arch = [2022, 2023, 2024].map((a, i) => ({ fecha: `${a}-07-05`, tmax: 30 + i, tmin: 15, lluvia: i === 0 ? 2 : 0 }))
    expect(habitual(['2027-07-05', '2027-07-06'], arch)).toEqual([{ tipo: 'habitual', fecha: '2027-07-05', tmax: 31, tmin: 15, aniosLluvia: 1, anios: 3, desde: 2022, hasta: 2024 }])
  })
  it('códigos WMO en palabras', () => {
    expect([0, 2, 3, 45, 53, 63, 81, 73, 95].map(cielo)).toEqual(['Despejado', 'Sol y nubes', 'Nublado', 'Niebla', 'Llovizna', 'Lluvia', 'Lluvia', 'Nieve', 'Tormenta'])
  })
})
