# Maestro E2E Flows

This directory contains Maestro end-to-end test flows for Jobify, testing user flows against a release or debug APK with the local mock AI server.

## Prerequisites

1. **Install Maestro CLI (v2.11+):**
   ```bash
   curl -fsSL "https://get.maestro.mobile.dev" | bash
   ```

2. **Start the Mock AI & Fixtures Server:**
   In a separate terminal on your development PC, start the mock server on port `8787`:
   ```bash
   npm run mock:server
   ```
   This serves both the AI mock API at `http://localhost:8787/v1` and the test job pages at `http://localhost:8787/fixtures/*.html`.

3. **Port Forwarding for Device Testing:**
   When running on a physical Android device connected via USB, forward the port to the device:
   ```bash
   adb reverse tcp:8787 tcp:8787
   ```
   (On an Android emulator, `adb reverse` also allows `localhost:8787` to resolve to the host machine).

4. **Install App on Device:**
   Ensure the Jobify APK (`io.github.tawhidumar9.jobify`) is installed on the connected device.

## Running Tests

Run the full suite:
```bash
maestro test e2e/flows
```

Or run an individual flow:
```bash
maestro test e2e/flows/01_onboarding.yaml
maestro test e2e/flows/03_analyze.yaml
```

## Flow Overview

- `_onboard.yaml`: Shared sub-flow that completes initial setup (OpenAI-compatible mock AI, Alex Rahman profile text, remote BD preferences).
- `01_onboarding.yaml`: Fresh install welcome, AI provider connection testing and validation, resume text parsing, preferences, and workspace launch.
- `02_workspace.yaml`: Job board pills selection persistence, deep linking to job URLs, address bar editing, and navigation controls.
- `03_analyze.yaml`: Fit and red-flag analysis on eligible, ineligible, and empty job pages.
- `04_improve.yaml`: Bullet rewrites, points to emphasize, cover note, and cold DM generation and copying.
- `05_autofill.yaml`: Web form auto-fill and saving generated answers to the answer bank.
- `06_staging.yaml`: Resume staging handling for text-only resumes.
- `07_tracker.yaml`: Logging applications from Copilot, editing status, and updating notes in Tracker.
- `08_insights.yaml`: Accessing the Insights screen from Tracker.
- `09_settings.yaml`: Job boards management, profile editing with unsaved changes dialog, and resume deletion.
- `10_backup.yaml`: Backup and restore screen controls.
- `11_offline.yaml`: Offline functionality of Tracker, Insights, and Settings.
- `_airplane_mode.yaml`: Optional sub-flow for emulator-only airplane mode toggling.
- `12_edge_cases.yaml`: Error handling for 429 rate limit, 500 server error, and invalid application IDs.
- `13_save_for_later.yaml`: Save job for later via toolbar-save, verifying in Tracker as Saved, and promoting to Applied via Analyze & Log.
- `14_not_a_job.yaml`: Detection of non-job pages showing the not-a-job card and disabled Log action.
