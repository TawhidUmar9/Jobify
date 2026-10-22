import { EMPTY_PROFILE } from '../../types/domain';
import { normalizePreferences, normalizeProfile } from '../normalize';

describe('normalizeProfile', () => {
  it('returns an empty copy for null, arrays, and other non-objects', () => {
    for (const value of [null, 1, 'x', [], undefined]) {
      const profile = normalizeProfile(value);
      expect(profile).toEqual(EMPTY_PROFILE);
      expect(profile).not.toBe(EMPTY_PROFILE);
      expect(profile.skills).not.toBe(EMPTY_PROFILE.skills);
    }
  });

  it('trims strings and replaces wrong types with empty strings', () => {
    const profile = normalizeProfile({
      fullName: '  Alex Rahman  ',
      email: 12,
      phone: null,
      location: ' Dhaka ',
      timeZone: ' Asia/Dhaka ',
      headline: false,
      summary: '  Backend  ',
    });
    expect(profile.fullName).toBe('Alex Rahman');
    expect(profile.email).toBe('');
    expect(profile.phone).toBe('');
    expect(profile.location).toBe('Dhaka');
    expect(profile.timeZone).toBe('Asia/Dhaka');
    expect(profile.headline).toBe('');
    expect(profile.summary).toBe('Backend');
  });

  it('upper-cases a 2-letter country code and drops anything else', () => {
    expect(normalizeProfile({ countryCode: 'bd' }).countryCode).toBe('BD');
    expect(normalizeProfile({ countryCode: 'B' }).countryCode).toBe('');
    expect(normalizeProfile({ countryCode: 'BGD' }).countryCode).toBe('');
    expect(normalizeProfile({ countryCode: 44 }).countryCode).toBe('');
  });

  it('keeps http(s) links, drops javascript:, and caps at 10', () => {
    const links = [
      { label: ' Site ', url: ' https://alex.example.com ' },
      { label: 'Bad', url: 'javascript:alert(1)' },
      { label: '', url: 'https://empty.example' },
      { label: 'Mail', url: 'mailto:a@b.c' },
      { url: 'https://missing-label.example' },
      'nope',
    ];
    for (let i = 0; i < 12; i += 1) links.push({ label: `L${i}`, url: `https://example.com/${i}` });
    const profile = normalizeProfile({ links });
    expect(profile.links[0]).toEqual({ label: 'Site', url: 'https://alex.example.com' });
    expect(profile.links.some((link) => link.url.startsWith('javascript:'))).toBe(false);
    expect(profile.links).toHaveLength(10);
  });

  it('de-duplicates skills and extra facts and enforces the caps', () => {
    const skills = [' React ', 'react', '', '  ', 3, ...Array.from({ length: 60 }, (_, i) => `S${i}`)];
    const extraFacts = [' Notice ', 'notice', ...Array.from({ length: 25 }, (_, i) => `F${i}`)];
    const profile = normalizeProfile({ skills, extraFacts });
    expect(profile.skills[0]).toBe('React');
    expect(profile.skills.filter((skill) => skill.toLowerCase() === 'react')).toHaveLength(1);
    expect(profile.skills).toHaveLength(50);
    expect(profile.extraFacts[0]).toBe('Notice');
    expect(profile.extraFacts).toHaveLength(20);
  });

  it('coerces experience and education fields and caps lists and bullets', () => {
    const experience = Array.from({ length: 20 }, (_, i) => ({
      title: i === 0 ? 1 : `Role ${i}`,
      company: ` Co ${i} `,
      start: null,
      end: 'Present',
      bullets: [' A ', 'a', '', ...Array.from({ length: 12 }, (__, n) => `B${n}`)],
    }));
    const education = Array.from({ length: 12 }, (_, i) => ({
      school: ` School ${i} `,
      degree: false,
      year: '2022',
    }));
    const profile = normalizeProfile({ experience, education, ignored: true });
    expect(profile.experience).toHaveLength(15);
    expect(profile.experience[0]?.title).toBe('');
    expect(profile.experience[0]?.company).toBe('Co 0');
    expect(profile.experience[0]?.start).toBe('');
    expect(profile.experience[0]?.bullets).toHaveLength(10);
    expect(profile.experience[0]?.bullets[0]).toBe('A');
    expect(profile.education).toHaveLength(10);
    expect(profile.education[0]).toEqual({ school: 'School 0', degree: '', year: '2022' });
  });
});

