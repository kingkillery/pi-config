---
name: salesforce-dataset-refresh
description: Refresh the recurring Salesforce report exports that feed the Field Work Report and related daily reporting datasets. Use when the task involves downloading or refreshing the five contract CSVs in `General Salesforce Reports`, recovering a broken Salesforce export session, validating stale report files, or capturing new Salesforce roadblocks and fixes for future runs.
---

# Salesforce Dataset Refresh

Use this skill before refreshing the Field Work Report inputs from Salesforce. Keep the exact filenames and report URLs stable unless the workflow itself is intentionally being changed.

## Read This First

1. Read `references/report-manifest.md` for the five report URLs, report ids, and required output filenames.
2. Read `references/high-signal-findings.md` for the verified failure modes and recovery tactics already learned.
3. If the refresh will flow into the workbook, also read `.codex/skills/field-spreadsheet/SKILL.md`.
4. If the run will also produce a clean clawback-project update sheet, read `scripts/build_clean_clawback_updates_sheet.py`.
5. Default to `browser-harness` for the live Salesforce GUI flow when a full export is required.
   - If the harness is not already installed or attached, read `C:\Users\prest\Developer\browser-harness\install.md` first.
   - For normal usage after install, read `C:\Users\prest\Developer\browser-harness\SKILL.md`.
   - Always read `C:\Users\prest\Developer\browser-harness\helpers.py` because that is where the callable functions live.
   - When you open a setup or verification tab, make it the active tab so the operator can see it.
6. If Salesforce triggers email verification, read `.codex/skills/agentmail-cli/SKILL.md` and use the bundled AgentMail helper or confirmed CLI path with `AGENTMAIL_API_KEY` instead of asking the operator to paste the code manually when the inbox path is already available.

## Refresh Workflow

1. Check the current files under `General Salesforce Reports` and note which contract files are missing or stale.
2. Use an authenticated browser session for Salesforce report export work.
   - Prefer the authenticated CSV export URL path below when the real browser is already logged in or can be logged in quickly.
   - Prefer `browser-harness` over ad hoc browser control for the Lightning GUI path because it attaches to the operator's real Chrome profile and keeps the live flow visible.
   - Use `browser-use` only as a fallback when `browser-harness` is unavailable or the task explicitly needs a separate automation sandbox.
   - If the session is not trusted and Salesforce sends a verification code, fetch it from AgentMail before proceeding.
3. Refresh the reports in this order unless a specific file is requested first:
   - `all-ix-open-hold-honlyp2.csv`
   - `All-Field-Open-Hold.csv`
   - `IX-Placards-Photos.csv`
   - `All-Task-Logs.csv`
   - `All-Projects-All-Time.csv`
   Part 1 completion exports:
   - `part1-all-open-hold.csv` from report `00OUS00000AcJwk2AF` when the Part 1 All Spreadsheet needs its dedicated source instead of deriving from `All-Field-Open-Hold.csv`.
   - `design-queue.csv` from report `00OUS00000AcRpR2AV` for As Built and preinstall design corrections.
   These remain optional for a routine Part 2-only daily refresh, but they are required before signing off a strict Part 1 workbook refresh.
4. Save each export under the exact contract filename from `references/report-manifest.md`.
   - For full exports, treat the browser-downloaded CSV as the source of truth and promote it through `scripts\validate_salesforce_download.py` rather than a manual rename.
   - For optional Part 1 exports, use:
     `python scripts\validate_salesforce_download.py --workspace C:\Users\prest\Desktop\SPWR-Daily\Interconnection-Dash-2026 --report-key part1-all-open-hold.csv`
     `python scripts\validate_salesforce_download.py --workspace C:\Users\prest\Desktop\SPWR-Daily\Interconnection-Dash-2026 --report-key design-queue.csv`
   - When both optional Part 1 exports have just been downloaded, prefer the one-command finisher so promotion, workbook refresh, and strict Part 1 validation happen together:
     `python scripts\complete_part1_report.py --workspace C:\Users\prest\Desktop\SPWR-Daily\Interconnection-Dash-2026 --part1-source-file <path-to-part1-report.csv> --design-source-file <path-to-design-report.csv>`
5. If all five files are current and the user wants the workbook refreshed, run:

```powershell
python scripts\refresh_field_work_report.py --workspace C:\Users\prest\Desktop\SPWR-Daily\Interconnection-Dash-2026
```

