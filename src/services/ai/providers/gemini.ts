import { err, ok, type Result } from '../../../lib/result';
import { toGeminiSchema } from '../geminiSchema';
import { AI_TIMEOUT_MS, type AiError, type AiProvider, type AiRequest, type ProviderDeps } from '../types';

/**
 * Gemini adapter. CONTRACT: ARCHITECTURE.md §5 API-G, DECISIONS.md D-004.
 *
 * Request: POST `${config.baseUrl}/v1beta/models/${config.model}:generateContent`
 *   headers { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey }   (never ?key= in the URL)
 *   body {
 *     systemInstruction: { parts: [{ text: req.system }] },
 *     contents: [{ role: 'user', parts: [
 *       ...(req.pdfBase64 ? [{ inlineData: { mimeType: 'application/pdf', data: req.pdfBase64 } }] : []),
 *       { text: req.user } ] }],
 *     generationConfig: { responseMimeType: 'application/json',
 *                         responseSchema: toGeminiSchema(req.schema), temperature: 0.2 }
 *   }
 * Response text = join of candidates[0].content.parts[].text where part.thought !== true.
 *
 * Error mapping (first match wins):
 *   own timeout (req.timeoutMs ?? AI_TIMEOUT_MS) → TIMEOUT; req.signal aborted → re-throw AbortError;
 *   fetch throws → NETWORK;
 *   400 with API_KEY_INVALID (D-004) → AUTH; other 400 → BAD_REQUEST;
 *   401/403 → AUTH; 404 → MODEL_NOT_FOUND;
 *   429 → RATE_LIMITED; other non-2xx → SERVER; body not JSON → INVALID_JSON;
 *   promptFeedback.blockReason → BLOCKED; no candidates[0] → EMPTY_RESPONSE;
 *   finishReason ∈ SAFETY|RECITATION|BLOCKLIST|PROHIBITED_CONTENT|SPII → BLOCKED;
 *   empty text → EMPTY_RESPONSE; JSON.parse(text) throws → INVALID_JSON.
 * Never logs the key, prompts, or response text.
 */
const BLOCKED_FINISH_REASONS = new Set(['SAFETY', 'RECITATION', 'BLOCKLIST', 'PROHIBITED_CONTENT', 'SPII']);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isAbortError(error: unknown): error is Error {
  return error instanceof Error && error.name === 'AbortError';
}

function asAbortError(error: unknown): Error {
  if (isAbortError(error)) return error;
  const created = new Error('The request was aborted.');
  created.name = 'AbortError';
  return created;
}

function isApiKeyInvalidBody(body: unknown): boolean {
  if (!isRecord(body)) return false;
  const errorObj = body.error;
  if (!isRecord(errorObj)) return false;
  if (errorObj.status !== 'INVALID_ARGUMENT') return false;
  const details = errorObj.details;
  if (!Array.isArray(details)) return false;
  return details.some((entry) => isRecord(entry) && entry.reason === 'API_KEY_INVALID');
}

function httpError(status: number): AiError {
  if (status === 400) return { code: 'BAD_REQUEST', httpStatus: status };
  if (status === 401 || status === 403) return { code: 'AUTH', httpStatus: status };
  if (status === 404) return { code: 'MODEL_NOT_FOUND', httpStatus: status };
  if (status === 429) return { code: 'RATE_LIMITED', httpStatus: status };
  return { code: 'SERVER', httpStatus: status };
}

function readText(candidate: Record<string, unknown>): string {
  const content = candidate.content;
  if (!isRecord(content) || !Array.isArray(content.parts)) return '';
  const pieces: string[] = [];
  for (const part of content.parts) {
    if (!isRecord(part) || part.thought === true) continue;
    if (typeof part.text === 'string') pieces.push(part.text);
  }
  return pieces.join('');
}

export function createGeminiProvider(deps: ProviderDeps): AiProvider {
  const fetchImpl = deps.fetchImpl ?? fetch;
  return {
    kind: 'gemini',
    async generateJson(req: AiRequest): Promise<Result<unknown, AiError>> {
      if (req.signal?.aborted) throw asAbortError(req.signal.reason);
      const timeoutMs = req.timeoutMs ?? AI_TIMEOUT_MS;
      const controller = new AbortController();
      let timedOut = false;
      const timer = setTimeout(() => {
        timedOut = true;
        controller.abort();
      }, timeoutMs);
      const onAbort = (): void => {
        controller.abort();
      };
      req.signal?.addEventListener('abort', onAbort);
      try {
        const url = `${deps.config.baseUrl}/v1beta/models/${deps.config.model}:generateContent`;
        const parts: Record<string, unknown>[] = [];
        if (req.pdfBase64) {
          parts.push({ inlineData: { mimeType: 'application/pdf', data: req.pdfBase64 } });
        }
        parts.push({ text: req.user });
        let response: Response;
        try {
          response = await fetchImpl(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-goog-api-key': deps.apiKey,
            },
            body: JSON.stringify({
              systemInstruction: { parts: [{ text: req.system }] },
              contents: [{ role: 'user', parts }],
              generationConfig: {
                responseMimeType: 'application/json',
                responseSchema: toGeminiSchema(req.schema),
                temperature: 0.2,
              },
            }),
            signal: controller.signal,
          });
        } catch (error) {
          if (timedOut) return err({ code: 'TIMEOUT' });
          if (req.signal?.aborted || isAbortError(error)) throw asAbortError(error);
          return err({ code: 'NETWORK' });
        }
        if (!response.ok) {
          if (response.status === 400) {
            let body: unknown;
            try {
              body = await response.json();
            } catch {
              return err({ code: 'BAD_REQUEST', httpStatus: 400 });
            }
            if (isApiKeyInvalidBody(body)) {
              return err({ code: 'AUTH', httpStatus: 400 });
            }
            return err({ code: 'BAD_REQUEST', httpStatus: 400 });
          }
          return err(httpError(response.status));
        }
        let payload: unknown;
        try {
          payload = await response.json();
        } catch {
          return err({ code: 'INVALID_JSON', httpStatus: response.status });
        }
        if (!isRecord(payload)) return err({ code: 'INVALID_JSON', httpStatus: response.status });
        const feedback = payload.promptFeedback;
        if (isRecord(feedback) && typeof feedback.blockReason === 'string' && feedback.blockReason.length > 0) {
          return err({ code: 'BLOCKED', httpStatus: response.status });
        }
        const candidates = payload.candidates;
        const candidate = Array.isArray(candidates) ? candidates[0] : undefined;
        if (!isRecord(candidate)) return err({ code: 'EMPTY_RESPONSE', httpStatus: response.status });
        if (typeof candidate.finishReason === 'string' && BLOCKED_FINISH_REASONS.has(candidate.finishReason)) {
          return err({ code: 'BLOCKED', httpStatus: response.status });
        }
        const text = readText(candidate);
        if (text.length === 0) return err({ code: 'EMPTY_RESPONSE', httpStatus: response.status });
        try {
          return ok(JSON.parse(text) as unknown);
        } catch {
          return err({ code: 'INVALID_JSON', httpStatus: response.status });
        }
      } finally {
        clearTimeout(timer);
        req.signal?.removeEventListener('abort', onAbort);
      }
    },
  };
}
