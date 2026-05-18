'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

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
  foto_url: string
  caracteristicas: string[]
  informes_scouting: { calificacion: number }[]
}

const POSICIONES = ['Todas', 'Delantero', 'Extremo', 'Media punta', 'Mediocampista', 'Volante', 'Defensor', 'Lateral', 'Arquero']
const LIGAS = ['Todas', 'Liga Profesional', 'Premier League', 'Serie A', 'La Liga', 'Bundesliga', 'Ligue 1', 'Brasileirao', 'MLS', 'Liga MX']

function getInitials(nombre: string, apellido: string) {
  return `${nombre?.[0] || ''}${apellido?.[0] || ''}`.toUpperCase()
}

function getCalColor(cal: number) {
  if (cal >= 8) return 'bg-green-100 text-green-800'
  if (cal >= 6) return 'bg-yellow-100 text-yellow-800'
  return 'bg-red-100 text-red-800'
}

export default function InformesPage() {
  const [jugadores, setJugadores] = useState<Jugador[]>([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [filtroPosicion, setFiltroPosicion] = useState('Todas')
  const [filtroLiga, setFiltroLiga] = useState('Todas')
  const [modalAbierto, setModalAbierto] = useState(false)

  // Form nuevo jugador
  const [form, setForm] = useState({
    nombre: '', apellido: '', club_actual: '', liga: '',
    posicion_principal: '', posicion_secundaria: '', rol: '',
    fecha_nacimiento: '', nacionalidad: '', pie_habil: 'Derecho',
    altura_cm: '', fin_contrato: '', representante: '',
  })
  const [informe, setInforme] = useState({
    scout_nombre: '', historia: '', informe_tecnico: '', calificacion: '', video_url: '',
  })
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    fetchJugadores()
  }, [])

  async function fetchJugadores() {
    setLoading(true)
    const { data, error } = await supabase
      .from('jugadores')
      .select(`
        id, nombre, apellido, club_actual, liga,
        posicion_principal, posicion_secundaria, rol,
        fecha_nacimiento, nacionalidad, pie_habil,
        altura_cm, fin_contrato, foto_url, caracteristicas,
        informes_scouting (calificacion)
      `)
      .eq('activo', true)
      .order('apellido')

    if (!error && data) setJugadores(data)
    setLoading(false)
  }

  async function guardarJugador() {
    if (!form.nombre || !form.apellido) {
      alert('Nombre y apellido son obligatorios')
      return
    }
    setGuardando(true)

    const { data: jugadorData, error: jugadorError } = await supabase
      .from('jugadores')
      .insert({
        nombre: form.nombre,
        apellido: form.apellido,
        club_actual: form.club_actual || null,
        liga: form.liga || null,
        posicion_principal: form.posicion_principal || null,
        posicion_secundaria: form.posicion_secundaria || null,
        rol: form.rol || null,
        fecha_nacimiento: form.fecha_nacimiento || null,
        nacionalidad: form.nacionalidad || null,
        pie_habil: form.pie_habil || null,
        altura_cm: form.altura_cm ? parseInt(form.altura_cm) : null,
        fin_contrato: form.fin_contrato || null,
        representante: form.representante || null,
      })
      .select()
      .single()

    if (jugadorError) {
      alert('Error al guardar jugador: ' + jugadorError.message)
      setGuardando(false)
      return
    }

    // Si hay informe, guardarlo también
    if (informe.informe_tecnico || informe.historia) {
      await supabase.from('informes_scouting').insert({
        jugador_id: jugadorData.id,
        scout_nombre: informe.scout_nombre || 'Sin especificar',
        historia: informe.historia || null,
        informe_tecnico: informe.informe_tecnico || null,
        calificacion: informe.calificacion ? parseFloat(informe.calificacion) : null,
        video_url: informe.video_url || null,
      })
    }

    setGuardando(false)
    setModalAbierto(false)
    setForm({ nombre: '', apellido: '', club_actual: '', liga: '', posicion_principal: '', posicion_secundaria: '', rol: '', fecha_nacimiento: '', nacionalidad: '', pie_habil: 'Derecho', altura_cm: '', fin_contrato: '', representante: '' })
    setInforme({ scout_nombre: '', historia: '', informe_tecnico: '', calificacion: '', video_url: '' })
    fetchJugadores()
  }

  const jugadoresFiltrados = jugadores.filter(j => {
    const nombre = `${j.nombre} ${j.apellido}`.toLowerCase()
    const club = (j.club_actual || '').toLowerCase()
    const matchBusqueda = nombre.includes(busqueda.toLowerCase()) || club.includes(busqueda.toLowerCase())
    const matchPos = filtroPosicion === 'Todas' || (j.posicion_principal || '').includes(filtroPosicion)
    const matchLiga = filtroLiga === 'Todas' || j.liga === filtroLiga
    return matchBusqueda && matchPos && matchLiga
  })

  const ultimaCalificacion = (j: Jugador) => {
    if (!j.informes_scouting?.length) return null
    const cals = j.informes_scouting.filter(i => i.calificacion).map(i => i.calificacion)
    return cals.length ? cals[cals.length - 1] : null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Topbar */}
      <div className="bg-[#C8102E] text-white px-6 py-3 flex items-center justify-between shadow">
        <div className="flex items-center gap-3">
          <a href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-[#C8102E] text-xs font-bold">CARP</div>
            <div>
              <div className="text-sm font-medium tracking-wide uppercase">Secretaría técnica</div>
              <div className="text-xs text-red-200">Área de investigación y conocimiento</div>
            </div>
          </a>
        </div>
        <div className="text-sm text-red-200">Informes individuales</div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-medium text-gray-900">Informes individuales</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {loading ? 'Cargando...' : `${jugadoresFiltrados.length} jugadores`}
            </p>
          </div>
          <button
            onClick={() => setModalAbierto(true)}
            className="bg-[#C8102E] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#A00D24] transition-colors flex items-center gap-2"
          >
            + Nuevo jugador
          </button>
        </div>

        {/* Filtros */}
        <div className="flex gap-3 mb-5 flex-wrap">
          <input
            type="text"
            placeholder="Buscar jugador o club..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 flex-1 min-w-48 focus:outline-none focus:border-[#C8102E] bg-white"
          />
          <select
            value={filtroPosicion}
            onChange={e => setFiltroPosicion(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:border-[#C8102E]"
          >
            {POSICIONES.map(p => <option key={p}>{p}</option>)}
          </select>
          <select
            value={filtroLiga}
            onChange={e => setFiltroLiga(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:border-[#C8102E]"
          >
            {LIGAS.map(l => <option key={l}>{l}</option>)}
          </select>
        </div>

        {/* Tabla */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Jugador</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Club</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Liga</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Posición</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Edad</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Informes</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Calificación</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="text-center py-12 text-gray-400">Cargando jugadores...</td></tr>
              ) : jugadoresFiltrados.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-12 text-gray-400">No se encontraron jugadores</td></tr>
              ) : jugadoresFiltrados.map(j => {
                const cal = ultimaCalificacion(j)
                const edad = j.fecha_nacimiento
                  ? Math.floor((Date.now() - new Date(j.fecha_nacimiento).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
                  : null

                return (
                  <tr key={j.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {j.foto_url ? (
                          <img src={j.foto_url} alt={j.nombre} className="w-8 h-8 rounded-full object-cover" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center text-xs font-medium text-[#C8102E]">
                            {getInitials(j.nombre, j.apellido)}
                          </div>
                        )}
                        <span className="font-medium text-gray-900">{j.nombre} {j.apellido}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{j.club_actual || '—'}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{j.liga || '—'}</td>
                    <td className="px-4 py-3">
                      {j.posicion_principal && (
                        <span className="bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded-full">
                          {j.posicion_principal}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{edad ? `${edad} años` : '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{j.informes_scouting?.length || 0}</td>
                    <td className="px-4 py-3">
                      {cal ? (
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getCalColor(cal)}`}>
                          {cal.toFixed(1)}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <a
                        href={`/informes/${j.id}`}
                        className="text-[#C8102E] text-xs hover:underline font-medium"
                      >
                        Ver ficha →
                      </a>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal nuevo jugador */}
      {modalAbierto && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-medium text-gray-900">Nuevo jugador</h2>
              <button onClick={() => setModalAbierto(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>

            <div className="p-6">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-4">Datos del jugador</p>
              <div className="grid grid-cols-2 gap-4 mb-6">
                {[
                  { label: 'Nombre *', key: 'nombre', placeholder: 'Santiago' },
                  { label: 'Apellido *', key: 'apellido', placeholder: 'Hidalgo' },
                  { label: 'Club actual', key: 'club_actual', placeholder: 'Independiente' },
                  { label: 'Liga', key: 'liga', placeholder: 'Liga Profesional' },
                  { label: 'Posición principal', key: 'posicion_principal', placeholder: 'Delantero' },
                  { label: 'Posición secundaria', key: 'posicion_secundaria', placeholder: 'Extremo izq.' },
                  { label: 'Rol', key: 'rol', placeholder: 'Pivote' },
                  { label: 'Fecha de nacimiento', key: 'fecha_nacimiento', placeholder: '', type: 'date' },
                  { label: 'Nacionalidad', key: 'nacionalidad', placeholder: 'Argentina' },
                  { label: 'Altura (cm)', key: 'altura_cm', placeholder: '178' },
                  { label: 'Fin de contrato', key: 'fin_contrato', placeholder: '', type: 'date' },
                  { label: 'Representante', key: 'representante', placeholder: 'Nombre del agente' },
                ].map(({ label, key, placeholder, type }) => (
                  <div key={key}>
                    <label className="block text-xs text-gray-500 mb-1">{label}</label>
                    <input
                      type={type || 'text'}
                      placeholder={placeholder}
                      value={(form as any)[key]}
                      onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#C8102E] bg-white"
                    />
                  </div>
                ))}
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Pie hábil</label>
                  <select
                    value={form.pie_habil}
                    onChange={e => setForm(f => ({ ...f, pie_habil: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#C8102E] bg-white"
                  >
                    <option>Derecho</option>
                    <option>Izquierdo</option>
                    <option>Ambidiestro</option>
                  </select>
                </div>
              </div>

              <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-4">Informe de scouting (opcional)</p>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Scout responsable</label>
                  <input
                    type="text"
                    placeholder="Nombre del scout"
                    value={informe.scout_nombre}
                    onChange={e => setInforme(i => ({ ...i, scout_nombre: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#C8102E] bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Calificación (1-10)</label>
                  <input
                    type="number"
                    min="1" max="10" step="0.5"
                    placeholder="8.5"
                    value={informe.calificacion}
                    onChange={e => setInforme(i => ({ ...i, calificacion: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#C8102E] bg-white"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs text-gray-500 mb-1">Historia / Contexto</label>
                  <textarea
                    rows={3}
                    placeholder="Origen, trayectoria, personalidad..."
                    value={informe.historia}
                    onChange={e => setInforme(i => ({ ...i, historia: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#C8102E] resize-none bg-white"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs text-gray-500 mb-1">Informe técnico</label>
                  <textarea
                    rows={4}
                    placeholder="Características técnicas, fortalezas, áreas de mejora..."
                    value={informe.informe_tecnico}
                    onChange={e => setInforme(i => ({ ...i, informe_tecnico: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#C8102E] resize-none bg-white"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs text-gray-500 mb-1">Link de video</label>
                  <input
                    type="text"
                    placeholder="https://..."
                    value={informe.video_url}
                    onChange={e => setInforme(i => ({ ...i, video_url: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#C8102E] bg-white"
                  />
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
              <button
                onClick={() => setModalAbierto(false)}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={guardarJugador}
                disabled={guardando}
                className="px-4 py-2 text-sm bg-[#C8102E] text-white rounded-lg hover:bg-[#A00D24] disabled:opacity-50 font-medium"
              >
                {guardando ? 'Guardando...' : 'Guardar jugador'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
