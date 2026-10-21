/** Lógica de la página "Agencia": funciones puras y deterministas (mismos parámetros → misma ruta y mismo precio). */
import { AGENCIA, type Actividad, type Momento, type Rango } from '../data/agencia'
import { aCinco, type Local } from '../data/locales'

export const MAX_DIAS = 5
export const MAX_PERSONAS = 6

export type LocalConPrecio = Local & { precio: Rango }
export type Parada =
  | { tipo: 'checkin' | 'checkout' | 'noche'; hora: string; alojamiento: LocalConPrecio }
  | { tipo: 'actividad'; hora: string; momento: 'mañana' | 'tarde'; actividad: Actividad }
  | { tipo: 'comida' | 'cena'; hora: string; restaurante: LocalConPrecio }
  | { tipo: 'libre'; hora: string; texto: string }
export interface Dia { n: number; paradas: Parada[] }
export interface Ruta {
  destinoId: string; dias: number; personas: number; noches: number; habitaciones: number
  alojamiento: LocalConPrecio | null; alojamientos: LocalConPrecio[]; criterioAlojamiento: string
  itinerario: Dia[]; avisos: string[]
}

const medio = (r: Rango) => (r[0] + r[1]) / 2
const nota = (l: Local) => (l.valoracion ? aCinco(l.valoracion) : -1)
const opiniones = (l: Local) => l.valoracion?.opiniones ?? 0
const porValoracion = (a: Local, b: Local) => nota(b) - nota(a) || opiniones(b) - opiniones(a) || a.id.localeCompare(b.id)

export const CRITERIO_ALOJAMIENTO =
  'Mejor valoración verificada (convertida a 5) entre los alojamientos de precio medio o inferior del destino; si empatan, el que tiene más opiniones.'

/** Alojamiento por defecto: el de mejor valoración verificada cuyo precio medio no supera la mediana del destino. */
export function elegirAlojamiento(lista: LocalConPrecio[]): LocalConPrecio | null {
  const conNota = lista.filter(l => l.valoracion)
  if (!conNota.length) return null
  const medios = conNota.map(l => medio(l.precio)).sort((a, b) => a - b)
  const k = (medios.length - 1) / 2, mediana = (medios[Math.floor(k)] + medios[Math.ceil(k)]) / 2
  return [...conNota.filter(l => medio(l.precio) <= mediana)].sort(porValoracion)[0]
}

/** Plantilla de cada día: qué franjas tiene y a qué hora (aproximada). */
type Franja = { tipo: 'checkin' | 'checkout' | 'noche' | 'comida' | 'cena'; hora: string } | { tipo: 'actividad'; hora: string; momento: 'mañana' | 'tarde' }
function plantilla(n: number, dias: number): Franja[] {
  const man = { tipo: 'actividad', hora: '10:00', momento: 'mañana' } as const, tar = { tipo: 'actividad', hora: '17:00', momento: 'tarde' } as const
  const comida = { tipo: 'comida', hora: '14:00' } as const, cena = { tipo: 'cena', hora: '21:00' } as const
  if (dias === 1) return [man, comida, tar]
  if (n === 1) return [{ tipo: 'checkin', hora: '13:00' }, tar, cena]
  if (n === dias) return [{ tipo: 'checkout', hora: '10:00' }, { ...man, hora: '11:00' }, comida]
  return [man, comida, tar, cena, { tipo: 'noche', hora: '23:00' }]
}

const limitar = (x: number, max: number) => Math.min(max, Math.max(1, Math.round(Number.isFinite(x) ? x : 1)))

