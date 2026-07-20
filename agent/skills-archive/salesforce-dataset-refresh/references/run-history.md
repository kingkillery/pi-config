# Run History

Append new operational learnings here with `scripts/log_refresh_learning.py`.

Promote only the strongest recurring findings into `high-signal-findings.md`.

## 2026-04-12T16:28:56

- Outcome: `partial`
- Summary: Recovered Salesforce auth, reached live report actions, but Lightning export UI failed before a clean CSV download path was established.
- Signal: The report export controls are reachable inside the iframe, but the export path can still be blocked by UI rendering failures unrelated to credentials.
- Evidence: Authenticated Lightning report viewer loaded; iframe DOM exposed ReportExportAction and Export menu item; console surfaced cross-origin asset warning and the report frame displayed Sorry to interrupt CSS Error.

## 2026-04-12T16:30:33

- Outcome: `success`
- Summary: Validated the recorded Chrome DevTools export flow for the Part 2 holds report.
- Signal: The exact UI sequence now has replay evidence and produces the expected CSV payload.
- Evidence: Recording showed More Actions -> Export -> Details Only -> Format=localecsv -> Export; downloaded report1776032927102.csv matched all-ix-open-hold-honlyp2.csv by SHA256.

## 2026-04-12T16:40:10

- Outcome: `partial`
- Summary: 2026-04-12: all five Salesforce CSVs refreshed successfully, but workbook refresh failed on load_workbook for the current 4-9-2026 workbook.
- Signal: Current workbook contract file Field_Work_Report Official (Current Version 4-9-2026).xlsx is not readable by openpyxl in refresh_field_work_report.py, so dataset refresh is healthy but workbook automation is blocked downstream.
- Evidence: refresh_field_work_report.py failed at load_workbook(workbook_path) with xml.etree.ElementTree.ParseError: not well-formed (invalid token): line 73066, column 100 while targeting Sheets and Dash\\Field_Work_Report Official (Current Version 4-9-2026).xlsx

## 2026-04-12T16:48:30

- Outcome: `success`
- Summary: Validated that the five refreshed Salesforce report files are present, parseable, and aligned to the current contract filenames.
- Signal: the refresh skill is now grounded in a full validated export set, with known quirks captured instead of treated as failures.
- Evidence: raw CSV validation confirmed `all-ix-open-hold-honlyp2.csv` (228 rows), `All-Field-Open-Hold.csv` (912 rows, duplicate `IXP1 Application REF#` header), `IX-Placards-Photos.csv` (16 rows, `cp1252`), `All-Task-Logs.csv` (72,203 rows, `cp1252`), and `All-Projects-All-Time.csv` (14,249 rows, `cp1252`).

## 2026-04-12T17:06:09

- Outcome: `success`
- Summary: Validated the current 2026-04-12 Salesforce export set and reused it without re-downloading because all five contract files were already current.
- Signal: For this workflow, same-day contract files with verified parseability and expected quirks are sufficient; re-exporting would add operational churn without improving freshness.
- Evidence: File mtimes: 2026-04-12 16:33-16:37 local for all five contract files; validation confirmed rows 228/912/16/72203/14249 and expected quirks (duplicate header in All-Field-Open-Hold.csv, cp1252 encoding in IX-Placards-Photos.csv, All-Task-Logs.csv, and All-Projects-All-Time.csv).

## 2026-04-14T10:56:34

- Outcome: `success`
- Summary: Refreshed all five recurring Salesforce report CSVs through the Lightning GUI with browser-use in a real Chrome profile.
- Signal: Full exports required the GUI path plus state-driven re-resolution of Lightning element ids; large reports were only complete after the CSV download flow.
- Evidence: 2026-04-14 run produced all-ix-open-hold-honlyp2.csv=226 lines, All-Field-Open-Hold.csv=902 lines, IX-Placards-Photos.csv=55 lines, All-Task-Logs.csv=146689 lines, All-Projects-All-Time.csv=14358 lines. Real-browser downloads landed in C:\Users\prest\Downloads as report*.csv before promotion into General Salesforce Reports.

## 2026-04-14T20:25:54

- Outcome: `success`
- Summary: Refreshed all five Field Work Report Salesforce exports through the Lightning GUI and replaced the contract CSVs with timestamped backups.
- Signal: Chrome DevTools against the logged-in Salesforce session worked reliably; large reports still required Details Only + Comma Delimited .csv + UTF-8 through the GUI export dialog.
- Evidence: 4/14/2026 run produced all-ix-open-hold-honlyp2.csv 48,491 bytes at 4:13 PM, All-Field-Open-Hold.csv 303,922 bytes at 4:15 PM, IX-Placards-Photos.csv 9,869 bytes at 4:16 PM, All-Task-Logs.csv 20,425,849 bytes at 4:17 PM, All-Projects-All-Time.csv 13,480,663 bytes at 4:17 PM; prior versions copied to General Salesforce Reports\\backups\\2026-04-14_161403.

## 2026-04-21T10:50:11