describe('normalizePreferences', () => {
  it('starts from defaults for non-objects', () => {
    expect(normalizePreferences(null).workModes).toEqual(['REMOTE']);
    expect(normalizePreferences('x').minSalary).toBeNull();
    expect(normalizePreferences([]).openToSponsorship).toBe(false);
  });

  it('caps roles and blocked companies and de-duplicates', () => {
    const prefs = normalizePreferences({
      targetRoles: [' Backend ', 'backend', '', ...Array.from({ length: 15 }, (_, i) => `R${i}`)],
      blockedCompanies: [' Acme ', 'acme', ...Array.from({ length: 60 }, (_, i) => `C${i}`)],
    });
    expect(prefs.targetRoles[0]).toBe('Backend');
    expect(prefs.targetRoles).toHaveLength(10);
    expect(prefs.blockedCompanies[0]).toBe('Acme');
    expect(prefs.blockedCompanies).toHaveLength(50);
  });

  it('keeps known work modes, de-duplicates, and falls back to REMOTE', () => {
    expect(normalizePreferences({ workModes: ['ONSITE', 'REMOTE', 'ONSITE', 'NOPE'] }).workModes).toEqual([
      'ONSITE',
      'REMOTE',
    ]);
    expect(normalizePreferences({ workModes: [] }).workModes).toEqual(['REMOTE']);
    expect(normalizePreferences({ workModes: ['MAYBE'] }).workModes).toEqual(['REMOTE']);
  });

  it('keeps upper-case 2-letter country codes only', () => {
    expect(
      normalizePreferences({ workAuthorizedCountries: ['bd', ' BD ', 'B', 'USA', 1, 'us'] }).workAuthorizedCountries,
    ).toEqual(['BD', 'US']);
  });

  it('reads openToSponsorship only when it is a boolean true', () => {
    expect(normalizePreferences({ openToSponsorship: true }).openToSponsorship).toBe(true);
    expect(normalizePreferences({ openToSponsorship: 'yes' }).openToSponsorship).toBe(false);
    expect(normalizePreferences({ openToSponsorship: 1 }).openToSponsorship).toBe(false);
  });

  it('clamps integer overlap hours to 0–8 and uses 2 otherwise', () => {
    expect(normalizePreferences({ minTimeZoneOverlapHours: 9 }).minTimeZoneOverlapHours).toBe(8);
    expect(normalizePreferences({ minTimeZoneOverlapHours: -3 }).minTimeZoneOverlapHours).toBe(0);
    expect(normalizePreferences({ minTimeZoneOverlapHours: 4 }).minTimeZoneOverlapHours).toBe(4);
    expect(normalizePreferences({ minTimeZoneOverlapHours: 1.5 }).minTimeZoneOverlapHours).toBe(2);
    expect(normalizePreferences({ minTimeZoneOverlapHours: '2' }).minTimeZoneOverlapHours).toBe(2);
  });

  it('rounds a positive salary and drops zero or less', () => {
    expect(normalizePreferences({ minSalary: 10.6 }).minSalary).toBe(11);
    expect(normalizePreferences({ minSalary: 0 }).minSalary).toBeNull();
    expect(normalizePreferences({ minSalary: -5 }).minSalary).toBeNull();
    expect(normalizePreferences({ minSalary: Number.NaN }).minSalary).toBeNull();
    expect(normalizePreferences({ minSalary: '1000' }).minSalary).toBeNull();
  });

  it('upper-cases a 3-letter currency and falls back to USD', () => {
    expect(normalizePreferences({ salaryCurrency: 'bdt' }).salaryCurrency).toBe('BDT');
    expect(normalizePreferences({ salaryCurrency: 'US' }).salaryCurrency).toBe('USD');
    expect(normalizePreferences({ salaryCurrency: 840 }).salaryCurrency).toBe('USD');
  });
});
