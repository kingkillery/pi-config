---
name: field-spreadsheet
description: "Refresh, update, or explain the Field Work Report workbook. Use when working on the local Field Spreadsheet, Field Work Report, Excel workbook, or current Salesforce CSV exports, including targeted workbook changes and explanation of the sheet/formula/data setup."
---

# Field Spreadsheet

Use this skill for the workbook lanes under `Sheets and Dash`:

1. `Field_Work_Report Official (Current Version *.xlsx)`
   This is the main tracking workbook and the Salesforce-backed source of truth. The official workbook is the one the refresh script resolves and updates from the staged Salesforce CSV exports.
2. `Field_Work_Report - Mierins Remix(Main) - updated.xlsx`
   This is the working sheet used for coordinator review and manual operations such as `NEW Items`, `Closeout Work`, and `Overview (tables,etc)`.
3. `Part 2 Field Spreadsheet`
   This is the current daily field spreadsheet already produced by the existing refresh flow. In practice, this is the P2-focused hold and dashboard experience inside the official workbook.
4. `Part 1 All Spreadsheet`
   This is the generated Part 1 companion workbook. It recreates the Part 2 spreadsheet pattern for the Part 1 population, with special attention to pulling Part 1 hold reasons correctly and repeatably from Salesforce exports rather than manual cleanup.

When a request is ambiguous, treat `official`, `main tracking`, `source of truth`, `Salesforce-backed`, `Part 2 Field Spreadsheet`, or refresh requests as the official workbook path. Treat `Mierins`, `working sheet`, `NEW Items`, `Closeout Work`, or `Overview (tables,etc)` as the manual sidecar workbook path. Treat `Part 1 All Spreadsheet` as the generated Part 1 workbook lane that mirrors the Part 2 spreadsheet structure where it makes operational sense.

Prefer the automated refresh path over manual paste work when current CSV exports already exist in [General Salesforce Reports](C:\Users\prest\Desktop\SPWR-Daily\Interconnection-Dash-2026\General Salesforce Reports).

This skill is mirrored across `.codex/skills/field-spreadsheet/`, `.claude/skills/field-spreadsheet/`, `.agents/skills/field-spreadsheet/`, and `.pi/agent/skills/field-spreadsheet/`. After editing any one mirror, run `managed-skill-sync` (or replicate the diff) so the four trees stay byte-identical.

Known source CSV quirks (do not "fix" during a targeted update):
- `All-Field-Open-Hold.csv` ships with a duplicate `IXP1 Application REF#` header from Salesforce. The refresh script's column mapping depends on it.
- Several Salesforce exports are `cp1252`-encoded, not UTF-8. Reading them as UTF-8 will mangle non-ASCII names and notes.
- Salesforce report `00OUS000005a5W92AI` (`IX Holds Only - Part 2` -> `all-ix-open-hold-honlyp2.csv`) now defines 30 columns; 11 are upstream-stage reason fields and are blank for every P2-stage row as of 2026-05-04. Three of them share the literal header `Holding Reason` (Intro Call, M1, Site Survey). If those fields ever start carrying data on P2 tasks, the importer must map columns by position and disambiguate the three `Holding Reason` headers — header-by-name lookup will collide. Verified empty via Analytics API on 2026-05-04 (244 rows, 0 populated, 0 corroborations against Task Logs).
- `All-Task-Logs.csv` `Completed Date/Time` includes time (`7/3/2025, 6:45 AM`). Date-only parsers will miss these events and undercount task activity. Use `parse_datetime` with the `%m/%d/%Y, %I:%M %p` fallback when counting task activity or credit.
- Salesforce report `00OUS00000AcJwk2AF` is the operator-designated Part 1 open/hold report. Use it as the starting point for the planned `Part 1 All Spreadsheet`, but do not assume its exported reason fields are already sufficient until the Part 1 hold-reason columns are verified against real rows.

## Read This First

