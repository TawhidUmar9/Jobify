import Constants from 'expo-constants';
import { getDocumentAsync } from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import type { SQLiteDatabase } from 'expo-sqlite';

import { listAnswers } from '../db/repositories/answersRepo';
import { listApplications } from '../db/repositories/applicationsRepo';
import { listBoards } from '../db/repositories/boardsRepo';
import { getPreferences, getProfile } from '../db/repositories/profileRepo';
import { listResumes } from '../db/repositories/resumesRepo';
import { normalizePreferences, normalizeProfile } from '../lib/normalize';
import { err, ok, type Result } from '../lib/result';
import {
  APPLICATION_STATUSES,
  ELIGIBILITIES,
  RED_FLAG_CODES,
  type Application,
  type ApplicationStatus,
  type CandidateProfile,
  type Eligibility,
  type JobBoard,
  type JobPreferences,
  type RedFlag,
  type RedFlagCode,
  type ResumeContent,
  type SavedAnswer,
} from '../types/domain';
import { KV_KEYS, kvSet } from './kvStore';

/**
 * Plain-JSON backup (v1 is unencrypted; the export screen warns). CONTRACT: ARCHITECTURE.md §6.6.
 * Never includes the API key or resume PDF files (text content only).
 */

export const BACKUP_FORMAT = 'jobify-backup';
export const BACKUP_VERSION = 1;

export interface BackupFileV1 {
  format: typeof BACKUP_FORMAT;
  version: typeof BACKUP_VERSION;
  /** ISO 8601 UTC. */
  exportedAt: string;
  /** app.json expo.version at export time. */
  appVersion: string;
  profile: CandidateProfile | null;
  preferences: JobPreferences;
  resumes: { label: string; fileName: string | null; content: ResumeContent }[];
  boards: Omit<JobBoard, 'id'>[];
  answers: Omit<SavedAnswer, 'id'>[];
  applications: Omit<Application, 'id' | 'resumeId'>[];
}

export type ExportError = 'DB_ERROR' | 'WRITE_FAILED' | 'SHARE_UNAVAILABLE';

/**
 * Builds BackupFileV1 from the DB, writes `${Paths.cache}/jobify-backup-YYYY-MM-DD.json`
 * (2-space JSON), then Sharing.shareAsync(uri, { mimeType: 'application/json' }).
 */
export async function exportBackup(db: SQLiteDatabase): Promise<Result<{ uri: string }, ExportError>> {
  let isAvailable = false;
  try {
    isAvailable = await Sharing.isAvailableAsync();
  } catch {
    isAvailable = false;
  }
  if (!isAvailable) {
    return err('SHARE_UNAVAILABLE');
  }

  let backup: BackupFileV1;
  try {
    const profile = await getProfile(db);
    const preferences = await getPreferences(db);
    const resumes = (await listResumes(db)).map((r) => ({
      label: r.label,
      fileName: r.fileName,
      content: r.content,
    }));
    const boards = (await listBoards(db)).map(({ id: _id, ...rest }) => rest);
    const answers = (await listAnswers(db)).map(({ id: _id, ...rest }) => rest);
    const applications = (await listApplications(db)).map(({ id: _id, resumeId: _rId, ...rest }) => rest);

    const now = new Date();
    const appVersion = Constants.expoConfig?.version ?? '1.0.0';

    backup = {
      format: BACKUP_FORMAT,
      version: BACKUP_VERSION,
      exportedAt: now.toISOString(),
      appVersion,
      profile,
      preferences,
      resumes,
      boards,
      answers,
      applications,
    };
  } catch {
    return err('DB_ERROR');
  }

  const json = JSON.stringify(backup, null, 2);
  const datePart = new Date().toISOString().slice(0, 10);
  const fileName = `jobify-backup-${datePart}.json`;
  const file = new File(Paths.cache, fileName);

  try {
    if (typeof file.create === 'function' && !file.exists) {
      file.create();
    }
    if (typeof file.write === 'function') {
      await file.write(json);
    }
  } catch {
    return err('WRITE_FAILED');
  }

  try {
    await Sharing.shareAsync(file.uri, { mimeType: 'application/json' });
    return ok({ uri: file.uri });
  } catch {
    return err('SHARE_UNAVAILABLE');
  }
}

export type ImportError = 'CANCELLED' | 'UNREADABLE' | 'WRONG_FORMAT' | 'NEWER_VERSION' | 'DB_ERROR';

export interface ImportSummary {
  resumes: number;
  boards: number;
  answers: number;
  applications: number;
}

/**
 * Picks a JSON file (DocumentPicker type 'application/json'), validates it, and REPLACES all local
 * data in one transaction: profile, preferences, resumes (text only: fileName kept, fileUri NULL),
 * job_boards, answers, applications (resume_id re-linked by resume label, else NULL).
 * Validation: format/version must match (version > BACKUP_VERSION → NEWER_VERSION); profile and
 * preferences pass through normalizeProfile/normalizePreferences; array items failing type checks
 * are skipped (not fatal). On success sets KV onboardingCompleted = "1".
 * The caller shows a confirmation dialog BEFORE calling (data is replaced).
 */
