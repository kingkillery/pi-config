# Field Work Dashboard Contract

Use this reference to decide what belongs in the Field Work Report dashboard package and which surfaces should refresh automatically.

## Canonical workbook

- Current workbook: the latest `Sheets and Dash/Field_Work_Report Official (Current Version *.xlsx)` selected by `scripts/refresh_field_work_report.py`
- Stable lineage reviewed during this update (last verified 2026-05-13):
  - `Field_Work_Report Official (Current Version 04-06) - action plan.xlsx`
  - `Field_Work_Report Official (Current Version 4-7-2026) - pre-refresh 2026-04-08.xlsx`
  - `Field_Work_Report Official (Current Version 4-8-2026).xlsx`
  - `Field_Work_Report Official (Current Version 4-9-2026).xlsx`
  - `Field_Work_Report Official (Current Version 4-13-2026)` generation
  - `Field_Work_Report Official (Current Version 4-27-2026)` generation (cycle-time surfaces added)
  - `Field_Work_Report Official (Current Version 4-30-2026)` generation
  - `Field_Work_Report Official (Current Version 5-4-2026)` generation
  - `Field_Work_Report Official (Current Version 5-13-2026)` generation (current official workbook)
  - `Field_Work_Report Part 1 All (Current Version 5-13-2026)` generation (current Part 1 companion workbook)

## Version-lineage findings

- `04-06` already contained the dashboard, WoW comparison, staging map, 14 drilldowns, raw history tabs, and the three `RP` planning tabs.
- `4-7` added `Placard State Rollup`.
- `4-8` and `4-9` kept the same 33-sheet structure; the important changes were refresh behavior and live data, not tab churn.
- `4-27` added script-owned cycle-time surfaces for executive filtering: `Cycle Time Summary`, hidden `Cycle Time Detail`, and `Cycle Time Dashboard`.
- `5-13` added the generated Part 1 companion workbook path, strict Part 1 validation, and design queue evidence for CAD/design Part 1 holds.

## Surfaces that belong in the dashboard package

### Summary and operator control surfaces

- `Dashboard`
- `WoW Comparison`
- `HOW TO REFRESH`
- `Utility Portal Lookup`

### Raw import and snapshot surfaces

- `Holds Only P2`
- `All Field Open Hold`
- `Last Week Holds`
- `IX Placards Photos`
- `Task Log`
- `All Projects All Time`

### Derived operational surfaces

- `Task Log Rollup`
- `R - Field work`
- `R - WAITING FOR M2 APPROVAL`
- `R - Part 1 still open`
- `R - Missing FIN`
- `R - Missing Signature`
- `R - (blank)`
- `R - Customer Signature`
- `R - Witness Test`
- `R - TRANSFORMER UPGRADE (PT.2)`
- `R - Missing HOI`
- `R - CAD Update Needed`
- `R - MODIFICATION REQUEST`
- `R - Pending Witness Test`
- `Placard State Rollup`
- `Cycle Time Summary`
- `Cycle Time Detail`
- `Cycle Time Dashboard`
- `Part 1 Design Queue` (Part 1 derivative workbook only)
- `Part 1 Design Summary` (Part 1 derivative workbook only)

### Historical and staging surfaces

- `Raw Data (All Projects - Hist)`
- `Raw Data (Holds Only P2 Hist)`
- `FILE STAGING MAP`
- `Temp-Copy-to-Mierins-remix`

### Prioritization and action-planning surfaces

- `RP Rule Set`
- `RP Action Plan`
- `RP Priority Queue`

## Dashboard tab content contract

The `Dashboard` tab must continue to expose:

- A `Last Updated` stamp.
- Total `P2 Holds`.
- Split counts for `Field Task Open: Yes` and `Field Task Open: No`.
- Total `All Open/Hold Tasks P1 and P2`.
- Total `IX Placard Tasks`.
- The reason bucket table sourced from `Holds Only P2!U:U`.
- A cycle-time snapshot block linked to `Cycle Time Dashboard`, focused on active Open/Holding pipeline and completed-project cycle measurements.
- Drilldown entry points for these buckets:
  - `Field work`
  - `WAITING FOR M2 APPROVAL`
  - `Part 1 still open`
  - `Missing FIN`
  - `Missing Signature`
  - `(blank)`
  - `Customer Signature`
  - `Witness Test`
  - `TRANSFORMER UPGRADE (PT.2)`
  - `Missing HOI`
  - `CAD Update Needed`
  - `MODIFICATION REQUEST`
  - `Pending Witness Test`

The placeholder phrase `REASON UNABLE TO SUBMIT` is intentionally folded into `(blank)` and must not appear as a drill bucket. See `reason-bucket-contract.md` for the fold rule and the contradiction-audit playbook.

The Part 1 derivative dashboard must additionally expose a `Design Follow-Up` block that separates design-related Part 1 holds into missing design correction tasks, open corrections, completed corrections where IX is still held, field-completed-over-14-days cases, and unclear design statuses. `Part 1 Design Summary` is the operator-facing breakdown for those same rows by raw IX reason and Pre-Install / As-Built correction task type.

The Part 1 derivative dashboard reason table must use Part 1-native selected-reason labels, not the Part 2 dashboard list. It should include the known common Part 1 values and append any newly observed selected bucket from the current export so no current Part 1 reason is silently omitted from the dashboard.

## Refresh ownership

### Script-owned refresh surfaces

These are the current `scripts/refresh_field_work_report.py` responsibilities and should be treated as automated:

