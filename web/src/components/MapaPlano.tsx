import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { Destino } from '../lib/tipos'
import { momentoTexto, type Estado } from '../lib/estado'
import { colorFase } from '../lib/colores'

/** Mapa alternativo sin WebGL (Leaflet, teselas en <img>). Solo se descarga cuando falta WebGL: ver Mapa.tsx.
 *  Misma imagen satélite que el mapa 3D, con nombres y límites de Esri encima. */
const SATELITE = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
const NOMBRES = 'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}'
/** Leaflet usa teselas de 256 px y MapLibre de 512: el mismo encuadre es un nivel de zoom más. */
const Z = 1
const ANCHO = 859 // mismo corte que el CSS: panel lateral en escritorio, inferior en móvil

interface Props {
  destinos: Destino[]; estados: Record<string, Estado>; seleccionado: string | null
  onSeleccionar: (id: string) => void
  onFallo: (error: unknown) => void
}

const esc = (t: string) => t.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!))

/** Flor de seis pétalos (la marca) con el color del estado y la etiqueta de nombre y estado, como en el mapa 3D. */
function icono(d: Destino, e: Estado, sel: boolean) {
  const petalos = [0, 60, 120, 180, 240, 300].map(a => `<ellipse cx="0" cy="-9.5" rx="5.2" ry="9.5" transform="rotate(${a})"/>`).join('')
  const nombre = d.nombre.replace('Hayedo de ', ''), estado = `${e.etiqueta}${e.enTemporada ? ` · ${e.momento}` : ''}`
  return L.divIcon({
    className: `pin${sel ? ' pin--sel' : ''}`, iconSize: [44, 44], iconAnchor: [22, 22],
    html: `<svg class="pin-flor" viewBox="-22 -22 44 44" aria-hidden="true" focusable="false" style="--c:${colorFase(d.tipo, e.faseId)}">${petalos}<circle r="4.4" class="pin-centro"/><circle r="1.6" class="pin-punto"/></svg>`
      + `<span class="pin-txt" aria-hidden="true"><b>${esc(nombre)}</b><span>${esc(estado)}</span></span>`,
  })
}
const etiqueta = (d: Destino, e: Estado) => `${d.nombre}: ${e.etiqueta}${e.enTemporada ? `, ${momentoTexto(e, d.tipo).toLowerCase()}` : ''}. Abrir ficha`

/** Como `text-optional` en el mapa 3D: si dos etiquetas chocan, se oculta la del destino con menos prioridad
 *  (prioridad = zIndexOffset: seleccionado > en temporada > resto). La flor siempre se ve. */
function evitarChoques(marcas: L.Marker[]) {
  const orden = marcas.map(mk => ({ el: mk.getElement(), z: mk.options.zIndexOffset ?? 0 })).filter(x => x.el).sort((a, b) => b.z - a.z)
  const puestas: DOMRect[] = []
  for (const { el } of orden) {
    const t = el!.querySelector('.pin-txt'); if (!t) continue
    t.classList.remove('pin-txt--oculta')
    const r = t.getBoundingClientRect()
    if (puestas.some(p => r.left < p.right && r.right > p.left && r.top < p.bottom && r.bottom > p.top)) t.classList.add('pin-txt--oculta')
    else puestas.push(r)
  }
}

/** Mismo encuadre que el mapa 3D. En móvil el relleno es menor: MapLibre lo relaja cuando no cabe y Leaflet no. */
function encuadrarTodos(m: L.Map, destinos: Destino[], animar: boolean) {
  if (!destinos.length) return
  const ancho = window.innerWidth > ANCHO, alto = m.getSize().y
  const b = L.latLngBounds(destinos.map(d => [d.lat, d.lon] as [number, number]))
  m.fitBounds(b, { animate: animar, maxZoom: 6.5 + Z,
    paddingTopLeft: ancho ? [500, 260] : [40, 200], paddingBottomRight: ancho ? [110, 130] : [40, alto * 0.48 + 40] })
}

