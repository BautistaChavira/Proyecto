// server/src/ai/aiClient.ts
import fetch from 'node-fetch'; // o usar global fetch en Node 18+
import FormData from 'form-data';

export type IdentifyResult = {
  breed: string;
  confidence?: number;
};

export class AiError extends Error {
  public code?: string;
  constructor(message: string, code?: string) {
    super(message);
    this.name = 'AiError';
    this.code = code;
  }
}

export async function identifyImageFromBuffer(
  buffer: Buffer,
  filename: string,
  contentType: string
): Promise<IdentifyResult> {
  const AI_API_URL = process.env.AI_API_URL;
  const AI_API_KEY = process.env.AI_API_KEY;

  if (!AI_API_URL) throw new AiError('AI_API_URL missing', 'config');

  const form = new FormData();
  form.append('image', buffer, { filename, contentType });

  const headers: Record<string, string> = {};
  if (AI_API_KEY) headers['Authorization'] = `Bearer ${AI_API_KEY}`;

  const resp = await fetch(AI_API_URL, {
    method: 'POST',
    headers,
    body: form as any
  });

  if (!resp.ok) {
    const txt = await resp.text().catch(() => '');
    throw new AiError(`AI provider error: ${resp.status} ${txt}`, 'provider');
  }

  const payload: unknown = await resp.json().catch(() => null);

  // Extracción robusta y explícita
  const candidate = extractBreed(payload);
  if (!candidate) {
    throw new AiError('No breed found in AI response', 'no_breed');
  }

  return { breed: candidate.name, confidence: candidate.confidence };
}

/* Helper types and extractor */
type Candidate = { name: string; confidence?: number } | null;

function extractBreed(payload: unknown): Candidate {
  if (!payload) return null;

  if (typeof payload === 'string') return { name: payload };

  if (typeof payload === 'object') {
    const obj = payload as Record<string, unknown>;

    // Common single-field responses
    const direct = stringFromKeys(obj, ['breed', 'label', 'name']);
    if (direct) return { name: direct };

    // predictions: [{ label, score }]
    const preds = obj.predictions ?? obj.outputs ?? obj.results ?? obj.data;
    if (Array.isArray(preds) && preds.length > 0) {
      const first = preds[0] as Record<string, unknown>;
      const l = stringFromKeys(first, ['label', 'name']);
      const s = numberFromKeys(first, ['score', 'confidence', 'probability']);
      if (l) return { name: l, confidence: s ?? undefined };
    }

    // nested outputs[0].label
    if (Array.isArray((obj as any).outputs) && (obj as any).outputs.length > 0) {
      const out0 = (obj as any).outputs[0];
      const l = typeof out0?.label === 'string' ? out0.label : null;
      const s = typeof out0?.score === 'number' ? out0.score : undefined;
      if (l) return { name: l, confidence: s };
    }
  }

  return null;
}

function stringFromKeys(o: Record<string, unknown>, keys: string[]): string | null {
  for (const k of keys) {
    const v = o[k];
    if (typeof v === 'string' && v.trim()) return v.trim();
    if (Array.isArray(v) && typeof v[0] === 'string' && v[0].trim()) return v[0].trim();
  }
  return null;
}

function numberFromKeys(o: Record<string, unknown>, keys: string[]): number | null {
  for (const k of keys) {
    const v = o[k];
    if (typeof v === 'number') return v;
    if (typeof v === 'string' && !Number.isNaN(Number(v))) return Number(v);
  }
  return null;
}
