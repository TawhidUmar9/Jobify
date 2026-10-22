# TASKS.md: Jobify v1

Do tasks **in order, one at a time** (AGENT_INSTRUCTIONS.md). Each fits one session. Every stub in `src/` carries `// TODO(T-0xx)`. Find them with `grep -rn "TODO(T-0xx)" src`.

**Every task's verification includes `npm run verify`** (typecheck + lint + all Jest tests). "Manual" checks run on one connected device or emulator with `npm run android` (**never raw gradle**; ARCHITECTURE §15). For AI-dependent manual checks use the mock server (`npm run mock:server`; TEST_PLAN §5).

**Files** = the only files you may create or edit, plus new tests in `src/<area>/__tests__/` (`*.dom.test.ts` for injected scripts). Need another file? BLOCKERS.md, then stop.

Milestones: **M0** baseline · **M1** data layer · **M2** AI layer · **M3** onboarding · **M4** vertical slice (analyze → log → tracker) · **M5** breadth · **M6** hardening and release.

---

## M0: Baseline

### T-001 Verify the skeleton runs
- **Goal:** toolchain, build, and stub app work before feature code.
- **Files:** none (BLOCKERS.md / DECISIONS.md only on failure).
- **Depends on:** none.
- **Acceptance:**
  - [x] `npm ci`, `npm run verify` (14 tests pass), `npm run doctor` (no issues).
  - [x] `npm run android` on one device/emulator: app launches. The stub onboarding gate shows the Welcome stub (`completed` is `false` in the stub provider). No red box. (2026-10-23, SM-G935F Android 14: launched, no errors; Welcome stub is black text on the dark background, expected until T-017)
  - [x] **Sheet check (A-28):** temporarily replace `src/app/onboarding/index.tsx` with the sheet-check screen in TESTING_ON_DEVICE.md §3 (a bare `@gorhom/bottom-sheet` at `index={0}`), run it, drag it up, then pan down to close with no red box. **Revert with `git checkout src/app/onboarding/index.tsx`.** On a crash, write B-001 in BLOCKERS.md and stop. (2026-10-23: drag up to 90% and pan-down close work with gesture-handler 3.3. Quirk: after a reload the sheet first sat at ~12% instead of 40%; see T-028.)
  - [x] `cd android && ./gradlew --stop` afterwards (frees RAM).
- **Verify:** `npm ci && npm run verify && npm run doctor && npm run android`

---

## M1: Data layer

### T-002 UI primitives I
- **Goal:** Button, IconButton, StateView, Snackbar per their doc comments.
- **Files:** `src/components/ui/{Button,IconButton,StateView,Snackbar}.tsx`, `src/components/ui/__tests__/primitives.test.tsx`.
- **Depends on:** T-001.
- **Acceptance:**
  - [x] Tokens only (no hex or raw sizes). Min heights 48 (Android) / 44 (iOS) via `Platform.select`.
  - [x] Disabled/loading Button never calls `onPress`. `accessibilityState` is correct.
  - [x] Snackbar: `show('a'); show('b')` shows only "b" and hides after 4000 ms (fake timers).
  - [x] StateView error announces its message on mount.
- **Verify:** `npm run verify && npx jest src/components/ui`

### T-003 UI primitives II (form controls)
- **Goal:** TextField, TagInput, ToggleRow, SegmentedControl, ListRow, ConfirmDialog.
- **Files:** `src/components/ui/{TextField,TagInput,ToggleRow,SegmentedControl,ListRow,ConfirmDialog}.tsx`, `src/components/ui/__tests__/formControls.test.tsx`.
- **Depends on:** T-002.
- **Acceptance:**
  - [x] TextField shows the label, helper, and error (error also in `accessibilityHint`). The secure toggle switches `secureTextEntry`.
  - [x] TagInput: trims, ignores empty and case-insensitive duplicates, respects `max`, `normalize` null → "Not valid", chip press removes. testIDs via `TestIds.tagInput.*`.
  - [x] SegmentedControl multi never deselects the last item. Roles radio/checkbox.
  - [x] ConfirmDialog: back = cancel. Destructive styling when `destructive`.
- **Verify:** `npm run verify && npx jest src/components/ui`

### T-004 Database migration and seeding
- **Goal:** `migrateDbIfNeeded`.
- **Files:** `src/db/migrate.ts`, `src/db/__tests__/migrate.test.ts`.
- **Depends on:** T-001.
- **Acceptance:**
  - [x] Steps 0–6 of the doc comment. Seeds use parameterised `runAsync`.
  - [x] fakeDb tests: fresh DB → `MIGRATION_V1` executed, 8 boards inserted, `user_version = 1`. Version 1 → no migration and no seeds.
- **Verify:** `npm run verify && npx jest src/db`

### T-005 Key-value store, secrets, AI config
- **Goal:** `kvStore.ts`, `secrets.ts`, `services/ai/config.ts`.
- **Files:** those 3 files, `src/services/__tests__/storage.test.ts`.
- **Depends on:** T-001.
- **Acceptance:**
  - [x] kv round-trip. Store errors → null / swallowed with `logger.warn(key only)`.
  - [x] `setApiKey('  k  ')` stores "k". `setApiKey('')` deletes. `getApiKey` never throws.
  - [x] `saveAiConfig` rejects a non-http base URL or empty model (returns false, nothing saved) and strips the trailing slash. `loadAiConfig` returns null for an unknown provider and fills defaults. `clearAiConfig` removes all 3 kv keys and the key.
  - [x] A test asserts the API key value never appears in any `logger` call.
- **Verify:** `npm run verify && npx jest src/services`

