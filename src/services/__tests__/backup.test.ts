import { getDocumentAsync } from 'expo-document-picker';
import { File } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import type { SQLiteDatabase } from 'expo-sqlite';
import { Platform } from 'react-native';

import { getProfile, getPreferences } from '../../db/repositories/profileRepo';
import { listResumes } from '../../db/repositories/resumesRepo';
import { listBoards } from '../../db/repositories/boardsRepo';
import { listAnswers } from '../../db/repositories/answersRepo';
import { listApplications } from '../../db/repositories/applicationsRepo';
import { KV_KEYS, kvGet } from '../kvStore';
import { setApiKey } from '../secrets';
import {
  BACKUP_FORMAT,
  BACKUP_VERSION,
  exportBackup,
  importBackup,
  shareBackup,
} from '../backup';
import type {
  ApplicationRow,
  AnswerRow,
  JobBoardRow,
  ResumeRow,
} from '../../db/schema';

const mockFiles = new Map<string, string>();

jest.mock('expo-file-system', () => {
  class File {
    uri: string;
    constructor(...parts: (string | { uri: string })[]) {
      this.uri = parts.map((part) => (typeof part === 'string' ? part : part.uri)).join('/');
    }
    get exists() {
      return mockFiles.has(this.uri);
    }
    create() {
      if (!mockFiles.has(this.uri)) mockFiles.set(this.uri, '');
    }
    async write(content: string) {
      mockFiles.set(this.uri, content);
    }
    async text() {
      const val = mockFiles.get(this.uri);
      if (val === undefined) throw new Error('File not found');
      return val;
    }
    delete() {
      mockFiles.delete(this.uri);
    }
  }
  return {
    __esModule: true,
    File,
    Paths: { cache: { uri: 'file://cache' } },
    __mockFiles: mockFiles,
  };
});

jest.mock('expo-file-system/legacy', () => ({
  __esModule: true,
  StorageAccessFramework: {
    getUriForDirectoryInRoot: jest.fn((dir: string) => `content://root/${dir}`),
    requestDirectoryPermissionsAsync: jest.fn(),
    readDirectoryAsync: jest.fn(),
    deleteAsync: jest.fn(),
    createFileAsync: jest.fn(),
    writeAsStringAsync: jest.fn(),
  },
}));

const { StorageAccessFramework: mockSaf } = jest.requireMock('expo-file-system/legacy') as {
  StorageAccessFramework: {
    getUriForDirectoryInRoot: jest.Mock;
    requestDirectoryPermissionsAsync: jest.Mock;
    readDirectoryAsync: jest.Mock;
    deleteAsync: jest.Mock;
    createFileAsync: jest.Mock;
    writeAsStringAsync: jest.Mock;
  };
};

jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn().mockResolvedValue(true),
  shareAsync: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('expo-document-picker', () => ({
  getDocumentAsync: jest.fn(),
}));

jest.mock('expo-constants', () => ({
  expoConfig: { version: '1.0.0' },
}));

interface InMemoryDbState {
  profile: { id: number; data_json: string; updated_at: string } | null;
  preferences: { id: number; data_json: string; updated_at: string } | null;
  resumes: ResumeRow[];
  boards: JobBoardRow[];
  answers: AnswerRow[];
  applications: ApplicationRow[];
  nextId: number;
}

