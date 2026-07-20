from __future__ import annotations

import argparse
from datetime import datetime
from pathlib import Path


def main() -> None:
    parser = argparse.ArgumentParser(description="Append a structured Field Spreadsheet learning entry.")
    parser.add_argument("--outcome", required=True, choices=["success", "partial", "failure"])
    parser.add_argument("--summary", required=True)
    parser.add_argument("--signal", required=True)
    parser.add_argument("--evidence", required=True)
    args = parser.parse_args()

    skill_dir = Path(__file__).resolve().parents[1]
    history_path = skill_dir / "references" / "run-history.md"

    timestamp = datetime.now().isoformat(timespec="seconds")
    entry = (
        f"\n## {timestamp}\n\n"
        f"- Outcome: `{args.outcome}`\n"
        f"- Summary: {args.summary}\n"
        f"- Signal: {args.signal}\n"
        f"- Evidence: {args.evidence}\n"
    )
    history_path.parent.mkdir(parents=True, exist_ok=True)
    with history_path.open("a", encoding="utf-8") as handle:
        handle.write(entry)

    print(f"Appended learning entry to {history_path}")


if __name__ == "__main__":
    main()
