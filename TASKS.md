### T-039 Settings hub, AI, profile, preferences, resumes
- **Goal:** the hub subtitles and the screens `settings/ai`, `profile`, `preferences`, `resumes`, `resume/[id]`, plus ResumeContentForm and `deleteResumePdf`.
- **Files:** `src/app/(tabs)/settings-hub.tsx`, `src/app/settings/{ai,profile,preferences,resumes}.tsx`, `src/app/settings/resume/[id].tsx`, `src/components/forms/ResumeContentForm.tsx`, `src/services/resumeFiles.ts` (`deleteResumePdf`), tests.
- **Depends on:** T-018, T-019, T-020.
- **Acceptance:**
  - [x] subtitles reflect the data. Remove AI → AI missing in Workspace (FAB "Set up AI"). Unsaved-changes confirm on back. Deleting a resume removes the file and sets applications' `resume_id` to NULL (their `resume_label` is kept). New imports never overwrite the profile.
- **Verify:** `npm run verify && npx jest src/app src/components/forms src/services`
