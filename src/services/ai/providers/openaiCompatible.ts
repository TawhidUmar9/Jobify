import type { AiProvider, ProviderDeps } from '../types';

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
export function createOpenAiCompatibleProvider(deps: ProviderDeps): AiProvider {
  // TODO(T-015): implement per the rules above.
  void deps;
  return {
    kind: 'openai_compatible',
    generateJson: async () => ({ ok: false, error: { code: 'NOT_CONFIGURED' } }),
  };
}
