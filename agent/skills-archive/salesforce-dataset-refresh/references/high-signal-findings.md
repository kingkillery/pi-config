# High-Signal Findings

This file holds short, durable findings that reduce repeated exploration.

## Verified Findings

### 2026-04-12 - Lightning report export lives inside an iframe

- Signal: the report page is rendered inside a `Report Viewer` iframe, not directly in the top-level Lightning page.
- Why it matters: top-level snapshots can hide the real export controls and lead to wasted clicking.
- Evidence: live DOM inspection showed iframe source `reports/lightningReportApp.app?reportId=...`.

### 2026-04-12 - `More Actions` exposes `Export`, but the export UI can still fail

- Signal: the iframe DOM contains `Save As`, `Save`, `Subscribe`, `Export`, and `Delete` under `More Actions`.
- Why it matters: finding the menu is not the same as having a healthy export path.
- Evidence: iframe DOM inspection showed `ReportExportAction`; subsequent UI path surfaced an interrupting CSS error instead of a clean export dialog.

### 2026-04-12 - DevTools recording verified the exact Part 2 export sequence

- Signal: a recorded Chrome DevTools flow successfully exported the Part 2 holds report as CSV.
- Why it matters: this converts the export path from guesswork into a replayable UI recipe.
- Evidence: recording showed `More Actions -> Export -> Details Only -> Format=localecsv -> Export`, and the resulting download `report1776032927102.csv` matched the contract file hash for `all-ix-open-hold-honlyp2.csv`.

### 2026-04-12 - Cross-origin/CSS issues are a real failure mode in Lightning reports

- Signal: report export attempts can fail with rendering issues unrelated to auth.
- Why it matters: repeated blind retries do not improve success.
- Evidence: console showed an unsafe cross-origin asset load and the report frame displayed `Sorry to interrupt CSS Error`.

### 2026-04-12 - Session recovery through the browser is reliable enough to preserve

- Signal: Salesforce login plus email verification can be recovered in-session and should be treated as reusable operational knowledge.
- Why it matters: once the browser session is alive, reuse it instead of restarting auth.
- Evidence: browser-authenticated run reached the Lightning report viewer and exposed live report actions.

### 2026-04-12 - `sid` cookie alone was not enough for direct Analytics REST export

- Signal: a direct request to `/services/data/v66.0/analytics/reports/{reportId}?includeDetails=true` returned `401` even with the live `sid` cookie attached.
- Why it matters: do not assume browser session material trivially converts into a clean REST export path.
- Evidence: shell request with live `sid`, `sid_Client`, and `inst` cookies returned `401 Unauthorized`.

### 2026-04-12 - Filename contract is the hard boundary

- Signal: the workbook refresh path depends on exact CSV names.
- Why it matters: even a correct dataset under the wrong filename still breaks the operational refresh.
- Evidence: `scripts/refresh_field_work_report.py` and the field-spreadsheet skill both require the exact five filenames.

### 2026-04-12 - Salesforce CSV encoding is not consistently UTF-8

- Signal: some refreshed report exports parse as `cp1252` instead of UTF-8.
- Why it matters: validation or downstream tooling that assumes UTF-8 can produce false negatives or decode failures even when the download itself is correct.
- Evidence: `IX-Placards-Photos.csv`, `All-Task-Logs.csv`, and `All-Projects-All-Time.csv` parsed cleanly with `cp1252` after failing UTF-8-only reads.

### 2026-04-12 - `All-Field-Open-Hold.csv` ships with a duplicate header name

- Signal: the export currently includes duplicate `IXP1 Application REF#` columns.
- Why it matters: parsers that require unique field names, including PowerShell `Import-Csv`, can fail even when the file is otherwise valid.
- Evidence: raw CSV header inspection found one duplicated `IXP1 Application REF#` field in `All-Field-Open-Hold.csv` during the validated refresh run.

### 2026-04-14 - Large reports were truncated by non-GUI paths

- Signal: browser-session API attempts did not yield full datasets for the biggest recurring reports.
- Why it matters: `All-Task-Logs.csv` and `All-Projects-All-Time.csv` must come from the Lightning CSV export flow if the goal is a complete refresh.
- Evidence: validated GUI exports on 2026-04-14 produced `All-Task-Logs.csv` with 146,689 lines and `All-Projects-All-Time.csv` with 14,358 lines, replacing earlier smaller/truncated files from the direct attempt.

### 2026-04-14 - Real Chrome profile plus `browser-use state` was the stable control loop

- Signal: the durable path was to re-read `browser-use state` before each Lightning interaction, then click the fresh indices for `More Actions`, `Export`, `Details Only`, and the format select.
- Why it matters: Lightning re-renders invalidate stale indices, but the state-driven wrapper remained reliable enough to complete all five recurring exports.
- Evidence: a single real-browser run on the local Chrome `Default` profile refreshed all five contract files by repeatedly resolving live indices and selecting `localecsv` only after `Details Only` was active.

