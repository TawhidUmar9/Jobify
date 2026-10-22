# FUTURE.md: features after v1

Tracked ideas that are **not** in v1 (`PRODUCT_SPEC.md`). The coding agent must not build these without a DECISIONS.md entry and a new task in TASKS.md. Contributors: open an issue that links the item ID before starting.

Legend: **Value** H/M/L · **Effort** S (≤2 days) / M (≤1 week) / L (>1 week) · **Deps** = new libraries or platform work.

## v1.1 (next)

| ID | Feature | Value | Effort | Notes / deps |
|---|---|---|---|---|
| FUT-01 | **Job feed inbox**: pull jobs from public feeds (Himalayas, Remotive, RemoteOK, Jobicy, Arbeitnow, We Work Remotely RSS), filtered by preferences, de-duplicated | H | M | Check each source's terms and rate limits. New `feed_jobs` table. Keyword pre-filter before any AI call. |
| FUT-02 | **Background check + daily digest** ("3 new matches ≥ 80") | H | M | `expo-background-task` (Android WorkManager, iOS BGTaskScheduler; best effort, ≥15 min). Needs FUT-03. Samsung battery killers: document allow-listing. |
| FUT-03 | **System notifications** for follow-ups and digests | H | S | **Must not pull Firebase** (`expo-notifications` depends on `firebase-messaging` → F-Droid rejects). Evaluate `react-native-notify-kit` (Apache-2.0 Notifee fork; local notifications only) or a tiny custom Expo module using AlarmManager + NotificationManager. Android 13+ `POST_NOTIFICATIONS`. |
| FUT-04 | **Fillers for common application systems**: deterministic rules for Greenhouse, Lever, Ashby, Workable, SmartRecruiters standard fields (no AI for name/email/links) | H | M | One module per system in `src/bridge/ats/`, so contributors can add more. AI only for open questions. |
| FUT-05 | **Duplicate detection** across boards (same company + role in 30 days) | M | S | Normalized title/company hash. |
| FUT-06 | **Paste an email to update status** (rejection / interview invite → status + note) | M | S | New AI call, schema `email_status`. |

## v1.2

| ID | Feature | Value | Effort | Notes / deps |
|---|---|---|---|---|
| FUT-07 | **Tailored resume PDF export** using the open [JSON Resume](https://jsonresume.org) schema + templates | H | L | `expo-print` (HTML → PDF). Templates as contributor-friendly HTML files. |
| FUT-08 | **Interview prep**: likely questions from JD + resume; STAR story bank; optional mock-interview chat | M | M | New `stories` table. |
| FUT-09 | **Contacts/referrals per application** + outreach log | M | S | New table; no contact sync. |
| FUT-10 | **Calendar**: add interview dates to the device calendar | M | S | `expo-calendar` (check F-Droid compatibility). |
| FUT-11 | **Encrypted backups** (passphrase, AES-GCM) | M | S | `expo-crypto` + a vetted JS AES-GCM implementation, or a native module. |
| FUT-12 | **Region packs**: JSON lists of boards per country/region (SEA, EU, LATAM, Japan…) chosen in onboarding | M | S | `src/data/regions/*.json`, added through PRs. |

## Later / research

| ID | Feature | Value | Effort | Notes / deps |
|---|---|---|---|---|
| FUT-13 | **On-device model** (no key, offline), e.g. Gemma via llama.cpp (`llama.rn`) or `react-native-executorch` | M | L | 1.5–3 GB download. Too slow on ≤4 GB RAM phones. Quality check on form mapping first. Removes the F-Droid "NonFreeNet" anti-feature label for users who choose it. |
| FUT-14 | **iOS share extension** | M | M | `expo-share-intent` iOS target (App Groups) or `expo-share-extension`. |
| FUT-15 | **Translations** (i18n) | M | M | Extract strings, then add a library such as `i18next`. Community translations via Weblate (F-Droid friendly). |
| FUT-16 | **Home-screen widget**: today's follow-ups | L | M | Native widget work. |
| FUT-17 | **Tablet/landscape layouts** | L | M | Two-pane Workspace (web + copilot). |
| FUT-18 | **Provider fallback chain** (try provider B when A fails), like Kai 9000 | L | S | Builds on the `AiProvider` interface. |
| FUT-19 | **Salary normalisation** (currency conversion, ranges) | L | S | Needs an exchange-rate source, which is a network call and privacy cost. |
| FUT-20 | **Multiple profiles** (e.g. two career tracks) | L | M | Schema change: profile id. |

## Rejected (and why)
- **Scraping logged-in boards in the background** (Glints, Wellfound, LinkedIn): ToS, bot protection, and brittle. Use FUT-01 public feeds instead.
- **Hosted proxy with the maintainer's key** ("works with no key"): costs money, invites abuse, and breaks the local-first promise.
- **Analytics/crash reporting SDKs**: privacy, and F-Droid anti-features.
