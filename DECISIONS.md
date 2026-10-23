# DECISIONS.md

Log every change to a contract, schema, route, permission, dependency, or pinned version here **before** making it. Newest first.

Template:
```
## D-0xx YYYY-MM-DD: <short title>
- Task: T-0xx
- Change: <exactly what changes, file by file>
- Why: <the concrete failure or requirement>
- Impact: <other files/tests/docs that must change; tests added>
- Approved by: <architect | owner | self (only for non-contract notes)>
```

---

## D-011 2026-10-23: Release build allows cleartext HTTP and keeps the activity on font changes
- Task: T-046g
- Change: new local config plugin `plugins/withAndroidReleaseFixes.js` (uses `withAndroidManifest` from `expo/config-plugins`; no new dependency), listed in `app.json` `plugins`. It sets `android:usesCleartextTraffic="true"` on `<application>` and adds `fontScale|density` to MainActivity's `android:configChanges` (keeping the existing values, no duplicates).
- Why: on the release APK (2026-10-23) every `http://` load failed with `net::ERR_CLEARTEXT_NOT_PERMITTED`. Debug builds allow cleartext, release builds don't. That breaks local OpenAI-compatible servers (the AI settings suggest `http://192.168.1.5:11434/v1`, e.g. Ollama on the LAN), plain-http job pages, and the mock-server test setup. Separately, a font-size change recreated the activity, mounted a second React root ("configured linking in multiple places") and a following deep link crashed the Workspace screen (see D-012).
- Impact: README (note that the in-app browser and local AI servers may use plain HTTP); F-Droid metadata unaffected.
- Approved by: architect

## D-012 2026-10-23: Workspace clears its url param through its own navigation object
- Task: T-046g
- Change: `src/app/(tabs)/index.tsx`: after `openUrl(requestedUrl)`, clear the param with the screen's own navigation (`useNavigation()` → `navigation.setParams({ url: undefined })`, typed correctly) instead of the global imperative `router.setParams`. No other change to the T-025 behaviour.
- Why: on the release APK, a deep link right after an activity recreation threw "The imperative router is unavailable before the first render has finished." inside WorkspaceScreen and showed the error screen. The global router belonged to a root that had not finished rendering.
- Approved by: architect

