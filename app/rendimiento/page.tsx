'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const POSICIONES = ['DFC', 'ARQ', 'LAT DER', 'LAT IZQ', 'MED', 'MED MIX', 'MED OF', 'EXTR', 'DEL']
const LIGAS = ['Argentina 1A', 'Brasil A', 'Uruguay 1A', 'Colombia 1A', 'Chile 1A', 'Paraguay 1A', 'Venezuela 1A', 'Ecuador 1A', 'México 1A', 'USA MLS', 'España A', 'Italia A', 'Alemania A', 'Francia A', 'Inglaterra A', 'Copa Libertadores', 'Copa Sudamericana']
const TEMPORADAS = ['2026', '2025', '2024']

const METRICAS_POR_POS: Record<string, {key: string, label: string}[]> = {
  DFC: [
    {key:'defensiveDuels_Effectiveness', label:'% Duelos def.'},
    {key:'ballRecoveries', label:'Recuperaciones'},
    {key:'interceptions', label:'Intercepciones'},
    {key:'aerialDuels', label:'Duelos aéreos'},
    {key:'fieldAerialDuels_Effectiveness', label:'% Duelos aéreos'},
    {key:'progressivePasses', label:'Pases progresivos'},
    {key:'offensiveDuels_Effectiveness', label:'% Duelos of.'},
    {key:'goals', label:'Goles'},
  ],
  ARQ: [
    {key:'gkShotsAgainst_Effectiveness', label:'% Paradas'},
    {key:'gkCleanSheets', label:'Vallas invictas'},
    {key:'gkExits', label:'Salidas'},
    {key:'gkAerialDuels', label:'Duelos aéreos'},
    {key:'gkAerialDuels_Effectiveness', label:'% Duelos aéreos'},
  ],
  'LAT DER': [
    {key:'defensiveDuels_Effectiveness', label:'% Duelos def.'},
    {key:'fieldAerialDuels_Effectiveness', label:'% Duelos aéreos'},
    {key:'interceptions', label:'Intercepciones'},
    {key:'dribbles_Effectiveness', label:'% Regates'},
    {key:'keyPasses', label:'Pases clave'},
    {key:'passesToFinalThird_Effectiveness', label:'% Pases últ. tercio'},
    {key:'offensiveDuels_Effectiveness', label:'% Duelos of.'},
    {key:'goals', label:'Goles'},
  ],
  'LAT IZQ': [
    {key:'defensiveDuels_Effectiveness', label:'% Duelos def.'},
    {key:'fieldAerialDuels_Effectiveness', label:'% Duelos aéreos'},
    {key:'interceptions', label:'Intercepciones'},
    {key:'dribbles_Effectiveness', label:'% Regates'},
    {key:'keyPasses', label:'Pases clave'},
    {key:'passesToFinalThird_Effectiveness', label:'% Pases últ. tercio'},
    {key:'offensiveDuels_Effectiveness', label:'% Duelos of.'},
    {key:'goals', label:'Goles'},
  ],
  MED: [
    {key:'defensiveDuels_Effectiveness', label:'% Duelos def.'},
    {key:'ballRecoveries', label:'Recuperaciones'},
    {key:'interceptions', label:'Intercepciones'},
    {key:'keyPasses', label:'Pases clave'},
    {key:'passesToFinalThird_Effectiveness', label:'% Pases últ. tercio'},
    {key:'touchInBox', label:'Toques en área'},
    {key:'shots_Effectiveness', label:'% Efectividad tiro'},
    {key:'goals', label:'Goles'},
  ],
  'MED MIX': [
    {key:'ballRecoveries', label:'Recuperaciones'},
    {key:'interceptions', label:'Intercepciones'},
    {key:'keyPasses', label:'Pases clave'},
    {key:'goals', label:'Goles'},
    {key:'dribbles_Effectiveness', label:'% Regates'},
    {key:'passesToFinalThird_Effectiveness', label:'% Pases últ. tercio'},
    {key:'touchInBox', label:'Toques en área'},
    {key:'shots_Effectiveness', label:'% Efectividad tiro'},
  ],
  'MED OF': [
    {key:'keyPasses', label:'Pases clave'},
    {key:'goals', label:'Goles'},
    {key:'touchInBox', label:'Toques en área'},
    {key:'shots_Effectiveness', label:'% Efectividad tiro'},
    {key:'dribbles_Effectiveness', label:'% Regates'},
    {key:'opponentHalfRecoveries', label:'Rec. campo rival'},
    {key:'passesToFinalThird_Effectiveness', label:'% Pases últ. tercio'},
    {key:'defensiveDuels_Effectiveness', label:'% Duelos def.'},
  ],
  EXTR: [
    {key:'keyPasses', label:'Pases clave'},
    {key:'goals', label:'Goles'},
    {key:'touchInBox', label:'Toques en área'},
    {key:'shots_Effectiveness', label:'% Efectividad tiro'},
    {key:'dribbles_Effectiveness', label:'% Regates'},
    {key:'opponentHalfRecoveries', label:'Rec. campo rival'},
    {key:'passesToFinalThird_Effectiveness', label:'% Pases últ. tercio'},
    {key:'offensiveDuels_Effectiveness', label:'% Duelos of.'},
  ],
  DEL: [
    {key:'goals', label:'Goles'},
    {key:'shots_Effectiveness', label:'% Efectividad tiro'},
    {key:'offensiveDuels_Effectiveness', label:'% Duelos of.'},
    {key:'keyPasses', label:'Pases clave'},
    {key:'dribbles_Effectiveness', label:'% Regates'},
    {key:'touchInBox', label:'Toques en área'},
    {key:'opponentHalfRecoveries', label:'Rec. campo rival'},
    {key:'passesToFinalThird_Effectiveness', label:'% Pases últ. tercio'},
  ],
}