### 2026-04-14 - Real-browser downloads used the profile's normal Downloads folder

- Signal: `browser-use` in real-browser mode did not write these exports into the temporary browser-use download folders.
- Why it matters: the post-export promotion step should check `C:\Users\prest\Downloads` first when the run uses the local Chrome `Default` profile.
- Evidence: validated exports arrived as `report*.csv` files in `C:\Users\prest\Downloads` during the 2026-04-14 refresh, while the `%TEMP%\\browser-use-downloads-*` folders stayed unchanged for that session.

### 2026-04-21 - Edit dropdown menu length varies per report

- Signal: the "Edit" caret menu has 6 items on owned reports and 4 items on read-only reports, so the y-coordinate of `Export` shifts.
- Why it matters: a single coordinate for `Export` breaks silently — clicking the wrong row lands on `Add to Dashboard` or `Delete` and derails the flow. Re-screenshot the open menu or target by text before clicking.
- Evidence: during the 2026-04-21 refresh, `all-ix-open-hold-honlyp2.csv`, `All-Field-Open-Hold.csv`, `IX-Placards-Photos.csv`, and `All-Task-Logs.csv` rendered the 6-item menu (`Save As, Save, Subscribe, Export, Delete, Add to Dashboard`); `All-Projects-All-Time.csv` rendered the 4-item menu (`Save As, Subscribe, Export, Add to Dashboard`). Reusing the 6-item Export y on All Projects clicked `Add to Dashboard` and navigated the tab off the report.

### 2026-04-21 - Comet is a live fallback when Chrome DevTools is stuck

- Signal: the harness error `Google Chrome's remote-debugging page is open, but DevTools is not live yet on 127.0.0.1:<port>` does not always clear by waiting, restarting the daemon, or re-selecting the profile. Setting `BU_BROWSER=comet` reused the logged-in Comet session and completed the refresh.
- Why it matters: the skill should not block on Chrome recovery when a parallel Comet session is already authenticated. Switching browsers is faster than forcing Chrome's CDP back online.
- Evidence: 2026-04-21 refresh — Chrome stayed in the stuck state across daemon restarts and a fresh Chrome window; the same harness commands with `BU_BROWSER=comet` connected immediately and executed all five exports.

### 2026-04-21 - Native `<select>` in the Export dialog is reachable via JS

- Signal: the Edit caret and menu items sit in closed shadow DOM (JS walk finds 10 buttons on a page with 240 visible rows), but the Format and Encoding `<select>` elements inside the Export dialog are reachable through a shadow-DOM-descending walker.
- Why it matters: this lets the skill bypass the fragile native `<select>` dropdown click-then-pick sequence and set `localecsv` + dispatch `change` directly, which is portable across reports.
- Evidence: the walker consistently returned both selects with complete `options` arrays and accepted the `value` setter + `change` event during 2026-04-21 exports.

### 2026-04-21 - Unicode tab marker breaks cp1252 stdout on Windows

- Signal: `_mark_tab()` in `helpers.py` prepends `🟢` to `document.title`; any subsequent `print(page_info())` on Windows PowerShell/bash with cp1252 stdout raises `UnicodeEncodeError` and the entire harness call exits non-zero even though the browser action succeeded.
- Why it matters: the error masks successful actions and causes retries that compound the problem. Scrub titles with `encode('ascii', 'replace').decode('ascii')` or serialize with `json.dumps(..., ensure_ascii=True)` before printing.
- Evidence: multiple harness calls during the 2026-04-21 refresh failed with `UnicodeEncodeError: 'charmap' codec can't encode character '\U0001f7e2'` while the DOM mutation they asked for had already completed.

### 2026-04-21 - Download completion must be checked via `.crdownload` poll, not size alone

- Signal: large exports (`All-Task-Logs.csv` ~20 MB, `All-Projects-All-Time.csv` ~15 MB) take 10-30 seconds to finalize. A file present with stable bytes may still be `report*.csv.crdownload` for part of that window.
- Why it matters: moving the file into the contract path before download finalizes produces truncated contract CSVs that pass a surface mtime check but fail workbook refresh later.
- Evidence: during the 2026-04-21 run the Task Log export existed at 20,452,426 bytes while its `.crdownload` companion still held the lock for several seconds; waiting for the `.crdownload` to disappear and for size to stabilize produced a clean file that parsed to 176,851 lines.

### 2026-04-27 - Authenticated CSV URLs are the fastest full-contract path

- Signal: after Salesforce auth is restored in the real browser, the five recurring reports can be downloaded from `https://ambia.my.salesforce.com/<reportId>?csv=1&exp=1&enc=UTF-8&isdtp=p1` using the browser cookies.
- Why it matters: this avoids the slowest and most fragile part of the workflow: Lightning iframe menus, native export dialogs, and `.crdownload` polling for each report.
- Evidence: the 2026-04-27 end-of-day refresh used `browser-use --browser real --profile Default` for login, AgentMail for Verify Identity, then authenticated CSV URLs for all five files. The refreshed row counts were 226, 909, 11, 74,399, and 17,145, and workbook raw-row reconciliation matched every source CSV.