- Outcome: `success`
- Summary: Refreshed all five Salesforce exports via Comet after Chrome DevTools got stuck; workbook refresh followed in 222.7s.
- Signal: Per-report menu variance (4- vs 6-item Edit dropdown) broke coordinate-only Export clicks on read-only reports; switching to BU_BROWSER=comet recovered when Chrome remote-debug was unreachable; JS walker into shadow DOM cleanly set Format=localecsv without touching the native <select> dropdown.
- Evidence: Row counts: Holds P2=240, All Field Open Hold=934, IX Placards Photos=57, All Task Logs=176851, All Projects=17081. Workbook refresh: load_workbook=121.6s, import_task_log=4.95s, import_all_projects=6.94s, total=222.7s. Smoke tests 16/16 pass after refresh (test_field_spreadsheet_skill, test_refresh_field_work_report, test_field_work_report_guard).

## 2026-04-23T12:29:52

- Outcome: `success`
- Summary: Refreshed all 5 CSVs via browser-harness attached to Chrome; built reusable per-report driver (.artifacts/sf_export_one.py) and consolidated 5-in-1 driver (.artifacts/sf_export_all.py). Per-report elapsed 14-29s after initial probe discovery.
- Signal: Export dialog renders in top-level document (modal portal), not inside the lightningReportApp iframe. Probe must search BOTH contexts. 'Details Only' is a selectable card, not a button/menuitem/radio — text-content match required. Submit 'Export' BUTTON is distinguishable from menu item 'Export' (role=menuitem, tag A) by bottom-most y.
- Evidence: Artifacts: .artifacts/sf-p2-step1..4.png, .artifacts/sf_export_one.py, .artifacts/sf_export_all.py. Downloaded files: report1776968311061/558113/582351/607846/642093.csv. Field Work Report refresh confirmed: Holds Only P2 238 rows, All Field Open Hold 918, Task Log 74536, All Projects 17011.

## 2026-04-23T15:18:26

- Outcome: `success`
- Summary: Fixed Task Log weekly report Status filter — now defaults to Status=Completed only, matching coordinator IX report.
- Signal: Completed-only filter is the correct default for P1/P2 submission & approval counts. Including Open inflates counts by ~3-5% because coordinators create task logs before finalizing. For 2026-04-20..04-23 window, Completed-only = 57 PTO (matched user's report), all-statuses = 60.
- Evidence: Script: .codex/skills/field-spreadsheet/scripts/build_task_log_weekly_report.py with --include-open flag for audit mode. Outputs: Sheets and Dash/Task_Log_Weekly_Report_this-week_2026-04-20_to_2026-04-23.xlsx (1217 entries). Verified alternate PTO candidates: IXP2 Application Approved date filter = 50, PTO Granted to Customer = 38, Task Log Completed = 57.

## 2026-04-27T11:40:16

- Outcome: `success`
- Summary: Refreshed all five contract Salesforce CSVs through authenticated ambia.my.salesforce.com CSV export URLs, then rebuilt the Field Work Report workbook.
- Signal: When Comet CDP is authenticated but the Lightning tab has a zero-size viewport or menu clicks fail, extract live cookies through CDP and use /<reportId>?csv=1&exp=1&enc=UTF-8&isdtp=p1 on ambia.my.salesforce.com before falling back to fragile UI clicks.
- Evidence: 2026-04-27 files: P2 holds 227 rows, All Field Open Hold 919, Placards 11, Task Logs 74056, All Projects 17122; workbook Field_Work_Report Official (Current Version 4-27-2026).xlsx created; pytest field-work suite 22 passed.

## 2026-04-27T18:28:18

- Outcome: `success`
- Summary: 2026-04-27 end-of-day refresh completed after Salesforce re-auth with AgentMail verification; five contract CSVs refreshed through authenticated CSV export URLs and workbook/email regenerated.
- Signal: If same-day morning exports are stale later in the day, re-authenticate the real browser if needed, use AgentMail for Salesforce verification, then reuse /<reportId>?csv=1&exp=1&enc=UTF-8&isdtp=p1 for fast complete exports.
- Evidence: CSV mtimes 2026-04-27 18:01 local; rows P2=226, All Field=909, Placards=11, Task Logs=74399, All Projects=17145; workbook raw-row validation matched all five source CSVs; pytest field-work suite 30 passed.

## 2026-05-06T04:08:12

- Outcome: `success`
- Summary: Refreshed all 5 contract CSVs via chrome.exe direct URL launch when all higher-priority automated paths failed
- Signal: When browser-harness shim is broken, browser-use spawns its own auth-less temp Chrome, Chrome 130+ rejects WS upgrade with HTTP 403 (Origin lockdown), cookie SQLite has deny-all share lock, and the default browser is Comet (no SF auth), the unblock is to invoke chrome.exe directly with the authenticated CSV URL — Chrome's Default profile is logged in, the ?csv=1 endpoint auto-downloads, and identification by exact-first-line match against the backup CSV header is sufficient to map report*.csv to the contract filename
- Evidence: .ix-agent-cache/refresh_via_chrome.py, run output 2026-05-06 04:00 promoting 5 files (61437/323939/4605/21543492/16322787 bytes) with raw row reconciliation 247/962/10/76728/17363 in workbook refresh validator
