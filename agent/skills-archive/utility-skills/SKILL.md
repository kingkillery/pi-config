---
name: utility-skills
description: Use the repo-local utility knowledge pack to resolve utilities, answer portal/document/contact/fee/next-step questions, and run the utility lookup self-improvement harness.
allowed-tools: Read, Grep, Glob, Bash
---

# Utility Skills

This repo-local `utility-skills` skill is the main entrypoint for utility-company knowledge in `Interconnection-Dash-2026`.

## Use This Skill For

- one-off utility lookups
- portal URL questions
- required-document questions
- contact and fee questions
- "what's next?" workflow questions
- comparing utility workflow expectations to project state
- running the utility lookup benchmark / self-improvement loop

## Primary Knowledge Roots

- `skills/SKILLS.md`
- `skills/structured-utilities/`
- `skills/utility-sops/coordinator/`
- `skills/utility-references/`

## Fast Commands

Resolve a utility:

```powershell
python scripts/utility_lookup.py "AEP Ohio"
python scripts/utility_lookup.py "Puget Sound Energy" --json
```

Run the utility lookup harness:

```powershell
python scripts/run_utility_lookup_harness.py evaluate
python scripts/run_utility_lookup_harness.py analyze
python scripts/run_utility_lookup_harness.py propose
python scripts/run_utility_lookup_harness.py validate
python scripts/run_utility_lookup_harness.py report
python scripts/run_utility_lookup_harness.py all
```

## Retrieval Order

1. Use `scripts/utility_lookup.py` to resolve the utility name.
2. Read the returned coordinator SOP first when present.
3. Read structured utility files next for normalized workflow/doc/contact data.
4. Read broad utility references last for company-family context.

## Missing Access Details

Never invent:

- portal URLs
- usernames
- passwords
- submission methods

If access data is missing or inconsistent, ask for:

- Utility/company
- Portal URL
- Username or account owner
- Where the password/secret is stored
- Whether this is read-only lookup or a login/submission workflow

## Self-Improvement / Self-Healing

The repo-local harness in `agent-improvement.config.json` benchmarks:

- utility name resolution
- portal/docs/contact/fee/next-step retrieval
- refusal to invent missing URLs/logins
- held-out alias/operator-company variants

Use this harness whenever a user asks to improve utility lookup behavior, benchmark the utility agent, or run a self-healing loop.

## Notes

- Keep utility lookup read-only unless the user explicitly approves an external action.
- Keep utility-specific recurring automation rules in `skills/` or structured files, not hard-coded into daily workbook refresh logic unless the rule is part of an actual recurring contract.

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