6. **Post-refresh validation** (recommended before any downstream work):
   ```powershell
   python scripts\validate_ix_data_deep.py --workspace C:\Users\prest\Desktop\SPWR-Daily\Interconnection-Dash-2026
   ```
   Review `reporting/tracking/deep_validation_report.md` for CRITICAL issues. If temporal sequence violations, cross-dataset gaps, or impossible states are found, flag them to the operator before proceeding to workbook refresh, account scrub, or prioritization.

7. If the operator also wants a clean clawback update workbook, first create or reuse a scrubbed clawback CSV and then build the workbook:

```powershell
python -m scripts.scrub_clawbacks_notes <clawbacks.csv> --output-csv <scrubbed.csv>
python scripts\build_clean_clawback_updates_sheet.py <scrubbed.csv> --output-xlsx <clean-updates.xlsx>
```

7. Report which files changed, which were reused, and any blockers encountered.

## Export Rules

- Prefer stable, repeatable tactics over ad hoc clicking.
- For the recurring five-report contract, prefer authenticated CSV URL downloads over Lightning menu clicking after browser auth is confirmed.
- Prefer `browser-harness` for the GUI export path unless a stronger verified path exists.
- Treat Salesforce Lightning report pages as iframe-based flows.
- Re-read the live page state before each click in Lightning menus because rendered controls are position- and rerender-sensitive.
- Preserve the exact filenames expected by the workbook refresh script.
- Do not silently substitute alternate reports.
- Do not promote optional reports to required daily exports until the workbook importer and tests are updated in the same change.
- The Part 1 report (`00OUS00000AcJwk2AF`) currently validates with 29 live columns. Preserve the duplicate `IXP1 Application REF#` fields and the Part 1 reason fields used by the workbook selector: `IXP1 Rejection Reason`, `Request IXP1 Reason unable to submit`, `Receive & Process Reason unable to sub`, and `Prepare IXP1 Reason unable to Submit`.
- The design queue report (`00OUS00000AcRpR2AV`, As Built and preinstall design corrections) currently validates with seven live columns: `Project Name`, `Task Name`, `List`, `Actual Completion Date`, `Description of Design Correction`, `Reason for Correction`, and `Electrical FIN Received`. The workbook treats `List` as the design task status and `Actual Completion Date` as the completion field.
- If a UI export path breaks, inspect the live DOM and network before inventing a new workflow.
- Record every new blocker and verified workaround with `scripts/log_refresh_learning.py`.
- Do not trust `runReport` or best-effort Analytics API detail responses for `All-Task-Logs.csv` or `All-Projects-All-Time.csv`; those paths can truncate large datasets without matching the full CSV export.

## Fast Authenticated CSV Export Path

Use this path before Lightning GUI clicking when the task is the standard five CSV refresh.

1. Confirm or recover browser auth.
   - If the visible browser is logged out, use `browser-use --browser real --profile Default` to open a report URL and complete login.
   - If Salesforce prompts for `Verify Your Identity`, use the AgentMail workflow below and submit the code in the same visible tab.
2. Pull browser cookies from the authenticated real profile:

```powershell
browser-use --browser real --profile Default --json cookies get
```

3. Build a request session with the returned Salesforce/Force cookies and download each report from:

```text
https://ambia.my.salesforce.com/<reportId>?csv=1&exp=1&enc=UTF-8&isdtp=p1
```

4. Treat any `text/html` response, Salesforce login shell, or Verify Identity page as an auth failure, not as a report export.
5. Before overwriting contract files, copy the existing five CSVs into:

```text
General Salesforce Reports\backups\<YYYY-MM-DD_HHMMSS>\
```

6. Only promote a downloaded file after validating:
   - the response parses as CSV using `utf-8-sig` or `cp1252`
   - the header matches the expected report contract
   - the row count is nonzero and plausible versus the previous backup
   - the modified time aligns with the current run

This path was verified on 2026-04-27 for the full contract refresh and avoided the slower Lightning export menu flow.

## Email Verification

When Salesforce prompts with `Verify Your Identity`:

1. Read `.codex/skills/agentmail-cli/SKILL.md`.
2. Use the known inbox `flywheel@agentmail.to` unless the operator explicitly provides a different AgentMail inbox.
3. Read the AgentMail API key from `AGENTMAIL_API_KEY`.
4. Run the helper script to extract the newest unread Salesforce verification code:

```powershell
python .codex\skills\agentmail-cli\scripts\get_latest_code.py `
  --email flywheel@agentmail.to `
  --subject-regex "Salesforce|Verify|verification|identity" `
  --output code
