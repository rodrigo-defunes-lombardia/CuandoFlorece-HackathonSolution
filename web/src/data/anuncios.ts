/** Datos de la página "Anuncios" (demo del modelo de negocio B2G/B2B).
 *  REAL: nombres de ayuntamientos y locales, su localidad y sus valoraciones (con fuente, URL y fecha de consulta).
 *  FICTICIO: todas las promociones, eventos, fechas y textos promocionales. Ningún negocio ni ayuntamiento los ha publicado. */

export interface Valoracion {
  puntuacion: number; escala: 5 | 10; fuente: 'Booking.com' | 'Google Maps'; url: string; fechaConsulta: string
  opiniones?: number // solo si se ha visto en la fuente
}
export interface AnuncioAyto { titulo: string; fecha: string; descripcion: string }
export interface Local {
  nombre: string; tipo: 'Hotel' | 'Hostal' | 'Hospedería' | 'Casa rural' | 'Apartamentos rurales' | 'Alojamiento rural' | 'Restaurante' | 'Bar de tapas'
  localidad: string; promocion: string; vigencia: string; valoracion: Valoracion | null
}
export interface AnunciosDestino { ayuntamiento: { nombre: string; localidad: string; anuncios: AnuncioAyto[] }; locales: Local[] }

const CONSULTA = '2026-10-21'
const booking = (slug: string, puntuacion: number, opiniones: number): Valoracion =>
  ({ puntuacion, escala: 10, fuente: 'Booking.com', url: `https://www.booking.com/hotel/es/${slug}.es.html`, fechaConsulta: CONSULTA, opiniones })
