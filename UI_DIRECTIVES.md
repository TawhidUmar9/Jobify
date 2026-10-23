# UI_DIRECTIVES.md: Jobify v1

Source of truth for how the app looks and behaves. Values come from `src/theme/tokens.ts`. If this file and the tokens disagree, the tokens win and the mismatch is a bug to log in BLOCKERS.md.

Inputs: the ui-ux-pro-max design-system generator (`design-system/jobify/MASTER.md`, run with `--persist`, variance 3, motion 2, density 7) and its native checklist `references/pro-rules.md`. I kept the generator's direction (Minimalism / Swiss: teal primary, one orange CTA, high contrast, functional). I replaced its web-only parts (Inter webfont, GSAP scroll reveals, hover states, landing-page structure) with native equivalents: the system font, no scroll animation, and pressed states.

Character: a quiet, dense utility. The job board is the content, the app's chrome stays thin, and forms are plain and fast to fill.

---

## 1. Design tokens

### 1.1 Color (semantic; components never use hex)

| Token | Light | Dark | Use |
|---|---|---|---|
| background | #F6F8F8 | #0B1312 | screen background |
| surface | #FFFFFF | #121D1C | bars, sheet, rows, cards on background |
| surfaceMuted | #EEF2F2 | #1A2726 | inactive pills, resume card, pressed bg |
| textPrimary | #0F1F1E | #E6EEED | primary text, icons |
| textSecondary | #4A5A59 | #A3B3B1 | secondary text, inactive tab |
| textDisabled | #6B7A79 | #7F8F8D | disabled labels/icons |
| border | #D5DEDD | #2A3A38 | decorative hairlines only |
| borderStrong | #7A8A88 | #6B7F7D | control outlines (chips, secondary buttons), sheet handle |
| primary / onPrimary | #0F766E / #FFFFFF | #2DD4BF / #04201D | active pill, primary buttons, active tab, links |
| primaryPressed | #0B5E58 | #5EEAD4 | pressed primary |
| accent / onAccent | #C2410C / #FFFFFF | #FB923C / #2A1205 | **Analyze FAB only** |
| accentPressed | #9A3412 | #FDBA74 | pressed FAB |
| success Bg/Text/Icon | #DCFCE7 / #14532D / #15803D | #0F2E1B / #86EFAC / #4ADE80 | eligible, offer |
| warning Bg/Text/Icon | #FEF9C3 / #713F12 / #A16207 | #2E2708 / #FDE047 / #FACC15 | unclear, OA/interview |
| danger Bg/Text/Icon | #FEE2E2 / #7F1D1D / #B91C1C | #3A1212 / #FCA5A5 / #F87171 | residency required, rejected, errors |
| scrim | rgba(15,31,30,.48) | rgba(0,0,0,.64) | sheet/modal backdrop |
| inverseSurface / onInverseSurface | #0F1F1E / #FFFFFF | #E6EEED / #0F1F1E | snackbar |
| progress | #0F766E | #2DD4BF | WebView progress bar |

Measured contrast (WCAG 2.1): textPrimary/background 15.9 (both modes). textSecondary on surface 7.25 light and 7.91 dark. onPrimary/primary 5.47 light and 9.18 dark. onAccent/accent 5.18 light and 7.82 dark. Tone text on tone background ≥ 8.0. borderStrong on surface 3.61 light and 4.07 dark. Tone icons on surface ≥ 4.9. Every text pair is ≥ 4.5:1, and every control boundary or meaningful icon is ≥ 3:1. `border` (1.76 / 2.02) is only allowed on decorative dividers.

### 1.2 Typography (system font: SF Pro on iOS, Roboto on Android; no custom fonts)

| Variant | Size / line height | Weight | Use |
|---|---|---|---|
| score | 28 / 34 | 700 | ATS score number |
| title | 20 / 26 | 600 | detail company name |
| headline | 17 / 22 | 600 | sheet title, section titles, state titles |
| body | 15 / 21 | 400 | paragraphs, reasons, DM text |
| bodyStrong | 15 / 21 | 600 | button labels, row titles |
| label | 13 / 18 | 500 | pills, field labels, section captions |
| caption | 12 / 16 | 400 | dates, hostnames, chips. **Minimum size in the app.** |

`allowFontScaling` is on everywhere. `maxFontSizeMultiplier` is 2 for body text and buttons, and 1.5 (`fontScaleCaps.compact`) for single-line controls: pills, chips, status chips, and tab labels.

