import fetch from 'node-fetch'

export type IdentifyResult = {
  breed: string
  confidence?: number
}

export class AiError extends Error {
  public code?: string
  constructor(message: string, code?: string) {
    super(message)
    this.name = 'AiError'
    this.code = code
  }
}

export async function identifyImageFromBuffer(
  buffer: Buffer,
  filename: string,
  contentType: string
): Promise<IdentifyResult> {
  const AI_API_URL = process.env.AI_API_URL
  const AI_API_KEY = process.env.AI_API_KEY

  // ✅ Log temporal para verificar variables en Render
  console.log('Se usó la API key y URL:', {
    AI_API_URL,
    AI_API_KEY: AI_API_KEY?.slice(0, 8) + '...' // solo muestra el inicio por seguridad
  })

  if (!AI_API_URL) throw new AiError('AI_API_URL missing', 'config')

  const base64 = buffer.toString('base64')
  const payload = {
    inputs: `data:${contentType};base64,${base64}`
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${AI_API_KEY}`,
    'Content-Type': 'application/json'
  }

  const resp = await fetch(AI_API_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload)
  })

  if (!resp.ok) {
    const txt = await resp.text().catch(() => '')
    throw new AiError(`AI provider error: ${resp.status} ${txt}`, 'provider')
  }

  const result = await resp.json().catch(() => null)

  if (!Array.isArray(result) || !result[0]?.label) {
    throw new AiError('No label found in response', 'no_label')
  }

  return {
    breed: result[0].label,
    confidence: result[0].score
  }
}