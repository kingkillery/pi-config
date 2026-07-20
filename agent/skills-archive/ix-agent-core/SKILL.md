---
name: ix-agent-core
description: "Use the repo-local ix-agent CLI (lookup/rundown/qa/assist) for deterministic, single-shot project status answers against this repo's Salesforce exports. Trigger when the user asks about a specific project identifier (e.g. \"7102BRYC\", \"what's the status of...\"), wants a project summary, milestone timeline, next-step inference, or stall analysis."
---

# IX Agent Core (repo-local)

Operational skill for answering project-level interconnection questions in one deterministic CLI call instead of interactive CSV scraping.

## The CLI

Wrapper at `scripts/ix.py`. It puts the vendored `ix_agent` package (from `C:\dev\Desktop-Projects\IX-AGENT-ixv6-dev\IX-Agent-v6-ARCHIVE\src` — override via `IX_AGENT_ARCHIVE_SRC`) on `sys.path`, patches the dataset file-name map to recognize this repo's `General Salesforce Reports/` exports, pickle-caches the parsed `ProjectLookup`, fast-path-dispatches the 4 lookup commands without loading the archive's full handler registry, and delegates to `ix_agent.cli:main` for any other subcommand.

```bash
# exact find on a project identifier
python scripts/ix.py lookup 7102BRYC --json

# fuzzy search (customer name, address, opportunity name)
python scripts/ix.py lookup "Bryce Ewing" --search --limit 5 --json

# structured stage/evidence/notes/logs rundown
python scripts/ix.py rundown 7102BRYC --json

# rule-based Q&A against the project record
python scripts/ix.py qa 7102BRYC --question "what's the status?" --json

# next-step inference + proposed human-approved actions
python scripts/ix.py assist 7102BRYC --json
```

## Rendering summaries

`scripts/ix_summary.py` renders the compact human-readable block from either `rundown` or `lookup` JSON output.

```bash
# one project via stdin
python scripts/ix.py rundown 7102BRYC --json | python scripts/ix_summary.py

# multiple projects in parallel, then summarize the saved JSON files
for t in 7102BRYC 2705HOOD 8608JOAO; do
  python scripts/ix.py rundown "$t" --json > ".artifacts/ix-lookup-$t.json" &
done
wait
python scripts/ix_summary.py .artifacts/ix-lookup-*.json --logs 5

# shortcut: resolve + summarize in one command (spawns rundowns internally)
python scripts/ix_summary.py --lookup 7102BRYC 2705HOOD 8608JOAO --logs 3
```

## Performance

| Scenario                         | Time    |
| -------------------------------- | ------- |
| Cold (no cache, full CSV parse)  | ~7–8 s  |
| Warm (cache hit + fast dispatch) | ~0.9 s  |
| Cache invalidation cost          | rebuild cost (~7 s) only when any source CSV mtime changes |

Cache lives at `.ix-agent-cache/project_lookup.pkl` (gitignored). Invalidates automatically on any source-CSV mtime change or alias-map edit. Safe to delete at any time — next run rebuilds it.

Batch lookups scale near-linearly; 29 rundowns in parallel batches of 10 complete in ~18 s wall-clock.

## Decision pattern

1. Run `rundown <term> --json` — gives structured milestones, key fields per dataset, notes, task logs, utility, freshness snapshot.
2. If the user asked a specific question, run `qa <term> --question "..." --json` instead.
3. Build a short summary: **Current stage** / **Evidence** / **Next steps** / **Missing info**.
4. For action proposals (e.g. refresh exports), use `assist <term> --json` to see what the CLI recommends, then surface for user approval.

## Criteria-based touch breakdowns

Use this skill when the user asks for a project's **touches**, **attempts**, or **actual tries** and wants those counts filtered by a specific rule.

Workflow:
1. Confirm the touch definition before counting when the request is ambiguous.
2. Start from `All-Task-Logs.csv`; use `All-Projects-All-Time.csv` and `All-Field-Open-Hold.csv` only to anchor the current blocker, stage, or hold reason.
3. Deduplicate obvious copy-forward notes, same-day duplicates, and repeated status-only notes before counting.
4. Count only rows that match the requested criterion. Do not mix scheduling, customer contact, utility contact, submissions, and generic status checks unless the user explicitly wants a broad operational count.
5. Return five things: the touch definition used, the count, the dated events that counted, the patterns excluded, and a short blocker/story summary.
6. Separate `VERIFIED` touches (directly supported by dated task-log rows) from `INFERRED` story context.

Common touch lenses:
- **Scheduling touches**: schedule set, reschedule, no-show, cancellation, explicit ask for a visit date, scheduler follow-up
- **Customer-contact touches**: call, text, email, voicemail, inbound homeowner response
- **Utility-contact touches**: portal/email/phone exchange with the utility or AHJ
- **Submission touches**: submitted, resubmitted, corrected upload, payment tied to submission
- **Broad operational touches**: any substantive action except pure copy-forward or status-only notes

Fallback rule:
- If `scripts/ix.py` cannot run because the IX archive path is missing or unavailable, do a direct CSV review instead of blocking the task.

## Inputs

Reads from `General Salesforce Reports/` at repo root:

| Dataset key       | File                          | Role                             |
| ----------------- | ----------------------------- | -------------------------------- |
| `all_ix`          | `All-Projects-All-Time.csv`   | Primary milestones/utility/state |
| `all_ix_holding`  | `All-Field-Open-Hold.csv`     | Current open IX tasks            |
| `task_logs`       | `All-Task-Logs.csv`           | Task log comments                |

Freshness is asserted against the file mtimes. If the CLI returns `success: false, error: "Data is stale..."`, the user should refresh via the `salesforce-dataset-refresh` skill, or pass `--ack-stale` to override.

## Human-in-loop boundary

- Never submit to a utility portal or trigger irreversible actions without explicit user approval.
- For refresh: first run `assist <term> --json`, surface the proposed action, get approval, then `python scripts/ix.py assist <term> --refresh --approve --refresh-all --json`.

## When NOT to use this skill

- Multi-step CSV transformations that don't fit the CLI's shape → use `ix-codemode`.
- Salesforce export refresh itself → use `salesforce-dataset-refresh`.
- Workbook-side operations (Field Work Report) → use `field-spreadsheet`.
- Utility-level questions (portal/docs/fees) → use `utility-skills`.

## Known limitations

- Next-step inference occasionally mis-stages projects (e.g. recommending IXP1 prep after IXP2 submitted). Treat the structured `evidence` block as authoritative; treat `next_steps` as advisory.
- `All-IX-Open-Hold-ALL.csv` is deliberately NOT mapped — it's not on the daily refresh cadence and would trigger false-positive staleness.
- Task logs come back in insertion order, not date order. `scripts/ix_summary.py` sorts them; if consuming the raw JSON, sort by the `[MM/DD/YYYY | ...]` prefix yourself.
- Suffixed project names must be passed verbatim (`6359DENI - Battery Only`, not just `6359DENI`). Use `--search` for fuzzy match on aliases.

## Tests

`tests/test_ix_wrapper.py` exercises all 4 subcommands end-to-end via subprocess, plus cache write/invalidate and a warm-run timing floor. Skips automatically when the archive or exports aren't present locally — this is a local-dev smoke suite, not CI-critical.

```bash
python -m pytest tests/test_ix_wrapper.py -v
```

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