### 1.3 Spacing (4-pt grid; only these values)
`xxs 4 · xs 8 · sm 12 · md 16 · lg 20 · xl 24 · xxl 32 · xxxl 40`. Screen gutters are `md` (16) on phones and `xl` (24) when the window width is ≥ 600. Section spacing within the sheet is `lg` (20).

### 1.4 Radii
`sm 6` (chips inside cards) · `md 10` (buttons, cards, snackbar) · `lg 16` (FAB, sheet top corners, modal cards) · `pill 999` (board pills, badges, status chips).

### 1.5 Elevation (Android `elevation`; iOS shadow `{opacity .12, radius = level*2, offsetY = level}`)
`none 0` · `card 1` (resume card: optional, flat is fine) · `fab 4` · `sheet 8`. Nothing else casts a shadow.

### 1.6 Motion
| Token | ms | Use |
|---|---|---|
| press | 100 | pressed opacity/ripple feedback starts within this time |
| fast | 150 | snackbar fade, chip state |
| base | 200 | modal fade |
| sheet | 250 | bottom sheet snap (gorhom `animationConfigs` duration 250, easing out) |
| snackbarVisibleMs | 4000 | snackbar dwell |

Under **Reduce Motion** (`AccessibilityInfo.isReduceMotionEnabled()` or Reanimated `useReducedMotion()`), every duration is 0. The sheet uses `animateOnMount={false}` and snaps without animation. Modals use `animationType="none"`. The board bar scroll uses `animated: false`. The WebView progress bar keeps updating because it carries information, not decoration.

### 1.7 Icons
lucide-react-native only. Stroke 2. Sizes: `sm 16` (inline badges), `md 20` (inside buttons), `lg 24` (toolbar, tab bar). Outline style everywhere, with no mixing of filled and outline icons. Icons next to visible text are decorative (`accessible={false}`, `importantForAccessibility="no"`). Icon-only buttons require `accessibilityLabel`.

---

## 2. Global mobile rules

1. **Safe areas.** Workspace uses `SafeAreaView edges={['top']}` and the tab bar handles the bottom. Onboarding screens use `edges={['top','bottom']}`. Scroll screens add `paddingBottom = insets.bottom + 16`. Sheet footers, modal panels, and the snackbar add `insets.bottom`. Nothing tappable sits under the status bar, notch, or gesture bar.
2. **Touch targets.** At least **48×48 dp on Android** and **44×44 pt on iOS**, using `minHeight`/`minWidth` or `hitSlop` (pills are 36 tall + 6 hitSlop). Targets are spaced at least 8 apart.
3. **Press feedback** within 100 ms: Android `android_ripple`, iOS opacity 0.7. Press states never change layout.
4. **Keyboard.** Form screens (onboarding, settings, modals with inputs) wrap content in `KeyboardAvoidingView` (`behavior="padding"` on iOS, `undefined` on Android, which uses `adjustResize`) around a `ScrollView` with `keyboardShouldPersistTaps="handled"`. The focused field and its error stay visible. The return key moves to the next field (`returnKeyType="next"`) and submits on the last one. Never wrap the WebView in `KeyboardAvoidingView`.
5. **Forms.** Every input has a visible label (never placeholder-only). Errors appear under the field after the first submit attempt, then live as the user types. On a failed save, scroll to and focus the first invalid field. Paste is allowed everywhere. Secret fields have a show/hide toggle. Inputs use the right keyboard (email, url, phone, numeric) and `autoComplete` hints.
6. **Pull-to-refresh** only on the Tracker list, plus the iOS WebView.
7. **Haptics** only per ARCHITECTURE §6.7.
8. **Gestures.** One per region. Every swipe has a button alternative (sheet X, toolbar back).
9. **Back** per ARCHITECTURE §8. Android back never exits while a sheet, dialog, or modal is open, or while the WebView can go back. Unsaved form changes + back → ConfirmDialog "Discard changes?".
10. **Destructive actions** always use ConfirmDialog with an explicit verb ("Delete resume", "Replace my data"), never an undo-less single tap.
11. **Platform conventions.** Standard (not large) titles. iOS back shows the previous title. Android uses a back arrow with no title and the Material ripple. Use the system font.
12. **Status bar.** Dark content in light mode and light content in dark mode.

---

## 3. Shared components

