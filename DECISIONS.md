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

## D-002 2026-10-23: Public v1 (F-Droid, BYOK) replaces the personal v0 handoff
- Task: architect handoff v1
- Change: all contracts rewritten (PRODUCT_SPEC.md, PLAN_REVIEW.md A-01…A-41). New deps `expo-secure-store` 58.0.2, `expo-document-picker` 58.0.4, `expo-localization` 58.0.5, `expo-share-intent` 9.0.0. Removed hardcoded profile, bundled resumes, `EXPO_PUBLIC_*` env, and the Gemini-only service. App id `io.github.tawhidumar9.jobify`. Schema v1 redefined (nothing had shipped).
- Why: owner decided to publish on F-Droid with bring-your-own-key AI and the high-value features.
- Impact: every task renumbered (T-001…T-049). The old v0 tasks are void.
- Approved by: owner (direction), architect (details)

## D-001 2026-10-22: Baseline architecture (v0, personal)
- Superseded by D-002.