1. Treat [refresh_field_work_report.py](C:\Users\prest\Desktop\SPWR-Daily\Interconnection-Dash-2026\scripts\refresh_field_work_report.py) as the canonical refresh implementation.
2. Read [current-workbook-map.md](C:\Users\prest\Desktop\SPWR-Daily\Interconnection-Dash-2026\.codex\skills\field-spreadsheet\references\current-workbook-map.md) before explaining formulas, bucket logic, or downstream dependencies.
3. Read [dashboard-contract.md](C:\Users\prest\Desktop\SPWR-Daily\Interconnection-Dash-2026\.codex\skills\field-spreadsheet\references\dashboard-contract.md) before deciding which tabs should be refreshed automatically versus preserved as manual operational views.
4. Read [high-signal-findings.md](C:\Users\prest\Desktop\SPWR-Daily\Interconnection-Dash-2026\.codex\skills\field-spreadsheet\references\high-signal-findings.md) before changing the workflow or repeating a workbook investigation.
5. Read [reason-bucket-contract.md](C:\Users\prest\Desktop\SPWR-Daily\Interconnection-Dash-2026\.codex\skills\field-spreadsheet\references\reason-bucket-contract.md) before adding, removing, or reconciling P2 hold-reason categories or auditing dashboard-vs-email contradictions.
6. Read [testing-strategy.md](C:\Users\prest\Desktop\SPWR-Daily\Interconnection-Dash-2026\.codex\skills\field-spreadsheet\references\testing-strategy.md) when adding new workbook behavior or changing the skill itself.
7. Read [report_snapshot_versioning.md](C:\Users\prest\Desktop\SPWR-Daily\Interconnection-Dash-2026\reporting\runbooks\report_snapshot_versioning.md) before creating, preserving, or discussing morning/evening workbook variants.

## Route The Request Correctly

- Treat `Field Spreadsheet`, `Field Work Report`, `field report`, and `Excel workbook` as aliases for the same workbook task.
- Treat `Mierins Remix`, `NEW Items`, `Closeout Work`, and `Overview (tables,etc)` as the manual sidecar workbook path, not the official refresh-script path, unless the user explicitly asks to automate the sidecar workflow.
- Treat `Field_Work_Report Official (Current Version ...)` as the main tracking workbook and Salesforce-backed source of truth.
- Treat `Field_Work_Report - Mierins Remix(Main) - updated.xlsx` as the working workbook that should stay aligned to, but distinct from, the official source-of-truth workbook.
- If the user asks for a refresh and the expected CSVs are missing, stop the refresh path and report exactly which exports are missing.
- If the user asks for a targeted update, decide whether the real source of truth is the workbook formulas or the Python refresh script before editing.
- If the user asks for an explanation, prefer the workbook-map reference over ad hoc inspection unless the reference is clearly stale.

## Part 1 Expansion Contract

Use this contract when the request is to build or maintain the `Part 1 All Spreadsheet`.

1. Treat the current P2 workbook lane as the structural template: dashboard totals, reason buckets, aging, drilldowns, owner queues, and WoW comparisons should be recreated for Part 1 where they make business sense.
2. Treat Salesforce report `00OUS00000AcJwk2AF` (`All Open / Hold report for Part 1`) as the primary candidate feed for the Part 1 lane.
3. Before automating Part 1 counts, verify the export contains:
   `Project Name`
   `Task Name`
   `Owner`
   milestone date columns
   queue/list columns
   raw Part 1 hold-reason fields
