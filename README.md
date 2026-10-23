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

## Privacy
Jobify has no servers and no account. Your data stays on your phone. When you use an AI feature, the job page and the relevant profile details go **directly to the AI provider you choose**, using **your own API key**, which is stored in the Android Keystore / iOS Keychain. There is no analytics or tracking.

F-Droid note: AI features rely on a third-party network service you select (anti-feature *NonFreeNet*). Browsing, tracking, follow-ups, and insights work without AI.

## AI providers (bring your own key)
- **Google Gemini:** free tier available ([get a key](https://aistudio.google.com/apikey)). Required for importing a resume from PDF.
- **Any OpenAI-compatible API:** OpenAI, OpenRouter, Groq, DeepSeek, Mistral, or a local server such as **Ollama** or **LM Studio** (no key needed).

## Develop

Requirements: Node 22, JDK 17/21, Android SDK (Gradle installs Platform 37 on first build), a device or emulator. 16 GB RAM is enough if you follow the build note.

```bash
npm ci
npm run verify          # typecheck + lint + tests (no device needed)
npm run android         # build for the connected device's CPU only, install, start Metro
npm run mock:server     # fake AI provider + test job pages on :8787
```

> **Build note:** use `npm run android`, not raw `./gradlew assembleDebug`. A raw Gradle build compiles all four CPU architectures and can exhaust 16 GB of RAM. Run `cd android && ./gradlew --stop` when you're done.

To try the app without a real AI key, run `npm run mock:server`. Then in onboarding choose **OpenAI-compatible**, base URL `http://10.0.2.2:8787/v1` (emulator) or `http://<your-PC-LAN-IP>:8787/v1` (phone), model `mock`, key `k`.

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
