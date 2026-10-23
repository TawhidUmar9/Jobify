import type { PageScrapedMessage } from '../../bridge/messages';
import type { CandidateProfile, JobAnalysis, JobPreferences, Resume, SavedAnswer } from '../../types/domain';

/**
 * Prompt builders. Pure functions, snapshot-tested (T-013). CONTRACT for the instruction text:
 * the numbered rules below must appear verbatim. Personal data comes only from the arguments.
 */

export interface PromptPair {
  system: string;
  user: string;
}

/** Max answers from the bank included in AI-2 (most used first). */
export const MAX_BANK_ANSWERS_IN_PROMPT = 40;

const ANALYZE_INTRO =
  'You are Jobify, a careful job-application assistant. You help one candidate decide whether to apply and fill application forms truthfully.';

const ANALYZE_RULES = [
  "1. Decide eligibility using the candidate's location, timeZone and preferences (workModes, workAuthorizedCountries, openToSponsorship). Use UNCLEAR when the page does not say.",
  '2. List red flags only when the page supports them. Use BLOCKED_COMPANY if the company is in blockedCompanies, SALARY_BELOW_MINIMUM only if a salary is stated and is below minSalary, STALE_POSTING if the post is older than 60 days.',
  '3. Score 0-100 how well the candidate matches the role and pick the best resume id (-1 if there are none).',
  '4. For each detected form input, fill a value only from the profile (source PROFILE), a saved answer to the same question (source ANSWER_BANK), or a short truthful answer you write from the profile (source GENERATED). For select inputs the value must be one of its option values. Skip inputs you cannot fill truthfully.',
  '5. Never invent contact details, employers, dates, degrees, numbers, or legal status.',
  '6. Set isJobPosting to false when the page is not one specific job posting (a login or sign-up page, a list or search results with several jobs, a company home page, an article). When false, use eligibility UNCLEAR, matchScore 0, empty redFlags, skills and fieldMappings.',
].join('\n');

const TAILOR_INTRO =
  'You are Jobify. Help the candidate tailor their application to one job. Use only facts from the profile and resume; rewrite wording, never add achievements.';

const TAILOR_RULES = [
  "1. emphasize: 3 to 5 points from the candidate's real experience that matter most for this job.",
  "2. bulletRewrites: up to 5 rewrites of resume highlights using the job's wording; keep every fact.",
  '3. coverNote: at most 120 words, plain text, no placeholders.',
  '4. coldDm: at most 4 sentences to a hiring manager or founder, plain text, no placeholders.',
].join('\n');

const RESUME_PARSE_SYSTEM =
  'Extract the resume into the given JSON schema. Copy facts exactly; do not summarize away numbers. Use empty strings or empty arrays for anything missing. highlights: the 5 to 10 strongest achievement bullets, verbatim.';

const PASTED_TEXT_CAP = 30000;

function formatToday(today: Date): string {
  return today.toISOString().slice(0, 10);
}

function jsonBlock(label: string, value: unknown): string {
  return `${label}\n${JSON.stringify(value, null, 2)}`;
}

/**
 * AI-2. system =
 *   "You are Jobify, a careful job-application assistant. You help one candidate decide whether to
 *   apply and fill application forms truthfully."
 *   + "Candidate profile:" JSON(profile, 2-space)
 *   + "Job preferences:" JSON(preferences)
 *   + "Resumes:" JSON(resumes.map(r => ({ id, label, summary, skills, highlights })))
 *   + "Saved answers:" JSON(answers.slice(0, MAX_BANK_ANSWERS_IN_PROMPT).map(a => ({ question, answer })))
 *   + "Today's date: <YYYY-MM-DD>" (from `today`)
 *   + Rules, verbatim:
 *   1. Decide eligibility using the candidate's location, timeZone and preferences
 *      (workModes, workAuthorizedCountries, openToSponsorship). Use UNCLEAR when the page does not say.
 *   2. List red flags only when the page supports them. Use BLOCKED_COMPANY if the company is in
 *      blockedCompanies, SALARY_BELOW_MINIMUM only if a salary is stated and is below minSalary,
 *      STALE_POSTING if the post is older than 60 days.
 *   3. Score 0-100 how well the candidate matches the role and pick the best resume id
 *      (-1 if there are none).
 *   4. For each detected form input, fill a value only from the profile (source PROFILE), a saved
 *      answer to the same question (source ANSWER_BANK), or a short truthful answer you write from
 *      the profile (source GENERATED). For select inputs the value must be one of its option values.
 *      Skip inputs you cannot fill truthfully.
 *   5. Never invent contact details, employers, dates, degrees, numbers, or legal status.
 *   6. Set isJobPosting to false when the page is not one specific job posting (a login or sign-up page,
 *      a list or search results with several jobs, a company home page, an article). When false, use
 *      eligibility UNCLEAR, matchScore 0, empty redFlags, skills and fieldMappings.
 * user = JSON.stringify({ url, title, pageText, inputs }) from the scrape (no other keys).
 */
