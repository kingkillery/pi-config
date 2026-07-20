# High-Signal Findings

This file holds short, durable findings that should change the next workbook-refresh run.

## Verified Findings

### 2026-04-12 - The workbook core stabilized by 04-06

- Signal: the dashboard package already had its current operational shape by `04-06`.
- Why it matters: most refresh work should optimize the stable core instead of assuming the workbook is still being redesigned each day.
- Evidence: workbook lineage review found the dashboard, WoW tab, 14 drilldowns, staging tabs, and `RP` tabs present in `Field_Work_Report Official (Current Version 04-06) - action plan.xlsx`.

### 2026-04-12 - `Placard State Rollup` is the only structural addition after 04-06

- Signal: `Placard State Rollup` appears in `4-7` and persists through `4-8` and `4-9`.
- Why it matters: treat placard rollup as a versioned feature module, not part of the original dashboard core.
- Evidence: workbook lineage comparison showed 32 sheets on `04-06` and 33 sheets on `4-7`, with `Placard State Rollup` as the only added sheet.

### 2026-04-12 - The current 4-9 workbook now loads cleanly

- Signal: the current workbook is readable by `openpyxl` and no malformed XML was reproduced during this review.
- Why it matters: the prior parse error should not be treated as the active blocker for refresh automation unless it recurs on a new workbook version.
- Evidence: `load_workbook(..., read_only=True)` succeeded on `Field_Work_Report Official (Current Version 4-9-2026).xlsx`, and zip-wide XML parsing found no invalid XML entries.

### 2026-04-12 - `HOW TO REFRESH` can be generated from the refresh contract

- Signal: the note sheet structure is deterministic enough to rebuild from the script-owned CSV contract, workbook path, and current row counts.
- Why it matters: once generated, the sheet stops drifting away from the actual refresh path.
- Evidence: the sheet is plain text plus tables for report links and instructions, and those inputs already exist in the refresh script plus Salesforce manifest.

### 2026-04-12 - The two raw history tabs are deterministic append targets

- Signal: both history sheets already declare their metadata schema and append-only behavior.
- Why it matters: they can be populated on every refresh without human judgment.
- Evidence: `Raw Data (All Projects - Hist)` row 4 defines `LoadDate`, `SourceFolder`, `SourceFile`, `ImportTimestamp`, `RecordKey`; `Raw Data (Holds Only P2 Hist)` row 4 defines the full snapshot schema through `Task Log Summary`.

### 2026-04-12 - The script does not refresh the `RP` planning tabs

- Signal: `RP Rule Set`, `RP Action Plan`, and `RP Priority Queue` are present in the workbook but outside the current script-owned path.
- Why it matters: do not assume those tabs stay current after a refresh unless explicit automation work is added.
- Evidence: `scripts/refresh_field_work_report.py` updates raw imports, helpers, dashboard surfaces, staging metadata, and placard rollup, but never references `RP Rule Set`, `RP Action Plan`, or `RP Priority Queue`.

### 2026-04-12 - Utility portal ownership is split

- Signal: `Utility Portal Lookup` mixes manual mapping fields with formula-driven active utility extraction.
- Why it matters: refresh bugs should be isolated to either the manual map (`A:D`) or the derived helper side before editing the whole sheet.
- Evidence: workbook review showed `Utility Portal Lookup` column `F` populated by formulas from `Holds Only P2!AC`, while the workbook notes keep portal mapping manual in columns `A:D`.

### 2026-04-13 - `Mierins Remix` is a manual sidecar workbook with its own stable contract

- Signal: the coordinator-facing `Mierins Remix` workbook now has recurring tab and layout rules that are separate from the official refresh-script workbook.
- Why it matters: future edits should preserve the sidecar contract instead of treating it as an ad hoc scratch file.
- Evidence: workbook normalization established `Closeout Work` as the removed-from-`Main` project list, `NEW Items` with `Opportunity`, `State`, and `Hold Reason`, and `Overview (tables,etc)` with a single state scheduling summary plus a queue table.

### 2026-04-13 - `NEW Items` state should be validated from the master project export

- Signal: `NEW Items!State` is only trustworthy when joined against `All-Projects-All-Time.csv` or the sidecar workbook's own `Main!State` values.
- Why it matters: direct workbook edits can easily shift columns or formulas; validating against the master dataset prevents silent state drift.
- Evidence: the sidecar cleanup required reintroducing `State` as a dedicated column, validating all 60 `NEW Items` rows against the master export, and correcting a prior misaligned column insertion.

### 2026-04-13 - Official workbook field-service exceptions live on `Updated Mierins`, not only the sidecar workbook