| Component | File | Spec (details in each doc comment) |
|---|---|---|
| Button | `ui/Button.tsx` | primary / secondary / ghost. Min height 48/44. Disabled at opacity 0.4. Loading spinner blocks presses. |
| IconButton | `ui/IconButton.tsx` | 24 icon in a 48/44 box. `accessibilityLabel` required. |
| StateView | `ui/StateView.tsx` | loading / empty / error block, centered, max width 320. Errors are announced. |
| Snackbar | `ui/Snackbar.tsx` | bottom, inverse colors, 4 s, max 2 lines, live region |
| TextField | `ui/TextField.tsx` | label + input (48 min, radius md, 1px borderStrong; 2px primary focused; 2px dangerIcon error) + helper/error |
| TagInput | `ui/TagInput.tsx` | input + Add, removable chips, max count, normalize |
| ToggleRow | `ui/ToggleRow.tsx` | label + description + Switch, row 56 |
| SegmentedControl | `ui/SegmentedControl.tsx` | 2–4 segments, single or multi, height 48 |
| ListRow | `ui/ListRow.tsx` | icon + title + subtitle + chevron/trailing, row 56 |
| ConfirmDialog | `ui/ConfirmDialog.tsx` | centered card over scrim, Cancel + confirm/destructive |
| Forms | `forms/*.tsx` | AiSettingsForm, ProfileForm, PreferencesForm, ResumeContentForm, BoardForm, AnswerForm (shared by onboarding and settings) |

---

## 4. Screens

Each screen lists purpose, layout, data, and **all states**. "n/a" means the state cannot occur, and the reason is given.

### 4.1 Workspace (`/`)
**Purpose:** browse job boards and start the copilot.
**Layout:** board bar (56, pills) → browser toolbar (48: back, forward, host/address button, reload, plus a 2 px progress bar) → WebView (flex) → Analyze FAB (bottom-right, 16 from the edges, above the tab bar; accent; Sparkles + "Analyze & Fill"; with no AI configured: Settings2 + "Set up AI") → copilot sheet overlay.
**Address bar:** tapping the host turns the toolbar into an input (url keyboard, prefilled, select-all) + Go + Cancel. Invalid input → inline "Enter a web address".
**Data:** `useBoards`, `WebNavState`, controller.

| State | What shows |
|---|---|
| loading (DB) | StateView "Loading job boards…" |
| empty (no boards, no link) | StateView empty (`workspace-no-boards`) "No job boards" / "Add one in Settings → Job boards, or tap the address bar to open a link." + "Manage job boards" |
| error (DB) | StateView error "Could not load job boards" / "The local database did not open. Try again." + "Try again" |
| page loading | progress bar. FAB disabled (unless it says "Set up AI"). |
| offline / site error | WebView area shows WifiOff 24 + "Can't load this page" / "You're offline or the site is down." + "Try again" (`webview-error-retry`). Pills and toolbar still work. |
| success | page, FAB enabled |
| disabled | FAB while busy. Back/Forward when unavailable. |

### 4.2 Onboarding (`/onboarding/*`)
**Purpose:** set up AI, profile, and preferences in under 3 minutes. Every step can be revisited later in Settings.
**Layout (all steps):** top: "Step N of 3" (caption, `onboarding-step`) + a 4 px progress bar (`primary`) on steps 1–3; title (title type); one-line explanation (body, textSecondary); scrollable form; bottom bar with secondary/ghost action on the left and primary on the right, above the safe area.

| Step | Content | Primary | Secondary |
|---|---|---|---|
| Welcome | App name, tagline "Your job search, in one place.", 3 icon bullets, privacy caption "No account. No tracking. Your data stays on this phone." | "Get started" | "Restore from backup" (ConfirmDialog → import) |
| 1 AI provider | `AiSettingsForm` (provider, key with show/hide, model, base URL, Test connection, privacy note) | "Continue" (saves; test not required) | "Skip for now" + caption "You can browse and track without AI" |
| 2 Profile | Resume label; "Import PDF" (Gemini only, else caption "PDF import needs Gemini"); "Paste resume text"; "Fill in manually"; then `ProfileForm` | "Continue" (validates) | none |
| 3 Preferences | `PreferencesForm` | "Finish" | Back |

| State | What shows |
|---|---|
| loading | step content replaced by a spinner while reading saved values |
| empty | n/a: forms start with defaults |
| error | Test connection: inline result line in dangerText with `AI_ERROR_MESSAGES`. Import: status line with the error and a "Try again" link. Save failure: snackbar "Could not save. Try again." |
| offline | Test/Import show the NETWORK message. Manual entry still works. |
| success | Test: "Connected" + CircleCheck. Import: "Resume added. Check the details below." and the form is prefilled. |
| disabled | "Import PDF" hidden when the provider can't read PDFs. "Paste" and "Import" disabled while parsing. Continue disabled while saving. |

