'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useParams } from 'next/navigation'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type Informe = {
  id: string
  scout_nombre: string
  fecha_informe: string
  historia: string
  informe_tecnico: string
  informe_sa: string
  calificacion: number
  video_url: string
  caracteristicas_destacadas: string[]
}

type Jugador = {
  id: string
  nombre: string
  apellido: string
  club_actual: string
  liga: string
  posicion_principal: string
  posicion_secundaria: string
  rol: string
  fecha_nacimiento: string
  nacionalidad: string
  pie_habil: string
  altura_cm: number
  fin_contrato: string
  clausula_rescision_usd: number
  representante: string
  foto_url: string
  caracteristicas: string[]
  informes_scouting: Informe[]
}

function calcularEdad(fechaNac: string) {
  if (!fechaNac) return null
  return Math.floor((Date.now() - new Date(fechaNac).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
}

function getCalColor(cal: number) {
  if (cal >= 8) return 'bg-green-100 text-green-800'
  if (cal >= 6) return 'bg-yellow-100 text-yellow-800'
  return 'bg-red-100 text-red-800'
}

function formatFecha(fecha: string) {
  if (!fecha) return '—'
  return new Date(fecha).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function getYoutubeId(url: string) {
  if (!url) return null
  if (url.includes('youtu.be/')) return url.split('youtu.be/')[1]?.split('?')[0]
  if (url.includes('v=')) return url.split('v=')[1]?.split('&')[0]
  return null
}

const POSICIONES_LISTA = [
  'Arquero',
  'Defensor central', 'Lateral izquierdo', 'Lateral derecho',
  'Volante defensivo', 'Mediocampista', 'Volante mixto', 'Volante mixto izquierdo',
  'Media punta', 'Media punta izquierdo', 'Media punta derecho',
  'Extremo izquierdo', 'Extremo derecho',
  'Delantero', 'Delantero centro', 'Segundo delantero',
]

const COORDS: Record<string, { x: number; y: number }> = {
  'Arquero': { x: 50, y: 88 },
  'Defensor central': { x: 50, y: 72 }, 'DC': { x: 50, y: 72 }, 'Defensor': { x: 50, y: 72 },
  'Lateral izquierdo': { x: 18, y: 68 }, 'LI': { x: 18, y: 68 }, 'Lateral': { x: 25, y: 68 },
  'Lateral derecho': { x: 82, y: 68 }, 'LD': { x: 82, y: 68 },
  'Volante defensivo': { x: 50, y: 58 }, 'MCD': { x: 50, y: 58 },
  'Mediocampista': { x: 50, y: 52 }, 'Volante': { x: 50, y: 52 }, 'MC': { x: 50, y: 50 },
  'Volante mixto': { x: 35, y: 50 }, 'Volante mixto izquierdo': { x: 28, y: 50 },
  'Media punta': { x: 50, y: 38 }, 'AM': { x: 50, y: 38 },
  'Media punta izquierdo': { x: 35, y: 38 }, 'Media punta derecho': { x: 65, y: 38 },
  'Extremo izquierdo': { x: 14, y: 32 }, 'Extremo': { x: 18, y: 32 },
  'Extremo derecho': { x: 86, y: 32 },
  'Delantero': { x: 50, y: 22 }, 'Delantero centro': { x: 50, y: 22 },
  'Segundo delantero': { x: 35, y: 25 }, 'SD': { x: 35, y: 25 },
}

function MapaCampo({ posicion, posicionSecundaria, small = false }: { posicion: string; posicionSecundaria?: string; small?: boolean }) {
  const c1 = COORDS[posicion] || { x: 50, y: 50 }
  const c2 = posicionSecundaria ? COORDS[posicionSecundaria] : null
  const maxW = small ? '110px' : '130px'
  return (
    <svg viewBox="0 0 100 120" style={{width: '100%', maxWidth: maxW}} xmlns="http://www.w3.org/2000/svg">
      <rect x="5" y="5" width="90" height="110" rx="3" fill="#2d8f4e" />
      <rect x="10" y="10" width="80" height="100" rx="1" fill="none" stroke="white" strokeWidth="0.8" opacity="0.6" />
      <line x1="10" y1="60" x2="90" y2="60" stroke="white" strokeWidth="0.8" opacity="0.6" />
      <circle cx="50" cy="60" r="12" fill="none" stroke="white" strokeWidth="0.8" opacity="0.6" />
      <rect x="30" y="10" width="40" height="15" fill="none" stroke="white" strokeWidth="0.8" opacity="0.6" />
      <rect x="30" y="95" width="40" height="15" fill="none" stroke="white" strokeWidth="0.8" opacity="0.6" />
      <circle cx={c1.x} cy={c1.y} r="5" fill="#C8102E" stroke="white" strokeWidth="1.5" />
      {c2 && <circle cx={c2.x} cy={c2.y} r="4" fill="white" stroke="#C8102E" strokeWidth="1.5" opacity="0.9" />}
    </svg>
  )
}

const inputCls = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-[#C8102E] placeholder-gray-400 bg-white"
const textareaCls = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-[#C8102E] placeholder-gray-400 resize-none bg-white"

export default function FichaJugador() {
  const params = useParams()
  const [jugador, setJugador] = useState<Jugador | null>(null)
  const [loading, setLoading] = useState(true)
  const [tabActiva, setTabActiva] = useState(0)
  const [modalInforme, setModalInforme] = useState(false)
  const [editandoFoto, setEditandoFoto] = useState(false)
  const [editandoPosicion, setEditandoPosicion] = useState(false)
  const [editandoDatos, setEditandoDatos] = useState(false)
  const [nuevaFotoUrl, setNuevaFotoUrl] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [guardandoDatos, setGuardandoDatos] = useState(false)
  const [informeEditando, setInformeEditando] = useState<Informe | null>(null)
  const [posEdit, setPosEdit] = useState({ principal: '', secundaria: '' })
  const [formInforme, setFormInforme] = useState({
    scout_nombre: '', historia: '', informe_tecnico: '', calificacion: '', video_url: '',
  })
  const [formDatos, setFormDatos] = useState({
    nombre: '', apellido: '', club_actual: '', liga: '',
    fecha_nacimiento: '', nacionalidad: '', pie_habil: 'Derecho',
    altura_cm: '', fin_contrato: '', clausula_rescision_usd: '', representante: '',
  })

  useEffect(() => {
    if (params?.id) fetchJugador(params.id as string)
  }, [params?.id])

  async function fetchJugador(id: string) {
    setLoading(true)
    const { data, error } = await supabase
      .from('jugadores')
      .select('*, informes_scouting (id, scout_nombre, fecha_informe, historia, informe_tecnico, informe_sa, calificacion, video_url, caracteristicas_destacadas)')
      .eq('id', id).single()
    if (!error && data) setJugador(data)
    setLoading(false)
  }

  function abrirEditarPosicion() {
    if (!jugador) return
    setPosEdit({ principal: jugador.posicion_principal || '', secundaria: jugador.posicion_secundaria || '' })
    setEditandoPosicion(true)
  }

  async function guardarPosicion() {
    if (!jugador) return
    await supabase.from('jugadores').update({
      posicion_principal: posEdit.principal || null,
      posicion_secundaria: posEdit.secundaria || null,
    }).eq('id', jugador.id)
    setEditandoPosicion(false)
    fetchJugador(jugador.id)
  }

  function abrirEditarDatos() {
    if (!jugador) return
    setFormDatos({
      nombre: jugador.nombre || '',
      apellido: jugador.apellido || '',
      club_actual: jugador.club_actual || '',
      liga: jugador.liga || '',
      fecha_nacimiento: jugador.fecha_nacimiento || '',
      nacionalidad: jugador.nacionalidad || '',
      pie_habil: jugador.pie_habil || 'Derecho',
      altura_cm: jugador.altura_cm ? String(jugador.altura_cm) : '',
      fin_contrato: jugador.fin_contrato || '',
      clausula_rescision_usd: jugador.clausula_rescision_usd ? String(jugador.clausula_rescision_usd) : '',
      representante: jugador.representante || '',
    })
    setEditandoDatos(true)
  }

  async function guardarDatos() {
    if (!jugador || !formDatos.nombre || !formDatos.apellido) {
      alert('Nombre y apellido son obligatorios')
      return
    }
    setGuardandoDatos(true)
    await supabase.from('jugadores').update({
      nombre: formDatos.nombre,
      apellido: formDatos.apellido,
      club_actual: formDatos.club_actual || null,
      liga: formDatos.liga || null,
      fecha_nacimiento: formDatos.fecha_nacimiento || null,
      nacionalidad: formDatos.nacionalidad || null,
      pie_habil: formDatos.pie_habil || null,
      altura_cm: formDatos.altura_cm ? parseInt(formDatos.altura_cm) : null,
      fin_contrato: formDatos.fin_contrato || null,
      clausula_rescision_usd: formDatos.clausula_rescision_usd ? parseFloat(formDatos.clausula_rescision_usd) : null,
      representante: formDatos.representante || null,
    }).eq('id', jugador.id)
    setGuardandoDatos(false)
    setEditandoDatos(false)
    fetchJugador(jugador.id)
  }

  function abrirNuevoInforme() {
    setInformeEditando(null)
    setFormInforme({ scout_nombre: '', historia: '', informe_tecnico: '', calificacion: '', video_url: '' })
    setModalInforme(true)
  }

  function abrirEditarInforme(inf: Informe) {
    setInformeEditando(inf)
    setFormInforme({
      scout_nombre: inf.scout_nombre || '',
      historia: inf.historia || '',
      informe_tecnico: inf.informe_tecnico || '',
      calificacion: inf.calificacion ? String(inf.calificacion) : '',
      video_url: inf.video_url || '',
    })
    setModalInforme(true)
  }

  async function guardarInforme() {
    if (!jugador || !formInforme.informe_tecnico) { alert('El informe técnico es obligatorio'); return }
    setGuardando(true)
    const datos: any = {
      scout_nombre: formInforme.scout_nombre || 'Sin especificar',
      historia: formInforme.historia || null,
      informe_tecnico: formInforme.informe_tecnico,
      calificacion: formInforme.calificacion ? parseFloat(formInforme.calificacion) : null,
      video_url: formInforme.video_url || null,
    }
    if (informeEditando) {
      await supabase.from('informes_scouting').update(datos).eq('id', informeEditando.id)
    } else {
      await supabase.from('informes_scouting').insert({ ...datos, jugador_id: jugador.id })
    }
    setGuardando(false)
    setModalInforme(false)
    setInformeEditando(null)
    fetchJugador(jugador.id)
  }

  async function guardarFoto() {
    if (!jugador || !nuevaFotoUrl) return
    await supabase.from('jugadores').update({ foto_url: nuevaFotoUrl }).eq('id', jugador.id)
    setEditandoFoto(false)
    setNuevaFotoUrl('')
    fetchJugador(jugador.id)
  }

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="text-gray-400 text-sm">Cargando ficha...</div></div>
  if (!jugador) return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="text-gray-400 text-sm">Jugador no encontrado</div></div>

  const edad = calcularEdad(jugador.fecha_nacimiento)
  const calificaciones = jugador.informes_scouting?.filter(i => i.calificacion).map(i => i.calificacion) || []
  const promedio = calificaciones.length ? calificaciones.reduce((a, b) => a + b, 0) / calificaciones.length : null

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
        <div className="flex items-center gap-4">
          <a href="/informes" className="text-red-200 text-sm hover:text-white">← Volver</a>
          <span className="text-sm text-red-200">Ficha individual</span>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-6">

        {/* Panel superior */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-5 flex" style={{minHeight:'190px'}}>

          {/* Foto — 220px de ancho */}
          <div className="flex-shrink-0 relative group bg-gray-100" style={{width:'220px'}}>
            {jugador.foto_url
              ? <img src={jugador.foto_url} alt={jugador.nombre} className="w-full h-full object-cover object-top" />
              : <div className="w-full h-full flex items-center justify-center">
                  <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center text-2xl font-medium text-[#C8102E]">
                    {jugador.nombre?.[0]}{jugador.apellido?.[0]}
                  </div>
                </div>
            }
            <button onClick={() => { setEditandoFoto(true); setNuevaFotoUrl(jugador.foto_url || '') }}
              className="absolute inset-0 bg-black/0 hover:bg-black/30 flex items-end justify-center pb-2 opacity-0 group-hover:opacity-100 transition-all">
              <span className="text-white text-xs bg-black/50 px-2 py-0.5 rounded">✏️ foto</span>
            </button>
          </div>

          {/* Datos */}
          <div className="flex-1 px-6 py-4 border-l border-gray-100 min-w-0">
            <div className="flex items-start justify-between mb-1">
              <div className="font-semibold text-gray-900 text-xl">{jugador.nombre} {jugador.apellido}</div>
              <button onClick={abrirEditarDatos}
                className="text-xs text-gray-400 hover:text-[#C8102E] border border-gray-200 hover:border-[#C8102E] px-2 py-1 rounded-lg transition-colors flex-shrink-0 ml-3">
                ✏️ Editar datos
              </button>
            </div>
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              {jugador.posicion_principal && <span className="bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded-full font-medium">{jugador.posicion_principal}</span>}
              {promedio && <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getCalColor(promedio)}`}>{promedio.toFixed(1)} promedio</span>}
            </div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2">
              {[
                { label: 'Club', value: jugador.club_actual },
                { label: 'Liga', value: jugador.liga },
                { label: 'Nacimiento', value: formatFecha(jugador.fecha_nacimiento) },
                { label: 'Edad', value: edad ? `${edad} años` : null },
                { label: 'Nacionalidad', value: jugador.nacionalidad },
                { label: 'Pie', value: jugador.pie_habil },
                { label: 'Altura', value: jugador.altura_cm ? `${jugador.altura_cm} cm` : null },
                { label: 'Fin contrato', value: formatFecha(jugador.fin_contrato) },
                { label: 'Cláusula', value: jugador.clausula_rescision_usd ? `USD ${jugador.clausula_rescision_usd.toLocaleString()}` : null },
                { label: 'Representante', value: jugador.representante },
              ].filter(d => d.value).map(({ label, value }) => (
                <div key={label} className="flex items-baseline gap-1.5">
                  <span className="text-gray-500 text-xs flex-shrink-0">{label}:</span>
                  <span className="text-gray-900 text-xs font-medium truncate">{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Campo — tamaño medio */}
          <div className="flex-shrink-0 bg-gray-50 border-l border-gray-100 flex flex-col items-center justify-center p-3" style={{width:'200px'}}>
            {jugador.posicion_principal ? (
              <>
                <MapaCampo posicion={jugador.posicion_principal} posicionSecundaria={jugador.posicion_secundaria} small />
                <div className="mt-2 space-y-1 w-full">
                  <div className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#C8102E] flex-shrink-0"></div>
                    <span className="text-[10px] text-gray-700 truncate leading-tight">{jugador.posicion_principal}</span>
                  </div>
                  {jugador.posicion_secundaria && (
                    <div className="flex items-center gap-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-white border border-[#C8102E] flex-shrink-0"></div>
                      <span className="text-[10px] text-gray-400 truncate leading-tight">{jugador.posicion_secundaria}</span>
                    </div>
                  )}
                </div>
              </>
            ) : <span className="text-xs text-gray-400">Sin posición</span>}
            <button onClick={abrirEditarPosicion}
              className="mt-2 text-[10px] text-gray-400 hover:text-[#C8102E] border border-gray-200 hover:border-[#C8102E] px-2 py-0.5 rounded transition-colors w-full text-center">
              ✏️ Editar
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white border border-gray-200 rounded-xl p-1 mb-4">
          {['Informes de scouting', 'Datos generales'].map((tab, i) => (
            <button key={tab} onClick={() => setTabActiva(i)}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${tabActiva === i ? 'bg-[#C8102E] text-white' : 'text-gray-500 hover:text-gray-700'}`}>
              {tab}
            </button>
          ))}
        </div>

        {/* Informes */}
        {tabActiva === 0 && (
          <div>
            <div className="flex justify-between items-center mb-3">
              <span className="text-sm text-gray-600">
                {jugador.informes_scouting?.length || 0} informe{jugador.informes_scouting?.length !== 1 ? 's' : ''}
                {calificaciones.length > 1 && <span className="ml-2 text-gray-400">· promedio {promedio?.toFixed(1)}</span>}
              </span>
              <button onClick={abrirNuevoInforme} className="bg-[#C8102E] text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-[#A00D24]">
                + Agregar informe
              </button>
            </div>

            {!jugador.informes_scouting?.length ? (
              <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-gray-400 text-sm">No hay informes cargados aún</div>
            ) : (
              <div className="space-y-3">
                {[...jugador.informes_scouting].reverse().map((inf, idx) => (
                  <div key={inf.id} className="bg-white border border-gray-200 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Informe {jugador.informes_scouting.length - idx}</span>
                        {inf.scout_nombre && <><span className="text-gray-300">·</span><span className="text-xs text-gray-700 font-medium">{inf.scout_nombre}</span></>}
                        {inf.fecha_informe && <><span className="text-gray-300">·</span><span className="text-xs text-gray-500">{formatFecha(inf.fecha_informe)}</span></>}
                      </div>
                      <div className="flex items-center gap-2">
                        {inf.calificacion && <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getCalColor(inf.calificacion)}`}>{inf.calificacion.toFixed(1)}</span>}
                        <button onClick={() => abrirEditarInforme(inf)}
                          className="text-xs text-gray-500 hover:text-gray-800 border border-gray-200 px-2 py-0.5 rounded-lg hover:border-gray-400 transition-colors">
                          ✏️ Editar
                        </button>
                      </div>
                    </div>

                    {inf.historia && (
                      <div className="mb-3">
                        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Historia / Contexto</div>
                        <p className="text-sm text-gray-900 leading-relaxed bg-gray-50 rounded-lg p-3 whitespace-pre-line">{inf.historia}</p>
                      </div>
                    )}
                    {inf.informe_tecnico && (
                      <div className="mb-3">
                        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Informe técnico</div>
                        <p className="text-sm text-gray-900 leading-relaxed bg-gray-50 rounded-lg p-3 whitespace-pre-line">{inf.informe_tecnico}</p>
                      </div>
                    )}
                    {inf.informe_sa && (
                      <div className="mb-3">
                        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Informe SA</div>
                        <p className="text-sm text-gray-900 leading-relaxed bg-gray-50 rounded-lg p-3 whitespace-pre-line">{inf.informe_sa}</p>
                      </div>
                    )}

                    {/* Video — siempre al final, ancho fijo pequeño */}
                    {inf.video_url && (
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Video</div>
                        {getYoutubeId(inf.video_url) ? (
                          <div className="rounded-lg overflow-hidden" style={{width:'320px', aspectRatio:'16/9'}}>
                            <iframe
                              src={`https://www.youtube.com/embed/${getYoutubeId(inf.video_url)}`}
                              style={{width:'100%', height:'100%'}}
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                            />
                          </div>
                        ) : (
                          <a href={inf.video_url} target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 text-sm text-blue-600 hover:underline bg-blue-50 px-3 py-2 rounded-lg">
                            ▶ Ver video
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Datos generales */}
        {tabActiva === 1 && (
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Información del jugador</div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              {[
                { label: 'Nombre completo', value: `${jugador.nombre} ${jugador.apellido}` },
                { label: 'Club actual', value: jugador.club_actual },
                { label: 'Liga', value: jugador.liga },
                { label: 'Posición principal', value: jugador.posicion_principal },
                { label: 'Posición secundaria', value: jugador.posicion_secundaria },
                { label: 'Rol', value: jugador.rol },
                { label: 'Fecha de nacimiento', value: formatFecha(jugador.fecha_nacimiento) },
                { label: 'Edad', value: edad ? `${edad} años` : null },
                { label: 'Nacionalidad', value: jugador.nacionalidad },
                { label: 'Pie hábil', value: jugador.pie_habil },
                { label: 'Altura', value: jugador.altura_cm ? `${jugador.altura_cm} cm` : null },
                { label: 'Fin de contrato', value: formatFecha(jugador.fin_contrato) },
                { label: 'Cláusula', value: jugador.clausula_rescision_usd ? `USD ${jugador.clausula_rescision_usd.toLocaleString()}` : null },
                { label: 'Representante', value: jugador.representante },
              ].map(({ label, value }) => (
                <div key={label} className="border-b border-gray-50 pb-3">
                  <div className="text-xs text-gray-400 mb-0.5">{label}</div>
                  <div className="text-gray-900 font-medium">{value || '—'}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Modal — editar datos del jugador */}
      {editandoDatos && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-base font-medium text-gray-900">Editar datos — {jugador.nombre} {jugador.apellido}</h2>
              <button onClick={() => setEditandoDatos(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            <div className="p-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Nombre *</label>
                  <input type="text" placeholder="Santiago" value={formDatos.nombre}
                    onChange={e => setFormDatos(f => ({ ...f, nombre: e.target.value }))} className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Apellido *</label>
                  <input type="text" placeholder="Hidalgo" value={formDatos.apellido}
                    onChange={e => setFormDatos(f => ({ ...f, apellido: e.target.value }))} className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Club actual</label>
                  <input type="text" placeholder="Independiente" value={formDatos.club_actual}
                    onChange={e => setFormDatos(f => ({ ...f, club_actual: e.target.value }))} className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Liga</label>
                  <input type="text" placeholder="Liga Profesional" value={formDatos.liga}
                    onChange={e => setFormDatos(f => ({ ...f, liga: e.target.value }))} className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Fecha de nacimiento</label>
                  <input type="date" value={formDatos.fecha_nacimiento}
                    onChange={e => setFormDatos(f => ({ ...f, fecha_nacimiento: e.target.value }))} className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Nacionalidad</label>
                  <input type="text" placeholder="Argentina" value={formDatos.nacionalidad}
                    onChange={e => setFormDatos(f => ({ ...f, nacionalidad: e.target.value }))} className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Pie hábil</label>
                  <select value={formDatos.pie_habil}
                    onChange={e => setFormDatos(f => ({ ...f, pie_habil: e.target.value }))}
                    className={inputCls}>
                    <option>Derecho</option>
                    <option>Izquierdo</option>
                    <option>Ambidiestro</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Altura (cm)</label>
                  <input type="number" placeholder="178" value={formDatos.altura_cm}
                    onChange={e => setFormDatos(f => ({ ...f, altura_cm: e.target.value }))} className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Fin de contrato</label>
                  <input type="date" value={formDatos.fin_contrato}
                    onChange={e => setFormDatos(f => ({ ...f, fin_contrato: e.target.value }))} className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Cláusula de rescisión (USD)</label>
                  <input type="number" placeholder="15000000" value={formDatos.clausula_rescision_usd}
                    onChange={e => setFormDatos(f => ({ ...f, clausula_rescision_usd: e.target.value }))} className={inputCls} />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs text-gray-500 mb-1">Representante</label>
                  <input type="text" placeholder="Nombre del agente" value={formDatos.representante}
                    onChange={e => setFormDatos(f => ({ ...f, representante: e.target.value }))} className={inputCls} />
                </div>
              </div>
            </div>
            <div className="p-5 border-t border-gray-100 flex justify-end gap-3">
              <button onClick={() => setEditandoDatos(false)} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Cancelar</button>
              <button onClick={guardarDatos} disabled={guardandoDatos}
                className="px-4 py-2 text-sm bg-[#C8102E] text-white rounded-lg hover:bg-[#A00D24] disabled:opacity-50 font-medium">
                {guardandoDatos ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal — editar posición (compacto) */}
      {editandoPosicion && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-xs">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-900">Editar posición</h2>
              <button onClick={() => setEditandoPosicion(false)} className="text-gray-400 hover:text-gray-600 text-lg leading-none">✕</button>
            </div>
            <div className="p-4 space-y-3">
              {/* Preview campo pequeño */}
              <div className="flex items-center gap-4 bg-gray-50 rounded-xl p-3">
                <MapaCampo posicion={posEdit.principal || 'Delantero'} posicionSecundaria={posEdit.secundaria} small />
                <div className="text-xs text-gray-600 space-y-1">
                  {posEdit.principal && <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-[#C8102E]"></div>{posEdit.principal}</div>}
                  {posEdit.secundaria && <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-white border border-[#C8102E]"></div>{posEdit.secundaria}</div>}
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Posición principal</label>
                <select value={posEdit.principal} onChange={e => setPosEdit(p => ({ ...p, principal: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-[#C8102E] bg-white">
                  <option value="">Seleccionar...</option>
                  {POSICIONES_LISTA.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Posición secundaria</label>
                <select value={posEdit.secundaria} onChange={e => setPosEdit(p => ({ ...p, secundaria: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-[#C8102E] bg-white">
                  <option value="">Ninguna</option>
                  {POSICIONES_LISTA.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>
            <div className="p-4 border-t border-gray-100 flex justify-end gap-2">
              <button onClick={() => setEditandoPosicion(false)} className="px-3 py-1.5 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Cancelar</button>
              <button onClick={guardarPosicion} className="px-3 py-1.5 text-sm bg-[#C8102E] text-white rounded-lg hover:bg-[#A00D24] font-medium">Guardar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal — informe */}
      {modalInforme && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-base font-medium text-gray-900">{informeEditando ? 'Editar informe' : 'Nuevo informe'} — {jugador.nombre} {jugador.apellido}</h2>
              <button onClick={() => setModalInforme(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Scout responsable</label>
                  <input type="text" placeholder="Nombre del scout" value={formInforme.scout_nombre}
                    onChange={e => setFormInforme(f => ({ ...f, scout_nombre: e.target.value }))} className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Calificación (1-10)</label>
                  <input type="number" min="1" max="10" step="0.5" placeholder="8.5" value={formInforme.calificacion}
                    onChange={e => setFormInforme(f => ({ ...f, calificacion: e.target.value }))} className={inputCls} />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Historia / Contexto</label>
                <textarea rows={3} placeholder="Origen, trayectoria, personalidad..." value={formInforme.historia}
                  onChange={e => setFormInforme(f => ({ ...f, historia: e.target.value }))} className={textareaCls} />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Informe técnico *</label>
                <textarea rows={5} placeholder="Características técnicas, fortalezas, áreas de mejora..." value={formInforme.informe_tecnico}
                  onChange={e => setFormInforme(f => ({ ...f, informe_tecnico: e.target.value }))} className={textareaCls} />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Link de video</label>
                <input type="text" placeholder="https://youtube.com/watch?v=..." value={formInforme.video_url}
                  onChange={e => setFormInforme(f => ({ ...f, video_url: e.target.value }))} className={inputCls} />
              </div>
            </div>
            <div className="p-5 border-t border-gray-100 flex justify-end gap-3">
              <button onClick={() => setModalInforme(false)} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Cancelar</button>
              <button onClick={guardarInforme} disabled={guardando}
                className="px-4 py-2 text-sm bg-[#C8102E] text-white rounded-lg hover:bg-[#A00D24] disabled:opacity-50 font-medium">
                {guardando ? 'Guardando...' : informeEditando ? 'Guardar cambios' : 'Guardar informe'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal — foto */}
      {editandoFoto && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-base font-medium text-gray-900">Foto del jugador</h2>
              <button onClick={() => setEditandoFoto(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            <div className="p-5 space-y-4">
              {nuevaFotoUrl && <div className="flex justify-center"><img src={nuevaFotoUrl} alt="Preview" className="w-24 h-24 rounded-full object-cover border-2 border-gray-200" /></div>}
              <div>
                <label className="block text-xs text-gray-500 mb-1">URL de la imagen</label>
                <input type="text" placeholder="https://cdn5.wyscout.com/photos/..." value={nuevaFotoUrl}
                  onChange={e => setNuevaFotoUrl(e.target.value)} className={inputCls} />
                <p className="text-xs text-gray-400 mt-1">Copiá la URL desde Wyscout o Transfermarkt</p>
              </div>
            </div>
            <div className="p-5 border-t border-gray-100 flex justify-end gap-3">
              <button onClick={() => setEditandoFoto(false)} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Cancelar</button>
              <button onClick={guardarFoto} className="px-4 py-2 text-sm bg-[#C8102E] text-white rounded-lg hover:bg-[#A00D24] font-medium">Guardar foto</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