```

5. Submit that code back into the active GUI session and continue the export flow.
6. If `browser-harness` or `browser-use` input or click actions lose the value because Salesforce rerenders the form or places the control inside shadow DOM, bypass the flaky widget and set the code with a single JS/eval operation in the page context, then submit immediately in the same turn.

Reliable submit pattern:

1. Locate the active verification input by visible label, `autocomplete`, or current focused element.
2. Set the value through the native input value setter, not by assigning a detached DOM property.
3. Dispatch `input` and `change` events after the value is set.
4. Trigger the form submit or verify button from the same script if possible.
5. Re-read the visible field state before assuming the submit succeeded.

Example browser-context workaround:

```javascript
(() => {
  const code = '123456';
  const input =
    document.querySelector('input[autocomplete="one-time-code"]') ||
    document.querySelector('input[inputmode="numeric"]') ||
    document.querySelector('input[type="tel"]') ||
    document.activeElement;
  if (!input) throw new Error('Verification input not found');
  const setter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    'value'
  ).set;
  setter.call(input, code);
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
  const button =
    [...document.querySelectorAll('button')].find((el) =>
      /verify|submit|next|continue/i.test(el.innerText)
    ) || null;
  if (button) button.click();
})();
```

If the verification widget is inside an iframe or shadow root, execute the same logic in the correct frame context rather than trying to type into the top-level page.

AgentMail CLI fallback pattern:

```python
import subprocess

