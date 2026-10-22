# COVERAGE.md: v1 requirement → task → test

Self-check: every requirement in `PRODUCT_SPEC.md` maps to at least one task (TASKS.md) and one test (TEST_PLAN.md).

| ID | Requirement (PRODUCT_SPEC §) | Tasks | Tests |
|---|---|---|---|
| R-01 | Onboarding gate, welcome (F1) | T-017 | AT-01, AT-05, EC-21 |
| R-02 | BYOK AI step: Gemini / OpenAI-compatible, test, skip (F1, A-03/A-04) | T-005, T-014–T-016, T-018 | AT-02, AT-03, AT-19, AT-20, EC-25 |
| R-03 | Resume import: PDF (Gemini), paste text, manual; profile merge (F1, A-07) | T-007, T-012, T-016, T-019 | AT-04, AT-06, AT-07, EC-23 |
| R-04 | Preferences (F1) | T-006, T-020 | AT-05, normalizer tests (T-006) |
| R-05 | Board bar, persistent sessions (F2) | T-008, T-023, T-024 | AT-08, AT-12 |
| R-06 | Browser toolbar + address bar (F2) | T-025 helpers, T-044 | AT-10, AT-13, UI-12 |
| R-07 | Share to Jobify (F2, A-11) | T-025 | AT-11, EC-26 |
| R-08 | Deep link `url` param (F2) | T-025 | AT-09, EC-18 |
| R-09 | Scrape page text and fields (F3) | T-021, T-022 | L2 scraper tests, EC-14, AT-26 |
| R-10 | Eligibility vs preferences (F3, A-09) | T-012, T-013, T-029 | AT-14, AT-15 |
| R-11 | Red-flag scan (F3, A-12) | T-012, T-013, T-029 | AT-14, AT-15, EC-22 |
| R-12 | Match score, resume pick, skills (F3) | T-012, T-029 | AT-14, T-012 fixtures |
| R-13 | AI error handling (F3) | T-014, T-015, T-028 | AT-17, AT-18, EC-02, EC-04 |
| R-14 | Improve: emphasize, rewrites, cover note, DM, copy (F4, A-08) | T-013, T-016, T-034 | AT-21, AT-22 |
| R-15 | React-safe auto-fill (F5) | T-032, T-033 | AT-23, AT-24, AT-26 |
| R-16 | Answer bank: save drafts, reuse, manage (F5, A-13) | T-009, T-033, T-041 | AT-25, AT-35 (settings pattern) |
| R-17 | Resume staging (F6, A-24) | T-035, T-036 | AT-27, AT-28, EC-08, EC-09 |
| R-18 | Log application, duplicates (F7) | T-010, T-030 | AT-29 |
| R-19 | Statuses, notes, delete, open job (F7) | T-037 | AT-32 |
| R-20 | Follow-ups due + reschedule (F7, A-14) | T-010, T-031, T-037 | AT-30, AT-31 |
| R-21 | Insights (F8, A-15) | T-011, T-038 | AT-33, AT-34 |
| R-22 | Settings: AI/profile/resumes/preferences (F9) | T-039 | AT-18, AT-36, AT-37 |
| R-23 | Settings: job boards (F9, A-17) | T-008, T-040 | AT-35 |
| R-24 | Backup export/import (F10, A-16) | T-042 | AT-38, AT-39, EC-24 |
| R-25 | About + privacy statement (§2) | T-043 | UI-01 |
| R-26 | Local-first, no secrets in DB, no logging of personal data (§2) | T-005, all AI tasks | AT-40, AT-41, contracts test |
| R-27 | Offline behaviour | T-046 + per-screen states | EC-01–EC-03 |
| R-28 | Accessibility, dark mode, font scaling, reduced motion | T-047, T-048 | UI-03–UI-08, UI-10, UI-11 |
| R-29 | F-Droid compatibility (§2, A-14, A-30) | T-049 | T-049 dependency + dex scans |
| R-30 | Build safety on a 16 GB machine (A-30) | all manual checks | ARCHITECTURE §15, AGENT_INSTRUCTIONS §6 |

## Gaps found and fixed during this self-check
1. **Gemini-only PDF import** would block OpenAI-compatible users at onboarding. Fixed: paste-text and manual paths (R-03, AT-03/04).
2. **AI-free use** was undefined. Fixed: Skip in onboarding, FAB "Set up AI", browsing/tracking work without AI (AT-03, AT-18, EC-13).
3. **The E2E onboarding cost** of system pickers: the shared `_onboard.yaml` uses the paste path, so no system UI is needed.
4. **Share intent before onboarding** was undefined. Fixed: ignored (EC-21).
5. **Deleting a resume used by applications**: FK `ON DELETE SET NULL` + `resume_label` snapshot (AT-37).
6. **Answer bank growth vs prompt size**: capped at 40 most-used (A-13, T-013).

## Accepted gaps
- AT-06, AT-12, AT-27, and AT-39 are manual (system pickers, real logins).
- No automated iOS E2E without a Mac.
- Real-provider prompt quality is checked once manually before release (T-049 smoke). Automation uses fixtures.
