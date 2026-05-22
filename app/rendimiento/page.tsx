'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const POSICIONES = ['DFC', 'ARQ', 'LAT DER', 'LAT IZQ', 'MED', 'MED MIX', 'MED OF', 'EXTR', 'DEL']
const LIGAS = ['Argentina 1A', 'Brasil A', 'Uruguay 1A', 'Colombia 1A', 'Chile 1A', 'Paraguay 1A', 'Venezuela 1A', 'Ecuador 1A', 'México 1A', 'USA MLS', 'España A', 'Italia A', 'Alemania A', 'Francia A', 'Inglaterra A', 'Copa Libertadores', 'Copa Sudamericana']
const TEMPORADAS = ['2026', '2025', '2024']

const MINUTOS_OPCIONES = [
  { label: 'Sin mínimo',  value: 1    },
  { label: '180 min',     value: 180  },
  { label: '450 min',     value: 450  },
  { label: '900 min',     value: 900  },
  { label: '1350 min',    value: 1350 },
  { label: '1800 min',    value: 1800 },
]

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

function formatReporte(texto: string) {
  if (!texto) return []
  return texto.split('\n').filter(l => l.trim()).map((line, i) => {
    const trimmed = line.trim()
    if (trimmed.startsWith('**') && trimmed.endsWith('**')) {
      return <div key={i} className="font-semibold text-gray-900 mt-3 mb-1 text-sm">{trimmed.replace(/\*\*/g, '')}</div>
    }
    if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
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
  const [metricaComp, setMetricaComp] = useState('')

  useEffect(() => { fetchJugadores() }, [posicion, liga, temporada])
  useEffect(() => { fetchReferenciaRiver() }, [posicion, temporada])
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
    let { data } = await supabase
      .from('rendimiento_indice_datos')
      .select('*')
      .eq('posicion', posicion)
      .eq('liga', 'Argentina 1A')
      .eq('temporada', temporada)
      .ilike('equipo', '%River%')
      .order('indice_total', { ascending: false })
      .limit(1)
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
    try {
      const res = await fetch('/api/generar-reporte', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jugador: j }),
      })
      const respData = await res.json()
      const textoGenerado = respData.reporte || 'No se pudo generar el reporte.'
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

  const maxScore = jugadores.length ? jugadores[0].indice_total : 10
  const metricas = METRICAS_POR_POS[posicion] || []

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

        {/* Filtros globales */}
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

        {/* Referencia River */}
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
              <button onClick={() => { setJugadorSel(referencia); setTab(1) }}
                className="text-xs border px-3 py-1.5 rounded-lg transition-colors font-medium"
                style={{color:'#C8102E', borderColor:'#fca5a5'}}>
                Ver detalle →
              </button>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 bg-white border border-gray-200 rounded-xl p-1 mb-5">
          {['Índice comparativo', 'Detalle del jugador', 'Comparativo posición', 'Similitud'].map((t, i) => (
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
                      <span className="text-xs px-2 py-0.5 rounded-full font-bold" style={{background: badgeBg, color: badgeColor}}>
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

                <div className="bg-white border border-gray-200 rounded-xl p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Análisis IA</div>
                    {loadingReporte && <div className="text-xs text-gray-400 italic">Generando reporte...</div>}
                    {reporte && !loadingReporte && (
                      <button onClick={() => fetchReporte(jugadorSel)}
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
                    <div className="bg-gray-50 rounded-lg p-4">{formatReporte(reporte)}</div>
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
          <ComparativoPosicion
            posicion={posicion}
            liga={liga}
            temporada={temporada}
            inputCls={inputCls}
            onVerDetalle={(j: any) => { setJugadorSel(j); setTab(1) }}
          />
        )}

        {/* TAB 4 — Similitud IA */}
        {tab === 3 && (
          <BuscadorSimilitud
            posicion={posicion}
            liga={liga}
            temporada={temporada}
            inputCls={inputCls}
            onVerDetalle={(j: any) => { setJugadorSel(j); setTab(1) }}
          />
        )}

      </div>
    </div>
  )
}

// ============================================================
// COMPONENTE: Comparativo por posición
// ============================================================
function ComparativoPosicion({ posicion, liga, temporada, inputCls, onVerDetalle }: {
  posicion: string
  liga: string
  temporada: string
  inputCls: string
  onVerDetalle: (j: any) => void
}) {
  const [metrica,         setMetrica]         = useState('')
  const [topN,            setTopN]            = useState(15)
  const [minutosMin,      setMinutosMin]      = useState(900)
  const [datos,           setDatos]           = useState<any[]>([])
  const [promedio,        setPromedio]        = useState<number>(0)
  const [metricas,        setMetricas]        = useState<{ key: string; label: string }[]>([])
  const [loading,         setLoading]         = useState(false)
  const [error,           setError]           = useState('')
  const [mostrarPromedio, setMostrarPromedio] = useState(true)

  useEffect(() => {
    fetch(`/api/comparativo?posicion=${encodeURIComponent(posicion)}`)
      .then(r => r.json())
      .then(d => {
        setMetricas(d.metricasDisponibles || [])
        setMetrica(d.metricasDisponibles?.[0]?.key || '')
      })
  }, [posicion])

  const buscar = useCallback(async () => {
    if (!metrica) return
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams({
        posicion,
        metrica,
        topN: String(topN),
        minutosMin: String(minutosMin),
        ...(liga      ? { liga }      : {}),
        ...(temporada ? { temporada } : {}),
      })
      const res  = await fetch(`/api/comparativo?${params}`)
      const data = await res.json()
      if (data.error) { setError(data.error); return }
      setDatos(data.jugadores || [])
      setPromedio(data.promedio || 0)
    } catch {
      setError('Error al cargar datos')
    } finally {
      setLoading(false)
    }
  }, [posicion, liga, temporada, metrica, topN, minutosMin])

  useEffect(() => { buscar() }, [buscar])

  const metricaLabel = metricas.find(m => m.key === metrica)?.label || metrica
  const maxValor     = datos.length > 0 ? Math.max(...datos.map(j => parseFloat(j[metrica]) || 0)) : 1

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-3 items-end">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500 uppercase tracking-wider font-medium">Métrica</label>
          <select value={metrica} onChange={e => setMetrica(e.target.value)} className={inputCls}>
            {metricas.map(m => <option key={m.key} value={m.key}>{m.label}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500 uppercase tracking-wider font-medium">Cantidad</label>
          <select value={topN} onChange={e => setTopN(parseInt(e.target.value))} className={inputCls}>
            <option value={10}>Top 10</option>
            <option value={15}>Top 15</option>
            <option value={20}>Top 20</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500 uppercase tracking-wider font-medium">Mínimo minutos</label>
          <select value={minutosMin} onChange={e => setMinutosMin(parseInt(e.target.value))} className={inputCls}>
            {MINUTOS_OPCIONES.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer pb-1">
          <input type="checkbox" checked={mostrarPromedio} onChange={e => setMostrarPromedio(e.target.checked)} className="accent-red-600" />
          Mostrar promedio
        </label>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-gray-800 font-semibold text-base">
            Top {topN} — {posicion} — {metricaLabel}
          </h3>
          {(liga || temporada) && (
            <p className="text-gray-400 text-xs mt-0.5">{[liga, temporada].filter(Boolean).join(' · ')}{minutosMin > 0 ? ` · Mín. ${minutosMin} min` : ''}</p>
          )}
        </div>
        {mostrarPromedio && promedio > 0 && (
          <div className="text-sm text-gray-500">
            Promedio: <span className="font-semibold text-amber-600">{promedio}</span>
          </div>
        )}
      </div>

      {loading && (
        <div className="flex items-center gap-3 py-8 text-gray-400 text-sm">
          <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
          Cargando datos...
        </div>
      )}
      {error && <p className="text-red-500 text-sm">{error}</p>}

      {!loading && datos.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="space-y-2">
            {datos.map((j, idx) => {
              const valor   = parseFloat(j[metrica]) || 0
              const pct     = maxValor > 0 ? (valor / maxValor) * 100 : 0
              const promPct = maxValor > 0 ? (promedio / maxValor) * 100 : 0
              const esRiver = j.equipo?.toLowerCase().includes('river')
              return (
                <div key={`${j.nombre_completo}-${idx}`} onClick={() => onVerDetalle(j)}
                  style={{display:'flex', alignItems:'center', gap:8, padding:'4px 0', cursor:'pointer'}}>
                  <span style={{fontSize:11, color:'#9ca3af', width:16, textAlign:'right', flexShrink:0}}>{idx+1}</span>
                  <div style={{width:24, height:24, borderRadius:'50%', overflow:'hidden', background:'#f3f4f6', flexShrink:0}}>
                    {j.foto_url
                      ? <img src={j.foto_url} alt="" style={{width:'100%', height:'100%', objectFit:'cover'}} />
                      : <div style={{width:'100%', height:'100%', background:'#e5e7eb'}} />}
                  </div>
                  <span style={{fontSize:12, fontWeight:500, width:150, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', flexShrink:0, color: esRiver ? '#C8102E' : '#1f2937'}}>
                    {j.nombre_completo}{esRiver ? ' ★' : ''}
                  </span>
                  <span style={{fontSize:11, color:'#9ca3af', width:110, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', flexShrink:0}}>
                    {j.equipo}
                  </span>
                  <div style={{flex:1, position:'relative', height:18, background:'#f3f4f6', borderRadius:4, overflow:'hidden'}}>
                    <div style={{height:'100%', width:`${pct}%`, backgroundColor: esRiver ? '#C8102E' : idx < 3 ? '#374151' : '#9ca3af', borderRadius:4}} />
                    {mostrarPromedio && promedio > 0 && (
                      <div style={{position:'absolute', top:0, bottom:0, left:`${promPct}%`, borderLeft:'2px dashed #f59e0b'}} />
                    )}
                  </div>
                  <span style={{fontSize:12, fontWeight:700, color:'#374151', width:36, textAlign:'right', flexShrink:0}}>
                    {valor.toFixed(2)}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {!loading && datos.length === 0 && !error && (
        <p className="text-gray-400 text-sm py-6">Sin datos para los filtros seleccionados.</p>
      )}
    </div>
  )
}

// ============================================================
// COMPONENTE: Buscador de similitud con IA
// ============================================================
function BuscadorSimilitud({ posicion, liga, temporada, inputCls, onVerDetalle }: {
  posicion: string
  liga: string
  temporada: string
  inputCls: string
  onVerDetalle: (j: any) => void
}) {
  const [modo,        setModo]        = useState<'descripcion' | 'jugador'>('descripcion')
  const [descripcion, setDescripcion] = useState('')
  const [nombreRef,   setNombreRef]   = useState('')
  const [edadMax,     setEdadMax]     = useState('')
  const [minutosMin,  setMinutosMin]  = useState(900)
  const [resultados,  setResultados]  = useState<any[]>([])
  const [explicacion, setExplicacion] = useState('')
  const [loading,     setLoading]     = useState(false)
  const [error,       setError]       = useState('')

  const buscar = async () => {
    const texto = modo === 'descripcion' ? descripcion.trim() : nombreRef.trim()
    if (!texto) return
    setLoading(true)
    setError('')
    setResultados([])
    setExplicacion('')
    try {
      const body: any = { posicion, liga, temporada, minutosMin }
      if (modo === 'descripcion') body.descripcion       = texto
      else                        body.jugadorReferencia = texto
      if (edadMax) body.edadMax = parseInt(edadMax)

      const res = await fetch('https://cdexhkzjfkvymqnuiugc.supabase.co/functions/v1/similitud', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer sb_publishable_lIPEnxinoIUAJbf07wNxWQ_PATmr67R' },
  body: JSON.stringify(body),
})
      const data = await res.json()
      if (data.error) { setError(data.error); return }
      setResultados(data.jugadores  || [])
      setExplicacion(data.explicacion || '')
    } catch {
      setError('Error al conectar con el servidor')
    } finally {
      setLoading(false)
    }
  }

  const colorSim = (p: number) =>
    p >= 85 ? '#16a34a' : p >= 70 ? '#d97706' : p >= 55 ? '#ea580c' : '#6b7280'

  return (
    <div className="space-y-5">
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        {(['descripcion', 'jugador'] as const).map(m => (
          <button key={m} onClick={() => { setModo(m); setResultados([]); setExplicacion('') }}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
              modo === m ? 'bg-[#C8102E] text-white shadow-sm' : 'text-gray-500 hover:text-gray-800'
            }`}>
            {m === 'descripcion' ? '🔍 Por descripción' : '👤 Por jugador'}
          </button>
        ))}
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
        {modo === 'descripcion' ? (
          <>
            <p className="text-sm font-medium text-gray-700">
              Describí el perfil que buscás · posición: <span className="text-red-600 font-semibold">{posicion}</span>
            </p>
            <textarea
              value={descripcion}
              onChange={e => setDescripcion(e.target.value)}
              placeholder={`Ej: Quiero un ${posicion} con alto porcentaje de recuperaciones y buena salida con el balón...`}
              rows={3}
              style={{ color: '#111827', backgroundColor: '#ffffff' }}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm placeholder-gray-400 focus:outline-none focus:border-red-500 resize-none"
            />
          </>
        ) : (
          <>
            <p className="text-sm font-medium text-gray-700">
              Nombre del jugador de referencia · posición: <span className="text-red-600 font-semibold">{posicion}</span>
            </p>
            <input
              type="text"
              value={nombreRef}
              onChange={e => setNombreRef(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && buscar()}
              placeholder="Ej: Tomás Galván"
              style={{ color: '#111827', backgroundColor: '#ffffff' }}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm placeholder-gray-400 focus:outline-none focus:border-red-500"
            />
          </>
        )}

        {/* Filtros */}
        <div className="flex flex-wrap gap-4 pt-1">
          <div className="flex items-center gap-2">
            <p className="text-sm text-gray-600 flex-shrink-0">Mínimo minutos:</p>
            <select value={minutosMin} onChange={e => setMinutosMin(parseInt(e.target.value))} className={inputCls}>
              {MINUTOS_OPCIONES.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <p className="text-sm text-gray-600 flex-shrink-0">Edad máxima:</p>
            <input
              type="number"
              value={edadMax}
              onChange={e => setEdadMax(e.target.value)}
              placeholder="Sin límite"
              min={16} max={45}
              style={{ color: '#111827', backgroundColor: '#ffffff' }}
              className="w-28 border border-gray-300 rounded-lg px-3 py-2 text-sm placeholder-gray-400 focus:outline-none focus:border-red-500"
            />
            {edadMax && (
              <button onClick={() => setEdadMax('')} className="text-xs text-gray-400 hover:text-gray-600">
                ✕
              </button>
            )}
          </div>
        </div>

        <button onClick={buscar} disabled={loading}
          className="flex items-center gap-2 px-6 py-2.5 bg-[#C8102E] hover:bg-[#A00D24] disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors">
          {loading ? (
            <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Analizando con IA...</>
          ) : (
            <>✨ Buscar jugadores similares</>
          )}
        </button>
      </div>

      {error && <p className="text-red-500 text-sm">{error}</p>}

      {explicacion && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-sm text-blue-800">
          <span className="font-semibold text-blue-600">IA: </span>{explicacion}
        </div>
      )}

      {resultados.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 text-xs font-semibold text-gray-400 uppercase tracking-wider">
            {resultados.length} jugadores encontrados
            {minutosMin > 0 ? ` · Mín. ${minutosMin} min` : ''}
            {edadMax ? ` · Edad ≤ ${edadMax} años` : ''}
          </div>
          {resultados.map((j, idx) => {
            const sim     = j.similitud ?? 0
            const col     = colorSim(sim)
            const esRiver = j.equipo?.toLowerCase().includes('river')
            return (
              <div key={`${j.nombre_completo}-${idx}`} onClick={() => onVerDetalle(j)}
                className={`flex items-center px-4 py-3 border-b border-gray-50 cursor-pointer hover:bg-gray-50 gap-3 transition-colors ${esRiver ? 'bg-red-50' : ''}`}>
                <span className="text-xs text-gray-400 w-5 text-center flex-shrink-0">{idx + 1}</span>
                <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-100 border border-gray-200 flex-shrink-0">
                  {j.foto_url
                    ? <img src={j.foto_url} alt="" className="w-full h-full object-cover" />
                    : <div className="w-full h-full bg-gray-200" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 flex items-center gap-2">
                    <span className="truncate">{j.nombre_completo}</span>
                    {esRiver && <span className="text-xs bg-[#C8102E] text-white px-1.5 py-0.5 rounded flex-shrink-0">River</span>}
                  </div>
                  <div className="text-xs text-gray-400">
                    {j.equipo}{j.edad ? ` · ${j.edad} años` : ''}{j.minutos ? ` · ${Math.round(j.minutos)} min` : ''}
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${sim}%`, backgroundColor: col }} />
                  </div>
                  <span className="text-sm font-bold w-10 text-right" style={{ color: col }}>{sim}%</span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

