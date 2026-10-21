/** Datos de la página "Anuncios" (demo del modelo de negocio B2G/B2B).
 *  REAL (en locales.ts): ayuntamientos, locales, su localidad y sus valoraciones con fuente.
 *  FICTICIO (aquí): todas las promociones, eventos, fechas y textos promocionales. Ningún negocio ni ayuntamiento los ha publicado. */
import { ALOJAMIENTOS, AYUNTAMIENTOS, RESTAURANTES, esAlojamiento, urlBooking, urlMaps, urlTripadvisor, type Local } from './locales'
export { aCinco, esAlojamiento, type Valoracion } from './locales'

export interface AnuncioAyto { titulo: string; fecha: string; descripcion: string }
export interface LocalAnunciado extends Local { promocion: string; vigencia: string }
export interface AnunciosDestino { ayuntamiento: { nombre: string; localidad: string; anuncios: AnuncioAyto[] }; locales: LocalAnunciado[] }

type Promo = [idLocal: string, promocion: string, vigencia: string]
const FICTICIO: Record<string, { anuncios: AnuncioAyto[]; promos: Promo[] }> = {
  tejera_negra: {
    anuncios: [
      { titulo: 'Paseos guiados de otoño por el hayedo', fecha: 'Fines de semana, finales de octubre – mediados de noviembre de 2026',
        descripcion: 'Salidas a pie con guía local para conocer el cambio de color de las hayas. Grupos reducidos y reserva previa.' },
      { titulo: 'Jornada de setas y producto de la sierra', fecha: 'Un sábado de noviembre de 2026',
        descripcion: 'Charla sobre recogida responsable de setas y pequeña muestra de productos de la Sierra de Ayllón.' },
      { titulo: 'Punto de información municipal en horario de otoño', fecha: 'Octubre – noviembre de 2026',
        descripcion: 'Información sobre rutas, aparcamiento y servicios del pueblo durante la temporada de color.' },
    ],
    promos: [
      ['ventana-tejera', '10 % en estancias de 2 noches durante la temporada de color', 'Hasta el 30 de noviembre de 2026'],
      ['el-casarejo', 'Salida tardía gratis el domingo en estancias de fin de semana', 'Fines de semana de octubre y noviembre de 2026'],
      ['castillo-diempures', '15 % reservando la casa completa entre semana', 'Del 20 de octubre al 20 de noviembre de 2026'],
      ['casa-gatos', 'Desayuno incluido en estancias de 3 noches', 'Temporada de otoño de 2026'],
      ['grado-del-pico', '10 % para quien muestre la ficha de Tejera Negra al llegar', 'Hasta el 15 de noviembre de 2026'],
      ['molino-ferreria', 'Segunda noche con un 20 % de descuento', 'Del 25 de octubre al 30 de noviembre de 2026'],
      ['bar-la-plaza', 'Menú de otoño con postre casero incluido', 'Fines de semana de octubre y noviembre de 2026'],
      ['mirador-hayedo', 'Café o infusión gratis con la comida al volver de la ruta', 'Temporada de otoño de 2026'],
    ],
  },
  brihuega: {
    anuncios: [
      { titulo: 'Paseos al atardecer entre los campos', fecha: 'Primera quincena de julio de 2027',
        descripcion: 'Rutas guiadas por caminos agrícolas con indicaciones para disfrutar de la lavanda sin entrar en las parcelas.' },
      { titulo: 'Mercado de productos de la Alcarria', fecha: 'Un fin de semana de julio de 2027',
        descripcion: 'Puestos de miel, aceites esenciales y artesanía local en el casco histórico.' },
      { titulo: 'Monumentos en horario de verano', fecha: 'Julio de 2027',
        descripcion: 'Horario ampliado de visitas al patrimonio del pueblo durante la temporada de floración.' },
    ],
    promos: [
      ['castilla-termal', '10 % en estancias de 2 noches en temporada de floración', 'Del 25 de junio al 20 de julio de 2027'],
      ['villa-brihuega', 'Cena de temporada incluida en estancias de 2 noches', 'Julio de 2027'],
      ['princesa-elima', 'Desayuno incluido reservando entre semana', 'Del 28 de junio al 16 de julio de 2027'],
      ['tierra-lavanda', '15 % para grupos de 4 o más personas', 'Julio de 2027'],
      ['flor-lavanda', 'Salida tardía gratis para ver el atardecer en los campos', 'Temporada de lavanda de 2027'],
      ['capricho-brihuega', 'Tercera noche con un 25 % de descuento', 'Del 1 al 20 de julio de 2027'],
      ['la-muralla', 'Menú de temporada con postre de lavanda', 'Julio de 2027'],
      ['el-tolmo', '10 % en la cuenta mostrando la ficha de Brihuega', 'Del 1 al 31 de julio de 2027'],
    ],
  },
  sevilla: {
    anuncios: [
      { titulo: 'Ruta del azahar por el casco antiguo', fecha: 'Mediados de marzo – mediados de abril de 2027',
        descripcion: 'Itinerario señalizado por calles y plazas con naranjos en flor, con mapa descargable.' },
      { titulo: 'Visitas guiadas a jardines históricos', fecha: 'Fines de semana de marzo y abril de 2027',
        descripcion: 'Recorridos con guía por jardines y patios con naranjos, en grupos reducidos.' },
      { titulo: 'Taller de agua de azahar', fecha: 'Un sábado de finales de marzo de 2027',
        descripcion: 'Taller familiar sobre los usos tradicionales de la flor del naranjo amargo.' },
    ],
    promos: [
      ['dona-maria', '10 % en estancias de 2 noches durante la floración del azahar', 'Del 10 de marzo al 15 de abril de 2027'],
      ['casas-juderia', 'Desayuno incluido en estancias de 3 noches', 'Marzo y abril de 2027'],
      ['patio-santa-cruz', '15 % reservando entre semana', 'Del 1 de marzo al 10 de abril de 2027'],
      ['murillo', 'Salida tardía gratis en temporada de azahar', 'Del 15 de marzo al 15 de abril de 2027'],
      ['dona-lina', 'Tercera noche con un 20 % de descuento', 'Marzo de 2027'],
      ['las-columnas', 'Tapa de temporada gratis con la segunda consumición', 'Del 15 de marzo al 15 de abril de 2027'],
      ['las-teresas', 'Postre de azahar incluido con el menú', 'Marzo y abril de 2027'],
      ['casa-placido', '10 % en la cuenta mostrando la ficha del azahar', 'Marzo de 2027'],
    ],
  },
}

export const ANUNCIOS: Record<string, AnunciosDestino> = Object.fromEntries(Object.entries(FICTICIO).map(([id, f]) => {
  const todos = [...(ALOJAMIENTOS[id] ?? []), ...(RESTAURANTES[id] ?? [])]
  const locales = f.promos.flatMap(([idLocal, promocion, vigencia]) => {
    const l = todos.find(x => x.id === idLocal)
    return l ? [{ ...l, promocion, vigencia }] : []
  })
  return [id, { ayuntamiento: { ...AYUNTAMIENTOS[id], anuncios: f.anuncios }, locales }]
}))

/** Enlaces externos de una tarjeta: el principal y el secundario, según el tipo de negocio. */
export function enlacesDe(l: Local) {
  const maps = { texto: 'Ver en Google Maps', url: urlMaps(l) }
  return esAlojamiento(l)
    ? { principal: { texto: 'Ver en Booking', url: urlBooking(l) }, secundario: maps }
    : { principal: maps, secundario: { texto: 'Ver en TripAdvisor', url: urlTripadvisor(l) } }
}
