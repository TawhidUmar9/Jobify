# TEST_PLAN.md: Jobify v1

**Audience:** a separate tester session that has **not** seen the implementation. Test against the contracts only:
- Behaviour: `PRODUCT_SPEC.md`, `PLAN_REVIEW.md`, `ARCHITECTURE.md`, `UI_DIRECTIVES.md`.
- Code contracts (read-only): `src/types/domain.ts`, `src/db/schema.ts`, `src/bridge/messages.ts`, `src/services/ai/{types,schemas}.ts`, `src/features/workspace/workspaceReducer.ts` (types and table), `src/constants/testIds.ts`, and the doc comments and signatures of every `src/**` export.
- Fixtures: `e2e/fixtures/` (fictional persona **Alex Rahman**). Mock: `scripts/mock-server.mjs`.

Your tests go in `tests/acceptance/**` (Jest) and `e2e/flows/*.yaml` (Maestro). Don't edit `src/`. Report bugs with §8.

---

## 1. Strategy by layer

| Layer | Tool | Runs on | Targets |
|---|---|---|---|
| L1 Unit | Jest 30, `rn` project (jest-expo) | Node | validators, prompts, providers (inject `fetchImpl`), aiClient, normalizers, repositories (`tests/helpers/fakeDb.ts`), kv/secrets/config, backup, staging (mocked Expo modules), url helpers, reducer |
| L2 DOM | Jest 30, `dom` project (jsdom) | Node | `SCRAPE_PAGE_JS`, `buildAutoFillScript` against `e2e/fixtures/pages/*.html` |
| L3 Component | React Native Testing Library 14 | Node | screens and components with mocked hooks: states, testIDs, a11y labels, copy, disabled logic |
| L4 E2E | Maestro CLI 2.11.0 | Android emulator, debug build + Metro + mock server | full flows via `id:` (testIDs) |
| L5 Manual | checklist §3–§4 | emulator + one physical Android phone (+ iOS sim if a Mac is available) | SAF picker, real logins, TalkBack, real AI provider smoke test |
| L6 Integration (optional) | Jest + real `fetch` | Node + `npm run mock:server` | both provider adapters against the mock |

Without an emulator: L1, L2, L3, L6.

---

## 2. Acceptance tests (Given/When/Then)

Preconditions for L4: §6.3 setup, `clearState: true`, mock running, and onboarding completed by the shared sub-flow `e2e/flows/_onboard.yaml` (you write it):
- OpenAI-compatible, base URL `http://10.0.2.2:8787/v1`, model `mock`, key `k`.
- Paste the text of `e2e/fixtures/resume-alex-rahman.txt`, label "Main".
- Preferences: Remote, country BD.

### F1 Onboarding
- **AT-01 (L4)** Given a fresh install, when the app opens, then `onboarding-welcome` shows, and `tab-workspace` does not exist.
- **AT-02 (L4)** Given the AI step with OpenAI-compatible + mock values, when I tap `ai-test`, then `ai-test-result` shows "Connected". With model `mock` and an empty key, it shows "The AI provider rejected your API key. Check it in Settings → AI provider."
- **AT-03 (L4)** Given the AI step, when I tap `onboarding-skip`, then the profile step shows, and `resume-import-pdf` and paste are unavailable (AI skipped), while `resume-manual` works.
- **AT-04 (L4)** Given the profile step (AI configured), when I paste the resume text and tap `resume-paste-submit`, then `profile-full-name` = "Alex Rahman" and `profile-email` = "alex.rahman@example.com". With an empty name, `onboarding-next` shows "Enter your name".
- **AT-05 (L4)** Given preferences, when I tap `onboarding-finish`, then `tab-workspace` is visible and the board bar shows 8 pills (LinkedIn … Glints). Relaunch → no onboarding.
- **AT-06 (L5)** Gemini + mock (Advanced base URL `http://10.0.2.2:8787`, any key): Import PDF with `resume-alex-rahman.pdf` (`adb push` to Download first) → profile filled and resume stored with a file name (Settings → Resumes shows "resume-alex-rahman.pdf").
- **AT-07 (L1)** Merge never overwrites: an existing profile name "Sam" + parse "Alex Rahman" → stays "Sam". An empty phone gets filled.

