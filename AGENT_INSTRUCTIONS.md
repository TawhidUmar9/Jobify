# AGENT_INSTRUCTIONS.md: rules for the coding agent (Gemini / Cursor / any)

These rules override your defaults. The same text is in `AGENTS.md` and `.cursorrules`.

## 0. Read first (every session)
1. `TASKS.md`: find the first task whose checkboxes are not all ticked. That is your task, and it is your only task.
2. The files listed under that task's **Files**, plus every file they import from `src/types`, `src/constants`, `src/theme`, and `src/lib`.
3. The ARCHITECTURE.md and UI_DIRECTIVES.md sections the task or the file's doc comment cite. `PRODUCT_SPEC.md` says what v1 is, and `FUTURE.md` lists what it is **not**.
4. `DECISIONS.md` and `BLOCKERS.md`, so you don't repeat a resolved problem.

## 1. Scope
- Do tasks **in order, one at a time**, and **only the assigned task**. Do not start the next task in the same session.
- Edit only the files listed in the task, plus new test files under `src/<area>/__tests__/`. Touching anything else requires a BLOCKERS.md entry first, and then you stop.
- Implement exactly what the doc comment says. If the comment and a doc disagree, the order of authority is: **doc comment in a CONTRACT FILE > ARCHITECTURE.md > UI_DIRECTIVES.md > TASKS.md text**. Log the disagreement in BLOCKERS.md.
- Remove the `// TODO(T-xxx)` marker for your task when you finish it. Leave other tasks' markers alone.
- No speculative features, no "while I'm here" refactors, no extra screens, settings, or options. Anything in FUTURE.md or not in PRODUCT_SPEC.md is out of scope.

## 2. Contracts are frozen
Do not change any of these without writing a DECISIONS.md entry (date, task, what changed, why, and what else must change):
- `src/types/domain.ts`, `src/bridge/messages.ts` (types and limits), `src/db/schema.ts`, `src/services/ai/types.ts` and `schemas.ts` (codes, messages, schemas), `src/services/kvStore.ts` (keys), `src/services/secrets.ts` (key name), `src/services/backup.ts` (file format), `src/constants/testIds.ts`, `src/theme/tokens.ts`, `src/features/workspace/workspaceReducer.ts` (types and table), exported function signatures and props interfaces, route files and params in `src/app/`, `app.json` permissions, scheme, ids, and plugins.
- **Pinned versions in `package.json`.** Never run `npm update`, `npx expo install --fix`, or install `@latest`, and never edit a version to "fix" an error. If an error looks like a version problem, write it in BLOCKERS.md with the full error text and stop.
- **No new dependencies** unless the task names them. Today no task does.
- **F-Droid rule:** never add a dependency that pulls Google Play Services, Firebase, analytics, or crash reporting (this includes `expo-notifications`). T-049 scans for them.

## 3. Code style (match what is there)
- TypeScript strict, with no `any` (use `unknown` and narrow). No `@ts-ignore`. No non-null `!` on values from outside (DB rows, bridge messages, network).
- Functional components and hooks. `StyleSheet.create` at the bottom of the file. Colors only from `useTheme().colors`. Sizes only from `tokens.ts`.
- Relative imports, in groups: external packages, blank line, internal modules.
- Services return `Result<T, E>` (`src/lib/result.ts`) for expected failures. Don't throw for them.
- Logging only through `src/lib/logger.ts`. `console.*` fails lint. Never log the API key, page text, profile, resume content, answers, field values, cover notes, or DMs.
- The API key lives only in `secrets.ts` (SecureStore). Never put it in SQLite, kv-store, backups, test snapshots, or fixtures.
- Never put real personal data in code, tests, or fixtures. Use the fictional persona Alex Rahman (`e2e/fixtures/`).
- SQL is parameterised (`?` placeholders). Never interpolate values into SQL strings.
- Values sent into the WebView go through `JSON.stringify`. No string concatenation of user or AI data into scripts.
- Every interactive element gets the `testID`, `accessibilityRole`, and `accessibilityLabel` from its doc comment.
- Keep changes minimal. Don't reformat files you aren't otherwise changing.

## 4. After every task (definition of done)
Run these, in this order, and fix failures caused by your change:
```bash
npm run typecheck
npm run lint
npm run test:ci
<the task's own Verify command from TASKS.md>
```
Then for UI tasks, `npm run android` and do the task's Manual checks. When done with the device, run `cd android && ./gradlew --stop`.

**Build safety (a full multi-ABI build crashed a 16 GB PC):** build only with `npm run android` (it compiles just the connected device's CPU architecture). **Never** run `./gradlew assembleDebug`, `installDebug`, or `assembleRelease` without `-PreactNativeArchitectures=arm64-v8a --max-workers=4`. Never run two builds at once, or a build while an emulator with more than 2 GB RAM is running on a 16 GB machine.

When everything passes:
1. Tick the task's checkboxes in TASKS.md.
2. Commit with message `T-0xx: <task title>` (one commit per task).
3. **Stop** and report in this format:
```
Task: T-0xx <title>
Status: DONE | BLOCKED
Files changed: <list>
Tests added: <list>
Verify output: <last 5 lines of npm run test:ci> + typecheck/lint OK
Manual checks: <each one: PASS/FAIL + one line>
Notes: <anything the next task must know, or "none">
```

## 5. When stuck
- If you can't satisfy a criterion after **two** honest attempts, or the docs are ambiguous, or something outside your files must change: add an entry to `BLOCKERS.md` using the template there, set Status BLOCKED in your report, and stop. **Do not guess.**
- Never delete or weaken a test to make it pass. Never skip tests (`it.skip`, `xit`) without a BLOCKERS.md entry.
- Never edit `android/` or `ios/`. They are generated. Native config lives in `app.json`.
- Don't touch `tests/contracts/`, `tests/helpers/`, `jest.config.js`, `jest.setup.ts`, `scripts/mock-server.mjs`, or `e2e/`. The architect and tester own them. If one blocks you, log it.

## 6. Useful commands
```bash
npm ci                         # install exactly the lockfile
npm run verify                 # typecheck + lint + tests
npx jest path/to/folder        # one area
npx jest --selectProjects dom  # injected-script tests (jsdom)
npm run android                # build (device ABI only) + install + Metro
cd android && ./gradlew --stop # free ~2 GB after building
npm run mock:server            # AI (Gemini + OpenAI-compatible) + fixture pages on :8787
# In the app: OpenAI-compatible, base URL http://10.0.2.2:8787/v1, model "mock", key "k"
adb shell am start -a android.intent.action.VIEW -d "jobify:///?url=http%3A%2F%2F10.0.2.2%3A8787%2Ffixtures%2Fjob-remote-form.html"
adb shell pm clear io.github.tawhidumar9.jobify   # wipe app data (back to onboarding)
```

## 7. Expo-specific warnings
Expo changes between SDKs, and this project is on **SDK 58**. Before using an Expo API you are not sure of, read the versioned docs at `https://docs.expo.dev/versions/v58.0.0/` or the typings in `node_modules/<pkg>/build/*.d.ts`. Don't rely on memory. Known traps:
- `expo-file-system` (new API) has no `StorageAccessFramework`. Import it from `expo-file-system/legacy`.
- The `react-native-webview` 14 types have no ref. Use `WebViewHandle` from `PortalWebView.tsx`.
- No `EXPO_PUBLIC_*` env vars are used. Configuration comes from onboarding/settings.
- `expo-share-intent` exposes `useShareIntentContext()` (provider is in the root layout).
- Protected routes use `Stack.Protected guard={…}` from expo-router.
- Routes live in `src/app/`. Only screens go there.
