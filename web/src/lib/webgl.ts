/** ¿Puede este navegador crear un contexto WebGL? Se prueba en un lienzo temporal antes de crear el mapa 3D
 *  (`maplibregl.supported` ya no existe). Equipos de empresa, máquinas virtuales o escritorios remotos suelen tenerlo desactivado. */
export function hayWebGL(): boolean {
  try {
    const c = document.createElement('canvas')
    const gl = (c.getContext('webgl2') ?? c.getContext('webgl')) as WebGLRenderingContext | null
    if (!gl) return false
    gl.getExtension('WEBGL_lose_context')?.loseContext() // libera el contexto de prueba
    return true
  } catch {
    return false
  }
}

/** Qué mapa se pinta: el 3D (MapLibre, WebGL), el alternativo (Leaflet, sin WebGL) o ninguno (solo la lista). */
export type ModoMapa = 'gl' | 'plano' | 'lista'
