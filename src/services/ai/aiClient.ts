import type { PageScrapedMessage } from '../../bridge/messages';
import { err, ok, type Result } from '../../lib/result';
import type {
  CandidateProfile,
  JobAnalysis,
  JobPreferences,
  Resume,
  SavedAnswer,
  TailorResult,
} from '../../types/domain';

import { buildAnalyzePrompt, buildResumeParsePrompt, buildTailorPrompt, PING_PROMPT } from './prompts';
import { createGeminiProvider } from './providers/gemini';
import { createOpenAiCompatibleProvider } from './providers/openaiCompatible';
import { JOB_ANALYSIS_SCHEMA, PING_SCHEMA, RESUME_PARSE_SCHEMA, TAILOR_SCHEMA } from './schemas';
import {
  AI_PARSE_TIMEOUT_MS,
  AI_TIMEOUT_MS,
  PDF_CAPABLE_PROVIDERS,
  type AiConfig,
  type AiError,
  type AiProvider,
} from './types';
import { validateJobAnalysis, validateResumeParse, validateTailor, type ResumeParseResult } from './validate';

/**
 * High-level AI calls used by features. Each one: build prompt (prompts.ts) → provider.generateJson
 * with the matching schema (schemas.ts) → validator (validate.ts). A validator failure maps to
 * { code: 'SCHEMA_MISMATCH' }. CONTRACT: ARCHITECTURE.md §5.
 */

function isPdfCapable(kind: AiProvider['kind']): boolean {
  return (PDF_CAPABLE_PROVIDERS as readonly string[]).includes(kind);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Returns the provider for a config, or null when not usable:
 * gemini requires a non-empty apiKey; openai_compatible requires non-empty model and baseUrl
 * (apiKey may be empty). Uses createGeminiProvider / createOpenAiCompatibleProvider.
 */
export function createProvider(config: AiConfig, apiKey: string, fetchImpl?: typeof fetch): AiProvider | null {
  if (config.provider === 'gemini') {
    if (apiKey.trim().length === 0) return null;
    return createGeminiProvider({ config, apiKey: apiKey.trim(), fetchImpl });
  }
  if (config.model.trim().length === 0 || config.baseUrl.trim().length === 0) return null;
  return createOpenAiCompatibleProvider({ config, apiKey, fetchImpl });
}

/** AI-4: generateJson(PING_PROMPT, PING_SCHEMA, schemaName 'ping', timeout 15000). ok:true → ok(true). */
export async function testConnection(provider: AiProvider | null): Promise<Result<true, AiError>> {
  if (!provider) return err({ code: 'NOT_CONFIGURED' });
  const result = await provider.generateJson({
    system: PING_PROMPT.system,
    user: PING_PROMPT.user,
    schema: PING_SCHEMA,
    schemaName: 'ping',
    timeoutMs: 15000,
  });
  if (!result.ok) return result;
  if (isRecord(result.value) && result.value.ok === true) return ok(true);
  return err({ code: 'SCHEMA_MISMATCH' });
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
  if (!provider) return err({ code: 'NOT_CONFIGURED' });
  const hasPdf = input.pdfBase64 !== null;
  const hasText = input.pastedText !== null;
  if (hasPdf === hasText) return err({ code: 'SCHEMA_MISMATCH' });
  if (hasPdf && !isPdfCapable(provider.kind)) return err({ code: 'PDF_NOT_SUPPORTED' });
  const prompt = buildResumeParsePrompt({ pastedText: input.pastedText });
  const result = await provider.generateJson({
    system: prompt.system,
    user: prompt.user,
    schema: RESUME_PARSE_SCHEMA,
    schemaName: 'resume_parse',
    pdfBase64: input.pdfBase64 ?? undefined,
    signal,
    timeoutMs: AI_PARSE_TIMEOUT_MS,
  });
  if (!result.ok) return result;
  const validated = validateResumeParse(result.value);
  if (!validated.ok) return err({ code: 'SCHEMA_MISMATCH' });
  return validated;
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
  if (!provider) return err({ code: 'NOT_CONFIGURED' });
  const prompt = buildAnalyzePrompt(args);
  const result = await provider.generateJson({
    system: prompt.system,
    user: prompt.user,
    schema: JOB_ANALYSIS_SCHEMA,
    schemaName: 'job_analysis',
    signal,
    timeoutMs: AI_TIMEOUT_MS,
  });
  if (!result.ok) return result;
  const validated = validateJobAnalysis(result.value, args.scraped.inputs, args.resumes);
  if (!validated.ok) return err({ code: 'SCHEMA_MISMATCH' });
  return validated;
}

/** AI-3. schemaName 'tailor'. Validated with validateTailor. */
export async function tailorApplication(
  provider: AiProvider | null,
  args: { profile: CandidateProfile; resume: Resume | null; analysis: JobAnalysis; pageText: string },
  signal?: AbortSignal,
): Promise<Result<TailorResult, AiError>> {
  if (!provider) return err({ code: 'NOT_CONFIGURED' });
  const prompt = buildTailorPrompt(args);
  const result = await provider.generateJson({
    system: prompt.system,
    user: prompt.user,
    schema: TAILOR_SCHEMA,
    schemaName: 'tailor',
    signal,
    timeoutMs: AI_TIMEOUT_MS,
  });
  if (!result.ok) return result;
  const validated = validateTailor(result.value);
  if (!validated.ok) return err({ code: 'SCHEMA_MISMATCH' });
  return validated;
}
