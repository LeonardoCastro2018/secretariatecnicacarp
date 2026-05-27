import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder'
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const NACIONALIDADES_SUD = [
  'Argentina', 'Uruguay', 'Colombia', 'Chile', 'Paraguay',
  'Venezuela', 'Ecuador', 'Peru', 'Bolivia',
  // variantes con tilde
  'Perú',
]

const PESOS: Record<string, Record<string, number>> = {
  ARQ: {
    gkshotsagainst:               1.1,
    gkshotsagainst_effectiveness: 2.1,
    gkexits:                      1.4,
    gkcleansheets:                2.7,
    gkaerialduels:                1.1,
    gkaerialduels_effectiveness:  1.6,
  },
  DFC: {
    defensiveduels:                  0.5,
    defensiveduels_effectiveness:    1.1,
    aerialduels:                     0.4,
    fieldaerialduels_effectiveness:  0.8,
    ballrecoveries:                  2.2,
    interceptions:                   1.0,
    dribbles:                        0.4,
    dribblesagainst_effectiveness:   0.9,
    progressivepasses:               0.3,
    progressivepasses_effectiveness: 0.6,
    offensiveduels:                  0.5,
    offensiveduels_effectiveness:    1.1,
    goals:                           0.2,
  },
  'LAT DER': {
    defensiveduels:                    0.5,
    defensiveduels_effectiveness:      2.3,
    aerialduels:                       0.5,
    fieldaerialduels_effectiveness:    1.5,
    interceptions:                     1.2,
    dribbles:                          0.35,
    dribbles_effectiveness:            0.8,
    keypasses:                         1.0,
    passestofinalthird:                0.25,
    passestofinalthird_effectiveness:  0.5,
    offensiveduels:                    0.3,
    offensiveduels_effectiveness:      0.6,
    goals:                             0.2,
  },
  'LAT IZQ': {
    defensiveduels:                    0.5,
    defensiveduels_effectiveness:      2.3,
    aerialduels:                       0.5,
    fieldaerialduels_effectiveness:    1.5,
    interceptions:                     1.2,
    dribbles:                          0.35,
    dribbles_effectiveness:            0.8,
    keypasses:                         1.0,
    passestofinalthird:                0.25,
    passestofinalthird_effectiveness:  0.5,
    offensiveduels:                    0.3,
    offensiveduels_effectiveness:      0.6,
    goals:                             0.2,
  },
  MED: {
    defensiveduels:                    0.5,
    defensiveduels_effectiveness:      2.0,
    aerialduels:                       0.5,
    fieldaerialduels_effectiveness:    1.2,
    ballrecoveries:                    1.2,
    interceptions:                     0.6,
    passestofinalthird:                0.15,
    passestofinalthird_effectiveness:  0.35,
    dribbles:                          0.3,
    dribbles_effectiveness:            0.65,
    keypasses:                         0.6,
    touchinbox:                        0.25,
    shots_effectiveness:               0.45,
    goals:                             0.2,
    offensiveduels:                    0.35,
    offensiveduels_effectiveness:      0.7,
  },
  'MED MIX': {
    defensiveduels:                    0.3,
    defensiveduels_effectiveness:      0.65,
    interceptions:                     0.8,
    ballrecoveries:                    1.25,
    passestofinalthird:                0.25,
    passestofinalthird_effectiveness:  0.65,
    dribbles:                          0.4,
    dribbles_effectiveness:            0.9,
    touchinbox:                        0.4,
    shots_effectiveness:               0.9,
    goals:                             1.5,
    offensiveduels:                    0.15,
    offensiveduels_effectiveness:      0.45,
    keypasses:                         1.4,
  },
  'MED OF': {
    defensiveduels:                    0.3,
    defensiveduels_effectiveness:      0.65,
    interceptions:                     0.8,
    opponenthalfrecoveries:            1.25,
    passestofinalthird:                0.25,
    passestofinalthird_effectiveness:  0.65,
    dribbles:                          0.4,
    dribbles_effectiveness:            0.9,
    touchinbox:                        0.4,
    shots_effectiveness:               0.9,
    goals:                             1.5,
    offensiveduels:                    0.15,
    offensiveduels_effectiveness:      0.45,
    keypasses:                         1.4,
  },
  EXTR: {
    defensiveduels:                    0.3,
    defensiveduels_effectiveness:      0.8,
    interceptions:                     0.4,
    opponenthalfrecoveries:            1.5,
    passestofinalthird:                0.25,
    passestofinalthird_effectiveness:  0.5,
    touchinbox:                        0.65,
    shots_effectiveness:               1.0,
    goals:                             1.45,
    offensiveduels:                    0.3,
    offensiveduels_effectiveness:      0.6,
    dribbles:                          0.35,
    dribbles_effectiveness:            0.7,
    keypasses:                         1.2,
  },
  DEL: {
    defensiveduels:                  0.2,
    defensiveduels_effectiveness:    0.4,
    ballrecoveries:                  0.5,
    aerialduels:                     0.2,
    fieldaerialduels_effectiveness:  0.7,
    offensiveduels:                  0.4,
    offensiveduels_effectiveness:    0.8,
    shots:                           0.7,
    shots_effectiveness:             1.4,
    goals:                           2.1,
    dribbles:                        0.5,
    dribbles_effectiveness:          1.0,
    keypasses:                       1.1,
  },
}

