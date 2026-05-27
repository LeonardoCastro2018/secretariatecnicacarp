// ============================================================
// COMPONENTE: Buscador de similitud con IA
// ============================================================
function BuscadorSimilitud({ posicion, temporada, inputCls, onVerDetalle }: {
  posicion: string
  temporada: string
  liga?: string
  inputCls: string
  onVerDetalle: (j: any) => void
}) {
  const LIGAS_DISPONIBLES = [
    'Argentina 1A', 'Uruguay 1A', 'Colombia 1A', 'Chile 1A',
    'Paraguay 1A', 'Venezuela 1A', 'Ecuador 1A', 'Mexico 1A',
    'USA MLS', 'Espana A', 'Italia A', 'Alemania A',
    'Francia A', 'Inglaterra A', 'Brasil A',
    'Copa Libertadores', 'Copa Sudamericana',
  ]

  const [modo,         setModo]         = useState<'descripcion' | 'jugador'>('descripcion')
  const [descripcion,  setDescripcion]  = useState('')
  const [nombreRef,    setNombreRef]    = useState('')
  const [edadMax,      setEdadMax]      = useState('')
  const [minutosMin,   setMinutosMin]   = useState(900)
  const [ligasSelec,   setLigasSelec]   = useState<string[]>([])
  const [todasLigas,   setTodasLigas]   = useState(true)
  const [resultados,   setResultados]   = useState<any[]>([])
  const [explicacion,  setExplicacion]  = useState('')
  const [loading,      setLoading]      = useState(false)
  const [error,        setError]        = useState('')
  const [mostrarLigas, setMostrarLigas] = useState(false)

  const toggleLiga = (liga: string) => {
    setLigasSelec(prev =>
      prev.includes(liga) ? prev.filter(l => l !== liga) : [...prev, liga]
    )
    setTodasLigas(false)
  }

  const buscar = async () => {
    const texto = modo === 'descripcion' ? descripcion.trim() : nombreRef.trim()
    if (!texto) return
    setLoading(true)
    setError('')
    setResultados([])
    setExplicacion('')
    try {
      const body: any = {
        posicion,
        temporada,
        minutosMin,
        ligas: todasLigas ? [] : ligasSelec,
      }
      if (modo === 'descripcion') body.descripcion       = texto
      else                        body.jugadorReferencia = texto
      if (edadMax) body.edadMax = parseInt(edadMax)
      const res  = await fetch('/api/similitud', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      })
      const data = await res.json()
      if (data.error) { setError(data.error); return }
      setResultados((data.jugadores || []).sort((a: any, b: any) => b.similitud - a.similitud))
      setExplicacion(data.explicacion || '')
    } catch {
      setError('Error al conectar con el servidor')
    } finally {
      setLoading(false)
    }
  }

  const descargarPDF = async () => {
    const { jsPDF } = await import('jspdf')
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    const rojo: [number, number, number]  = [200, 16, 46]
    const gris: [number, number, number]  = [100, 100, 100]
    const negro: [number, number, number] = [30, 30, 30]

    // Header rojo
    doc.setFillColor(...rojo)
    doc.rect(0, 0, 210, 35, 'F')

    // Logo River
    try {
      const res    = await fetch('https://upload.wikimedia.org/wikipedia/commons/thumb/a/a8/Escudo_del_C_A_River_Plate.svg/200px-Escudo_del_C_A_River_Plate.svg.png')
      const blob   = await res.blob()
      const base64 = await new Promise<string>(resolve => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.readAsDataURL(blob)
      })
      doc.addImage(base64, 'PNG', 170, 3, 18, 22)
    } catch {}

    // Titulos header
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('SECRETARIA TECNICA', 15, 13)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.text('Area de Investigacion y Conocimiento', 15, 20)
    doc.text('Buscador de Similitud', 15, 27)

    // Linea roja separadora
    doc.setDrawColor(...rojo)
    doc.setLineWidth(0.5)
    doc.line(15, 40, 195, 40)

    // Criterio de busqueda
    doc.setTextColor(...negro)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text('Criterio de busqueda:', 15, 48)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    const textoCriterio = modo === 'descripcion' ? descripcion : `Similar a: ${nombreRef}`
    const splitCriterio = doc.splitTextToSize(textoCriterio, 175)
    doc.text(splitCriterio, 15, 55)
    let yPos = 55 + splitCriterio.length * 5

    // Filtros
    doc.setTextColor(...gris)
    doc.setFontSize(8)
    const filtrosTxt = [
      `Posicion: ${posicion}`,
      `Temporada: ${temporada}`,
      minutosMin > 0 ? `Min. ${minutosMin} min` : 'Sin minimo',
      edadMax ? `Edad <= ${edadMax}` : '',
      todasLigas ? 'Todas las ligas' : `${ligasSelec.length} ligas`,
      'Nac.: Sudamericana',
    ].filter(Boolean).join('  -  ')
    const splitFiltros = doc.splitTextToSize(filtrosTxt, 175)
    doc.text(splitFiltros, 15, yPos + 3)
    yPos += (splitFiltros.length - 1) * 4

    // Explicacion IA
    if (explicacion) {
      yPos += 12
      doc.setFillColor(240, 245, 255)
      doc.setDrawColor(200, 220, 255)
      const splitIA = doc.splitTextToSize('IA: ' + explicacion, 170)
      const boxIA   = splitIA.length * 5 + 6
      doc.roundedRect(15, yPos, 180, boxIA, 2, 2, 'FD')
      doc.setTextColor(30, 60, 120)
      doc.setFontSize(8)
      doc.setFont('helvetica', 'italic')
      doc.text(splitIA, 18, yPos + 5)
      yPos += boxIA + 4
    } else {
      yPos += 12
    }

    // Linea roja
    doc.setDrawColor(...rojo)
    doc.setLineWidth(0.3)
    doc.line(15, yPos, 195, yPos)
    yPos += 6

    // Header tabla
    doc.setFillColor(...rojo)
    doc.rect(15, yPos, 180, 7, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.text('#',       18,  yPos + 5)
    doc.text('Jugador', 24,  yPos + 5)
    doc.text('Club',    90,  yPos + 5)
    doc.text('Liga',    130, yPos + 5)
    doc.text('Edad',    162, yPos + 5)
    doc.text('Match',   178, yPos + 5)
    yPos += 7

    // Filas
    resultados.forEach((j, idx) => {
      if (yPos > 270) { doc.addPage(); yPos = 20 }
      const esRiver = j.equipo?.toLowerCase().includes('river')
      if (esRiver)             { doc.setFillColor(255, 240, 242); doc.rect(15, yPos, 180, 8, 'F') }
      else if (idx % 2 === 0) { doc.setFillColor(248, 248, 248); doc.rect(15, yPos, 180, 8, 'F') }
      doc.setTextColor(...negro)
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      doc.text(String(idx + 1), 18, yPos + 5.5)
      doc.text(doc.splitTextToSize(j.nombre_completo || '', 62)[0], 24,  yPos + 5.5)
      doc.text(doc.splitTextToSize(j.equipo         || '-', 36)[0], 90,  yPos + 5.5)
      doc.text(doc.splitTextToSize(j.liga           || '-', 28)[0], 130, yPos + 5.5)
      doc.text(j.edad ? String(j.edad) : '-', 163, yPos + 5.5)
      const sim     = j.similitud ?? 0
      const minS    = Math.min(...resultados.map((r: any) => r.similitud ?? 0))
      const maxS    = Math.max(...resultados.map((r: any) => r.similitud ?? 0))
      const tercioS = (maxS - minS) / 3
      const simColor: [number, number, number] = sim >= minS + tercioS * 2 ? [22, 163, 74] : sim >= minS + tercioS ? [217, 119, 6] : [185, 28, 28]
      doc.setTextColor(...simColor)
      doc.setFont('helvetica', 'bold')
      doc.text(`${sim}%`, 180, yPos + 5.5)
      doc.setDrawColor(220, 220, 220)
      doc.setLineWidth(0.1)
      doc.line(15, yPos + 8, 195, yPos + 8)
      yPos += 8
    })

    // Footer
    yPos += 6
    doc.setDrawColor(...rojo)
    doc.setLineWidth(0.5)
    doc.line(15, yPos, 195, yPos)
    yPos += 5
    doc.setTextColor(...gris)
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.text(
      `Generado: ${new Date().toLocaleDateString('es-AR')} ${new Date().toLocaleTimeString('es-AR')}  -  ${resultados.length} jugadores  -  Secretaria Tecnica River Plate`,
      15, yPos
    )
    doc.save(`similitud_${posicion}_${new Date().toISOString().slice(0, 10)}.pdf`)
  }

  const colorSim = (p: number) => {
    const min    = Math.min(...resultados.map((r: any) => r.similitud ?? 0))
    const max    = Math.max(...resultados.map((r: any) => r.similitud ?? 0))
    const tercio = (max - min) / 3
    return p >= min + tercio * 2 ? '#16a34a' : p >= min + tercio ? '#d97706' : '#b91c1c'
  }

  return (
    <div className="space-y-5">
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        {(['descripcion', 'jugador'] as const).map(m => (
          <button key={m} onClick={() => { setModo(m); setResultados([]); setExplicacion('') }}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
              modo === m ? 'bg-[#C8102E] text-white shadow-sm' : 'text-gray-500 hover:text-gray-800'
            }`}>
            {m === 'descripcion' ? 'Por descripcion' : 'Por jugador'}
          </button>
        ))}
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
        {modo === 'descripcion' ? (
          <>
            <p className="text-sm font-medium text-gray-700">
              Describe el perfil · posicion: <span className="text-red-600 font-semibold">{posicion}</span>
              <span className="ml-2 text-xs text-gray-400">(Solo jugadores sudamericanos, sin brasileros)</span>
            </p>
            <textarea
              value={descripcion}
              onChange={e => setDescripcion(e.target.value)}
              placeholder={`Ej: Quiero un ${posicion} con alto porcentaje de recuperaciones...`}
              rows={3}
              style={{ color: '#111827', backgroundColor: '#ffffff' }}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm placeholder-gray-400 focus:outline-none focus:border-red-500 resize-none"
            />
          </>
        ) : (
          <>
            <p className="text-sm font-medium text-gray-700">
              Jugador de referencia · posicion: <span className="text-red-600 font-semibold">{posicion}</span>
              <span className="ml-2 text-xs text-gray-400">(Busca sudamericanos similares)</span>
            </p>
            <input
              type="text"
              value={nombreRef}
              onChange={e => setNombreRef(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && buscar()}
              placeholder="Ej: Tomas Galvan"
              style={{ color: '#111827', backgroundColor: '#ffffff' }}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm placeholder-gray-400 focus:outline-none focus:border-red-500"
            />
          </>
        )}

        <div className="flex flex-wrap gap-4 pt-1">
          <div className="flex items-center gap-2">
            <p className="text-sm text-gray-600 flex-shrink-0">Minimo minutos:</p>
            <select value={minutosMin} onChange={e => setMinutosMin(parseInt(e.target.value))} className={inputCls}>
              {MINUTOS_OPCIONES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <p className="text-sm text-gray-600 flex-shrink-0">Edad maxima:</p>
            <input
              type="number"
              value={edadMax}
              onChange={e => setEdadMax(e.target.value)}
              placeholder="Sin limite"
              min={16} max={45}
              style={{ color: '#111827', backgroundColor: '#ffffff' }}
              className="w-28 border border-gray-300 rounded-lg px-3 py-2 text-sm placeholder-gray-400 focus:outline-none focus:border-red-500"
            />
            {edadMax && (
              <button onClick={() => setEdadMax('')} className="text-xs text-gray-400 hover:text-gray-600">x</button>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <p className="text-sm text-gray-600">Ligas:</p>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={todasLigas}
                onChange={e => { setTodasLigas(e.target.checked); if (e.target.checked) setLigasSelec([]) }}
                className="accent-red-600" />
              <span className="text-sm text-gray-700 font-medium">Todas las ligas</span>
            </label>
            {!todasLigas && (
              <button onClick={() => setMostrarLigas(!mostrarLigas)}
                className="text-xs text-red-600 border border-red-200 px-2 py-1 rounded hover:bg-red-50">
                {mostrarLigas ? 'Ocultar' : `Seleccionar (${ligasSelec.length} elegidas)`}
              </button>
            )}
          </div>
          {!todasLigas && mostrarLigas && (
            <div className="grid grid-cols-3 gap-2 bg-gray-50 p-3 rounded-lg border border-gray-200">
              {LIGAS_DISPONIBLES.map(liga => (
                <label key={liga} className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={ligasSelec.includes(liga)}
                    onChange={() => toggleLiga(liga)} className="accent-red-600" />
                  <span className="text-xs text-gray-700">{liga}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        <button onClick={buscar} disabled={loading}
          className="flex items-center gap-2 px-6 py-2.5 bg-[#C8102E] hover:bg-[#A00D24] disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors">
          {loading
            ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Analizando...</>
            : <>Buscar jugadores similares</>}
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
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              {resultados.length} jugadores encontrados
              {minutosMin > 0 ? ` · Min. ${minutosMin} min` : ''}
              {edadMax ? ` · Edad <= ${edadMax}` : ''}
              {todasLigas ? ' · Todas las ligas' : ligasSelec.length > 0 ? ` · ${ligasSelec.length} ligas` : ''}
            </div>
            <button
              onClick={descargarPDF}
              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-red-600 border border-gray-200 hover:border-red-300 px-3 py-1.5 rounded-lg transition-colors"
            >
              Descargar PDF
            </button>
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
                    {j.equipo}{j.liga ? ` · ${j.liga}` : ''}{j.edad ? ` · ${j.edad} anos` : ''}{j.minutos ? ` · ${Math.round(j.minutos)} min` : ''}
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