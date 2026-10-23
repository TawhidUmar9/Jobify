import type { ScrapedInput } from '../../../bridge/messages';
import { validateJobAnalysis, validateResumeParse, validateTailor } from '../validate';

/** Same documents as e2e/fixtures/ai (copied here; this package has no Node typings). */
const analysisRemoteOk: unknown = {
  companyName: 'Acme Cloud',
  roleTitle: 'Senior Backend Engineer',
  eligibility: 'ELIGIBLE',
  eligibilityReason: 'The post says the role is fully remote and open to candidates anywhere in Asia-Pacific, including Bangladesh.',
  redFlags: [
    { code: 'NO_SALARY_INFO', detail: 'The post does not list a salary range.' },
    { code: 'NOT_A_REAL_CODE', detail: 'Unknown codes must become OTHER.' },
    { code: 'OTHER', detail: '' },
  ],
  matchScore: 92,
  recommendedResumeId: 1,
  resumeReason: 'The role centres on Node.js, Python, PostgreSQL, Docker, k3s and GitHub Actions, which the Backend resume covers.',
  matchedSkills: ['Node.js', 'Python', 'PostgreSQL', 'Docker', 'k3s', 'GitHub Actions'],
  missingSkills: ['Kubernetes operators'],
  fieldMappings: [
    { clawId: 'jobify-field-0', fieldLabel: 'Full name', value: 'Alex Rahman', source: 'PROFILE' },
    { clawId: 'jobify-field-1', fieldLabel: 'Email', value: 'alex.rahman@example.com', source: 'PROFILE' },
    { clawId: 'jobify-field-2', fieldLabel: 'Portfolio URL', value: 'https://alex.example.com', source: 'PROFILE' },
    { clawId: 'jobify-field-3', fieldLabel: 'Why Acme Cloud?', value: 'I want to own backend and platform work end to end, as I did on my last two projects.', source: 'GENERATED' },
    { clawId: 'jobify-field-4', fieldLabel: 'Years of experience', value: '3-5', source: 'WRONG_SOURCE' },
    { clawId: 'jobify-field-99', fieldLabel: 'Does not exist', value: 'must be dropped', source: 'PROFILE' },
    { clawId: 'jobify-field-0', fieldLabel: 'Duplicate', value: 'must be dropped as a duplicate', source: 'PROFILE' },
  ],
};

const analysisNotEligible: unknown = {
  companyName: 'Lion City Payments',
  roleTitle: 'Full-Stack Developer',
  eligibility: 'NOT_ELIGIBLE',
  eligibilityReason: 'The post requires Singapore citizens or permanent residents.',
  redFlags: [{ code: 'LOCATION_OR_AUTHORIZATION', detail: 'Singapore citizens or PRs only.' }],
  matchScore: 140,
  recommendedResumeId: 999,
  resumeReason: 'The stack is React, Next.js and TypeScript.',
  matchedSkills: ['React', 'react', 'Next.js', '  ', 'TypeScript'],
  missingSkills: [],
  fieldMappings: [],
};

const analysisUnclear: unknown = {
  companyName: '',
  roleTitle: '',
  eligibility: 'MAYBE',
  eligibilityReason: 'The page does not say where applicants must live.',
  redFlags: [],
  matchScore: 55.6,
  recommendedResumeId: -1,
  resumeReason: '',
  matchedSkills: [],
  missingSkills: [],
  fieldMappings: [],
};

const tailor: unknown = {
  emphasize: [
    'Owning CI/CD in GitHub Actions end to end',
    'Running services on k3s with signed images',
    'Shipping a product used by 200+ people',
  ],
  bulletRewrites: [
    {
      original: 'Built CI pipelines for 6 services',
      suggested: 'Owned GitHub Actions CI/CD for 6 Node.js and Python services',
      reason: "Uses the job's wording for the same fact.",
    },
    { original: '', suggested: 'Dropped: empty original', reason: '' },
  ],
  coverNote:
    "Hi Acme Cloud team, I'm Alex, a backend engineer in Dhaka. I've owned CI/CD and k3s deployments for six services and would like to bring that to your platform team.",
  coldDm:
    'Hi, I just applied for the Senior Backend Engineer role at Acme Cloud. I run Node.js and Python services on k3s with GitHub Actions. Could we talk for 15 minutes this week?',
};

const resumeParse: unknown = {
  fullName: 'Alex Rahman',
  email: 'alex.rahman@example.com',
  phone: '+880 1700 000000',
  location: 'Dhaka, Bangladesh',
  headline: 'Backend engineer, 3 years',
  summary: 'Backend engineer who builds Node.js and Python services and owns CI/CD.',
  links: [
    { label: 'Portfolio', url: 'https://alex.example.com' },
    { label: 'GitHub', url: 'https://github.com/alex-example' },
    { label: 'Bad', url: 'javascript:alert(1)' },
  ],
  skills: ['Node.js', 'Python', 'PostgreSQL', 'Docker', 'k3s', 'GitHub Actions'],
  experience: [
    {
      title: 'Backend Engineer',
      company: 'Example Labs',
      start: 'Jan 2023',
      end: 'Present',
      bullets: ['Built CI pipelines for 6 services', 'Cut deploy time from 20 to 6 minutes'],
    },
  ],
  education: [{ school: 'Example University', degree: 'B.Sc. in CSE', year: '2022' }],
  highlights: [
    'Built CI pipelines for 6 services',
    'Cut deploy time from 20 to 6 minutes',
    'Shipped a survey product used by 200+ people',
  ],
};

function clone(value: unknown): unknown {
  return JSON.parse(JSON.stringify(value)) as unknown;
}

