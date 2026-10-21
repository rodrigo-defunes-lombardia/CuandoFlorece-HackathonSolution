import { useEffect, useRef, type ReactNode } from 'react'
export function Modal({ titulo, onClose, children }: { titulo: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const previo = document.activeElement as HTMLElement | null
    ref.current?.querySelector<HTMLElement>('input,select,button,textarea')?.focus()
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', k)
    return () => { window.removeEventListener('keydown', k); previo?.focus() }
  }, [onClose])
  return (
    <div className="modal-fondo" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={titulo} ref={ref}>
        <div className="modal-cab"><h2>{titulo}</h2><button className="btn-icono" onClick={onClose} aria-label="Cerrar">✕</button></div>
        {children}
      </div>
    </div>
  )
}