4. Do not compress Part 1 reasons into a bucket table until the raw reason fields are verified on real exported rows. Part 1 is more likely than P2 to hide blockers in mixed stage columns, utility-specific text, or duplicate headers.
5. If the Part 1 export has duplicate headers, stage-specific reason columns, or sparse reason fields, map by column position and document the mapping the same way the P2 path documents its source quirks.
6. The acceptance bar for the `Part 1 All Spreadsheet` is not just row parity. The hold reasons must also pull through correctly enough to support dashboard totals and `R - ...` drilldowns without manual rebucketing.
7. When multiple Part 1 reason fields are populated, select one reason for the dashboard bucket inputs in this order: `IXP1 Rejection Reason`, then `Request IXP1 Reason unable to submit`, then receive/process unable-to-submit fields, then `Prepare IXP1 Reason unable to Submit`. The prepare reason is the fallback only when the higher-priority reason fields are blank.
8. The Part 1 dashboard reason table is Part 1-native. It must surface common selected reasons such as `Missing Portal Access`, `Missing UB`, `Customer`, `Utility`, and `System Size`, and append any new selected reason bucket observed in the current export.
9. Do not treat duplicate Part 1 project rows as automatic dedupe. `Prepare IX Part 1` can be reactivated by CAD/design, system-size, transformer, or change-order work while `Receive and Process IX Part 1` remains held. Before closing or suppressing a duplicate row, check latest task logs plus `Part 1 Design Queue` / `design-queue.csv`. If the later row carries the supported CAD/system-size blocker, keep it as the primary operational row and mark the extra prepare/request row for human review unless local evidence clearly proves it is stale.

## Reporting Improvement Loop

Use this loop whenever operator feedback says a workbook conclusion is misleading or not actionable.

1. Convert the feedback into one of four artifacts: a source-report requirement, a workbook formula/script rule, a test case, or an explicit non-actionable note.
2. Do not let urgency be driven by the bucket name alone. Use task logs, task status, age, and source fields to explain why a row is actionable.
3. Treat `signature needed` as normal follow-up unless task-log comments suggest refusal, legal escalation, cancellation, damage claims, or an uncooperative customer. In those cases, preserve the blocker but do not rank it as the most urgent solely because it needs signature.
4. Treat field/design/CAD/permit-pack dependencies pending more than 14 days after field completion as actionable and flag them.
5. Treat a design/CAD/permit-pack task that is closed while IX is still held for CAD/design/permit-pack as an actionable follow-up because IX may not have noticed the dependency cleared.
6. Every new feedback rule needs a short rationale column or note in the workbook output and a targeted test before being considered stable.

## Part 1 Design Queue Integration

The Part 1 workbook now creates `Part 1 Design Queue` and `Part 1 Design Summary` sheets. They are fed by optional `design-queue.csv` from Salesforce report `00OUS00000AcRpR2AV` (`As Built and preinstall design corrections`) when that file exists under `General Salesforce Reports`.

The queue sheet joins Part 1 CAD/design/permit-pack IX holds to matching Pre-Install and As-Built Design Correction rows by project/opportunity key and supports:
- count of missing design correction tasks that likely need to be created
- count of open matching design correction tasks
- count of completed design correction tasks where IX still remains held, which should be treated as possible missed Design-to-IX notification
- days since field was completed when the export provides a field-completion date
- visible rationale and action guidance for why a row was flagged or downgraded

The summary sheet rolls those queue rows into a design-specific hold-reason breakdown by raw Part 1 reason, correction task type, and follow-up flag.

Until `design-queue.csv` is exported, the sheet is still created with headers but may have zero rows. Do not treat zero rows as proof no CAD/design work exists unless the optional export is present and its headers have been validated.

When reviewing duplicate Part 1 rows, use the generated `Part 1 Design Queue` as supporting evidence, not as the only source of truth. Historical completed design corrections, transformer/system-size logs, or change-order notes can explain why a `Prepare IX Part 1` row reappeared even when the generated design queue only attaches the open design blocker to `Receive and Process IX Part 1`.

## Know What The Script Actually Owns

Use [dashboard-contract.md](C:\Users\prest\Desktop\SPWR-Daily\Interconnection-Dash-2026\.codex\skills\field-spreadsheet\references\dashboard-contract.md) when scoping refresh work.

