# Jobify

**Your job search, in one place.** Jobify is a free, open-source Android app (iOS builds supported) that brings job boards, an AI copilot, and an application tracker together, all on your device.

> Status: **pre-alpha**. The architecture, contracts, and task plan are complete. Features are being implemented task by task (see [TASKS.md](TASKS.md)).

## What it does
- **Job boards in one place:** LinkedIn, Indeed, Wellfound, Himalayas, We Work Remotely, Remote OK, Remotive, and Glints by default, or add your own. You stay logged in.
- **Share to Jobify:** share a job link from any app (Android) and it opens ready to analyze.
- **Check fit in one tap:** eligibility for your location and work permits, red flags (unpaid trials, no salary, stale posts, time-zone mismatch…), match score, and the best resume version to use.
- **Fill forms:** auto-fills application forms from your profile and saved answers. AI-written answers are clearly labelled "AI draft".
- **Improve my application:** suggested bullet rewrites, points to emphasize, a cover note, and a short message to the hiring manager.
- **Track and follow up:** statuses, notes, and reminders when it's time to follow up.
- **Insights:** response and interview rates by resume version and by job board.
- **Backup:** export and import everything as a JSON file.

## Privacy and F-Droid Anti-Features

Jobify has no servers and no account. All data stays on your phone in on-device SQLite. When you use an AI feature, the job page and the relevant profile details go **directly to the AI provider you choose**, using **your own API key**, which is stored in the Android Keystore / iOS Keychain. There is no analytics, tracking, or advertising.

### F-Droid "NonFreeNet" Anti-Feature Explanation
Jobify carries the F-Droid anti-feature **NonFreeNet** because its optional AI features (job fit analysis, bullet rewrites, form auto-fill drafting) depend on an external AI network service. The user chooses the AI provider and network service:
- The user may configure **Google Gemini** or any **OpenAI-compatible** provider (OpenAI, OpenRouter, Groq, DeepSeek, Mistral).
- Users who prefer a completely free and self-hosted setup can point the OpenAI-compatible endpoint to a local model runner such as **Ollama** or **LM Studio** on their local network.
- Browsing job boards, managing resumes, tracking applications, reminders, and insights work fully offline without configuring any AI key or making any AI network calls.

## AI providers (bring your own key)
- **Google Gemini:** free tier available ([get a key](https://aistudio.google.com/apikey)). Required for importing a resume from PDF.
- **Any OpenAI-compatible API:** OpenAI, OpenRouter, Groq, DeepSeek, Mistral, or a local server such as **Ollama** or **LM Studio** (no key needed).

Release builds allow plain HTTP, for the in-app browser and local AI servers such as Ollama on the LAN.

## Develop and Build

Requirements: Node 22, JDK 17 or 21, Android SDK, and a physical device or emulator.

1. **Install dependencies:**
   ```bash
   npm ci
   ```

2. **Verify code and run tests (no device needed):**
   ```bash
   npm run verify          # runs typecheck, lint, and all test suites
   ```

3. **Development build on connected device:**
   ```bash
   npm run android         # compiles for connected device architecture and starts Metro
   ```

4. **Release APK build (clean prebuild and single-ABI build):**
   ```bash
   npx expo prebuild --platform android --clean
   cd android && ./gradlew assembleRelease -PreactNativeArchitectures=arm64-v8a --max-workers=4 && ./gradlew --stop
   ```

> **Build safety note:** Never run a raw multi-ABI build (`./gradlew assembleRelease` or `./gradlew assembleDebug` without `-PreactNativeArchitectures=arm64-v8a --max-workers=4`), as compiling all four CPU architectures concurrently can exhaust 16 GB of RAM. Always stop the Gradle daemon when finished (`./gradlew --stop`).

To try the app without a real AI key, start the mock server:
```bash
npm run mock:server     # mock AI provider and test job fixtures on :8787
```
In onboarding choose **OpenAI-compatible**, base URL `http://10.0.2.2:8787/v1` (emulator) or `http://localhost:8787/v1` (physical device with `adb reverse tcp:8787 tcp:8787`), model `mock`, key `k`.

## Documentation
| File | Purpose |
|---|---|
| [PRODUCT_SPEC.md](PRODUCT_SPEC.md) | What v1 is |
| [FUTURE.md](FUTURE.md) | What comes after v1 (ideas welcome) |
| [PLAN_REVIEW.md](PLAN_REVIEW.md) | Decisions and risks |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Stack, data model, AI contract, navigation, permissions, build |
| [UI_DIRECTIVES.md](UI_DIRECTIVES.md) | Design tokens, screen specs, copy, accessibility |
| [TASKS.md](TASKS.md) | Ordered implementation tasks |
| [TEST_PLAN.md](TEST_PLAN.md) | Test strategy, acceptance tests, commands |
| [COVERAGE.md](COVERAGE.md) | Requirement → task → test map |
| [AGENT_INSTRUCTIONS.md](AGENT_INSTRUCTIONS.md) | Rules for coding agents (copied to `AGENTS.md`, `.cursorrules`) |
| [DECISIONS.md](DECISIONS.md) / [BLOCKERS.md](BLOCKERS.md) | Change log for contracts / open problems |

## Contributing
Pick an unticked task in [TASKS.md](TASKS.md) or an item in [FUTURE.md](FUTURE.md) and open an issue first. Follow [AGENT_INSTRUCTIONS.md](AGENT_INSTRUCTIONS.md) (it applies to humans too). The rules that matter most:
- No Google Play Services, Firebase, or analytics dependencies.
- No personal data in code or fixtures.
- Contracts change only through DECISIONS.md.

## License
GPL-3.0-or-later. See `LICENSE`; third-party licenses are listed in `LICENSES.md` (D-007).
