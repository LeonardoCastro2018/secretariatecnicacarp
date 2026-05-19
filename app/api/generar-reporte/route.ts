import { NextRequest, NextResponse } from 'next/server'

const POS_NOMBRE: Record<string, string> = {
  ARQ: 'Arquero', DFC: 'Defensor central',
  'LAT IZQ': 'Lateral izquierdo', 'LAT DER': 'Lateral derecho',
  MED: 'Mediocampista central', 'MED MIX': 'Mediocampista mixto',
  'MED OF': 'Mediocampista ofensivo', EXTR: 'Extremo', DEL: 'Delantero'
}

const TRADUCCIONES: Record<string, string> = {
  defensiveDuels_Effectiveness: 'Efectividad en duelos defensivos',
  fieldAerialDuels_Effectiveness: 'Efectividad en duelos aéreos',
  ballRecoveries: 'Recuperaciones de balón',
  interceptions: 'Interceptaciones',
  progressivePasses: 'Pases progresivos',
  offensiveDuels_Effectiveness: 'Efectividad en duelos ofensivos',
  dribbles_Effectiveness: 'Efectividad en regates',
  keyPasses: 'Pases clave',
  passesToFinalThird_Effectiveness: 'Efectividad pases último tercio',
  touchInBox: 'Toques en área rival',
  shots_Effectiveness: 'Efectividad en remates',
  goals: 'Goles',
  opponentHalfRecoveries: 'Recuperaciones en campo rival',
  gkShotsAgainst_Effectiveness: 'Efectividad ante remates',
  gkCleanSheets: 'Vallas invictas',
  gkExits: 'Salidas del arquero',
  gkAerialDuels_Effectiveness: 'Efectividad duelos aéreos (arquero)',
  aerialDuels: 'Duelos aéreos',
}

export async function POST(req: NextRequest) {
  try {
    const { jugador } = await req.json()

    if (!jugador) {
      return NextResponse.json({ error: 'Datos del jugador requeridos' }, { status: 400 })
    }

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'API key no configurada' }, { status: 500 })
    }

    // Construir listas de fortalezas y debilidades
    const percentiles = jugador.percentiles || {}
    const fortalezas: string[] = []
    const debilidades: string[] = []

    Object.entries(percentiles).forEach(([key, val]) => {
      const pct = Number(val) * 100
      const nombre = TRADUCCIONES[key] || key
      if (pct >= 70) fortalezas.push(`${nombre}: percentil ${Math.round(pct)}%`)
      if (pct < 30) debilidades.push(`${nombre}: percentil ${Math.round(pct)}%`)
    })

    const prompt = `Redactá un informe de scouting profesional en español neutro sobre el siguiente jugador de fútbol.

Evaluá su rendimiento a partir de los percentiles disponibles comparado con jugadores de su misma posición en la liga.

🟢 Solo considerá fortalezas con percentil mayor a 70%.
🔴 Solo considerá debilidades con percentil menor a 30%.

Organizá el informe en tres partes:
1. **Fortalezas**: Describí brevemente los puntos altos.
2. **Debilidades**: Mencioná las áreas con rendimiento bajo.
3. **Conclusión**: Perfil general del jugador e indicá si encaja mejor en un equipo dominante, reactivo o equilibrado.

Datos del jugador:
- Nombre: ${jugador.nombre_completo}
- Club: ${jugador.equipo}
- Posición: ${POS_NOMBRE[jugador.posicion] || jugador.posicion}
- Liga: ${jugador.liga} | Temporada: ${jugador.temporada}
- Partidos: ${jugador.partidos} | Minutos: ${Math.round(Number(jugador.minutos) || 0)}

Métricas destacadas:
${fortalezas.map(f => `- ${f} (fortaleza)`).join('\n')}
${debilidades.map(d => `- ${d} (debilidad)`).join('\n')}

Generá el informe solo en español. Sé conciso y profesional.`

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      console.error('Claude API error:', err)
      return NextResponse.json({ error: 'Error al llamar a Claude API' }, { status: 500 })
    }

    const data = await response.json()
    const texto = data.content?.[0]?.text || 'No se pudo generar el reporte.'

    return NextResponse.json({ reporte: texto })

  } catch (error) {
    console.error('Error en generar-reporte:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