### F2 Workspace
- **AT-08 (L4)** Tap `board-pill-4` (Himalayas) → selected. Relaunch → still selected.
- **AT-09 (L4)** `openLink jobify:///?url=<job-remote-form>` → the fixture page is shown and no pill is selected.
- **AT-10 (L4)** Address bar: tap `toolbar-address`, type `10.0.2.2:8787/fixtures/job-local-only.html`… (no scheme: expect `https://` prefix, so the load error view appears). Then type the full `http://10.0.2.2:8787/fixtures/job-local-only.html` → it loads. "hello world" → "Enter a web address".
- **AT-11 (L4)** Share: `adb shell am start -a android.intent.action.SEND -t text/plain --es android.intent.extra.TEXT "See http://10.0.2.2:8787/fixtures/job-remote-form.html." io.github.tawhidumar9.jobify` → that page opens (trailing "." stripped). Text with no link → snackbar "No link found in what you shared".
- **AT-12 (L5)** Logged-in session persists across a force-stop (any board with email login).
- **AT-13 (L4)** Toolbar: follow a link → `toolbar-back` returns, forward works, reload shows `webview-progress`. On the first page back is disabled.

### F3 Analyze
- **AT-14 (L4)** On job-remote-form, `analyze-fab` → `copilot-loading` → `eligibility-badge` "You can apply", `red-flag-0` "No salary listed", `red-flag-1` "Heads-up: Unknown codes must become OTHER.", `match-score` 92, `recommended-resume` "Main", `matched-skills` includes "k3s".
- **AT-15 (L4)** job-local-only → "Likely not eligible", red flag "Location or work permit limit", score 100 (clamped).
- **AT-16 (L4)** empty.html → "Not enough text on this page", and `/__requests` has no analysis call.
- **AT-17 (L4)** Each error page → exact `copilot-error-message`: 429 "Rate limit reached. Wait a minute and try again." · 500 "The AI provider is having problems. Try again in a minute." · 404 "This model is not available for your key. Change it in Settings → AI provider." + `copilot-error-action` · malformed "The AI returned an unreadable answer. Try again or use a stronger model." · blocked "The AI declined to process this page." · slow → after ~30 s "The AI took too long to answer. Try again." Then `copilot-retry` re-runs.
- **AT-18 (L4)** Remove the AI settings (Settings → AI provider → Remove) → FAB reads "Set up AI" and opens AI settings.
- **AT-19 (L1)** Model `no-json-schema` → the first request uses `json_schema`, the second `json_object`, and the result is ok (L6 against the mock, or L1 with `fetchImpl`).
- **AT-20 (L1)** Gemini requests never contain `?key=`. The header `x-goog-api-key` is set. OpenAI requests send no Authorization header with an empty key.

### F4 Improve
- **AT-21 (L4)** After AT-14, `tailor-button` → `tailor-card` shows 3 emphasize items, `bullet-rewrite-0`, `cover-note`, `cold-dm-text`. `copy-dm` → "Copied" and the clipboard equals the fixture coldDm.
- **AT-22 (L4)** Log first, then tailor → the detail screen shows the cover note and DM.

### F5 Auto-fill and answer bank
- **AT-23 (L4)** After AT-14, `action-autofill` → snackbar "Filled 5 of 5 fields". The page text contains `name=Alex Rahman`, `years=3-5`.
- **AT-24 (L4)** Navigate away → `copilot-stale-notice` and Auto-fill disabled. Navigate back → enabled.
- **AT-25 (L4)** `save-answer-jobify-field-3` → "Saved to answer bank". Settings → Answer bank lists "Why Acme Cloud?". The next analysis request body (`/__requests`) contains that answer under "Saved answers".
- **AT-26 (L2)** Password, hidden, checkbox, file, display:none, and disabled fields are never scraped or filled. Injection-safe textarea value.

