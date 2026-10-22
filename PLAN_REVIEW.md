# PLAN_REVIEW.md: decisions behind Jobify v1

Inputs: the original personal plan (git-ignored, local only), the user's direction to release publicly on F-Droid with BYOK, resume scoring, and the "★" high-value features, and `PRODUCT_SPEC.md` (the binding spec). Reviewed 2026-10-22.

| Input | Value used |
|---|---|
| Stack | React Native 0.88 + Expo SDK 58 + TypeScript 6 (ARCHITECTURE.md §1) |
| Platforms | Android first (all tests). iOS builds supported, but share-to-app is Android-only in v1. |
| Minimum OS | Android 7.0 (API 24) / iOS 15.1 (SDK 58 defaults) |
| Backend | None. SQLite on device. The user's chosen AI provider is the only third-party service. |
| Distribution | F-Droid (main repo) or IzzyOnDroid first. GitHub releases. |
| App id | `io.github.tawhidumar9.jobify` (F-Droid convention for GitHub-hosted apps; permanent once published) |

**Blocking questions asked: 0.** One decision is left to the owner, the **license**, which T-049 needs before release (A-40).

---

## 1. Decisions (IDs are cited by other docs)

### From personal tool to public app
| ID | Decision | Why |
|---|---|---|
| A-01 | All personal data is removed from code. The profile, resumes, and preferences come from onboarding. Test fixtures use a fictional persona, "Alex Rahman". | Public repo. The original plan contained a phone number and email. |
| A-02 | The original plan file is git-ignored. `PRODUCT_SPEC.md` is the spec. | Same. |
| A-03 | **BYOK:** the key lives in `expo-secure-store` (Keystore/Keychain), never in SQLite, kv-store, backups, logs, or the bundle. The `EXPO_PUBLIC_*` env approach was removed. | The v0 design embedded the key in the JS bundle. |
| A-04 | **Two provider wire formats:** Gemini, and OpenAI-compatible `/chat/completions`. | Covers OpenAI, OpenRouter, Groq, DeepSeek, Mistral, Ollama, and LM Studio with one adapter. Local servers allow an empty key. |
| A-05 | Gemini default model `gemini-3.8-flash`. The model is editable. | Google's deprecations page (2026-10-22) limits 2.5 models to past users and recommends 3.8 Flash / 3.5 Flash-Lite. |
| A-06 | Structured output: one neutral JSON Schema per call. Gemini gets `responseSchema` (converted to upper-case types). OpenAI-compatible gets `response_format: json_schema`, falling back to `json_object` plus the schema in the prompt after a 400. Every response is validated again on device. | Providers vary, and the validators make weaker models safe. |
| A-07 | Resume import from **PDF needs Gemini** (inline PDF input). Every provider can **paste text**. Manual entry always works. | Avoids a PDF-text-extraction dependency. |
| A-08 | **Two AI calls per job:** Analyze (eligibility, red flags, score, resume pick, form mapping) is automatic. Improve (emphasis, bullet rewrites, cover note, DM) is on demand. | Halves cost and latency for users who only want fit plus auto-fill. |
| A-09 | Eligibility is generalized (ELIGIBLE / NOT_ELIGIBLE / UNCLEAR) and judged against the user's location, time zone, and preferences, instead of a hardcoded "Bangladesh" rule. | Public users live anywhere. |
| A-10 | Resumes are user-defined versions (unlimited, labelled) instead of three fixed IDs. PDFs are copied into app storage. | Generic. Supports "which resume works best" insights. |