export function MapaPlano({ destinos, estados, seleccionado, onSeleccionar, onFallo }: Props) {
  const cont = useRef<HTMLDivElement>(null)
  const mapa = useRef<L.Map | null>(null)
  const marcas = useRef<Record<string, L.Marker>>({})
  const [aviso, setAviso] = useState('')
  const alSeleccionar = useRef(onSeleccionar); alSeleccionar.current = onSeleccionar
  const alFallar = useRef(onFallo); alFallar.current = onFallo

  useEffect(() => {
    if (!cont.current) return
    let m: L.Map
    try {
      m = L.map(cont.current, { center: [39.9, -3.9], zoom: 5.1 + Z, minZoom: 3 + Z, zoomSnap: 0.1, zoomControl: false, attributionControl: false })
      L.control.attribution({ prefix: '<a href="https://leafletjs.com" target="_blank" rel="noopener">Leaflet</a>' }).addTo(m)
      L.control.zoom({ position: 'bottomright', zoomInTitle: 'Acercar', zoomOutTitle: 'Alejar' }).addTo(m)
      const fallo = () => setAviso('No se pudo cargar el mapa base (sin conexión). Los destinos siguen disponibles en la lista.')
      L.tileLayer(SATELITE, { maxZoom: 19, className: 'plano-satelite',
        attribution: 'Imágenes © <a href="https://www.esri.com" target="_blank" rel="noopener">Esri</a>, Maxar, Earthstar Geographics' }).on('tileerror', fallo).addTo(m)
      L.tileLayer(NOMBRES, { maxZoom: 19, attribution: 'Nombres y límites © Esri' }).on('tileerror', fallo).addTo(m)
      encuadrarTodos(m, destinos, false)
      m.on('zoomend moveend', () => evitarChoques(Object.values(marcas.current)))
    } catch (e) { alFallar.current(e); return }
    mapa.current = m
    if (import.meta.env.DEV) (window as unknown as { __plano?: L.Map }).__plano = m // solo para pruebas
    return () => { m.remove(); mapa.current = null; marcas.current = {} }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Marcadores: se crean una vez y luego solo cambia su icono (el simulador de fecha cambia color y estado sin perder el foco)
  useEffect(() => {
    const m = mapa.current
    if (!m) return
    for (const d of destinos) {
      const e = estados[d.id]
      if (!e) continue
      const sel = seleccionado === d.id
      let mk = marcas.current[d.id]
      if (!mk) {
        mk = L.marker([d.lat, d.lon], { icon: icono(d, e, sel), keyboard: true, riseOnHover: true }).addTo(m)
        mk.on('click', () => alSeleccionar.current(d.id))
        // Enter y Espacio abren la ficha, como cualquier botón (preventDefault evita que Leaflet repita con keypress)
        mk.getElement()?.addEventListener('keydown', ev => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); alSeleccionar.current(d.id) } })
        marcas.current[d.id] = mk
      } else mk.setIcon(icono(d, e, sel))
      mk.setZIndexOffset(sel ? 1000 : e.enTemporada ? 500 : 0)
      const el = mk.getElement()
      el?.setAttribute('aria-label', etiqueta(d, e))
      el?.setAttribute('aria-pressed', String(sel))
    }
    evitarChoques(Object.values(marcas.current))
  }, [destinos, estados, seleccionado])

  useEffect(() => {
    const m = mapa.current
    if (!m) return
    const d = destinos.find(x => x.id === seleccionado)
    if (d) {
      // Centra el destino en la parte visible del mapa (a la derecha del panel en escritorio, encima en móvil)
      const z = d.zoom + Z, off = window.innerWidth > ANCHO ? L.point(220, 80) : L.point(0, -170)
      m.flyTo(m.unproject(m.project([d.lat, d.lon], z).subtract(off), z), z, { duration: 0.9 })
    } else encuadrarTodos(m, destinos, true)
  }, [seleccionado, destinos])

  return (
    <div className="mapa mapa--plano" role="region" aria-label="Mapa de destinos de floración (versión alternativa)">
      <div ref={cont} className="mapa-lienzo" />
      {aviso && <p className="mapa-aviso" role="status">{aviso}</p>}
    </div>
  )
}
