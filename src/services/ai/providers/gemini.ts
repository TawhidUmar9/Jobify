import type { AiProvider, ProviderDeps } from '../types';

/**
 * Gemini adapter. CONTRACT: ARCHITECTURE.md §5 API-G.
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
 *   fetch throws → NETWORK; 400 → BAD_REQUEST; 401/403 → AUTH; 404 → MODEL_NOT_FOUND;
 *   429 → RATE_LIMITED; other non-2xx → SERVER; body not JSON → INVALID_JSON;
 *   promptFeedback.blockReason → BLOCKED; no candidates[0] → EMPTY_RESPONSE;
 *   finishReason ∈ SAFETY|RECITATION|BLOCKLIST|PROHIBITED_CONTENT|SPII → BLOCKED;
 *   empty text → EMPTY_RESPONSE; JSON.parse(text) throws → INVALID_JSON.
 * Never logs the key, prompts, or response text.
 */
export function createGeminiProvider(deps: ProviderDeps): AiProvider {
  // TODO(T-014): implement per the rules above.
  void deps;
  return {
    kind: 'gemini',
    generateJson: async () => ({ ok: false, error: { code: 'NOT_CONFIGURED' } }),
  };
}