- Load the current workbook and create/reuse a dated pre-refresh backup.
- Regenerate `HOW TO REFRESH` from the live refresh contract.
- Snapshot `Holds Only P2` into `Last Week Holds`.
- Import the five Salesforce CSV-backed raw sheets.
- Append current-run history into:
  - `Raw Data (All Projects - Hist)`
  - `Raw Data (Holds Only P2 Hist)`
- Refill helper/formula regions on:
  - `Holds Only P2`
  - `Last Week Holds`
  - `IX Placards Photos`
  - `Task Log Rollup`
  - `Utility Portal Lookup` helper column
  - `R - ...` drilldowns
- Rebuild `Task Log` helper columns `J:O`.
- Rewrite `Task Log Rollup` and task-log summary formulas.
- Update `Dashboard` formulas and visible labels.
- Update `WoW Comparison` formulas and labels.
- Update `FILE STAGING MAP` metadata.
- Rebuild `Placard State Rollup`.
- Rebuild `Cycle Time Summary`, hidden `Cycle Time Detail`, and `Cycle Time Dashboard` from refreshed Open/Holding and all-project milestone data.
- Rebuild the Part 1 derivative workbook's `Part 1 Design Queue` and `Part 1 Design Summary` from `part1-all-open-hold.csv` plus optional `design-queue.csv`.
- Normalize cross-sheet formula bounds and force recalculation flags.

### Manual-owned or partially-owned surfaces

These currently exist in the workbook but are not refreshed by the script and should not be treated as auto-current unless explicitly re-owned:

- `Utility Portal Lookup` columns `A:D`
- `RP Rule Set`
- `RP Action Plan`
- `RP Priority Queue`
- `Temp-Copy-to-Mierins-remix`
- the standalone `Mierins Remix` sidecar workbook, including `NEW Items`, `Closeout Work`, and `Overview (tables,etc)`

## Day-over-Day Retention and Coverage Contract

The `WoW Comparison` sheet is rebuilt on every refresh by
`scripts/refresh_field_work_report.py` using `rewrite_daily_hold_comparison`.

### Source

`Raw Data (Holds Only P2 Hist)` — append-only history sheet.  Each refresh
appends one row per active hold with a `SnapshotDate` in column A (ISO format).

### Retention window

`DAILY_HOLD_COMPARISON_DAYS = 28` (constant in `refresh_field_work_report.py`).

On each refresh the script reads every unique snapshot date in
`Raw Data (Holds Only P2 Hist)` that falls between
`today − 27` and `today` (inclusive, i.e. up to 28 distinct calendar days)
and writes one summary row per date to `WoW Comparison` starting at row 7.

### Coverage guarantee

- **All available dates within the window must appear.**  If a date exists in
  `Raw Data (Holds Only P2 Hist)` and falls within the 28-day window, it must
  have a corresponding row in `WoW Comparison`.
- **Dates must be sorted in ascending (oldest-first) order.**  No date within
  the window may be skipped or appear out of sequence.
- **Dates older than 28 days are excluded.**  The script silently drops them;
  the guard does not flag their absence from `WoW Comparison`.

### Guard enforcement

`scripts/run_field_work_report_guard.py` enforces this contract via
`_wow_coverage_errors`.  The check:

1. Collects every unique `SnapshotDate` from `Raw Data (Holds Only P2 Hist)`
   rows ≥ 5 that fall within `[today − 27, today]`.
2. Reads the date values from `WoW Comparison` rows 7+, column A.
3. Reports an error for every expected date that is missing from `WoW Comparison`.
4. Reports an error if the dates in `WoW Comparison` are not in ascending order.

The guard skips the check entirely if no history rows exist yet (fresh workbook).

### Regression tests

`tests/test_field_work_report_guard.py` includes five targeted tests:

| Test | Scenario |
| --- | --- |
| `test_wow_coverage_fewer_than_28_days` | 5 days of history; all 5 appear in WoW → no error |
| `test_wow_coverage_more_than_28_days` | 35 days of history; only latest 28 in WoW → no error |
| `test_wow_coverage_missing_date_raises_error` | One expected date absent from WoW → error naming that date |
| `test_wow_coverage_unsorted_dates_raises_error` | WoW dates in descending order → sort error |
| `test_wow_coverage_no_history_skips_check` | No history rows yet → check skipped, no errors |



- Refresh the five CSV-backed raw sheets only through the canonical script path once exports are current.
- Never hand-edit `Dashboard`, `WoW Comparison`, or `R - ...` sheets to fix a data issue before checking `Holds Only P2`, `All Field Open Hold`, `IX Placards Photos`, and `Task Log`.
- Never hand-edit `Cycle Time Summary` or `Cycle Time Dashboard` to fix a cohort count before checking `All Field Open Hold` active population filters and `All-Projects-All-Time.csv` milestone dates.
- Treat `HOW TO REFRESH` as a user-facing note sheet, not the source of truth for automation behavior.
- Treat the `RP` tabs as operational planning outputs that need explicit automation work if the team expects them to stay live with each refresh.
- Treat the raw history tabs as append-only candidates for future automation, not current refresh outputs.

## Highest-leverage next automation targets

1. Generate `RP Priority Queue` from current workbook data instead of leaving it as a static manual artifact.
2. Generate the cluster block and execution-order narrative in `RP Action Plan` from the same prioritization contract.
3. Replace or automate `Temp-Copy-to-Mierins-remix` once the team agrees on deterministic templates for `TaskRay Note` and work-scope text.
