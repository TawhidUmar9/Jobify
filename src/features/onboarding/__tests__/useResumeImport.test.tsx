import { act, renderHook, waitFor } from '@testing-library/react-native';
import Storage from 'expo-sqlite/kv-store';

import { getProfile, saveProfile } from '../../../db/repositories/profileRepo';
import { insertResume, setResumeFile } from '../../../db/repositories/resumesRepo';
import { parseResume } from '../../../services/ai/aiClient';
import { saveAiConfig } from '../../../services/ai/config';
import { AI_ERROR_MESSAGES } from '../../../services/ai/types';
import { pickPdf, readFileBase64, storeResumePdf } from '../../../services/resumeFiles';
import { EMPTY_PROFILE, type CandidateProfile, type Resume } from '../../../types/domain';
import { deviceProfileDefaults } from '../../settings/useProfileData';
import { mergeParsedProfile, useResumeImport } from '../useResumeImport';

jest.mock('expo-sqlite', () => ({
  useSQLiteContext: () => ({}),
}));

jest.mock('../../../services/resumeFiles', () => ({
  pickPdf: jest.fn(),
  readFileBase64: jest.fn(),
  storeResumePdf: jest.fn(),
}));

jest.mock('../../../services/ai/aiClient', () => ({
  createProvider: jest.fn(() => ({ kind: 'gemini' })),
  parseResume: jest.fn(),
}));

jest.mock('../../../db/repositories/resumesRepo', () => ({
  insertResume: jest.fn(),
  setResumeFile: jest.fn(),
}));

jest.mock('../../../db/repositories/profileRepo', () => ({
  getProfile: jest.fn(),
  saveProfile: jest.fn(),
}));

const parsedProfile = {
  fullName: 'Alex Rahman',
  email: 'alex.rahman@example.com',
  phone: '+8801700000000',
  location: 'Dhaka, Bangladesh',
  headline: 'Backend engineer',
  summary: 'Builds services.',
  links: [],
  skills: ['TypeScript'],
  experience: [{ title: 'Engineer', company: 'Acme', start: '2024', end: 'Present', bullets: [] }],
  education: [],
};

const storedResume: Resume = {
  id: 3,
  label: 'Main',
  fileName: null,
  fileUri: null,
  content: { summary: 'Builds services.', skills: ['TypeScript'], highlights: [] },
  createdAt: '2026-10-22 00:00:00',
};

function profile(patch: Partial<CandidateProfile>): CandidateProfile {
  return {
    ...EMPTY_PROFILE,
    links: [],
    skills: [],
    experience: [],
    education: [],
    extraFacts: [],
    ...patch,
  };
}

describe('mergeParsedProfile', () => {
  it('never overwrites a non-empty field and fills an empty phone', () => {
    const merged = mergeParsedProfile(
      profile({ fullName: 'Sam', phone: '', timeZone: '' }),
      parsedProfile,
      'Asia/Dhaka',
    );
    expect(merged.fullName).toBe('Sam');
    expect(merged.phone).toBe('+8801700000000');
    expect(merged.timeZone).toBe('Asia/Dhaka');
    expect(merged.skills).toEqual(['TypeScript']);
  });
});