### T-006 Profile and preferences (normalizers + repo)
- **Goal:** `normalizeProfile`, `normalizePreferences`, and `profileRepo`.
- **Files:** `src/lib/normalize.ts`, `src/db/repositories/profileRepo.ts`, `src/lib/__tests__/normalize.test.ts`, `src/db/repositories/__tests__/profileRepo.test.ts`.
- **Depends on:** T-004.
- **Acceptance:**
  - [x] Each normalizer rule has a test (null, wrong types, limits, de-dup, the `javascript:` link dropped, country code upper-cased, workModes empty → REMOTE, overlap clamp, salary ≤0 → null).
  - [x] Upsert SQL is `INSERT … ON CONFLICT(id) DO UPDATE`. `getPreferences` with no row → `DEFAULT_PREFERENCES`.
- **Verify:** `npm run verify && npx jest src/lib src/db`

### T-007 Resumes repository
- **Goal:** `resumesRepo.ts` (all functions).
- **Files:** `src/db/repositories/resumesRepo.ts`, `src/db/repositories/__tests__/resumesRepo.test.ts`.
- **Depends on:** T-004.
- **Acceptance:**
  - [x] label rules (EMPTY_LABEL / DUPLICATE_LABEL, case-insensitive). Bad content JSON → empty content. `setResumeFile` updates both columns. Ordering per doc.
- **Verify:** `npm run verify && npx jest src/db`

### T-008 Job boards repository
- **Goal:** `boardsRepo.ts` except `updateLastVisitedUrl`.
- **Files:** `src/db/repositories/boardsRepo.ts`, `src/db/repositories/__tests__/boardsRepo.test.ts`.
- **Depends on:** T-004.
- **Acceptance:**
  - [x] name 1–16. https required except `http://10.0.2.2`, `localhost`, and private LAN IPs (10.x, 192.168.x, 172.16–31.x). Delete and reorder renumber contiguously in one transaction. Changing the URL clears `last_visited_url`.
- **Verify:** `npm run verify && npx jest src/db`

### T-009 Answers repository
- **Goal:** `answersRepo.ts` except `incrementAnswerUse`.
- **Files:** `src/db/repositories/answersRepo.ts`, test.
- **Depends on:** T-004.
- **Acceptance:**
  - [x] upsert matches the question case-insensitively after collapsing whitespace ("What is your  notice period?" updates "what is your notice period?"). Length limits → EMPTY/TOO_LONG. Ordering `use_count DESC, updated_at DESC`.
- **Verify:** `npm run verify && npx jest src/db`

### T-010 Applications repository
- **Goal:** `insertApplication`, `listApplications`, `getApplication`, `listFollowUpsDue`.
- **Files:** `src/db/repositories/applicationsRepo.ts` (those 4 functions), test.
- **Depends on:** T-004.
- **Acceptance:**
  - [x] DUPLICATE by `job_url` (pre-check, and the UNIQUE violation also maps to DUPLICATE). Score clamp/round. `red_flags_json` round-trip. APPLIED → `follow_up_at = datetime('now','+7 days')`, SAVED → NULL. Rows with unknown status/eligibility are skipped. Follow-ups: only APPLIED/INTERVIEWING with `follow_up_at <= now`, ascending.
- **Verify:** `npm run verify && npx jest src/db`

### T-011 Insights repository
- **Goal:** `getInsights`.
- **Files:** `src/db/repositories/insightsRepo.ts`, test.
- **Depends on:** T-010.
- **Acceptance:**
  - [x] SQL aggregates only. byResume/byBoard exclude SAVED, '' → "No resume", max 10, sorted. 8 zero-filled Monday-start UTC weeks, oldest first (test with a fixed `now`). Response/interview definitions per `domain.ts`.
- **Verify:** `npm run verify && npx jest src/db`

---

## M2: AI layer

