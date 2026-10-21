/** Datos de la página "Agencia" (demo de viajes a medida).
 *  REAL: alojamientos y restaurantes (locales.ts) y las actividades de abajo (verificadas en webs de turismo y prensa, oct. 2026).
 *  FICTICIO: todos los precios. Donde no se ha podido verificar un horario o una condición de acceso, se dice. */
import { ALOJAMIENTOS, RESTAURANTES, type Local } from './locales'

export type Momento = 'mañana' | 'tarde' | 'cualquiera'
export interface Actividad {
  id: string; nombre: string; localidad: string; tipo: 'Ruta' | 'Visita' | 'Visita guiada' | 'Paseo' | 'Mirador'
  duracion: string; precioPP: number; descripcion: string
  reserva: string | null // null = no requiere reserva ni permiso (según las fuentes consultadas)
  momento: Momento
}
/** Precio ficticio: rango en euros. Alojamiento por habitación y noche; restaurante por persona. */
export type Rango = [number, number]
export interface DatosAgencia { alojamientos: (Local & { precio: Rango })[]; restaurantes: (Local & { precio: Rango })[]; actividades: Actividad[] }

const conPrecio = (lista: Local[], precios: Record<string, Rango>) => lista.filter(l => precios[l.id]).map(l => ({ ...l, precio: precios[l.id] }))

