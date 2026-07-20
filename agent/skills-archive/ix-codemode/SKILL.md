---
name: ix-codemode
description: Prefer a single local Python execution over many small shell reads when interconnection work requires chained analysis across Salesforce CSV exports, workbook-derived data, or utility reference files in this repository. Use for joins, filters, summaries, diffs, and machine-readable output from local IX data.
---

# IX Code Mode

Use this skill when the task needs several local data steps but does not need browser automation or portal writes.

## When To Use

- Compare two exports or snapshots.
- Build a one-off summary from `General Salesforce Reports/`.
- Filter and rank projects from hold or task-log data.
- Produce structured JSON or CSV-shaped output from local files.

## Prefer This Execution Pattern

Use one inline Python block instead of many shell commands:

```powershell
@'
import json
from pathlib import Path

result = {"ok": True}
print(json.dumps(result, indent=2))
'@ | python -
```

## Common Inputs

- `General Salesforce Reports/all-ix-open-hold-honlyp2.csv`
- `General Salesforce Reports/All-Field-Open-Hold.csv`
- `General Salesforce Reports/All-Task-Logs.csv`
- `General Salesforce Reports/All-Projects-All-Time.csv`
- `Sheets and Dash/Field_Work_Report Official (Current Version *.xlsx)`
- latest relevant `Sheets and Dash/Clawback_Specialist_Review_*.csv`
- latest relevant `Sheets and Dash/Clawback_Specialist_Email_Input_*.csv`
- `reporting/tracking/deep_validation_report.json` (data quality baseline)
- `Portal Exports/*_powerclerk_latest.csv` (portal snapshot data)

## Account Batch Extraction

For short project-ID review lists, use one inline Python pass that:

1. Reads CSVs with tolerant Salesforce encodings: try `utf-8-sig`, then `cp1252`, then `latin1`.
2. Filters exact project IDs in the most specific key column first:
   - `Project Name` for open-hold/project exports
   - `TaskRay Project` for task logs
   - `Project ID` for clawback and email-input CSVs
3. Sorts task logs by `Created Date`.
4. Captures the latest 6-8 task-log rows per project.
5. Computes blocker-specific attempt evidence instead of raw log volume:
   - field correction / proof
   - inspection / FIN / FIV
   - utility review or transformer work
   - customer signature / documents
   - design / sizing / application path
6. Prints enough structured output to support concise operator notes.
7. If shell output is truncated, rerun the same extraction for only the missing IDs before summarizing.

Do not save artifacts for these quick reviews unless the operator asks for a file.

## Output Rules

- Put the primary structured result in `result`.
- Print JSON when the user wants a machine-readable answer.
- Keep one-off analysis in-memory unless the user explicitly asks for a saved artifact.

## Do Not Use For

- Salesforce browser work
- utility-portal submission
- workbook binary editing
- live browser email access (use `read_outlook_email.py` via Playwright)

For those, route to `salesforce-dataset-refresh`, `utility-lookup`, `field-spreadsheet`, or `agentmail-cli`.

## New Local Analysis Scripts

When a one-off Python pass is cleaner than many shell reads, also consider these dedicated scripts:

- `scripts/validate_ix_data_deep.py` — full multi-axis data validation (temporal, cross-dataset, duplicates, outliers)
- `scripts/changedetect_ix_pipeline.py` — field-level diff across all 5 Salesforce CSVs vs previous snapshot
- `scripts/changedetect_portal_exports.py` — diff portal CSV exports with per-portal key mapping
- `scripts/track_field_review_state.py` — stale review tracking with daily delta
- `scripts/scrape_powerclerk.py` — PowerClerk portal data extraction (run separately, not inline)
- `scripts/run_daily_ix_pipeline.py` — orchestrates refresh → detect → stale track → portal scrape → portal diff

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