function input(index: number): ScrapedInput {
  return {
    clawId: `jobify-field-${index}`,
    tag: 'input',
    type: 'text',
    name: `name-${index}`,
    id: `id-${index}`,
    placeholder: '',
    ariaLabel: '',
    label: `Label ${index}`,
  };
}

const inputs = [0, 1, 2, 3, 4].map(input);

describe('validateJobAnalysis', () => {
  it('keeps five mappings, rewrites an invalid source, and drops an empty flag', () => {
    const result = validateJobAnalysis(analysisRemoteOk, inputs, [{ id: 1 }]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.fieldMappings.map((mapping) => mapping.clawId)).toEqual([
      'jobify-field-0',
      'jobify-field-1',
      'jobify-field-2',
      'jobify-field-3',
      'jobify-field-4',
    ]);
    expect(result.value.fieldMappings[4]?.source).toBe('GENERATED');
    expect(result.value.redFlags).toEqual([
      { code: 'NO_SALARY_INFO', detail: 'The post does not list a salary range.' },
      { code: 'OTHER', detail: 'Unknown codes must become OTHER.' },
    ]);
    expect(result.value.matchScore).toBe(92);
    expect(result.value.recommendedResumeId).toBe(1);
  });

  it('clamps the score, falls back to the first resume, and de-duplicates skills', () => {
    const result = validateJobAnalysis(analysisNotEligible, inputs, [{ id: 1 }, { id: 2 }]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.matchScore).toBe(100);
    expect(result.value.recommendedResumeId).toBe(1);
    expect(result.value.matchedSkills).toEqual(['React', 'Next.js', 'TypeScript']);
  });

  it('fills unknown company and role when there are no resumes', () => {
    const result = validateJobAnalysis(analysisUnclear, inputs, []);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.companyName).toBe('Unknown company');
    expect(result.value.roleTitle).toBe('Unknown role');
    expect(result.value.eligibility).toBe('UNCLEAR');
    expect(result.value.matchScore).toBe(56);
    expect(result.value.recommendedResumeId).toBeNull();
  });

  it('handles isJobPosting: preserves boolean false and defaults missing/non-boolean to true', () => {
    const resFalse = validateJobAnalysis({ ...(analysisRemoteOk as Record<string, unknown>), isJobPosting: false }, inputs, [{ id: 1 }]);
    expect(resFalse.ok).toBe(true);
    if (resFalse.ok) expect(resFalse.value.isJobPosting).toBe(false);

    const resTrue = validateJobAnalysis({ ...(analysisRemoteOk as Record<string, unknown>), isJobPosting: true }, inputs, [{ id: 1 }]);
    expect(resTrue.ok).toBe(true);
    if (resTrue.ok) expect(resTrue.value.isJobPosting).toBe(true);

    const resMissing = validateJobAnalysis({ ...(analysisRemoteOk as Record<string, unknown>) }, inputs, [{ id: 1 }]);
    expect(resMissing.ok).toBe(true);
    if (resMissing.ok) expect(resMissing.value.isJobPosting).toBe(true);

    const resNonBool = validateJobAnalysis({ ...(analysisRemoteOk as Record<string, unknown>), isJobPosting: 'no' }, inputs, [{ id: 1 }]);
    expect(resNonBool.ok).toBe(true);
    if (resNonBool.ok) expect(resNonBool.value.isJobPosting).toBe(true);
  });

    it('rejects a non-object, a missing score, and non-array field mappings', () => {
    expect(validateJobAnalysis(null, inputs, []).ok).toBe(false);
    const missingScore = clone(analysisUnclear);
    if (missingScore && typeof missingScore === 'object') {
      delete (missingScore as { matchScore?: unknown }).matchScore;
    }
    expect(validateJobAnalysis(missingScore, inputs, []).ok).toBe(false);
    const badMappings = clone(analysisUnclear);
    if (badMappings && typeof badMappings === 'object') {
      (badMappings as { fieldMappings?: unknown }).fieldMappings = {};
    }
    const mappings = validateJobAnalysis(badMappings, inputs, []);
    expect(mappings.ok).toBe(false);
    if (!mappings.ok) expect(mappings.error).toBe('SCHEMA_MISMATCH');
  });

  it('does not throw on junk values', () => {
    for (const value of [null, 1, 'x', [], {}]) {
      expect(() => validateJobAnalysis(value, inputs, [])).not.toThrow();
      expect(() => validateTailor(value)).not.toThrow();
      expect(() => validateResumeParse(value)).not.toThrow();
    }
  });
});

describe('validateTailor', () => {
  it('drops an empty original and keeps three emphasize items', () => {
    const result = validateTailor(tailor);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.emphasize).toHaveLength(3);
    expect(result.value.bulletRewrites).toHaveLength(1);
    expect(result.value.bulletRewrites[0]?.original).toBe('Built CI pipelines for 6 services');
  });
});

describe('validateResumeParse', () => {
  it('drops a javascript link and keeps experience and highlights', () => {
    const result = validateResumeParse(resumeParse);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.profile.links).toHaveLength(2);
    expect(result.value.profile.experience).toHaveLength(1);
    expect(result.value.content.highlights).toHaveLength(3);
    expect(result.value.content.summary).toBe(result.value.profile.summary);
    expect(result.value.content.skills).toBe(result.value.profile.skills);
    expect(result.value.content.highlights[0]).toBe('Built CI pipelines for 6 services');
    expect(result.value.profile).not.toHaveProperty('countryCode');
    expect(result.value.profile).not.toHaveProperty('timeZone');
    expect(result.value.profile).not.toHaveProperty('extraFacts');
  });
});