export function generarRuta(destinoId: string, diasIn: number, personasIn: number, alojamientoId?: string): Ruta | null {
  const datos = AGENCIA[destinoId]
  if (!datos) return null
  const dias = limitar(diasIn, MAX_DIAS), personas = limitar(personasIn, MAX_PERSONAS)
  const noches = dias - 1, habitaciones = Math.ceil(personas / 2)
  const avisos: string[] = []
  const alojamiento = noches === 0 ? null
    : datos.alojamientos.find(a => a.id === alojamientoId) ?? elegirAlojamiento(datos.alojamientos)
  if (noches > 0 && !alojamiento) avisos.push('No hay alojamientos con valoración verificada en este destino.')

  const restaurantes = [...datos.restaurantes].sort(porValoracion)
  const usadas = new Set<string>()
  let r = 0
  const tomarActividad = (m: Momento) =>
    datos.actividades.find(a => !usadas.has(a.id) && a.momento === m) ?? datos.actividades.find(a => !usadas.has(a.id) && a.momento === 'cualquiera')
    ?? datos.actividades.find(a => !usadas.has(a.id))

  const itinerario: Dia[] = []
  for (let n = 1; n <= dias; n++) {
    const paradas: Parada[] = []
    for (const f of plantilla(n, dias)) {
      if (f.tipo === 'actividad') {
        const a = tomarActividad(f.momento)
        if (a) { usadas.add(a.id); paradas.push({ tipo: 'actividad', hora: f.hora, momento: f.momento, actividad: a }) }
        else { paradas.push({ tipo: 'libre', hora: f.hora, texto: 'Tiempo libre' }); avisos.push(`Día ${n}: no quedan actividades verificadas sin repetir; dejamos tiempo libre.`) }
      } else if (f.tipo === 'comida' || f.tipo === 'cena') {
        const rest = restaurantes[r++]
        if (rest) paradas.push({ tipo: f.tipo, hora: f.hora, restaurante: rest })
        else { paradas.push({ tipo: 'libre', hora: f.hora, texto: f.tipo === 'comida' ? 'Comida libre' : 'Cena libre' }); avisos.push(`Día ${n}: no quedan restaurantes verificados sin repetir para la ${f.tipo}.`) }
      } else if (alojamiento) {
        paradas.push({ tipo: f.tipo, hora: f.hora, alojamiento })
      }
    }
    itinerario.push({ n, paradas })
  }
  return { destinoId, dias, personas, noches, habitaciones, alojamiento, alojamientos: datos.alojamientos, criterioAlojamiento: CRITERIO_ALOJAMIENTO, itinerario, avisos }
}

export interface LineaPrecio { id: 'alojamiento' | 'actividades' | 'comidas'; concepto: string; detalle: string; cent: number }
export interface Precio { lineas: LineaPrecio[]; subtotal: number; margen: number; margenPct: number; total: number; porPersona: number }

/** Todo en céntimos enteros: el desglose suma exactamente el total. Precio de un rango = su punto medio. */
export function calcularPrecio(ruta: Ruta, personas: number, margen: number): Precio {
  const cent = (euros: number) => Math.round(euros * 100)
  const paradas = ruta.itinerario.flatMap(d => d.paradas)
  const precioNoche = ruta.alojamiento ? cent(medio(ruta.alojamiento.precio)) : 0
  const aloj = ruta.noches * ruta.habitaciones * precioNoche
  const acts = paradas.reduce((s, p) => s + (p.tipo === 'actividad' ? cent(p.actividad.precioPP) * personas : 0), 0)
  const comidas = paradas.filter(p => p.tipo === 'comida' || p.tipo === 'cena')
  const mesa = comidas.reduce((s, p) => s + ('restaurante' in p ? cent(medio(p.restaurante.precio)) * personas : 0), 0)
  const lineas: LineaPrecio[] = [
    { id: 'alojamiento', concepto: 'Alojamiento', cent: aloj,
      detalle: ruta.alojamiento ? `${ruta.noches} ${ruta.noches === 1 ? 'noche' : 'noches'} × ${ruta.habitaciones} ${ruta.habitaciones === 1 ? 'habitación' : 'habitaciones'} × ${(precioNoche / 100).toLocaleString('es-ES')} €` : 'Sin noches' },
    { id: 'actividades', concepto: 'Actividades', cent: acts, detalle: `${paradas.filter(p => p.tipo === 'actividad').length} actividades × ${personas} ${personas === 1 ? 'persona' : 'personas'}` },
    { id: 'comidas', concepto: 'Comidas y cenas', cent: mesa, detalle: `${comidas.length} ${comidas.length === 1 ? 'comida' : 'comidas'} × ${personas} ${personas === 1 ? 'persona' : 'personas'}` },
  ]
  const subtotal = aloj + acts + mesa
  const m = Math.round(subtotal * margen)
  const total = subtotal + m
  return { lineas, subtotal, margen: m, margenPct: margen, total, porPersona: Math.round(total / personas) }
}

export const euros = (cent: number) => (cent / 100).toLocaleString('es-ES', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 })