function createInMemoryDb(initialState?: Partial<InMemoryDbState>) {
  let state: InMemoryDbState = {
    profile: null,
    preferences: null,
    resumes: [],
    boards: [],
    answers: [],
    applications: [],
    nextId: 10,
    ...initialState,
  };

  let failNextInsert = false;

  const db = {
    _getState: () => state,
    _setFailNextInsert: (fail: boolean) => {
      failNextInsert = fail;
    },
    getFirstAsync: async <T>(sql: string, params: unknown[] = []): Promise<T | null> => {
      if (sql.includes('FROM profile WHERE id = 1')) {
        return (state.profile ? { data_json: state.profile.data_json } : null) as T | null;
      }
      if (sql.includes('FROM preferences WHERE id = 1')) {
        return (state.preferences ? { data_json: state.preferences.data_json } : null) as T | null;
      }
      if (sql.includes('FROM resumes WHERE id = ?')) {
        const id = params[0] as number;
        const row = state.resumes.find((r) => r.id === id);
        return (row ?? null) as T | null;
      }
      if (sql.includes('FROM resumes WHERE label = ? COLLATE NOCASE')) {
        const label = (params[0] as string).toLowerCase();
        const row = state.resumes.find((r) => r.label.toLowerCase() === label);
        return (row ? { id: row.id } : null) as T | null;
      }
      if (sql.includes('FROM job_boards WHERE id = ?')) {
        const id = params[0] as number;
        const row = state.boards.find((b) => b.id === id);
        return (row ?? null) as T | null;
      }
      if (sql.includes('FROM answers WHERE id = ?')) {
        const id = params[0] as number;
        const row = state.answers.find((a) => a.id === id);
        return (row ?? null) as T | null;
      }
      if (sql.includes('FROM applications WHERE id = ?')) {
        const id = params[0] as number;
        const row = state.applications.find((a) => a.id === id);
        return (row ?? null) as T | null;
      }
      return null;
    },
    getAllAsync: async <T>(sql: string): Promise<T[]> => {
      if (sql.includes('FROM resumes')) {
        return [...state.resumes] as T[];
      }
      if (sql.includes('FROM job_boards')) {
        return [...state.boards] as T[];
      }
      if (sql.includes('FROM answers')) {
        return [...state.answers] as T[];
      }
      if (sql.includes('FROM applications')) {
        return [...state.applications] as T[];
      }
      return [];
    },
    runAsync: async (sql: string, params: unknown[] = []): Promise<{ lastInsertRowId: number; changes: number }> => {
      if (failNextInsert && sql.startsWith('INSERT INTO applications')) {
        throw new Error('Forced DB insert error');
      }

      if (sql.includes('DELETE FROM profile')) {
        state.profile = null;
        return { lastInsertRowId: 0, changes: 1 };
      }
      if (sql.includes('DELETE FROM preferences')) {
        state.preferences = null;
        return { lastInsertRowId: 0, changes: 1 };
      }
      if (sql.includes('DELETE FROM resumes')) {
        const count = state.resumes.length;
        state.resumes = [];
        return { lastInsertRowId: 0, changes: count };
      }
      if (sql.includes('DELETE FROM job_boards')) {
        const count = state.boards.length;
        state.boards = [];
        return { lastInsertRowId: 0, changes: count };
      }
      if (sql.includes('DELETE FROM answers')) {
        const count = state.answers.length;
        state.answers = [];
        return { lastInsertRowId: 0, changes: count };
      }
      if (sql.includes('DELETE FROM applications')) {
        const count = state.applications.length;
        state.applications = [];
        return { lastInsertRowId: 0, changes: count };
      }

      if (sql.includes('INSERT INTO profile')) {
        state.profile = { id: 1, data_json: params[0] as string, updated_at: '2026-10-23 00:00:00' };
        return { lastInsertRowId: 1, changes: 1 };
      }
      if (sql.includes('INSERT INTO preferences')) {
        state.preferences = { id: 1, data_json: params[0] as string, updated_at: '2026-10-23 00:00:00' };
        return { lastInsertRowId: 1, changes: 1 };
      }
      if (sql.includes('INSERT INTO resumes')) {
        const id = state.nextId++;
        const row: ResumeRow = {
          id,
          label: params[0] as string,
          file_name: params[1] as string | null,
          file_uri: null,
          content_json: params[2] as string,
          created_at: '2026-10-23 00:00:00',
        };
        state.resumes.push(row);
        return { lastInsertRowId: id, changes: 1 };
      }
      if (sql.includes('INSERT INTO job_boards')) {
        const id = state.nextId++;
        const row: JobBoardRow = {
          id,
          name: params[0] as string,
          url: params[1] as string,
          last_visited_url: params[2] as string | null,
          sort_order: params[3] as number,
        };
        state.boards.push(row);
        return { lastInsertRowId: id, changes: 1 };
      }
      if (sql.includes('INSERT INTO answers')) {
        const id = state.nextId++;
        const row: AnswerRow = {
          id,
          question: params[0] as string,
          answer: params[1] as string,
          use_count: params[2] as number,
          updated_at: params[3] as string,
        };
        state.answers.push(row);
        return { lastInsertRowId: id, changes: 1 };
      }
      if (sql.includes('INSERT INTO applications')) {
        const id = state.nextId++;
        const row: ApplicationRow = {
          id,
          company_name: params[0] as string,
          role_title: params[1] as string,
          board_name: params[2] as string,
          job_url: params[3] as string,
          resume_id: params[4] as number | null,
          resume_label: params[5] as string,
          match_score: params[6] as number | null,
          eligibility: params[7] as string | null,
          red_flags_json: params[8] as string,
          cover_note: params[9] as string | null,
          cold_dm: params[10] as string | null,
          notes: params[11] as string,
          status: params[12] as string,
          follow_up_at: params[13] as string | null,
          created_at: params[14] as string,
          status_changed_at: params[15] as string,
        };
        state.applications.push(row);
        return { lastInsertRowId: id, changes: 1 };
      }

      return { lastInsertRowId: 0, changes: 0 };
    },
    withTransactionAsync: async (fn: () => Promise<void>) => {
      const snapshot: InMemoryDbState = {
        profile: state.profile ? { ...state.profile } : null,
        preferences: state.preferences ? { ...state.preferences } : null,
        resumes: state.resumes.map((r) => ({ ...r })),
        boards: state.boards.map((b) => ({ ...b })),
        answers: state.answers.map((a) => ({ ...a })),
        applications: state.applications.map((a) => ({ ...a })),
        nextId: state.nextId,
      };
      try {
        await fn();
      } catch (err) {
        state = snapshot;
        throw err;
      }
    },
  };

  return db as unknown as SQLiteDatabase & {
    _getState: () => InMemoryDbState;
    _setFailNextInsert: (fail: boolean) => void;
  };
}

