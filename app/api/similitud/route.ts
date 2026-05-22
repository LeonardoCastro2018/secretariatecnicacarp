import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const { descripcion, jugadorReferencia, posicion, liga, temporada, edadMax, minutosMin } = await req.json()

    let query = supabase
      .from('rendimiento_base_datos')
      .select('nombre_completo, equipo, edad, minutos, goals, assists, shots_effectiveness, defensiveduels_effectiveness, offensiveduels_effectiveness, fieldaerialduels_effectiveness, ballrecoveries, interceptions, keypasses, dribbles_effectiveness, touchinbox, xgshot, xgassist, foto_url, liga, temporada')
      .eq('posicion', posicion)
      .limit(60)

    if (minutosMin && minutosMin > 0) query = (query as any).gte('minutos', minutosMin)
    if (liga)      query = (query as any).eq('liga', liga)
    if (temporada) query = (query as any).eq('temporada', temporada)
    if (edadMax)   query = (query as any).lte('edad', edadMax)

    const { data: jugadores, error } = await query
    if (error) throw error

    // Deduplicar por nombre
    const vistos = new Set<string>()
    const jugadoresUnicos = (jugadores || []).filter((j: any) => {
      if (vistos.has(j.nombre_completo)) return false
      vistos.add(j.nombre_completo)
      return true
    })

    // Solo los campos más importantes para la IA — menos tokens = más rápido
    const datosResumidos = jugadoresUnicos.map((j: any) => ({
      n: j.nombre_completo,
      e: j.equipo,
      edad: j.edad,
      min: Math.round(j.minutos || 0),
      gol: j.goals,
      ast: j.assists,
      xg: j.xgshot,
      xa: j.xgassist,
      rem: j.shots_effectiveness,
      ddef: j.defensiveduels_effectiveness,
      dof: j.offensiveduels_effectiveness,
      aer: j.fieldaerialduels_effectiveness,
      rec: j.ballrecoveries,
      int: j.interceptions,
      pk: j.keypasses,
      reg: j.dribbles_effectiveness,
      tbox: j.touchinbox,
    }))

    const promptIA = jugadorReferencia
      ? `Analista de fútbol. Posición: ${posicion}. Referencia: "${jugadorReferencia}".
Encontrá los 10 jugadores más similares estadísticamente.
Solo usá jugadores de esta lista. JSON sin markdown:
{"ranking":["n1","n2"...],"similitudes":{"n1":95,...},"explicacion":"1 oración"}
Datos: ${JSON.stringify(datosResumidos)}`
      : `Analista de fútbol. Posición: ${posicion}. Perfil buscado: "${descripcion}".
Encontrá los 10 jugadores que mejor coinciden.
Solo usá jugadores de esta lista. JSON sin markdown:
{"ranking":["n1","n2"...],"similitudes":{"n1":95,...},"explicacion":"1 oración"}
Datos: ${JSON.stringify(datosResumidos)}`

    const aiResp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type':      'application/json',
        'x-api-key':         process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model:      'claude-haiku-4-5-20251001',
        max_tokens: 800,
        messages:   [{ role: 'user', content: promptIA }],
      }),
    })

    const aiData = await aiResp.json()
    const texto  = aiData.content?.[0]?.text || '{}'

    let resultado: { ranking: string[]; similitudes: Record<string, number>; explicacion: string } = {
      ranking: [], similitudes: {}, explicacion: '',
    }
    try {
      resultado = JSON.parse(texto.replace(/```json|```/g, '').trim())
    } catch {
      console.error('JSON parse error:', texto)
    }

    const rankeados = resultado.ranking
      .map((nombre: string) => {
        const j = jugadoresUnicos.find((p: any) => p.nombre_completo === nombre)
        return j ? { ...j, similitud: resultado.similitudes[nombre] ?? 0 } : null
      })
      .filter(Boolean)
      .slice(0, 10)

    return NextResponse.json({ jugadores: rankeados, explicacion: resultado.explicacion })
  } catch (error) {
    console.error('Error similitud:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