### 4.3 Settings (`/settings-hub` and `/settings/*`)
**Hub:** ListRows in this order: AI provider (subtitle "Gemini · gemini-3.5-flash-lite" / "Not set up"), Profile (name), Resumes ("2 resumes"), Job preferences ("Remote · 3 roles"), Job boards ("8 boards"), Answer bank ("14 saved answers"), Backup, About.
**Sub-screens:**
- AI provider: `AiSettingsForm` + "Save" + "Remove key and settings" (destructive, confirm).
- Profile / Job preferences: the form + "Save". Unsaved back → confirm.
- Resumes: rows (label, "Alex_Rahman.pdf" or "Text only", "12 skills"), Trash with confirm, "Add resume" (bottom panel with the import options). Edit resume: `ResumeContentForm` + Save.
- Job boards: rows with ArrowUp/ArrowDown/Trash, tap to edit (BoardForm), "Add board".
- Answer bank: rows (question 2 lines, answer 2 lines, "Used 3 times"), tap to edit (AnswerForm), Trash, "Add answer".
- Backup: Export card ("Export backup" saves to the Jobify folder; ghost "Share…" opens the share sheet, D-006) + Import card (copy in the screen doc comment), result line.
- About: name, version, privacy statement (§6), "Source code", license name, "Open-source licenses".

| State | What shows |
|---|---|
| loading | StateView loading |
| empty | Resumes "No resumes yet" + Add. Boards "No job boards" + Add. Answers "No saved answers" + explanation + Add. |
| error | StateView error + Try again (load). Snackbar "Could not save. Try again." (write). |
| offline | Only AI test and resume import need network (NETWORK message). |
| success | Snackbars: "AI settings saved", "Profile saved", "Preferences saved", "Resume saved", "Resume deleted", "Board saved", "Board deleted", "Answer saved", "Answer deleted" |
| disabled | Save disabled while saving or with no changes. Move up/down disabled at the ends. |

### 4.4 Copilot sheet (overlay on Workspace)
**Layout:** BottomSheet with snap points 50% / 92%, scrim, top radius lg. Sticky header: "Copilot" + Re-analyze (RefreshCw) + Close (X). Body sections, 20 apart:
1. **Eligibility badge:** tone pill (CircleCheck "You can apply" / CircleHelp "Eligibility unclear" / CircleX "Likely not eligible") + reason.
2. **Red flags:** title "Red flags", rows TriangleAlert + title (`RED_FLAG_TITLES`) + detail. None → ShieldCheck "No red flags found".
3. **Match card:** score + "match", resume label + file name, reason. No resume → "Add a resume in Settings to get a recommendation".
4. **Skills:** "Matched skills" / "Missing skills" chips.
5. **Tailor card:** "Improve my application" button + caption "Suggestions, cover note and DM. Uses one more AI request." → loading "Writing suggestions…" → Emphasize list, bullet rewrites (original caption → suggested body + reason caption), Cover note + Copy, Cold DM + Copy.
6. **Fields:** "N of M fields ready to fill". Rows: label + source badge (Profile / Saved answer / AI draft) + value. AI draft rows have "Save to answers" → "Saved".
7. **Stale notice** (warningBg): "You left the analyzed page. Auto-fill is off until you analyze again."

**Footer:** Auto-fill (primary, Zap), Stage CV (secondary, FileDown), Log / Logged (secondary, BookmarkPlus/BookmarkCheck).

| State | What shows |
|---|---|
| loading | "Reading the page…" (scraping) / "Asking the AI…" (analyzing). Footer hidden. |
| empty (NO_CONTENT) | "Not enough text on this page" / "Open a job post or application form, then analyze again." + Try again |
| error | Scrape: "Couldn't read this page" / TIMEOUT "The page did not respond in 5 seconds." / SCRIPT_ERROR "This page blocked the reader." NO_PROFILE: "Add your profile first" / "Jobify needs your profile to judge fit and fill forms." + "Open profile". AI: title "Analysis failed", message = `AI_ERROR_MESSAGES[code]`, + "Try again", plus "Open AI settings" for NOT_CONFIGURED/AUTH/MODEL_NOT_FOUND/BAD_REQUEST. |
| offline | AI NETWORK message + Try again |
| success | sections 1–6 + footer |
| disabled | Auto-fill when 0 mappings or off the source page. Log after logging. Re-analyze while busy. Improve while loading. |

