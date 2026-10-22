# PRODUCT_SPEC.md: Jobify v1 (public release)

**Jobify** is a free, open-source Android app (iOS builds supported, Android first) that turns the job hunt into one workflow:
browse job boards with logins saved → check fit and red flags with your own AI key → fill application forms → track and follow up.
Everything is stored on the device. No account, no backend, no tracking.

This spec replaces the original personal plan (`jobify_mobile_implementation_plan.md`, kept locally and git-ignored because it contains private contact details). Decisions behind it are in `PLAN_REVIEW.md`. Deferred features are in `FUTURE.md`.

---

## 1. Who it is for
Job seekers who apply through many web job boards, often remote or international roles, and want help without handing their data to another SaaS. They are comfortable pasting an API key, or running a local model server.

## 2. Principles
1. **Local first.** All data lives in on-device SQLite. The only network calls go to the job sites the user opens and the AI provider the user configures.
2. **Bring your own AI.** Gemini or any OpenAI-compatible endpoint (OpenAI, OpenRouter, Groq, DeepSeek, Mistral, Ollama, LM Studio). The key is kept in the system keystore.
3. **Truthful automation.** The AI may only use the user's profile, resumes, and saved answers. AI-written answers are labelled "AI draft" before they are filled.
4. **Works without AI.** Browsing, tracking, follow-ups, and insights work with no key.
5. **F-Droid compatible.** Only free/open-source dependencies, with no Google Play Services or Firebase.

## 3. v1 features

### F1 Onboarding (first launch only)
1. Welcome: what Jobify does, the privacy promise, "Get started" / "Restore from backup".
2. **AI provider (step 1 of 3):** choose Gemini or OpenAI-compatible, enter key/model/base URL, test the connection. "Skip for now" is allowed.
3. **Profile (step 2 of 3):** import a resume PDF (Gemini), or paste resume text (any provider), or fill in manually. The AI pre-fills the profile and the user reviews and edits it.
4. **Preferences (step 3 of 3):** target roles, work modes, countries where they can work without a visa, sponsorship, time-zone overlap, minimum salary, companies to avoid.

### F2 Workspace: job boards in one place
- A pill bar of job boards (8 global defaults, fully editable), with one persistent WebView whose cookies keep the user logged in.
- Browser toolbar: back, forward, reload, and an address bar to open any link.
- **Share to Jobify** (Android): share a job link from any app and it opens in the Workspace.
- Deep link `jobify:///?url=…` opens any URL.

### F3 Analyze (AI-2): one tap on any job page
- Eligibility (you can apply / unclear / likely not eligible) with a reason, judged against the user's location and preferences.
- **Red flags:** location/work-permit limits, time-zone mismatch, unpaid trial work, no salary, salary below minimum, stale posting, blocked company.
- **Match score** 0–100, the recommended resume version, matched and missing skills.
- **Form mapping:** values for every fillable field, each labelled Profile / Saved answer / AI draft.

### F4 Improve my application (AI-3, on demand)
- Points to emphasize, up to 5 rewrites of resume bullets in the job's wording, a short cover note, and a cold DM, each with Copy.

### F5 Auto-fill + answer bank
- Fills mapped fields on React/Vue/plain forms (React-safe setter + events), with a green outline on filled fields.
- An "AI draft" answer can be saved to the **answer bank** with one tap. Saved answers are preferred next time.
- Settings → Answer bank: add, edit, delete.

### F6 Resume staging
- Copies the recommended resume PDF so it appears first in the site's file picker (Android: `Download/Jobify`; iOS: share sheet), and copies the cover note to the clipboard.

### F7 Tracker + follow-ups
- Log an application from the copilot (duplicate links rejected). Statuses: Saved, Applied, Interviewing, Offer, Rejected, Withdrawn.
- **Follow-ups:** each Applied job gets a reminder 7 days later. A "Follow-ups due" section sits at the top of the Tracker, and the reminder can be changed per job (3 days / 1 week / 2 weeks / none). These are in-app reminders. System notifications are in FUTURE.md.
- Detail screen: status, reminder, notes, cover note/DM with Copy, open job post, delete.

### F8 Insights
- Totals, response rate, interview rate, offers, applications per week (8 weeks), and response/interview rates by resume version and by job board. Shows which resume works best.

### F9 Settings
- AI provider, profile, resumes (import/paste/edit/delete; multiple versions), job preferences, job boards (add/edit/delete/reorder), answer bank, backup, and about.

### F10 Backup
- Export everything (except the API key and PDF files) to a JSON file via the share sheet. Import replaces the local data after a confirmation. The file is unencrypted in v1, and the UI says so.

## 4. Out of scope for v1 (see FUTURE.md)
Job feed inbox and background search, system notifications, on-device models, iOS share extension, tailored resume PDF export (JSON Resume), cover-letter templates, fillers for common application systems (Greenhouse, Lever, Ashby…), interview prep, contacts/referrals, email parsing, region packs, translations, encrypted backups, widgets, tablet layouts.

## 5. Success criteria for v1
- A new user can go from install to an analyzed job page in under 3 minutes with a Gemini key.
- On the fixture form page, auto-fill fills 5/5 fields and the page's own state updates (React-safe).
- No crash in the Maestro suite on Android API 30 (small phone) and API 36 (large phone).
- Release APK contains no Google Play Services or Firebase classes (T-049 scan).
