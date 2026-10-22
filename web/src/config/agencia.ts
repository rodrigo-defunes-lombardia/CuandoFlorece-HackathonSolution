/** Margen de la agencia por gestionar las reservas (0,12 = 12 %). Único sitio donde se configura. */
export const AGENCY_MARGIN = 0.12

/** Tope de días de un viaje. null = sin tope: hasta el último día de la mejor ventana del destino.
 *  Con un número (p. ej. 7), el calendario no deja elegir una vuelta más allá de ese número de días. */
export const MAX_DIAS: number | null = null