code = subprocess.check_output(
    [
        "python",
        ".codex/skills/agentmail-cli/scripts/get_latest_code.py",
        "--email",
        "flywheel@agentmail.to",
        "--subject-regex",
        "Salesforce|Verify|verification|identity",
        "--output",
        "code",
    ],
    text=True,
).strip()
```

Use IMAP or direct SDK work only if the CLI path is unavailable. The CLI path is preferred because it is already installed on this machine and keeps the inbox access flow consistent.

Do not hard-code the API key in scripts, notes, or skill text.

## Known-Good UI Sequence

For `00OUS000005a5W92AI` (`all-ix-open-hold-honlyp2.csv`), a verified Chrome DevTools recording captured this successful export flow:

1. Open the report URL from `references/report-manifest.md`.
2. In the `Report Viewer` iframe, click `More Actions - Edit`.
3. Click `Export`.
4. Select `Details Only`.
5. Open the `Format` picker.
6. Change the format to `localecsv`.
7. Click the final `Export` button.

Expected behavior:
- Salesforce downloads a file named like `report1776032927102.csv` into the browser download folder.
- That downloaded file may need to be renamed into the contract filename in `General Salesforce Reports`.

Use this as the first-choice UI path for the Part 2 holds report before trying lower-confidence alternatives.

## Browser-Harness Path

When `browser-harness` is attached to the operator's real Chrome profile, the most reliable flow is:

1. Attach or verify the harness before touching Salesforce:

```powershell
@'
print(page_info())
'@ | browser-harness
```

2. Open an active tab for the report:

```powershell
@'
new_tab("<report url>")
wait_for_load()
'@ | browser-harness
```

3. Use `screenshot()` first to understand the visible state, then use `js(...)` or coordinate clicks for `More Actions - Edit`, `Export`, `Details Only`, the format picker, and the final `Export` button.
4. After every meaningful action, re-screenshot before assuming it worked.
5. Watch the browser download directory for the new `report*.csv`, then move it into the exact contract filename.

Useful `browser-harness` patterns:

```powershell
@'
print(screenshot())
'@ | browser-harness
```

```powershell
@'
print(js("document.title"))
'@ | browser-harness
```

Keep `helpers.py` open while working; that file defines the supported helpers and the expected calling style.

## Browser Selection And Recovery

- **Prefer Chrome for Salesforce automation when available.** The operator normally uses Comet for human browsing, so keep Salesforce refresh automation in Chrome to avoid taking over the human's active Comet tabs. Start harness calls without `BU_BROWSER` or with `BU_BROWSER=chrome`; use Comet only when Chrome is unavailable or the operator explicitly asks for it.
- **Both Chrome and Comet can be live**. The harness picks Chrome by default. If Chrome's remote-debug port is exposed but `DevTools is not live yet on 127.0.0.1:<port>` keeps firing — Chrome's CDP endpoint is stuck and restarting the daemon alone will not help. Switch to Comet with `BU_BROWSER=comet` for any harness call and the flow continues against the already-logged-in Comet session.
- **Stale websocket mid-run** (`no close frame received or sent`) means the daemon is the problem, not the browser. Restart once with:

```powershell
python - <<'PY'
import sys
sys.path.insert(0, r'C:/Users/prest/Developer/browser-harness')
from admin import restart_daemon
restart_daemon()
PY
```

  Then re-attach with `ensure_real_tab()` and re-navigate to the target report — the tab that was driving the export may have been the one that closed.
- **Do not print `page_info()` raw on Windows** — the harness prepends `🟢` to the active tab title, and cp1252 stdout will raise `UnicodeEncodeError` the moment that title is rendered. Pre-scrub with `title.encode('ascii', 'replace').decode('ascii')` or serialize with `json.dumps(info, ensure_ascii=True)` before printing.

## Menu Variance Across Reports

The Edit dropdown does not have the same items on every Lightning report:

- **Owned / editable reports** expose 6 items: `Save As`, `Save`, `Subscribe`, `Export`, `Delete`, `Add to Dashboard`. `Export` sits third from the bottom.
- **Read-only / shared reports** expose 4 items: `Save As`, `Subscribe`, `Export`, `Add to Dashboard`. `Export` sits second from the bottom.

Observed in the current Field Work Report refresh:

- 6-item menu: `all-ix-open-hold-honlyp2.csv`, `All-Field-Open-Hold.csv`, `IX-Placards-Photos.csv`, `All-Task-Logs.csv`.
- 4-item menu: `All-Projects-All-Time.csv`.

That means a single y-coordinate for "Export" is **not** portable across reports. Re-screenshot the open menu before clicking Export, or let the Format select heuristic below drive the flow and use coordinate clicks only for the Edit caret and the final blue submit button.

## Coordinate-Free Format Selection

The Format and Encoding pickers in the Export dialog render as native `<select>` elements that **are** reachable via JS even though the Edit caret and menu items are not. Set the format from JS instead of clicking the dropdown and picking `localecsv` by coord:

```python
js("""
(() => {
  function* walk(root) {
    yield root;
    const it = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
    let n; while (n = it.nextNode()) { if (n.shadowRoot) yield* walk(n.shadowRoot); }
  }
  for (const r of walk(document)) {
    for (const s of r.querySelectorAll('select')) {
      if ([...s.options].some(o => o.value === 'localecsv')) {
        const setter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set;
        setter.call(s, 'localecsv');
        s.dispatchEvent(new Event('change', {bubbles: true}));
        return true;
      }
    }
  }
  return false;
})()
""")
```

This avoids the native `<select>` dropdown, which often does not respond to coordinate clicks on its options in this page.

## Download Verification

Downloads from the Lightning export flow land as `report<unix_ms>.csv` in the operator's Chrome or Comet Downloads directory (`C:\Users\prest\Downloads` on this machine). Large reports (`All-Task-Logs.csv`, `All-Projects-All-Time.csv`) may take 30+ seconds and first appear as `.crdownload` placeholders.

**Use `scripts/validate_salesforce_download.py` instead of a manual move.** The script enforces all three checks automatically and promotes the file atomically:

```powershell
python scripts\validate_salesforce_download.py `
    --download-dir "C:\Users\prest\Downloads" `
    --report-key "all-ix-open-hold-honlyp2.csv" `
    --workspace "C:\Users\prest\Desktop\SPWR-Daily\Interconnection-Dash-2026"
```

If the exact downloaded filename is already known (e.g. the browser-harness returned it), pass it directly to skip the auto-detect step:

```powershell
python scripts\validate_salesforce_download.py `
    --download-dir "C:\Users\prest\Downloads" `
    --report-key "All-Task-Logs.csv" `
    --source-file "C:\Users\prest\Downloads\report1776032927102.csv" `
    --workspace "C:\Users\prest\Desktop\SPWR-Daily\Interconnection-Dash-2026"
```

The script checks, in order:

1. No `.crdownload` stub with a matching stem is still present (polls until clear or times out).
2. File size is stable for at least three consecutive polls.
3. Header row matches the expected contract columns from `reporting/contracts/report_manifest.json` (skipped for `All-Projects-All-Time.csv` whose headers are dynamic).

Only after all three checks pass does it atomically move the `report*.csv` to the exact contract filename under `General Salesforce Reports/`.

## Legacy Browser-Use Fallback

When `browser-harness` is unavailable and `browser-use` is driving a real Chrome profile, the fallback flow is:

