# Testing Strategy

Use this reference when modifying the `field-spreadsheet` skill or changing the workbook refresh behavior it documents.

## Test Goals

Protect these outcomes:

- the skill triggers on the right user requests
- the skill recognizes common aliases for the workbook
- the main workflow stays concise and imperative
- the skill always points to the canonical refresh script
- the skill always points to the workbook-map reference before explaining formulas
- the skill points to the dashboard contract and high-signal findings before changing refresh ownership
- the examples cover refresh, targeted updates, and explanation
- the refresh path fails safely when exports are missing
- the targeted-update path distinguishes workbook edits from refresh-pipeline edits
- the workbook-map reference keeps the current formula spine and import mapping visible
- the skill preserves a repeatable learning loop via run history and promoted findings

## Eval Harness

Use these regression layers together:

- [test_field_spreadsheet_skill.py](C:\Users\prest\Desktop\SPWR-Daily\Interconnection-Dash-2026\tests\test_field_spreadsheet_skill.py)
- [test_refresh_field_work_report.py](C:\Users\prest\Desktop\SPWR-Daily\Interconnection-Dash-2026\tests\test_refresh_field_work_report.py)
- [test_field_work_report_guard.py](C:\Users\prest\Desktop\SPWR-Daily\Interconnection-Dash-2026\tests\test_field_work_report_guard.py)
- [test_validate_field_work_report_outputs.py](C:\Users\prest\Desktop\SPWR-Daily\Interconnection-Dash-2026\tests\test_validate_field_work_report_outputs.py)
- [validate_field_work_report_outputs.py](C:\Users\prest\Desktop\SPWR-Daily\Interconnection-Dash-2026\scripts\validate_field_work_report_outputs.py)
- [run_field_work_report_guard.py](C:\Users\prest\Desktop\SPWR-Daily\Interconnection-Dash-2026\scripts\run_field_work_report_guard.py)

The harness checks:

- frontmatter contains `name` and `description`
- description covers refresh, update, explain, workbook, CSV-trigger intent, and common aliases
- the SKILL body includes the canonical script path and all required reference files
- the SKILL body includes explicit refresh, targeted-update, pipeline-vs-workbook, and explanation examples
- the SKILL body instructs the agent to report missing exports instead of guessing
- the SKILL body includes the self-improvement loop and learning logger
- the workbook-map reference includes source-file mapping, formula-spine sections, and drilldown notes
- the dashboard-contract reference captures stable tabs, manual-vs-script ownership, and version-lineage additions
- the run-history and high-signal findings files exist for the skill
- the refresh script preserves partial manual ownership boundaries such as `Utility Portal Lookup A:D` and `Temp-Copy-to-Mierins-remix`
- the end-to-end synthetic workspace can run `scripts/refresh_field_work_report.py` and still satisfy the workbook contract
- the local guard can run a stronger temp-copy regression check against live workbook assets when they are available
- source CSV row counts can be reconciled to workbook raw tabs by counting only script-owned raw columns through the first blank row; do not use `ws.max_row` on formula-filled sheets
- the fast post-refresh verifier can reconcile all five raw tabs and check executive-facing tabs without running a second workbook refresh

Preferred commands:

```powershell
python scripts\validate_field_work_report_outputs.py --workspace C:\Users\prest\Desktop\SPWR-Daily\Interconnection-Dash-2026 --summary
python scripts\run_field_work_report_guard.py
python scripts\run_field_work_report_guard.py --workspace C:\Users\prest\Desktop\SPWR-Daily\Interconnection-Dash-2026
```

## Recommended Manual Checks

Run these after a substantive skill or workbook-flow change:

1. Ask:
   `Refresh the Field Spreadsheet from today's exports and tell me what changed.`
   Expectation: the skill chooses the script path, checks CSV prerequisites, and reports verification points.
2. Ask:
   `Explain the current formulas and data setup for the Field Spreadsheet.`
   Expectation: the skill reads the workbook-map reference and explains `Holds Only P2`, dashboard, WoW, and drilldowns using actual sheet names.
3. Ask:
   `Make a targeted update to the utility portal mapping for the Field Spreadsheet.`
   Expectation: the skill treats it as a bounded change, not a full refresh.
4. Ask:
   `Refresh the Field Work Report workbook, but I think one export is missing.`
   Expectation: the skill reports the missing export names and does not pretend the refresh succeeded.
5. After any task-log-summary optimization, compare a few multi-log projects against the previous workbook and verify the visible summary still reflects the most recent Task Log entry, not the first one encountered.
6. Ask:
   `Which tabs are actually refreshed by the script versus still manual in the Field Work Report?`
   Expectation: the skill answers from `dashboard-contract.md` rather than guessing from workbook tab names alone.
7. Append a sample learning entry with `log_field_spreadsheet_learning.py` and verify the result lands in `run-history.md` with the expected structure.
8. After a Salesforce source refresh, compare each contract CSV row count to the matching workbook raw tab:
   - `Holds Only P2`, `All Field Open Hold`, `IX Placards Photos`, and `Task Log`: count rows from row 2 across their raw import columns only.
   - `All Projects All Time`: count rows from row 1 across the CSV-width raw import columns.
   - Treat formula-fill rows outside the raw import columns as expected workbook structure, not stale source data.

## Change Heuristics

- If SKILL.md gets longer, move explanation into references instead of expanding the main workflow.
- If new workbook buckets or tabs are introduced, update the workbook-map reference first, then the SKILL examples only if the user-facing workflow changes.
- If automation ownership changes for a tab, update `dashboard-contract.md` in the same edit.
- If the refresh script changes expected CSV names, update both the SKILL refresh checklist and the test harness in the same edit.
- If users start using a new alias for the workbook, update the description and routing section so the skill keeps triggering correctly.
- If formula-performance work touches task-log summaries, document whether the replacement preserves first-match or last-match semantics and record the validation method.
- If a run uncovers a durable blocker or workflow shortcut, append it to `run-history.md` first and promote it to `high-signal-findings.md` only after verification.
