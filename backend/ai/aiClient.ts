import fetch from 'node-fetch'

export type IdentifyResult = {
  breed: string
  confidence?: number
  status: 'ok' | 'no_aplica'
  isPet: boolean
  species?: 'dog' | 'cat' | null
}

export class AiError extends Error {
  public code?: string
  constructor(message: string, code?: string) {
    super(message)
    this.name = 'AiError'
    this.code = code
  }
}

// Lista ampliada de razas de perros y gatos en inglés
const validBreeds = [
  // Especies generales
  'dog', 'cat', 'bunny', 'hammster',

  // Razas de perro
  'doberman pinscher', 'doberman', 'golden retriever', 'german shepherd', 'labrador retriever',
  'bulldog', 'poodle', 'chihuahua', 'beagle', 'boxer', 'dachshund', 'rottweiler',
  'shih tzu', 'husky', 'great dane', 'border collie', 'cocker spaniel', 'basset hound',
  'akita', 'malinois', 'samoyed', 'terrier', 'greyhound', 'whippet',
  'australian shepherd', 'bernese mountain dog', 'boston terrier', 'cane corso',
  'cavalier king charles spaniel', 'dalmatian', 'french bulldog', 'havanese',
  'irish setter', 'jack russell terrier', 'miniature schnauzer', 'newfoundland',
  'papillon', 'pembroke welsh corgi', 'pomeranian', 'saint bernard', 'shar pei',
  'shetland sheepdog', 'shiba inu', 'weimaraner',

  // Razas de gato
  'siamese cat', 'persian cat', 'maine coon', 'bengal cat', 'sphynx',
  'ragdoll', 'british shorthair', 'russian blue', 'norwegian forest cat',
  'abyssinian', 'savannah cat', 'scottish fold', 'oriental shorthair',
  'american shorthair', 'balinese', 'birman', 'bombay', 'burmese', 'chartreux',
  'cornish rex', 'devon rex', 'egyptian mau', 'exotic shorthair', 'havana brown',
  'japanese bobtail', 'korat', 'manx', 'munchkin', 'ocicat', 'peterbald',
  'selkirk rex', 'snowshoe', 'turkish angora'
]

// Validación flexible: detecta si el label contiene alguna raza conocida
function esMascota(label: string): boolean {
  const lower = label.toLowerCase()
  return validBreeds.some(breed => lower.includes(breed))
}

// Deducción de especie si es mascota
function detectarEspecie(label: string): 'dog' | 'cat' | null {
  const lower = label.toLowerCase()
  if (lower.includes('dog') || lower.includes('puppy') || lower.includes('canine')) return 'dog'
  if (lower.includes('cat') || lower.includes('kitten') || lower.includes('feline')) return 'cat'
  return null
}

export async function identifyImageFromBuffer(
  buffer: Buffer,
  filename: string,
  contentType: string
): Promise<IdentifyResult> {
  const AI_API_URL = process.env.AI_API_URL
  const AI_API_KEY = process.env.AI_API_KEY

  console.log('Usando AI con:', {
    AI_API_URL,
    AI_API_KEY: AI_API_KEY?.slice(0, 8) + '...'
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

  const label = result[0].label.trim().toLowerCase()
  const isPet = esMascota(label)
  const species = isPet ? detectarEspecie(label) : null

  if (!isPet) {
    console.warn('[AI] No es mascota:', label)
    return {
      breed: label,
      confidence: result[0].score,
      status: 'no_aplica',
      isPet: false,
      species: null
    }
  }

  return {
    breed: label,
    confidence: result[0].score,
    status: 'ok',
    isPet: true,
    species
  }
}