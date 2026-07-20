---
name: ix-daily-email-template
description: "Create the daily IX executive email HTML template from refreshed Field Work Report data. Use when asked to build, refresh, recreate, validate, or explain the daily IX email, copy-paste email HTML, KPI email, individual KPI credit email, week-over-week hold email, or top aging clawbacks section after Salesforce reports and the Field Spreadsheet have been updated."
---

# IX Daily Email Template

Use this skill to build the copy-pasteable daily IX email after the Salesforce CSV exports and Field Work Report workbook are current.

## Voice And Source Handoff

- Apply `kade-email-voice` when turning generated KPI sections into narrative daily or weekly IX team update copy.
- Primary external voice reference: `https://blueravensolar-my.sharepoint.com/:w:/g/personal/preston_nackos_sunpower_com/IQCSX4diY5C8SqkdmAm69IzhARnvw_tyUmDnBu8r4QuDMgw?e=kl6fAS`
- If the SharePoint document is not accessible from the current environment, preserve the link and use the local `kade-email-voice` rules instead of inventing tone guidance.
- The top notes section should be plain body copy, not a bracketed placeholder or quote-box callout. Do not include the SharePoint reference line in the generated email body.
- When drafting additional narrative, separate verified metrics from inferred context and do not fabricate blockers, owners, or next steps.

## Style Benchmarks

Use the inbox exemplars as the style target when drafting or revising the daily email:

- `Matt Campanella` - shortest and most compressed; KPI-first, minimal commentary, clean numbers block.
- `Steven Hall` - best match for the operational daily-email voice; friendly opener, quick announcements, then the working status sections.
- `Braden Kerr` - best match for risk and exception handling; announcements first, then blockers, then next actions.

Match their shared patterns:

- short, direct subject line with the date
- brief greeting with one light sentence max
- announcements or context up front
- status data in a compact, easy-to-scan block
- explicit callouts for holds, risks, or follow-up items
- restrained personality, not essay-like narration
- screenshots or attachments only when they add value

Prefer this order unless the user asks otherwise:

1. greeting / opener
2. short announcements or context
3. KPI or status block
4. exceptions / risks / asks
5. closing line or signoff

Canonical generator:

```powershell
python scripts\build_ix_daily_email.py --workspace C:\Users\prest\Desktop\SPWR-Daily\Interconnection-Dash-2026
```

Default output:

`Sheets and Dash\IX_Daily_Email_<YYYY-MM-DD>.html`

## Daily Workflow

1. Confirm the five Salesforce source exports are current:
   `all-ix-open-hold-honlyp2.csv`
   `All-Field-Open-Hold.csv`
   `IX-Placards-Photos.csv`
   `All-Task-Logs.csv`
   `All-Projects-All-Time.csv`
2. If any source export is stale or missing, use `salesforce-dataset-refresh` first. Do not generate a daily email from stale source data unless the user explicitly asks for a historical draft.
3. Refresh the Field Work Report workbook with `field-spreadsheet`, then run the fast verifier:

```powershell
python scripts\validate_field_work_report_outputs.py --workspace C:\Users\prest\Desktop\SPWR-Daily\Interconnection-Dash-2026 --summary
```

4. **Run deep validation** to catch data-quality issues before they appear in the email:
   ```powershell
   python scripts\validate_ix_data_deep.py --workspace C:\Users\prest\Desktop\SPWR-Daily\Interconnection-Dash-2026
   ```
   Review `reporting/tracking/deep_validation_report.md`. If CRITICAL issues are found (e.g., backwards dates, missing projects, impossible states), flag them in the email's top notes section or hold the email until corrected.

5. Build the email HTML:

```powershell
python scripts\build_ix_daily_email.py `
  --workspace C:\Users\prest\Desktop\SPWR-Daily\Interconnection-Dash-2026 `
  --end-date 2026-04-28 `
  --email-date 2026-04-29
```

5. If a current clawback CSV is provided or requested, include it explicitly:

```powershell
python scripts\build_ix_daily_email.py `
  --workspace C:\Users\prest\Desktop\SPWR-Daily\Interconnection-Dash-2026 `
  --end-date 2026-04-28 `
  --email-date 2026-04-29 `
  --clawbacks-csv C:\Users\prest\Documents\clawbacks 4-29.xlsx `
  --clawbacks-top 20
```