const ACTIVIDADES: Record<string, Actividad[]> = {
  tejera_negra: [
    { id: 'senda-carretas', nombre: 'Senda de Carretas', localidad: 'Cantalojas', tipo: 'Ruta', duracion: '≈ 6 km circular · 2–3 h', precioPP: 0, momento: 'mañana',
      descripcion: 'Recorrido circular señalizado por el corazón del hayedo.',
      reserva: 'En otoño hay que reservar online la plaza del aparcamiento del inicio de la senda (canales oficiales del Parque Natural Sierra Norte de Guadalajara). A pie desde el Centro de Interpretación no hace falta.' },
    { id: 'senda-robledal', nombre: 'Senda del Robledal', localidad: 'Cantalojas', tipo: 'Ruta', duracion: '≈ 17 km · dificultad media · 5–6 h', precioPP: 0, momento: 'mañana',
      descripcion: 'Sale del Centro de Interpretación y enlaza con la Senda de Carretas.', reserva: null },
    { id: 'pedrosa', nombre: 'Hayedo de la Pedrosa', localidad: 'Riofrío de Riaza (Segovia)', tipo: 'Ruta', duracion: '≈ 2 h', precioPP: 0, momento: 'mañana',
      descripcion: 'Junto con Tejera Negra, uno de los hayedos más meridionales de Europa, en la vertiente segoviana.',
      reserva: 'Condiciones de acceso no verificadas: consúltalas antes de ir.' },
    { id: 'galve', nombre: 'Castillo de Galve de Sorbe (exterior)', localidad: 'Galve de Sorbe', tipo: 'Mirador', duracion: '≈ 45 min', precioPP: 0, momento: 'mañana',
      descripcion: 'Fortaleza del siglo XV en lo alto de una colina.',
      reserva: 'Horario de visita interior no verificado: consúltalo en el Ayuntamiento de Galve de Sorbe.' },
    { id: 'centro-interpretacion', nombre: 'Centro de Interpretación del Hayedo de Tejera Negra', localidad: 'Cantalojas', tipo: 'Visita', duracion: '≈ 1 h', precioPP: 0, momento: 'tarde',
      descripcion: 'Puerta de entrada al parque, a unos 2 km de Cantalojas.', reserva: null },
    { id: 'ayllon', nombre: 'Paseo por la villa medieval de Ayllón', localidad: 'Ayllón (Segovia)', tipo: 'Paseo', duracion: '≈ 2 h', precioPP: 0, momento: 'tarde',
      descripcion: 'Conjunto histórico con Plaza Mayor, Arco medieval, Casa Palacio Contreras y puente sobre el río Aguisejo.', reserva: null },
    { id: 'majaelrayo', nombre: 'Majaelrayo, arquitectura negra', localidad: 'Majaelrayo', tipo: 'Paseo', duracion: '≈ 1,5 h', precioPP: 0, momento: 'tarde',
      descripcion: 'Pueblo de construcciones de lajas de pizarra, piedra oscura y madera de roble.', reserva: null },
    { id: 'valverde', nombre: 'Valverde de los Arroyos, arquitectura negra', localidad: 'Valverde de los Arroyos', tipo: 'Paseo', duracion: '≈ 1,5 h', precioPP: 0, momento: 'tarde',
      descripcion: 'Otro de los pueblos negros de la Sierra Norte de Guadalajara.', reserva: null },
    { id: 'campillo', nombre: 'Campillo de Ranas, arquitectura negra', localidad: 'Campillo de Ranas', tipo: 'Paseo', duracion: '≈ 1 h', precioPP: 0, momento: 'cualquiera',
      descripcion: 'Comparte con Majaelrayo y Valverde el patrimonio de pizarra y roble.', reserva: null },
  ],
  brihuega: [
    { id: 'cuevas', nombre: 'Cuevas Árabes', localidad: 'Brihuega', tipo: 'Visita guiada', duracion: '≈ 30 min', precioPP: 4, momento: 'mañana',
      descripcion: 'Galerías excavadas bajo el casco histórico; se visitan unos 700 m. Dentro hay unos 12 °C todo el año.',
      reserva: 'Reserva previa y aforo limitado en la Oficina de Turismo de Brihuega.' },
    { id: 'castillo', nombre: 'Castillo de Piedra Bermeja e iglesia de Santa María de la Peña', localidad: 'Brihuega', tipo: 'Visita', duracion: '≈ 1 h', precioPP: 3, momento: 'mañana',
      descripcion: 'La iglesia, del siglo XIII y de estilo gótico de transición, está dentro del patio de armas del castillo.',
      reserva: 'Horario no verificado: consúltalo en la Oficina de Turismo.' },
    { id: 'miniaturas', nombre: 'Museo de Miniaturas Profesor Max', localidad: 'Brihuega', tipo: 'Visita', duracion: '≈ 1 h', precioPP: 5, momento: 'mañana',
      descripcion: 'Colección de unas 65.000 piezas en miniatura.',
      reserva: 'Horario y precio no verificados: consúltalos en el museo o en la Oficina de Turismo.' },
    { id: 'murallas', nombre: 'Murallas: Puerta de la Cadena y Arco de Cozagón', localidad: 'Brihuega', tipo: 'Paseo', duracion: '≈ 45 min', precioPP: 0, momento: 'tarde',
      descripcion: 'Accesos históricos a la villa, bien conservados.', reserva: null },
    { id: 'fabrica', nombre: 'Real Fábrica de Paños (exterior y jardín)', localidad: 'Brihuega', tipo: 'Visita', duracion: '≈ 45 min', precioPP: 0, momento: 'tarde',
      descripcion: 'Edificio del siglo XVIII de planta circular; hoy alberga un hotel.',
      reserva: 'El acceso al jardín depende del hotel: confirma las condiciones en la Oficina de Turismo.' },
    { id: 'campos', nombre: 'Campos de lavanda al atardecer', localidad: 'Brihuega', tipo: 'Mirador', duracion: '≈ 2 h', precioPP: 0, momento: 'tarde',
      descripcion: 'Los campos se extienden hacia Malacuera, Hontanares y Villaviciosa de Tajuña. Muchos son privados: se ven desde caminos y accesos señalados.', reserva: null },
    { id: 'lavanda-guiada', nombre: 'Visita guiada a los campos de lavanda', localidad: 'Brihuega', tipo: 'Visita guiada', duracion: '≈ 1,5 h', precioPP: 3, momento: 'tarde',
      descripcion: 'El programa municipal de floración ha incluido visitas guiadas con salida desde el parque de María Cristina (edición 2024).',
      reserva: 'Depende del programa de floración del año: consúltalo en el Ayuntamiento de Brihuega.' },
    { id: 'doce-canos', nombre: 'Fuente de los Doce Caños', localidad: 'Brihuega', tipo: 'Paseo', duracion: '≈ 20 min', precioPP: 0, momento: 'cualquiera',
      descripcion: 'También llamada Fuente Blanquina, bajando por la calle de la Cadena.', reserva: null },
    { id: 'maria-cristina', nombre: 'Parque de María Cristina', localidad: 'Brihuega', tipo: 'Paseo', duracion: '≈ 30 min', precioPP: 0, momento: 'cualquiera',
      descripcion: 'Parque desde el que se entra al casco antiguo.', reserva: null },
  ],
  sevilla: [
    { id: 'alcazar', nombre: 'Real Alcázar de Sevilla', localidad: 'Sevilla', tipo: 'Visita', duracion: '≈ 2 h', precioPP: 15, momento: 'mañana',
      descripcion: 'Conjunto palaciego con jardines y naranjos.', reserva: 'Entrada con hora: se compra en la web oficial del Real Alcázar.' },
    { id: 'catedral', nombre: 'Catedral de Sevilla y Giralda', localidad: 'Sevilla', tipo: 'Visita', duracion: '≈ 1,5 h', precioPP: 13, momento: 'mañana',
      descripcion: 'Catedral gótica con subida a la Giralda y el Patio de los Naranjos.', reserva: 'Entrada en la web oficial de la Catedral de Sevilla.' },
    { id: 'pilatos', nombre: 'Casa de Pilatos', localidad: 'Sevilla', tipo: 'Visita', duracion: '≈ 1 h', precioPP: 12, momento: 'mañana',
      descripcion: 'Palacio sevillano con patios y jardines.', reserva: 'Entrada en taquilla o en su web oficial.' },
    { id: 'duenas', nombre: 'Palacio de las Dueñas', localidad: 'Sevilla', tipo: 'Visita', duracion: '≈ 1 h', precioPP: 12, momento: 'mañana',
      descripcion: 'Palacio con patios y jardín en el centro histórico.', reserva: 'Entrada en taquilla o en su web oficial.' },
    { id: 'santa-cruz', nombre: 'Barrio de Santa Cruz y Jardines de Murillo', localidad: 'Sevilla', tipo: 'Paseo', duracion: '≈ 1,5 h', precioPP: 0, momento: 'tarde',
      descripcion: 'Callejas y plazas con naranjos: uno de los mejores sitios para oler el azahar.', reserva: null },
    { id: 'plaza-espana', nombre: 'Plaza de España y Parque de María Luisa', localidad: 'Sevilla', tipo: 'Paseo', duracion: '≈ 2 h', precioPP: 0, momento: 'tarde',
      descripcion: 'La gran plaza de la Exposición de 1929 y el parque que la rodea.', reserva: null },
    { id: 'setas', nombre: 'Setas de Sevilla (Metropol Parasol)', localidad: 'Sevilla', tipo: 'Mirador', duracion: '≈ 1 h', precioPP: 15, momento: 'tarde',
      descripcion: 'Pasarela mirador sobre los tejados del centro.', reserva: 'Entrada en taquilla o en su web oficial.' },
    { id: 'ribera', nombre: 'Ribera del Guadalquivir y Torre del Oro', localidad: 'Sevilla', tipo: 'Paseo', duracion: '≈ 1,5 h', precioPP: 0, momento: 'tarde',
      descripcion: 'Paseo junto al río hasta la Torre del Oro (exterior).', reserva: null },
    { id: 'venerables', nombre: 'Hospital de los Venerables', localidad: 'Sevilla', tipo: 'Visita', duracion: '≈ 1 h', precioPP: 10, momento: 'cualquiera',
      descripcion: 'Edificio barroco en el barrio de Santa Cruz.', reserva: 'Entrada en taquilla o en su web oficial.' },
  ],
}