describe('useResumeImport', () => {
  beforeEach(async () => {
    await Storage.clear();
    jest.mocked(pickPdf).mockReset();
    jest.mocked(readFileBase64).mockReset();
    jest.mocked(storeResumePdf).mockReset();
    jest.mocked(parseResume).mockReset();
    jest.mocked(insertResume).mockReset();
    jest.mocked(setResumeFile).mockReset();
    jest.mocked(getProfile).mockReset();
    jest.mocked(saveProfile).mockReset();
    jest.mocked(insertResume).mockResolvedValue({ ok: true, value: storedResume });
    jest.mocked(saveProfile).mockResolvedValue(undefined);
    jest.mocked(getProfile).mockResolvedValue(null);
  });

  it('hides PDF support unless the saved provider can read PDFs', async () => {
    const hidden = await renderHook(() => useResumeImport());
    await waitFor(() => expect(hidden.result.current.pdfSupported).toBe(false));

    await saveAiConfig({ provider: 'openai_compatible', model: 'mock', baseUrl: 'http://10.0.2.2:8787/v1' });
    const openai = await renderHook(() => useResumeImport());
    await waitFor(() => expect(openai.result.current.pdfSupported).toBe(false));

    await saveAiConfig({ provider: 'gemini', model: 'gemini-3.8-flash', baseUrl: 'https://generativelanguage.googleapis.com' });
    const gemini = await renderHook(() => useResumeImport());
    await waitFor(() => expect(gemini.result.current.pdfSupported).toBe(true));
  });

  it('maps pick errors to copy and ignores cancel', async () => {
    const { result } = await renderHook(() => useResumeImport());
    jest.mocked(pickPdf).mockResolvedValueOnce({ ok: false, error: 'CANCELLED' });
    await act(async () => {
      await result.current.importPdf('Main');
    });
    expect(result.current.state).toEqual({ status: 'idle' });

    jest.mocked(pickPdf).mockResolvedValueOnce({ ok: false, error: 'TOO_LARGE' });
    await act(async () => {
      await result.current.importPdf('Main');
    });
    expect(result.current.state).toEqual({ status: 'error', message: 'PDF is larger than 10 MB' });

    jest.mocked(pickPdf).mockResolvedValueOnce({ ok: false, error: 'NOT_PDF' });
    await act(async () => {
      await result.current.importPdf('Main');
    });
    expect(result.current.state).toEqual({ status: 'error', message: 'Choose a PDF file' });
  });

  it('imports pasted text with any provider and merges without overwriting', async () => {
    await saveAiConfig({ provider: 'openai_compatible', model: 'mock', baseUrl: 'http://10.0.2.2:8787/v1' });
    jest.mocked(getProfile).mockResolvedValue(profile({ fullName: 'Sam', phone: '  ' }));
    jest.mocked(parseResume).mockResolvedValue({
      ok: true,
      value: { profile: parsedProfile, content: storedResume.content },
    });
    const { result } = await renderHook(() => useResumeImport());
    await act(async () => {
      await result.current.importText('Main', 'resume text');
    });
    expect(result.current.state.status).toBe('done');
    if (result.current.state.status !== 'done') return;
    expect(result.current.state.profile.fullName).toBe('Sam');
    expect(result.current.state.profile.phone).toBe('+8801700000000');
    expect(result.current.state.resume.fileName).toBeNull();
    expect(jest.mocked(saveProfile)).toHaveBeenCalled();
  });

  it('stores a PDF when the copy succeeds and reports AI and duplicate errors', async () => {
    await saveAiConfig({ provider: 'gemini', model: 'gemini-3.8-flash', baseUrl: 'https://generativelanguage.googleapis.com' });
    jest.mocked(pickPdf).mockResolvedValue({
      ok: true,
      value: { uri: 'file://alex', name: 'Alex_Rahman.pdf', size: 20 },
    });
    jest.mocked(readFileBase64).mockResolvedValue('QUJD');
    jest.mocked(storeResumePdf).mockResolvedValue('file://docs/resumes/3.pdf');
    jest.mocked(parseResume).mockResolvedValueOnce({
      ok: true,
      value: { profile: parsedProfile, content: storedResume.content },
    });
    const { result } = await renderHook(() => useResumeImport());
    await act(async () => {
      await result.current.importPdf('Main');
    });
    expect(jest.mocked(setResumeFile)).toHaveBeenCalledWith(expect.anything(), 3, 'Alex_Rahman.pdf', 'file://docs/resumes/3.pdf');
    expect(result.current.state.status).toBe('done');
    if (result.current.state.status === 'done') {
      expect(result.current.state.resume.fileName).toBe('Alex_Rahman.pdf');
      expect(result.current.state.profile.timeZone).toBe(deviceProfileDefaults().timeZone);
    }

    jest.mocked(parseResume).mockResolvedValueOnce({ ok: false, error: { code: 'AUTH' } });
    await act(async () => {
      await result.current.importPdf('Main');
    });
    expect(result.current.state).toEqual({ status: 'error', message: AI_ERROR_MESSAGES.AUTH });

    jest.mocked(parseResume).mockResolvedValueOnce({
      ok: true,
      value: { profile: parsedProfile, content: storedResume.content },
    });
    jest.mocked(insertResume).mockResolvedValueOnce({ ok: false, error: 'DUPLICATE_LABEL' });
    await act(async () => {
      await result.current.importPdf('Main');
    });
    expect(result.current.state).toEqual({ status: 'error', message: 'A resume with this name exists' });
  });
});
