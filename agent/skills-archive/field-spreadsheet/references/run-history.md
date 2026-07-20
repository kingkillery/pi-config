# Run History

Append new workbook refresh learnings here with `scripts/log_field_spreadsheet_learning.py`.

Promote only the strongest recurring findings into `high-signal-findings.md`.

## 2026-04-12T17:58:32

- Outcome: `success`
- Summary: Synthesized the workbook lineage and upgraded the field-spreadsheet skill to use a dashboard contract, promoted findings, and run-history logging.
- Signal: Field Work Report refresh work now has an EvoSkill-style improvement loop: stable contract, feedback history, promoted findings, and explicit ownership boundaries for script-owned versus manual tabs.
- Evidence: Reviewed workbook lineage from 04-06 through 4-9; confirmed stable 33-sheet shape after 4-7, isolated Placard State Rollup as the only structural addition, verified the current 4-9 workbook loads cleanly, and captured that HOW TO REFRESH plus RP tabs are outside the current script-owned refresh path.

## 2026-04-12T19:31:29

- Outcome: `success`
- Summary: Automated HOW TO REFRESH and both raw history tabs in the live Field Work Report refresh path, then reran the workbook successfully.
- Signal: Same-day history replacement must use a retain-and-rewrite pass instead of per-row delete_rows to keep live workbook refresh times stable.
- Evidence: tests/test_refresh_field_work_report.py passed after the rewrite; scripts/refresh_field_work_report.py completed in 176s on 2026-04-12; workbook saved at Sheets and Dash/Field_Work_Report Official (Current Version 4-9-2026).xlsx with corrected Raw Data (All Projects - Hist) RecordKey values and regenerated HOW TO REFRESH contract rows.

## 2026-04-13T00:50:02

- Outcome: `partial`
- Summary: Strict regression audit against the 04-06, 4-7, 4-8, and pre-refresh 4-9 workbook lineage found structural parity and preserved operator/manual tabs, with one low-risk boundary leak into Temp-Copy-to-Mierins-remix.
- Signal: Keep Temp-Copy-to-Mierins-remix out of global formula-bound normalization if it is meant to remain fully manual-owned; otherwise formally reclassify it as partially script-touched.
- Evidence: Compared the current workbook to Sheets and Dash/Field_Work_Report Official (Current Version 04-06) - action plan.xlsx, 4-7 pre-refresh 2026-04-08.xlsx, 4-8 final, and 4-9 pre-refresh 2026-04-12.xlsx. Verified identical 33-sheet shape vs 4-7+ lineage, exact preservation of Utility Portal Lookup, RP Rule Set, RP Action Plan, and RP Priority Queue, intended upgrades to HOW TO REFRESH and both raw history tabs, and only 10 formula-range changes in Temp-Copy-to-Mierins-remix (H7:H10, H24:H29) tied to Task Log row bounds.

## 2026-04-13T01:04:25

- Outcome: `success`
- Summary: Excluded Temp-Copy-to-Mierins-remix from formula-bound normalization, restored its live workbook formulas to the pre-refresh baseline, and reran the regression audit cleanly.
- Signal: Manual-owned workbook tabs can now be certified against the pre-refresh baseline without Temp-Copy drift; keep that sheet in the normalization skip set unless ownership changes.
- Evidence: scripts/refresh_field_work_report.py skip_sheets now includes Temp-Copy-to-Mierins-remix; tests/test_refresh_field_work_report.py enforces the skip; pytest on tests/test_field_spreadsheet_skill.py and tests/test_refresh_field_work_report.py passed; workbook comparison after restoration showed zero diffs across Utility Portal Lookup, RP Rule Set, RP Action Plan, RP Priority Queue, and Temp-Copy-to-Mierins-remix versus the 4-9 pre-refresh workbook.

## 2026-04-13T12:28:21

- Outcome: `success`
- Summary: Documented the Mierins Remix sidecar workbook contract and removed the hard-coded 4-9 official-workbook assumption from the field-spreadsheet skill.
- Signal: Future workbook work should resolve the latest official workbook dynamically, treat Mierins Remix as a manual sidecar, preserve NEW Items/Closeout Work/Overview contracts, and validate NEW Items state from the master export.
- Evidence: Updated SKILL.md, current-workbook-map.md, dashboard-contract.md, and high-signal-findings.md after normalizing Field_Work_Report - Mierins Remix(Main) - updated.xlsx and validating NEW Items state against All-Projects-All-Time.csv.

## 2026-04-13T12:46:03