### F6 Resume staging
- **AT-27 (L5, Android)** With a PDF resume, Stage CV → explainer → Continue → pick or create `Download/Jobify` → "Resume saved to your Jobify folder." Twice → one file. The clipboard holds the cover note if tailored.
- **AT-28 (L4)** Explainer Cancel → no picker, and it shows again next time. A text-only resume → "This resume has no PDF. Add one in Settings → Resumes."

### F7 Tracker and follow-ups
- **AT-29 (L4)** Log → "Logged to Tracker" and the button reads "Logged". Tracker row: "Senior Backend Engineer", "Acme Cloud · Shared link", "Applied". Log again after re-analyze → "Already in Tracker".
- **AT-30 (L1)** Follow-ups: rows with `follow_up_at` in the past and status APPLIED/INTERVIEWING appear in `listFollowUpsDue`. OFFER does not.
- **AT-31 (L4, seeded DB §6.4)** A due follow-up shows in `follow-ups-due`. Tap → detail. `detail-follow-up` → `follow-up-option-1w` → "Reminder updated" and the item leaves the due list.
- **AT-32 (L4)** Detail: change status to Interviewing → "Status changed to Interviewing" and the row chip updates. Notes → "Notes saved" and they persist after relaunch. Delete → confirm → "Application deleted" and the row is gone. Open job post → Workspace on that URL.

### F8 Insights
- **AT-33 (L1)** The seeded data set (§6.4) yields the expected totals, rates, byResume/byBoard rows, and 8 weekly buckets for a fixed `now`.
- **AT-34 (L4)** `tracker-insights` → the Insights screen shows tiles. With an empty DB → `insights-empty`.

### F9 Settings
- **AT-35 (L4)** Boards: add "Test" `http://10.0.2.2:8787/fixtures/job-remote-form.html` → appears last in Workspace (after a focus). Move it up → order changes. Delete → gone. Name with 17 chars → "Use 1–16 characters".
- **AT-36 (L4)** Profile edit + Save → "Profile saved". Back with unsaved changes → "Discard changes?" dialog.
- **AT-37 (L4)** Resumes: delete "Main" → confirm → gone. Existing applications keep "Main" as their label.

### F10 Backup
- **AT-38 (L1)** Export → import round-trip (fakeDb) restores the data. The JSON never contains the API key (assert the key string is absent). Wrong format, newer version, and unreadable each give the right error, and a failed import changes nothing.
- **AT-39 (L5)** Export on a device → share sheet with `jobify-backup-YYYY-MM-DD.json`. Fresh install → Welcome → Restore from backup → pick the file → tabs open with the data.

### Privacy and contracts
- **AT-40 (L1)** No logger call ever contains the API key, page text, profile email, or DM (spy on `logger` across the provider/controller tests).
- **AT-41 (L1)** The SQLite schema contains no key/secret/token column (contracts test exists; keep it green).

---

## 3. Edge cases