6. Validate the generated HTML before reporting success:
   - file exists and is non-empty
   - includes `Team KPI's`
   - includes `Part 2 Holds Population`
   - does not include `Cycle Time Snapshot`
   - includes `Individual Submission / Approval Credit`
   - includes `Prepared Credit`
   - includes `Total Log Reviews`
   - includes the clawback priority notes near the top greeting
   - includes `bar-track` goal bars
   - includes `Top Aging Clawbacks` when `--clawbacks-csv` was used
   - top aging clawbacks are sorted by oldest FIN and use the supplied workbook/CSV `Bucket` and full multi-line `Notes`
   - top aging clawbacks do not include `State` or `Last Update` columns

## Data Ownership

- Team KPI totals come from milestone date columns in `General Salesforce Reports\All-Projects-All-Time.csv`.
- Task-log subject open/close guidance lives in `reporting/runbooks/interconnection_task_log_subject_guide.md`.
- Task-log status pattern: `Follow Up` and customer/communication logs are activity notes and should close immediately after recording the check/message. `Submitted`, `Approved`, rejection/correction, missing-item, and witness-test pending/scheduled logs represent active states and should remain open until that state is resolved or replaced by the next active state.
- Individual KPI credit uses the current Monday-through-selected-date KPI window.
- Part 1 and Part 2 submission credit comes from deduped `Interconnection: Submitted` task logs in `General Salesforce Reports\All-Task-Logs.csv`; credit goes to the assignee who left the latest submitted note for that project/part.
- Part 1 and Part 2 approval credit comes from `IXP1 Application Approved` and `IXP2 Application Approved` dates in `General Salesforce Reports\All-Projects-All-Time.csv`; credit goes to exported Owner where available, then matching `Interconnection: Approved` task-log assignee when the milestone export has no owner, then latest same-week task owner on the same project/part only if neither owner source exists.
- `Total Log Reviews` counts all Interconnection task logs assigned to that coordinator or lead so far in the current KPI week, not only `Interconnection: Follow Up`.
- Do not include non-team individual-credit rows for Rochelle Reynante, David Eldred, Tonia Crank, Tyler Morgan, Benjamin Reynolds, Chloe Christopher Mazo, Emily Bird, or Marjorie Sarmiento.
- For Addie Austin and Victoria Manongsong, redact the individual submission/approval cells and leave only `Total Log Reviews` visible.
- Add Rochelle Reynante and David Eldred to their own `Prepared Credit` table directly below the individual submission/approval table. Prepared counts use `Interconnection: Prepared` / `Interconnection: Prepped` task logs and matching `Application Prepared` dates, deduped by project and part.
- Week-over-week reason movement comes from the refreshed workbook `WoW Comparison` tab.
- Clawback aging comes only from a supplied clawback CSV; do not reuse an old clawback file silently.

## Reporting Rules

- Keep the clawback priority narrative as plain top-of-email body copy; do not wrap it in brackets or a callout box.
- Do not include the SharePoint reference line in the top email body.
- Weekly KPI windows are Monday through Saturday at 11:59 PM. The current week is Monday through the selected `--end-date`, capped at Saturday.
- Goal bars stop at 100 percent width even when the actual count exceeds goal.
- `Part 2 Approvals (PTO)` maps to `IXP2 Application Approved` for the team KPI table.
- Use `--days 7` only to preserve the existing team-member list source; individual KPI credit still uses the current Monday-through-selected-date KPI window.
- If counts look stale, refresh Salesforce exports and rerun the Field Work Report fast verifier before changing email code.

## Hold Reason Table Completeness

The email's Part 2 hold reason table must sum to the total P2 hold count shown in the workbook WoW. If the displayed reason categories do not cover all projects, add an **"Other / Uncategorized"** row with the remainder.

**Cross-check:**
```
sum(email hold reason counts) == workbook WoW Total Holds
```
If the gap is >0, the missing projects either have blank hold reasons or belong to categories not shown. Always surface the gap explicitly rather than letting the table undercount.

## Approval Rate Denominator

The team KPI table shows approval rates as `approved / denominator`. Document what the denominator represents:
- If denominator = "total approvals possible this week" → all projects with pending approvals in the window
- If denominator = "total submitted in period" → only projects that reached submission
- If denominator = "total in queue" → all open projects regardless of stage