export async function importBackup(db: SQLiteDatabase): Promise<Result<ImportSummary, ImportError>> {
  let pickResult;
  try {
    pickResult = await getDocumentAsync({ type: 'application/json' });
  } catch {
    return err('UNREADABLE');
  }

  if (pickResult.canceled || !pickResult.assets || pickResult.assets.length === 0) {
    return err('CANCELLED');
  }

  const asset = pickResult.assets[0];
  if (!asset || !asset.uri) {
    return err('CANCELLED');
  }

  let text: string;
  try {
    const file = new File(asset.uri);
    text = await file.text();
  } catch {
    return err('UNREADABLE');
  }

  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return err('UNREADABLE');
  }

  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return err('WRONG_FORMAT');
  }

  const record = data as Record<string, unknown>;

  if (record.format !== BACKUP_FORMAT) {
    return err('WRONG_FORMAT');
  }

  if (typeof record.version !== 'number') {
    return err('WRONG_FORMAT');
  }

  if (record.version > BACKUP_VERSION) {
    return err('NEWER_VERSION');
  }

  if (record.version !== BACKUP_VERSION) {
    return err('WRONG_FORMAT');
  }

  const resumesToInsert: { label: string; fileName: string | null; content: ResumeContent }[] = [];
  if (Array.isArray(record.resumes)) {
    const seenLabels = new Set<string>();
    for (const item of record.resumes) {
      if (!item || typeof item !== 'object') continue;
      const r = item as Record<string, unknown>;
      if (typeof r.label !== 'string') continue;
      const label = r.label.trim();
      if (label.length < 1 || label.length > 40) continue;
      if (seenLabels.has(label.toLowerCase())) continue;
      seenLabels.add(label.toLowerCase());

      const fileName = typeof r.fileName === 'string' ? r.fileName : null;
      let content: ResumeContent = { summary: '', skills: [], highlights: [] };
      if (r.content && typeof r.content === 'object' && !Array.isArray(r.content)) {
        const c = r.content as Record<string, unknown>;
        content = {
          summary: typeof c.summary === 'string' ? c.summary : '',
          skills: Array.isArray(c.skills) ? c.skills.filter((s): s is string => typeof s === 'string') : [],
          highlights: Array.isArray(c.highlights) ? c.highlights.filter((h): h is string => typeof h === 'string') : [],
        };
      }
      resumesToInsert.push({ label, fileName, content });
    }
  }

  const boardsToInsert: Omit<JobBoard, 'id'>[] = [];
  if (Array.isArray(record.boards)) {
    for (const item of record.boards) {
      if (!item || typeof item !== 'object') continue;
      const b = item as Record<string, unknown>;
      if (typeof b.name !== 'string' || typeof b.url !== 'string') continue;
      const name = b.name.trim();
      const url = b.url.trim();
      if (name.length < 1 || name.length > 16) continue;
      if (!url.startsWith('https://') && !url.startsWith('http://')) continue;
      const lastVisitedUrl = typeof b.lastVisitedUrl === 'string' ? b.lastVisitedUrl : null;
      const sortOrder = typeof b.sortOrder === 'number' ? b.sortOrder : boardsToInsert.length;
      boardsToInsert.push({ name, url, lastVisitedUrl, sortOrder });
    }
  }

  const answersToInsert: Omit<SavedAnswer, 'id'>[] = [];
  if (Array.isArray(record.answers)) {
    for (const item of record.answers) {
      if (!item || typeof item !== 'object') continue;
      const a = item as Record<string, unknown>;
      if (typeof a.question !== 'string' || typeof a.answer !== 'string') continue;
      const question = a.question.trim().replace(/\s+/g, ' ');
      const answer = a.answer.trim();
      if (question.length < 1 || question.length > 300) continue;
      if (answer.length < 1 || answer.length > 4000) continue;
      const useCount = typeof a.useCount === 'number' && a.useCount >= 0 ? Math.floor(a.useCount) : 0;
      const updatedAt = typeof a.updatedAt === 'string' ? a.updatedAt : new Date().toISOString();
      answersToInsert.push({ question, answer, useCount, updatedAt });
    }
  }

  const applicationsToInsert: Omit<Application, 'id' | 'resumeId'>[] = [];
  if (Array.isArray(record.applications)) {
    const seenUrls = new Set<string>();
    for (const item of record.applications) {
      if (!item || typeof item !== 'object') continue;
      const app = item as Record<string, unknown>;
      if (typeof app.companyName !== 'string' || typeof app.roleTitle !== 'string') continue;
      if (typeof app.boardName !== 'string' || typeof app.jobUrl !== 'string') continue;
      const jobUrl = app.jobUrl.trim();
      if (!jobUrl || seenUrls.has(jobUrl)) continue;
      seenUrls.add(jobUrl);

      const resumeLabel = typeof app.resumeLabel === 'string' ? app.resumeLabel : '';
      let matchScore: number | null = null;
      if (typeof app.matchScore === 'number' && Number.isFinite(app.matchScore)) {
        matchScore = Math.min(100, Math.max(0, Math.round(app.matchScore)));
      }
      const eligibility =
        typeof app.eligibility === 'string' && (ELIGIBILITIES as readonly string[]).includes(app.eligibility)
          ? (app.eligibility as Eligibility)
          : null;

      const redFlags: RedFlag[] = [];
      if (Array.isArray(app.redFlags)) {
        for (const rf of app.redFlags) {
          if (!rf || typeof rf !== 'object') continue;
          const rfObj = rf as Record<string, unknown>;
          if (
            typeof rfObj.code === 'string' &&
            (RED_FLAG_CODES as readonly string[]).includes(rfObj.code) &&
            typeof rfObj.detail === 'string'
          ) {
            redFlags.push({ code: rfObj.code as RedFlagCode, detail: rfObj.detail });
          }
        }
      }

      const coverNote = typeof app.coverNote === 'string' ? app.coverNote : null;
      const coldDm = typeof app.coldDm === 'string' ? app.coldDm : null;
      const notes = typeof app.notes === 'string' ? app.notes : '';
      const status =
        typeof app.status === 'string' && (APPLICATION_STATUSES as readonly string[]).includes(app.status)
          ? (app.status as ApplicationStatus)
          : 'APPLIED';
      const followUpAt = typeof app.followUpAt === 'string' ? app.followUpAt : null;
      const createdAt = typeof app.createdAt === 'string' ? app.createdAt : new Date().toISOString();
      const statusChangedAt = typeof app.statusChangedAt === 'string' ? app.statusChangedAt : createdAt;

      applicationsToInsert.push({
        companyName: app.companyName,
        roleTitle: app.roleTitle,
        boardName: app.boardName,
        jobUrl,
        resumeLabel,
        matchScore,
        eligibility,
        redFlags,
        coverNote,
        coldDm,
        notes,
        status,
        followUpAt,
        createdAt,
        statusChangedAt,
      });
    }
  }

  let resumesCount = 0;
  let boardsCount = 0;
  let answersCount = 0;
  let applicationsCount = 0;

  try {
    await db.withTransactionAsync(async () => {
      await db.runAsync('DELETE FROM applications');
      await db.runAsync('DELETE FROM answers');
      await db.runAsync('DELETE FROM job_boards');
      await db.runAsync('DELETE FROM resumes');
      await db.runAsync('DELETE FROM preferences');
      await db.runAsync('DELETE FROM profile');

      if (record.profile !== null && typeof record.profile === 'object') {
        const normalizedProfile = normalizeProfile(record.profile);
        await db.runAsync('INSERT INTO profile (id, data_json, updated_at) VALUES (1, ?, CURRENT_TIMESTAMP)', [
          JSON.stringify(normalizedProfile),
        ]);
      }

      const normalizedPreferences = normalizePreferences(record.preferences);
      await db.runAsync('INSERT INTO preferences (id, data_json, updated_at) VALUES (1, ?, CURRENT_TIMESTAMP)', [
        JSON.stringify(normalizedPreferences),
      ]);

      const labelToResumeId = new Map<string, number>();
      for (const r of resumesToInsert) {
        const res = await db.runAsync(
          'INSERT INTO resumes (label, file_name, file_uri, content_json, created_at) VALUES (?, ?, NULL, ?, CURRENT_TIMESTAMP)',
          [r.label, r.fileName, JSON.stringify(r.content)],
        );
        labelToResumeId.set(r.label.toLowerCase(), res.lastInsertRowId);
        resumesCount += 1;
      }

      for (const b of boardsToInsert) {
        await db.runAsync('INSERT INTO job_boards (name, url, last_visited_url, sort_order) VALUES (?, ?, ?, ?)', [
          b.name,
          b.url,
          b.lastVisitedUrl,
          b.sortOrder,
        ]);
        boardsCount += 1;
      }

      for (const a of answersToInsert) {
        await db.runAsync(
          'INSERT INTO answers (question, answer, use_count, updated_at) VALUES (?, ?, ?, ?)',
          [a.question, a.answer, a.useCount, a.updatedAt],
        );
        answersCount += 1;
      }

      for (const app of applicationsToInsert) {
        const resumeId = app.resumeLabel ? (labelToResumeId.get(app.resumeLabel.toLowerCase()) ?? null) : null;
        await db.runAsync(
          `INSERT INTO applications (
            company_name, role_title, board_name, job_url, resume_id, resume_label,
            match_score, eligibility, red_flags_json, cover_note, cold_dm, notes,
            status, follow_up_at, created_at, status_changed_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            app.companyName,
            app.roleTitle,
            app.boardName,
            app.jobUrl,
            resumeId,
            app.resumeLabel,
            app.matchScore,
            app.eligibility,
            JSON.stringify(app.redFlags),
            app.coverNote,
            app.coldDm,
            app.notes,
            app.status,
            app.followUpAt,
            app.createdAt,
            app.statusChangedAt,
          ],
        );
        applicationsCount += 1;
      }
    });
  } catch {
    return err('DB_ERROR');
  }

  await kvSet(KV_KEYS.onboardingCompleted, '1');

  return ok({
    resumes: resumesCount,
    boards: boardsCount,
    answers: answersCount,
    applications: applicationsCount,
  });
}
