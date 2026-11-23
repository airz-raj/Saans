import { fetchWithTimeout } from './http.js';

const ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models';
export const DEFAULT_MODEL = 'gemini-3.5-flash-lite';

export class GeminiError extends Error {}

export interface GeminiOptions {
  apiKey: string;
  model?: string;
  system: string;
  prompt: string;
  schema: object;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}

interface GeminiPayload {
  candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[];
}

/** Calls Gemini generateContent with structured JSON output and returns the parsed object. */
export async function generateJson(options: GeminiOptions): Promise<unknown> {
  const model = (options.model || DEFAULT_MODEL).replace(/[^a-z0-9.-]/gi, '');
  const response = await fetchWithTimeout(
    `${ENDPOINT}/${model}:generateContent`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': options.apiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: options.system }] },
        contents: [{ role: 'user', parts: [{ text: options.prompt }] }],
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 900,
          responseMimeType: 'application/json',
          responseSchema: options.schema,
        },
      }),
    },
    options.timeoutMs ?? 15_000,
    options.fetchImpl,
  );
  if (!response.ok) throw new GeminiError(`Gemini answered ${response.status}`);
  const payload = (await response.json()) as GeminiPayload;
  const text = payload.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';
  if (!text) throw new GeminiError('Gemini returned no content');
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new GeminiError('Gemini returned malformed JSON');
  }
}
