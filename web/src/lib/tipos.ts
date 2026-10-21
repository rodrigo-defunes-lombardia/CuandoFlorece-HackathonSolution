export interface Hito {
  id: string; etiqueta: string; central: string; probable: [string, string]; amplia: [string, string]
  origen: string; nota: string; supuesto: boolean; revisar: boolean
  detectado_2026?: { fecha: string; confirmado: string; revisar: boolean }
}
export interface Fase { id: string; etiqueta: string; hito_inicio: string }
export interface Confianza { nivel: 'alta' | 'media' | 'baja'; anios: number; observaciones: number; texto: string }
export interface ModeloSevilla {
  base_c: number; inicio_acumulacion: string; justificacion_base: string
  bases_probadas: { base: number; umbral_pico: number; cv: number; pico_central_doy: number }[]
  umbral_pico: number; umbrales: Record<string, number>; umbral_pico_ini: number
  anios_calibracion: number[]; n_obs: number; obs_individuales: number; anios_clima: number[]
  backtest_loo: { anio: number; observado_doy: number; predicho_doy: number; error_dias: number }[]
  por_anio: Record<string, { doy_pico_ini: number | null; gdd_doy_75: number }>
  mediana_pico_ini_doy: number; serie_gdd: [number, number, number, number][]
  umbrales_lo: Record<string, number>; umbrales_hi: Record<string, number>; gd_diario: Record<string, number[]>
  meteo_hasta: string; observaciones: { fecha: string; fuente: string; calidad: string }[]
}
export interface ModeloTermico {
  tipo: 'calor' | 'frio'; inicio: string; anios: number[]; bases: number[]; hito_ref: string; dia_ref: number
  umbrales: Record<string, number>; tmed_diario: Record<string, number[]>; fuente: string; explicacion: string
  validacion?: { anio: number; desplazamiento_modelo: number; por_base: number[]; desplazamiento_cosecha_real: Record<string, number>; nota: string }
}
export interface Destino {
  id: string; nombre: string; especie: string; tipo: 'flor' | 'hayedo'; region: string
  lat: number; lon: number; temporada: number; resumen: string
  hitos: Hito[]; fases: Fase[]; fin: string; ventana: [string, string]; curva: [string, number][]
  confianza: Confianza; origenes: string[]
  modelo?: ModeloSevilla
  termico?: ModeloTermico
  historia?: {
    avance_2026: { fecha: string; pct_cortado: number; pct_probable: number }[]
    real_2026: Record<string, string | number>; emision_prediccion: string; parcelas: number
    imagenes_desde: string; imagenes_hasta: string; nota_comparacion: string
  }
  serie?: {
    color: { fecha: string; color: number; p25: number; p75: number; hoja_perdida: number; zonas: number }[]
    clima: { fecha: string; tmax: number | null; tmin: number | null; lluvia: number | null }[]
    clima_hasta: string; color_hasta: string
  }
}
export interface Datos { generado: string; hoy_demo: string; destinos: Destino[] }

export interface Observacion {
  id: string; destinoId: string; fecha: string; lat: number; lon: number; distancia_km: number
  fase: string; comentario: string; foto?: string; demo: boolean
}
export interface Alerta { id: string; destinoId: string; email: string; creada: string }