- Treat these as script-owned refresh surfaces:
  `HOW TO REFRESH`
  `Holds Only P2`
  `All Field Open Hold`
  `Last Week Holds`
  `IX Placards Photos`
  `Task Log`
  `All Projects All Time`
  `Raw Data (All Projects - Hist)`
  `Raw Data (Holds Only P2 Hist)`
  `Task Log Rollup`
  `Dashboard`
  `WoW Comparison`
  `Placard State Rollup`
  `Cycle Time Summary`
  `Cycle Time Detail` (hidden)
  `Cycle Time Dashboard`
  `FILE STAGING MAP`
  `Utility Portal Lookup` helper formulas
  `R - ...` drilldowns
- Treat these as manual-owned operational surfaces unless the task explicitly expands automation:
  `Utility Portal Lookup` columns `A:D`
  `Updated Mierins` (script reads it for dashboard formula bounds; content is manually maintained)
  `RP Rule Set`
  `RP Action Plan`
  `RP Priority Queue`
  `Temp-Copy-to-Mierins-remix`

## Do A Full Refresh

Use this path when the user wants the workbook refreshed from the current exports.

1. Verify these files exist under `General Salesforce Reports`:
   `all-ix-open-hold-honlyp2.csv`
   `All-Field-Open-Hold.csv`
   `IX-Placards-Photos.csv`
   `All-Task-Logs.csv`
   `All-Projects-All-Time.csv`
   If any are missing, report the missing exports and do not invent a partial refresh unless the user explicitly asks for one.
   Then check CSV freshness — the validator only confirms the workbook is newer than the source CSVs, not that the CSVs themselves are current. If the newest CSV `LastWriteTime` is older than today (or older than ~6 hours during business hours), call out the staleness and ask whether to rerun `salesforce-dataset-refresh` first; do not proceed silently with yesterday's exports.
2. **Optional but recommended**: run deep validation to catch data-quality issues before they propagate into the workbook:
   ```powershell
   python scripts\validate_ix_data_deep.py --workspace C:\Users\prest\Desktop\SPWR-Daily\Interconnection-Dash-2026
   ```
   Review `reporting/tracking/deep_validation_report.md` for CRITICAL issues (backwards dates, missing projects, impossible states). If critical temporal or integrity issues are found, flag them to the operator before refreshing.
2. Run:

```powershell
python scripts\refresh_field_work_report.py --workspace C:\Users\prest\Desktop\SPWR-Daily\Interconnection-Dash-2026
```

3. Run the fast post-refresh verifier before opening the workbook:

```powershell
python scripts\validate_field_work_report_outputs.py --workspace C:\Users\prest\Desktop\SPWR-Daily\Interconnection-Dash-2026 --summary
```

This reconciles the five Salesforce CSV row counts to the workbook raw tabs, checks that the workbook is newer than the source exports, and confirms the executive-facing `Dashboard`, `WoW Comparison`, `Cycle Time Summary`, `Cycle Time Dashboard`, `FILE STAGING MAP`, and `HOW TO REFRESH` surfaces are readable and stamped. Prefer this verifier for routine daily refreshes because it reads the XLSX package directly instead of running a full isolated workbook refresh.

For a send/hold accuracy decision after refresh, run the daily review wrapper:

```powershell
python scripts\run_report_accuracy_review.py --workspace C:\Users\prest\Desktop\SPWR-Daily\Interconnection-Dash-2026
```

Use `reporting/tracking/report_accuracy_review_latest.md` for the verdict and `reporting/tracking/data_quality_action_queue_latest.csv` for the P0/P1 correction queue. A `HOLD` verdict means the workbook may still reconcile correctly, but current source data has a blocking P0 issue that needs review before report claims are sent.
The action queue's `delta_status` is `baseline` when no prior dated triage CSV exists, `new` when the finding was absent from the prior dated run, and `repeat` when it persists from the prior dated run.