## D-010 2026-10-23: Release hardening: no backup, no extra permissions
- Task: T-046g
- Change: `app.json`: `android.allowBackup: false`; add `android.permission.SYSTEM_ALERT_WINDOW`, `android.permission.USE_BIOMETRIC`, `android.permission.USE_FINGERPRINT` to `android.blockedPermissions`.
- Why: the release APK requested "display over other apps" (React Native dev-menu permission, merged into release) and biometric permissions (expo-secure-store's optional auth, unused). `allowBackup=true` lets Android copy the SQLite database (profile, resumes, applications) to cloud or device-to-device backup, which contradicts the privacy statement ("stored only on this device"). The app has its own backup (D-006).
- Impact: none in JS. Re-check the merged release manifest after prebuild.
- Approved by: architect

## D-009 2026-10-23: "Save for later" bookmark in the browser toolbar
- Task: T-046d
- Change:
  - `src/db/repositories/applicationsRepo.ts`: `insertApplication` — when a row with the same `job_url` exists AND its status is `SAVED` AND `input.status` is not `SAVED`, UPDATE that row in place instead of returning DUPLICATE: set every NewApplication field from `input`, `status` = input.status ?? 'APPLIED', `status_changed_at` = now, `follow_up_at` = datetime('now','+7 days') when the new status is APPLIED (same rule as insert), keep `notes` and `created_at`. Return the updated row. Any other existing row → err('DUPLICATE') as today. New export `findApplicationByUrl(db, jobUrl): Promise<Application | null>`.
  - `src/constants/testIds.ts`: `toolbar.save: 'toolbar-save'`.
  - `src/components/workspace/BrowserToolbar.tsx`: new props `saved: boolean`, `canSave: boolean`, `onSave: () => void`. IconButton between the address bar and reload: lucide `BookmarkPlus` (label "Save job for later") or `BookmarkCheck` when `saved` (label "Saved in Tracker"). Disabled when `!canSave`.
  - `src/app/(tabs)/index.tsx` (Workspace): `canSave` = current nav url is http(s) and not loading. `saved` = `findApplicationByUrl(currentUrl)` exists (re-check on url change and on screen focus). onSave: if it exists → snackbar `Already in Tracker`; else `insertApplication` with status `SAVED`, companyName = analysis.companyName if the copilot holds an analysis for this exact url, else the hostname without `www.`; roleTitle = analysis.roleTitle, else nav `title` trimmed to 120 chars, else `Saved job`; boardName = active board name or `Shared link`; resumeId null, resumeLabel '', matchScore null, eligibility null, redFlags [], coverNote null, coldDm null. Snackbar `Saved to Tracker`, light haptic. No AI call.
- Why: owner wants to keep several interesting jobs while browsing without spending an AI call per job; Log only worked after Analyze and set Applied.
- Impact: applicationsRepo tests (promote SAVED → APPLIED keeps notes/created_at; non-SAVED duplicate still DUPLICATE; findApplicationByUrl), BrowserToolbar tests, Workspace screen test. Insights already exclude SAVED. UI_DIRECTIVES toolbar line + snackbar table (architect updates docs).
- Approved by: owner

## D-008 2026-10-23: Analysis says when a page is not a job post
- Task: T-046c
- Change:
  - `src/types/domain.ts` `JobAnalysis`: add `isJobPosting: boolean`.
  - `src/services/ai/schemas.ts` `JOB_ANALYSIS_SCHEMA`: add `isJobPosting: { type: 'boolean', description: 'false for login or sign-up pages, search results or lists of several jobs, company home pages, articles' }` and put it in `required`.
  - `src/services/ai/validate.ts` `validateJobAnalysis`: boolean → keep; missing or not boolean → `true` (lenient for models that omit it).
  - `src/services/ai/prompts.ts` analysis prompt: add the rule "Set isJobPosting to false when the page is not one specific job posting (a login or sign-up page, a list or search results with several jobs, a company home page, an article). When false, use eligibility UNCLEAR, matchScore 0, empty redFlags, skills and fieldMappings."
  - `src/constants/testIds.ts`: `copilot.notJob: 'copilot-not-job'`.
  - `src/components/copilot/CopilotSheet.tsx` (+ a small `NotJobPostCard.tsx` in components/copilot): in the ready phase, when `analysis.isJobPosting === false`, render only the card (`copilot-not-job`, icon lucide `FileQuestion`): title `This doesn't look like a job post`, body `Open a single job and tap Analyze again. Login pages, search results and home pages can't be checked.` Footer actions (Auto-fill, Stage CV, Log) disabled. Re-analyze and Close stay. Improve (tailor) hidden.
  - Tailor/autofill/log code paths must not run for such an analysis (guard in useWorkspaceController).
- Why: on the owner's phone, Analyze on Wellfound's login page returned "Unclear" with a full result card, which looked like an error and wasted an AI call's worth of attention.
- Impact: validate tests (missing → true; false kept), prompt test, CopilotSheet test, contract test enum check unaffected. Mock server + fixtures: architect adds `e2e/fixtures/pages/not-a-job.html` and a mock response with `isJobPosting: false`.
- Approved by: owner

## D-007 2026-10-23: License GPL-3.0-or-later; third-party license list
- Task: T-046b (F6), T-049
- Change: `LICENSE` = the full GPL-3.0 text, with "GPL-3.0-or-later" stated in README. About shows `License: GPL-3.0-or-later` instead of "License: to be announced". New `LICENSES.md` at the repo root (About → "Open-source licenses" already links to it): one row per production dependency in package.json `dependencies` (name, version, license from its package.json in node_modules), generated by a one-off script `scripts/licenses.mjs` (plain Node, no new dependency) and committed.
- Why: owner chose GPL-3.0-or-later (resolves PLAN_REVIEW A-40). On device, the About link pointed at a LICENSES.md that did not exist.
- Impact: `src/app/settings/about.tsx` + its test, README license section, TASKS T-043 note.
- Approved by: owner (license), architect (details)

## D-006 2026-10-23: Backup export saves to a folder; Share is secondary
- Task: T-046b (F5)
- Change: `src/services/backup.ts`: `exportBackup(db)` now writes `jobify-backup-YYYY-MM-DD.json` (local date) into the Android SAF folder stored under `KV_KEYS.androidStagingDirUri` (the same Jobify folder Stage CV uses; a same-name file is deleted first). If no folder is stored, or writing fails with a permission error, it calls `StorageAccessFramework.requestDirectoryPermissionsAsync` (initial URI: Download) once, stores the granted URI under the same key, and retries once. Cancelled picker → `err('PERMISSION_DENIED')`. Return type becomes `Result<{ uri: string }, ExportError>` with `ExportError = 'DB_ERROR' | 'WRITE_FAILED' | 'SHARE_UNAVAILABLE' | 'PERMISSION_DENIED'`. On iOS `exportBackup` keeps the share-sheet behaviour. New `shareBackup(db): Promise<Result<{ uri: string }, ExportError>>` = the previous export (cache file + share sheet). `src/constants/testIds.ts`: add `backup.share: 'backup-share'`. `src/app/settings/backup.tsx`: primary "Export backup" → exportBackup; ghost "Share…" (`backup.share`) → shareBackup. Export card text adds: "Saves to your Jobify folder (for example Download/Jobify). The first time, Android asks you to pick it." Snackbars: ok `Backup saved to your Jobify folder.`; PERMISSION_DENIED `No folder chosen. The backup was not saved.`; WRITE_FAILED `Could not create the backup file.`; SHARE_UNAVAILABLE `Sharing is not available on this device.`
- Why: on the test phone (no Drive, no Gmail, typical for F-Droid users) the share sheet said "No apps can perform this action", so a backup could not be saved at all.
- Impact: backup tests (save path, folder re-prompt, cancel, share path; the key is still never in the JSON), ARCHITECTURE §6.6, UI_DIRECTIVES §6 copy table.
- Approved by: owner

## D-005 2026-10-23: Default Gemini model is gemini-3.5-flash-lite
- Task: T-046b (F4)
- Change: `src/services/ai/types.ts` `AI_DEFAULTS.gemini.model`: `gemini-3.8-flash` → `gemini-3.5-flash-lite`. Update any test or copy that names the old default (UI_DIRECTIVES hub subtitle example).
- Why: with a free-tier key on the test phone, `gemini-3.8-flash` timed out on the 15 s connection test; `gemini-3.5-flash-lite` answered (connection, PDF import and analysis all passed). The free tier is the common case for new users.
- Impact: tests that assert the default model.
- Approved by: owner

## D-004 2026-10-23: Gemini "API key not valid" (HTTP 400) maps to AUTH
- Task: T-046b (F1)
- Change: `src/services/ai/providers/gemini.ts` status mapping: an HTTP 400 whose JSON body has `error.status === 'INVALID_ARGUMENT'` and an `error.details[]` entry with `reason === 'API_KEY_INVALID'` → `{ code: 'AUTH', httpStatus: 400 }`. Any other 400 stays `BAD_REQUEST`. Update the contract comment that says "400 → BAD_REQUEST". Parse the body defensively (unknown → narrow); a body that is not JSON keeps BAD_REQUEST.
- Why: on device, a wrong Gemini key showed "Check the model name" (BAD_REQUEST). Google answers a bad key with HTTP 400 + reason API_KEY_INVALID, not 401/403. Real response body captured 2026-10-23: `{"error":{"code":400,"message":"API key not valid. Please pass a valid API key.","status":"INVALID_ARGUMENT","details":[{"@type":"type.googleapis.com/google.rpc.ErrorInfo","reason":"API_KEY_INVALID","domain":"googleapis.com"}]}}`
- Impact: gemini provider tests (add: 400+API_KEY_INVALID → AUTH; 400 other → BAD_REQUEST; 400 non-JSON → BAD_REQUEST). Mock server unchanged.
- Approved by: architect

## D-003 2026-10-23: Device-test fixes after M5 (round 2)
- Task: T-046b
- Change: the fixes listed in TASKS.md T-046b, found on the SM-G935F during the M5 device pass. Contract changes among them are D-004…D-007; the rest change behaviour inside existing files only.
- Why: see each item in T-046b.
- Approved by: architect

## D-002 2026-10-23: Public v1 (F-Droid, BYOK) replaces the personal v0 handoff
- Task: architect handoff v1
- Change: all contracts rewritten (PRODUCT_SPEC.md, PLAN_REVIEW.md A-01…A-41). New deps `expo-secure-store` 58.0.2, `expo-document-picker` 58.0.4, `expo-localization` 58.0.5, `expo-share-intent` 9.0.0. Removed hardcoded profile, bundled resumes, `EXPO_PUBLIC_*` env, and the Gemini-only service. App id `io.github.tawhidumar9.jobify`. Schema v1 redefined (nothing had shipped).
- Why: owner decided to publish on F-Droid with bring-your-own-key AI and the high-value features.
- Impact: every task renumbered (T-001…T-049). The old v0 tasks are void.
- Approved by: owner (direction), architect (details)

## D-001 2026-10-22: Baseline architecture (v0, personal)
- Superseded by D-002.
