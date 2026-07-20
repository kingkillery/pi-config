"""
Build an Excel weekly Task Log report from General Salesforce Reports/All-Task-Logs.csv.

Tabs:
  - Summary       — window, totals, P1/P2 submissions + approvals
  - By Subject    — counts per Subject
  - By Assigned   — counts per Assigned user
  - Subject x Assigned — crosstab (top 15 subjects x top 15 people) with totals
  - P1 vs P2      — submissions/approvals/resubmissions split by Part using Related To
  - Entries       — all rows in window, sorted by Created Date desc

Usage:
  # By rolling N-day window ending on a date:
  python .codex/skills/field-spreadsheet/scripts/build_task_log_weekly_report.py \
    --workspace "C:/Users/prest/Desktop/SPWR-Daily/Interconnection-Dash-2026" \
    [--days 7] [--end 2026-04-23] [--output "Sheets and Dash/Task_Log_Weekly_Report_2026-04-23.xlsx"]

  # By explicit start/end (e.g. Mon-to-today, or a prior calendar week):
  python .codex/skills/field-spreadsheet/scripts/build_task_log_weekly_report.py \
    --workspace "C:/Users/prest/Desktop/SPWR-Daily/Interconnection-Dash-2026" \
    --start 2026-04-20 --end 2026-04-23 \
    --label this-week

  # Built-in preset for current work week (Mon..today) and prior (Mon..Sun):
  python .codex/skills/field-spreadsheet/scripts/build_task_log_weekly_report.py \
    --workspace "C:/Users/prest/Desktop/SPWR-Daily/Interconnection-Dash-2026" --preset this-week
  python .codex/skills/field-spreadsheet/scripts/build_task_log_weekly_report.py \
    --workspace "C:/Users/prest/Desktop/SPWR-Daily/Interconnection-Dash-2026" --preset last-week

If --end is omitted, uses today. If --output is omitted, a reasonable name is chosen from label + dates.
"""
from __future__ import annotations

import argparse
from datetime import date, timedelta
from pathlib import Path

import pandas as pd


SUBJECT_SUBMITTED = "Interconnection: Submitted"
SUBJECT_APPROVED = "Interconnection: Approved"
SUBJECT_RESUBMITTED = "Interconnection: Resubmitted"


def classify_part(related_to: str) -> str:
    if not isinstance(related_to, str):
        return "Other"
    low = related_to.lower()
    if "part 1" in low:
        return "Part 1"
    if "part 2" in low:
        return "Part 2"
    return "Other"


TEAM_DATE_COLS = [
    ("Part 1 Submissions", "IXP1 Application Submitted"),
    ("Part 1 Approvals",   "IXP1 Application Approved"),
    ("Part 2 Submissions", "IXP2 Application Submitted"),
    ("Part 2 Approvals",   "IXP2 Application Approved"),
    ("PTO Granted",        "PTO Granted to Customer"),
]


def team_totals_from_project_dates(workspace: Path, start: pd.Timestamp, end_inclusive: pd.Timestamp) -> pd.DataFrame:
    """Team-level IX totals come from project DATE columns in All-Projects-All-Time.csv,
    not from task-log activity counts. Task-log counts reflect individual logging activity
    and miss project events logged via milestone automation, so they do not match the
    coordinator IX report. Use this function for P1/P2 submission + approval + PTO totals."""
    projects_csv = workspace / "General Salesforce Reports" / "All-Projects-All-Time.csv"
    proj = pd.read_csv(projects_csv, dtype=str, keep_default_na=False, encoding="cp1252")
    rows = []
    for label, col in TEAM_DATE_COLS:
        if col not in proj.columns:
            rows.append({"Metric": label, "Source column": col, "Count": "COLUMN MISSING"})
            continue
        d = pd.to_datetime(proj[col], errors="coerce")
        n = int(((d >= start) & (d <= end_inclusive)).sum())
        rows.append({"Metric": label, "Source column": col, "Count": n})
    return pd.DataFrame(rows)