4. Report:
   workbook path
   backup creation / reuse
   row-count summary from the script
   includes `Holds Only P2`, `All Field Open Hold`, `IX Placards Photos`, `Task Log`, and `All Projects All Time`
   dashboard `Last Updated` stamp at the top of `Dashboard`
   whether `Placard State Rollup` refreshed
   whether `Cycle Time Summary` and `Cycle Time Dashboard` refreshed
   the fast verifier result, especially raw row reconciliation and executive surface checks
   which manual-owned tabs were intentionally left alone
   any header mismatch or missing-file failure
5. Verify the visible outputs most likely to regress:
   `Dashboard`
   `WoW Comparison`
   `FILE STAGING MAP`
6. Reconcile source CSV row counts against workbook raw tabs using the script-owned raw columns, not `ws.max_row`.
   - `Holds Only P2`, `All Field Open Hold`, `IX Placards Photos`, and `Task Log` start at row 2.
   - `All Projects All Time` starts at row 1 because the refresh writes the CSV detail rows directly.
   - Ignore formula/helper columns when counting raw rows; formula fill can legitimately extend past the current source row count.
7. Run the full live guard only when changing refresh logic, workbook ownership boundaries, or after a fast-verifier failure:

```powershell
python scripts\run_field_work_report_guard.py --workspace C:\Users\prest\Desktop\SPWR-Daily\Interconnection-Dash-2026
```

## Portal Export & Change Detection

The pipeline now supports automated PowerClerk portal scraping and change detection for major utilities. This is separate from the workbook refresh but feeds the same operational picture.

**Working portals:** Ameren IL, PGE, Consumers Energy, PSE  
**Flagged:** DTE (bad credentials), Xcel (stale URL), Pacificorp (shared with PSE)

Run portal scraping:
```powershell
python scripts\scrape_powerclerk.py --all
```

Run portal change detection (after scraping):
```powershell
python scripts\changedetect_portal_exports.py --workspace C:\Users\prest\Desktop\SPWR-Daily\Interconnection-Dash-2026
```

Run the full daily pipeline (Salesforce refresh → IX change detect → stale review track → portal scrape → portal diff):
```powershell
python scripts\run_daily_ix_pipeline.py --workspace C:\Users\prest\Desktop\SPWR-Daily\Interconnection-Dash-2026
```

Operational runbook: `reporting/runbooks/powerclerk_portal_scraping.md`

## Dashboard & WoW Consistency Checks

After refresh, verify these cross-tab invariants before the data feeds the daily email:

1. **Hold reason completeness**
   - The sum of all hold reason counts on `Dashboard` and `WoW Comparison` must equal the total P2 hold count.
   - If displayed categories do not cover all projects, the workbook must expose an **"Other"** (or "Uncategorized") row with the remainder.
   - Do not let the email generator silently drop uncategorized projects.

2. **WoW trend explainability**
   - Total day-over-day change = sum of all reason deltas.
   - If top reasons increased but total decreased, the "Other" category must show the offsetting decrease.
   - An unexplained total change (where reason deltas do not sum to the total delta) indicates a formula or filter bug.

3. **Email cross-check**
   - Before generating `IX_Daily_Email_*.html`, compare workbook `WoW Comparison` totals to the email's hold reason table.
   - If `sum(email reason counts) < workbook Total Holds`, flag the gap explicitly or add the missing "Other" row.

4. **Approval rate denominator**
   - The `Dashboard` KPI table (if it shows approval rates) should document what the denominator represents.
   - If the email pulls approval rates from the workbook, ensure the denominator logic is preserved verbatim.

## Preserve Report Versions

Use this path whenever a refreshed workbook, daily email, or intra-day checkpoint needs to be preserved for later comparison.

1. Keep `Sheets and Dash` for the active operator-facing workbook and daily email outputs. Do not create long-lived `morning`, `evening`, `before-send`, or similar workbook variants there as the versioning mechanism.
2. Capture the current staged Salesforce CSVs with the workbook so the preserved workbook has a reproducible source basis:

