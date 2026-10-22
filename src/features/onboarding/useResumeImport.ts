import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useState } from 'react';

import { getProfile, saveProfile } from '../../db/repositories/profileRepo';
import { insertResume, setResumeFile } from '../../db/repositories/resumesRepo';
import { createProvider, parseResume } from '../../services/ai/aiClient';
import { loadAiConfig } from '../../services/ai/config';
import { AI_ERROR_MESSAGES, PDF_CAPABLE_PROVIDERS } from '../../services/ai/types';
import { pickPdf, readFileBase64, storeResumePdf } from '../../services/resumeFiles';
import { getApiKey } from '../../services/secrets';
import type { CandidateProfile, Resume } from '../../types/domain';
import { deviceProfileDefaults } from '../settings/useProfileData';

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

const PICK_ERRORS = {
  TOO_LARGE: 'PDF is larger than 10 MB',
  NOT_PDF: 'Choose a PDF file',
} as const;

function fillString(current: string, next: string): string {
  return current.trim() !== '' ? current : next;
}

/** Fills only empty profile fields from a parse. Non-empty user values stay. */
export function mergeParsedProfile(
  existing: CandidateProfile,
  parsed: Omit<CandidateProfile, 'countryCode' | 'timeZone' | 'extraFacts'>,
  deviceTimeZone: string,
): CandidateProfile {
  return {
    fullName: fillString(existing.fullName, parsed.fullName),
    email: fillString(existing.email, parsed.email),
    phone: fillString(existing.phone, parsed.phone),
    location: fillString(existing.location, parsed.location),
    countryCode: existing.countryCode,
    timeZone: fillString(existing.timeZone, deviceTimeZone),
    headline: fillString(existing.headline, parsed.headline),
    summary: fillString(existing.summary, parsed.summary),
    links: existing.links.length > 0 ? existing.links : parsed.links,
    skills: existing.skills.length > 0 ? existing.skills : parsed.skills,
    experience: existing.experience.length > 0 ? existing.experience : parsed.experience,
    education: existing.education.length > 0 ? existing.education : parsed.education,
    extraFacts: existing.extraFacts,
  };
}

function writeErrorMessage(code: 'DUPLICATE_LABEL' | 'EMPTY_LABEL' | 'DB_ERROR'): string {
  if (code === 'DUPLICATE_LABEL') return 'A resume with this name exists';
  if (code === 'EMPTY_LABEL') return 'Enter a resume name';
  return 'Could not save. Try again.';
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
  const db = useSQLiteContext();
  const [state, setState] = useState<ResumeImportState>({ status: 'idle' });
  const [pdfSupported, setPdfSupported] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void loadAiConfig().then((config) => {
      if (cancelled) return;
      const supported = config !== null && (PDF_CAPABLE_PROVIDERS as readonly string[]).includes(config.provider);
      setPdfSupported(supported);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const reset = useCallback(() => {
    setState({ status: 'idle' });
  }, []);

  const finish = useCallback(
    async (label: string, content: Resume['content'], parsedProfile: Omit<CandidateProfile, 'countryCode' | 'timeZone' | 'extraFacts'>, file: { name: string; sourceUri: string } | null) => {
      const inserted = await insertResume(db, { label, fileName: null, fileUri: null, content });
      if (!inserted.ok) {
        setState({ status: 'error', message: writeErrorMessage(inserted.error) });
        return;
      }
      let resume = inserted.value;
      if (file) {
        const stored = await storeResumePdf(file.sourceUri, resume.id);
        if (stored) {
          await setResumeFile(db, resume.id, file.name, stored);
          resume = { ...resume, fileName: file.name, fileUri: stored };
        }
      }
      const saved = await getProfile(db);
      const device = deviceProfileDefaults();
      const base = saved ?? device;
      const profile = mergeParsedProfile(base, parsedProfile, device.timeZone);
      try {
        await saveProfile(db, profile);
      } catch {
        setState({ status: 'error', message: 'Could not save. Try again.' });
        return;
      }
      setState({ status: 'done', resume, profile });
    },
    [db],
  );

  const importPdf = useCallback(
    async (label: string) => {
      setState({ status: 'picking' });
      const picked = await pickPdf();
      if (!picked.ok) {
        if (picked.error === 'CANCELLED') {
          setState({ status: 'idle' });
          return;
        }
        setState({ status: 'error', message: PICK_ERRORS[picked.error] });
        return;
      }
      setState({ status: 'parsing' });
      const pdfBase64 = await readFileBase64(picked.value.uri);
      if (pdfBase64 === null) {
        setState({ status: 'error', message: 'Could not read that PDF.' });
        return;
      }
      const config = await loadAiConfig();
      const provider = config ? createProvider(config, await getApiKey()) : null;
      const parsed = await parseResume(provider, { pdfBase64, pastedText: null });
      if (!parsed.ok) {
        setState({ status: 'error', message: AI_ERROR_MESSAGES[parsed.error.code] });
        return;
      }
      await finish(label, parsed.value.content, parsed.value.profile, { name: picked.value.name, sourceUri: picked.value.uri });
    },
    [finish],
  );

  const importText = useCallback(
    async (label: string, text: string) => {
      setState({ status: 'parsing' });
      const config = await loadAiConfig();
      const provider = config ? createProvider(config, await getApiKey()) : null;
      const parsed = await parseResume(provider, { pdfBase64: null, pastedText: text });
      if (!parsed.ok) {
        setState({ status: 'error', message: AI_ERROR_MESSAGES[parsed.error.code] });
        return;
      }
      await finish(label, parsed.value.content, parsed.value.profile, null);
    },
    [finish],
  );

  return { state, pdfSupported, importPdf, importText, reset };
}