function calcularSimilitud(ref: any, candidato: any, pesos: Record<string, number>): number {
  let sumaPesos = 0
  let sumaDistancias = 0

  for (const [metrica, peso] of Object.entries(pesos)) {
    const vRef = parseFloat(ref[metrica]) || 0
    const vCan = parseFloat(candidato[metrica]) || 0
    if (vRef === 0 && vCan === 0) continue

    const max = Math.max(Math.abs(vRef), Math.abs(vCan), 0.001)
    const distancia = Math.abs(vRef - vCan) / max
    sumaDistancias += distancia * peso
    sumaPesos += peso
  }

  if (sumaPesos === 0) return 0
  const similitudRaw = 1 - (sumaDistancias / sumaPesos)
  return Math.round(Math.max(0, Math.min(100, similitudRaw * 100)))
}

export async function POST(req: NextRequest) {
  try {
    const { descripcion, jugadorReferencia, posicion, ligas, temporada, edadMax, minutosMin } = await req.json()

    const pesos = PESOS[posicion] || {}
    const metricas = Object.keys(pesos)
    const selectCols = [
      'nombre_completo', 'equipo', 'edad', 'minutos', 'foto_url',
      'liga', 'temporada', 'nacionalidad',
      ...metricas
    ].join(', ')

    // Traer jugadores ? sin filtro de liga si ligas es vacío o "todas"
    let query = supabase
      .from('rendimiento_base_datos')
      .select(selectCols)
      .eq('posicion', posicion)
      .in('nacionalidad', NACIONALIDADES_SUD)

    if (minutosMin && minutosMin > 0) query = (query as any).gte('minutos', minutosMin)
    if (temporada) query = (query as any).eq('temporada', temporada)
    if (edadMax) query = (query as any).lte('edad', edadMax)
    if (ligas && ligas.length > 0) query = (query as any).in('liga', ligas)

    query = (query as any).limit(500)

    const { data: jugadores, error } = await query
    if (error) throw error

    // Deduplicar por nombre
    const vistos = new Set<string>()
    const jugadoresUnicos = (jugadores || []).filter((j: any) => {
      if (vistos.has(j.nombre_completo)) return false
      vistos.add(j.nombre_completo)
      return true
    })

    let rankeados: any[] = []

    if (jugadorReferencia) {
      // Modo: por jugador de referencia ? buscar el jugador en la base
      const jugRef = jugadoresUnicos.find((j: any) =>
        j.nombre_completo?.toLowerCase().includes(jugadorReferencia.toLowerCase())
      )

      if (!jugRef) {
        // Si no está en sudamericanos, buscarlo sin filtro de nacionalidad
        const { data: refData } = await supabase
          .from('rendimiento_base_datos')
          .select(selectCols)
          .eq('posicion', posicion)
          .ilike('nombre_completo', `%${jugadorReferencia}%`)
          .limit(1)

        const refJugador = refData?.[0]
        if (!refJugador) {
          return NextResponse.json({ error: `No se encontró el jugador "${jugadorReferencia}"` }, { status: 404 })
        }

        rankeados = jugadoresUnicos
          .map((j: any) => ({ ...j, similitud: calcularSimilitud(refJugador, j, pesos) }))
          .filter((j: any) => j.nombre_completo !== refJugador.nombre_completo)
          .sort((a: any, b: any) => b.similitud - a.similitud)
          .slice(0, 20)
      } else {
        rankeados = jugadoresUnicos
          .map((j: any) => ({ ...j, similitud: calcularSimilitud(jugRef, j, pesos) }))
          .filter((j: any) => j.nombre_completo !== jugRef.nombre_completo)
          .sort((a: any, b: any) => b.similitud - a.similitud)
          .slice(0, 20)
      }
    } else {
      // Modo: por descripción ? usar IA para interpretar y rankear
      const datosResumidos = jugadoresUnicos.slice(0, 100).map((j: any) => {
        const obj: any = { n: j.nombre_completo, e: j.equipo, edad: j.edad }
        for (const m of metricas) obj[m] = j[m]
        return obj
      })

      const promptIA = `Analista de fútbol. Posición: ${posicion}. 
Perfil buscado: "${descripcion}"
Métricas disponibles con sus pesos de importancia: ${JSON.stringify(pesos)}

Analizá cada jugador y devolvé los 15 que mejor coinciden con el perfil.
Solo usá nombres exactos de la lista. JSON sin markdown:
{"ranking":["nombre1","nombre2"],"explicacion":"En 2 oraciones simples explica que caracteristicas futbolisticas comparten estos jugadores que los hace similares al perfil buscado. Sin markdown ni hashtags."}

Jugadores: ${JSON.stringify(datosResumidos)}`

      const aiResp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY!,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 600,
          messages: [{ role: 'user', content: promptIA }],
        }),
      })

      const aiData = await aiResp.json()
      const texto = aiData.content?.[0]?.text || '{}'
      let resultado: any = { ranking: [], explicacion: '' }
      try { resultado = JSON.parse(texto.replace(/```json|```/g, '').trim()) } catch {}

      rankeados = (resultado.ranking || [])
        .map((nombre: string) => {
          const j = jugadoresUnicos.find((p: any) =>
            p.nombre_completo?.toLowerCase().includes(nombre.toLowerCase())
          )
          return j ? { ...j, similitud: calcularSimilitud(jugadoresUnicos[0], j, pesos) } : null
        })
        .filter(Boolean)
        .slice(0, 20)

      return NextResponse.json({ jugadores: rankeados, explicacion: resultado.explicacion })
    }

    // Para modo jugador, generar explicación con IA del top 5
    const top5 = rankeados.slice(0, 5).map((j: any) => j.nombre_completo).join(', ')
    let explicacion = ''
    try {
      const aiResp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY!,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 200,
          messages: [{
            role: 'user',
            content: `Eres un analista de futbol. El jugador de referencia es ${jugadorReferencia} (${posicion}). Las caracteristicas mas valoradas para esta posicion son: ${Object.entries(pesos).sort((a,b)=>b[1]-a[1]).slice(0,4).map(([k,v])=>k).join(", ")}. En 2 oraciones explica cuales son los puntos fuertes de ${jugadorReferencia} en esas caracteristicas y por que los jugadores encontrados se le asemejan. Sin markdown ni hashtags.`
          }],
        }),
      })
      const aiData = await aiResp.json()
      explicacion = aiData.content?.[0]?.text || ''
    } catch {}

    return NextResponse.json({ jugadores: rankeados, explicacion })

  } catch (error) {
    console.error('Error similitud:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

