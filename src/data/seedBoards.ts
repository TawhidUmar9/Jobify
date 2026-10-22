import type { JobBoard } from '../types/domain';

/**
 * Default job boards inserted once by migrateDbIfNeeded (T-004) when job_boards is empty.
 * Global boards that work without an account; users add, remove, and reorder in Settings → Job boards.
 * Order = sort_order. Region packs are a FUTURE.md item.
 */
export const SEED_BOARDS: readonly Omit<JobBoard, 'id' | 'lastVisitedUrl'>[] = [
  { name: 'LinkedIn', url: 'https://www.linkedin.com/jobs/', sortOrder: 0 },
  { name: 'Indeed', url: 'https://www.indeed.com/', sortOrder: 1 },
  { name: 'Wellfound', url: 'https://wellfound.com/jobs', sortOrder: 2 },
  { name: 'Himalayas', url: 'https://himalayas.app/jobs', sortOrder: 3 },
  { name: 'WWR', url: 'https://weworkremotely.com/', sortOrder: 4 },
  { name: 'Remote OK', url: 'https://remoteok.com/', sortOrder: 5 },
  { name: 'Remotive', url: 'https://remotive.com/remote-jobs', sortOrder: 6 },
  { name: 'Glints', url: 'https://glints.com/opportunities/jobs/explore', sortOrder: 7 },
];