The current template uses a fixed denominator (e.g., 80) for both Part 1 and Part 2. Ensure this is documented in the email or runbook so stakeholders understand what the percentage means.

## Day-over-Day Trend Transparency

When showing day-over-day hold reason changes, include the **"Other"** category delta so the total change is explainable:

| Reason | Prior | Current | Delta |
|--------|-------|---------|-------|
| Field work | 71 | 79 | +8 |
| WAITING FOR M2 | 53 | 62 | +9 |
| ... | ... | ... | ... |
| **Other** | **45** | **22** | **-23** |
| **Total** | **250** | **247** | **-3** |

Without the "Other" row, a -3 total change looks contradictory when top reasons increased by +20.

## Validation Command Example

```powershell
$html = "C:\Users\prest\Desktop\SPWR-Daily\Interconnection-Dash-2026\Sheets and Dash\IX_Daily_Email_2026-04-28.html"
foreach ($needle in @("Team KPI's","Part 2 Holds Population","Individual Submission / Approval Credit","Prepared Credit","Total Log Reviews","bar-track","Clawbacks are one of the top priorities","Top Aging Clawbacks","Bucket Reason","Notes")) {
  if (-not (Select-String -LiteralPath $html -SimpleMatch $needle -Quiet)) { throw "Missing email section: $needle" }
}
foreach ($needle in @("Cycle Time Snapshot","Individual Task Log Activity","Subject Totals","Total Conversions")) {
  if (Select-String -LiteralPath $html -SimpleMatch $needle -Quiet) { throw "Unexpected old email section: $needle" }
}
if (Select-String -LiteralPath $html -SimpleMatch "[Updates]" -Quiet) { throw "Unexpected [Updates] placeholder" }
if (Select-String -LiteralPath $html -SimpleMatch 'class="updates"' -Quiet) { throw "Unexpected quote-box updates callout" }
if (Select-String -LiteralPath $html -SimpleMatch "Task Log Reviews Full Guide" -Quiet) { throw "Unexpected reference link" }
if (Select-String -LiteralPath $html -SimpleMatch "Report date:" -Quiet) { throw "Unexpected top date subtext" }
if (Select-String -LiteralPath $html -SimpleMatch "<th>State</th>" -Quiet) { throw "Unexpected clawback State column" }
if (Select-String -LiteralPath $html -SimpleMatch "<th>Last Update</th>" -Quiet) { throw "Unexpected clawback Last Update column" }
```

## Clawback Source Format Compatibility

The canonical `build_ix_daily_email.py` expects `--clawbacks-csv` with these exact columns:
- `Project ID`
- `Name`
- `FIN`
- `Bucket`
- `Status`
- `Notes`

The specialist review pipeline (`build_clawback_specialist_review.py`) produces files with different column names:
- `Customer` (maps to `Name`)
- `Original Bucket` (legacy bucket, not the enriched one)
- `Actionability` + `Recovery Lane` (combined to produce the enriched bucket reason)
- `Short Email Note` (maps to `Notes`)
- `Status`

When generating the email from specialist review output, either:
1. Create a mapped CSV with the canonical column names, or
2. Use a script that understands the specialist review schema.

Do not silently pass `Clawback_Specialist_Review_*_full.xlsx` to `build_ix_daily_email.py` — it will read empty `Bucket` and `Notes` values and produce empty clawback cells.

## Data Quirks

- `All-Task-Logs.csv` `Completed Date/Time` uses `"%m/%d/%Y, %I:%M %p"` (includes time). Simple date-only parsers will fail. Always use `parse_datetime` with the four-format fallback when reading task logs.
- `Created Date` is date-only, but event credit prefers `Completed Date/Time` when present.

## Verification Commands

After generating the email, run the deep factual verifier:

```powershell
python scripts\verify_email_factual_correctness.py
python scripts\validate_numbers_deep.py
```

These scripts independently recount KPIs, WoW, individual credit, prepared credit, clawback ages, and total log reviews from the raw CSVs.

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
`Create today's IX daily email from the refreshed reports.`

`Generate the daily email HTML with top 20 aging clawbacks.`

`Validate the email template counts after refreshing the Field Spreadsheet.`

`Explain where the daily email KPI and individual credit counts come from.`
