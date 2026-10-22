import * as Clipboard from 'expo-clipboard';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

import type { Resume } from '../../types/domain';
import { KV_KEYS } from '../kvStore';
import { stageResume } from '../resumeStaging';

const mockExistingFiles = new Set<string>();
const mockFileBase64 = new Map<string, string>();

jest.mock('expo-file-system', () => {
  class File {
    uri: string;
    constructor(...parts: (string | { uri: string })[]) {
      this.uri = parts.map((part) => (typeof part === 'string' ? part : part.uri)).join('/');
    }
    get exists() {
      return mockExistingFiles.has(this.uri);
    }
    async base64() {
      const val = mockFileBase64.get(this.uri);
      if (val === undefined) throw new Error('Cannot read file');
      return val;
    }
    async copy(destination: { uri: string }) {
      if (!mockExistingFiles.has(this.uri)) throw new Error('Source file missing');
      mockExistingFiles.add(destination.uri);
    }
  }
  return {
    __esModule: true,
    File,
    Paths: { cache: { uri: 'file://cache' } },
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
  isAvailableAsync: jest.fn(),
  shareAsync: jest.fn(),
}));

jest.mock('../kvStore', () => {
  const store = new Map<string, string>();
  return {
    KV_KEYS: {
      androidStagingDirUri: 'jobify.android.stagingDirUri',
    },
    kvGet: jest.fn(async (key: string) => store.get(key) ?? null),
    kvSet: jest.fn(async (key: string, val: string) => {
      store.set(key, val);
    }),
    kvRemove: jest.fn(async (key: string) => {
      store.delete(key);
    }),
    __store: store,
  };
});

const kvStoreMock = jest.requireMock('../kvStore') as {
  kvGet: jest.Mock;
  kvSet: jest.Mock;
  kvRemove: jest.Mock;
  __store: Map<string, string>;
};

const baseResume: Resume = {
  id: 1,
  label: 'Backend',
  fileName: 'Alex_Rahman_Backend.pdf',
  fileUri: 'file://docs/resumes/1.pdf',
  content: { summary: '', skills: [], highlights: [] },
  createdAt: '2026-10-12 08:00:00',
};