// Precios ficticios (€): alojamiento por habitación y noche; restaurante por persona.
const PRECIO_ALOJAMIENTO: Record<string, Record<string, Rango>> = {
  tejera_negra: { 'ventana-tejera': [70, 90], 'el-casarejo': [80, 100], 'castillo-diempures': [110, 140], 'casa-gatos': [65, 85], 'grado-del-pico': [60, 75], 'molino-ferreria': [85, 110] },
  brihuega: { 'castilla-termal': [120, 160], 'villa-brihuega': [55, 70], 'princesa-elima': [70, 90], 'tierra-lavanda': [75, 95], 'flor-lavanda': [70, 90], 'capricho-brihuega': [80, 100] },
  sevilla: { 'dona-maria': [130, 170], 'casas-juderia': [140, 180], 'patio-santa-cruz': [90, 120], 'murillo': [85, 110], 'dona-lina': [100, 130] },
}
const PRECIO_RESTAURANTE: Record<string, Record<string, Rango>> = {
  tejera_negra: { 'bar-la-plaza': [15, 25], 'mirador-hayedo': [15, 22], 'los-bonales': [14, 20], 'la-sierra': [15, 25], 'el-parral': [30, 45], 'meson-mica': [20, 30], 'tasca-villacorta': [18, 28], 'meson-jabali': [20, 32] },
  brihuega: { 'la-muralla': [18, 28], 'el-tolmo': [22, 35], 'pena-bermeja': [22, 32], 'kiosco-alameda': [15, 25], 'rest-princesa-elima': [25, 38], 'rest-villa-brihuega': [16, 26], 'carlos-iii': [12, 20], 'el-jardin': [12, 20] },
  sevilla: { 'las-columnas': [12, 20], 'las-teresas': [18, 28], 'casa-placido': [12, 20], 'el-librero': [18, 28], 'el-pasaje': [15, 25], 'dona-petra': [25, 40], 'malquerer': [25, 40], 'chicuelo': [15, 25] },
}

export const AGENCIA: Record<string, DatosAgencia> = Object.fromEntries(Object.keys(ACTIVIDADES).map(id => [id, {
  alojamientos: conPrecio(ALOJAMIENTOS[id] ?? [], PRECIO_ALOJAMIENTO[id] ?? {}),
  restaurantes: conPrecio(RESTAURANTES[id] ?? [], PRECIO_RESTAURANTE[id] ?? {}),
  actividades: ACTIVIDADES[id],
}]))
