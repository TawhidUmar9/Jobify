import { getDocumentAsync } from 'expo-document-picker';

import { deleteResumePdf, MAX_RESUME_BYTES, pickPdf, readFileBase64, storeResumePdf } from '../resumeFiles';

jest.mock('expo-file-system', () => {
  const files = new Map<string, string>();
  class Directory {
    uri: string;
    exists = false;
    constructor(...parts: (string | { uri: string })[]) {
      this.uri = parts.map((part) => (typeof part === 'string' ? part : part.uri)).join('/');
    }
    create() {
      this.exists = true;
    }
  }
  class File {
    uri: string;
    constructor(...parts: (string | { uri: string })[]) {
      this.uri = parts.map((part) => (typeof part === 'string' ? part : part.uri)).join('/');
    }
    get exists() {
      return files.has(this.uri);
    }
    delete() {
      files.delete(this.uri);
    }
    async base64() {
      const value = files.get(this.uri);
      if (value === undefined) throw new Error('missing');
      return value;
    }
    async copy(destination: { uri: string }) {
      files.set(destination.uri, files.get(this.uri) ?? 'PDF');
    }
  }
  return {
    __esModule: true,
    Directory,
    File,
    Paths: { document: { uri: 'file://docs' } },
    __files: files,
  };
});

const files = (jest.requireMock('expo-file-system') as { __files: Map<string, string> }).__files;

describe('resumeFiles', () => {
  beforeEach(() => {
    files.clear();
    jest.mocked(getDocumentAsync).mockReset();
  });

  it('maps cancel, size, and non-pdf picks', async () => {
    jest.mocked(getDocumentAsync).mockResolvedValueOnce({ canceled: true, assets: null });
    expect(await pickPdf()).toEqual({ ok: false, error: 'CANCELLED' });

    jest.mocked(getDocumentAsync).mockResolvedValueOnce({
      canceled: false,
      assets: [{ name: 'big.pdf', size: MAX_RESUME_BYTES + 1, uri: 'file://big', mimeType: 'application/pdf', lastModified: 0 }],
    });
    expect(await pickPdf()).toEqual({ ok: false, error: 'TOO_LARGE' });

    jest.mocked(getDocumentAsync).mockResolvedValueOnce({
      canceled: false,
      assets: [{ name: 'notes.txt', size: 12, uri: 'file://notes', mimeType: 'text/plain', lastModified: 0 }],
    });
    expect(await pickPdf()).toEqual({ ok: false, error: 'NOT_PDF' });

    jest.mocked(getDocumentAsync).mockResolvedValueOnce({
      canceled: false,
      assets: [{ name: 'Alex_Rahman.pdf', size: 20, uri: 'file://alex', mimeType: 'application/pdf', lastModified: 0 }],
    });
    expect(await pickPdf()).toEqual({
      ok: true,
      value: { uri: 'file://alex', name: 'Alex_Rahman.pdf', size: 20 },
    });
  });

  it('reads base64 and copies a PDF into the resumes directory', async () => {
    files.set('file://alex', 'QUJD');
    expect(await readFileBase64('file://alex')).toBe('QUJD');
    expect(await readFileBase64('file://missing')).toBeNull();

    const stored = await storeResumePdf('file://alex', 4);
    expect(stored).toBe('file://docs/resumes/4.pdf');
    expect(files.get('file://docs/resumes/4.pdf')).toBe('QUJD');
  });

  it('deletes stored resume pdf safely', async () => {
    files.set('file://docs/resumes/4.pdf', 'QUJD');
    await deleteResumePdf('file://docs/resumes/4.pdf');
    expect(files.has('file://docs/resumes/4.pdf')).toBe(false);

    // non-existent file doesn't throw
    await expect(deleteResumePdf('file://docs/resumes/999.pdf')).resolves.toBeUndefined();
  });
});
