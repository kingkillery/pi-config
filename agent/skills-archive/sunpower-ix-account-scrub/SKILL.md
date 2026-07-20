---
name: sunpower-ix-account-scrub
description: Scrub SunPower / Blue Raven interconnection account lists and clawback sheets into concise, operator-ready status notes. Use when Codex needs to clean or backfill account notes, summarize a project's current IX status, identify what is needed next, count documented attempts against the actual current blocker, compare a clawback list against `Mierins Remix(Main)`, classify clawbacks into operational buckets, build a master review sheet with existing vs suggested buckets, or sanity-check whether a blocker like transformer upgrade, field corrections, missing signature, missing placard, utility bill, FIN/FIV/inspection, or Part 1/Part 2 status is actually supported by the source data.
---

# SunPower IX Account Scrub

Use this skill for account-scrub work where the output is a clean, operational status record rather than a long narrative.

## Read This First

1. Read `references/note-contract.md` before writing or rewriting account notes.
2. Read `references/high-signal-findings.md` before inferring blockers from task logs.
3. If the task uses the repo's current clawbacks workflow, read `scripts/enrich_clawbacks_pto.py`.
4. If the user asks for clawback bucketing or a master review sheet, read `scripts/bucket_clawbacks.py`.
5. If the user asks for live Albatross confirmation, also read `C:\Users\prest\.codex\skills\albatross-exploration\SKILL.md`.
6. When the scrub output feeds the daily email, be aware of the column name mismatch: the email builder (`build_ix_daily_email.py`) expects `Bucket` and `Notes`, but the specialist review pipeline produces `Original Bucket`, `Actionability`, `Recovery Lane`, and `Short Email Note`. Map or transform before email generation.
7. For field-correction or scheduled-field-service rows where local exports conflict with the current note, use live Salesforce / TaskRay as a last-resort verification path before rewriting the blocker.

## Primary Sources

Use these sources in priority order:

1. `General Salesforce Reports/all-ix-open-hold-honlyp2.csv`
   - best current source for open Part 2 task state and explicit reason-unable-to-submit fields
2. `General Salesforce Reports/All-Field-Open-Hold.csv`
   - current open-hold task inventory across Part 1 and Part 2
3. `General Salesforce Reports/All-Task-Logs.csv`
   - dated touch history, last updates, repeated follow-ups, and evidence for attempt counts
4. `Sheets and Dash/Field_Work_Report - Mierins Remix(Main) - updated.xlsx`
   - current field-work scheduling and manual coordinator context
5. live Albatross status/details pages
   - use only when the user asks for live portal confirmation or when local exports conflict
6. live Salesforce TaskRay project/task pages
   - use only as a last resort for field-correction, Field Service, or scheduled-work claims when CSV exports and workbook notes disagree

## Scrub Workflow

1. Drop blank filler rows before reasoning.
   - treat a row as real only if `Project ID` is populated
2. Resolve the project's current open task set from `All-Field-Open-Hold.csv`.
3. Resolve the current Part 2 status and explicit blockers from `all-ix-open-hold-honlyp2.csv`.
4. Pull the project's task-log history from `All-Task-Logs.csv`.
5. If the project overlaps `Mierins Remix(Main)`, capture:
   - `Queue`
   - `Raw Reason`
   - `Scheduled?`
   - `Scheduled Date`
   - `Update`
6. Produce a concise note in the contract format from `references/note-contract.md`.
7. If the user asks for bucketing, classify from the current blocker rather than stale labels.
   - preserve the source bucket as `Existing Bucket`
   - write the recommended value as `Suggested Bucket`
   - include a short `Suggestion Reason`
   - include a combined `Log Review` built from current reason, latest task-log update, and `Mierins Remix(Main)` context when present
8. Separate:
   - VERIFIED: directly stated in source text or fields
   - INFERRED: short synthesis from multiple verified facts
   - UNKNOWN: not supported by the current data

## Concise Batch Breakdown Workflow

Use this path when the operator gives a short list of project IDs and asks for the next review, breakdown, quick status, or similar concise account summaries.

1. Treat every provided project ID as in scope, even if the operator says a different count.
2. Use `ix-codemode` for one local extraction pass across:
   - `all-ix-open-hold-honlyp2.csv`
   - `All-Field-Open-Hold.csv`
   - `All-Task-Logs.csv`
   - `All-Projects-All-Time.csv`
   - the latest relevant clawback specialist review / email input CSVs when present
   - any current Excel-derived review CSVs in `Sheets and Dash/` that contain the requested project IDs, especially `Clawback_Specialist_Review_*`, `Mierins_Add_Update_*`, and `P2_Hold_Reason_Date_Context_*`