def build_report(workspace: Path, start: pd.Timestamp, end: pd.Timestamp, output: Path, label: str = "", include_open: bool = False) -> dict:
    csv_path = workspace / "General Salesforce Reports" / "All-Task-Logs.csv"
    df = pd.read_csv(csv_path, dtype=str, keep_default_na=False, encoding="cp1252")
    df["Created Date"] = pd.to_datetime(df["Created Date"], errors="coerce")

    days = (end.normalize() - start.normalize()).days + 1
    end_inclusive = end.normalize() + pd.Timedelta(hours=23, minutes=59, seconds=59)
    start_inclusive = start.normalize()
    window = df[(df["Created Date"] >= start_inclusive) & (df["Created Date"] <= end_inclusive)].copy()
    if not include_open:
        # Completed-only so individual-productivity counts stop inflating.
        window = window[window["Status"] == "Completed"].copy()
    window["Part"] = window["Related To"].apply(classify_part)

    # Team-level totals — always from project DATE columns, not task logs.
    team = team_totals_from_project_dates(workspace, start_inclusive, end_inclusive)

    total = len(window)
    by_subject = window["Subject"].value_counts().rename_axis("Subject").reset_index(name="Count")
    by_assigned = window["Assigned"].value_counts().rename_axis("Assigned").reset_index(name="Count")

    # Crosstab top 15 x top 15
    top_subj = window["Subject"].value_counts().head(15).index
    top_ppl = window["Assigned"].value_counts().head(15).index
    ct = pd.crosstab(window["Subject"], window["Assigned"])
    ct = ct.reindex(index=top_subj, columns=top_ppl, fill_value=0)
    ct["TOTAL"] = ct.sum(axis=1)
    ct.loc["TOTAL"] = ct.sum(axis=0)
    ct = ct.reset_index()

    # P1 vs P2 counts
    def count_pt(subject: str) -> dict:
        sub = window[window["Subject"] == subject]
        return {
            "Total": len(sub),
            "Part 1": int((sub["Part"] == "Part 1").sum()),
            "Part 2": int((sub["Part"] == "Part 2").sum()),
            "Other": int((sub["Part"] == "Other").sum()),
        }

    p1p2 = pd.DataFrame([
        {"Category": "Submissions", **count_pt(SUBJECT_SUBMITTED)},
        {"Category": "Resubmissions", **count_pt(SUBJECT_RESUBMITTED)},
        {"Category": "Approvals", **count_pt(SUBJECT_APPROVED)},
    ])
    p1_subs = int(p1p2.loc[p1p2["Category"] == "Submissions", "Part 1"].iloc[0])
    p2_subs = int(p1p2.loc[p1p2["Category"] == "Submissions", "Part 2"].iloc[0])
    p1_appr = int(p1p2.loc[p1p2["Category"] == "Approvals", "Part 1"].iloc[0])
    p2_appr = int(p1p2.loc[p1p2["Category"] == "Approvals", "Part 2"].iloc[0])

    team_row = {r["Metric"]: r["Count"] for _, r in team.iterrows()}
    summary = pd.DataFrame([
        {"Metric": "Label", "Value": label or "(none)"},
        {"Metric": "Window start", "Value": start.date().isoformat()},
        {"Metric": "Window end", "Value": end.date().isoformat()},
        {"Metric": "Days", "Value": days},
        {"Metric": "-- Team totals (project dates) --", "Value": ""},
        {"Metric": "Part 1 Submissions (team)", "Value": team_row.get("Part 1 Submissions")},
        {"Metric": "Part 1 Approvals (team)", "Value": team_row.get("Part 1 Approvals")},
        {"Metric": "Part 2 Submissions (team)", "Value": team_row.get("Part 2 Submissions")},
        {"Metric": "Part 2 Approvals / PTO (team)", "Value": team_row.get("Part 2 Approvals")},
        {"Metric": "PTO Granted to Customer (team)", "Value": team_row.get("PTO Granted")},
        {"Metric": "-- Individual productivity (task logs, Status=Completed) --", "Value": ""},
        {"Metric": "Total log entries", "Value": total},
        {"Metric": "Distinct Subjects", "Value": int(window["Subject"].nunique())},
        {"Metric": "Distinct Assignees", "Value": int(window["Assigned"].nunique())},
        {"Metric": "P1 Submission logs", "Value": p1_subs},
        {"Metric": "P2 Submission logs", "Value": p2_subs},
        {"Metric": "P1 Approval logs", "Value": p1_appr},
        {"Metric": "P2 Approval logs", "Value": p2_appr},
    ])

    entries = window.sort_values("Created Date", ascending=False).copy()
    entries["Created Date"] = entries["Created Date"].dt.strftime("%Y-%m-%d %H:%M:%S")

    # Per-person readable breakdown — matches the daily-email HTML format exactly.
    # Fixed 8-subject set + Other + TOTAL (Prepped is folded into Other).
    # Row = Assigned (task owner). Email and xlsx stay in sync so coordinators can
    # copy either into a message without re-mapping columns.
    PER_PERSON_COLUMNS = [
        ("Follow Up",  "Interconnection: Follow Up"),
        ("Cust Comm",  "Interconnection: Customer's Communication"),
        ("Submit",     "Interconnection: Submitted"),
        ("Appr",       "Interconnection: Approved"),
        ("Util Comm",  "Interconnection: Utility Communication"),
        ("Rej",        "Interconnection: Rejected: Other"),
        ("Coll",       "Interconnection: Collected Item"),
        ("Miss Sig",   "Interconnection: Missing Signed Document"),
    ]
    short_by_full = {full: short for short, full in PER_PERSON_COLUMNS}
    per_person_full = pd.crosstab(window["Assigned"], window["Subject"])
    out = pd.DataFrame(index=per_person_full.index)
    for short, full in PER_PERSON_COLUMNS:
        out[short] = per_person_full[full] if full in per_person_full.columns else 0
    other_mask_cols = [c for c in per_person_full.columns if c not in short_by_full]
    out["Other"] = per_person_full[other_mask_cols].sum(axis=1) if other_mask_cols else 0
    out["TOTAL"] = out.sum(axis=1)
    per_person = out.sort_values("TOTAL", ascending=False).reset_index()

    output.parent.mkdir(parents=True, exist_ok=True)
    with pd.ExcelWriter(output, engine="openpyxl") as xl:
        summary.to_excel(xl, sheet_name="Summary", index=False)
        team.to_excel(xl, sheet_name="Team Totals (dates)", index=False)
        per_person.to_excel(xl, sheet_name="Per-Person Breakdown", index=False)
        by_subject.to_excel(xl, sheet_name="By Subject", index=False)
        by_assigned.to_excel(xl, sheet_name="By Assigned", index=False)
        ct.to_excel(xl, sheet_name="Subject x Assigned", index=False)
        p1p2.to_excel(xl, sheet_name="P1 vs P2 (logs)", index=False)
        entries.to_excel(xl, sheet_name="Entries", index=False)

    return {
        "output": str(output),
        "label": label,
        "window": {"start": start.date().isoformat(), "end": end.date().isoformat(), "days": days},
        "team_totals_from_project_dates": {
            "P1 Submissions": team_row.get("Part 1 Submissions"),
            "P1 Approvals":   team_row.get("Part 1 Approvals"),
            "P2 Submissions": team_row.get("Part 2 Submissions"),
            "P2 Approvals (PTO)": team_row.get("Part 2 Approvals"),
            "PTO Granted to Customer": team_row.get("PTO Granted"),
        },
        "individual_productivity_from_task_logs_completed": {
            "total_logs": total,
            "p1_sub_logs": p1_subs,
            "p2_sub_logs": p2_subs,
            "p1_appr_logs": p1_appr,
            "p2_appr_logs": p2_appr,
        },
    }


