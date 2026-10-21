/** Locales y ayuntamientos REALES de cada destino, compartidos por /anuncios y /agencia.
 *  Solo datos verificados: nombre, tipo, localidad (de la dirección que muestra la fuente) y valoración con fuente,
 *  URL y fecha de consulta. Nada de teléfonos, direcciones exactas ni textos de reseñas.
 *  Consulta: Booking.com (alojamientos) y Google Maps (restaurantes), 21/10/2026. */

export interface Valoracion {
  puntuacion: number; escala: 5 | 10; fuente: 'Booking.com' | 'Google Maps'; url: string; fechaConsulta: string
  opiniones?: number // solo si se ha visto en la fuente
}
export type TipoAlojamiento = 'Hotel' | 'Hostal' | 'Hospedería' | 'Casa rural' | 'Apartamentos rurales' | 'Alojamiento rural'
export type TipoRestaurante = 'Restaurante' | 'Bar de tapas'
export interface Local {
  id: string; nombre: string; localidad: string; descripcion: string; valoracion: Valoracion | null
  tipo: TipoAlojamiento | TipoRestaurante
  cocina?: string // categoría tal como la da Google Maps; sin dato, se omite
}

const CONSULTA = '2026-10-21'
const booking = (slug: string, puntuacion: number, opiniones: number): Valoracion =>
  ({ puntuacion, escala: 10, fuente: 'Booking.com', url: `https://www.booking.com/hotel/es/${slug}.es.html`, fechaConsulta: CONSULTA, opiniones })