### 2026-04-27 - `agentmail.cmd` can misparse Salesforce Message-IDs on Windows

- Signal: Salesforce Message-IDs are wrapped in angle brackets, and the npm-generated Windows `.cmd` shim passes `%*` through `cmd.exe` without preserving those characters safely.
- Why it matters: `agentmail inboxes:messages get` can fail with a shell syntax error even though `agentmail inboxes:messages list` works, delaying verification-code recovery.
- Evidence: direct `agentmail.cmd ... --message-id "<...>"` failed during Salesforce Verify Identity recovery; calling the installed Node entrypoint directly returned the message body and verification code.

### 2026-05-06 - Direct `chrome.exe` URL launch is the last-resort full-contract refresh path

- Signal: invoking `& "C:\Program Files\Google\Chrome\Application\chrome.exe" "<csv-url>"` from PowerShell routes the navigation to the operator's already-running, authenticated Chrome `Default` profile. The `?csv=1&exp=1&enc=UTF-8&isdtp=p1` URL triggers an immediate CSV download to `C:\Users\prest\Downloads\report<unix_ms>.csv` — no menu clicking, no `<select>` walking, no CDP.
- Why it matters: this path survives when every higher-priority automation is blocked simultaneously. On 2026-05-06 the harness `.exe` shim pointed at a stale uv-Python symlink and refused to launch; `browser-use --browser real --profile Default` quietly spawned a fresh Chrome under `--user-data-dir=...\Temp\browser-use-user-data-dir-*` that had no Salesforce session; Chrome 130+ on the user's enabled remote-debug port rejected every WebSocket upgrade with HTTP 403 (Origin lockdown) and timed out on `/devtools/browser`; the `Cookies` SQLite was held with deny-all sharing so even Win32 `CreateFileW` with all three FILE_SHARE flags returned ERROR_SHARING_VIOLATION; the default browser was Comet, so `Start-Process <url>` opened in an unauthenticated profile. Direct `chrome.exe` invocation cleared all of those at once.
- Why it matters (cont): identifying the right downloaded `report*.csv` is reliable when the canonical first line of yesterday's backup CSV is used as an exact-match fingerprint — substring tokens like "Placard" can fail because the report's header doesn't always include the report's display name.
- Evidence: `.ix-agent-cache/refresh_via_chrome.py` orchestrated five sequential launches with `.crdownload`-aware polling and exact-first-line matching; the run promoted `all-ix-open-hold-honlyp2.csv` (61,437 b), `All-Field-Open-Hold.csv` (323,939 b), `IX-Placards-Photos.csv` (4,605 b), `All-Task-Logs.csv` (21,543,492 b), and `All-Projects-All-Time.csv` (16,322,787 b); the workbook fast verifier then reconciled 247/962/10/76,728/17,363 raw rows with 16/16 executive cells passing.
- Production script: `scripts/refresh_sf_csvs_via_chrome.py --workspace <repo>` (auto-snapshots existing files into a fresh `backups/<ts>/`, reads the canonical first line from the *live* contract file before overwriting, polls Downloads with `.crdownload` awareness, and rejects any download whose first line does not equal the canonical header). Use `--no-snapshot` if the caller has already snapshotted.
- When to reach for this: only after harness, browser-use real-profile, and authenticated-URL-with-pulled-cookies paths have all failed in the same session. Do not make it the default — it requires the operator to keep a Chrome window with a logged-in `Default` profile open, and it serializes downloads through one shared Downloads directory, which the polling logic must disambiguate via canonical-header equality.

### 2026-05-13 - Part 1 strict refresh requires the two optional exports

- Signal: `part1-all-open-hold.csv` and `design-queue.csv` are no longer theoretical inputs; the Part 1 derivative workbook validates strictly only when both are current.
- Why it matters: a routine Part 2 field refresh can proceed without them, but a Part 1 workbook signoff must include both exports or it will miss the design correction follow-up checks.
- Evidence: live 2026-05-13 exports validated with `part1-all-open-hold.csv` at 29 columns and `design-queue.csv` at seven columns. The regenerated Part 1 workbook produced 522 Part 1 rows and 60 design-related holds, split into open/completed/unclear correction signals.

### 2026-05-13 - Part 1 reason columns need priority selection

- Signal: multiple Part 1 reason fields can be populated on the same row.
- Why it matters: concatenating reason fields lets low-priority prepare text dilute or override the actual blocker. The workbook should select one reason: `IXP1 Rejection Reason`, then request, then receive/process, then prepare.
- Evidence: after priority selection, the live Part 1 export surfaced CAD corrections, system size, missing portal access, missing UB, customer, utility, and blank buckets directly on the Part 1 dashboard.

## Promotion Rule

- Add new events to `run-history.md` first.
- Promote an event into this file only if it changes the next run's decision-making.
- Keep entries short, operational, and evidence-backed.