3. For each project, return only:
   - current `Status`
   - concrete `Need`
   - immediate `Next`
   - blocker-specific `Attempts` with latest dates or count
4. Include the most specific source-backed blocker detail available.
   - Good: `Waiting to schedule fix for ESD meter socket`, `needs corrected FIN with installation address`, `waiting on GIOA signature`, `needs placard proof photos`, `PGE meter exchange pending`.
   - Too vague: `waiting on field work`, `utility issue`, `paperwork`, `customer docs`, `follow up`.
   - If the row is field-action, name the actual field action: meter socket, placard, inverter, battery, disconnect, comm wire, roof leak, pedestal relocation, line diagram/photo proof, or similar.
   - If the row is paperwork/customer-action, name the actual document or signature: GIOA, IA, HOI, wet signature, utility bill, FIN, wiring approval, account number, or similar.
5. After any `ix_summary.py` or helper-script output, run a conflict pass against the latest review-sheet rows for the same project IDs before writing the final notes.
   - If `ix_summary.py` surfaces older task logs but the latest review sheet names a newer blocker, scheduled date, SLA, or field/design dependency, lead with the newer review-sheet blocker.
   - If review sheets and exports disagree materially, write a short conflict note instead of choosing confidently.
   - Do not convert a broad review label like `Utility review pending` into a specific portal/email status unless a source row says that exact detail.
6. Prefer current open-hold fields and latest specialist review over stale email buckets or stale top task-log snippets when they conflict.
7. Use task logs to support the latest touch and attempts, not to dump history.
8. Do not claim live portal, email, or Salesforce confirmation unless that live system was actually checked in the current turn.
9. If the extraction output is clipped or ambiguous, rerun a narrower extraction for the missing project IDs before writing the answer. If the extraction output is stale-looking, rerun a narrower extraction for the conflicting project IDs and compare against the latest review-sheet rows.
10. Keep the final response compact enough for operational triage:
   - one short paragraph or four short fields per project
   - no long narratives
   - no source-file inventory unless the operator asks for provenance

Default concise note shape:

`Status: ... Need: ... Next: ... Attempts: ...`

When a bucket/email row says `Utility review pending` but the current reason and task logs say field correction, missing signature, inspection, placard, or transformer upgrade, lead with the active blocker instead of the generic utility wording.

If the only available label is broad, write `specific blocker not visible in local exports` rather than inventing a detail.

Known failure mode to prevent:

- `ix_summary.py --logs N` can surface old top logs while current Excel-derived review CSVs have newer status. Do not let an old net-metering, inverter, portal-check, or PTO-ready sentence override a newer review row naming a utility bill, failed witness/field correction details, scheduled field service date, CAD/as-built dependency, missing signature, SLA, or Part 1/Part 2 conflict.
- When the user flags a pasted note as disagreeing with Excel, treat that as a source-conflict task: compare the project across review CSVs, open-hold exports, and task logs, then explicitly state what is verified and what still needs live Salesforce/portal confirmation.

## Note Rules

- Keep notes concise and operator-readable.
- Default note sections:
  - `Status`
  - `Need`
  - `Next`
  - `Attempts`
- Prefer current task state over stale historical narrative.
- Use exact task names when helpful:
  - `Receive and Process IX Part 1`
  - `Request IX Part 1`
  - `Prepare IX Part 2`
  - `Receive and Process IX Part 2`
- Attempt counts must be blocker-specific, not raw task-log volume. If the need is a customer signature, count documented signature/customer outreach attempts; if the need is field correction proof, count documented scheduling/proof/correction attempts; if the need is utility review, count utility follow-ups.
- Include dates for recent touches. If there are many, list the latest dates and collapse earlier ones.
- If the source only supports a weaker statement, use the weaker statement.

## Bucketing Rules

- Bucket from the active blocker, not the noisiest phrase in the note.
- Treat inspection-stage blockers as `Inspections`.
  - this includes `pending inspection`, `pending witness test`, `pending Ameren witness test`, `pending FIV`, `FIN`, `final inspection`, and similar inspection-progress language
- Use `Witness Test` only when the source explicitly says the witness test failed.
- Do not let stale `legal letter`, `placard`, or `work order` mentions override a stronger current blocker from task logs or current-state fields.
- When producing a workbook, include a strong all-projects sheet such as `Master Sheet` with:
  - existing bucket
  - suggested bucket
  - suggestion reason
  - current reason
  - latest update
  - main queue context
  - notes

