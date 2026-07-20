# High-Signal Findings

Promote only durable findings here.

## Findings

- Treat a clawback row as real only when `Project ID` is populated. Blank filler rows distort note counts and status summaries.
- Use `all-ix-open-hold-honlyp2.csv` as the strongest local source for current Part 2 state and reason-unable-to-submit fields.
- Use `All-Field-Open-Hold.csv` to determine whether Part 1 or Part 2 is still the active open task.
- Use `All-Task-Logs.csv` for dated touch counts and the latest verified updates, but do not let old narrative logs override stronger current-state fields.
- `Mierins Remix(Main)` is field-operations context only. It is useful for scheduled dates, field-work queue, and coordinator updates, but it is not the sole source of IX status.
- Current Excel-derived review CSVs in `Sheets and Dash/` can be stronger than helper-script top-log snippets for batch updates. Before finalizing notes from `ix_summary.py`, compare against `Clawback_Specialist_Review_*`, `Mierins_Add_Update_*`, and `P2_Hold_Reason_Date_Context_*` rows for the same project IDs.
- When review sheets and helper output disagree, preserve the conflict instead of smoothing it away. Examples of conflict-worthy signals include utility bill vs net-metering response, scheduled field service date vs generic portal check, missing signature/placard vs PTO-ready, and design/as-built dependency vs simple field scheduling.
- Do not infer `transformer upgrade` unless a source explicitly says `transformer upgrade` or equivalent language.
- For clawback bucketing, preserve the source label separately as `Existing Bucket`; derive `Suggested Bucket` from the active blocker supported by current-state fields and recent task logs.
- A strong clawback master sheet should expose the recommendation trace, not just the result. Include at least current reason, latest task-log update, main-queue context, and a short combined `Log Review`.
- Treat inspection-stage blockers as `Inspections`, including `pending inspection`, `pending witness test`, `pending Ameren witness test`, `pending FIV`, `FIN`, and `final inspection`.
- Use `Witness Test` only when the source explicitly says the witness test failed.
- Do not let weaker historical phrases like `legal letter`, `placard`, or `work order` override a stronger current blocker when classifying buckets.
- `1777CRAI` is the proof case for this guardrail:
  - local data supports `Part 1 still open`, `no active application`, and `CAD mismatch uncertainty`
  - local data does not support `transformer upgrade`
- `863WPOWL` is the positive control:
  - task logs explicitly say `pending transformer upgrade by UC`
  - transformer-upgrade wording is safe there
- The cleanest operator notes are not raw task-log dumps. They need a status record, what is needed, the next move, and task-touch counts.

## Promotion Rule

- Append raw learnings to `run-history.md` first.
- Promote only after the pattern survives more than one real scrub or clearly prevents a wrong conclusion.