| ID | Case | Expected |
|---|---|---|
| EC-01 | Offline page load (Maestro `setAirplaneMode: enabled`, reload) | `webview-error` "Can't load this page". Retry recovers when back online. |
| EC-02 | Offline analyze / test connection / resume import | "No connection. Check your internet and try again." |
| EC-03 | Offline tracker, settings, insights, backup export | All work |
| EC-04 | Slow AI (`job-slow`) | spinner ~30 s then TIMEOUT. Close during the wait aborts, and no late result appears. |
| EC-05 | Close then re-analyze quickly | No duplicate snackbars or stale results |
| EC-06 | Switch board or open a shared link mid-analysis | State resets. No late result. |
| EC-07 | Hostile bridge messages (L1/L3): PAGE_SCRAPED while idle, AUTOFILL_COMPLETE while ready, junk JSON | Ignored. Reducer returns the same reference. |
| EC-08 | SAF permission denied (back in the picker) | "Folder access was not granted. Tap Stage CV to try again." Nothing stored. |
| EC-09 | SAF folder deleted later | One re-prompt, then success |
| EC-10 | Backgrounded 5 s with results open, resume | Sheet and results unchanged |
| EC-11 | Low-memory restore (`adb shell settings put global always_finish_activities 1`) | Returns to the active board's page. The analysis is gone by design. Data intact. Reset the setting after. |
| EC-12 | Rotation | Stays portrait. No state loss. |
| EC-13 | Fresh install, onboarding skipped AI, no resumes | Tracker/Insights empty states. FAB "Set up AI". |
| EC-14 | `long-content.html` (160k chars, 120 inputs) | Request `pageText.length === 12000`, `inputs.length === 80` (`/__requests`) |
| EC-15 | 200-char company/role, 3 000-char DM (seeded) | Rows ellipsize. Detail shows the full text. |
| EC-16 | 500 applications (seeded) | Tracker scroll has no blank gaps on a slow fling. First paint < 1 s on the emulator. Insights < 1 s. |
| EC-17 | `jobify:///application/abc`, `/0`, `/999999` | `application-not-found` |
| EC-18 | `jobify:///?url=javascript%3Aalert(1)`, `file%3A%2F%2F%2Fetc%2Fhosts` | Ignored |
| EC-19 | `external-links.html`: mailto, tel, `_blank`, `window.open` | System apps for mailto/tel. In-place loads for the rest. |
| EC-20 | Renderer kill (`adb root && adb shell pkill -f sandboxed_process`) | App alive. WebView remounts at the same page. |
| EC-21 | Deep link before onboarding | Lands on onboarding. No crash. |
| EC-22 | Duplicate/invalid AI mappings and unknown enums (fixtures) | "5 of 5 fields ready to fill". Unknown red flag → "Heads-up". |
| EC-23 | Very large resume PDF (> 10 MB) | "PDF is larger than 10 MB" |
| EC-24 | Backup from a newer version (edit `version: 2`) | "This backup is from a newer Jobify. Update the app first." |
| EC-25 | Local model without a key (model `local-model`, empty key) | Test → Connected (no Authorization header sent) |
| EC-26 | Share intent while the app is backgrounded on another tab | Switches to Workspace and opens the link |

---

## 4. UI checks against UI_DIRECTIVES.md

| ID | Check | How |
|---|---|---|
| UI-01 | Every state in §4 tables renders with its testID and exact copy | L3 per screen + L4 spot checks |
| UI-02 | Small (360 dp) and large (412 dp) phones | Run the L4 suite on both AVDs and take screenshots of onboarding steps, Workspace, sheet (ready + tailor), Tracker, detail, Insights, Settings forms |
| UI-03 | Dark mode | `adb shell cmd uimode night yes` + screenshots |
| UI-04 | Font 2.0 | `adb shell settings put system font_scale 2.0` + screenshots. No clipping. Pills/chips/tabs capped. |
| UI-05 | Accessibility labels | L3: every interactive testID has a role and non-empty label (doc-comment strings). L5: TalkBack pass. |
| UI-06 | Touch targets ≥ 48 dp | L3 style checks. L5 "Show layout bounds". |
| UI-07 | Reduce motion | Sheet, panels, and dialogs are instant (L5) |
| UI-08 | Color not the only signal | Badges, flags, and chips have text (L3 by text) |
| UI-09 | No emoji in UI strings | L1 scan of `src/**/*.tsx` literals |
| UI-10 | Safe areas / cutout | Developer options → Display cutout "Tall". Onboarding bottom bar and sheet footer stay clear. |
| UI-11 | Keyboard | Every form screen (onboarding steps, settings forms, modals): the focused field and its error stay visible above the keyboard on a 360 dp AVD |
| UI-12 | Android back | Sheet/dialog/picker close. WebView back. Onboarding steps go back. Unsaved forms show the confirm dialog. |

