import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'






// MÃ©tricas comunes a todas las posiciones de campo
const METRICAS_CAMPO: { key: string; label: string }[] = [
  { key: 'defensiveduels',                   label: 'Duelos defensivos c/90' },
  { key: 'defensiveduels_effectiveness',     label: '% Duelos defensivos' },
  { key: 'aerialduels',                      label: 'Duelos aÃ©reos c/90' },
  { key: 'fieldaerialduels_effectiveness',   label: '% Duelos aÃ©reos' },
  { key: 'offensiveduels',                   label: 'Duelos ofensivos c/90' },
  { key: 'offensiveduels_effectiveness',     label: '% Duelos ofensivos' },
  { key: 'dribbles',                         label: '1vs1 Regates c/90' },
  { key: 'dribbles_effectiveness',           label: '% 1vs1 Regates' },
  { key: 'ballrecoveries',                   label: 'Recuperaciones c/90' },
  { key: 'opponenthalfrecoveries',           label: 'Rec. campo rival c/90' },
  { key: 'interceptions',                    label: 'Interceptaciones c/90' },
  { key: 'fouls',                            label: 'Faltas c/90' },
  { key: 'keypasses',                        label: 'Pases clave c/90' },
  { key: 'progressivepasses',               label: 'Pases progresivos c/90' },
  { key: 'progressivepasses_effectiveness', label: '% Pases progresivos' },
  { key: 'passestofinalthird',              label: 'Pases Ãºlt. tercio c/90' },
  { key: 'passestofinalthird_effectiveness',label: '% Pases Ãºlt. tercio' },
  { key: 'longpasses',                      label: 'Pases largos c/90' },
  { key: 'longpasses_effectiveness',        label: '% Pases largos' },
  { key: 'crosses',                         label: 'Centros c/90' },
  { key: 'successfulcrosses',              label: 'Centros exitosos c/90' },
  { key: 'touchinbox',                      label: 'Toques en Ã¡rea c/90' },
  { key: 'shots',                           label: 'Remates c/90' },
  { key: 'shots_effectiveness',             label: '% Efectividad remates' },
  { key: 'goals',                           label: 'Goles c/90' },
  { key: 'xgshot',                          label: 'xG c/90' },
  { key: 'xgassist',                        label: 'xA c/90' },
  { key: 'assists',                         label: 'Asistencias c/90' },
]

const METRICAS_ARQ: { key: string; label: string }[] = [
  { key: 'gkshotsagainst',               label: 'Remates en contra c/90' },
  { key: 'gkshotsagainst_effectiveness', label: '% Paradas' },
  { key: 'gkaerialduels',               label: 'Duelos aÃ©reos c/90' },
  { key: 'gkaerialduels_effectiveness', label: '% Duelos aÃ©reos' },
  { key: 'gkexits',                     label: 'Salidas c/90' },
  { key: 'gkcleansheets',              label: 'Arco en cero %' },
  { key: 'xgshot',                      label: 'xG atajadas c/90' },
  { key: 'longpasses',                  label: 'Pases largos c/90' },
  { key: 'longpasses_effectiveness',    label: '% Pases largos' },
]

export const METRICAS_POR_POSICION: Record<string, { key: string; label: string }[]> = {
  ARQ:       METRICAS_ARQ,
  DFC:       METRICAS_CAMPO,
  'LAT DER': METRICAS_CAMPO,
  'LAT IZQ': METRICAS_CAMPO,
  MED:       METRICAS_CAMPO,
  'MED MIX': METRICAS_CAMPO,
  'MED OF':  METRICAS_CAMPO,
  EXTR:      METRICAS_CAMPO,
  DEL:       METRICAS_CAMPO,
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const posicion  = searchParams.get('posicion')  || 'DFC'
  const liga      = searchParams.get('liga')       || ''
  const temporada = searchParams.get('temporada')  || ''
  const metrica   = searchParams.get('metrica')    || ''
  const topN      = parseInt(searchParams.get('topN') || '15')
  const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
  if (!metrica) {
    return NextResponse.json({
      metricasDisponibles: METRICAS_POR_POSICION[posicion] || [],
      jugadores: [],
      promedio: 0,
    })
  }

  try {
    let query = supabase
      .from('rendimiento_base_datos')
      .select(`nombre_completo, equipo, posicion, liga, temporada, edad, minutos, foto_url, ${metrica}`)
      .eq('posicion', posicion)
      .gte('minutos', 500)
      .not(metrica, 'is', null)
      .order(metrica, { ascending: false })
      .limit(topN * 3)

    if (liga)      query = (query as any).eq('liga', liga)
    if (temporada) query = (query as any).eq('temporada', temporada)

    const { data, error } = await query
    if (error) throw error

    // Deduplicar por nombre
    const vistos = new Set<string>()
    const jugadoresFiltrados = (data || []).filter((j: any) => {
      if (vistos.has(j.nombre_completo)) return false
      vistos.add(j.nombre_completo)
      return true
    }).slice(0, topN)

    const valores = jugadoresFiltrados.map((j: any) => parseFloat(j[metrica]) || 0)
    const promedio = valores.length > 0
      ? valores.reduce((a: number, b: number) => a + b, 0) / valores.length
      : 0

    return NextResponse.json({
      jugadores: jugadoresFiltrados,
      promedio: Math.round(promedio * 100) / 100,
      metricasDisponibles: METRICAS_POR_POSICION[posicion] || [],
    })
  } catch (error) {
    console.error('Error comparativo:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
