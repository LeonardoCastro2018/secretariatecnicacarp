/**
 * POST /api/wyscout/trigger
 * Dispara el GitHub Actions workflow manualmente desde la plataforma.
 * Requiere GITHUB_TOKEN en las variables de entorno de Railway.
 */

import { NextResponse } from 'next/server'

const GITHUB_OWNER = 'LeonardoCastro2018'
const GITHUB_REPO  = 'secretariatecnicacarp'
const WORKFLOW_ID  = 'wyscout_sync.yml'

export async function POST() {
  const token = process.env.GITHUB_TOKEN
  if (!token) {
    return NextResponse.json(
      { error: 'GITHUB_TOKEN no configurado en Railway' },
      { status: 500 }
    )
  }

  try {
    const response = await fetch(
      `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/actions/workflows/${WORKFLOW_ID}/dispatches`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github+json',
          'Content-Type': 'application/json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
        body: JSON.stringify({ ref: 'master' }),
      }
    )

    if (response.status === 204) {
      return NextResponse.json({ ok: true, message: 'Sync iniciado correctamente' })
    }

    const body = await response.json().catch(() => ({}))
    return NextResponse.json(
      { error: 'Error al disparar el workflow', detail: body },
      { status: response.status }
    )
  } catch (err) {
    return NextResponse.json(
      { error: 'Error de red', detail: String(err) },
      { status: 500 }
    )
  }
}
