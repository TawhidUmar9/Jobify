/**
 * Domain types. CONTRACT FILE: do not change without an entry in DECISIONS.md.
 * Enums here mirror CHECK constraints in src/db/schema.ts and the AI JSON schemas in
 * src/services/ai/schemas.ts. tests/contracts/contracts.test.ts keeps them in sync.
 */

// ---------------------------------------------------------------------------
// Candidate profile (one per install; filled in onboarding, editable in Settings)
// ---------------------------------------------------------------------------

export interface ProfileLink {
  /** e.g. "LinkedIn", "GitHub", "Portfolio". Max 40 chars. */
  label: string;
  /** Absolute http(s) URL. */
  url: string;
}

export interface ExperienceEntry {
  title: string;
  company: string;
  /** Free text, e.g. "Jan 2024". */
  start: string;
  /** Free text; "Present" for current roles. */
  end: string;
  /** Achievement bullets, max 10. */
  bullets: string[];
}

export interface EducationEntry {
  school: string;
  degree: string;
  /** Free text, e.g. "2026" or "2022–2026". */
  year: string;
}

/** Everything auto-fill and the AI may state about the user. Nothing else is ever invented. */
export interface CandidateProfile {
  fullName: string;
  email: string;
  phone: string;
  /** City, country as the user wants it shown, e.g. "Dhaka, Bangladesh". */
  location: string;
  /** ISO 3166-1 alpha-2 country the user lives in, e.g. "BD". '' if unknown. */
  countryCode: string;
  /** IANA time zone, e.g. "Asia/Dhaka". Defaults from the device. */
  timeZone: string;
  /** One line, e.g. "Backend engineer, 3 years". */
  headline: string;
  /** 2–5 sentences. */
  summary: string;
  links: ProfileLink[];
  skills: string[];
  experience: ExperienceEntry[];
  education: EducationEntry[];
  /** Extra facts the user allows auto-fill to use, e.g. "Notice period: 2 weeks". Max 20. */
  extraFacts: string[];
}

export const EMPTY_PROFILE: CandidateProfile = {
  fullName: '',
  email: '',
  phone: '',
  location: '',
  countryCode: '',
  timeZone: '',
  headline: '',
  summary: '',
  links: [],
  skills: [],
  experience: [],
  education: [],
  extraFacts: [],
};

// ---------------------------------------------------------------------------
// Job preferences (drive eligibility and red flags)
// ---------------------------------------------------------------------------

export const WORK_MODES = ['REMOTE', 'HYBRID', 'ONSITE'] as const;
export type WorkMode = (typeof WORK_MODES)[number];

export interface JobPreferences {
  /** e.g. ["Backend Engineer", "Platform Engineer"]. Max 10. */
  targetRoles: string[];
  /** Acceptable work modes; at least one. */
  workModes: WorkMode[];
  /** ISO alpha-2 countries where the user may legally work without sponsorship. */
  workAuthorizedCountries: string[];
  /** True if the user would relocate with visa sponsorship. */
  openToSponsorship: boolean;
  /** Minimum hours of overlap with the employer's working day the user accepts (0–8). */
  minTimeZoneOverlapHours: number;
  /** Minimum yearly salary, or null for "don't filter". */
  minSalary: number | null;
  /** ISO 4217, e.g. "USD". Ignored when minSalary is null. */
  salaryCurrency: string;
  /** Companies to flag (case-insensitive match on companyName). Max 50. */
  blockedCompanies: string[];
}

export const DEFAULT_PREFERENCES: JobPreferences = {
  targetRoles: [],
  workModes: ['REMOTE'],
  workAuthorizedCountries: [],
  openToSponsorship: false,
  minTimeZoneOverlapHours: 2,
  minSalary: null,
  salaryCurrency: 'USD',
  blockedCompanies: [],
};

// ---------------------------------------------------------------------------
// Resumes (user-imported PDFs + parsed content)
// ---------------------------------------------------------------------------

