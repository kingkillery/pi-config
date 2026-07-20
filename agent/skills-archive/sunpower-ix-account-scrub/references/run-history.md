# Run History

Append new account-scrub learnings here before promoting them into `high-signal-findings.md`.

## 2026-04-14

- Built a clawback bucketing workflow backed by Salesforce task logs, open-hold exports, and `Mierins Remix(Main)` context instead of trusting the incoming bucket column.
- Added a `Master Sheet` pattern for clawback review with `Existing Bucket`, `Suggested Bucket`, `Suggestion Reason`, and a traceable `Log Review`.
- Promoted the inspection-stage rule:
  - `pending inspection`
  - `pending witness test`
  - `pending Ameren witness test`
  - `pending FIV`
  - `FIN`
  - `final inspection`
  should all classify as `Inspections`
- Kept `Witness Test` only for explicit witness-test failures.

## 2026-05-05

- Failure observed during a batch project-update request: helper output based on top task logs produced stale or overconfident notes for several projects when Excel-derived review sheets had newer blocker details.
- Durable fix: batch account summaries must run a conflict pass against current `Sheets and Dash/` review CSVs before final notes, especially for utility bill, missing signature, field correction, scheduled field service, CAD/as-built, SLA, and Part 1/Part 2 conflicts.
- Output rule reinforced: when local sources disagree materially, state the conflict or mark the claim as requiring live Salesforce/portal confirmation instead of smoothing it into a confident next step.