const gmaps = (consulta: string, puntuacion: number, opiniones: number): Valoracion =>
  ({ puntuacion, escala: 5, fuente: 'Google Maps', url: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(consulta)}`, fechaConsulta: CONSULTA, opiniones })

export const ANUNCIOS: Record<string, AnunciosDestino> = {
  tejera_negra: {
    ayuntamiento: {
      nombre: 'Ayuntamiento de Cantalojas', localidad: 'Cantalojas (Guadalajara)',
      anuncios: [
        { titulo: 'Paseos guiados de otoño por el hayedo', fecha: 'Fines de semana, finales de octubre – mediados de noviembre de 2026',
          descripcion: 'Salidas a pie con guía local para conocer el cambio de color de las hayas. Grupos reducidos y reserva previa.' },
        { titulo: 'Jornada de setas y producto de la sierra', fecha: 'Un sábado de noviembre de 2026',
          descripcion: 'Charla sobre recogida responsable de setas y pequeña muestra de productos de la Sierra de Ayllón.' },
        { titulo: 'Punto de información municipal en horario de otoño', fecha: 'Octubre – noviembre de 2026',
          descripcion: 'Información sobre rutas, aparcamiento y servicios del pueblo durante la temporada de color.' },
      ],
    },
    locales: [
      { nombre: 'La Ventana de Tejera Negra', tipo: 'Alojamiento rural', localidad: 'Cantalojas', promocion: '10 % en estancias de 2 noches durante la temporada de color', vigencia: 'Hasta el 30 de noviembre de 2026', valoracion: booking('la-ventana-de-tejera-negra', 9.2, 233) },
      { nombre: 'Apartamentos Rurales El Casarejo', tipo: 'Apartamentos rurales', localidad: 'Cantalojas', promocion: 'Salida tardía gratis el domingo en estancias de fin de semana', vigencia: 'Fines de semana de octubre y noviembre de 2026', valoracion: booking('alojamientos-rurales-el-casarejo', 9.7, 124) },
      { nombre: 'Casa Rural Castillo Diempures', tipo: 'Casa rural', localidad: 'Cantalojas', promocion: '15 % reservando la casa completa entre semana', vigencia: 'Del 20 de octubre al 20 de noviembre de 2026', valoracion: booking('casa-rural-castillo-diempures', 9.6, 19) },
      { nombre: 'La Casa de los Gatos', tipo: 'Alojamiento rural', localidad: 'Condemios de Abajo', promocion: 'Desayuno incluido en estancias de 3 noches', vigencia: 'Temporada de otoño de 2026', valoracion: booking('la-casa-de-los-gatos', 9.1, 298) },
      { nombre: 'Hotel Rural Grado del Pico', tipo: 'Hotel', localidad: 'Grado del Pico (Segovia)', promocion: '10 % para quien muestre la ficha de Tejera Negra al llegar', vigencia: 'Hasta el 15 de noviembre de 2026', valoracion: booking('rural-la-posada', 7.9, 134) },
      { nombre: 'Molino de la Ferrería', tipo: 'Alojamiento rural', localidad: 'Villacorta (Segovia)', promocion: 'Segunda noche con un 20 % de descuento', vigencia: 'Del 25 de octubre al 30 de noviembre de 2026', valoracion: booking('molino-de-la-ferreria', 9.3, 177) },
      { nombre: 'Bar La Plaza', tipo: 'Restaurante', localidad: 'Cantalojas', promocion: 'Menú de otoño con postre casero incluido', vigencia: 'Fines de semana de octubre y noviembre de 2026', valoracion: gmaps('Bar La Plaza Cantalojas', 4.7, 449) },
      { nombre: 'Hostal Mirador el Hayedo', tipo: 'Restaurante', localidad: 'Cantalojas', promocion: 'Café o infusión gratis con la comida al volver de la ruta', vigencia: 'Temporada de otoño de 2026', valoracion: gmaps('Hostal Mirador el Hayedo Cantalojas', 3.7, 894) },
    ],
  },
  brihuega: {
    ayuntamiento: {
      nombre: 'Ayuntamiento de Brihuega', localidad: 'Brihuega (Guadalajara)',
      anuncios: [
        { titulo: 'Paseos al atardecer entre los campos', fecha: 'Primera quincena de julio de 2027',
          descripcion: 'Rutas guiadas por caminos agrícolas con indicaciones para disfrutar de la lavanda sin entrar en las parcelas.' },
        { titulo: 'Mercado de productos de la Alcarria', fecha: 'Un fin de semana de julio de 2027',
          descripcion: 'Puestos de miel, aceites esenciales y artesanía local en el casco histórico.' },
        { titulo: 'Monumentos en horario de verano', fecha: 'Julio de 2027',
          descripcion: 'Horario ampliado de visitas al patrimonio del pueblo durante la temporada de floración.' },
      ],
    },
    locales: [
      { nombre: 'Castilla Termal Brihuega', tipo: 'Hotel', localidad: 'Brihuega', promocion: '10 % en estancias de 2 noches en temporada de floración', vigencia: 'Del 25 de junio al 20 de julio de 2027', valoracion: booking('castilla-termal-brihuega', 9.3, 1774) },
      { nombre: 'Hostal Restaurante Villa de Brihuega', tipo: 'Hostal', localidad: 'Brihuega', promocion: 'Cena de temporada incluida en estancias de 2 noches', vigencia: 'Julio de 2027', valoracion: booking('hostal-restaurante-villa-de-brihuega', 8.9, 990) },
      { nombre: 'Hospedería Princesa Elima', tipo: 'Hospedería', localidad: 'Brihuega', promocion: 'Desayuno incluido reservando entre semana', vigencia: 'Del 28 de junio al 16 de julio de 2027', valoracion: booking('hospederia-princesa-elima', 8.6, 348) },
      { nombre: 'Apartamentos Tierra de Lavanda', tipo: 'Apartamentos rurales', localidad: 'Brihuega', promocion: '15 % para grupos de 4 o más personas', vigencia: 'Julio de 2027', valoracion: booking('apartamentos-tierra-de-lavanda', 8.8, 304) },
      { nombre: 'Apartamentos Rurales Flor de Lavanda', tipo: 'Apartamentos rurales', localidad: 'Brihuega', promocion: 'Salida tardía gratis para ver el atardecer en los campos', vigencia: 'Temporada de lavanda de 2027', valoracion: booking('apartamentos-rurales-flor-de-lavanda', 8.9, 184) },
      { nombre: 'El Capricho de Brihuega', tipo: 'Alojamiento rural', localidad: 'Brihuega', promocion: 'Tercera noche con un 25 % de descuento', vigencia: 'Del 1 al 20 de julio de 2027', valoracion: booking('el-capricho-de-brihuega', 8.6, 137) },
      { nombre: 'Restaurante La Muralla de Brihuega', tipo: 'Restaurante', localidad: 'Brihuega', promocion: 'Menú de temporada con postre de lavanda', vigencia: 'Julio de 2027', valoracion: gmaps('Restaurante La Muralla de Brihuega', 4.0, 397) },
      { nombre: 'Asador El Tolmo', tipo: 'Restaurante', localidad: 'Brihuega', promocion: '10 % en la cuenta mostrando la ficha de Brihuega', vigencia: 'Del 1 al 31 de julio de 2027', valoracion: gmaps('Asador El Tolmo Brihuega', 3.8, 2408) },
    ],
  },
  sevilla: {
    ayuntamiento: {
      nombre: 'Ayuntamiento de Sevilla', localidad: 'Sevilla',
      anuncios: [
        { titulo: 'Ruta del azahar por el casco antiguo', fecha: 'Mediados de marzo – mediados de abril de 2027',
          descripcion: 'Itinerario señalizado por calles y plazas con naranjos en flor, con mapa descargable.' },
        { titulo: 'Visitas guiadas a jardines históricos', fecha: 'Fines de semana de marzo y abril de 2027',
          descripcion: 'Recorridos con guía por jardines y patios con naranjos, en grupos reducidos.' },
        { titulo: 'Taller de agua de azahar', fecha: 'Un sábado de finales de marzo de 2027',
          descripcion: 'Taller familiar sobre los usos tradicionales de la flor del naranjo amargo.' },
      ],
    },
    locales: [
      { nombre: 'Hotel Doña María', tipo: 'Hotel', localidad: 'Sevilla (centro histórico)', promocion: '10 % en estancias de 2 noches durante la floración del azahar', vigencia: 'Del 10 de marzo al 15 de abril de 2027', valoracion: booking('donamariasevilla', 9.0, 3846) },
      { nombre: 'Hotel Las Casas de la Judería', tipo: 'Hotel', localidad: 'Sevilla (centro histórico)', promocion: 'Desayuno incluido en estancias de 3 noches', vigencia: 'Marzo y abril de 2027', valoracion: booking('hotel-las-casas-de-la-juderia', 9.0, 5925) },
      { nombre: 'Un Patio en Santa Cruz', tipo: 'Hotel', localidad: 'Sevilla (centro histórico)', promocion: '15 % reservando entre semana', vigencia: 'Del 1 de marzo al 10 de abril de 2027', valoracion: booking('un-patio-en-santa-cruz', 8.5, 1560) },
      { nombre: 'Hotel Murillo', tipo: 'Hotel', localidad: 'Sevilla (centro histórico)', promocion: 'Salida tardía gratis en temporada de azahar', vigencia: 'Del 15 de marzo al 15 de abril de 2027', valoracion: booking('murillo', 8.5, 4017) },
      { nombre: 'Hotel Doña Lina', tipo: 'Hotel', localidad: 'Sevilla (centro histórico)', promocion: 'Tercera noche con un 20 % de descuento', vigencia: 'Marzo de 2027', valoracion: booking('la-hosteraa-de-doa-a-lina', 8.8, 961) },
      { nombre: 'Bodega Santa Cruz Las Columnas', tipo: 'Bar de tapas', localidad: 'Sevilla (casco antiguo)', promocion: 'Tapa de temporada gratis con la segunda consumición', vigencia: 'Del 15 de marzo al 15 de abril de 2027', valoracion: gmaps('Bodega Santa Cruz Las Columnas Sevilla', 4.4, 16363) },
      { nombre: 'Las Teresas', tipo: 'Restaurante', localidad: 'Sevilla (casco antiguo)', promocion: 'Postre de azahar incluido con el menú', vigencia: 'Marzo y abril de 2027', valoracion: gmaps('Las Teresas Sevilla', 3.9, 6668) },
      { nombre: 'Casa Plácido', tipo: 'Bar de tapas', localidad: 'Sevilla (casco antiguo)', promocion: '10 % en la cuenta mostrando la ficha del azahar', vigencia: 'Marzo de 2027', valoracion: gmaps('Casa Plácido Sevilla', 3.8, 1156) },
    ],
  },
}

export const esAlojamiento = (l: Local) => l.tipo !== 'Restaurante' && l.tipo !== 'Bar de tapas'

/** Enlaces externos de una tarjeta: el principal y el secundario, según el tipo de negocio. */
export function enlacesDe(l: Local) {
  const q = encodeURIComponent(`${l.nombre} ${l.localidad.replace(/\s*\(.*\)/, '')}`)
  const maps = { texto: 'Ver en Google Maps', url: `https://www.google.com/maps/search/?api=1&query=${q}` }
  return esAlojamiento(l)
    ? { principal: { texto: 'Ver en Booking', url: `https://www.booking.com/searchresults.html?ss=${q}` }, secundario: maps }
    : { principal: maps, secundario: { texto: 'Ver en TripAdvisor', url: `https://www.tripadvisor.es/Search?q=${q}` } }
}

/** Valoración convertida a 5 estrellas (sin redondear a medias para no falsear: relleno parcial). */
export const aCinco = (v: Valoracion) => Math.round((v.puntuacion / v.escala) * 5 * 100) / 100
