import type { PageScrapedMessage } from '../../bridge/messages';
import type { Result } from '../../lib/result';
import type {
  CandidateProfile,
  JobAnalysis,
  JobPreferences,
  Resume,
  SavedAnswer,
  TailorResult,
} from '../../types/domain';
import type { AiConfig, AiError, AiProvider } from './types';
import type { ResumeParseResult } from './validate';

/**
 * High-level AI calls used by features. Each one: build prompt (prompts.ts) → provider.generateJson
 * with the matching schema (schemas.ts) → validator (validate.ts). A validator failure maps to
 * { code: 'SCHEMA_MISMATCH' }. CONTRACT: ARCHITECTURE.md §5.
 */

/**
 * Returns the provider for a config, or null when not usable:
 * gemini requires a non-empty apiKey; openai_compatible requires non-empty model and baseUrl
 * (apiKey may be empty). Uses createGeminiProvider / createOpenAiCompatibleProvider.
 */
export function createProvider(config: AiConfig, apiKey: string, fetchImpl?: typeof fetch): AiProvider | null {
  // TODO(T-016): implement.
  void config;
  void apiKey;
  void fetchImpl;
  return null;
}

/** AI-4: generateJson(PING_PROMPT, PING_SCHEMA, schemaName 'ping', timeout 15000). ok:true → ok(true). */
export async function testConnection(provider: AiProvider | null): Promise<Result<true, AiError>> {
  // TODO(T-016): implement. provider null → NOT_CONFIGURED.
  void provider;
  return { ok: false, error: { code: 'NOT_CONFIGURED' } };
}

/**
 * AI-1. Exactly one of pdfBase64 / pastedText is non-null. PDF with a provider not in
 * PDF_CAPABLE_PROVIDERS → PDF_NOT_SUPPORTED (no request). Timeout AI_PARSE_TIMEOUT_MS.
 * schemaName 'resume_parse'.
 */
export async function parseResume(
  provider: AiProvider | null,
  input: { pdfBase64: string | null; pastedText: string | null },
  signal?: AbortSignal,
): Promise<Result<ResumeParseResult, AiError>> {
  // TODO(T-016): implement.
  void provider;
  void input;
  void signal;
  return { ok: false, error: { code: 'NOT_CONFIGURED' } };
}

/** AI-2. schemaName 'job_analysis'. Validated with validateJobAnalysis(raw, scraped.inputs, resumes). */
export async function analyzeJob(
  provider: AiProvider | null,
  args: {
    profile: CandidateProfile;
    preferences: JobPreferences;
    resumes: readonly Resume[];
    answers: readonly SavedAnswer[];
    scraped: PageScrapedMessage;
    today: Date;
  },
  signal?: AbortSignal,
): Promise<Result<JobAnalysis, AiError>> {
  // TODO(T-016): implement.
  void provider;
  void args;
  void signal;
  return { ok: false, error: { code: 'NOT_CONFIGURED' } };
}

/** AI-3. schemaName 'tailor'. Validated with validateTailor. */
export async function tailorApplication(
  provider: AiProvider | null,
  args: { profile: CandidateProfile; resume: Resume | null; analysis: JobAnalysis; pageText: string },
  signal?: AbortSignal,
): Promise<Result<TailorResult, AiError>> {
  // TODO(T-016): implement.
  void provider;
  void args;
  void signal;
  return { ok: false, error: { code: 'NOT_CONFIGURED' } };
}