1. Open the Lightning report URL.
2. Run `browser-use state` and resolve the current index for `More Actions - Edit`.
3. Click `More Actions - Edit`.
4. Run `browser-use state` again and resolve the current menu index for `Export`.
5. Click `Export`.
6. Run `browser-use state` again, click the current `Details Only` radio input, then resolve the current format `<select>`.
7. Set the format `<select>` value to `localecsv`.
8. Click the final `Export` button.
9. Watch the browser download directory for the new `report*.csv`, then move it into the exact contract filename.

Observed behavior on 2026-04-14:

- In real-browser mode against the local Chrome `Default` profile, the downloaded files landed in `C:\Users\prest\Downloads`.
- In local browser-use sessions without a real Chrome profile, downloads may instead land under `%TEMP%\browser-use-downloads-*`.
- `browser-use select <index> localecsv` worked reliably once the `Details Only` radio had already been selected and the live `<select>` index was re-read from the newest `state` output.
- On 2026-04-20, `browser-harness` was installed at `C:\Users\prest\Developer\browser-harness`, linked into `C:\Users\prest\.codex\skills\browser-harness\SKILL.md`, and patched for Windows loopback transport so it could attach to the real local Chrome session from PowerShell.

## Self-Improvement Loop

Use this loop every time the skill is exercised:

1. Start from `references/high-signal-findings.md`.
2. Attempt the best-known path first.
3. If blocked, try the next fallback path from the findings file.
4. After the run, append what happened:

```powershell
python .codex\skills\salesforce-dataset-refresh\scripts\log_refresh_learning.py `
  --outcome success `
  --summary "Short summary of what happened" `
  --signal "What mattered operationally" `
  --evidence "DOM, network, file, or error evidence"
```

5. If a blocker recurs and a workaround is now reliable, update:
   - `references/high-signal-findings.md`
   - `references/report-manifest.md` if the contract changed
   - this `SKILL.md` only if the main workflow should change

This is the promotion rule:
- append first
- promote only after the tactic is verified
- keep high-signal findings short and evidence-based

## High-Signal Findings To Preserve

- Salesforce report viewing works inside a `Report Viewer` iframe, so export controls may not appear in the top-level a11y snapshot.
- The `More Actions` menu is present in the iframe DOM and exposes `Export`, but Lightning export UI can fail with rendering or cross-origin/CSS issues.
- Browser-authenticated session recovery is more reliable than trying to reconstruct the export flow from scratch.
- The workbook refresh contract is defined by filenames, not by best-effort dataset similarity.
- A partially successful run is still valuable if the blocker and recovery evidence are captured.

## Validation

Before concluding a refresh task, verify:

- each required CSV exists at the expected path
- the file names exactly match the workbook contract
- the modified times align with the current refresh run when applicable
- if workbook refresh ran, `Dashboard`, `WoW Comparison`, and `FILE STAGING MAP` are included in the verification summary

## Self-Improving Contract

Contract version: `2026-05-05`.

Inputs:
- `task_request`: the operator request or failure pattern that activated this skill.
- `repo_context`: current repo-local exports, workbook state, utility files, run history, tests, or harness artifacts named by this skill.
- `constraints`: protected workbook binaries, staged Salesforce CSVs, local databases, `raw/`, credential boundaries, and any user-stated limits.

Tool surface:
- Use only the operational tools, files, and scripts named by this skill for the primary task.
- For behavior changes, route through `agent-self-improvement` and read `.codex/skills/agent-self-improvement/references/ix-salesforce-skill-contract.md` before editing this skill or its mirrors.
- Do not widen Salesforce, workbook, utility, inbox, or portal actions during evaluation unless the user explicitly requested that operational action.

Output contract:
- Return the skill's normal operational result plus any validation status the skill requires.
- When evidence is mixed, separate `VERIFIED`, `INFERRED`, and `UNKNOWN` claims.
- For skill-improvement work, report the changed behavior surface, evaluation command, verdict, and mirror/`pk-skills1` propagation status.

Observation and amendment loop:
- Persist durable failures or repeated surprises in this skill's `references/run-history.md` when it exists, otherwise in `.artifacts/agent-improvement/runs/<run_id>/`.
- Classify the failure before patching: trigger too broad/narrow, missing precondition, wrong tool order, loose output contract, or insufficient validation.
- Patch the smallest sufficient behavior surface, evaluate with the mapping in `ix-salesforce-skill-contract.md`, then promote, roll back, or leave a proposal-only artifact.

## Examples
`Refresh the Salesforce datasets for the Field Work Report and tell me which exports were stale.`

`Download the five recurring Salesforce report CSVs into General Salesforce Reports.`

`Recover the Salesforce export workflow, refresh the report files, and log any new roadblocks you hit.`