- Outcome: `success`
- Summary: Clarified in SKILL.md that the project maintains two workbook lanes: the official Salesforce-backed source-of-truth workbook and the Mierins working sheet.
- Signal: Future workbook tasks should explicitly distinguish between the official Field_Work_Report workbook as the main tracking/source-of-truth surface and the Mierins Remix workbook as the manual working surface.
- Evidence: Updated .codex/skills/field-spreadsheet/SKILL.md to name both workbook paths and route requests by workbook role.

## 2026-04-13T12:51:23

- Outcome: `success`
- Summary: Updated the official Field Work Report so M2-pending projects explicitly routed to Field Service are counted on the dashboard and corrected on Updated Mierins.
- Signal: When a staffing/routing fix starts from Mierins, sync the official workbook Updated Mierins tab and the dashboard exception count instead of stopping at the standalone sidecar workbook.
- Evidence: Field_Work_Report Official (Current Version 4-13-2026).xlsx backup plus Updated Mierins rows 28,30,33,73,74,76,77,78,80,81 and Dashboard cells E81:G82.

## 2026-04-13T13:53:04

- Outcome: `success`
- Summary: Re-audited the Mierins sidecar workbook to the scheduled-date rule and rebuilt Closeout Work while confirming NEW Items has no true adds.
- Signal: Treat Main as pending or today/future scheduled work, Closeout Work as scheduled-before-today review, and reconcile NEW Items against Main before using it as an add list.
- Evidence: Field_Work_Report - Mierins Remix(Main) - updated.xlsx backup plus Main=96, Closeout Work=8, NEW Items=0 true adds on 2026-04-13.

## 2026-04-14T20:25:54

- Outcome: `success`
- Summary: Ran the official workbook refresh after a full Salesforce export refresh and verified the key workbook contract cells on the updated official workbook.
- Signal: The live regression guard remains too slow for an interactive run; direct read-only workbook checks were fast and confirmed Dashboard, WoW Comparison, HOW TO REFRESH, FILE STAGING MAP, and Placard State Rollup contract cells after refresh.
- Evidence: refresh_field_work_report.py completed on 4/14/2026 with Holds Only P2=228, All Field Open Hold=926, Task Log=73135, All Projects All Time=14289, Placard State Rollup rows=18; workbook Field_Work_Report Official (Current Version 4-13-2026).xlsx modified 2026-04-14T16:26:31; Dashboard!A2=Last Updated: 4-14-2026.

## 2026-04-15T12:34:00

- Outcome: `success`
- Summary: Tightened the field-spreadsheet skill so Mierins status reviews do not treat PTO-submission language as removable without a terminal signal.
- Signal: For Mierins closeout or holding/open reviews, treat applied-for-PTO language as intermediate state only; if later notes show rejection, field corrections, pending utility review, or a return to Holding, keep the project active.
- Evidence: Updated .codex/skills/field-spreadsheet/SKILL.md guardrails and promoted a finding in high-signal-findings.md after misclassifying 1714CULL and 6550CAME during CSV review on 2026-04-15.

## 2026-04-20T12:01:34

- Outcome: `success`
- Summary: Refreshed the official Field Work Report workbook from the staged Salesforce exports and verified the dashboard stamp plus core import tabs.
- Signal: The main refresh path completed successfully on the 4-15-2026 workbook; the local guard temp workspace also wrote its refreshed workbook, but the wrapper process may take much longer than the direct refresh to exit cleanly.
- Evidence: Official workbook updated at 2026-04-20 11:52:50; dashboard A2 shows Last Updated: 4-20-2026; non-empty row counts: Holds Only P2 228, All Field Open Hold 926, IX Placards Photos 18, Task Log 73097, All Projects All Time 14288; temp guard workbook updated at 2026-04-20 11:53:36.

## 2026-04-20T13:18:04

- Outcome: `success`
- Summary: Instrumented refresh_field_work_report.py with stage timings, then optimized formula fill translation reuse and in-memory placard rollup state lookup while preserving the workbook contract.
- Signal: For this workbook, load_workbook/save_workbook_atomic remain the largest fixed costs, but formula-fill work can be cut materially with zero output change by reusing Translator objects instead of recreating one per cell.
- Evidence: Live temp-workspace timing after the change: total 244.34s; load_workbook 104.66s; save_workbook_atomic 44.51s; append_all_projects_history 40.06s; normalize_formula_bounds 22.06s; fill_formula_blocks 12.03s. Prior timed run showed fill_formula_blocks at 38.09s. python scripts/run_field_work_report_guard.py --workspace C:/Users/prest/Desktop/SPWR-Daily/Interconnection-Dash-2026 passed with 16 tests and a clean live regression check.

