import { useEffect, useRef, useState } from 'react'
import maplibregl, { type StyleSpecification } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import type { Destino } from '../lib/tipos'
import type { Estado } from '../lib/estado'
import { colorFase } from '../lib/colores'

/** Vista satélite (Esri World Imagery, sin clave) con nombres y límites de OpenFreeMap encima, como la vista satélite de Google. */
const ESTILO: StyleSpecification = {
  version: 8,
  glyphs: 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf',
  sources: {
    satelite: { type: 'raster', tileSize: 256, maxzoom: 19, attribution: 'Imágenes © Esri, Maxar, Earthstar Geographics',
      tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'] },
    omt: { type: 'vector', url: 'https://tiles.openfreemap.org/planet' },
  },
  layers: [
    { id: 'fondo', type: 'background', paint: { 'background-color': '#1B2330' } },
    { id: 'satelite', type: 'raster', source: 'satelite', paint: { 'raster-fade-duration': 200 } },
    { id: 'vias', type: 'line', source: 'omt', 'source-layer': 'transportation', minzoom: 8, filter: ['in', 'class', 'motorway', 'trunk', 'primary'], paint: { 'line-color': '#FFFFFF', 'line-opacity': 0.35, 'line-width': 1 } },
    { id: 'limites', type: 'line', source: 'omt', 'source-layer': 'boundary', filter: ['<=', 'admin_level', 4], paint: { 'line-color': '#FFFFFF', 'line-opacity': 0.5, 'line-width': 0.9, 'line-dasharray': [3, 2] } },
    { id: 'ciudades', type: 'symbol', source: 'omt', 'source-layer': 'place', filter: ['in', 'class', 'city', 'town'], minzoom: 5,
      layout: { 'text-field': ['coalesce', ['get', 'name:es'], ['get', 'name']], 'text-font': ['Noto Sans Regular'], 'text-size': 12 },
      paint: { 'text-color': '#FFFFFF', 'text-halo-color': 'rgba(0,0,0,.75)', 'text-halo-width': 1.4 } },
  ],
}

/** Vista clara u oscura según la preferencia del navegador: en oscuro se atenúa la imagen como el modo noche de Google Maps. */
const OSCURO = '(prefers-color-scheme: dark)'
function aplicarTema(m: maplibregl.Map, oscuro: boolean) {
  m.setPaintProperty('satelite', 'raster-brightness-max', oscuro ? 0.62 : 1)
  m.setPaintProperty('satelite', 'raster-saturation', oscuro ? -0.3 : 0)
  m.setPaintProperty('satelite', 'raster-contrast', oscuro ? 0.08 : 0)
  m.setPaintProperty('limites', 'line-opacity', oscuro ? 0.4 : 0.6)
}

interface Props {
  destinos: Destino[]; estados: Record<string, Estado>; seleccionado: string | null
  onSeleccionar: (id: string) => void
}

/** Resuelve `var(--token)` a su color real: las capas del mapa no entienden variables CSS. */
const resolver = (c: string) => {
  const m = c.match(/var\((--[^)]+)\)/)
  return m ? getComputedStyle(document.documentElement).getPropertyValue(m[1]).trim() || '#6F647C' : c
}

/** Dibuja la flor de seis pétalos (la marca) como imagen para el mapa; el centro de la imagen es el punto exacto. */
function imagenFlor(color: string, px = 2) {
  const t = 22 * px, c = document.createElement('canvas'); c.width = c.height = t * 2
  const g = c.getContext('2d')!
  g.translate(t, t)
  g.fillStyle = color; g.strokeStyle = 'rgba(20,14,26,.85)'; g.lineWidth = 1.2 * px
  for (let i = 0; i < 6; i++) {
    g.save(); g.rotate((i * Math.PI) / 3); g.beginPath(); g.ellipse(0, -9.5 * px, 5.2 * px, 9.5 * px, 0, 0, Math.PI * 2); g.fill(); g.stroke(); g.restore()
  }
  g.beginPath(); g.arc(0, 0, 4.4 * px, 0, Math.PI * 2); g.fillStyle = '#2B2333'; g.fill()
  g.beginPath(); g.arc(0, 0, 1.6 * px, 0, Math.PI * 2); g.fillStyle = '#FAF7F0'; g.fill() // punto exacto
  return { img: g.getImageData(0, 0, c.width, c.height), px }
}