## Do Not Infer These Without Direct Evidence

- `Transformer upgrade`
- `Rejected`
- `Submitted`
- `Utility approved`
- `Field service scheduled`
- `No active application`

Only write those when a source field or log comment explicitly supports them.

Example:
- `863WPOWL` can be labeled transformer-upgrade pending because the task logs explicitly say `pending transformer upgrade by UC`.
- `1777CRAI` should not be labeled transformer-upgrade pending from SCE delay language alone.

## Mierins Overlap Rules

When comparing an account list against `Mierins Remix(Main)`:

- join on `Project ID` to `Main!Project Name`
- treat `Main` overlap as field-operations context, not the single source of truth for IX status
- report:
  - overlap count
  - overlapping project ids
  - each overlapping project's `Main` status signals
  - whether the clawback note and `Main` status agree or conflict

## Live Albatross Escalation

Use live Albatross only when:

- the user explicitly asks for portal confirmation
- local exports disagree
- a blocker claim materially changes the recommendation and is not proven locally

For live Albatross:

1. go directly to project status/details
2. capture current process step, notes, and timeline
3. use the portal only to confirm or falsify the current blocker
4. do not overwrite stronger local evidence with weaker UI impressions

## Live Salesforce Field-Service Escalation

Before checking live scheduling systems such as Arrivy, TOA, or Salesforce TaskRay for a field-correction clawback, confirm the current correction package is field-ready. Use task logs, open-hold rows, design/as-built notes, rejection text, and workbook context to verify:

- the latest design/as-built correction has been completed or is not needed
- the required placards, photos, repair scope, or utility rejection evidence are current enough to dispatch from
- the row is truly blocked on scheduling/completion rather than design clarification, licensing, paperwork, customer signature, or missing proof

If design/correction evidence is stale, missing, or still being clarified, write the next step as `verify design/evidence package` instead of `check Arrivy/TOA` or `schedule Field Service`. Only escalate to live scheduling once the current evidence supports a field-ready visit.

Use live Salesforce only as a last-resort account scrub check when:

- a row is labeled `Corrections Scheduled`, `Corrections Pending Scheduling`, `Field Service`, or similar, and the note/log dates conflict
- the project stage says `Inspections Complete, Pending PTO`, but old workbook notes still mention field corrections or a failed witness test
- the user explicitly asks to check Field Service task updates in Salesforce

For each checked project:

1. Search the project ID in Salesforce and open the `TaskRay Project`.
2. Record the current `Current Stage`, `Corrections` count, and visible active TaskRay rows.
3. List any TaskRay tasks or Project Events whose `List` is exactly `Holding` or `Open`; ignore `Cancelled`, `Canceled`, `Complete`, and `Change Order` rows unless the user asks about them.
4. If Salesforce shows `Inspections Complete, Pending PTO` and no active correction rows, treat older field-service/witness-fail notes as stale. Write the next step as PTO/inspection follow-up, not field scheduling.
5. Keep the update human and evidence-based: mention the live check date, the active `Open`/`Holding` task names, and the next operational move.

## Self-Improvement Loop

When a new scrub pattern proves durable:

1. append a run note with:

```powershell
python .codex\skills\sunpower-ix-account-scrub\scripts\log_account_scrub_learning.py `
  --outcome success `
  --summary "Short summary of what was scrubbed" `
  --signal "What changed the note or status outcome" `
  --evidence "CSV, workbook, task log, or Albatross evidence"
```

2. promote only stable patterns into `references/high-signal-findings.md`
3. keep one-off project observations out of the skill body

## Validation

Before concluding:

- verify the project id matches across the files used
- verify each strong claim can be pointed back to a source row or comment
- verify note wording is clean enough to paste directly into a notes column
- if you claim transformer upgrade, field correction, missing signature, missing placard, or utility bill, confirm the source text actually says it

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
`Scrub this clawbacks sheet and fill missing Notes with current status, need, next steps, and touch counts.`

`For 1777CRAI, tell me the real current status and whether transformer upgrade is actually supported by the data.`

`Compare the clawback list against Mierins Remix Main and show each overlapping project's status so we can push with Kody and Kelli.`

`Rewrite these IX account notes so they are concise, not dirty, and only make claims the exports support.`

`Break this clawback sheet into buckets, keep the source value as Existing Bucket, add a Suggested Bucket with rationale, and build a Master Sheet that shows the log-review context behind the recommendation.`