def resolve_preset(preset: str, ref: pd.Timestamp) -> tuple[pd.Timestamp, pd.Timestamp, str]:
    """Return (start, end, default_label) for a named preset anchored at ref (today)."""
    ref = ref.normalize()
    monday_this = ref - pd.Timedelta(days=ref.weekday())
    sunday_last = monday_this - pd.Timedelta(days=1)
    monday_last = sunday_last - pd.Timedelta(days=6)
    if preset == "this-week":
        return monday_this, ref, "this-week"
    if preset == "last-week":
        return monday_last, sunday_last, "last-week"
    raise SystemExit(f"Unknown preset: {preset!r} (expected this-week | last-week)")


def main() -> None:
    ap = argparse.ArgumentParser(description="Build weekly Task Log report xlsx")
    ap.add_argument("--workspace", required=True, type=Path)
    ap.add_argument("--days", type=int, default=None, help="Rolling-window length ending at --end")
    ap.add_argument("--start", type=str, default=None, help="Explicit start date YYYY-MM-DD (inclusive)")
    ap.add_argument("--end", type=str, default=None, help="End date YYYY-MM-DD (inclusive). Default: today.")
    ap.add_argument("--preset", choices=["this-week", "last-week"], default=None,
                    help="Named window anchored at --end (or today). this-week = Mon..end; last-week = prior Mon..Sun.")
    ap.add_argument("--label", type=str, default="", help="Short label baked into Summary and default filename")
    ap.add_argument("--include-open", action="store_true",
                    help="Include Open/In-progress task logs. Default: completed-only (matches the coordinator IX report).")
    ap.add_argument("--output", type=Path, default=None)
    args = ap.parse_args()

    ref = pd.Timestamp(args.end) if args.end else pd.Timestamp(date.today())

    if args.preset:
        start, end, default_label = resolve_preset(args.preset, ref)
        label = args.label or default_label
    elif args.start:
        start = pd.Timestamp(args.start)
        end = ref
        label = args.label
    else:
        days = args.days if args.days is not None else 7
        end = ref
        start = end - pd.Timedelta(days=days - 1)
        label = args.label

    output = args.output
    if output is None:
        slug = f"{label.replace(' ', '-')}_" if label else ""
        output = args.workspace / "Sheets and Dash" / f"Task_Log_Weekly_Report_{slug}{start.date().isoformat()}_to_{end.date().isoformat()}.xlsx"
    if not output.is_absolute():
        output = args.workspace / output

    result = build_report(args.workspace, start, end, output, label=label, include_open=args.include_open)

    import json
    print(json.dumps(result, ensure_ascii=True, indent=2))


if __name__ == "__main__":
    main()