const gmaps = (consulta: string, puntuacion: number, opiniones: number): Valoracion =>
  ({ puntuacion, escala: 5, fuente: 'Google Maps', url: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(consulta)}`, fechaConsulta: CONSULTA, opiniones })

export const AYUNTAMIENTOS: Record<string, { nombre: string; localidad: string }> = {
  tejera_negra: { nombre: 'Ayuntamiento de Cantalojas', localidad: 'Cantalojas (Guadalajara)' },
  brihuega: { nombre: 'Ayuntamiento de Brihuega', localidad: 'Brihuega (Guadalajara)' },
  sevilla: { nombre: 'Ayuntamiento de Sevilla', localidad: 'Sevilla' },
}

export const ALOJAMIENTOS: Record<string, Local[]> = {
  tejera_negra: [
    { id: 'ventana-tejera', nombre: 'La Ventana de Tejera Negra', tipo: 'Alojamiento rural', localidad: 'Cantalojas', descripcion: 'Alojamiento en Cantalojas, el pueblo desde el que se accede al hayedo.', valoracion: booking('la-ventana-de-tejera-negra', 9.2, 233) },
    { id: 'el-casarejo', nombre: 'Apartamentos Rurales El Casarejo', tipo: 'Apartamentos rurales', localidad: 'Cantalojas', descripcion: 'Apartamentos rurales en Cantalojas, a la entrada del parque natural.', valoracion: booking('alojamientos-rurales-el-casarejo', 9.7, 124) },
    { id: 'castillo-diempures', nombre: 'Casa Rural Castillo Diempures', tipo: 'Casa rural', localidad: 'Cantalojas', descripcion: 'Casa rural en Cantalojas.', valoracion: booking('casa-rural-castillo-diempures', 9.6, 19) },
    { id: 'casa-gatos', nombre: 'La Casa de los Gatos', tipo: 'Alojamiento rural', localidad: 'Condemios de Abajo', descripcion: 'Alojamiento en Condemios de Abajo, pueblo vecino de Cantalojas.', valoracion: booking('la-casa-de-los-gatos', 9.1, 298) },
    { id: 'grado-del-pico', nombre: 'Hotel Rural Grado del Pico', tipo: 'Hotel', localidad: 'Grado del Pico (Segovia)', descripcion: 'Hotel rural en la vertiente segoviana de la Sierra de Ayllón.', valoracion: booking('rural-la-posada', 7.9, 134) },
    { id: 'molino-ferreria', nombre: 'Molino de la Ferrería', tipo: 'Alojamiento rural', localidad: 'Villacorta (Segovia)', descripcion: 'Alojamiento en Villacorta, en la vertiente segoviana de la sierra.', valoracion: booking('molino-de-la-ferreria', 9.3, 177) },
  ],
  brihuega: [
    { id: 'castilla-termal', nombre: 'Castilla Termal Brihuega', tipo: 'Hotel', localidad: 'Brihuega', descripcion: 'Hotel en el edificio de la antigua Real Fábrica de Paños.', valoracion: booking('castilla-termal-brihuega', 9.3, 1774) },
    { id: 'villa-brihuega', nombre: 'Hostal Restaurante Villa de Brihuega', tipo: 'Hostal', localidad: 'Brihuega', descripcion: 'Hostal con restaurante en el casco urbano.', valoracion: booking('hostal-restaurante-villa-de-brihuega', 8.9, 990) },
    { id: 'princesa-elima', nombre: 'Hospedería Princesa Elima', tipo: 'Hospedería', localidad: 'Brihuega', descripcion: 'Hospedería en Brihuega.', valoracion: booking('hospederia-princesa-elima', 8.6, 348) },
    { id: 'tierra-lavanda', nombre: 'Apartamentos Tierra de Lavanda', tipo: 'Apartamentos rurales', localidad: 'Brihuega', descripcion: 'Apartamentos en Brihuega.', valoracion: booking('apartamentos-tierra-de-lavanda', 8.8, 304) },
    { id: 'flor-lavanda', nombre: 'Apartamentos Rurales Flor de Lavanda', tipo: 'Apartamentos rurales', localidad: 'Brihuega', descripcion: 'Apartamentos rurales en Brihuega.', valoracion: booking('apartamentos-rurales-flor-de-lavanda', 8.9, 184) },
    { id: 'capricho-brihuega', nombre: 'El Capricho de Brihuega', tipo: 'Alojamiento rural', localidad: 'Brihuega', descripcion: 'Alojamiento en Brihuega.', valoracion: booking('el-capricho-de-brihuega', 8.6, 137) },
  ],
  sevilla: [
    { id: 'dona-maria', nombre: 'Hotel Doña María', tipo: 'Hotel', localidad: 'Sevilla (centro histórico)', descripcion: 'Hotel en el centro histórico.', valoracion: booking('donamariasevilla', 9.0, 3846) },
    { id: 'casas-juderia', nombre: 'Hotel Las Casas de la Judería', tipo: 'Hotel', localidad: 'Sevilla (centro histórico)', descripcion: 'Hotel en el centro histórico.', valoracion: booking('hotel-las-casas-de-la-juderia', 9.0, 5925) },
    { id: 'patio-santa-cruz', nombre: 'Un Patio en Santa Cruz', tipo: 'Hotel', localidad: 'Sevilla (centro histórico)', descripcion: 'Hotel en el centro histórico.', valoracion: booking('un-patio-en-santa-cruz', 8.5, 1560) },
    { id: 'murillo', nombre: 'Hotel Murillo', tipo: 'Hotel', localidad: 'Sevilla (centro histórico)', descripcion: 'Hotel en el centro histórico.', valoracion: booking('murillo', 8.5, 4017) },
    { id: 'dona-lina', nombre: 'Hotel Doña Lina', tipo: 'Hotel', localidad: 'Sevilla (centro histórico)', descripcion: 'Hotel en el centro histórico.', valoracion: booking('la-hosteraa-de-doa-a-lina', 8.8, 961) },
  ],
}

export const RESTAURANTES: Record<string, Local[]> = {
  tejera_negra: [
    { id: 'bar-la-plaza', nombre: 'Bar La Plaza', tipo: 'Restaurante', cocina: 'Restaurante', localidad: 'Cantalojas', descripcion: 'Bar restaurante en el centro de Cantalojas.', valoracion: gmaps('Bar La Plaza Cantalojas', 4.7, 449) },
    { id: 'mirador-hayedo', nombre: 'Hostal Mirador el Hayedo', tipo: 'Restaurante', cocina: 'Bar restaurante', localidad: 'Cantalojas', descripcion: 'Hostal con bar restaurante en Cantalojas.', valoracion: gmaps('Hostal Mirador el Hayedo Cantalojas', 3.7, 894) },
    { id: 'los-bonales', nombre: 'Restaurante Camping los Bonales', tipo: 'Restaurante', cocina: 'Restaurante', localidad: 'Cantalojas', descripcion: 'Restaurante del camping de Cantalojas.', valoracion: gmaps('Restaurante Camping los Bonales Cantalojas', 4.4, 44) },
    { id: 'la-sierra', nombre: 'Bar Restaurante La Sierra', tipo: 'Restaurante', cocina: 'Restaurante', localidad: 'Condemios de Arriba', descripcion: 'Bar restaurante en Condemios de Arriba.', valoracion: gmaps('Bar Restaurante La Sierra Condemios de Arriba', 4.5, 274) },
    { id: 'el-parral', nombre: 'Restaurante El Parral de Ayllón', tipo: 'Restaurante', cocina: 'Restaurante de cocina castellana', localidad: 'Ayllón (Segovia)', descripcion: 'Restaurante en la villa medieval de Ayllón.', valoracion: gmaps('Restaurante El Parral de Ayllón', 4.7, 877) },
    { id: 'meson-mica', nombre: 'El Mesón de Mica', tipo: 'Restaurante', cocina: 'Restaurante familiar', localidad: 'Ayllón (Segovia)', descripcion: 'Mesón en Ayllón.', valoracion: gmaps('El Mesón de Mica Ayllón', 4.6, 118) },
    { id: 'tasca-villacorta', nombre: 'La Tasca de Villacorta', tipo: 'Restaurante', cocina: 'Restaurante', localidad: 'Villacorta (Segovia)', descripcion: 'Restaurante en Villacorta.', valoracion: gmaps('La Tasca de Villacorta', 4.2, 217) },
    { id: 'meson-jabali', nombre: 'Mesón Jabalí', tipo: 'Restaurante', cocina: 'Restaurante de cocina española', localidad: 'Majaelrayo', descripcion: 'Mesón en Majaelrayo, uno de los pueblos de arquitectura negra.', valoracion: gmaps('Mesón Jabalí Majaelrayo', 4.4, 1497) },
  ],
  brihuega: [
    { id: 'la-muralla', nombre: 'Restaurante La Muralla de Brihuega', tipo: 'Restaurante', cocina: 'Restaurante', localidad: 'Brihuega', descripcion: 'Restaurante en Brihuega.', valoracion: gmaps('Restaurante La Muralla de Brihuega', 4.0, 397) },
    { id: 'el-tolmo', nombre: 'Asador El Tolmo', tipo: 'Restaurante', cocina: 'Restaurante', localidad: 'Brihuega', descripcion: 'Asador en Brihuega.', valoracion: gmaps('Asador El Tolmo Brihuega', 3.8, 2408) },
    { id: 'pena-bermeja', nombre: 'Restaurante La Peña Bermeja', tipo: 'Restaurante', cocina: 'Parrilla', localidad: 'Brihuega', descripcion: 'Restaurante de parrilla en Brihuega.', valoracion: gmaps('Restaurante La Peña Bermeja Brihuega', 4.4, 931) },
    { id: 'kiosco-alameda', nombre: 'El Kiosco de La Alameda de Brihuega', tipo: 'Restaurante', cocina: 'Restaurante', localidad: 'Brihuega', descripcion: 'Restaurante en el parque de María Cristina.', valoracion: gmaps('El Kiosco de La Alameda de Brihuega', 4.5, 2575) },
    { id: 'rest-princesa-elima', nombre: 'Restaurante en Brihuega Princesa Elima', tipo: 'Restaurante', cocina: 'Restaurante de cocina castellana', localidad: 'Brihuega', descripcion: 'Restaurante de la Hospedería Princesa Elima.', valoracion: gmaps('Restaurante en Brihuega Princesa Elima', 4.5, 830) },
    { id: 'rest-villa-brihuega', nombre: 'Hostal-Restaurante Villa de Brihuega', tipo: 'Restaurante', localidad: 'Brihuega', descripcion: 'Restaurante del hostal Villa de Brihuega.', valoracion: gmaps('Hostal-Restaurante Villa de Brihuega', 4.1, 2674) },
    { id: 'carlos-iii', nombre: 'Café-Bar Carlos III', tipo: 'Restaurante', cocina: 'Restaurante', localidad: 'Brihuega', descripcion: 'Café bar con cocina en Brihuega.', valoracion: gmaps('CAFE-BAR CARLOS III Brihuega', 3.8, 283) },
    { id: 'el-jardin', nombre: 'Bar El Jardín', tipo: 'Restaurante', cocina: 'Restaurante de cocina española', localidad: 'Brihuega', descripcion: 'Bar restaurante en Brihuega.', valoracion: gmaps('Bar El Jardin Brihuega', 3.4, 747) },
  ],
  sevilla: [
    { id: 'las-columnas', nombre: 'Bodega Santa Cruz Las Columnas', tipo: 'Bar de tapas', cocina: 'Bar de tapas', localidad: 'Sevilla (casco antiguo)', descripcion: 'Bar de tapas en el casco antiguo.', valoracion: gmaps('Bodega Santa Cruz Las Columnas Sevilla', 4.4, 16363) },
    { id: 'las-teresas', nombre: 'Las Teresas', tipo: 'Restaurante', cocina: 'Restaurante de cocina española', localidad: 'Sevilla (casco antiguo)', descripcion: 'Restaurante en el casco antiguo.', valoracion: gmaps('Las Teresas Sevilla', 3.9, 6668) },
    { id: 'casa-placido', nombre: 'Casa Plácido', tipo: 'Bar de tapas', cocina: 'Bar de tapas', localidad: 'Sevilla (casco antiguo)', descripcion: 'Bar de tapas en el casco antiguo.', valoracion: gmaps('Casa Plácido Sevilla', 3.8, 1156) },
    { id: 'el-librero', nombre: 'El Librero Tapas y Quesos', tipo: 'Restaurante', cocina: 'Restaurante andaluz', localidad: 'Sevilla (casco antiguo)', descripcion: 'Restaurante andaluz en el casco antiguo.', valoracion: gmaps('El Librero Tapas Y Quesos Sevilla', 4.6, 5519) },
    { id: 'el-pasaje', nombre: 'El Pasaje Tapas', tipo: 'Bar de tapas', cocina: 'Restaurante especializado en tapas', localidad: 'Sevilla (casco antiguo)', descripcion: 'Tapas en el casco antiguo.', valoracion: gmaps('El Pasaje Tapas Sevilla', 4.6, 10856) },
    { id: 'dona-petra', nombre: 'Doña Petra', tipo: 'Restaurante', cocina: 'Restaurante', localidad: 'Sevilla (casco antiguo)', descripcion: 'Restaurante en el casco antiguo.', valoracion: gmaps('Doña Petra Sevilla', 4.8, 187) },
    { id: 'malquerer', nombre: 'Malquerer Restaurante', tipo: 'Restaurante', cocina: 'Restaurante', localidad: 'Sevilla (casco antiguo)', descripcion: 'Restaurante en el casco antiguo.', valoracion: gmaps('MALQUERER Restaurante Sevilla', 4.7, 2753) },
    { id: 'chicuelo', nombre: 'Chicuelo Bodeguita & Tapas', tipo: 'Bar de tapas', cocina: 'Restaurante especializado en tapas', localidad: 'Sevilla (casco antiguo)', descripcion: 'Bodeguita de tapas en el casco antiguo.', valoracion: gmaps('Chicuelo Bodeguita & Tapas Sevilla', 4.7, 5114) },
  ],
}

export const esAlojamiento = (l: Local) => l.tipo !== 'Restaurante' && l.tipo !== 'Bar de tapas'
const sinParentesis = (s: string) => s.replace(/\s*\(.*\)/, '')
export const consultaDe = (l: Local) => encodeURIComponent(`${l.nombre} ${sinParentesis(l.localidad)}`)
export const urlBooking = (l: Local) => `https://www.booking.com/searchresults.html?ss=${consultaDe(l)}`
export const urlMaps = (l: Local) => `https://www.google.com/maps/search/?api=1&query=${consultaDe(l)}`
export const urlTripadvisor = (l: Local) => `https://www.tripadvisor.es/Search?q=${consultaDe(l)}`

/** Valoración convertida a 5 estrellas (relleno parcial, sin redondear a medias para no falsear). */
export const aCinco = (v: Valoracion) => Math.round((v.puntuacion / v.escala) * 5 * 100) / 100