**StagingExplainer** (Android, first Stage CV): title "Choose a folder for resumes", body copy in the component, Cancel / Continue.

### 4.5 Tracker (`/tracker`)
**Layout:** header "Tracker" + right IconButton ChartColumn "Insights". List header: **Follow-ups due (N)** section (BellRing, up to 5 compact rows "Role · Company" / "Applied 8 days ago", "+N more below"). Rows (min 88): role (bodyStrong), "Company · Board", "12 Oct 2026 · Match 92 · eligibility icon · Follow up due", status chip on the right.
Status chip tones: Saved neutral, Applied primary outline, Interviewing warning, Offer success, Rejected danger, Withdrawn neutral.

| State | What shows |
|---|---|
| loading | "Loading applications…" |
| empty | "No applications yet" / "Analyze a job page in Workspace and tap Log to track it here." + "Go to Workspace" |
| error | "Could not load applications" / "The local database did not respond." + Try again |
| offline | n/a (local) |
| success | follow-ups section (when any) + list, pull to refresh |
| disabled | n/a |

### 4.6 Application detail (`/application/[id]`), status picker, follow-up picker
Sections, in order: company (title), role (headline), "Board · 12 Oct 2026"; status chip + "Change status"; "Follow-up: in 3 days" / "Follow-up: overdue" (warningText) / "No reminder" + "Change"; eligibility + red flags; "Resume: Backend · Match 92"; Notes (multiline TextField + "Save notes"); cover note + Copy; cold DM + Copy; "Open job post" (primary, full width); "Delete" (ghost destructive, confirm).
Pickers: bottom panels with 56-tall radio rows. Follow-up options: In 3 days / In 1 week / In 2 weeks / No reminder.

| State | What shows |
|---|---|
| loading | "Loading application…" |
| empty / not found | "Application not found" / "It may have been deleted." + "Back to Tracker" |
| error | "Could not load this application" + Try again |
| offline | n/a ("Open job post" shows the Workspace offline view) |
| success | sections |
| disabled | Save notes until changed. Pickers while saving. |

### 4.7 Insights (`/insights`)
Tiles (2 per row): Applications, Response rate ("18%", caption "8 of 42"), Interview rate, Offers. Weekly bars (8 weeks, primary). Tables "By resume" and "By job board": key | applied | responses % | interviews %, "Too few to compare" below 3. Footer caption: "Response = interview, offer or rejection. Calculated on this device."

| State | What shows |
|---|---|
| loading | spinner |
| empty | "No data yet" / "Log a few applications first." |
| error | "Could not load insights" + Try again |
| offline | n/a |
| success | as above |
| disabled | n/a |

### 4.8 Not found
"Page not found" / "This link does not match a screen in Jobify." + "Go to Workspace".

---

## 5. Navigation patterns and transitions
- Three bottom tabs: Workspace (Globe), Tracker (ListChecks), Settings (Settings). Labels always visible. No tab animation.
- Stack pushes use platform defaults. Onboarding steps use the default push, and the gate swap after Finish is instant.
- The sheet takes 250 ms, pickers and panels 200 ms (slide), and dialogs 200 ms (fade). Under reduced motion all are 0 ms.
- Each tab keeps its state when switching (the WebView page, the Tracker scroll position).

## 6. Copy (exact strings)