const POS_NOMBRE: Record<string, string> = {
  ARQ: 'Arquero', DFC: 'Defensor central',
  'LAT IZQ': 'Lateral izquierdo', 'LAT DER': 'Lateral derecho',
  MED: 'Mediocampista central', 'MED MIX': 'Mediocampista mixto',
  'MED OF': 'Mediocampista ofensivo', EXTR: 'Extremo', DEL: 'Delantero'
}

type Jugador = {
  id: string
  nombre_completo: string
  equipo: string
  posicion: string
  edad: number
  partidos: number
  minutos: number
  liga: string
  temporada: string
  indice_total: number
  score_defensivo: number
  score_ofensivo: number
  nacionalidad: string
  pie: string
  altura: number
  percentiles: Record<string, number>
}

function getCalColor(score: number, max: number) {
  const pct = score / max
  if (pct >= 0.67) return { bg: 'bg-green-100', text: 'text-green-800', bar: 'bg-green-500' }
  if (pct >= 0.33) return { bg: 'bg-yellow-100', text: 'text-yellow-800', bar: 'bg-yellow-500' }
  return { bg: 'bg-red-100', text: 'text-red-800', bar: 'bg-red-500' }
}

function getPctColor(pct: number) {
  if (pct >= 0.67) return 'bg-green-500'
  if (pct >= 0.33) return 'bg-yellow-500'
  return 'bg-red-500'
}

function formatReporte(texto: string) {
  if (!texto) return []
  return texto.split('\n').filter(l => l.trim()).map((line, i) => {
    const trimmed = line.trim()
    if (trimmed.startsWith('**') && trimmed.endsWith('**')) {
      return <div key={i} className="font-semibold text-gray-900 mt-3 mb-1 text-sm">{trimmed.replace(/\*\*/g, '')}</div>
    }
    if (trimmed.startsWith('* ')) {
      return <div key={i} className="text-sm text-gray-700 pl-3 py-0.5">• {trimmed.substring(2)}</div>
    }
    if (trimmed.startsWith('- ')) {
      return <div key={i} className="text-sm text-gray-700 pl-3 py-0.5">• {trimmed.substring(2)}</div>
    }
    return <p key={i} className="text-sm text-gray-700 leading-relaxed py-0.5">{trimmed}</p>
  })
}

const inputCls = "border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:border-[#C8102E]"

