import { useState } from 'react'
import type { Destino } from '../lib/tipos'
import { alertasRepo } from '../lib/repos'
import { Modal } from './Modal'

export function FormAlerta({ destino, onClose }: { destino: Destino; onClose: () => void }) {
  const [email, setEmail] = useState(''); const [ok, setOk] = useState(false); const [err, setErr] = useState('')
  const enviar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return setErr('Escribe un correo válido.')
    await alertasRepo.crear({ id: crypto.randomUUID(), destinoId: destino.id, email, creada: new Date().toISOString() }); setOk(true)
  }
  return (
    <Modal titulo={`Avísame · ${destino.nombre}`} onClose={onClose}>
      {ok ? (
        <div><p className="ok" role="status">Listo: te avisaríamos cuando {destino.especie.toLowerCase()} entre en su ventana óptima.</p>
          <p className="nota"><b>Esto es una demo:</b> tu correo solo se guarda en este navegador y no se envía ningún email.</p>
          <button className="btn btn--primario" onClick={onClose}>Cerrar</button></div>
      ) : (
        <form onSubmit={enviar} noValidate>
          <p>Te avisamos cuando el destino pase a <b>floración activa</b> y cuando entre en <b>pico</b>.</p>
          <label className="campo">Tu correo<input type="email" value={email} onChange={e => { setEmail(e.target.value); setErr('') }} autoComplete="email" placeholder="nombre@correo.es" /></label>
          {err && <p className="err" role="alert">{err}</p>}
          <p className="nota">Demo: no se envía ningún correo real.</p>
          <button className="btn btn--primario" type="submit">Avísame</button>
        </form>
      )}
    </Modal>
  )
}
