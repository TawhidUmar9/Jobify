import type { CandidateProfile, Resume } from '../../types/domain';

export type ResumeImportState =
  | { status: 'idle' }
  | { status: 'picking' }
  | { status: 'parsing' }
  | { status: 'error'; message: string }
  | { status: 'done'; resume: Resume; profile: CandidateProfile };

export interface ResumeImport {
  state: ResumeImportState;
  /** True when the configured provider can read PDFs (PDF_CAPABLE_PROVIDERS). */
  pdfSupported: boolean;
  /** Pick a PDF → parseResume (PDF) → save. */
  importPdf: (label: string) => Promise<void>;
  /** Parse pasted text → save (works with any provider). */
  importText: (label: string, text: string) => Promise<void>;
  reset: () => void;
}

/**
 * Resume import used by onboarding step 3 and Settings → Resumes. CONTRACT: ARCHITECTURE.md §7.5.
 * importPdf: pickPdf (CANCELLED → back to idle silently; TOO_LARGE → "PDF is larger than 10 MB";
 *   NOT_PDF → "Choose a PDF file") → readFileBase64 → parseResume(provider, {pdfBase64}) →
 *   insertResume({label, fileName: null, fileUri: null, content}) → storeResumePdf(picked.uri, id) →
 *   setResumeFile(db, id, picked.name, uri). If storing fails the resume stays text-only (no error).
 *   Profile merge: existing profile (or EMPTY_PROFILE) with every EMPTY field filled from the parse
 *   (never overwrite non-empty user values); timeZone = device time zone
 *   (expo-localization getCalendars()[0].timeZone) when empty → saveProfile.
 * importText: same without the file (fileName null).
 * Errors: AI errors → AI_ERROR_MESSAGES[code]; DUPLICATE_LABEL → "A resume with this name exists".
 */
export function useResumeImport(): ResumeImport {
  // TODO(T-019): implement per the rules above.
  return {
    state: { status: 'idle' },
    pdfSupported: false,
    importPdf: async () => {},
    importText: async () => {},
    reset: () => {},
  };
}
