import fetch, { Response as FetchResponse } from 'node-fetch'

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

const dogBreeds = [
  'doberman pinscher', 'doberman', 'golden retriever', 'german shepherd', 'labrador retriever',
  'bulldog', 'poodle', 'chihuahua', 'beagle', 'boxer', 'dachshund', 'rottweiler',
  'shih tzu', 'husky', 'great dane', 'border collie', 'cocker spaniel', 'basset hound',
  'akita', 'malinois', 'samoyed', 'terrier', 'greyhound', 'whippet',
  'australian shepherd', 'bernese mountain dog', 'boston terrier', 'cane corso',
  'cavalier king charles spaniel', 'dalmatian', 'french bulldog', 'havanese',
  'irish setter', 'jack russell terrier', 'miniature schnauzer', 'newfoundland',
  'papillon', 'pembroke welsh corgi', 'pomeranian', 'saint bernard', 'shar pei',
  'shetland sheepdog', 'shiba inu', 'weimaraner'
]

const catBreeds = [
  'siamese cat', 'persian cat', 'maine coon', 'bengal cat', 'sphynx',
  'ragdoll', 'british shorthair', 'russian blue', 'norwegian forest cat',
  'abyssinian', 'savannah cat', 'scottish fold', 'oriental shorthair',
  'american shorthair', 'balinese', 'birman', 'bombay', 'burmese', 'chartreux',
  'cornish rex', 'devon rex', 'egyptian mau', 'exotic shorthair', 'havana brown',
  'japanese bobtail', 'korat', 'manx', 'munchkin', 'ocicat', 'peterbald',
  'selkirk rex', 'snowshoe', 'turkish angora'
]

const generalSpecies = [
  // Mamíferos comunes
  'dog', 'cat', 'rabbit', 'bunny', 'hamster', 'guinea pig', 'ferret', 'mouse', 'rat', 'chinchilla', 'gerbil', 'hedgehog', 'sugar glider',

  // Aves
  'parrot', 'budgie', 'canary', 'cockatiel', 'lovebird', 'finch', 'macaw', 'conure', 'parakeet',

  // Reptiles
  'turtle', 'tortoise', 'lizard', 'gecko', 'iguana', 'snake', 'chameleon', 'bearded dragon',

  // Peces
  'goldfish', 'betta', 'guppy', 'angelfish', 'koi', 'tetra', 'molly', 'platy',

  // Anfibios
  'frog', 'toad', 'salamander', 'newt', 'axolotl',

  // Invertebrados
  'tarantula', 'hermit crab', 'snail', 'ant', 'scorpion'
]

//Deteccion de raza independiente de si es perro o gato
function esMascota(label: string): boolean {
  const lower = label.toLowerCase()

  return (
    dogBreeds.some(breed => lower.includes(breed)) ||
    catBreeds.some(breed => lower.includes(breed)) ||
    generalSpecies.some(species => lower.includes(species))
  )
}

const especieMap: Record<string, 'dog' | 'cat'> = {
  // Perros
  'dog': 'dog',
  'puppy': 'dog',
  'canine': 'dog',
  ...Object.fromEntries(dogBreeds.map(b => [b, 'dog'])),

  // Gatos
  'cat': 'cat',
  'kitten': 'cat',
  'feline': 'cat',
  ...Object.fromEntries(catBreeds.map(b => [b, 'cat']))
}


// Deducción de especie si es mascota, discrimina entre gatos, perros o ninguno de los dos
function detectarEspecie(label: string): 'dog' | 'cat' | null {
  const lower = label.toLowerCase()

  for (const key in especieMap) {
    if (lower.includes(key)) {
      return especieMap[key]
    }
  }

  return null
}


export async function identifyImageFromBuffer(
  buffer: Buffer,
  filename: string,
  contentType: string
): Promise<IdentifyResult> {
  const AI_API_KEY = process.env.AI_API_KEY
  const AI_MODEL = process.env.AI_MODEL // Ej: 'microsoft/resnet-50'
  const AI_API_URL = process.env.AI_API_URL?.replace(/\/+$/, '') // Ej: 'https://router.huggingface.co'

  if (!AI_API_URL || !AI_MODEL || !AI_API_KEY) {
    throw new AiError('Faltan variables de entorno AI_API_URL, AI_MODEL o AI_API_KEY', 'config')
  }

  const fullUrl = `${AI_API_URL}/${AI_MODEL}`

  console.log('[AI] Configuración cargada:', {
    AI_API_URL,
    AI_MODEL,
    AI_API_KEY: AI_API_KEY.slice(0, 8) + '...',
    fullUrl,
    bufferSize: buffer.length,
    contentType,
    filename
  })

  const headers: Record<string, string> = {
    Authorization: `Bearer ${AI_API_KEY}`,
    'Content-Type': contentType
  }

  const startTime = Date.now()
  let resp: FetchResponse

  try {
    console.log('[AI] Enviando imagen binaria a modelo directo:', {
      url: fullUrl,
      headers,
      bufferSize: buffer.length
    })

    resp = await fetch(fullUrl, {
      method: 'POST',
      headers,
      body: buffer
    })
  } catch (err) {
    console.error('[AI] Error de red o fetch:', err)
    throw new AiError('Fetch failed: ' + (err instanceof Error ? err.message : String(err)), 'network')
  }

  const duration = Date.now() - startTime
  console.log(`[AI] Tiempo de respuesta: ${duration}ms`)
  console.log(`[AI] Código de estado: ${resp.status}`)

  if (!resp.ok) {
    const txt = await resp.text().catch(() => '')
    console.warn('[AI] Respuesta no OK:', txt.slice(0, 300))
    throw new AiError(`AI provider error: ${resp.status} ${txt}`, 'provider')
  }

  const result = await resp.json().catch(() => null)
  console.log('[AI] Resultado bruto recibido:', JSON.stringify(result).slice(0, 300) + '...')

  if (!Array.isArray(result) || !result[0]?.label) {
    throw new AiError('No label found in response', 'no_label')
  }

  const label = result[0].label.trim().toLowerCase()
  const isPet = esMascota(label)
  const species = isPet ? detectarEspecie(label) : null

  console.log('[AI] Clasificación:', {
    label,
    score: result[0].score,
    isPet,
    species
  })

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