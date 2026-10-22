import type { PageScrapedMessage } from '../../../bridge/messages';
import { DEFAULT_PREFERENCES, type CandidateProfile, type JobAnalysis, type Resume, type SavedAnswer } from '../../../types/domain';
import { buildAnalyzePrompt, buildResumeParsePrompt, buildTailorPrompt } from '../prompts';

const ANALYZE_RULES = [
  "1. Decide eligibility using the candidate's location, timeZone and preferences (workModes, workAuthorizedCountries, openToSponsorship). Use UNCLEAR when the page does not say.",
  '2. List red flags only when the page supports them. Use BLOCKED_COMPANY if the company is in blockedCompanies, SALARY_BELOW_MINIMUM only if a salary is stated and is below minSalary, STALE_POSTING if the post is older than 60 days.',
  '3. Score 0-100 how well the candidate matches the role and pick the best resume id (-1 if there are no resumes).',
  '4. For each detected form input, fill a value only from the profile (source PROFILE), a saved answer to the same question (source ANSWER_BANK), or a short truthful answer you write from the profile (source GENERATED). For select inputs the value must be one of its option values. Skip inputs you cannot fill truthfully.',
  '5. Never invent contact details, employers, dates, degrees, numbers, or legal status.',
];

const TAILOR_RULES = [
  "1. emphasize: 3 to 5 points from the candidate's real experience that matter most for this job.",
  "2. bulletRewrites: up to 5 rewrites of resume highlights using the job's wording; keep every fact.",
  '3. coverNote: at most 120 words, plain text, no placeholders.',
  '4. coldDm: at most 4 sentences to a hiring manager or founder, plain text, no placeholders.',
];

const profile: CandidateProfile = {
  fullName: 'Alex Rahman',
  email: 'alex.rahman@example.com',
  phone: '+880 1700 000000',
  location: 'Dhaka, Bangladesh',
  countryCode: 'BD',
  timeZone: 'Asia/Dhaka',
  headline: 'Backend engineer, 3 years',
  summary: 'Backend engineer who builds Node.js and Python services and owns CI/CD.',
  links: [{ label: 'Portfolio', url: 'https://alex.example.com' }],
  skills: ['Node.js', 'Python'],
  experience: [
    {
      title: 'Backend Engineer',
      company: 'Example Labs',
      start: 'Jan 2023',
      end: 'Present',
      bullets: ['Built CI pipelines for 6 services'],
    },
  ],
  education: [{ school: 'Example University', degree: 'B.Sc. in CSE', year: '2022' }],
  extraFacts: ['Notice period: 30 days'],
};

const resume: Resume = {
  id: 1,
  label: 'Backend',
  fileName: 'Alex_Rahman_Backend.pdf',
  fileUri: 'file:///resumes/1.pdf',
  content: {
    summary: profile.summary,
    skills: ['Node.js', 'Python'],
    highlights: ['Built CI pipelines for 6 services'],
  },
  createdAt: '2026-10-01 00:00:00',
};

const analysis: JobAnalysis = {
  companyName: 'Acme Cloud',
  roleTitle: 'Senior Backend Engineer',
  eligibility: 'ELIGIBLE',
  eligibilityReason: 'Remote and open to Bangladesh.',
  redFlags: [],
  matchScore: 92,
  recommendedResumeId: 1,
  resumeReason: 'Backend resume covers the stack.',
  matchedSkills: ['Node.js'],
  missingSkills: ['Kubernetes operators'],
  fieldMappings: [],
};

const scraped: PageScrapedMessage = {
  type: 'PAGE_SCRAPED',
  url: 'https://example.com/jobs/1',
  title: 'Senior Backend Engineer',
  pageText: 'Fully remote. Node.js and Python.',
  inputs: [],
};

const today = new Date(Date.UTC(2026, 9, 22));

describe('prompts', () => {
  it('includes the numbered rules verbatim and snapshots the Alex profile', () => {
    const answers: SavedAnswer[] = Array.from({ length: 41 }, (_, index) => ({
      id: index + 1,
      question: `Question ${index}`,
      answer: `Answer ${index}`,
      useCount: 41 - index,
      updatedAt: '2026-10-01 00:00:00',
    }));
    const analyze = buildAnalyzePrompt({
      profile,
      preferences: DEFAULT_PREFERENCES,
      resumes: [resume],
      answers,
      scraped,
      today,
    });
    for (const rule of ANALYZE_RULES) expect(analyze.system).toContain(rule);
    expect(analyze.system).toContain("Today's date: 2026-10-22");
    expect(analyze.system).toContain('Question 0');
    expect(analyze.system).toContain('Question 39');
    expect(analyze.system).not.toContain('Question 40');
    const user: unknown = JSON.parse(analyze.user);
    expect(user && typeof user === 'object' && !Array.isArray(user) ? Object.keys(user) : []).toEqual([
      'url',
      'title',
      'pageText',
      'inputs',
    ]);

    const tailor = buildTailorPrompt({ profile, resume, analysis, pageText: scraped.pageText });
    for (const rule of TAILOR_RULES) expect(tailor.system).toContain(rule);
    expect(tailor.user).toBe(scraped.pageText);
    const noResume = buildTailorPrompt({ profile, resume: null, analysis, pageText: 'page' });
    expect(noResume.system).toContain('No resume selected.');

    const parsed = buildResumeParsePrompt({ pastedText: null });
    expect(parsed.system).toContain('highlights: the 5 to 10 strongest achievement bullets, verbatim.');
    expect(parsed.user).toBe('Resume attached as PDF.');

    expect({ analyze, tailor, parsed }).toMatchSnapshot();
  });

  it('trims pasted resume text and caps it at 30000 characters', () => {
    const pasted = `  ${'a'.repeat(30000)}b  `;
    const prompt = buildResumeParsePrompt({ pastedText: pasted });
    expect(prompt.user).toBe('a'.repeat(30000));
    expect(buildResumeParsePrompt({ pastedText: '  hello  ' }).user).toBe('hello');
  });
});
