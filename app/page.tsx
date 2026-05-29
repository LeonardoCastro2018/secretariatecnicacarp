'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function Home() {
  const [jugadoresCount, setJugadoresCount] = useState(0)
  const [informesCount, setInformesCount] = useState(0)
  const [cedidosCount, setCedidosCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [userEmail, setUserEmail] = useState('')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function fetchData() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) setUserEmail(user.email || '')

      const [{ count: j }, { count: i }, { count: c }] = await Promise.all([
        supabase.from('jugadores').select('*', { count: 'exact', head: true }),
        supabase.from('informes_scouting').select('*', { count: 'exact', head: true }),
        supabase.from('cedidos').select('*', { count: 'exact', head: true }).eq('activo', true),
      ])
      setJugadoresCount(j || 0)
      setInformesCount(i || 0)
      setCedidosCount(c || 0)
      setLoading(false)
    }
    fetchData()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const navItems = [
    { label: 'Informes individuales', href: '/informes', icon: '📋' },
    { label: 'Rendimiento', href: '/rendimiento', icon: '📈' },
    { label: 'Datos por partido', href: '/partidos', icon: '⚽' },
    { label: 'Datos físicos', href: '/fisicos', icon: '🏃' },
    { label: 'Visorías', href: '/visorias', icon: '👁' },
    { label: 'Contratos', href: '/contratos', icon: '📄' },
    { label: 'Cedidos', href: '/cedidos', icon: '🔄' },
    { label: 'Reserva', href: '/reserva', icon: '🟥' },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Topbar */}
      <div className="bg-[#C8102E] text-white px-6 py-3 flex items-center justify-between shadow">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-[#C8102E] text-xs font-bold">
            CARP
          </div>
          <div>
            <div className="text-sm font-medium tracking-wide uppercase">
              Secretaría técnica
            </div>
            <div className="text-xs text-red-200">
              Área de investigación y conocimiento
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-red-200">{userEmail}</span>
          <button
            onClick={handleLogout}
            className="text-xs bg-red-700 hover:bg-red-800 px-3 py-1.5 rounded-lg transition-colors"
          >
            Cerrar sesión
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Bienvenida */}
        <div className="mb-8">
          <h1 className="text-2xl font-medium text-gray-900">
            Bienvenido
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Plataforma de análisis y scouting — Temporada 2025/26
          </p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="text-xs text-gray-500 mb-1">Jugadores relevados</div>
            <div className="text-3xl font-medium text-gray-900">
              {loading ? '—' : jugadoresCount}
            </div>
            <div className="text-xs text-gray-400 mt-1">Esta temporada</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="text-xs text-gray-500 mb-1">Informes activos</div>
            <div className="text-3xl font-medium text-gray-900">
              {loading ? '—' : informesCount}
            </div>
            <div className="text-xs text-gray-400 mt-1">Cargados</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="text-xs text-gray-500 mb-1">Cedidos activos</div>
            <div className="text-3xl font-medium text-gray-900">
              {loading ? '—' : cedidosCount}
            </div>
            <div className="text-xs text-gray-400 mt-1">En seguimiento</div>
          </div>
        </div>

{/* Módulos */}
        <div className="mb-4">
          <h2 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">
            Módulos
          </h2>
          <div className="grid grid-cols-4 gap-3">
            {navItems.map((item) => (
              
<a
              key={item.href}
                href={item.href}
                className="bg-white border border-gray-200 rounded-xl p-4 hover:border-[#C8102E] hover:shadow-sm transition-all group"
              >
                <div className="text-2xl mb-2">{item.icon}</div>
                <div className="text-sm font-medium text-gray-700 group-hover:text-[#C8102E]">
                  {item.label}
                </div>
              </a>
            ))}
          </div>
        </div>
        {/* Estado de conexión */}
        <div className="mt-8 flex items-center gap-2 text-xs text-gray-400">
          <div className={`w-2 h-2 rounded-full ${loading ? 'bg-yellow-400' : 'bg-green-500'}`}></div>
          {loading ? 'Conectando con Supabase...' : 'Conectado a la base de datos ✓'}
        </div>
      </div>
    </div>
  )
}