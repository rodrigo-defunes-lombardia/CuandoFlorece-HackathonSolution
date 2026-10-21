/** Capa de acceso a datos de la comunidad. Hoy usa localStorage; para producción basta con
 *  implementar estas mismas interfaces contra una API (fetch) y cambiar la instancia exportada. */
import type { Alerta, Observacion } from './tipos'

export interface ObservacionesRepo { listar(): Promise<Observacion[]>; crear(o: Observacion): Promise<void>; borrarPropias(): Promise<void> }
export interface AlertasRepo { listar(): Promise<Alerta[]>; crear(a: Alerta): Promise<void> }

const leer = <T,>(k: string): T[] => { try { return JSON.parse(localStorage.getItem(k) || '[]') } catch { return [] } }
const guardar = (k: string, v: unknown) => { try { localStorage.setItem(k, JSON.stringify(v)) } catch { throw new Error('No hay espacio local para guardar la foto; prueba sin foto.') } }

export const SEMILLAS = (hoy: string): Observacion[] => {
  const s = (id: string, destinoId: string, dias: number, lat: number, lon: number, fase: string, comentario: string): Observacion => ({
    id, destinoId, fecha: new Date(Date.parse(hoy) - dias * 86400000).toISOString().slice(0, 10), lat, lon, distancia_km: 0.4, fase, comentario, demo: true,
  })
  return [
    s('demo-1', 'tejera_negra', 4, 41.1531, -3.4208, 'floracion', 'Las hayas altas ya van doradas; abajo aún verde. (Observación de ejemplo)'),
    s('demo-2', 'tejera_negra', 2, 41.1562, -3.4251, 'floracion', 'Mucho ocre en el sendero del río. (Observación de ejemplo)'),
    s('demo-3', 'tejera_negra', 1, 41.1548, -3.4219, 'floracion', 'Todavía no es el pleno, pero falta poco. (Observación de ejemplo)'),
    s('demo-4', 'brihuega', 120, 40.7701, -2.8680, 'caida', 'Cosecha terminada en la parcela de la ermita. (Observación de ejemplo)'),
    s('demo-5', 'sevilla', 230, 37.3862, -5.9926, 'pico', 'Azahar a tope en la Plaza de los Venerables. (Ejemplo de la temporada pasada)'),
  ]
}

export const observacionesRepo: ObservacionesRepo = {
  async listar() { return leer<Observacion>('cf.obs') },
  async crear(o) { guardar('cf.obs', [...leer<Observacion>('cf.obs'), o]) },
  async borrarPropias() { guardar('cf.obs', leer<Observacion>('cf.obs').filter(o => o.demo)) },
}
export const alertasRepo: AlertasRepo = {
  async listar() { return leer<Alerta>('cf.alertas') },
  async crear(a) { guardar('cf.alertas', [...leer<Alerta>('cf.alertas'), a]) },
}