### T-012 Schemas, Gemini schema converter, validators
- **Goal:** `toGeminiSchema`, `validateJobAnalysis`, `validateTailor`, `validateResumeParse`.
- **Files:** `src/services/ai/{geminiSchema,validate}.ts`, `src/services/ai/__tests__/{geminiSchema,validate}.test.ts`, `src/lib/url.ts` (`isHttpUrl` only if T-024 is not done yet; then T-024 adds tests).
- **Depends on:** T-001.
- **Acceptance (fixtures in `e2e/fixtures/ai/`, scraped inputs = the 5 from T-022's fixture expectations: `jobify-field-0..4`):**
  - [x] `toGeminiSchema(JOB_ANALYSIS_SCHEMA)` has upper-case types at every depth and the same required/enum arrays.
  - [x] `analysis-remote-ok.json` with resumes `[{id:1}]` → 5 mappings (field-99 and the duplicate field-0 dropped), field-4 source GENERATED (invalid → GENERATED), red flags `[NO_SALARY_INFO, OTHER("Unknown codes must become OTHER.")]` (empty detail dropped), score 92, resume 1.
  - [x] `analysis-not-eligible.json` with resumes `[{id:1},{id:2}]` → score 100, resume 1 (999 unknown → first), matchedSkills `["React","Next.js","TypeScript"]`.
  - [x] `analysis-unclear.json` with no resumes → "Unknown company", "Unknown role", UNCLEAR, score 56, resume null.
  - [x] `tailor.json` → 1 bullet rewrite (empty original dropped), 3 emphasize. `resume-parse.json` → 2 links (javascript: dropped), 1 experience, 3 highlights.
  - [x] Non-object, missing score, and non-array fieldMappings → SCHEMA_MISMATCH. Validators never throw on any of `[null, 1, "x", [], {}]`.
- **Verify:** `npm run verify && npx jest src/services/ai`

### T-013 Prompts
- **Goal:** `buildAnalyzePrompt`, `buildTailorPrompt`, `buildResumeParsePrompt`.
- **Files:** `src/services/ai/prompts.ts`, `src/services/ai/__tests__/prompts.test.ts`.
- **Depends on:** T-012.
- **Acceptance:**
  - [x] numbered rules verbatim (`toContain` each). Snapshot with a fixed `today` (2026-10-22) and the Alex profile. Answers capped at 40 (most-used first, as given). User content keys are exactly `url,title,pageText,inputs`. Pasted text is trimmed and capped at 30 000.
- **Verify:** `npm run verify && npx jest src/services/ai`

### T-014 Gemini provider
- **Goal:** `createGeminiProvider`.
- **Files:** `src/services/ai/providers/gemini.ts`, `src/services/ai/__tests__/gemini.test.ts`.
- **Depends on:** T-012.
- **Acceptance:**
  - [x] exact URL/headers/body (assert via `fetchImpl` mock). The key is never in the URL. PDF part is placed before text. One test per error row (ARCHITECTURE §5.4; TIMEOUT with fake timers). `thought` parts are ignored. Caller abort re-throws AbortError. No logger call contains the key or prompts.
- **Verify:** `npm run verify && npx jest src/services/ai`

### T-015 OpenAI-compatible provider
- **Goal:** `createOpenAiCompatibleProvider`.
- **Files:** `src/services/ai/providers/openaiCompatible.ts`, test.
- **Depends on:** T-012.
- **Acceptance:**
  - [x] body shape. No Authorization header for an empty key. 400 → exactly one retry with `json_object` + the schema in system; second 400 → BAD_REQUEST. Fence stripping. `content_filter` → BLOCKED. PDF → PDF_NOT_SUPPORTED with no fetch. Empty model → NOT_CONFIGURED with no fetch. Shared error rows.
- **Verify:** `npm run verify && npx jest src/services/ai`

### T-016 AI client
- **Goal:** `createProvider`, `testConnection`, `parseResume`, `analyzeJob`, `tailorApplication`.
- **Files:** `src/services/ai/aiClient.ts`, test.
- **Depends on:** T-013, T-014, T-015.
- **Acceptance:**
  - [x] null-provider rules. Each call passes the right schema, schemaName, and timeout. Validator failure → SCHEMA_MISMATCH. PDF with openai_compatible → PDF_NOT_SUPPORTED with no request.
- **Integration check:** start `npm run mock:server`, then `npx jest src/services/ai/__tests__/aiClient.integration.test.ts` (you write it: real `fetch` against `http://localhost:8787` for both providers; skip with a clear message when `/health` is unreachable).
- **Verify:** `npm run verify && npx jest src/services/ai`

---

## M3: Onboarding

### T-017 Onboarding gate and welcome
- **Goal:** `OnboardingStatusProvider` and the Welcome screen (without restore, which is T-042).
- **Files:** `src/features/onboarding/useOnboardingStatus.tsx`, `src/app/onboarding/index.tsx`, tests.
- **Depends on:** T-002, T-005.
- **Acceptance:**
  - [x] `completed` is null until kv is read. `markCompleted` persists.
  - [x] A fresh install opens Welcome (`completed` false). With `onboardingCompleted = "1"` the tabs open (`completed` true).
  - [x] "Restore from backup" is rendered but disabled with caption "Available after setup" until T-042.
- **Manual:**
  - [x] `adb shell pm clear io.github.tawhidumar9.jobify` → Welcome appears. (passed 2026-10-23 on SM-G935F)
- **Verify:** `npm run verify && npx jest src/features/onboarding`

### T-018 AI provider step
- **Goal:** `useAiSettings`, `AiSettingsForm`, `/onboarding/ai`.
- **Files:** `src/features/settings/useAiSettings.ts`, `src/components/forms/AiSettingsForm.tsx`, `src/app/onboarding/ai.tsx`, tests.
- **Depends on:** T-003, T-016, T-017.
- **Acceptance:**
  - [x] provider switch resets model/baseUrl and keeps the key. Test connection shows "Connected" or the exact error copy.
  - [x] Continue saves (the test is not required). Skip saves nothing. Field errors per the hook doc. The key field is secure with a show/hide toggle.
- **Manual (mock):**
  - [x] OpenAI-compatible, base `http://10.0.2.2:8787/v1`, model `mock`, key `k` → Test → "Connected". (passed 2026-10-23 on SM-G935F)
- **Verify:** `npm run verify && npx jest src/features/settings src/components/forms`

### T-019 Profile step and resume import
- **Goal:** `useProfileData` (load + saveProfile), `useResumeImport`, `resumeFiles.ts` (except delete), `ProfileForm` + `validateProfile`, `/onboarding/profile`.
- **Files:** `src/features/settings/useProfileData.ts`, `src/features/onboarding/useResumeImport.ts`, `src/services/resumeFiles.ts`, `src/components/forms/ProfileForm.tsx`, `src/app/onboarding/profile.tsx`, tests.
- **Depends on:** T-006, T-007, T-016, T-018.
- **Acceptance:**
  - [x] pick errors map to copy. Import PDF is hidden for openai_compatible or when AI is skipped. Paste text works with any configured provider.
  - [x] The merge never overwrites non-empty fields. Time zone and country default from expo-localization. Continue blocked with field errors.
- **Manual (mock, Gemini base URL `http://10.0.2.2:8787`):**
  - [x] paste `e2e/fixtures/resume-alex-rahman.txt` → the form shows Alex Rahman. Import `resume-alex-rahman.pdf` (push it with `adb push e2e/fixtures/resume-alex-rahman.pdf /sdcard/Download/`) → the resume is stored with a file. (passed 2026-10-23 on SM-G935F)
- **Verify:** `npm run verify && npx jest src/features src/services src/components/forms`

### T-020 Preferences step and finish
- **Goal:** `PreferencesForm`, `savePreferences`, `/onboarding/preferences`.
- **Files:** `src/components/forms/PreferencesForm.tsx`, `src/features/settings/useProfileData.ts` (savePreferences), `src/app/onboarding/preferences.tsx`, tests.
- **Depends on:** T-019.
- **Acceptance:**
  - [x] all fields per the doc. Countries normalize to upper-case 2 letters. Finish → `markCompleted` → tabs (Workspace).
- **Manual:**
  - [x] a full onboarding run on a device lands in Workspace with the 8 board pills (after T-023; before T-023, the stub screen). (passed 2026-10-23 on SM-G935F)
- **Verify:** `npm run verify && npx jest src/components/forms src/features`

---

## M4: Vertical slice

### T-021 Bridge message parser
- **Goal:** `parseBridgeMessage`.
- **Files:** `src/bridge/messages.ts` (function only), `src/bridge/__tests__/messages.test.ts`.
- **Depends on:** T-001.
- **Acceptance:**
  - [x] doc-comment rules. Valid example per type → ok. `"{"` → INVALID_JSON. Unknown type → UNKNOWN_TYPE. Wrong field types → INVALID_SHAPE. 20 000 chars → 12 000, 100 inputs → 80. Never throws on `null`, `1`, or `[]`.
- **Verify:** `npm run verify && npx jest src/bridge`

### T-022 Scraper script
- **Goal:** `SCRAPE_PAGE_JS`.
- **Files:** `src/bridge/scrapePageScript.ts`, `src/bridge/__tests__/scrapePageScript.dom.test.ts` (use `tests/helpers/dom.ts`).
- **Depends on:** T-021.
- **Reference implementation** (verified against the fixture on 2026-10-22; use `String.raw`):
```ts
export const SCRAPE_PAGE_JS = String.raw`
(function () {
  try {
    var EXCLUDED = ['hidden','file','submit','button','image','reset','checkbox','radio','password'];
    var clean = function (s, max) { return String(s || '').replace(/\s+/g, ' ').trim().slice(0, max); };
    var prev = document.querySelectorAll('[data-jobify-id]');
    for (var p = 0; p < prev.length; p++) prev[p].removeAttribute('data-jobify-id');
    var pageText = document.body ? clean(document.body.innerText, 12000) : '';
    var all = document.querySelectorAll('input, textarea, select');
    var kept = [];
    for (var i = 0; i < all.length && kept.length < 80; i++) {
      var el = all[i];
      var tag = el.tagName.toLowerCase();
      var type = tag === 'input' ? String(el.getAttribute('type') || 'text').toLowerCase()
               : (tag === 'select' ? 'select-one' : 'textarea');
      if (tag === 'input' && EXCLUDED.indexOf(type) !== -1) continue;
      if (el.disabled || el.readOnly) continue;
      var style = window.getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden') continue;
      kept.push({ el: el, tag: tag, type: type });
    }
    var inputs = kept.map(function (k, index) {
      var el = k.el;
      var clawId = 'jobify-field-' + index;
      el.setAttribute('data-jobify-id', clawId);
      var label = '';
      if (el.labels && el.labels.length) label = el.labels[0].innerText;
      if (!label) {
        var ids = el.getAttribute('aria-labelledby');
        if (ids) label = ids.split(/\s+/).map(function (id) {
          var n = document.getElementById(id); return n ? n.innerText : '';
        }).join(' ');
      }
      var item = {
        clawId: clawId, tag: k.tag, type: k.type,
        name: el.getAttribute('name') || '', id: el.id || '',
        placeholder: el.getAttribute('placeholder') || '',
        ariaLabel: el.getAttribute('aria-label') || '',
        label: clean(label, 120)
      };
      if (k.tag === 'select') {
        item.options = Array.prototype.slice.call(el.options, 0, 50).map(function (o) {
          return { value: String(o.value), text: clean(o.text, 80) };
        });
      }
      return item;
    });
    window.ReactNativeWebView.postMessage(JSON.stringify({
      type: 'PAGE_SCRAPED', url: window.location.href, title: document.title,
      pageText: pageText, inputs: inputs
    }));
  } catch (err) {
    window.ReactNativeWebView.postMessage(JSON.stringify({
      type: 'SCRAPE_ERROR', error: String(err && err.message)
    }));
  }
})();
true;
`;
```
- **Acceptance (load `e2e/fixtures/pages/job-remote-form.html` into jsdom):**
  - [x] exactly 5 inputs (full_name, email, portfolio with ariaLabel "Portfolio URL", textarea labelled "Why Acme Cloud?", select with 4 options). Password, hidden, checkbox, file, display:none, and disabled are excluded. clawIds `jobify-field-0..4`. A second run clears stale attributes. 80/12 000 caps. SCRAPE_ERROR on throw. Ends with `true;`. Output passes `parseBridgeMessage`.
- **Verify:** `npm run verify && npx jest --selectProjects dom`

### T-023 Board bar and `useBoards` (load/select/reload)
- **Goal:** BoardBar, BoardPill, and `useBoards` mount/select/reload/focus.
- **Files:** `src/components/workspace/{BoardBar,BoardPill}.tsx`, `src/features/workspace/useBoards.ts`, tests.
- **Depends on:** T-002, T-005, T-008.
- **Acceptance:**
  - [x] first launch selects LinkedIn (sort 0). Selecting persists `activeBoardId`, and a relaunch keeps it. Re-tapping the active pill loads its base URL. Focus reload picks up Settings changes. A deleted active board → first board. Pill roles and labels per doc.
- **Verify:** `npm run verify && npx jest src/components/workspace src/features/workspace`

### T-024 PortalWebView base and `isHttpUrl`
- **Goal:** T-024 rows of ARCHITECTURE §6.1, and `isHttpUrl`.
- **Files:** `src/components/workspace/PortalWebView.tsx`, `src/lib/url.ts` (`isHttpUrl`), `src/lib/__tests__/url.test.ts`.
- **Depends on:** T-001.
- **Acceptance:**
  - [x] props per table (platform-specific ones only on their platform). `isHttpUrl` true for https and `http://10.0.2.2:8787/x`, false for `mailto:`, `javascript:`, `''`, `null`, and plain text.
- **Manual (A-20):**
  - [ ] log in to one board, force-stop, relaunch → still logged in. MANUAL PENDING (needs internet on the test phone)
- **Verify:** `npm run verify && npx jest src/lib`

### T-025 Workspace composition, deep link, share intent
- **Goal:** Workspace screen states, the `url` param, `useBoards.openUrl`, `useIncomingShare`, and the `normalizeAddressInput`/`extractFirstUrl` helpers.
- **Files:** `src/app/(tabs)/index.tsx`, `src/features/workspace/useBoards.ts` (openUrl), `src/features/share/useIncomingShare.ts`, `src/lib/url.ts` (2 helpers), tests.
- **Depends on:** T-020, T-023, T-024.
- **Acceptance:**
  - [x] loading/empty/error states with copy. `jobify:///?url=<encoded>` opens the page (activeBoard null; param cleared after use). `javascript:` is ignored. A share of "Look https://x.y/z." opens `https://x.y/z`. A share with no URL → snackbar. Before onboarding, the share is ignored. Helper unit tests per doc examples.
- **Manual:**
  - [x] `adb shell am start -a android.intent.action.VIEW -d "jobify:///?url=http%3A%2F%2F10.0.2.2%3A8787%2Ffixtures%2Fjob-remote-form.html"` opens the fixture. (passed 2026-10-23 on SM-G935F)
  - [x] `adb shell am start -a android.intent.action.SEND -t text/plain --es android.intent.extra.TEXT "Apply http://10.0.2.2:8787/fixtures/job-local-only.html" io.github.tawhidumar9.jobify` opens it. (passed 2026-10-23 on SM-G935F)
- **Verify:** `npm run verify && npx jest src/lib src/features`

### T-026 Workspace reducer
- **Goal:** `workspaceReducer` per its transition table.
- **Files:** `src/features/workspace/workspaceReducer.ts` (function only), test.
- **Depends on:** T-001.
- **Acceptance:**
  - [x] one test per table row, including the tailor sub-state and ANSWER_SAVED de-dup. Unlisted action → same reference (test every phase). 199 vs 200 chars boundary.
- **Verify:** `npm run verify && npx jest src/features/workspace`

### T-027 Controller: scrape, analyze, close, context
- **Goal:** controller parts listed under TODO(T-027).
- **Files:** `src/features/workspace/useWorkspaceController.ts`, test.
- **Depends on:** T-016, T-021, T-022, T-025, T-026, T-006, T-007, T-009.
- **Acceptance (fake timers, mocked aiClient):**
  - [x] AI config loaded on mount and focus (`aiMissing`). No AI → `onAnalyzePress` navigates to `/settings/ai`. Inject on press. 5 s timeout → SCRAPE TIMEOUT. Out-of-phase messages ignored. No profile → NO_PROFILE. Success → ready with `boardName` and `pageText`. Close during analyze aborts. contextKey change resets.
- **Verify:** `npm run verify && npx jest src/features/workspace`

### T-028 Analyze FAB and copilot sheet shell
- **Goal:** AnalyzeFab and CopilotSheet header/backdrop/loading/error bodies (ready body renders the T-029 stubs).
- **Files:** `src/components/workspace/AnalyzeFab.tsx`, `src/components/copilot/CopilotSheet.tsx`, `src/app/(tabs)/index.tsx` (`onOpenSettings` → `router.push`), tests.
- **Depends on:** T-027.
- **Acceptance:**
  - [x] FAB variants (Analyze / Analyzing… / Set up AI). Error copy exact for every error kind (UI_DIRECTIVES §4.4), including the "Open profile" / "Open AI settings" actions. Re-analyze disabled while busy.
- **Manual (mock):**
  - [x] deep-link `job-error-429.html`, Analyze → "Rate limit reached. Wait a minute and try again." (passed 2026-10-23 on SM-G935F)
- **Sheet position (A-28 quirk from T-001):**
  - [x] open the sheet 5 times, including right after a reload. It must land at 50% every time. If it lands lower, call `snapToIndex(0)` after the sheet's first `onLayout` / in `onAnimate`, and note it in DECISIONS.md. The dev-only Reanimated warning "Dependencies should only be used on the web" comes from @gorhom/bottom-sheet and is harmless. (passed 2026-10-23 on SM-G935F)
- **Verify:** `npm run verify && npx jest src/components`

### T-029 Result cards
- **Goal:** EligibilityBadge, RedFlagList, MatchCard, SkillChips, `displayHost`.
- **Files:** those 4 components, `src/lib/url.ts` (`displayHost`), tests.
- **Depends on:** T-028.
- **Acceptance:**
  - [x] labels, tones, and icons per presentation maps. "No red flags found" empty state. Match accessibility label. Null resume copy. `displayHost('https://www.wellfound.com/jobs')` → `wellfound.com`.
- **Verify:** `npm run verify && npx jest src/components src/lib`

### T-030 Log application
- **Goal:** `logApplication` + CopilotActions layout (Log wired; Auto-fill and Stage CV still no-ops) + sheet footer.
- **Files:** `useWorkspaceController.ts`, `CopilotActions.tsx`, `CopilotSheet.tsx`, tests.
- **Depends on:** T-010, T-029.
- **Acceptance:**
  - [x] column mapping per ARCHITECTURE §7.3. Snackbars for ok/duplicate/error. Button → "Logged" (disabled). Haptics success.
- **Verify:** `npm run verify && npx jest src/features/workspace src/components/copilot`

### T-031 Tracker list and follow-ups
- **Goal:** `useApplications`, ApplicationRow, StatusChip, FollowUpsSection, Tracker screen (Insights button navigates; the screen comes in T-038).
- **Files:** `src/features/tracker/useApplications.ts`, `src/components/tracker/{ApplicationRow,StatusChip,FollowUpsSection}.tsx`, `src/app/(tabs)/tracker.tsx`, tests.
- **Depends on:** T-010, T-002.
- **Acceptance:**
  - [x] all states. Reload on focus without flashing. Pull to refresh. Follow-ups section shows due items (fake `now`), max 5 + "+N more below". Date "12 Oct 2026" from `"2026-10-12 08:00:00"`.
- **Verify:** `npm run verify && npx jest src/features/tracker src/components/tracker`

### ✅ Gate M4: vertical slice (manual, ~5 min, mock server)
1. `npm run mock:server`. `adb shell pm clear io.github.tawhidumar9.jobify`. `npm run android`.
2. Onboarding: OpenAI-compatible, base `http://10.0.2.2:8787/v1`, model `mock`, key `k`, Continue. Paste the resume text → Continue. Preferences: Remote, country BD → Finish.
3. Deep-link `job-remote-form.html` → Analyze → green "You can apply", "No salary listed" flag, 92, resume "Main".
4. Log → "Logged to Tracker". Tracker shows "Senior Backend Engineer · Acme Cloud · Shared link · Applied".
5. `npm run verify` green. `cd android && ./gradlew --stop`.

**Result 2026-10-23: PASSED** on a physical phone (SM-G935F, Android 14, dark mode). On a physical phone, skip `npm run android` if the installed debug build has no native changes. Run `npx expo start --dev-client`, then `adb reverse tcp:8081 tcp:8081` and `adb reverse tcp:8787 tcp:8787`, and use `http://localhost:8787` wherever these steps say `http://10.0.2.2:8787`. Fixed during the gate: the board bar grew to half the screen (ScrollView `flexGrow`), the copilot sheet and footer ignored the dark theme, and Tracker dates read SQLite's UTC stamps as local (`src/lib/dates.ts`).

---

## M5: Breadth

### T-032 Auto-fill script
- **Goal:** `buildAutoFillScript`.
- **Files:** `src/bridge/autoFillScript.ts`, `src/bridge/__tests__/autoFillScript.dom.test.ts`.
- **Depends on:** T-022.
- **Reference implementation** (verified; `FieldMapping` now also has `source` and `fieldLabel`, and the payload keeps only `clawId` and `value`):
```ts
export function buildAutoFillScript(fieldMappings: FieldMapping[]): string {
  const payload = JSON.stringify(fieldMappings.map((m) => ({ clawId: m.clawId, value: m.value })));
  return `
(function () {
  try {
    var mappings = ${payload};
    var filledCount = 0;
    var missingClawIds = [];
    var setNative = function (el, proto, value) {
      var d = Object.getOwnPropertyDescriptor(proto, 'value');
      if (d && d.set) { d.set.call(el, value); } else { el.value = value; }
    };
    var fire = function (el, names) {
      names.forEach(function (n) { el.dispatchEvent(new Event(n, { bubbles: true })); });
    };
    mappings.forEach(function (m) {
      if (!m || typeof m.value !== 'string' || m.value === '') return;
      try {
        var el = document.querySelector('[data-jobify-id="' + m.clawId + '"]');
        if (!el) { missingClawIds.push(m.clawId); return; }
        if (el.tagName === 'SELECT') {
          var match = null;
          var want = m.value.trim().toLowerCase();
          for (var i = 0; i < el.options.length && match === null; i++) {
            if (el.options[i].value === m.value) match = el.options[i].value;
          }
          for (var j = 0; j < el.options.length && match === null; j++) {
            if (el.options[j].text.trim().toLowerCase() === want) match = el.options[j].value;
          }
          if (match === null) { missingClawIds.push(m.clawId); return; }
          setNative(el, window.HTMLSelectElement.prototype, match);
          fire(el, ['input', 'change']);
        } else {
          if (typeof el.focus === 'function') el.focus();
          var proto = el.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
          setNative(el, proto, m.value);
          fire(el, ['input', 'change', 'blur']);
        }
        el.style.outline = '2px solid #10b981';
        filledCount++;
      } catch (e) {
        missingClawIds.push(m.clawId);
      }
    });
    window.ReactNativeWebView.postMessage(JSON.stringify({
      type: 'AUTOFILL_COMPLETE', filledCount: filledCount, missingClawIds: missingClawIds
    }));
  } catch (err) {
    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'AUTOFILL_ERROR', error: String(err && err.message) }));
  }
})();
true;
`;
}
```
- **Acceptance:**
  - [x] (jsdom: fixture → run the fixture's inline script via `runInjectedScript` → scraper → fill with the 5 validated mappings from T-012): `{filledCount: 5, missingClawIds: []}`. `#state` contains `name=Alex Rahman`, `email=alex.rahman@example.com`, and `years=3-5`. Unknown clawId → missing. Select by option text "6+ years" → `6+`. "ten" → missing. A textarea value with quotes, a backslash, `</script>`, and a newline is written verbatim.
- **Verify:** `npm run verify && npx jest --selectProjects dom`

### T-033 Auto-fill action, field list, save to answer bank
- **Goal:** `autoFill`, AUTOFILL_* handling, `saveAnswer`, `incrementAnswerUse`, FieldMappingList, and the enabled Auto-fill button.
- **Files:** `useWorkspaceController.ts`, `src/db/repositories/answersRepo.ts` (`incrementAnswerUse`), `FieldMappingList.tsx`, `CopilotActions.tsx`, `CopilotSheet.tsx`, tests.
- **Depends on:** T-030, T-032, T-009.
- **Acceptance:**
  - [x] `canAutoFill` rule. Stale notice. Snackbar `Filled X of Y fields`. 5 s timeout → failure snackbar. Source badges. "Save to answers" on GENERATED rows → upsert + "Saved". ANSWER_BANK mappings increment use counts after a fill.
  - [ ] **Manual (mock):** fixture page → Auto-fill → 5 green outlines. The page's "state:" line shows the values. Save the "Why Acme Cloud?" draft → it appears in Settings → Answer bank after T-041. MANUAL PENDING (device)
- **Verify:** `npm run verify && npx jest src/features/workspace src/components/copilot src/db`

### T-034 Improve my application (tailor) + copy
- **Goal:** `tailor`, `copyText`, TailorCard, `attachTailorText`.
- **Files:** `useWorkspaceController.ts`, `TailorCard.tsx`, `CopilotSheet.tsx`, `applicationsRepo.ts` (`attachTailorText`), tests.
- **Depends on:** T-033.
- **Acceptance:**
  - [x] idle/loading/error/ready UI. Copy → clipboard + "Copied". Tailoring after logging stores the cover note and DM. Closing the sheet during loading resets to idle (no late result).
- **Verify:** `npm run verify && npx jest src/features/workspace src/components/copilot src/db`

### T-035 Resume staging service
- **Goal:** `stageResume` per its doc.
- **Files:** `src/services/resumeStaging.ts`, test.
- **Depends on:** T-005, T-019.
- **Acceptance:**
  - [x] mocks for `expo-file-system(/legacy)`, `expo-sharing`, and Platform. Cases: NO_FILE, FILE_MISSING, Android first run, permission denied, stored-URI failure → re-prompt, second failure, iOS share/unavailable, clipboard first and its failure non-fatal, fileName fallback `${label}.pdf`.
- **Verify:** `npm run verify && npx jest src/services`

### T-036 Stage CV action and explainer
- **Goal:** `stageRecommendedResume`, StagingExplainer, and the Stage CV button.
- **Files:** `useWorkspaceController.ts`, `StagingExplainer.tsx`, `CopilotActions.tsx`, tests.
- **Depends on:** T-034, T-035.
- **Acceptance:**
  - [x] explainer on first Android use only. Cancel stores nothing. Snackbars per UI_DIRECTIVES §6. No resume → "Add a resume in Settings first".
- **Manual:**
  - [ ] Android: create `Download/Jobify`. Stage twice → exactly one file with that name. In Chrome on the device, a file input shows it first under Recent. MANUAL PENDING (device)
- **Verify:** `npm run verify && npx jest src/features/workspace src/components/copilot`

### T-037 Application detail, status, follow-up, notes, delete
- **Goal:** `useApplication`, `patchApplication`, `deleteApplication`, StatusPicker, FollowUpPicker + `followUpAtFromOption`, and the detail screen.
- **Files:** `src/features/tracker/useApplication.ts`, `applicationsRepo.ts` (patch/delete), `src/components/tracker/{StatusPicker,FollowUpPicker}.tsx`, `src/app/application/[id].tsx`, tests.
- **Depends on:** T-031, T-029.
- **Acceptance:** not_found for `abc`, `0`, `-1`, and `999`. Status change sets `status_changed_at`, and OFFER/REJECTED/WITHDRAWN clear the reminder. Follow-up options compute UTC +N days (fixed `now`). Notes ≤5000. Delete confirms then navigates back. All snackbars. Open job post navigates with the `url` param.
- **Verify:** `npm run verify && npx jest src/features/tracker src/components/tracker src/db`

### T-038 Insights screen
- **Goal:** `useInsights`, StatTile, RateTable, WeeklyBars, `/insights`.
- **Files:** `src/features/insights/useInsights.ts`, `src/components/insights/*.tsx`, `src/app/insights.tsx`, tests.
- **Depends on:** T-011, T-031.
- **Acceptance:** empty state at total 0. Percentages rounded. "Too few to compare" under 3. Weekly accessibility label lists all weeks. "–" when applied is 0.
- **Verify:** `npm run verify && npx jest src/features/insights src/components/insights`

### T-039 Settings hub, AI, profile, preferences, resumes
- **Goal:** the hub subtitles and the screens `settings/ai`, `profile`, `preferences`, `resumes`, `resume/[id]`, plus ResumeContentForm and `deleteResumePdf`.
- **Files:** `src/app/(tabs)/settings-hub.tsx`, `src/app/settings/{ai,profile,preferences,resumes}.tsx`, `src/app/settings/resume/[id].tsx`, `src/components/forms/ResumeContentForm.tsx`, `src/services/resumeFiles.ts` (`deleteResumePdf`), tests.
- **Depends on:** T-018, T-019, T-020.
- **Acceptance:** subtitles reflect the data. Remove AI → AI missing in Workspace (FAB "Set up AI"). Unsaved-changes confirm on back. Deleting a resume removes the file and sets applications' `resume_id` to NULL (their `resume_label` is kept). New imports never overwrite the profile.
- **Verify:** `npm run verify && npx jest src/app src/components/forms src/services`

### T-040 Settings: job boards
- **Goal:** BoardForm + `settings/boards`.
- **Files:** `src/components/forms/BoardForm.tsx`, `src/app/settings/boards.tsx`, tests.
- **Depends on:** T-008, T-003.
- **Acceptance:** add/edit (URL normalized; errors per doc), move up/down (ends disabled), delete with confirm. Workspace reflects the changes on focus.
- **Verify:** `npm run verify && npx jest src/app src/components/forms`

### T-041 Settings: answer bank
- **Goal:** AnswerForm + `settings/answers`.
- **Files:** `src/components/forms/AnswerForm.tsx`, `src/app/settings/answers.tsx`, tests.
- **Depends on:** T-009, T-003.
- **Acceptance:** empty state copy, add/edit/delete, counter, use count shown.
- **Verify:** `npm run verify && npx jest src/app src/components/forms`

### T-042 Backup export/import
- **Goal:** `backup.ts`, `settings/backup`, and enabling "Restore from backup" on Welcome.
- **Files:** `src/services/backup.ts`, `src/app/settings/backup.tsx`, `src/app/onboarding/index.tsx`, tests.
- **Depends on:** T-006 to T-011, T-017.
- **Acceptance:** export → import round-trip on a fakeDb restores equal data (apart from IDs, `fileUri` → null, and resume relinking by label). The key is never present (assert on the JSON string). Wrong format, newer version, and unreadable each give the right error. Import marks onboarding completed. One transaction (a failure leaves data unchanged).
- **Verify:** `npm run verify && npx jest src/services src/app`

### T-043 About screen
- **Goal:** `settings/about`.
- **Files:** `src/app/settings/about.tsx`, test.
- **Depends on:** T-039.
- **Acceptance:** version from expo-constants, the privacy statement verbatim, source link from `extra.repositoryUrl`, license name (from A-40 once chosen; until then "License: to be announced").
- **Verify:** `npm run verify && npx jest src/app`

### T-044 Browser toolbar, address bar, Android back
- **Goal:** BrowserToolbar per doc, and BackHandler in Workspace.
- **Files:** `src/components/workspace/BrowserToolbar.tsx`, `src/app/(tabs)/index.tsx`, tests.
- **Depends on:** T-025, T-028.
- **Acceptance:** Back/Forward enabled per nav state. Host text and address bar flow (`normalizeAddressInput`; invalid → inline error). Progress bar. Hardware back: sheet → close; canGoBack → goBack; else default (only while Workspace is focused).
- **Verify:** `npm run verify && npx jest src/components/workspace`

### T-045 Remember last page per board
- **Goal:** `updateLastVisitedUrl`, `recordVisit`, and restoring `lastVisitedUrl`.
- **Files:** `boardsRepo.ts`, `useBoards.ts`, `src/app/(tabs)/index.tsx`, tests.
- **Depends on:** T-023.
- **Acceptance:** debounced 1 write/s. Other hosts ignored. Shared links never overwrite a board's page.
- **Verify:** `npm run verify && npx jest src/features/workspace src/db`

### T-046 WebView resilience
- **Goal:** T-046 rows of ARCHITECTURE §6.1 + `isExternalSchemeUrl`.
- **Files:** `PortalWebView.tsx`, `src/lib/url.ts`, tests.
- **Depends on:** T-024.
- **Acceptance:** on `external-links.html`, mailto/tel open externally while the WebView stays put, and target=_blank / window.open load in place. Airplane mode → error view → Retry recovers. Renderer kill (`adb root && adb shell pkill -f sandboxed_process` on a Google APIs emulator) → remount at the same page.
- **Verify:** `npm run verify && npx jest src/lib` + manual.

---

## M6: Hardening and release

### T-047 Accessibility and large text
- **Files:** components/screens (accessibility props, font caps, focus management only).
- **Depends on:** T-046.
- **Acceptance:** UI_DIRECTIVES §10 accessibility items. A TalkBack pass over onboarding → workspace → sheet → tracker → detail → settings. Font scale 2.0 with no clipping (`adb shell settings put system font_scale 2.0`).
- **Verify:** `npm run verify` + notes in the PR.

### T-048 Reduced motion and dark mode
- **Files:** components with animation or color (fixes only).
- **Depends on:** T-047.
- **Acceptance:** reduced motion → instant sheet/panels/dialogs. `adb shell cmd uimode night yes` → every screen is readable. `grep -rnE "#[0-9A-Fa-f]{6}" src --include=*.tsx` → none outside `theme/tokens.ts` (the bridge outline color lives in a `.ts` script).
- **Verify:** `npm run verify`.

### T-049 F-Droid readiness and release build
- **Goal:** prove the release APK is free of proprietary libraries and buildable from source.
- **Files:** `LICENSE` (owner's choice, A-40), `fastlane/metadata/android/en-US/{title.txt,short_description.txt,full_description.txt,changelogs/1.txt}`, `README.md` (build section), DECISIONS.md.
- **Depends on:** T-048, and the owner's license choice.
- **Acceptance:**
  - [ ] `npx expo prebuild --platform android --clean && cd android && ./gradlew assembleRelease -PreactNativeArchitectures=arm64-v8a --max-workers=4 && ./gradlew --stop` succeeds (debug signing is fine for this check).
  - [ ] `./gradlew :app:dependencies --configuration releaseRuntimeClasspath | grep -iE "gms|firebase|play-services|crashlytics"` → empty.
  - [ ] Unzip the APK and `grep -rl "com/google/android/gms\|com/google/firebase" classes*.dex` → empty.
  - [ ] Fastlane metadata written (≤80-char short description, full description from PRODUCT_SPEC §1–3, no marketing superlatives).
  - [ ] README documents the "NonFreeNet" anti-feature (user-chosen AI provider).
- **Verify:** commands above + `npm run verify && npm run doctor`.

### ✅ Gate M6: hand to the tester
Run TEST_PLAN.md §6 in full. All automated tests green. Maestro suite green on both AVD sizes.
