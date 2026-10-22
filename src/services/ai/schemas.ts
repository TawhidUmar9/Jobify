import type { JsonSchema } from './types';

/**
 * Structured-output schemas for every AI call. CONTRACT FILE. Complete, not stubs.
 * Enums must equal the domain enums (tests/contracts checks this).
 */

const stringArray: JsonSchema = { type: 'array', items: { type: 'string' } };

/** AI-2 analyzeJob → validated by validateJobAnalysis. */
export const JOB_ANALYSIS_SCHEMA: JsonSchema = {
  type: 'object',
  properties: {
    companyName: { type: 'string' },
    roleTitle: { type: 'string' },
    eligibility: { type: 'string', enum: ['ELIGIBLE', 'NOT_ELIGIBLE', 'UNCLEAR'] },
    eligibilityReason: { type: 'string' },
    redFlags: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          code: {
            type: 'string',
            enum: [
              'LOCATION_OR_AUTHORIZATION',
              'TIMEZONE_MISMATCH',
              'UNPAID_TRIAL_WORK',
              'NO_SALARY_INFO',
              'SALARY_BELOW_MINIMUM',
              'STALE_POSTING',
              'BLOCKED_COMPANY',
              'OTHER',
            ],
          },
          detail: { type: 'string' },
        },
        required: ['code', 'detail'],
      },
    },
    matchScore: { type: 'integer' },
    recommendedResumeId: { type: 'integer', description: 'id from Resumes, or -1 if there are none' },
    resumeReason: { type: 'string' },
    matchedSkills: stringArray,
    missingSkills: stringArray,
    fieldMappings: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          clawId: { type: 'string' },
          fieldLabel: { type: 'string' },
          value: { type: 'string' },
          source: { type: 'string', enum: ['PROFILE', 'ANSWER_BANK', 'GENERATED'] },
        },
        required: ['clawId', 'fieldLabel', 'value', 'source'],
      },
    },
  },
  required: [
    'companyName',
    'roleTitle',
    'eligibility',
    'eligibilityReason',
    'redFlags',
    'matchScore',
    'recommendedResumeId',
    'resumeReason',
    'matchedSkills',
    'missingSkills',
    'fieldMappings',
  ],
};

/** AI-3 tailorApplication → validated by validateTailor. */
export const TAILOR_SCHEMA: JsonSchema = {
  type: 'object',
  properties: {
    emphasize: stringArray,
    bulletRewrites: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          original: { type: 'string' },
          suggested: { type: 'string' },
          reason: { type: 'string' },
        },
        required: ['original', 'suggested', 'reason'],
      },
    },
    coverNote: { type: 'string' },
    coldDm: { type: 'string' },
  },
  required: ['emphasize', 'bulletRewrites', 'coverNote', 'coldDm'],
};

/** AI-1 parseResume → validated by validateResumeParse. Maps onto CandidateProfile + ResumeContent. */
export const RESUME_PARSE_SCHEMA: JsonSchema = {
  type: 'object',
  properties: {
    fullName: { type: 'string' },
    email: { type: 'string' },
    phone: { type: 'string' },
    location: { type: 'string' },
    headline: { type: 'string' },
    summary: { type: 'string' },
    links: {
      type: 'array',
      items: {
        type: 'object',
        properties: { label: { type: 'string' }, url: { type: 'string' } },
        required: ['label', 'url'],
      },
    },
    skills: stringArray,
    experience: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          company: { type: 'string' },
          start: { type: 'string' },
          end: { type: 'string' },
          bullets: stringArray,
        },
        required: ['title', 'company', 'start', 'end', 'bullets'],
      },
    },
    education: {
      type: 'array',
      items: {
        type: 'object',
        properties: { school: { type: 'string' }, degree: { type: 'string' }, year: { type: 'string' } },
        required: ['school', 'degree', 'year'],
      },
    },
    highlights: stringArray,
  },
  required: ['fullName', 'email', 'phone', 'location', 'headline', 'summary', 'links', 'skills', 'experience', 'education', 'highlights'],
};

/** AI-4 testConnection. */
export const PING_SCHEMA: JsonSchema = {
  type: 'object',
  properties: { ok: { type: 'boolean' } },
  required: ['ok'],
};