## 2026-04-23T15:36:02

- Outcome: `success`
- Summary: Split team totals (project date columns) from individual productivity (task logs). Email now cites user-authoritative numbers.
- Signal: Team P1/P2 subs + approvals + PTO MUST come from IXP1/IXP2 Application Submitted/Approved + PTO Granted to Customer date columns in All-Projects-All-Time.csv. Task-log counts miss milestone-automation events and diverge from coordinator Salesforce reports. This-week CSVs pulled at 12:23 lagged user's live report by 6-9 entries per metric due to post-noon activity.
- Evidence: User canonical 2026-04-20..04-23: P1 Sub 90, P1 Appr 42, P2 Sub 100, P2 Appr 58. My CSV-at-12:23 computed: P1 Sub 81, P1 Appr 36, P2 Sub 91, P2 Appr 50. Last week matched within ±3. Script updated at .codex/skills/field-spreadsheet/scripts/build_task_log_weekly_report.py with team_totals_from_project_dates() function + Summary tab split sections.

## 2026-04-27T22:50:59

- Outcome: `success`
- Summary: Added refresh validation guidance after the 2026-04-27 end-of-day source refresh.
- Signal: Workbook raw-row reconciliation should count only script-owned raw columns through the first blank row; formula-filled helper rows make ws.max_row misleading.
- Evidence: End-of-day validation matched all five source CSVs to workbook raw tabs when counted by raw import columns and correct start rows: P2 226, All Field 909, Placards 11, Task Log 74399, All Projects 17145.

## 2026-04-27T23:33:49

- Outcome: `success`
- Summary: Added a fast post-refresh verifier and fixed raw cleanup so stale Task Log rows with blank Project cells are removed.
- Signal: Use validate_field_work_report_outputs.py after routine refreshes; reserve the full live guard for script or ownership changes.
- Evidence: Fast verifier passed on Field_Work_Report Official (Current Version 4-27-2026).xlsx with 74,399/74,399 Task Log rows; pytest guard passed 31 tests.

## 2026-05-04T18:36:31

- Outcome: `success`
- Summary: Added reason-bucket-contract reference, removed REASON UNABLE TO SUBMIT placeholder bucket, made Dashboard cross-tab live-formula driven, hardened email reader to tolerate mid-block holes.
- Signal: Treat Holds Only P2!U as the single source of truth for reason buckets; audit dashboard/email contradictions against the live Counter using the playbook in reason-bucket-contract.md before changing any reason logic; never let the cross-tab drift back to hard-coded literals.
- Evidence: Sheets and Dash/Field_Work_Report Official (Current Version 5-4-2026).xlsx rewritten: 240 U formulas refreshed, R - REASON UNABLE TO SUBMIT removed, WoW Reason Movement compacted from 12 to 11 rows with placeholder folded into (blank) 8/9; IX_Daily_Email_2026-05-04.html regenerated cleanly; scripts/refresh_field_work_report.py adds write_dashboard_queue_reason_cross_tab and the read-side fold in weekly_reason_delta_rows; scripts/build_ix_daily_email.py extract_wow_rows now allows up to 2 blank rows mid-table.

## 2026-05-05T02:22:55

- Outcome: `success`
- Summary: Refreshed the 2026-05-05 official Field Work Report and validated all five raw tabs plus executive surfaces.
- Signal: Treat validate_field_work_report_outputs.py as the decision gate for routine daily refreshes even if the refresh CLI emits a misleading nonzero traceback; post-refresh report_status and fast validation confirmed the workbook landed correctly.
- Evidence: Workbook Field_Work_Report Official (Current Version 5-5-2026).xlsx modified 2026-05-05T02:19:08; backup created at pre-refresh 2026-05-05; fast validator PASS with 244/982/10/76092/17330 raw-row matches and 16/16 executive checks; report_status now marks workbook current vs 2026-05-05 exports.

## 2026-05-05T02:32:07

- Outcome: `success`
- Summary: Refreshed Field Work Report from current 2026-05-05 Salesforce exports and passed fast output validation.
- Signal: Routine daily refresh path succeeded with fast verifier; no stronger guard needed because no validation or ownership-contract failure appeared.
- Evidence: Workbook Sheets and Dash/Field_Work_Report Official (Current Version 5-5-2026).xlsx; validator reconciled raw rows 244/982/10/76092/17330 and passed 16/16 executive cell checks.
