# Reason-Bucket Contract

How P2 hold reasons are computed, where each surface reads them from, and what to do when the dashboard, drill list, cross-tab, email, and history disagree.

## Source of truth

`Holds Only P2!U` is the canonical reason. Column U is a formula (mirrored in `scripts/refresh_field_work_report.py::reason_bucket_formula`) that reads the three Salesforce "Reason unable to Submit" fields in columns Q, R, S of the same sheet:

- Q: `Prepare IXP2 Reason unable to Submit`
- R: `Request IXP2 Reason Unable to Submit`
- S: `Rec and Pro IXP2 Reason Unable to Submit`

Order of pattern matches (first match wins, all keyword tests are case-insensitive against `Q & R & S`):

1. `FIELD`, `PLACARD`, `PHOTO`, or `GRID PROFILE` -> `Field work`
2. `M2` or `MILESTONE 2` -> `WAITING FOR M2 APPROVAL`
3. `PART 1` or `P1` -> `Part 1 still open`
4. `FIN` and not `SIGNATURE` -> `Missing FIN`
5. `HOI` -> `Missing HOI`
6. `CUSTOMER` and `SIGN` -> `Customer Signature`
7. `SIGNATURE` and not `CUSTOMER` -> `Missing Signature`
8. `WITNESS` and `PENDING` -> `Pending Witness Test`
9. `WITNESS` -> `Witness Test`
10. `TRANSFORMER` -> `TRANSFORMER UPGRADE (PT.2)`
11. `CAD` -> `CAD Update Needed`
12. `MODIFICATION` -> `MODIFICATION REQUEST`
13. Trimmed-upper of joined Q|R|S equals `REASON UNABLE TO SUBMIT` (i.e. the column placeholder leaked into the data) -> `(blank)`
14. Otherwise: the literal trimmed Q|R|S text, or `(blank)` if all three fields are empty.

The `(blank)` collapse on rule 13 is intentional. Salesforce will sometimes write the field's own header label as the value, which carries no signal; treat it as an empty reason rather than letting it surface as a category. If you see the literal phrase appear as a category in any view, the formula is stale - rewrite from `reason_bucket_formula`.

## Where each surface reads from

| Surface | Reads from | Source data |
|---|---|---|
| `Dashboard!A10:D24` drill list | Live `COUNTIF('Holds Only P2'!U:U, A_n)` | Live U column |
| `Dashboard!E26:I` cross-tab | Live `COUNTIFS(... U, T queue)` | Live U + T columns |
| `R - <reason>` per-reason sheets | Live `COUNTIF('Holds Only P2'!$U$2:$U$241, A1)` | Live U column |
| `WoW Comparison!A22+` "Week-over-Week Reason Movement" | Static literals written at refresh time by `write_weekly_reason_delta_table` | `Raw Data (Holds Only P2 Hist)` column 12 |
| `WoW Comparison!A6:G18` day-over-day table | Static literals written at refresh time | `Raw Data (Holds Only P2 Hist)` daily counters |
| `IX_Daily_Email_*.html` "Part 2 Holds Population" | `extract_wow_rows` reading workbook literals | The WoW Reason Movement block above |

The drill list, cross-tab, and `R -` sheets are always consistent with each other because they all hit the same live formula. The WoW block (and therefore the email) reflects whatever was frozen at the last refresh, so it can lag the live workbook by one refresh cycle.

## Surfaces NOT to trust as source of truth

- `Last Week Holds!U` is the pre-refresh snapshot of `Holds Only P2!U`, not a 7-day-ago snapshot. The sheet name predates the daily history mechanism. The "true last week" comparison comes from `Raw Data (Holds Only P2 Hist)`, not this sheet.
- `IX_Field_Service_Hold_Context_<date>.csv` is a curated subset (P2 reason match OR open Field Note evidence). Its row count will be lower than the workbook's `Field-Related Holds` snapshot for the same day. Do not reconcile one against the other - they answer different questions.
- The Dashboard cross-tab block must always be live formulas. If any cell in `E28:I41` ever contains a hard-coded number, run `write_dashboard_queue_reason_cross_tab`. Stale literals in that block were the most recent observed contradiction (2026-05-04 audit).

## Contradiction audit playbook

Use this when a stakeholder reports the email and the dashboard disagree, or when adding a new reason category.

1. Compute live truth from Q/R/S without trusting cached formula values:

   ```python
   wb = openpyxl.load_workbook(WB, data_only=True, read_only=True)
   ws = wb['Holds Only P2']
   from collections import Counter
   c = Counter()
   for row in ws.iter_rows(min_row=2, values_only=True):
       if not row or not row[0]: continue
       q, r, s = row[16], row[17], row[18]   # Q, R, S
       c[classify_reason_bucket(' | '.join(str(v) for v in (q,r,s) if v))] += 1
   ```

2. Read the four surfaces and reconcile:
   - Live drill list `Dashboard!B10:B23` - should match the Counter exactly.
   - Cross-tab totals `Dashboard!I28:I41` - should match the drill list (live formulas).
   - WoW Reason Movement "Latest Count" column - should match the drill list within +/- a few rows; any larger gap means the workbook was edited since the last refresh.
   - Email "This Week" column - should byte-for-byte match the WoW block.

3. If the drill list disagrees with the live Counter, the U formulas on `Holds Only P2` are stale. Rewrite them with `reason_bucket_formula(row)` for every row and re-save.

4. If the cross-tab disagrees with the drill list, the cross-tab cells contain literals instead of formulas. Rerun `write_dashboard_queue_reason_cross_tab()`.

5. If the WoW block disagrees with the drill list by more than the count of edits made since the last refresh, run a fresh refresh - the history snapshot for today is out of date.

6. If the email disagrees with the WoW block, the email script is reading the wrong workbook (look at `extract_wow_rows`'s `workbook` resolution path) or the workbook was being saved when the email was rendered (BadZipFile in stderr). Wait for the save, rerun.

## Adding or removing a reason category

Update all of these in one pass; partial updates create contradictions:

1. `classify_reason_bucket` (Python) - add the new branch above the placeholder/blank fall-through.
2. `reason_bucket_formula` - add the matching `IF(ISNUMBER(SEARCH(...)), "<name>", ...)` branch in the same order, and add one closing paren to the tail string.
3. `Dashboard!A10:A23` drill labels and `Dashboard!E8:E21` "View ..." links - the cross-tab references the drill list by row, so insert in the drill block first.
4. `R - <name>` sheet - duplicate one of the existing per-reason rollup sheets, change `A1` to the new name; the COUNTIF in `A2` and headers below copy as-is.
5. `dashboard-contract.md` "Drilldown entry points" list - keep alphabetic-by-priority ordering matching the drill list.
6. Run `write_dashboard_queue_reason_cross_tab()` so the cross-tab picks up the new drill row.

When removing a category (the `REASON UNABLE TO SUBMIT` precedent):

1. Add the explicit fold rule in `classify_reason_bucket` and `reason_bucket_formula`.
2. Add a read-side normalization in `weekly_reason_delta_rows` so historical snapshots also fold the old name.
3. Compact the WoW block (don't leave a hole - the email reader treats a 3-row blank streak as end-of-table).
4. Remove the drill row, the cross-tab row reference, the `R - <name>` sheet, and the dashboard-contract entry.
5. Update or remove any email caption that called out the removed category.

## Email reader resilience

`extract_wow_rows` in `scripts/build_ix_daily_email.py` tolerates up to 2 blank rows mid-block before treating the table as ended. Do not rely on this to leave permanent holes - it exists so a single mid-edit save doesn't truncate the email. Compact the WoW block whenever you remove a category.