### ★ features chosen for v1
| ID | Decision |
|---|---|
| A-11 | **Share to Jobify** via `expo-share-intent` 9.0.0 (MIT; `text/*` only; iOS extension disabled in v1). The first URL in the shared text opens in the Workspace. |
| A-12 | **Red-flag scan** as part of Analyze, using a fixed code list (`RED_FLAG_CODES`) with UI titles. |
| A-13 | **Answer bank:** SQLite `answers` table. Up to 40 most-used answers are sent with Analyze. AI drafts are saved with one tap. Use counts are tracked. |
| A-14 | **Follow-ups are in-app** in v1: `follow_up_at` defaults to +7 days for Applied, with a "Follow-ups due" section and quick reschedule options. **No system notifications in v1**: `expo-notifications` pulls in `firebase-messaging`, which F-Droid rejects, and the alternatives need vetting (FUTURE FUT-03). |
| A-15 | **Insights** via SQL aggregates. Response = Interviewing/Offer/Rejected. Interview = Interviewing/Offer. Rows with fewer than 3 applications say "Too few to compare". |
| A-16 | **Backup** is plain JSON export/import (replace-all). The key and PDFs are excluded, and the UI warns that the file is unencrypted. Encryption is FUT-11. |
| A-17 | **Job boards are editable** (add/edit/delete/reorder), with 8 global defaults. Region packs are FUT-12. |
| A-18 | **Address bar** in the toolbar: type or paste any link. |

### Kept from the v0 handoff (still valid)
| ID | Decision |
|---|---|
| A-20 | One WebView for all boards. Cookies persist (Android CookieManager; iOS `sharedCookiesEnabled`). |
| A-21 | Scraper excludes hidden/file/submit/button/image/reset/checkbox/radio/password/disabled/read-only fields. Selects send up to 50 options. Auto-fill uses the native value setters, including `HTMLSelectElement`. |
| A-22 | Analyses are bound to their page URL. Auto-fill is disabled after navigating away. Analyses are not persisted. |
| A-23 | Cross-origin iframe forms are unsupported (open the form's own URL). Google/LinkedIn OAuth inside WebViews is blocked by those providers, so use email login. |
| A-24 | Android resume staging uses SAF into `Download/Jobify` (Android 11+ blocks the Download root). iOS uses the share sheet. |
| A-25 | Portrait only. Tablets run the phone layout. |
| A-26 | NativeWind dropped. Typed tokens + StyleSheet. |
| A-27 | No `expo-dev-client`. Use plain debug builds (simpler E2E). |
| A-28 | `@gorhom/bottom-sheet` 5.2.14 with gesture-handler 3.3: the combination is unconfirmed. T-001 checks it, and BLOCKERS.md holds the fallback. |

### Build machine safety (after the 2026-10-22 crash)
| ID | Decision |
|---|---|
| A-30 | Build with **`npm run android` only** (`expo run:android` compiles native code for the connected device's ABI only in debug). Never run raw `./gradlew assembleDebug`/`installDebug`: it builds all 4 ABIs and exhausted 15 GB of RAM. Optional `~/.gradle/gradle.properties`: `org.gradle.workers.max=4`, `org.gradle.jvmargs=-Xmx2g`. Release builds pass `-PreactNativeArchitectures=arm64-v8a` (T-049). |

### Open for the owner
| ID | Item |
|---|---|
| A-40 | **License.** Needed before T-049 (F-Droid requires an OSI license). Suggested: GPL-3.0-or-later (forks stay open) or Apache-2.0 (permissive, patent grant). The code contains no license headers, so the choice is a single `LICENSE` file. |
| A-41 | Repository URL in `app.json` `extra.repositoryUrl` is assumed `https://github.com/TawhidUmar9/jobify`. |

## 2. Risks
| ID | Risk | Mitigation |
|---|---|---|
| R-1 | Weak or local models return poor JSON | Schema plus validators. The `INVALID_JSON`/`SCHEMA_MISMATCH` copy suggests a stronger model. |
| R-2 | Users paste keys with broad scopes | Copy explains the keystore storage. Recommend a restricted key in the AI provider help text (FUTURE: link docs). |
| R-3 | F-Droid build of an Expo app | T-049 scans dependencies and builds a release APK from source with no Google classes. Fallback channel: IzzyOnDroid. |
| R-4 | Job sites change markup | Scraping is generic (DOM inputs plus text). There are no site-specific selectors in v1. |
| R-5 | AI cost surprises | Analyze is one call per tap and Improve is opt-in. The answer bank in the prompt is capped at 40. |