| Event | Text |
|---|---|
| Fill complete | `Filled ${filled} of ${filled + missing} fields` |
| Fill failed | `Auto-fill failed on this page` |
| Log ok / duplicate / error | `Logged to Tracker` / `Already in Tracker` / `Could not save. Try again.` |
| Copy | `Copied` |
| Answer saved / failed | `Saved to answer bank` / `Could not save answer` |
| Stage ok (Android) | `Resume saved to your Jobify folder. Cover note copied.` (drop the 2nd sentence if no cover note or the clipboard failed) |
| Stage ok (iOS) | `Save the resume from the share sheet.` (+ ` Cover note copied.` when copied) |
| Stage NO_FILE | `This resume has no PDF. Add one in Settings → Resumes.` |
| Stage no resume | `Add a resume in Settings first` |
| Stage PERMISSION_DENIED | `Folder access was not granted. Tap Stage CV to try again.` |
| Stage FILE_MISSING | `The resume file is missing. Re-import it in Settings → Resumes.` |
| Stage WRITE_FAILED | `Could not save the resume. Try again.` |
| Stage SHARE_UNAVAILABLE | `Sharing is not available on this device.` |
| Share with no link | `No link found in what you shared` |
| Status / reminder / notes | `Status changed to ${label}` / `Reminder updated` / `Notes saved`; failures `Could not save` |
| Application deleted | `Application deleted` |
| Backup export ok / errors | `Backup saved to your Jobify folder.` / PERMISSION_DENIED `No folder chosen. The backup was not saved.` / WRITE_FAILED `Could not create the backup file.` / SHARE_UNAVAILABLE (Share…) `Sharing is not available on this device.` (D-006) |
| Backup import ok | `Imported ${resumes} resumes, ${boards} boards, ${answers} answers, ${applications} applications` |
| Backup import errors | UNREADABLE `This file could not be read.` · WRONG_FORMAT `This is not a Jobify backup.` · NEWER_VERSION `This backup is from a newer Jobify. Update the app first.` · DB_ERROR `Import failed. Your data was not changed.` |
| Resume import errors | `PDF is larger than 10 MB` · `Choose a PDF file` · `A resume with this name exists` · AI messages |
| AI errors | `AI_ERROR_MESSAGES` (ARCHITECTURE §5.4) |
| **Privacy statement** (About, onboarding) | "Jobify has no servers and no account. Your profile, resumes, answers and applications are stored only on this device. When you tap Analyze, Improve, or import a resume, the page text and the relevant profile details are sent to the AI provider you configured, under that provider's terms. Your API key is kept in the system keystore and is never included in backups." |

Sentence case, no exclamation marks, no emoji.

## 7. Lists, images, performance
- Tracker and Answer bank use `FlatList` (`keyExtractor` id, `initialNumToRender 12`, `windowSize 7`). Tracker uses `getItemLayout` (88). Rows are wrapped in `React.memo` with stable `useCallback` handlers.
- Sheet field list: `.map` (≤80 rows) inside `BottomSheetScrollView`. Never nest virtualized lists.
- There are no images besides SVG icons and no remote images.
- Long text: rows 1–2 lines with an ellipsis. Detail, cover note, and DM are never truncated.

## 8. Screen sizes, orientation, accessibility
**Sizes:** small phone 360×640 dp / 375×667 pt and large phone 412×915 dp / 430×932 pt. Tablets run the phone layout (gutters 24 when width ≥ 600, forms max width 560 centered). **Portrait only.**
**Accessibility:**
- Every interactive element has a role and label (strings in doc comments). Pills use `tab` + selected. Pickers use `radio` + checked. Segments use `radio`/`checkbox`. Switches use `switch`.
- Focus order follows visual order. When the sheet opens, focus goes to its title (iOS `accessibilityViewIsModal`). When it closes, focus returns to the FAB.
- Color is never the only signal: badges, chips, and flags carry text. Tracker row icons are covered by the row label.
- At 200% font scale nothing is clipped. Single-line controls cap at 1.5×.
- Contrast per §1.1, checked in both modes. Reduced motion per §1.6. Errors are announced.

## 9. Do not
- Emoji anywhere (use lucide icons).
- Gradients, glassmorphism, blur, neon, or purple.
- The accent color on anything but the Analyze FAB.
- Shadows beyond the four elevation tokens.
- Marketing hero layouts, onboarding carousels, illustrations, or mascots.
- Skeleton shimmer.
- ALL CAPS text or text below 12.
- Hardcoded hex, sizes, or spacing in components.
- More than one primary button per view.
- Custom fonts, custom transitions, or spring overshoot.
- Placeholder-only inputs.
- `Alert.alert` for confirmations or success. Use ConfirmDialog and Snackbar.
- Lorem ipsum or "Coming soon".
- Mixed icon families or filled/outline mixing.

## 10. Pre-delivery checklist (T-047, T-048)
- [ ] Touch targets ≥ 48 dp / 44 pt. Pills use hitSlop.
- [ ] Press feedback ≤ 100 ms, with no layout shift.
- [ ] Safe areas respected. The sheet footer and onboarding bottom bar clear the gesture bar.
- [ ] Keyboard never hides the focused field or its error (every form screen).
- [ ] Light and dark checked on every screen and state. Text ≥ 4.5:1.
- [ ] 200% font: no clipping (onboarding, settings forms, rows, sheet).
- [ ] Reduced motion: sheet, panels, and dialogs are instant.
- [ ] TalkBack/VoiceOver: every control is labelled, and order and state are announced.
- [ ] Lucide outline only, stroke 2. No emoji.
- [ ] 360 dp and large phone, portrait.
