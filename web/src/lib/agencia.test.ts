import { describe, expect, it } from 'vitest'
import { calcularPrecio, elegirAlojamiento, generarRuta, MAX_DIAS, MAX_PERSONAS } from './agencia'
import { AGENCIA } from '../data/agencia'
import { AGENCY_MARGIN } from '../config/agencia'

const DESTINOS = Object.keys(AGENCIA)
const combinaciones = DESTINOS.flatMap(id => Array.from({ length: MAX_DIAS }, (_, i) => i + 1)
  .flatMap(dias => Array.from({ length: MAX_PERSONAS }, (_, j) => [id, dias, j + 1] as const)))

describe('generarRuta', () => {
  it.each(combinaciones)('%s · %i días · %i personas: estructura, noches y comidas', (id, dias, personas) => {
    const r = generarRuta(id, dias, personas)!
    const p = r.itinerario.flatMap(d => d.paradas)
    expect(r.itinerario).toHaveLength(dias)
    expect(r.noches).toBe(dias - 1)
    expect(r.habitaciones).toBe(Math.ceil(personas / 2))
    // Comidas y cenas: 1 día → 1 comida; N días → cena el día 1, comida y cena los intermedios, comida el último
    const comidas = p.filter(x => x.tipo === 'comida').length, cenas = p.filter(x => x.tipo === 'cena').length
    expect(comidas).toBe(dias === 1 ? 1 : dias - 1)
    expect(cenas).toBe(dias - 1)
    expect(p.filter(x => x.tipo === 'actividad').length).toBe(dias === 1 ? 2 : 2 * (dias - 1))
    expect(p.filter(x => x.tipo === 'checkin').length).toBe(dias > 1 ? 1 : 0)
    expect(p.filter(x => x.tipo === 'checkout').length).toBe(dias > 1 ? 1 : 0)
    if (dias === 1) expect(r.alojamiento).toBeNull()
    // Último día sin cena ni noche
    const ultimo = r.itinerario[dias - 1].paradas.map(x => x.tipo)
    expect(ultimo).not.toContain('cena'); expect(ultimo).not.toContain('noche')
  })

  it.each(combinaciones)('%s · %i días · %i personas: sin repetir restaurante ni actividad', (id, dias, personas) => {
    const p = generarRuta(id, dias, personas)!.itinerario.flatMap(d => d.paradas)
    const rest = p.flatMap(x => ('restaurante' in x ? [x.restaurante.id] : []))
    const acts = p.flatMap(x => ('actividad' in x ? [x.actividad.id] : []))
    expect(new Set(rest).size).toBe(rest.length)
    expect(new Set(acts).size).toBe(acts.length)
  })

  it('con los datos actuales, 5 días se cubren sin huecos ni avisos', () => {
    for (const id of DESTINOS) {
      const r = generarRuta(id, 5, 2)!
      expect(r.avisos).toEqual([])
      expect(r.itinerario.flatMap(d => d.paradas).some(p => p.tipo === 'libre')).toBe(false)
    }
  })

  it('es determinista', () => {
    for (const [id, dias, personas] of combinaciones) expect(generarRuta(id, dias, personas)).toEqual(generarRuta(id, dias, personas))
  })

  it('respeta el alojamiento elegido y cae al criterio si no existe', () => {
    const id = 'brihuega', otro = AGENCIA[id].alojamientos[0].id
    expect(generarRuta(id, 3, 2, otro)!.alojamiento!.id).toBe(otro)
    expect(generarRuta(id, 3, 2, 'no-existe')!.alojamiento).toEqual(elegirAlojamiento(AGENCIA[id].alojamientos))
  })

  it('limita días y personas a rangos válidos y devuelve null para un destino sin datos', () => {
    const r = generarRuta('sevilla', 9, 0)!
    expect([r.dias, r.personas]).toEqual([5, 1])
    expect(generarRuta('no-existe', 2, 2)).toBeNull()
  })

  it('el criterio de alojamiento elige la mejor valoración entre los de precio medio o inferior', () => {
    for (const id of DESTINOS) {
      const lista = AGENCIA[id].alojamientos, elegido = elegirAlojamiento(lista)!
      const medio = (l: typeof lista[number]) => (l.precio[0] + l.precio[1]) / 2
      const medios = lista.map(medio).sort((a, b) => a - b), k = (medios.length - 1) / 2
      const mediana = (medios[Math.floor(k)] + medios[Math.ceil(k)]) / 2
      expect(medio(elegido)).toBeLessThanOrEqual(mediana)
      const nota = (l: typeof lista[number]) => l.valoracion!.puntuacion / l.valoracion!.escala
      for (const l of lista.filter(x => medio(x) <= mediana)) expect(nota(elegido)).toBeGreaterThanOrEqual(nota(l))
    }
  })
})

describe('calcularPrecio', () => {
  it.each(combinaciones)('%s · %i días · %i personas: desglose cuadra y redondeo a céntimos', (id, dias, personas) => {
    const r = generarRuta(id, dias, personas)!
    const pr = calcularPrecio(r, personas, AGENCY_MARGIN)
    const suma = pr.lineas.reduce((s, l) => s + l.cent, 0)
    expect(pr.subtotal).toBe(suma)
    expect(pr.margen).toBe(Math.round(pr.subtotal * AGENCY_MARGIN))
    expect(pr.total).toBe(pr.subtotal + pr.margen)
    for (const v of [...pr.lineas.map(l => l.cent), pr.subtotal, pr.margen, pr.total, pr.porPersona]) expect(Number.isInteger(v)).toBe(true)
    expect(Math.abs(pr.porPersona * personas - pr.total)).toBeLessThanOrEqual(Math.ceil(personas / 2))
    // Alojamiento = noches × habitaciones × precio medio por noche
    const aloj = r.alojamiento ? Math.round((r.alojamiento.precio[0] + r.alojamiento.precio[1]) / 2 * 100) : 0
    expect(pr.lineas.find(l => l.id === 'alojamiento')!.cent).toBe(r.noches * Math.ceil(personas / 2) * aloj)
  })

  it('el margen es configurable y 0 deja el total igual al subtotal', () => {
    const r = generarRuta('sevilla', 3, 2)!
    const sin = calcularPrecio(r, 2, 0), con = calcularPrecio(r, 2, 0.2)
    expect(sin.total).toBe(sin.subtotal)
    expect(con.total).toBe(con.subtotal + Math.round(con.subtotal * 0.2))
  })

  it('caso calculado a mano: Brihuega, 2 días, 3 personas, 12 %', () => {
    const r = generarRuta('brihuega', 2, 3)!
    const pr = calcularPrecio(r, 3, 0.12)
    const noche = (r.alojamiento!.precio[0] + r.alojamiento!.precio[1]) / 2
    expect(pr.lineas[0].cent).toBe(1 * 2 * noche * 100) // 1 noche × 2 habitaciones
    expect(pr.total).toBe(pr.subtotal + Math.round(pr.subtotal * 0.12))
  })
})
