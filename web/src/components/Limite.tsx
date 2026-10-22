import { Component, useState, type ErrorInfo, type ReactNode } from 'react'
import { Flor } from './Flor'

interface Props { children: ReactNode; fallback: (error: Error) => ReactNode; onError?: (error: Error) => void }

/** Límite de errores: un fallo de render dentro de `children` muestra `fallback` en vez de desmontar toda la app. */
export class Limite extends Component<Props, { error: Error | null }> {
  state = { error: null as Error | null }
  static getDerivedStateFromError(error: Error) { return { error } }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.warn('Error capturado:', error, info.componentStack)
    this.props.onError?.(error)
  }
  render() { return this.state.error ? this.props.fallback(this.state.error) : this.props.children }
}

/** Pantalla de fallo general, con el diseño de la app: qué ha pasado, «Recargar» y el detalle técnico copiable. */
export function PantallaFallo({ error }: { error: Error }) {
  const [copiado, setCopiado] = useState(false)
  const detalle = `${error.name}: ${error.message}\n\n${error.stack ?? ''}\n\nNavegador: ${navigator.userAgent}\nPágina: ${location.href}`
  const copiar = async () => {
    try { await navigator.clipboard.writeText(detalle); setCopiado(true) } catch { setCopiado(false) }
  }
  return (
    <main className="fallo" role="alert">
      <Flor size={56} className="fallo-flor" />
      <h1 className="titulo">Algo no ha ido bien</h1>
      <p className="dim">La página ha tenido un problema al mostrarse. No has hecho nada mal: recargar suele bastar. Si vuelve a pasar, prueba con otro navegador o actualiza el que usas.</p>
      <button className="btn btn--primario" onClick={() => location.reload()}>Recargar</button>
      <details className="fallo-det">
        <summary>Detalle técnico</summary>
        <pre tabIndex={0}>{detalle}</pre>
        <button className="btn btn--suave" onClick={copiar}>{copiado ? 'Copiado' : 'Copiar detalle'}</button>
      </details>
    </main>
  )
}