---

## 5. Mocks and fixtures (deterministic)
- **AI:** never call real providers in automation. L1/L3 use `fetchImpl` mocks or module mocks of `src/services/ai/aiClient`. L4/L6 use `npm run mock:server`. It picks analysis fixtures by the scraped file name, detects call kind from the schema, supports both wire formats, has special models `no-json-schema` and `local-model`, and logs requests at `GET /__requests` (`POST /__reset` before each flow).
- **Pages:** `/fixtures/*.html`, opened by deep link. Never depend on live boards except AT-12 (manual).
- **SQLite:** L1/L3 use `tests/helpers/fakeDb.ts`. L4 uses `clearState` plus `_onboard.yaml`, or a seeded DB (§6.4).
- **Native modules mocked in `jest.setup.ts`:** gesture-handler, reanimated, bottom-sheet, webview (View + jest.fn handle), haptics, clipboard, kv-store (in-memory), secure-store (in-memory), share-intent (no share), document-picker (cancel), localization (Asia/Dhaka, BD). Mock `expo-file-system(/legacy)`, `expo-sharing`, and `expo-asset` per test.
- **Time:** fake timers for the 5 s bridge, 30/60 s AI, 4 s snackbar, and 1 s visit debounce. Inject `now` into repos.
- **DOM helpers:** `tests/helpers/dom.ts` (`installInnerTextPolyfill`, `captureBridgeMessages`, `runInjectedScript`). jsdom does not run inline `<script>` from innerHTML, so run the fixture script text yourself.
- **Persona:** Alex Rahman, `alex.rahman@example.com`, `+880 1700 000000`, Dhaka, BD. Never use real personal data.

---

## 6. Commands

### 6.1 Without an emulator
```bash
npm ci
npm run test:ci                      # rn + dom projects
npx jest --selectProjects dom        # L2 only
npx jest tests/acceptance            # your tests
npm run mock:server & npx jest tests/acceptance/integration   # L6 (optional)
npm run typecheck && npm run lint
```

### 6.2 Emulators (safe on 16 GB RAM: run one at a time)
```bash
sdkmanager "system-images;android-36;google_apis;x86_64" "system-images;android-30;google_apis;x86_64"
avdmanager create avd -n Pixel7_API36 -k "system-images;android-36;google_apis;x86_64" -d pixel_7
avdmanager create avd -n Small_API30 -k "system-images;android-30;google_apis;x86_64" -d "small_phone"
emulator -avd Pixel7_API36 -memory 2048 -no-snapshot-load &
adb wait-for-device
```

### 6.3 E2E (Maestro, debug build)
```bash
curl -fsSL "https://get.maestro.mobile.dev" | MAESTRO_VERSION=2.11.0 bash   # once
npm run mock:server                  # terminal 1
npm run android                      # terminal 2: builds the connected device's ABI only, installs, starts Metro
maestro test e2e/flows               # terminal 3
maestro test --format junit --output e2e/artifacts/report.xml e2e/flows
cd android && ./gradlew --stop       # afterwards: free RAM
```
Conventions: `appId: io.github.tawhidumar9.jobify`. Each flow starts with `launchApp: {clearState: true}` and then `runFlow: _onboard.yaml` (unless testing onboarding or persistence). Select by `id:`. `extendedWaitUntil` 15 000 ms after Analyze (40 000 for job-slow). Physical phone instead of emulator: use the PC's LAN IP instead of `10.0.2.2` in the onboarding values and deep links.

Suggested flows: `_onboard`, `01_onboarding`, `02_boards_and_links`, `03_share_intent`, `04_analyze_log_tracker`, `05_gemini_errors`, `06_improve_copy`, `07_autofill_answer_bank`, `08_detail_status_followup`, `09_insights`, `10_settings_boards_answers`, `11_offline`, `12_back_navigation`, `13_large_data`.

