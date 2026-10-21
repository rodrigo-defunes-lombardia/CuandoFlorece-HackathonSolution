import { useState } from 'react'
import type { Destino, Observacion } from '../lib/tipos'
import { CIUDADANA, calcularAjuste, haversineKm, opcionesFase } from '../lib/estado'
import { observacionesRepo } from '../lib/repos'
import { Modal } from './Modal'

type Ubic = { lat: number; lon: number; origen: string } | null

/** Reduce la foto para que quepa en localStorage. */
const reducir = (f: File) => new Promise<string>((res, rej) => {
  const img = new Image(), url = URL.createObjectURL(f)
  img.onload = () => {
    const k = Math.min(1, 480 / Math.max(img.width, img.height)), c = document.createElement('canvas')
    c.width = img.width * k; c.height = img.height * k
    c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url); res(c.toDataURL('image/jpeg', 0.6))
  }
  img.onerror = () => rej(new Error('No se pudo leer la imagen.')); img.src = url
})

export function FormObs({ destino, hoy, todas, onClose, onGuardada }: {
  destino: Destino; hoy: string; todas: Observacion[]; onClose: () => void; onGuardada: () => void
}) {
  const [fase, setFase] = useState('')
  const [coment, setComent] = useState('')
  const [foto, setFoto] = useState<string>()
  const [ubic, setUbic] = useState<Ubic>(null)
  const [gps, setGps] = useState('')
  const [error, setError] = useState('')
  const [hecho, setHecho] = useState('')
  const opciones = opcionesFase(destino)

  const pedirGps = () => {
    setGps('Buscando tu ubicación…')
    if (!navigator.geolocation) return setGps('Tu navegador no ofrece geolocalización.')
    navigator.geolocation.getCurrentPosition(
      p => { setUbic({ lat: p.coords.latitude, lon: p.coords.longitude, origen: 'GPS del dispositivo' }); setGps('') },
      e => setGps(e.code === 1 ? 'Has denegado el permiso de ubicación. Sin ella no podemos validar que estuviste allí.' : 'No se pudo obtener la ubicación.'),
      { enableHighAccuracy: true, timeout: 10000 })
  }
  const simular = (cerca: boolean) => { setGps(''); setUbic({ lat: destino.lat + (cerca ? 0.004 : 1.8), lon: destino.lon + (cerca ? 0.003 : 1.2), origen: cerca ? 'Ubicación simulada (demo) · cerca' : 'Ubicación simulada (demo) · lejos' }) }
  const dist = ubic ? haversineKm(ubic.lat, ubic.lon, destino.lat, destino.lon) : null

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault(); setError('')
    if (!fase) return setError('Elige qué estado has observado.')
    if (!ubic || dist === null) return setError('Necesitamos tu ubicación para validar la observación.')
    if (!foto) return setError('Añade una foto: es la prueba de la observación.')
    if (dist > CIUDADANA.MAX_DISTANCIA_KM) return setError(`Observación descartada: estás a ${dist.toFixed(0)} km de ${destino.nombre} y el límite es ${CIUDADANA.MAX_DISTANCIA_KM} km. Así evitamos datos de sitios que no son este.`)
    const obs: Observacion = { id: crypto.randomUUID(), destinoId: destino.id, fecha: hoy, lat: ubic.lat, lon: ubic.lon, distancia_km: Math.round(dist * 10) / 10, fase, comentario: coment.trim(), foto, demo: false }
    try {
      const antes = calcularAjuste(destino, todas, hoy)
      await observacionesRepo.crear(obs)
      const despues = calcularAjuste(destino, [...todas, obs], hoy)
      const delta = despues.desplazamiento - antes.desplazamiento
      setHecho(despues.nEff === 0 && antes.nEff === despues.nEff
        ? 'Gracias. Guardada, pero está fuera de la temporada de este destino, así que no mueve la predicción.'
        : `Gracias. Tu observación ${delta === 0 ? 'confirma la predicción' : `mueve la fecha central ${Math.abs(delta).toFixed(1)} días ${delta < 0 ? 'antes' : 'después'}`} y estrecha el margen un ${Math.round((1 - despues.factor) * 100)} %.`)
      onGuardada()
    } catch (err) { setError((err as Error).message) }
  }

  return (
    <Modal titulo={`Yo estuve aquí · ${destino.nombre}`} onClose={onClose}>
      {hecho ? (
        <div><p className="ok" role="status">{hecho}</p><button className="btn btn--primario" onClick={onClose}>Cerrar</button></div>
      ) : (
        <form onSubmit={enviar} noValidate>
          <fieldset><legend>¿Qué estás viendo?</legend>
            <div className="radios">{opciones.map(o => (
              <label key={o.id} className={`radio${fase === o.id ? ' radio--on' : ''}`}><input type="radio" name="fase" value={o.id} checked={fase === o.id} onChange={() => setFase(o.id)} />{o.etiqueta}</label>
            ))}</div>
          </fieldset>
          <label className="campo">Foto
            <input type="file" accept="image/*" capture="environment" aria-label="Foto de la observación" onChange={async e => { const f = e.target.files?.[0]; if (f) { try { setFoto(await reducir(f)) } catch (x) { setError((x as Error).message) } } }} />
          </label>
          {foto && <img src={foto} alt="Vista previa de tu foto" className="prev" />}
          <div className="campo"><span>Ubicación</span>
            <div className="fila">
              <button type="button" className="btn" onClick={pedirGps}>Usar mi ubicación</button>
              <button type="button" className="btn btn--suave" onClick={() => simular(true)}>Demo: estoy aquí</button>
              <button type="button" className="btn btn--suave" onClick={() => simular(false)}>Demo: estoy lejos</button>
            </div>
            {gps && <p className="aviso" role="status">{gps}</p>}
            {ubic && dist !== null && <p className={dist > CIUDADANA.MAX_DISTANCIA_KM ? 'err' : 'ok'} role="status">{ubic.origen}: a {dist.toFixed(1)} km de {destino.nombre} (límite {CIUDADANA.MAX_DISTANCIA_KM} km).</p>}
          </div>
          <label className="campo">Comentario (opcional)<textarea rows={2} value={coment} maxLength={200} onChange={e => setComent(e.target.value)} /></label>
          {error && <p className="err" role="alert">{error}</p>}
          <p className="nota">Tu observación se guarda solo en este navegador (demo). Las fotos no se suben a ningún servidor.</p>
          <button className="btn btn--primario" type="submit">Enviar observación</button>
        </form>
      )}
    </Modal>
  )
}