/** AI-parsed or user-entered content of one resume version. */
export interface ResumeContent {
  summary: string;
  skills: string[];
  /** Strongest achievements, max 10. Used for scoring and bullet rewrites. */
  highlights: string[];
}

/** Row of `resumes`. */
export interface Resume {
  id: number;
  /** User label, e.g. "Backend", "Full-stack". Max 40 chars, unique. */
  label: string;
  /** Original file name shown to recruiters, e.g. "Alex_Rahman_Backend.pdf". null = text-only resume. */
  fileName: string | null;
  /** file:// URI of the app's private copy (documentDirectory/resumes/<id>.pdf), or null. */
  fileUri: string | null;
  content: ResumeContent;
  /** SQLite CURRENT_TIMESTAMP, UTC "YYYY-MM-DD HH:MM:SS". */
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Job boards
// ---------------------------------------------------------------------------

/** Row of `job_boards`: a pill in the Workspace bar. */
export interface JobBoard {
  id: number;
  /** Pill label, max 16 chars. */
  name: string;
  /** Absolute https URL opened the first time. */
  url: string;
  /** Last same-host http(s) URL reached while this board was active, or null. */
  lastVisitedUrl: string | null;
  /** Ascending, left to right. Contiguous from 0 after any reorder. */
  sortOrder: number;
}

// ---------------------------------------------------------------------------
// Answer bank
// ---------------------------------------------------------------------------

/** Row of `answers`: a reusable answer to a recurring application question. */
export interface SavedAnswer {
  id: number;
  /** Question as it appeared on a form, e.g. "What is your notice period?". Max 300 chars. */
  question: string;
  /** Max 4000 chars. */
  answer: string;
  /** Times auto-fill used it (incremented after a fill that included it). */
  useCount: number;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Analysis (AI-2) and tailoring (AI-3)
// ---------------------------------------------------------------------------

export const ELIGIBILITIES = ['ELIGIBLE', 'NOT_ELIGIBLE', 'UNCLEAR'] as const;
/** Whether the user can take this job given location, authorization, and work mode. */
export type Eligibility = (typeof ELIGIBILITIES)[number];

export const RED_FLAG_CODES = [
  'LOCATION_OR_AUTHORIZATION',
  'TIMEZONE_MISMATCH',
  'UNPAID_TRIAL_WORK',
  'NO_SALARY_INFO',
  'SALARY_BELOW_MINIMUM',
  'STALE_POSTING',
  'BLOCKED_COMPANY',
  'OTHER',
] as const;
export type RedFlagCode = (typeof RED_FLAG_CODES)[number];

export interface RedFlag {
  code: RedFlagCode;
  /** One sentence quoting or paraphrasing the page. */
  detail: string;
}

export const FIELD_SOURCES = ['PROFILE', 'ANSWER_BANK', 'GENERATED'] as const;
/** Where an auto-fill value came from. GENERATED values can be saved to the answer bank. */
export type FieldSource = (typeof FIELD_SOURCES)[number];

/** One form field value to write into the page. */
export interface FieldMapping {
  /** Matches ScrapedInput.clawId, e.g. "jobify-field-3". */
  clawId: string;
  /** Question/label text as shown on the page (used when saving to the answer bank). */
  fieldLabel: string;
  value: string;
  source: FieldSource;
}

/** Validated result of AI-2 analyzeJob. */
export interface JobAnalysis {
  /** False for login/sign-up pages, search results, home pages, articles; true for job posts (D-008). */
  isJobPosting: boolean;
  companyName: string;
  roleTitle: string;
  eligibility: Eligibility;
  eligibilityReason: string;
  redFlags: RedFlag[];
  /** Integer 0–100. */
  matchScore: number;
  /** Resume.id of the best version, or null when the user has no resumes. */
  recommendedResumeId: number | null;
  resumeReason: string;
  matchedSkills: string[];
  missingSkills: string[];
  /** Only mappings whose clawId was scraped and whose value is non-empty. */
  fieldMappings: FieldMapping[];
}

export interface BulletRewrite {
  original: string;
  suggested: string;
  /** Why this helps for this job, one sentence. */
  reason: string;
}

/** Validated result of AI-3 tailorApplication (on demand, "Improve my application"). */
export interface TailorResult {
  /** 3–5 things to emphasize, one sentence each. */
  emphasize: string[];
  /** Up to 5 rewrites of the recommended resume's highlights. */
  bulletRewrites: BulletRewrite[];
  /** ≤120 words; also copied when staging the resume. */
  coverNote: string;
  /** ≤4 sentences to a hiring manager or founder. */
  coldDm: string;
}

/** An analysis bound to the page it came from. */
export interface AnalysisSession {
  analysis: JobAnalysis;
  /** PAGE_SCRAPED.url. */
  sourceUrl: string;
  /** JobBoard.name active when analyzed, or "Shared link". */
  boardName: string;
  scrapedInputCount: number;
  /** Page text kept in memory only for the tailor call; never persisted or logged. */
  pageText: string;
}

// ---------------------------------------------------------------------------
// Tracker
// ---------------------------------------------------------------------------

export const APPLICATION_STATUSES = ['SAVED', 'APPLIED', 'INTERVIEWING', 'OFFER', 'REJECTED', 'WITHDRAWN'] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export const APPLICATION_STATUS_LABELS: Record<ApplicationStatus, string> = {
  SAVED: 'Saved',
  APPLIED: 'Applied',
  INTERVIEWING: 'Interviewing',
  OFFER: 'Offer',
  REJECTED: 'Rejected',
  WITHDRAWN: 'Withdrawn',
};

/** Statuses that count as "the employer replied" in Insights. */
export const RESPONSE_STATUSES: readonly ApplicationStatus[] = ['INTERVIEWING', 'OFFER', 'REJECTED'];

/** Days after logging an APPLIED application that its follow-up becomes due. */
export const DEFAULT_FOLLOW_UP_DAYS = 7;

/** Row of `applications`. */
export interface Application {
  id: number;
  companyName: string;
  roleTitle: string;
  boardName: string;
  jobUrl: string;
  /** null if the resume was deleted later or none was used. */
  resumeId: number | null;
  /** Snapshot of Resume.label at log time ('' if none). */
  resumeLabel: string;
  matchScore: number | null;
  eligibility: Eligibility | null;
  redFlags: RedFlag[];
  coverNote: string | null;
  coldDm: string | null;
  notes: string;
  status: ApplicationStatus;
  /** UTC "YYYY-MM-DD HH:MM:SS" or null (no reminder). */
  followUpAt: string | null;
  createdAt: string;
  statusChangedAt: string;
}

export type NewApplication = Omit<
  Application,
  'id' | 'createdAt' | 'statusChangedAt' | 'notes' | 'followUpAt' | 'status'
> & {
  status?: ApplicationStatus;
};

/** Editable fields on the detail screen. */
export interface ApplicationPatch {
  status?: ApplicationStatus;
  notes?: string;
  /** null clears the reminder. */
  followUpAt?: string | null;
}

// ---------------------------------------------------------------------------
// Insights
// ---------------------------------------------------------------------------

export interface RateRow {
  /** Resume label or board name; "No resume" for null resume. */
  key: string;
  applied: number;
  responses: number;
  interviews: number;
}

export interface InsightsSummary {
  total: number;
  byStatus: Record<ApplicationStatus, number>;
  /** Applications whose status is not SAVED. */
  applied: number;
  /** Rows with status in RESPONSE_STATUSES. */
  responses: number;
  /** Rows with status INTERVIEWING or OFFER. */
  interviews: number;
  byResume: RateRow[];
  byBoard: RateRow[];
  /** Applications (status ≠ SAVED) created in each of the last 8 ISO weeks, oldest first. */
  appliedPerWeek: { weekStart: string; count: number }[];
}