```powershell
python scripts\report_snapshot_manager.py --workspace C:\Users\prest\Desktop\SPWR-Daily\Interconnection-Dash-2026 capture-field-work --label final --include-email
```

For intra-day checkpoints, use short labels such as `morning`, `midday`, `evening-1848`, `before-send`, or `post-corrections`. For late captures that belong to an earlier reporting day, pass `--as-of YYYY-MM-DD`.

3. Validate the latest snapshot before treating it as the audit checkpoint:

```powershell
python scripts\report_snapshot_manager.py --workspace C:\Users\prest\Desktop\SPWR-Daily\Interconnection-Dash-2026 validate-field-work
```

4. Use `report_status.py` to compare the latest snapshot's `source_set_sha256` with the current staged exports before sending or explaining a daily report.
5. Use `prune-field-work` only as a dry-run cleanup review. Do not delete or move loose historical workbooks unless they are manifest-covered, imported into a legacy snapshot area, or explicitly marked for manual review.

## Do A Targeted Update

Use this path when the user wants one bounded workbook or skill change.

1. Classify the request:
   raw import tab
   helper formula family
   dashboard / drilldown output
   utility portal mapping
   prioritization tab
   skill documentation
2. Decide the edit surface:
   workbook-only change
   refresh-script change
   both
3. Change the smallest viable surface.
4. Preserve fill-down formula patterns unless the user explicitly wants a redesign.
5. Verify the exact downstream tabs that depend on the changed range or rule.

## Weekly Task Log Report

Use this path when the user wants a weekly (or N-day) rollup of Task Log activity — totals, per-Subject and per-Assignee counts, Subject x Assignee crosstab, and Part 1 / Part 2 submission and approval splits.

1. Prerequisite: `General Salesforce Reports/All-Task-Logs.csv` must be current (refresh via `salesforce-dataset-refresh` first if stale).
2. Pick a window mode:

Current work week (Mon..today) and prior calendar week (Mon..Sun) are presets:

```powershell
python .codex\skills\field-spreadsheet\scripts\build_task_log_weekly_report.py `
  --workspace "C:\Users\prest\Desktop\SPWR-Daily\Interconnection-Dash-2026" --preset this-week

python .codex\skills\field-spreadsheet\scripts\build_task_log_weekly_report.py `
  --workspace "C:\Users\prest\Desktop\SPWR-Daily\Interconnection-Dash-2026" --preset last-week
```

Explicit start/end:

```powershell
python .codex\skills\field-spreadsheet\scripts\build_task_log_weekly_report.py `
  --workspace "C:\Users\prest\Desktop\SPWR-Daily\Interconnection-Dash-2026" `
  --start 2026-04-20 --end 2026-04-23 --label this-week
```

Rolling N-day window ending at --end (or today):

```powershell
python .codex\skills\field-spreadsheet\scripts\build_task_log_weekly_report.py `
  --workspace "C:\Users\prest\Desktop\SPWR-Daily\Interconnection-Dash-2026" --days 7
