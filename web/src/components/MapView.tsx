import { useEffect, useRef, useState } from 'react'
import maplibregl, { type StyleSpecification } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import type { Destino } from '../lib/tipos'
import type { Estado } from '../lib/estado'
import { colorFase } from '../lib/colores'
import { florHtml } from './Flor'

/** Estilo oscuro propio sobre las teselas vectoriales de OpenFreeMap (sin API key). */
const ESTILO: StyleSpecification = {
  version: 8,
  glyphs: 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf',
  sources: { omt: { type: 'vector', url: 'https://tiles.openfreemap.org/planet' } },
  layers: [
    { id: 'fondo', type: 'background', paint: { 'background-color': '#241D2C' } },
    { id: 'verde', type: 'fill', source: 'omt', 'source-layer': 'landcover', filter: ['in', 'class', 'wood', 'grass', 'farmland'], paint: { 'fill-color': '#2E2A36', 'fill-opacity': 0.9 } },
    { id: 'parques', type: 'fill', source: 'omt', 'source-layer': 'park', paint: { 'fill-color': '#332B3D', 'fill-opacity': 0.7 } },
    { id: 'agua', type: 'fill', source: 'omt', 'source-layer': 'water', paint: { 'fill-color': '#1A1520' } },
    { id: 'vias', type: 'line', source: 'omt', 'source-layer': 'transportation', minzoom: 7, filter: ['in', 'class', 'motorway', 'trunk', 'primary'], paint: { 'line-color': '#4A3F57', 'line-width': 0.8 } },
    { id: 'limites', type: 'line', source: 'omt', 'source-layer': 'boundary', filter: ['<=', 'admin_level', 4], paint: { 'line-color': '#6A5B7B', 'line-width': 0.8, 'line-dasharray': [3, 2] } },
    { id: 'ciudades', type: 'symbol', source: 'omt', 'source-layer': 'place', filter: ['in', 'class', 'city', 'town'], minzoom: 5,
      layout: { 'text-field': ['get', 'name:es'], 'text-font': ['Noto Sans Regular'], 'text-size': 12 },
      paint: { 'text-color': '#9C91A9', 'text-halo-color': '#241D2C', 'text-halo-width': 1.2 } },
  ],
}

interface Props {
  destinos: Destino[]; estados: Record<string, Estado>; seleccionado: string | null
  onSeleccionar: (id: string) => void
}

export function MapView({ destinos, estados, seleccionado, onSeleccionar }: Props) {
  const cont = useRef<HTMLDivElement>(null)
  const mapa = useRef<maplibregl.Map | null>(null)
  const marcas = useRef<Record<string, HTMLButtonElement>>({})
  const [aviso, setAviso] = useState('')

  useEffect(() => {
    if (!cont.current) return
    const m = new maplibregl.Map({ container: cont.current, style: ESTILO, center: [-3.9, 39.9], zoom: 5.1, minZoom: 4, attributionControl: { compact: true } })
    mapa.current = m
    m.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right')
    m.on('error', e => { if (String(e.error?.message || '').match(/fetch|Failed|NetworkError|tiles/i)) setAviso('No se pudo cargar el mapa base (sin conexión). Los destinos siguen disponibles.') })
    for (const d of destinos) {
      const el = document.createElement('button')
      el.type = 'button'; el.className = 'marca'
      el.addEventListener('click', () => onSeleccionar(d.id))
      new maplibregl.Marker({ element: el, anchor: 'bottom' }).setLngLat([d.lon, d.lat]).addTo(m)
      marcas.current[d.id] = el
    }
    const ancho = window.innerWidth > 859
    const b = new maplibregl.LngLatBounds()
    destinos.forEach(d => b.extend([d.lon, d.lat]))
    m.fitBounds(b, { padding: ancho ? { top: 90, bottom: 200, left: 480, right: 80 } : { top: 170, bottom: window.innerHeight * 0.5, left: 40, right: 40 }, duration: 0, maxZoom: 6.5 })
    return () => { m.remove(); mapa.current = null }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    for (const d of destinos) {
      const el = marcas.current[d.id], e = estados[d.id]
      if (!el || !e) continue
      el.style.setProperty('--c', colorFase(d.tipo, e.faseId))
      el.className = `marca${seleccionado === d.id ? ' marca--sel' : ''}${e.enTemporada ? '' : ' marca--fuera'}`
      el.setAttribute('aria-label', `${d.nombre}: ${e.etiqueta}${e.enTemporada ? `, ${e.pct} %` : ''}`)
      el.innerHTML = `${florHtml(38)}<span class="marca-txt"><b>${d.nombre.replace('Hayedo de ', '')}</b><i>${e.etiqueta}${e.enTemporada ? ` · ${e.pct} %` : ''}</i></span>`
    }
  }, [destinos, estados, seleccionado])

  useEffect(() => {
    const d = destinos.find(x => x.id === seleccionado)
    if (d && mapa.current) mapa.current.easeTo({ center: [d.lon, d.lat], zoom: Math.max(mapa.current.getZoom(), 7.2), duration: 700, offset: window.innerWidth > 800 ? [-170, 0] : [0, -120] })
  }, [seleccionado, destinos])

  return (
    <div className="mapa" role="region" aria-label="Mapa de destinos de floración">
      <div ref={cont} className="mapa-lienzo" />
      {aviso && <p className="mapa-aviso" role="status">{aviso}</p>}
    </div>
  )
}