export default function RendimientoPage() {
  const [tab, setTab] = useState(0)
  const [posicion, setPosicion] = useState('MED OF')
  const [liga, setLiga] = useState('Argentina 1A')
  const [temporada, setTemporada] = useState('2026')
  const [jugadores, setJugadores] = useState<Jugador[]>([])
  const [loading, setLoading] = useState(false)
  const [jugadorSel, setJugadorSel] = useState<Jugador | null>(null)
  const [reporte, setReporte] = useState<string | null>(null)
  const [loadingReporte, setLoadingReporte] = useState(false)
  const [referencia, setReferencia] = useState<Jugador | null>(null)
  const [busquedaSim, setBusquedaSim] = useState('')
  const [resultadosSim, setResultadosSim] = useState<Jugador[]>([])
  const [buscandoSim, setBuscandoSim] = useState(false)
  const [metricaComp, setMetricaComp] = useState('')

  // Cargar jugadores de la liga seleccionada
  useEffect(() => { fetchJugadores() }, [posicion, liga, temporada])

  // Cargar referencia River Argentina (siempre fija)
  useEffect(() => { fetchReferenciaRiver() }, [posicion, temporada])

  // Cargar reporte cuando cambia el jugador seleccionado
  useEffect(() => { if (jugadorSel) fetchReporte(jugadorSel) }, [jugadorSel])

  useEffect(() => {
    if (METRICAS_POR_POS[posicion]?.length) setMetricaComp(METRICAS_POR_POS[posicion][0].key)
  }, [posicion])

  async function fetchJugadores() {
    setLoading(true)
    const { data } = await supabase
      .from('rendimiento_indice_datos')
      .select('*')
      .eq('posicion', posicion)
      .eq('liga', liga)
      .eq('temporada', temporada)
      .order('indice_total', { ascending: false })
      .limit(50)
    setJugadores(data || [])
    if (data?.length) setJugadorSel(data[0])
    setLoading(false)
  }

  async function fetchReferenciaRiver() {
    // Busca el mejor de River en Argentina 1A — primero en la temporada actual, si no en la anterior
    let { data } = await supabase
      .from('rendimiento_indice_datos')
      .select('*')
      .eq('posicion', posicion)
      .eq('liga', 'Argentina 1A')
      .eq('temporada', temporada)
      .ilike('equipo', '%River%')
      .order('indice_total', { ascending: false })
      .limit(1)

    // Fallback: si no hay en la temporada seleccionada, buscar en cualquier temporada
    if (!data?.length) {
      const res = await supabase
        .from('rendimiento_indice_datos')
        .select('*')
        .eq('posicion', posicion)
        .eq('liga', 'Argentina 1A')
        .ilike('equipo', '%River%')
        .order('indice_total', { ascending: false })
        .limit(1)
      data = res.data
    }
    setReferencia(data?.[0] || null)
  }

  async function fetchReporte(j: Jugador) {
    setReporte(null)
    setLoadingReporte(true)

    // 1. Buscar reporte existente en Supabase
    const { data } = await supabase
      .from('reportes_ia')
      .select('reporte')
      .ilike('nombre', `%${j.nombre_completo.split(' ').slice(0, 2).join(' ')}%`)
      .eq('posicion', j.posicion)
      .eq('temporada', j.temporada)
      .limit(1)

    if (data?.[0]?.reporte) {
      setReporte(data[0].reporte)
      setLoadingReporte(false)
      return
    }

    // 2. Si no existe, generar con la ruta API interna
    try {
      const res = await fetch('/api/generar-reporte', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jugador: j }),
      })
      const respData = await res.json()
      const textoGenerado = respData.reporte || 'No se pudo generar el reporte.'

      // Guardar en Supabase para la próxima vez
      await supabase.from('reportes_ia').insert({
        nombre: j.nombre_completo,
        club: j.equipo,
        posicion: j.posicion,
        minutos: j.minutos,
        competencia: j.liga,
        temporada: j.temporada,
        reporte: textoGenerado,
      })

      setReporte(textoGenerado)
    } catch {
      setReporte('No se pudo generar el reporte en este momento.')
    }
    setLoadingReporte(false)
  }

  async function buscarSimilitud() {
    if (!busquedaSim.trim()) return
    setBuscandoSim(true)
    const { data } = await supabase
      .from('rendimiento_indice_datos')
      .select('*')
      .ilike('nombre_completo', `%${busquedaSim}%`)
      .eq('posicion', posicion)
      .order('indice_total', { ascending: false })
      .limit(15)
    setResultadosSim(data || [])
    setBuscandoSim(false)
  }

  const maxScore = jugadores.length ? jugadores[0].indice_total : 10
  const metricas = METRICAS_POR_POS[posicion] || []
  const metricaSelObj = metricas.find(m => m.key === metricaComp) || metricas[0]

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-[#C8102E] text-white px-6 py-3 flex items-center justify-between shadow">
        <a href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-[#C8102E] text-xs font-bold">CARP</div>
          <div>
            <div className="text-sm font-medium tracking-wide uppercase">Secretaría técnica</div>
            <div className="text-xs text-red-200">Área de investigación y conocimiento</div>
          </div>
        </a>
        <span className="text-sm text-red-200">Rendimiento</span>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-6">

        {/* Filtros */}
        <div className="flex gap-3 mb-5 flex-wrap items-center">
          <select value={posicion} onChange={e => setPosicion(e.target.value)} className={inputCls}>
            {POSICIONES.map(p => <option key={p}>{p}</option>)}
          </select>
          <select value={liga} onChange={e => setLiga(e.target.value)} className={inputCls}>
            {LIGAS.map(l => <option key={l}>{l}</option>)}
          </select>
          <select value={temporada} onChange={e => setTemporada(e.target.value)} className={inputCls}>
            {TEMPORADAS.map(t => <option key={t}>{t}</option>)}
          </select>
          <span className="text-sm text-gray-500 ml-auto">{loading ? 'Cargando...' : `${jugadores.length} jugadores`}</span>
        </div>

        {/* Referencia River — siempre fija de Argentina */}
        {referencia && (
          <div className="bg-white border border-red-200 rounded-xl p-4 mb-5 flex items-center gap-4 flex-wrap">
            <div className="bg-[#C8102E] rounded-lg px-3 py-1 text-xs font-bold text-white uppercase tracking-wider flex-shrink-0">
              Referencia River
            </div>
            <div>
              <div className="font-semibold text-gray-900">{referencia.nombre_completo}</div>
              <div className="text-xs text-gray-500">{referencia.equipo} · Argentina 1A · {referencia.temporada}</div>
            </div>
            <div className="ml-auto flex items-center" style={{gap:'32px'}}>
              <div className="text-center">
                <div className="text-2xl font-bold" style={{color:'#C8102E'}}>{referencia.indice_total?.toFixed(2)}</div>
                <div className="text-xs font-semibold" style={{color:'#374151'}}>Índice total</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold" style={{color:'#1d4ed8'}}>{referencia.score_defensivo?.toFixed(2)}</div>
                <div className="text-xs font-semibold" style={{color:'#374151'}}>Defensivo</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold" style={{color:'#15803d'}}>{referencia.score_ofensivo?.toFixed(2)}</div>
                <div className="text-xs font-semibold" style={{color:'#374151'}}>Ofensivo</div>
              </div>
              <button
                onClick={() => { setJugadorSel(referencia); setTab(1) }}
                className="text-xs border px-3 py-1.5 rounded-lg transition-colors font-medium"
                style={{color:'#C8102E', borderColor:'#fca5a5'}}>
                Ver detalle →
              </button>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 bg-white border border-gray-200 rounded-xl p-1 mb-5">
          {['Índice comparativo', 'Detalle del jugador', 'Comparativo posición', 'Buscador'].map((t, i) => (
            <button key={t} onClick={() => setTab(i)}
              className={`flex-1 py-2 text-xs font-medium rounded-lg transition-colors ${tab === i ? 'bg-[#C8102E] text-white' : 'text-gray-500 hover:text-gray-700'}`}>
              {t}
            </button>
          ))}
        </div>

        {/* TAB 1 — Índice comparativo */}
        {tab === 0 && (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="flex bg-gray-50 border-b border-gray-100 px-4 py-2 text-xs font-medium text-gray-400 uppercase tracking-wider">
              <span className="w-8">#</span>
              <span className="flex-1">Jugador</span>
              <span className="w-36">Equipo</span>
              <span className="w-16 text-center">PJ</span>
              <span className="w-24 text-center">Índice</span>
              <span className="w-44">Score</span>
            </div>
            {loading ? (
              <div className="py-12 text-center text-gray-400 text-sm">Cargando...</div>
            ) : jugadores.length === 0 ? (
              <div className="py-12 text-center text-gray-400 text-sm">No hay datos para esta combinación</div>
            ) : (() => {
              const total = jugadores.length
              const tercio = Math.ceil(total / 3)
              return jugadores.map((j, idx) => {
                // Semáforo por terciles: top 33% verde, medio 33% amarillo, bottom 33% rojo
                const esVerde = idx < tercio
                const esAmarillo = idx >= tercio && idx < tercio * 2
                const bgColor = esVerde ? '#f0fdf4' : esAmarillo ? '#fefce8' : '#fff1f2'
                const badgeBg = esVerde ? '#dcfce7' : esAmarillo ? '#fef9c3' : '#fee2e2'
                const badgeColor = esVerde ? '#15803d' : esAmarillo ? '#854d0e' : '#b91c1c'
                const barColor = esVerde ? '#22c55e' : esAmarillo ? '#eab308' : '#ef4444'
                const isRiver = j.equipo?.toLowerCase().includes('river')
                const pct = Math.round(j.indice_total / maxScore * 100)
                return (
                  <div key={j.id} onClick={() => { setJugadorSel(j); setTab(1) }}
                    className="flex items-center px-4 py-2.5 border-b border-gray-50 cursor-pointer hover:opacity-90 transition-opacity"
                    style={{background: isRiver ? '#fff1f2' : bgColor}}>
                    <span className="w-8 text-xs" style={{color:'#6b7280'}}>{idx + 1}</span>
                    <span className="flex-1 text-sm font-medium text-gray-900 flex items-center gap-2 min-w-0">
                      <span className="truncate">{j.nombre_completo}</span>
                      {isRiver && <span className="text-xs text-white px-1.5 py-0.5 rounded font-medium flex-shrink-0" style={{background:'#C8102E'}}>River</span>}
                    </span>
                    <span className="w-36 text-xs text-gray-500 truncate">{j.equipo}</span>
                    <span className="w-16 text-center text-xs text-gray-600">{j.partidos}</span>
                    <span className="w-24 text-center">
                      <span className="text-xs px-2 py-0.5 rounded-full font-bold"
                        style={{background: badgeBg, color: badgeColor}}>
                        {j.indice_total?.toFixed(2)}
                      </span>
                    </span>
                    <div className="w-44 flex items-center gap-2">
                      <div className="flex-1 h-2 rounded-full overflow-hidden" style={{background:'#e5e7eb'}}>
                        <div className="h-full rounded-full" style={{width:`${pct}%`, background: barColor}}></div>
                      </div>
                      <span className="text-xs w-8 text-right" style={{color:'#6b7280'}}>{pct}%</span>
                    </div>
                  </div>
                )
              })
            })()}
          </div>
        )}

        {/* TAB 2 — Detalle del jugador */}
        {tab === 1 && (
          <div>
            <div className="flex gap-3 mb-4">
              <select value={jugadorSel?.id || ''} onChange={e => setJugadorSel(jugadores.find(j => j.id === e.target.value) || null)} className={inputCls + ' flex-1'}>
                {jugadores.map(j => <option key={j.id} value={j.id}>{j.nombre_completo} — {j.equipo}</option>)}
              </select>
            </div>

            {jugadorSel && (
              <div className="space-y-4">
                {/* Info + percentiles */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white border border-gray-200 rounded-xl p-5">
                    <div className="font-semibold text-gray-900 text-lg mb-0.5">{jugadorSel.nombre_completo}</div>
                    <div className="text-sm text-gray-500 mb-4">{jugadorSel.equipo} · {jugadorSel.liga} · {jugadorSel.temporada}</div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm mb-5">
                      {[
                        {label:'Posición', value: POS_NOMBRE[jugadorSel.posicion] || jugadorSel.posicion},
                        {label:'Edad', value: jugadorSel.edad ? `${jugadorSel.edad} años` : '—'},
                        {label:'Partidos', value: jugadorSel.partidos},
                        {label:'Minutos', value: jugadorSel.minutos ? Math.round(Number(jugadorSel.minutos)) : '—'},
                        {label:'Nacionalidad', value: jugadorSel.nacionalidad},
                        {label:'Pie hábil', value: jugadorSel.pie},
                      ].map(({label, value}) => (
                        <div key={label} className="flex items-center gap-2">
                          <span className="text-gray-500 text-xs w-20">{label}:</span>
                          <span className="text-gray-900 text-xs font-medium">{value || '—'}</span>
                        </div>
                      ))}
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        {label:'Índice total', value: jugadorSel.indice_total?.toFixed(2), color:'#C8102E'},
                        {label:'Defensivo', value: jugadorSel.score_defensivo?.toFixed(2), color:'#1d4ed8'},
                        {label:'Ofensivo', value: jugadorSel.score_ofensivo?.toFixed(2), color:'#15803d'},
                      ].map(({label, value, color}) => (
                        <div key={label} className="bg-gray-50 rounded-lg p-3 text-center border border-gray-100">
                          <div className="text-xl font-bold" style={{color}}>{value}</div>
                          <div className="text-xs font-semibold mt-0.5" style={{color:'#374151'}}>{label}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-white border border-gray-200 rounded-xl p-5">
                    <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Percentiles</div>
                    <div className="space-y-3">
                      {metricas.map(m => {
                        const pct = jugadorSel.percentiles?.[m.key] ?? null
                        const pctNum = pct !== null ? Math.round(Number(pct) * 100) : null
                        const barWidth = pctNum !== null ? Math.min(pctNum, 100) : 0
                        const colorBarra = barWidth >= 70 ? '#22c55e' : barWidth < 30 ? '#ef4444' : '#eab308'
                        const colorTexto = pctNum !== null ? (pctNum >= 70 ? '#15803d' : pctNum < 30 ? '#b91c1c' : '#111827') : '#9ca3af'
                        return (
                          <div key={m.key} className="flex items-center gap-2">
                            <span className="text-xs text-gray-900 font-medium flex-shrink-0" style={{width:'130px'}}>{m.label}</span>
                            <div className="flex-1 rounded-full overflow-hidden" style={{height:'10px', background:'#e5e7eb', minWidth:'60px'}}>
                              <div className="h-full rounded-full" style={{width:`${barWidth}%`, background: colorBarra, transition:'width 0.3s'}}></div>
                            </div>
                            <span className="text-xs font-bold flex-shrink-0" style={{width:'34px', textAlign:'right', color: colorTexto}}>
                              {pctNum !== null ? `P${pctNum}` : '—'}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>

                {/* Fortalezas y debilidades */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white border border-gray-200 rounded-xl p-5">
                    <div className="text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-2" style={{color:'#15803d'}}>
                      <div className="w-2 h-2 rounded-full" style={{background:'#22c55e'}}></div>Fortalezas (P &gt; 70)
                    </div>
                    <div className="space-y-1.5">
                      {metricas.filter(m => (jugadorSel.percentiles?.[m.key] || 0) > 0.7)
                        .sort((a, b) => (jugadorSel.percentiles?.[b.key] || 0) - (jugadorSel.percentiles?.[a.key] || 0))
                        .map(m => (
                          <div key={m.key} className="flex items-center justify-between">
                            <span className="text-sm font-medium" style={{color:'#111827'}}>{m.label}</span>
                            <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{color:'#15803d', background:'#dcfce7'}}>
                              P{Math.round((jugadorSel.percentiles?.[m.key] || 0) * 100)}
                            </span>
                          </div>
                        ))}
                      {metricas.filter(m => (jugadorSel.percentiles?.[m.key] || 0) > 0.7).length === 0 && (
                        <div className="text-gray-400 text-sm">Sin fortalezas destacadas</div>
                      )}
                    </div>
                  </div>
                  <div className="bg-white border border-gray-200 rounded-xl p-5">
                    <div className="text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-2" style={{color:'#b91c1c'}}>
                      <div className="w-2 h-2 rounded-full" style={{background:'#ef4444'}}></div>Áreas de mejora (P &lt; 30)
                    </div>
                    <div className="space-y-1.5">
                      {metricas.filter(m => (jugadorSel.percentiles?.[m.key] || 0) < 0.3)
                        .sort((a, b) => (jugadorSel.percentiles?.[a.key] || 0) - (jugadorSel.percentiles?.[b.key] || 0))
                        .map(m => (
                          <div key={m.key} className="flex items-center justify-between">
                            <span className="text-sm font-medium" style={{color:'#111827'}}>{m.label}</span>
                            <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{color:'#b91c1c', background:'#fee2e2'}}>
                              P{Math.round((jugadorSel.percentiles?.[m.key] || 0) * 100)}
                            </span>
                          </div>
                        ))}
                      {metricas.filter(m => (jugadorSel.percentiles?.[m.key] || 0) < 0.3).length === 0 && (
                        <div className="text-gray-400 text-sm">Sin áreas críticas</div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Reporte IA */}
                <div className="bg-white border border-gray-200 rounded-xl p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Análisis IA</div>
                    {loadingReporte && <div className="text-xs text-gray-400 italic">Generando reporte...</div>}
                    {reporte && !loadingReporte && (
                      <button
                        onClick={() => fetchReporte(jugadorSel)}
                        className="ml-auto text-xs text-gray-400 hover:text-gray-600 border border-gray-200 px-2 py-0.5 rounded">
                        🔄 Regenerar
                      </button>
                    )}
                  </div>
                  {loadingReporte ? (
                    <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-400 animate-pulse">
                      Buscando reporte en base de datos o generando con IA...
                    </div>
                  ) : reporte ? (
                    <div className="bg-gray-50 rounded-lg p-4">
                      {formatReporte(reporte)}
                    </div>
                  ) : (
                    <div className="text-gray-400 text-sm">No hay reporte disponible.</div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3 — Comparativo posición */}
        {tab === 2 && (
          <div>
            <div className="flex gap-3 mb-5 items-center">
              <label className="text-sm text-gray-500">Métrica:</label>
              <select value={metricaComp} onChange={e => setMetricaComp(e.target.value)} className={inputCls}>
                {metricas.map(m => <option key={m.key} value={m.key}>{m.label}</option>)}
              </select>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <div className="text-sm font-medium text-gray-700 mb-4">
                Top {Math.min(jugadores.length, 20)} — {metricaSelObj?.label} · {posicion} · {liga} {temporada}
              </div>
              <div className="space-y-2">
                {jugadores.slice(0, 20).map((j, idx) => {
                  const pct = j.percentiles?.[metricaComp]
                  const pctNum = pct !== null && pct !== undefined ? Math.round(pct * 100) : 0
                  const isRiver = j.equipo?.toLowerCase().includes('river')
                  return (
                    <div key={j.id} className="flex items-center gap-3">
                      <span className="text-xs text-gray-400 w-5 text-right">{idx + 1}</span>
                      <span className={`text-xs w-44 truncate font-medium ${isRiver ? 'text-[#C8102E]' : 'text-gray-800'}`}>{j.nombre_completo}</span>
                      <span className="text-xs text-gray-400 w-28 truncate">{j.equipo}</span>
                      <div className="flex-1 h-5 bg-gray-100 rounded overflow-hidden">
                        <div className={`h-full ${isRiver ? 'bg-[#C8102E]' : 'bg-blue-400'}`} style={{width:`${pctNum}%`}}></div>
                      </div>
                      <span className="text-xs font-semibold text-gray-700 w-10 text-right">P{pctNum}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4 — Buscador */}
        {tab === 3 && (
          <div>
            <div className="bg-white border border-gray-200 rounded-xl p-5 mb-4">
              <div className="text-sm font-medium text-gray-700 mb-3">Buscá un jugador por nombre</div>
              <div className="flex gap-3">
                <input type="text" placeholder="Ej: Galván, Driussi, Moreno..."
                  value={busquedaSim} onChange={e => setBusquedaSim(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && buscarSimilitud()}
                  className={inputCls + ' flex-1'} />
                <button onClick={buscarSimilitud} disabled={buscandoSim}
                  className="bg-[#C8102E] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#A00D24] disabled:opacity-50">
                  {buscandoSim ? 'Buscando...' : 'Buscar'}
                </button>
              </div>
              <div className="text-xs text-gray-400 mt-2">Buscando en posición: {posicion} · todas las ligas</div>
            </div>
            {resultadosSim.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  {resultadosSim.length} resultados
                </div>
                {resultadosSim.map((j, idx) => {
                  const col = getCalColor(j.indice_total, maxScore || 10)
                  const isRiver = j.equipo?.toLowerCase().includes('river')
                  return (
                    <div key={j.id} onClick={() => { setJugadorSel(j); setTab(1) }}
                      className={`flex items-center px-4 py-3 border-b border-gray-50 cursor-pointer hover:bg-gray-50 gap-3 ${isRiver ? 'bg-red-50/40' : ''}`}>
                      <span className="text-xs text-gray-400 w-6">{idx + 1}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 flex items-center gap-2">
                          <span className="truncate">{j.nombre_completo}</span>
                          {isRiver && <span className="text-xs bg-[#C8102E] text-white px-1.5 py-0.5 rounded flex-shrink-0">River</span>}
                        </div>
                        <div className="text-xs text-gray-500">{j.equipo} · {j.liga} · {j.temporada}</div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${col.bg} ${col.text}`}>{j.indice_total?.toFixed(2)}</span>
                        <span className="text-xs text-gray-400">{j.posicion}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
