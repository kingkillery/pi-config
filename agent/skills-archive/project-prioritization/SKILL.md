---
name: project-prioritization
description: Turn local interconnection exports and workbook views into prioritized action lists. Use when the user asks what to work first, wants a breakdown of scheduled versus unscheduled field work, needs a triage queue, or wants blocked projects grouped by urgency or effort.
---

# Project Prioritization

Use this skill to convert local IX data into an operator-ready queue.

## Primary Inputs

- `General Salesforce Reports/all-ix-open-hold-honlyp2.csv`
- `General Salesforce Reports/All-Field-Open-Hold.csv`
- `General Salesforce Reports/All-Task-Logs.csv`
- the official workbook's `Holds Only P2`, `Updated Mierins`, and `Dashboard` views
- the Mierins sidecar workbook when the ask is specifically about `Main`, `NEW Items`, or `Closeout Work`

## Priority Lanes

Use these practical lanes unless the user gives a different rubric:

- `P0`: scheduled date already in the past, active closeout work, or a field item that should already be complete
- `P1`: field-related hold with no schedule, missing next step, or clear internal action needed
- `P2`: valid future schedule or waiting state with a clear owner
- `P3`: low-evidence item that needs more research before action

## Effort Buckets

- `FAST`: status clarification, task-log review, simple bucket correction
- `MED`: schedule cleanup, note rewrite, utility lookup, workbook reconciliation
- `HIGH`: cross-system investigation, repeated rejection, unclear blocker, likely manual operator follow-up

## Working Pattern

1. **Preflight data quality**: for report-accuracy or data-quality triage, prefer the daily wrapper:
   ```powershell
   python scripts\run_report_accuracy_review.py --workspace C:\Users\prest\Desktop\SPWR-Daily\Interconnection-Dash-2026
   ```
   Use `reporting/tracking/data_quality_action_queue_latest.csv` for the operator-facing P0/P1 correction queue and `reporting/tracking/data_quality_project_queue_latest.csv` for one row per affected project.
   The action queue includes `delta_status` (`baseline`, `new`, `repeat`) and `effort` so operators can work the CSV directly without opening the full triage workbook.
   If only raw validation is needed, run `scripts\validate_ix_data_deep.py` and then `scripts\build_data_quality_triage.py`.
   Do not rank projects with active P0 temporal or cross-dataset issues without flagging them.
2. Start from current exports or workbook views.
3. Remove duplicates between `Main`, `NEW Items`, and `Closeout Work`.
4. Separate work that is waiting on a real future schedule from work that is unscheduled or overdue.
5. If blocker wording is messy, use `sunpower-ix-account-scrub` before final ranking.
6. If a utility-specific next step is needed, use `utility-lookup`.
7. If portal population changes are relevant (e.g., utility approval timelines), check `Portal Exports/*_powerclerk_latest.csv` or run `scripts/scrape_powerclerk.py --all`.

## Output Shapes

Good outputs for this skill:

- a ranked queue
- `data_quality_action_queue_latest.csv` for P0/P1 source-correction work
- `data_quality_project_queue_latest.csv` for one-row-per-project data-quality review
- a scheduled vs unscheduled breakdown
- overdue scheduled projects
- grouped work by state, utility, or hold family

## Data Quality Exception Handling

If a P0/P1 finding is verified as a legitimate known source exception, add it through the helper rather than hand-editing JSON:

```powershell
python scripts\add_data_quality_exception.py `
  --workspace C:\Users\prest\Desktop\SPWR-Daily\Interconnection-Dash-2026 `
  --project <PROJECT> `
  --category <category> `
  --message-contains "<stable message fragment>" `
  --reason "<why this is approved>" `
  --approved-by "<reviewer>" `
  --expires-on YYYY-MM-DD
```

Exceptions suppress priority but remain visible in full triage artifacts.

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

## Guardrails
- Do not rank from stale exports if the user is expecting today's data.
- Do not treat all holding projects as equal; scheduled-in-past work should surface above routine pending items.
- Keep field-service items distinct from M2-pending-only items when the workbook needs that exception called out.
