# BLOCKERS.md

When a task cannot be finished without guessing, add an entry and stop. Newest first. Keep resolved entries, and set Status to RESOLVED with a pointer to the DECISIONS.md entry.

Template:
```
## B-0xx YYYY-MM-DD: <short title>
- Task: T-0xx
- Status: OPEN | RESOLVED (D-0xx)
- What I was doing: <step>
- What happened: <exact error text / observed behaviour; paste full stack trace>
- What I tried: <attempt 1>, <attempt 2>
- Files involved: <paths>
- Smallest change that would unblock (suggestion only, not applied): <text>
```

---

## Pre-written fallback (for A-28; use only if T-001's sheet check fails)

If `@gorhom/bottom-sheet` 5.2.14 crashes (T-001) with gesture-handler 3.3.0, the architect's planned fallback is:
- Keep the `CopilotSheetProps` interface and every testID unchanged.
- Re-implement `CopilotSheet` with RN `Modal` (`transparent`, `animationType="slide"`, or `"none"` under reduce motion) containing a bottom-anchored panel at 92% height, a scrim `Pressable` that calls `onClose`, and a `ScrollView` body. Drop drag-to-resize, and keep the Close button and Android back.
- Remove `@gorhom/bottom-sheet` from `package.json`, delete its mock line in `jest.setup.ts`, and record D-0xx.

Do **not** apply this without an OPEN blocker entry and architect or user approval.
