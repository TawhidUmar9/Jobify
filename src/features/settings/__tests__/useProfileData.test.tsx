import { act, renderHook, waitFor } from '@testing-library/react-native';

import { createFakeDb } from '../../../../tests/helpers/fakeDb';
import { DEFAULT_PREFERENCES } from '../../../types/domain';
import { useProfileData } from '../useProfileData';

const mockDb = createFakeDb();

jest.mock('expo-sqlite', () => ({
  useSQLiteContext: () => mockDb.db,
}));

describe('useProfileData', () => {
  beforeEach(() => {
    mockDb.calls.length = 0;
  });

  it('prefills time zone and country from the device when nothing is saved', async () => {
    const { result } = await renderHook(() => useProfileData());
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.profile.fullName).toBe('');
    expect(result.current.profile.timeZone).toBe('Asia/Dhaka');
    expect(result.current.profile.countryCode).toBe('BD');
    expect(result.current.preferences).toEqual(DEFAULT_PREFERENCES);
  });

  it('keeps a saved profile instead of the device defaults', async () => {
    mockDb.queue('getFirstAsync', { data_json: JSON.stringify({ fullName: 'Sam', email: 'sam@example.com', timeZone: 'UTC' }) });
    const { result } = await renderHook(() => useProfileData());
    await waitFor(() => expect(result.current.profile.fullName).toBe('Sam'));
    expect(result.current.profile.timeZone).toBe('UTC');
    expect(result.current.profile.email).toBe('sam@example.com');
  });

  it('saveProfile writes the profile and returns false when the database throws', async () => {
    const { result } = await renderHook(() => useProfileData());
    await waitFor(() => expect(result.current.status).toBe('ready'));
    const next = { ...result.current.profile, fullName: 'Alex Rahman', email: 'alex.rahman@example.com' };
    let saved = false;
    await act(async () => {
      saved = await result.current.saveProfile(next);
    });
    expect(saved).toBe(true);
    expect(result.current.profile.fullName).toBe('Alex Rahman');
    expect(mockDb.calls.some((call) => call.sql.includes('INSERT INTO profile'))).toBe(true);

    mockDb.fail('runAsync');
    await act(async () => {
      saved = await result.current.saveProfile(next);
    });
    expect(saved).toBe(false);
  });
});