- Signal: the official Field Work Report can undercount field-related work when `Updated Mierins` still routes M2-pending placard jobs to `FOT` or `Install crew` even after the sidecar `Mierins Remix` workbook has been corrected.
- Why it matters: the main workbook dashboard and any downstream staffing views should be fixed in the official workbook itself; updating only the sidecar leaves the operator-facing report inconsistent.
- Evidence: ten `Holds Only P2` projects were corrected by changing `Updated Mierins!AG:AH,Y` in the official workbook to `Field Service` plus an `M2 pending` note, and the dashboard `TOTAL FIELD-RELATED HOLDS` block was updated to include that explicit exception set.

### 2026-04-13 - The sidecar `Mierins Remix` tabs need a strict scheduled-date contract

- Signal: `NEW Items` can drift into a duplicate of `Main`, while `Closeout Work` can hold the right project set but the wrong column layout if it is not rebuilt from the official workbook.
- Why it matters: coordinators need one unambiguous split between active pending work and past-due review work, otherwise counts and add lists become misleading.
- Evidence: under the clarified rule (`Main` = pending scheduling or scheduled for today/future, `Closeout Work` = scheduled date before 2026-04-13), the sidecar workbook audited to `Main = 96`, `NEW Items = 0 true adds`, and `Closeout Work = 8` projects rebuilt from `Updated Mierins`.

### 2026-04-15 - PTO-submission language is not a removal signal in Mierins reviews

- Signal: notes like `applied for PTO`, `submitted`, or `system shows PTO received` can still represent active work if the same project later shows rejection, field corrections, missing items, utility review, or a return to `Holding`.
- Why it matters: removal decisions for `Main`, `Closeout Work`, or holding/open checks should require a terminal state, not intermediate submission language.
- Evidence: `1714CULL` had PTO-submission language but later returned to holding for field corrections, and `6550CAME` noted `system shows PTO received` while still missing required portal images and awaiting utility review.

### 2026-05-04 - `Holds Only P2!U` is the single source of truth for reason buckets

- Signal: the Dashboard drill list, the cross-tab block, the `R - <reason>` rollups, and the email's WoW Reason Movement must all derive from `Holds Only P2!U` (live formula or its frozen daily history). Any surface containing reason counts as hard-coded literals (other than the WoW snapshot itself) is stale.
- Why it matters: contradiction reports between the email and the dashboard almost always trace back to a literal that escaped formula refresh, not to genuine data disagreement. Audit the four surfaces against the live U Counter before debugging deeper.
- Evidence: 2026-05-04 audit found `Dashboard!E28:I41` cross-tab as hard-coded literals (227 total) while the drill list and email both showed 240; root-caused to a refresh path that didn't write the cross-tab. Added `write_dashboard_queue_reason_cross_tab` to the dashboard refresh and codified the audit playbook in `reason-bucket-contract.md`.

### 2026-05-04 - Salesforce placeholder text in Q/R/S folds to `(blank)`, not its own bucket

- Signal: when the Salesforce reason field literally contains the column header `REASON UNABLE TO SUBMIT`, treat it as an empty value. Both `classify_reason_bucket` and `reason_bucket_formula` carry an explicit fold rule, and `weekly_reason_delta_rows` re-folds historical snapshots on read so the email never resurrects the old category.
- Why it matters: the placeholder phrase carries no signal but used to surface as a top-N bucket and pollute the WoW comparison; downstream users were trying to action a category that meant "field blank". Removing the bucket required edits on the formula, the Python classifier, the read-side normalizer, the dashboard drill list, the `R -` rollup, and the WoW block compaction - the contract documents all of these.
- Evidence: `Holds Only P2!U` rewrite for all 240 rows, deletion of `R - REASON UNABLE TO SUBMIT`, and WoW block compaction folded latest=6/prior=4 into `(blank)` latest=8/prior=9; today's email no longer references the phrase anywhere in the body.

### 2026-04-27 - Fast validation should be the routine post-refresh gate

- Signal: routine refresh confidence comes from source-to-workbook row reconciliation and executive surface checks, not from running a second isolated workbook refresh every time.
- Why it matters: the full live guard is still useful after script or ownership changes, but it is too slow for every daily refresh and can time out on the live workbook assets.
- Evidence: `scripts/validate_field_work_report_outputs.py` checks all five raw tabs, workbook/source modified times, `Dashboard`, `WoW Comparison`, `FILE STAGING MAP`, `HOW TO REFRESH`, `Cycle Time Summary`, and `Cycle Time Dashboard` by reading the XLSX package directly.

## Promotion Rule

- Add new events to `run-history.md` first.
- Promote a finding here only if it changes the next run's decisions.
- Keep entries short, operational, and evidence-backed.