### 6.4 Seed the DB (debug build only; EC-15/16, AT-31/33)
```bash
python3 - <<'PY'
import sqlite3, re, datetime
ddl = re.search(r"MIGRATION_V1 = `(.*?)`;", open('src/db/schema.ts').read(), re.S).group(1)
db = sqlite3.connect('/tmp/jobify.db'); db.executescript(ddl)
db.execute("INSERT INTO profile (id, data_json) VALUES (1, ?)", ('{"fullName":"Alex Rahman","email":"alex.rahman@example.com"}',))
db.execute("INSERT INTO resumes (label, content_json) VALUES ('Main', '{\"summary\":\"\",\"skills\":[],\"highlights\":[]}')")
now = datetime.datetime.utcnow()
for i in range(500):
    created = (now - datetime.timedelta(days=i % 56)).strftime('%Y-%m-%d %H:%M:%S')
    due = (now - datetime.timedelta(days=1)).strftime('%Y-%m-%d %H:%M:%S') if i < 3 else None
    status = ['APPLIED','INTERVIEWING','REJECTED','OFFER','SAVED'][i % 5]
    db.execute("""INSERT INTO applications (company_name, role_title, board_name, job_url, resume_id, resume_label,
      match_score, eligibility, status, follow_up_at, created_at, status_changed_at)
      VALUES (?,?,?,?,1,'Main',?, 'ELIGIBLE', ?, ?, ?, ?)""",
      ('C'*200 if i == 0 else f'Company {i}', 'R'*200 if i == 0 else f'Role {i}', ['LinkedIn','Himalayas'][i % 2],
       f'https://example.com/{i}', i % 101, status, due, created, created))
db.execute('PRAGMA user_version = 1'); db.commit(); db.close()
PY
adb shell am force-stop io.github.tawhidumar9.jobify
adb push /tmp/jobify.db /data/local/tmp/jobify.db
adb shell run-as io.github.tawhidumar9.jobify sh -c 'mkdir -p files/SQLite && rm -f files/SQLite/jobify.db-wal files/SQLite/jobify.db-shm && cp /data/local/tmp/jobify.db files/SQLite/jobify.db'
# mark onboarding done (kv-store lives in its own DB): easier to run _onboard.yaml after seeding
```
Boards are seeded on the next launch (the table is empty).

### 6.5 iOS (optional, macOS)
`npm run ios`, then AT-01–05, AT-14, UI-02/03 on "iPhone SE (3rd generation)" and "iPhone 16 Pro Max". Use `localhost` instead of `10.0.2.2`. Share intent is Android-only in v1.

---

## 7. Coverage expectations
- Every AT/EC has an automated test unless marked L5. Record L5 results in the test report.
- L1+L2 line coverage ≥ 90% for `src/bridge`, `src/services`, `src/lib`, `src/db/repositories`, and `workspaceReducer.ts` (`npx jest --coverage`).
- Device matrix: Pixel7_API36 + Small_API30 in light mode, plus `04_analyze_log_tracker` again with dark mode + font 2.0.

## 8. Bug report template
```
### BUG-0xx <title>
- Severity: S1 crash/data loss | S2 feature broken | S3 workaround exists / wrong copy | S4 cosmetic
- Linked task: T-0xx   Linked test: AT-xx / EC-xx / UI-xx
- Device / OS / build: <Pixel 7 emulator API 36, debug, commit sha>
- Preconditions: <mock server on/off, provider, seeded data>
- Steps: 1. … 2. …
- Expected: <quote the contract + file/section>
- Actual: <exact on-screen text>
- Evidence: <screenshot/video, `adb logcat -d | grep -i jobify`, Maestro output, /__requests excerpt>
- Frequency: always | N of M
```
