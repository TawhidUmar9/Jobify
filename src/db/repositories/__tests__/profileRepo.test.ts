import { createFakeDb } from '../../../../tests/helpers/fakeDb';
import { DEFAULT_PREFERENCES, EMPTY_PROFILE, type CandidateProfile, type JobPreferences } from '../../../types/domain';
import { getPreferences, getProfile, savePreferences, saveProfile } from '../profileRepo';

const profile: CandidateProfile = { ...EMPTY_PROFILE, fullName: '  Alex Rahman  ', countryCode: 'bd', skills: [] };

const preferences: JobPreferences = { ...DEFAULT_PREFERENCES, minSalary: 0, workModes: [] };

describe('profileRepo', () => {
  it('upserts profile and preferences with INSERT … ON CONFLICT(id) DO UPDATE', async () => {
    const fake = createFakeDb();
    await saveProfile(fake.db, profile);
    await savePreferences(fake.db, preferences);

    const profileCall = fake.calls.find((call) => call.sql.includes('INTO profile'));
    const prefsCall = fake.calls.find((call) => call.sql.includes('INTO preferences'));
    expect(profileCall?.sql).toContain('ON CONFLICT(id) DO UPDATE');
    expect(prefsCall?.sql).toContain('ON CONFLICT(id) DO UPDATE');
    expect(profileCall?.params[0]).toBe(JSON.stringify({ ...EMPTY_PROFILE, fullName: 'Alex Rahman', countryCode: 'BD' }));
    expect(JSON.parse(String(prefsCall?.params[0])).minSalary).toBeNull();
    expect(JSON.parse(String(prefsCall?.params[0])).workModes).toEqual(['REMOTE']);
  });

  it('returns null when no profile row exists and normalizes unparseable JSON', async () => {
    const missing = createFakeDb();
    await expect(getProfile(missing.db)).resolves.toBeNull();

    const bad = createFakeDb();
    bad.queue('getFirstAsync', { data_json: '{not json' });
    const profileRow = await getProfile(bad.db);
    expect(profileRow?.fullName).toBe('');
    expect(profileRow?.skills).toEqual([]);
  });

  it('returns DEFAULT_PREFERENCES when no preferences row exists', async () => {
    const fake = createFakeDb();
    await expect(getPreferences(fake.db)).resolves.toBe(DEFAULT_PREFERENCES);
  });
});
