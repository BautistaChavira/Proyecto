import fetch, { Response as FetchResponse } from 'node-fetch'
import { HfInference } from '@huggingface/inference'


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
  const HF_API_KEY = process.env.AI_API_KEY
  const HF_MODEL = process.env.AI_MODEL
  const HF_API_URL = process.env.AI_API_URL?.replace(/\/+$/, '')

  const REPLICATE_API_KEY = process.env.REPLICATE_API_KEY
  const REPLICATE_MODEL = process.env.REPLICATE_MODEL

  const useReplicate = Boolean(REPLICATE_API_KEY && REPLICATE_MODEL)

  console.log('[AI] Configuración cargada:', {
    proveedor: useReplicate ? 'Replicate' : 'Hugging Face',
    modelo: useReplicate ? REPLICATE_MODEL : HF_MODEL,
    bufferSize: buffer.length,
    contentType,
    filename
  })

  const startTime = Date.now()
  let result

  try {
    if (useReplicate) {
      const base64 = buffer.toString('base64')
      const response = await fetch(`https://api.replicate.com/v1/predictions`, {
        method: 'POST',
        headers: {
          Authorization: `Token ${REPLICATE_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          version: REPLICATE_MODEL,
          input: {
            image: `data:${contentType};base64,${base64}`
          }
        })
      })

      const json = await response.json()
      if (!response.ok || !json.output) {
        throw new AiError(`Replicate error: ${json.detail || response.statusText}`, 'provider')
      }

      result = json.output
    } else {
      const hf = new HfInference(HF_API_KEY!)
      const arrayBuffer = Uint8Array.from(buffer).buffer

      result = await hf.imageClassification({
        model: HF_MODEL!,
        data: arrayBuffer
      })
    }
  } catch (err) {
    console.error('[AI] Error en inferencia:', err)
    throw new AiError('Error en inferencia: ' + (err instanceof Error ? err.message : String(err)), 'provider')
  }

  const duration = Date.now() - startTime
  console.log(`[AI] Tiempo de respuesta: ${duration}ms`)
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