describe('resumeStaging', () => {
  beforeEach(() => {
    Object.defineProperty(Platform, 'OS', { value: 'android', configurable: true });
    mockExistingFiles.clear();
    mockFileBase64.clear();
    kvStoreMock.__store.clear();
    jest.clearAllMocks();
    mockSaf.getUriForDirectoryInRoot.mockImplementation((dir: string) => `content://root/${dir}`);
    jest.mocked(Clipboard.setStringAsync).mockResolvedValue(true);
    jest.mocked(Sharing.isAvailableAsync).mockResolvedValue(true);
    jest.mocked(Sharing.shareAsync).mockResolvedValue();
  });

  it('returns NO_FILE when resume.fileUri is null', async () => {
    const result = await stageResume({ ...baseResume, fileUri: null }, 'Cover note');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('NO_FILE');
      expect(result.error.clipboardCopied).toBe(true);
    }
  });

  it('returns FILE_MISSING when resume.fileUri does not exist on disk', async () => {
    const result = await stageResume(baseResume, '');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('FILE_MISSING');
      expect(result.error.clipboardCopied).toBe(false);
    }
  });

  it('treats clipboard failure as non-fatal and continues staging', async () => {
    mockExistingFiles.add(baseResume.fileUri!);
    mockFileBase64.set(baseResume.fileUri!, 'PDFBASE64');
    jest.mocked(Clipboard.setStringAsync).mockRejectedValueOnce(new Error('Clipboard error'));

    mockSaf.requestDirectoryPermissionsAsync.mockResolvedValueOnce({
      granted: true,
      directoryUri: 'content://tree/Download',
    });
    mockSaf.readDirectoryAsync.mockResolvedValueOnce([]);
    mockSaf.createFileAsync.mockResolvedValueOnce('content://tree/Download/Alex_Rahman_Backend.pdf');
    mockSaf.writeAsStringAsync.mockResolvedValueOnce(undefined);

    const result = await stageResume(baseResume, 'My cover note');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.platform).toBe('android');
      expect(result.value.clipboardCopied).toBe(false);
    }
  });

  it('handles Android first run: prompts user, saves dir to kvStore, cleans existing copy, writes file', async () => {
    mockExistingFiles.add(baseResume.fileUri!);
    mockFileBase64.set(baseResume.fileUri!, 'PDFBASE64');

    mockSaf.requestDirectoryPermissionsAsync.mockResolvedValueOnce({
      granted: true,
      directoryUri: 'content://tree/Download%2FJobify',
    });
    mockSaf.readDirectoryAsync.mockResolvedValueOnce([
      'content://tree/Download%2FJobify/other.pdf',
      'content://tree/Download%2FJobify/Alex_Rahman_Backend.pdf',
    ]);
    mockSaf.createFileAsync.mockResolvedValueOnce('content://tree/Download%2FJobify/Alex_Rahman_Backend.pdf');
    mockSaf.writeAsStringAsync.mockResolvedValueOnce(undefined);

    const result = await stageResume(baseResume, 'Cover note');
    expect(result.ok).toBe(true);
    if (result.ok && result.value.platform === 'android') {
      expect(result.value.platform).toBe('android');
      expect(result.value.destinationUri).toBe('content://tree/Download%2FJobify/Alex_Rahman_Backend.pdf');
      expect(result.value.clipboardCopied).toBe(true);
    }
    expect(mockSaf.getUriForDirectoryInRoot).toHaveBeenCalledWith('Download');
    expect(kvStoreMock.kvSet).toHaveBeenCalledWith(
      KV_KEYS.androidStagingDirUri,
      'content://tree/Download%2FJobify',
    );
    expect(mockSaf.deleteAsync).toHaveBeenCalledWith('content://tree/Download%2FJobify/Alex_Rahman_Backend.pdf');
    expect(mockSaf.createFileAsync).toHaveBeenCalledWith(
      'content://tree/Download%2FJobify',
      'Alex_Rahman_Backend',
      'application/pdf',
    );
    expect(mockSaf.writeAsStringAsync).toHaveBeenCalledWith(
      'content://tree/Download%2FJobify/Alex_Rahman_Backend.pdf',
      'PDFBASE64',
      { encoding: 'base64' },
    );
  });

  it('uses label fallback when fileName is empty or null', async () => {
    mockExistingFiles.add(baseResume.fileUri!);
    mockFileBase64.set(baseResume.fileUri!, 'PDFBASE64');

    mockSaf.requestDirectoryPermissionsAsync.mockResolvedValueOnce({
      granted: true,
      directoryUri: 'content://tree/Download',
    });
    mockSaf.readDirectoryAsync.mockResolvedValueOnce([]);
    mockSaf.createFileAsync.mockResolvedValueOnce('content://tree/Download/Backend.pdf');
    mockSaf.writeAsStringAsync.mockResolvedValueOnce(undefined);

    const result = await stageResume({ ...baseResume, fileName: '' }, '');
    expect(result.ok).toBe(true);
    expect(mockSaf.createFileAsync).toHaveBeenCalledWith(
      'content://tree/Download',
      'Backend',
      'application/pdf',
    );
  });

  it('returns PERMISSION_DENIED when Android directory permission is not granted', async () => {
    mockExistingFiles.add(baseResume.fileUri!);
    mockSaf.requestDirectoryPermissionsAsync.mockResolvedValueOnce({
      granted: false,
    });

    const result = await stageResume(baseResume, '');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('PERMISSION_DENIED');
    }
  });

  it('handles stored-URI failure: removes stored URI, re-prompts, and succeeds', async () => {
    mockExistingFiles.add(baseResume.fileUri!);
    mockFileBase64.set(baseResume.fileUri!, 'PDFBASE64');
    kvStoreMock.__store.set(KV_KEYS.androidStagingDirUri, 'content://tree/stale');

    // First attempt with stale URI throws
    mockSaf.readDirectoryAsync.mockRejectedValueOnce(new Error('Folder deleted'));

    // Re-prompt user
    mockSaf.requestDirectoryPermissionsAsync.mockResolvedValueOnce({
      granted: true,
      directoryUri: 'content://tree/new-folder',
    });
    mockSaf.readDirectoryAsync.mockResolvedValueOnce([]);
    mockSaf.createFileAsync.mockResolvedValueOnce('content://tree/new-folder/Alex_Rahman_Backend.pdf');
    mockSaf.writeAsStringAsync.mockResolvedValueOnce(undefined);

    const result = await stageResume(baseResume, '');
    expect(result.ok).toBe(true);
    expect(kvStoreMock.kvRemove).toHaveBeenCalledWith(KV_KEYS.androidStagingDirUri);
    expect(mockSaf.requestDirectoryPermissionsAsync).toHaveBeenCalled();
  });

  it('returns WRITE_FAILED when second attempt after re-prompt also fails', async () => {
    mockExistingFiles.add(baseResume.fileUri!);
    mockFileBase64.set(baseResume.fileUri!, 'PDFBASE64');
    kvStoreMock.__store.set(KV_KEYS.androidStagingDirUri, 'content://tree/stale');

    // First attempt fails
    mockSaf.readDirectoryAsync.mockRejectedValueOnce(new Error('Folder deleted'));

    // Re-prompt user succeeds
    mockSaf.requestDirectoryPermissionsAsync.mockResolvedValueOnce({
      granted: true,
      directoryUri: 'content://tree/new-folder',
    });
    // Second attempt also fails
    mockSaf.readDirectoryAsync.mockRejectedValueOnce(new Error('Disk error'));

    const result = await stageResume(baseResume, '');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('WRITE_FAILED');
    }
  });

  it('handles iOS flow and returns SHARE_UNAVAILABLE when sharing not available', async () => {
    Object.defineProperty(Platform, 'OS', { value: 'ios', configurable: true });
    mockExistingFiles.add(baseResume.fileUri!);
    jest.mocked(Sharing.isAvailableAsync).mockResolvedValueOnce(false);

    const result = await stageResume(baseResume, '');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('SHARE_UNAVAILABLE');
    }
  });

  it('handles iOS flow: copies to cache and shares file', async () => {
    Object.defineProperty(Platform, 'OS', { value: 'ios', configurable: true });
    mockExistingFiles.add(baseResume.fileUri!);

    const result = await stageResume(baseResume, 'Great cover note');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.platform).toBe('ios');
      expect(result.value.clipboardCopied).toBe(true);
    }
    expect(Sharing.shareAsync).toHaveBeenCalledWith(
      'file://cache/Alex_Rahman_Backend.pdf',
      {
        mimeType: 'application/pdf',
        UTI: 'com.adobe.pdf',
        dialogTitle: 'Save resume',
      },
    );
  });
});