```

3. Output: `Sheets and Dash\Task_Log_Weekly_Report_<label>-_<start>_to_<end>.xlsx` (the `<label>-_` prefix is dropped when no label is supplied) with tabs:
   `Summary`, `Team Totals (dates)`, `Per-Person Breakdown`, `By Subject`, `By Assigned`, `Subject x Assigned`, `P1 vs P2 (logs)`, `Entries`.
4. The script prints a JSON blob with the P1/P2 submission and approval counts used for daily email drafts; treat `Part 2 Approvals (PTO)` as the PTO proxy when no dedicated PTO subject exists.

Rules:

- **Team totals (P1/P2 Submissions, Approvals, PTO) come from project DATE columns in `All-Projects-All-Time.csv`** (`IXP1/IXP2 Application Submitted`, `IXP1/IXP2 Application Approved`, `PTO Granted to Customer`). These match the coordinator-facing IX report (e.g. Salesforce report `00OUS000009ya3R2AQ` for Part 2s). Never use task-log counts as the team total — task logs miss milestone-automation events and reflect individual logging activity, not project outcomes.
- **Individual productivity (per-person counts, Subject x Assigned crosstab) comes from the task logs** in `All-Task-Logs.csv` with `Status = Completed` by default. Pass `--include-open` only when auditing total logging activity.
- "PTO" in team conversation typically maps to **Part 2 Approved** (`IXP2 Application Approved`). `PTO Granted to Customer` is a separate, later milestone — report both if uncertain.
- If the current-week team totals look ~5-10% low vs the user's Salesforce report, the `All-Projects-All-Time.csv` snapshot is stale — refresh via `salesforce-dataset-refresh` before rerunning the team section. Last-week totals normally match within ±3.
- Default reporting mode is Monday-to-today for in-flight week and prior Monday-Sunday for last-week compare. Use `--days 7` only when the user explicitly wants a rolling 7-day window.
- Part classification (for the task-log P1 vs P2 split) uses the `Related To` column substring match (`part 1` / `part 2`). If a utility workflow adds a new IX task name, confirm it classifies into the expected Part before trusting the split.
- The script reads with `cp1252` because several Salesforce exports are not UTF-8.
- Do not rename the output file to the contract name of the official workbook; this is a sidecar report, not a refresh of the main workbook.

## Self-Improvement Loop

Follow this loop whenever the workbook refresh path or the skill itself learns something durable:

1. Start from [high-signal-findings.md](C:\Users\prest\Desktop\SPWR-Daily\Interconnection-Dash-2026\.codex\skills\field-spreadsheet\references\high-signal-findings.md).
2. Validate the current workbook state against [dashboard-contract.md](C:\Users\prest\Desktop\SPWR-Daily\Interconnection-Dash-2026\.codex\skills\field-spreadsheet\references\dashboard-contract.md) before proposing new automation.
3. Prefer changing the refresh script or references over inventing repeated manual steps.
4. Append each verified run or blocker with:

```powershell
python .codex\skills\field-spreadsheet\scripts\log_field_spreadsheet_learning.py `
  --outcome success `
  --summary "Short summary of what changed or what was verified" `
  --signal "What should change the next run" `
  --evidence "Workbook/version/test/file evidence"
