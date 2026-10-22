/** Capa de acceso a datos de las alertas. Hoy usa localStorage; para producción basta con
 *  implementar estas mismas interfaces contra una API (fetch) y cambiar la instancia exportada. */
import type { Alerta } from './tipos'

export interface AlertasRepo { listar(): Promise<Alerta[]>; crear(a: Alerta): Promise<void> }

const leer = <T,>(k: string): T[] => { try { return JSON.parse(localStorage.getItem(k) || '[]') } catch { return [] } }
const guardar = (k: string, v: unknown) => { try { localStorage.setItem(k, JSON.stringify(v)) } catch { throw new Error('No hay espacio local para guardar la alerta.') } }

export const alertasRepo: AlertasRepo = {
  async listar() { return leer<Alerta>('cf.alertas') },
  async crear(a) { guardar('cf.alertas', [...leer<Alerta>('cf.alertas'), a]) },
}
