import { err, ok, type Result } from '../../../lib/result';
import { AI_TIMEOUT_MS, type AiError, type AiProvider, type AiRequest, type ProviderDeps } from '../types';

/**
 * OpenAI-compatible adapter (OpenAI, OpenRouter, Groq, DeepSeek, Mistral, Ollama, LM Studio…).
 * CONTRACT: ARCHITECTURE.md §5 API-O.
 *
 * Request: POST `${config.baseUrl}/chat/completions`
 *   headers { 'Content-Type': 'application/json', ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}) }
 *     (an empty key is allowed: local servers such as Ollama need none)
 *   body {
 *     model: config.model,
 *     temperature: 0.2,
 *     messages: [{ role: 'system', content: req.system }, { role: 'user', content: req.user }],
 *     response_format: { type: 'json_schema', json_schema: { name: req.schemaName, schema: req.schema, strict: false } }
 *   }
 * If req.pdfBase64 is set → return err PDF_NOT_SUPPORTED without sending.
 * JSON-mode fallback: if the first attempt returns HTTP 400, retry ONCE with
 *   response_format: { type: 'json_object' } and the system text suffixed with
 *   "\n\nRespond only with JSON matching this schema:\n" + JSON.stringify(req.schema).
 *   A second 400 → BAD_REQUEST.
 * Response text = choices[0].message.content (string). Strip one surrounding ```json … ``` fence
 * if present before JSON.parse.
 *
 * Error mapping: same table as gemini.ts for transport/HTTP codes; no choices[0] or empty content →
 * EMPTY_RESPONSE; choices[0].finish_reason === 'content_filter' → BLOCKED; parse failure → INVALID_JSON.
 * config.model empty → NOT_CONFIGURED (no request).
 */

type Attempt =
  | { kind: 'timeout' }
  | { kind: 'network' }
  | { kind: 'http'; status: number }
  | { kind: 'invalid-json'; status: number }
  | { kind: 'payload'; status: number; payload: unknown };

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

function httpError(status: number): AiError {
  if (status === 400) return { code: 'BAD_REQUEST', httpStatus: status };
  if (status === 401 || status === 403) return { code: 'AUTH', httpStatus: status };
  if (status === 404) return { code: 'MODEL_NOT_FOUND', httpStatus: status };
  if (status === 429) return { code: 'RATE_LIMITED', httpStatus: status };
  return { code: 'SERVER', httpStatus: status };
}

function stripFence(text: string): string {
  const trimmed = text.trim();
  const fenced = /^```json\s*([\s\S]*?)\s*```$/.exec(trimmed) ?? /^```\s*([\s\S]*?)\s*```$/.exec(trimmed);
  return fenced?.[1]?.trim() ?? trimmed;
}

function readPayload(payload: unknown, status: number): Result<unknown, AiError> {
  if (!isRecord(payload) || !Array.isArray(payload.choices)) {
    return err({ code: 'EMPTY_RESPONSE', httpStatus: status });
  }
  const choice = payload.choices[0];
  if (!isRecord(choice)) return err({ code: 'EMPTY_RESPONSE', httpStatus: status });
  if (choice.finish_reason === 'content_filter') return err({ code: 'BLOCKED', httpStatus: status });
  const message = choice.message;
  const content = isRecord(message) && typeof message.content === 'string' ? message.content : '';
  if (content.length === 0) return err({ code: 'EMPTY_RESPONSE', httpStatus: status });
  const text = stripFence(content);
  if (text.length === 0) return err({ code: 'EMPTY_RESPONSE', httpStatus: status });
  try {
    return ok(JSON.parse(text) as unknown);
  } catch {
    return err({ code: 'INVALID_JSON', httpStatus: status });
  }
}

function finish(attempt: Attempt): Result<unknown, AiError> {
  if (attempt.kind === 'timeout') return err({ code: 'TIMEOUT' });
  if (attempt.kind === 'network') return err({ code: 'NETWORK' });
  if (attempt.kind === 'http') return err(httpError(attempt.status));
  if (attempt.kind === 'invalid-json') return err({ code: 'INVALID_JSON', httpStatus: attempt.status });
  return readPayload(attempt.payload, attempt.status);
}

export function createOpenAiCompatibleProvider(deps: ProviderDeps): AiProvider {
  const fetchImpl = deps.fetchImpl ?? fetch;
  return {
    kind: 'openai_compatible',
    async generateJson(req: AiRequest): Promise<Result<unknown, AiError>> {
      if (req.pdfBase64) return err({ code: 'PDF_NOT_SUPPORTED' });
      if (deps.config.model.length === 0) return err({ code: 'NOT_CONFIGURED' });
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
      const url = `${deps.config.baseUrl}/chat/completions`;
      const attempt = async (system: string, responseFormat: Record<string, unknown>): Promise<Attempt> => {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (deps.apiKey.length > 0) headers.Authorization = `Bearer ${deps.apiKey}`;
        try {
          const response = await fetchImpl(url, {
            method: 'POST',
            headers,
            body: JSON.stringify({
              model: deps.config.model,
              temperature: 0.2,
              messages: [
                { role: 'system', content: system },
                { role: 'user', content: req.user },
              ],
              response_format: responseFormat,
            }),
            signal: controller.signal,
          });
          if (!response.ok) return { kind: 'http', status: response.status };
          try {
            const payload: unknown = await response.json();
            return { kind: 'payload', status: response.status, payload };
          } catch {
            return { kind: 'invalid-json', status: response.status };
          }
        } catch (error) {
          if (timedOut) return { kind: 'timeout' };
          if (req.signal?.aborted || isAbortError(error)) throw asAbortError(error);
          return { kind: 'network' };
        }
      };
      try {
        const schemaFormat = {
          type: 'json_schema',
          json_schema: { name: req.schemaName, schema: req.schema, strict: false },
        };
        const first = await attempt(req.system, schemaFormat);
        if (first.kind === 'http' && first.status === 400) {
          const second = await attempt(`${req.system}\n\nRespond only with JSON matching this schema:\n${JSON.stringify(req.schema)}`, {
            type: 'json_object',
          });
          if (second.kind === 'http' && second.status === 400) return err({ code: 'BAD_REQUEST', httpStatus: 400 });
          return finish(second);
        }
        return finish(first);
      } finally {
        clearTimeout(timer);
        req.signal?.removeEventListener('abort', onAbort);
      }
    },
  };
}