export function buildAnalyzePrompt(args: {
  profile: CandidateProfile;
  preferences: JobPreferences;
  resumes: readonly Resume[];
  answers: readonly SavedAnswer[];
  scraped: PageScrapedMessage;
  today: Date;
}): PromptPair {
  const resumes = args.resumes.map((resume) => ({
    id: resume.id,
    label: resume.label,
    summary: resume.content.summary,
    skills: resume.content.skills,
    highlights: resume.content.highlights,
  }));
  const answers = args.answers.slice(0, MAX_BANK_ANSWERS_IN_PROMPT).map((answer) => ({
    question: answer.question,
    answer: answer.answer,
  }));
  const system = [
    ANALYZE_INTRO,
    jsonBlock('Candidate profile:', args.profile),
    jsonBlock('Job preferences:', args.preferences),
    jsonBlock('Resumes:', resumes),
    jsonBlock('Saved answers:', answers),
    `Today's date: ${formatToday(args.today)}`,
    ANALYZE_RULES,
  ].join('\n\n');
  const user = JSON.stringify({
    url: args.scraped.url,
    title: args.scraped.title,
    pageText: args.scraped.pageText,
    inputs: args.scraped.inputs,
  });
  return { system, user };
}

/**
 * AI-3. system = "You are Jobify. Help the candidate tailor their application to one job. Use only
 * facts from the profile and resume; rewrite wording, never add achievements."
 * + "Candidate profile:" JSON(profile) + "Resume:" JSON({ label, summary, skills, highlights }) of the
 *   resume (or "No resume selected.") + "Analysis:" JSON({ companyName, roleTitle, matchedSkills, missingSkills })
 * + Rules, verbatim:
 *   1. emphasize: 3 to 5 points from the candidate's real experience that matter most for this job.
 *   2. bulletRewrites: up to 5 rewrites of resume highlights using the job's wording; keep every fact.
 *   3. coverNote: at most 120 words, plain text, no placeholders.
 *   4. coldDm: at most 4 sentences to a hiring manager or founder, plain text, no placeholders.
 * user = pageText (from the AnalysisSession).
 */
export function buildTailorPrompt(args: {
  profile: CandidateProfile;
  resume: Resume | null;
  analysis: JobAnalysis;
  pageText: string;
}): PromptPair {
  const resume = args.resume
    ? {
        label: args.resume.label,
        summary: args.resume.content.summary,
        skills: args.resume.content.skills,
        highlights: args.resume.content.highlights,
      }
    : null;
  const analysis = {
    companyName: args.analysis.companyName,
    roleTitle: args.analysis.roleTitle,
    matchedSkills: args.analysis.matchedSkills,
    missingSkills: args.analysis.missingSkills,
  };
  const system = [
    TAILOR_INTRO,
    jsonBlock('Candidate profile:', args.profile),
    resume ? jsonBlock('Resume:', resume) : 'Resume:\nNo resume selected.',
    jsonBlock('Analysis:', analysis),
    TAILOR_RULES,
  ].join('\n\n');
  return { system, user: args.pageText };
}

/**
 * AI-1. system = "Extract the resume into the given JSON schema. Copy facts exactly; do not
 * summarize away numbers. Use empty strings or empty arrays for anything missing.
 * highlights: the 5 to 10 strongest achievement bullets, verbatim."
 * user = "Resume attached as PDF." when a PDF is sent, else the pasted resume text (trimmed, max 30000 chars).
 */
export function buildResumeParsePrompt(args: { pastedText: string | null }): PromptPair {
  const user = args.pastedText === null ? 'Resume attached as PDF.' : args.pastedText.trim().slice(0, PASTED_TEXT_CAP);
  return { system: RESUME_PARSE_SYSTEM, user };
}

/** AI-4. Fixed. Complete, not a stub. */
export const PING_PROMPT: PromptPair = {
  system: 'Reply with the JSON object {"ok": true}.',
  user: 'ping',
};