export function MapView({ destinos, estados, seleccionado, onSeleccionar }: Props) {
  const cont = useRef<HTMLDivElement>(null)
  const mapa = useRef<maplibregl.Map | null>(null)
  const [listo, setListo] = useState(false)
  const [aviso, setAviso] = useState('')
  const alSeleccionar = useRef(onSeleccionar); alSeleccionar.current = onSeleccionar

  useEffect(() => {
    if (!cont.current) return
    const m = new maplibregl.Map({ container: cont.current, style: ESTILO, center: [-3.9, 39.9], zoom: 5.1, minZoom: 3, attributionControl: { compact: true } })
    mapa.current = m
    if (import.meta.env.DEV) (window as unknown as { __mapa?: maplibregl.Map }).__mapa = m // solo para pruebas
    m.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right')
    m.on('error', e => { if (String(e.error?.message || '').match(/fetch|Failed|NetworkError|tiles/i)) setAviso('No se pudo cargar el mapa base (sin conexión). Los destinos siguen disponibles en la lista.') })
    const mq = window.matchMedia(OSCURO)
    const alCambiarTema = (e: MediaQueryListEvent) => aplicarTema(m, e.matches)
    m.on('load', () => {
      m.addSource('destinos', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } })
      // Halo del seleccionado, centrado en el punto exacto
      m.addLayer({ id: 'destinos-sel', type: 'circle', source: 'destinos', filter: ['==', ['get', 'sel'], true],
        paint: { 'circle-radius': 27, 'circle-color': 'rgba(240,179,90,.18)', 'circle-stroke-color': '#F0B35A', 'circle-stroke-width': 2 } })
      m.addLayer({ id: 'destinos', type: 'symbol', source: 'destinos', layout: {
        'icon-image': ['get', 'icono'], 'icon-anchor': 'center', 'icon-allow-overlap': true, 'icon-ignore-placement': true,
        'icon-size': ['case', ['get', 'sel'], 1.15, 1],
        // Si dos destinos se tocan (zoom muy alejado), encima queda el seleccionado y luego el que está en temporada
        'symbol-sort-key': ['get', 'orden'],
        'text-field': ['format', ['get', 'nombre'], { 'text-font': ['literal', ['Noto Sans Bold']] }, '\n', {}, ['get', 'estado'], { 'font-scale': 0.85 }],
        'text-font': ['Noto Sans Regular'], 'text-size': 13, 'text-line-height': 1.25,
        // La etiqueta se coloca alrededor de la flor donde no choque con otras
        'text-variable-anchor': ['top', 'bottom', 'right', 'left'], 'text-radial-offset': 1.9, 'text-justify': 'auto', 'text-optional': true,
      }, paint: { 'text-color': '#FFFFFF', 'text-halo-color': 'rgba(20,14,26,.9)', 'text-halo-width': 2 } })
      m.on('click', 'destinos', e => { const id = e.features?.[0]?.properties?.id; if (id) alSeleccionar.current(id) })
      m.on('mouseenter', 'destinos', () => { m.getCanvas().style.cursor = 'pointer' })
      m.on('mouseleave', 'destinos', () => { m.getCanvas().style.cursor = '' })
      aplicarTema(m, mq.matches)
      mq.addEventListener('change', alCambiarTema)
      setListo(true)
    })
    const ancho = window.innerWidth > 859
    const b = new maplibregl.LngLatBounds()
    destinos.forEach(d => b.extend([d.lon, d.lat]))
    m.fitBounds(b, { padding: ancho ? { top: 260, bottom: 130, left: 500, right: 110 } : { top: 230, bottom: cont.current.clientHeight * 0.48 + 50, left: 80, right: 80 }, duration: 0, maxZoom: 6.5 })
    return () => { mq.removeEventListener('change', alCambiarTema); m.remove(); mapa.current = null; setListo(false) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const m = mapa.current
    if (!m || !listo) return
    const features = destinos.filter(d => estados[d.id]).map(d => {
      const e = estados[d.id], color = resolver(colorFase(d.tipo, e.faseId)), icono = `flor-${color}`
      if (!m.hasImage(icono)) { const { img, px } = imagenFlor(color); m.addImage(icono, img, { pixelRatio: px }) }
      return { type: 'Feature' as const, geometry: { type: 'Point' as const, coordinates: [d.lon, d.lat] },
        properties: { id: d.id, nombre: d.nombre.replace('Hayedo de ', ''), estado: `${e.etiqueta}${e.enTemporada ? ` · ${e.pct} %` : ''}`, icono, sel: seleccionado === d.id, orden: seleccionado === d.id ? 2 : e.enTemporada ? 1 : 0 } }
    })
    ;(m.getSource('destinos') as maplibregl.GeoJSONSource).setData({ type: 'FeatureCollection', features })
  }, [destinos, estados, seleccionado, listo])

  useEffect(() => {
    const d = destinos.find(x => x.id === seleccionado)
    // Centra el destino en la parte del mapa que queda visible (a la derecha del panel en escritorio, encima en móvil)
    if (d && mapa.current) mapa.current.easeTo({ center: [d.lon, d.lat], zoom: Math.max(mapa.current.getZoom(), 7.2), duration: 700, offset: window.innerWidth > 859 ? [220, 80] : [0, -170] })
  }, [seleccionado, destinos])

  return (
    <div className="mapa" role="region" aria-label="Mapa de destinos de floración">
      <div ref={cont} className="mapa-lienzo" />
      {/* Acceso por teclado y lector de pantalla a los puntos del mapa (visibles al recibir foco) */}
      <ul className="mapa-a11y" aria-label="Destinos en el mapa">
        {destinos.filter(d => estados[d.id]).map(d => {
          const e = estados[d.id]
          return <li key={d.id}><button className="marca" onClick={() => onSeleccionar(d.id)}>{`${d.nombre}: ${e.etiqueta}${e.enTemporada ? `, ${e.pct} %` : ''}`}</button></li>
        })}
      </ul>
      {aviso && <p className="mapa-aviso" role="status">{aviso}</p>}
    </div>
  )
}