```

5. Promote a finding into `high-signal-findings.md` only when (a) it has been observed in at least two independent runs logged in `run-history.md`, AND (b) the logged entry attached concrete evidence (workbook version, validator output path, or test name). One-off observations stay in `run-history.md` until they recur.

## Guardrails

- Keep `Holds Only P2` as the primary derived-data spine for bucket counts and drilldowns.
- The `R - WAITING FOR M2 APPROVAL` drilldown carries two extra columns beyond the standard 15: `P: M2 Approved` and `Q: Finance Type` (Cash / Loan / PPA / Lease). Both are populated by formula via `ensure_m2_drilldown_finance_columns()` in the refresh script — do not strip them or shrink the R-drilldown fill range below `end_col=17`. Stale holds (M2 already approved while still in the M2 bucket) are highlighted blue; Cash jobs are highlighted green. If the M2 column appears empty after a refresh, verify that `All Projects All Time` was imported with the expected layout (Project Name in col M, Agreement Type in col X, M2 Approved in col BO).
- For a standalone shareable export of the M2-hold population with finance type and stale-hold flagging, run `python scripts\build_m2_hold_finance_breakdown.py`. Output lands in `Sheets and Dash/M2_Hold_Finance_Breakdown_<date>.xlsx` and is intended for direct email attachment.
- If a user wants a `Mierins Remix` staffing or routing decision reflected in the official Field Work Report, update the official workbook's `Updated Mierins` tab, not just the standalone sidecar workbook.
- Do not replace formulas with pasted values on dashboard, drilldown, or helper columns.
- Preserve the `Last Week Holds` snapshot behavior before overwriting current `Holds Only P2`.
- Prefer changing the Python refresh script for repeated weekly work instead of documenting manual repetition.
- Treat `Task Log` helper columns `J:O` and `Task Log Rollup!B:B` as part of the supported performance path; preserve last-log semantics when optimizing formulas.
- If counts look wrong, inspect `Holds Only P2!U:W` before changing summary tabs.
- If `TOTAL FIELD-RELATED HOLDS` is low versus the coordinator view, inspect `Updated Mierins!AG:Y` for projects explicitly routed to `Field Service` with `M2 pending` notes; those can sit under `WAITING FOR M2 APPROVAL` in `Holds Only P2` and need an explicit dashboard exception count.
- If utility values look wrong, inspect `All Field Open Hold` and `Holds Only P2!AA:AC` before changing portal lookup sheets.
- If workbook performance is poor, inspect `Holds Only P2!AH`, `Last Week Holds!AH`, `Task Log Rollup!B`, and `Task Log!J:O` before replacing formulas ad hoc.
- Do not assume `RP Rule Set`, `RP Action Plan`, or `RP Priority Queue` are refreshed by the script; verify ownership first.
- Do not treat `HOW TO REFRESH` as the canonical automation source when it disagrees with the script or references.
- In the `Mierins Remix` sidecar workbook, keep `Closeout Work` as the list of projects removed from `Main`; do not leave those projects duplicated in `Main`.
- In the `Mierins Remix` sidecar workbook, classify tabs by scheduled-date rule:
  `Main` = pending scheduling or scheduled for today/future;
  `Closeout Work` = scheduled date before today and needs review;
  `NEW Items` = true adds that are not already on `Main`.
- In `Mierins Remix`, keep `NEW Items` ordered as `Project Name`, `Opportunity`, `State`, `Hold Reason`, `Task Name`, `Primary Contact`, `Scheduled?`, `Reason`, `Scheduled Date`, and keep freeze panes at `D2`.
- If `NEW Items` and `Main` overlap, treat `NEW Items` as stale until reconciled against `Main` and the official workbook's `Updated Mierins` tab.
- If `Closeout Work` has the right project set but the wrong columns, rebuild it from the official workbook's `Updated Mierins` columns instead of trusting the existing sidecar tab layout.
- Validate `NEW Items!State` against `All-Projects-All-Time.csv` or the workbook's own `Main!State` values before trusting it.
- In `Overview (tables,etc)`, keep the left block `A:D` as the single state scheduling summary and `G:J` as the queue holding/open/total table; do not write overlapping ad hoc summaries into the right-side columns.
- For Mierins status/removal reviews, do not treat `applied for PTO`, `submitted`, or `system shows PTO received` as removable by themselves. If the same note or later context shows `rejected`, `missing item`, `pending field service`, `pending utility review`, `field corrections`, or a return to `Holding`, keep the project active.
- For closeout/removal calls, require an unambiguous terminal signal such as `PTO granted`, `safe to remove`, or confirmed absence from the current hold/open export; when notes conflict, prefer the latest explicit blocker over earlier progress language.
- Use live Salesforce / TaskRay as a last-resort check for field-correction rows only when local exports and workbook notes conflict or the user explicitly asks for it. If a project is in `Inspections Complete, Pending PTO`, list any TaskRay tasks or Project Events whose `List` is `Holding` or `Open` and ignore cancelled, complete, and change-order rows before deciding whether an old Field Service note is stale.

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
Refresh example:
`Refresh the Field Spreadsheet from today's exports and tell me what changed.`

Alias refresh example:
`Refresh the Field Work Report Excel workbook from the latest CSV exports.`

Targeted update example:
`Add a new blocker bucket to the Field Spreadsheet and update the matching dashboard drilldown.`

Pipeline-vs-workbook example:
`Fix the Field Work Report so weekly refreshes stop breaking the utility mapping.`

Explanation example:
`Explain the current formulas and which tabs are raw versus calculated in the Field Spreadsheet.`
