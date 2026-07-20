---
name: data-understanding
description: Quickly orient on the current interconnection data in this repository before acting. Use when the user asks whether the data is current, what files were last updated, what is available to work from, or when a workbook refresh, prioritization pass, or account review should start with a freshness check.
---

# Data Understanding

Use this skill to inspect the local data state before taking action. Prefer structured commands over manual eyeballing.

## Primary Diagnostic Command

Run the preflight status tool first. It checks the canonical five-export contract and workbook state:

```powershell
python scripts\report_status.py --workspace C:\Users\prest\Desktop\SPWR-Daily\Interconnection-Dash-2026
```

This returns JSON with:
- `missing_exports` — which of the 5 contract CSVs are absent
- `stale_exports` — which were modified before today
- `workbook.exists` — whether the current official workbook is present
- `workbook.is_outdated_vs_exports` — whether any export is newer than the workbook
- `next_recommended_command` — what to run next

## Daily Accuracy Review Fast Path

When the user asks whether current reports are accurate, whether the report can be sent, or what needs triage before sending, run the one-command review wrapper:

```powershell
python scripts\run_report_accuracy_review.py --workspace C:\Users\prest\Desktop\SPWR-Daily\Interconnection-Dash-2026
```

This wrapper runs the status check, Field Work Report fast validator, deep data-quality validation when needed, and data-quality triage. It writes:

- `reporting/tracking/report_accuracy_review_latest.md`
- `reporting/tracking/data_quality_action_queue_latest.csv`
- `reporting/tracking/data_quality_project_queue_latest.csv`
- `reporting/tracking/data_quality_triage_latest.xlsx`

Verdicts:

- `HOLD`: P0 or structural accuracy blocker; do not send until reviewed.
- `REVIEW`: workbook/source checks passed, but P1 findings or closeout items remain.
- `SEND_READY`: no blocking accuracy findings were found by the automated gate.

Movement counts:

- `baseline`: no prior dated triage CSV exists yet, so the run establishes the comparison set.
- `new`: the finding was absent from the prior dated triage CSV.
- `repeat`: the finding was also present in the prior dated triage CSV.

The wrapper intentionally ignores `data_quality_triage_latest.csv` for movement comparison because that alias points at the most recent run, not a stable prior-day baseline.

## Deep Data Quality Check

After confirming exports exist, run the deep validator to catch data-quality issues before they corrupt downstream work:

```powershell
python scripts\validate_ix_data_deep.py --workspace C:\Users\prest\Desktop\SPWR-Daily\Interconnection-Dash-2026
```

This surfaces:
- Temporal sequence anomalies (PTO before IXP2 approval, submitted before prepared, etc.)
- Cross-dataset integrity gaps (projects in AFH but missing from All-Projects)
- Duplicate project records
- Impossible states (In-Progress with PTO, Complete without PTO)
- Missing required fields (utility company, contact)
- Task log / milestone mismatches
- Dwell time outliers (projects stuck 3σ+ above mean)

Reports are written to:
- `reporting/tracking/deep_validation_report.md` (human-readable)
- `reporting/tracking/deep_validation_report.json` (machine-readable)

Use the validation output to decide whether the current exports are trustworthy or need re-export before workbook refresh, account scrub, or prioritization work.

## Known Data Quirks to Check

If exports exist but may be corrupted, spot-check these Salesforce quirks before trusting the data:

1. **Duplicate header in `All-Field-Open-Hold.csv`**
   The source report currently emits a duplicate `IXP1 Application REF#` header. If the refresh script or any downstream tool errors on duplicate columns, flag it before workbook work.

2. **CP1252 encoding**
   Some Salesforce CSVs arrive as `cp1252` rather than UTF-8. If you see mojibake in customer names or addresses, the file likely needs re-export or encoding repair. The refresh script tries `utf-8-sig`, `utf-8`, `cp1252`, `latin1` in that order, but the agent should know the root cause is the export encoding.

3. **Empty or near-zero-byte exports**
   A Salesforce export that aborted mid-download can be non-empty but truncated. Check that each CSV has at least a header row and plausible row count for the report type (e.g., Holds Only P2 should usually have dozens to hundreds of rows).

4. **Task log datetime format**
   `All-Task-Logs.csv` `Completed Date/Time` includes time (`7/3/2025, 6:45 AM`). Date-only parsers will miss these events and undercount task activity. Use `parse_datetime` with the `%m/%d/%Y, %I:%M %p` fallback.

## Baseline Checks

- `Last Week KPI's/` — presence of a prior snapshot enables week-over-week comparison. If missing, WoW and cycle-time views in the workbook will lack historical context.
- `reporting/contracts/report_manifest.json` — the canonical contract for the five Salesforce exports, workbook sheets, and verification commands.

## Decision Matrix

| State | Next Action |
|-------|-------------|
| Any `missing_exports` or `stale_exports` | Hand off to `salesforce-dataset-refresh` |
| Workbook missing or outdated vs. exports | Run `field-spreadsheet` refresh (or `scripts\refresh_field_work_report.py`) |
| All exports fresh, workbook current | Hand off to the user’s actual request (prioritization, scrub, email, etc.) |
| Encoding/duplicate-header anomalies | Note the quirk, attempt refresh-script fallback, and flag if it persists |

## Questions This Skill Should Answer

- Are the current Salesforce exports present?
- Which documents were last updated, and when?
- Is the workbook likely stale relative to the exports?
- What inputs are safe to use for the next step?
- Are there known encoding or header anomalies that would corrupt downstream work?

## Hand Off

- If files are stale or missing and the user wants fresh exports: `salesforce-dataset-refresh`
- If files are current and the user wants workbook updates: `field-spreadsheet`
- If the user wants a ranked action list: `project-prioritization`
- If the user wants account scrub or clawback reasoning: `sunpower-ix-account-scrub`
- If the user needs utility-specific workflow guidance: `utility-skills`
- If the user wants PowerClerk portal data or change detection: `field-spreadsheet` (portal scraping is documented in the runbook) or run `scripts/scrape_powerclerk.py` directly
- If the user wants deep data validation only: run `scripts/validate_ix_data_deep.py`

## Rooftop Residential IX Workflow Context

For the end-to-end pipeline context that maps design → permit → application → inspection → PTO to the data sources above, see:
`reporting/runbooks/rooftop-residential-ix-workflow.md`

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
