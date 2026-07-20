---
name: utility-lookup
description: Resolve utility companies to the right SOP, reference, and structured utility files, then answer portal, document, contact, fee, and next-step questions without inventing missing access details.
---

# Utility Lookup

Use this skill for:

- one-off utility questions
- workflow-task requests tied to a utility company
- portal URL lookups
- required-document lookups
- contact or fee lookups
- "what's next?" utility workflow questions
- cases where login or URL information is missing and the agent must ask safely

## Primary Sources

- `skills/SKILLS.md`
- `skills/structured-utilities/`
- `skills/utility-sops/coordinator/`
- `skills/utility-references/`

## Fast Path

1. Resolve the utility:

```powershell
python scripts/utility_lookup.py "<utility name>"
python scripts/utility_lookup.py "<utility name>" --json
```

2. Read the returned files in this order:
   - coordinator SOP
   - structured utility files
   - broad utility reference

3. Answer only from the retrieved materials.

## Missing Access Details

Never invent:

- portal URLs
- usernames
- passwords
- submission methods

If unsure, ask for:

- Utility/company
- Portal URL
- Username or account owner
- Where the password/secret is stored
- Whether this is read-only lookup or a login/submission workflow

## Related Commands

- Resolve a utility:

```powershell
python scripts/utility_lookup.py "AEP Ohio"
```

- Run the utility benchmark/self-improvement loop:

```powershell
python scripts/run_utility_lookup_harness.py evaluate
python scripts/run_utility_lookup_harness.py all
```

If the user is asking to improve the utility agent or benchmark failures rather than answer a utility question, hand off to `.claude/skills/agent-self-improvement/SKILL.md`.

## Notes

- Keep utility lookup separate from daily report refresh logic.
- Read from `skills/` rather than hard-coding utility rules into workbook refresh scripts unless the rule is part of a recurring automation contract.

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