describe('backup service', () => {
  beforeEach(() => {
    mockFiles.clear();
    jest.clearAllMocks();
  });

  it('performs export → import round-trip, never includes API key, and relinks resume by label', async () => {
    const fakeKey = 'sk-gemini-secret-test-key-98765';
    await setApiKey(fakeKey);

    const initialDb = createInMemoryDb({
      profile: {
        id: 1,
        data_json: JSON.stringify({
          fullName: 'Alex Rahman',
          email: 'alex@example.com',
          phone: '+1 555-0100',
          location: 'San Francisco, CA',
          country: 'US',
          timeZone: 'America/Los_Angeles',
          headline: 'Full-stack Engineer',
          summary: 'Experienced React dev',
          skills: ['React', 'TypeScript'],
          links: [],
          extraFacts: [],
        }),
        updated_at: '2026-10-23 00:00:00',
      },
      preferences: {
        id: 1,
        data_json: JSON.stringify({
          targetRoles: ['Frontend Engineer'],
          workModes: ['REMOTE'],
          authorizedCountries: ['US'],
          requiresSponsorship: false,
          minHoursOverlap: 4,
          minSalary: 120000,
          currency: 'USD',
          blockedCompanies: [],
        }),
        updated_at: '2026-10-23 00:00:00',
      },
      resumes: [
        {
          id: 1,
          label: 'Frontend Resume',
          file_name: 'alex.pdf',
          file_uri: 'file://resumes/1.pdf',
          content_json: JSON.stringify({
            summary: 'Frontend specialist',
            skills: ['React', 'TypeScript'],
            highlights: ['Built Jobify'],
          }),
          created_at: '2026-10-23 00:00:00',
        },
      ],
      boards: [
        {
          id: 1,
          name: 'Wellfound',
          url: 'https://wellfound.com',
          last_visited_url: 'https://wellfound.com/jobs',
          sort_order: 0,
        },
      ],
      answers: [
        {
          id: 1,
          question: 'Why us?',
          answer: 'I love local-first apps.',
          use_count: 5,
          updated_at: '2026-10-23 00:00:00',
        },
      ],
      applications: [
        {
          id: 1,
          company_name: 'Tech Corp',
          role_title: 'Senior Frontend',
          board_name: 'Wellfound',
          job_url: 'https://wellfound.com/jobs/123',
          resume_id: 1,
          resume_label: 'Frontend Resume',
          match_score: 95,
          eligibility: 'ELIGIBLE',
          red_flags_json: '[]',
          cover_note: 'Excited about the role.',
          cold_dm: null,
          notes: 'Phone screen next week',
          status: 'INTERVIEWING',
          follow_up_at: '2026-10-30 00:00:00',
          created_at: '2026-10-23 00:00:00',
          status_changed_at: '2026-10-23 00:00:00',
        },
      ],
      nextId: 2,
    });

    const exportOutcome = await exportBackup(initialDb);
    expect(exportOutcome.ok).toBe(true);
    if (!exportOutcome.ok) return;

    expect(Sharing.shareAsync).toHaveBeenCalledWith(exportOutcome.value.uri, {
      mimeType: 'application/json',
    });

    const file = new File(exportOutcome.value.uri);
    const jsonString = await file.text();

    expect(jsonString).not.toContain(fakeKey);
    expect(jsonString).not.toMatch(/api_?key/i);

    const parsedBackup = JSON.parse(jsonString);
    expect(parsedBackup.format).toBe(BACKUP_FORMAT);
    expect(parsedBackup.version).toBe(BACKUP_VERSION);

    const freshDb = createInMemoryDb();

    jest.mocked(getDocumentAsync).mockResolvedValueOnce({
      canceled: false,
      assets: [{ uri: exportOutcome.value.uri, name: 'backup.json', size: jsonString.length, mimeType: 'application/json', lastModified: 0 }],
    });

    const importOutcome = await importBackup(freshDb);
    expect(importOutcome.ok).toBe(true);
    if (!importOutcome.ok) return;

    expect(importOutcome.value).toEqual({
      resumes: 1,
      boards: 1,
      answers: 1,
      applications: 1,
    });

    const completed = await kvGet(KV_KEYS.onboardingCompleted);
    expect(completed).toBe('1');

    const restoredProfile = await getProfile(freshDb);
    expect(restoredProfile?.fullName).toBe('Alex Rahman');

    const restoredPreferences = await getPreferences(freshDb);
    expect(restoredPreferences.targetRoles).toEqual(['Frontend Engineer']);
    expect(restoredPreferences.minSalary).toBe(120000);

    const restoredResumes = await listResumes(freshDb);
    expect(restoredResumes).toHaveLength(1);
    expect(restoredResumes[0].label).toBe('Frontend Resume');
    expect(restoredResumes[0].fileName).toBe('alex.pdf');
    expect(restoredResumes[0].fileUri).toBeNull();
    expect(restoredResumes[0].content.summary).toBe('Frontend specialist');

    const restoredBoards = await listBoards(freshDb);
    expect(restoredBoards).toHaveLength(1);
    expect(restoredBoards[0].name).toBe('Wellfound');
    expect(restoredBoards[0].url).toBe('https://wellfound.com');

    const restoredAnswers = await listAnswers(freshDb);
    expect(restoredAnswers).toHaveLength(1);
    expect(restoredAnswers[0].question).toBe('Why us?');
    expect(restoredAnswers[0].useCount).toBe(5);

    const restoredApps = await listApplications(freshDb);
    expect(restoredApps).toHaveLength(1);
    expect(restoredApps[0].companyName).toBe('Tech Corp');
    expect(restoredApps[0].resumeLabel).toBe('Frontend Resume');
    expect(restoredApps[0].resumeId).toBe(restoredResumes[0].id);
  });

  it('handles wrong format, newer version, unreadable, and cancelled errors', async () => {
    const db = createInMemoryDb();

    jest.mocked(getDocumentAsync).mockResolvedValueOnce({ canceled: true, assets: null });
    const cancelRes = await importBackup(db);
    expect(cancelRes).toEqual({ ok: false, error: 'CANCELLED' });

    jest.mocked(getDocumentAsync).mockResolvedValueOnce({
      canceled: false,
      assets: [{ uri: 'file://cache/unreadable.json', name: 'unreadable.json', size: 10, mimeType: 'application/json', lastModified: 0 }],
    });
    const unreadableRes = await importBackup(db);
    expect(unreadableRes).toEqual({ ok: false, error: 'UNREADABLE' });

    mockFiles.set('file://cache/bad-json.json', '{ bad json');
    jest.mocked(getDocumentAsync).mockResolvedValueOnce({
      canceled: false,
      assets: [{ uri: 'file://cache/bad-json.json', name: 'bad.json', size: 10, mimeType: 'application/json', lastModified: 0 }],
    });
    const badJsonRes = await importBackup(db);
    expect(badJsonRes).toEqual({ ok: false, error: 'UNREADABLE' });

    mockFiles.set('file://cache/wrong-format.json', JSON.stringify({ format: 'random-app', version: 1 }));
    jest.mocked(getDocumentAsync).mockResolvedValueOnce({
      canceled: false,
      assets: [{ uri: 'file://cache/wrong-format.json', name: 'wrong.json', size: 10, mimeType: 'application/json', lastModified: 0 }],
    });
    const wrongFormatRes = await importBackup(db);
    expect(wrongFormatRes).toEqual({ ok: false, error: 'WRONG_FORMAT' });

    mockFiles.set('file://cache/newer-version.json', JSON.stringify({ format: BACKUP_FORMAT, version: 2 }));
    jest.mocked(getDocumentAsync).mockResolvedValueOnce({
      canceled: false,
      assets: [{ uri: 'file://cache/newer-version.json', name: 'newer.json', size: 10, mimeType: 'application/json', lastModified: 0 }],
    });
    const newerVersionRes = await importBackup(db);
    expect(newerVersionRes).toEqual({ ok: false, error: 'NEWER_VERSION' });
  });

  it('exports to Android SAF folder, re-prompts on failure, and handles permission denied (D-006)', async () => {
    Object.defineProperty(Platform, 'OS', { value: 'android', configurable: true });
    try {
      const fakeKey = 'sk-gemini-secret-test-key-saf';
      await setApiKey(fakeKey);

      const db = createInMemoryDb({
        answers: [{ id: 1, question: 'Q?', answer: 'A!', use_count: 1, updated_at: '2026-10-23 00:00:00' }],
      });

      // 1. Cancelled picker -> PERMISSION_DENIED
      mockSaf.requestDirectoryPermissionsAsync.mockResolvedValueOnce({ granted: false, directoryUri: null });
      const deniedRes = await exportBackup(db);
      expect(deniedRes).toEqual({ ok: false, error: 'PERMISSION_DENIED' });

      // 2. Granted picker -> saves to SAF folder and writes json
      let writtenContent = '';
      mockSaf.requestDirectoryPermissionsAsync.mockResolvedValueOnce({
        granted: true,
        directoryUri: 'content://tree/primary:Download/Jobify',
      });
      mockSaf.readDirectoryAsync.mockResolvedValueOnce([
        'content://tree/primary:Download/Jobify/jobify-backup-2026-10-23.json',
      ]);
      mockSaf.deleteAsync.mockResolvedValueOnce(undefined);
      mockSaf.createFileAsync.mockResolvedValueOnce(
        'content://tree/primary:Download/Jobify/jobify-backup-new.json',
      );
      mockSaf.writeAsStringAsync.mockImplementationOnce(async (_uri: string, content: string) => {
        writtenContent = content;
      });

      const exportRes = await exportBackup(db);
      expect(exportRes.ok).toBe(true);
      if (exportRes.ok) {
        expect(exportRes.value.uri).toBe('content://tree/primary:Download/Jobify/jobify-backup-new.json');
      }
      expect(mockSaf.deleteAsync).toHaveBeenCalled();
      expect(writtenContent).not.toContain(fakeKey);
      expect(writtenContent).not.toMatch(/api_?key/i);

      // 3. Stored folder write fails -> clears stored uri, re-prompts, succeeds
      mockSaf.readDirectoryAsync.mockRejectedValueOnce(new Error('Permission revoked'));
      mockSaf.requestDirectoryPermissionsAsync.mockResolvedValueOnce({
        granted: true,
        directoryUri: 'content://tree/primary:Download/Jobify2',
      });
      mockSaf.readDirectoryAsync.mockResolvedValueOnce([]);
      mockSaf.createFileAsync.mockResolvedValueOnce('content://tree/primary:Download/Jobify2/new.json');
      mockSaf.writeAsStringAsync.mockResolvedValueOnce(undefined);

      const retryRes = await exportBackup(db);
      expect(retryRes.ok).toBe(true);
    } finally {
      Object.defineProperty(Platform, 'OS', { value: 'ios', configurable: true });
    }
  });

  it('shareBackup exports cache file and invokes share sheet directly (D-006)', async () => {
    const db = createInMemoryDb({
      answers: [{ id: 1, question: 'Q?', answer: 'A!', use_count: 1, updated_at: '2026-10-23 00:00:00' }],
    });
    const res = await shareBackup(db);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(Sharing.shareAsync).toHaveBeenCalledWith(res.value.uri, {
        mimeType: 'application/json',
      });
    }
  });

  it('executes in one transaction and rolls back changes on database failure', async () => {
    const db = createInMemoryDb({
      answers: [
        {
          id: 1,
          question: 'Original question',
          answer: 'Original answer',
          use_count: 1,
          updated_at: '2026-10-23 00:00:00',
        },
      ],
    });

    const validBackup = {
      format: BACKUP_FORMAT,
      version: BACKUP_VERSION,
      exportedAt: new Date().toISOString(),
      appVersion: '1.0.0',
      profile: null,
      preferences: {
        targetRoles: ['Developer'],
        workModes: ['REMOTE'],
        authorizedCountries: ['US'],
        requiresSponsorship: false,
        minHoursOverlap: 4,
        minSalary: 100000,
        currency: 'USD',
        blockedCompanies: [],
      },
      resumes: [],
      boards: [],
      answers: [
        {
          question: 'New question',
          answer: 'New answer',
          useCount: 0,
          updatedAt: '2026-10-23 00:00:00',
        },
      ],
      applications: [
        {
          companyName: 'FailCo',
          roleTitle: 'Dev',
          boardName: 'Board',
          jobUrl: 'https://example.com/fail',
          resumeLabel: '',
          matchScore: null,
          eligibility: null,
          redFlags: [],
          coverNote: null,
          coldDm: null,
          notes: '',
          status: 'APPLIED',
          followUpAt: null,
          createdAt: '2026-10-23 00:00:00',
          statusChangedAt: '2026-10-23 00:00:00',
        },
      ],
    };

    mockFiles.set('file://cache/tx-test.json', JSON.stringify(validBackup));
    jest.mocked(getDocumentAsync).mockResolvedValueOnce({
      canceled: false,
      assets: [{ uri: 'file://cache/tx-test.json', name: 'tx-test.json', size: 100, mimeType: 'application/json', lastModified: 0 }],
    });

    db._setFailNextInsert(true);

    const result = await importBackup(db);
    expect(result).toEqual({ ok: false, error: 'DB_ERROR' });

    const answers = await listAnswers(db);
    expect(answers).toHaveLength(1);
    expect(answers[0].question).toBe('Original question');
  });
});
