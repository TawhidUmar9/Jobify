import type { Result } from '../../lib/result';

/**
 * AI provider layer types. CONTRACT FILE (ARCHITECTURE.md §5).
 * The user brings their own key (BYOK). Two wire formats cover most providers:
 * - 'gemini': Google Gemini generateContent (supports PDF input).
 * - 'openai_compatible': POST {baseUrl}/chat/completions (OpenAI, OpenRouter, Groq, DeepSeek,
 *   Mistral, Ollama, LM Studio, …). No PDF input.
 */

export const AI_PROVIDER_KINDS = ['gemini', 'openai_compatible'] as const;
export type AiProviderKind = (typeof AI_PROVIDER_KINDS)[number];

/** Non-secret settings, stored in kv-store. The key itself lives in expo-secure-store. */
export interface AiConfig {
  provider: AiProviderKind;
  /** Model id sent to the provider, e.g. "gemini-3.8-flash", "gpt-5-mini", "llama3.1". */
  model: string;
  /** Scheme + host (+ path prefix), no trailing slash.
   *  gemini default "https://generativelanguage.googleapis.com";
   *  openai_compatible e.g. "https://api.openai.com/v1", "http://192.168.1.5:11434/v1". */
  baseUrl: string;
}

export const AI_DEFAULTS: Record<AiProviderKind, AiConfig> = {
  gemini: { provider: 'gemini', model: 'gemini-3.8-flash', baseUrl: 'https://generativelanguage.googleapis.com' },
  openai_compatible: { provider: 'openai_compatible', model: '', baseUrl: 'https://api.openai.com/v1' },
};

/** Providers that accept a PDF file in the request (resume import from PDF). */
export const PDF_CAPABLE_PROVIDERS: readonly AiProviderKind[] = ['gemini'];

/** JSON Schema subset used for structured output (lowercase types, standard keywords only:
 *  type, properties, required, items, enum, description). Converted for Gemini by toGeminiSchema. */
export interface JsonSchema {
  type: 'object' | 'array' | 'string' | 'integer' | 'number' | 'boolean';
  properties?: Record<string, JsonSchema>;
  required?: readonly string[];
  items?: JsonSchema;
  enum?: readonly string[];
  description?: string;
}

export interface AiRequest {
  /** System instruction text. */
  system: string;
  /** Single user turn text. */
  user: string;
  /** Structured output schema. */
  schema: JsonSchema;
  /** Short identifier, [a-z_]+, e.g. "job_analysis" (OpenAI json_schema.name). */
  schemaName: string;
  /** Optional PDF attachment (base64, no data: prefix). Only for PDF_CAPABLE_PROVIDERS. */
  pdfBase64?: string;
  /** Caller cancellation. */
  signal?: AbortSignal;
  /** Defaults to AI_TIMEOUT_MS. */
  timeoutMs?: number;
}

export const AI_TIMEOUT_MS = 30000;
/** Resume parsing reads a whole PDF; allow longer. */
export const AI_PARSE_TIMEOUT_MS = 60000;

export type AiErrorCode =
  | 'NOT_CONFIGURED'
  | 'PDF_NOT_SUPPORTED'
  | 'NETWORK'
  | 'TIMEOUT'
  | 'BAD_REQUEST'
  | 'AUTH'
  | 'MODEL_NOT_FOUND'
  | 'RATE_LIMITED'
  | 'SERVER'
  | 'BLOCKED'
  | 'EMPTY_RESPONSE'
  | 'INVALID_JSON'
  | 'SCHEMA_MISMATCH';

export interface AiError {
  code: AiErrorCode;
  httpStatus?: number;
}

/** User-facing copy per code. CONTRACT: UI_DIRECTIVES.md §6 uses these verbatim. */
export const AI_ERROR_MESSAGES: Record<AiErrorCode, string> = {
  NOT_CONFIGURED: 'AI is not set up. Add a provider and API key in Settings → AI provider.',
  PDF_NOT_SUPPORTED: 'This provider cannot read PDFs. Paste your resume text instead.',
  NETWORK: 'No connection. Check your internet and try again.',
  TIMEOUT: 'The AI took too long to answer. Try again.',
  BAD_REQUEST: 'The AI provider rejected the request. Check the model name in Settings → AI provider.',
  AUTH: 'The AI provider rejected your API key. Check it in Settings → AI provider.',
  MODEL_NOT_FOUND: 'This model is not available for your key. Change it in Settings → AI provider.',
  RATE_LIMITED: 'Rate limit reached. Wait a minute and try again.',
  SERVER: 'The AI provider is having problems. Try again in a minute.',
  BLOCKED: 'The AI declined to process this page.',
  EMPTY_RESPONSE: 'The AI returned no answer. Try again.',
  INVALID_JSON: 'The AI returned an unreadable answer. Try again or use a stronger model.',
  SCHEMA_MISMATCH: 'The AI returned an incomplete answer. Try again or use a stronger model.',
};

/** One wire-format adapter. Implementations: providers/gemini.ts, providers/openaiCompatible.ts. */
export interface AiProvider {
  readonly kind: AiProviderKind;
  /**
   * Sends one request and returns the parsed JSON value (not yet validated against the schema).
   * Never throws except re-throwing an AbortError caused by `req.signal`.
   */
  generateJson(req: AiRequest): Promise<Result<unknown, AiError>>;
}

/** Injected into providers so tests can replace fetch. */
export interface ProviderDeps {
  config: AiConfig;
  apiKey: string;
  fetchImpl?: typeof fetch;
}
