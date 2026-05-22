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
      .select('*')
      .eq('posicion', posicion)
      .limit(300)

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

    const datosResumidos = jugadoresUnicos.map((j: any) => ({
      nombre:            j.nombre_completo,
      equipo:            j.equipo,
      edad:              j.edad,
      minutos:           j.minutos,
      goles:             j.goals,
      asistencias:       j.assists,
      xg:                j.xgshot,
      xa:                j.xgassist,
      remates:           j.shots,
      remates_efect:     j.shots_effectiveness,
      duelos_def:        j.defensiveduels,
      exito_duelos_def:  j.defensiveduels_effectiveness,
      duelos_of:         j.offensiveduels,
      exito_duelos_of:   j.offensiveduels_effectiveness,
      duelos_aereos:     j.aerialduels,
      exito_aereos:      j.fieldaerialduels_effectiveness,
      recuperaciones:    j.ballrecoveries,
      rec_campo_rival:   j.opponenthalfrecoveries,
      intercepciones:    j.interceptions,
      faltas:            j.fouls,
      pases_clave:       j.keypasses,
      pases_progresivos: j.progressivepasses,
      pases_ult_tercio:  j.passestofinalthird,
      pases_ult_efect:   j.passestofinalthird_effectiveness,
      pases_largos:      j.longpasses,
      pases_largos_efect:j.longpasses_effectiveness,
      regates:           j.dribbles,
      exito_regates:     j.dribbles_effectiveness,
      centros:           j.crosses,
      centros_exitosos:  j.successfulcrosses,
      toques_area:       j.touchinbox,
    }))

    const promptIA = jugadorReferencia
      ? `Sos un analista de fútbol experto. Tenés datos de jugadores en la posición ${posicion}.
         
El jugador de REFERENCIA es: "${jugadorReferencia}"

Buscá en la lista los 15 jugadores con perfil estadístico más SIMILAR. Analizá los patrones numéricos en detalle.
MUY IMPORTANTE: Solo podés incluir jugadores que estén en la lista que te doy. No inventes jugadores.

Respondé ÚNICAMENTE con este JSON (sin markdown, sin texto extra):
{"ranking":["Nombre1","Nombre2"...],"similitudes":{"Nombre1":95,"Nombre2":88,...},"explicacion":"Una oración sobre qué características definen la similitud"}

Datos (${datosResumidos.length} jugadores):
${JSON.stringify(datosResumidos)}`

      : `Sos un analista de fútbol experto. Tenés datos de jugadores en la posición ${posicion}.
         
El usuario busca jugadores con este perfil:
"${descripcion}"

Interpretá la descripción en términos estadísticos y encontrá los 15 jugadores que mejor coinciden.
MUY IMPORTANTE: Solo podés incluir jugadores que estén en la lista que te doy. No inventes jugadores.
Asigná un porcentaje de similitud del 0 al 100.

Respondé ÚNICAMENTE con este JSON (sin markdown, sin texto extra):
{"ranking":["Nombre1","Nombre2"...],"similitudes":{"Nombre1":95,"Nombre2":88,...},"explicacion":"Una oración sobre cómo interpretaste la búsqueda"}

Datos (${datosResumidos.length} jugadores):
${JSON.stringify(datosResumidos)}`

    const aiResp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type':      'application/json',
        'x-api-key':         process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model:      'claude-sonnet-4-20250514',
        max_tokens: 2000,
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
      .slice(0, 15)

    return NextResponse.json({ jugadores: rankeados, explicacion: resultado.explicacion })
  } catch (error) {
    console.error('Error similitud:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
