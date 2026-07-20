---
name: agentmail-cli
description: Use the AgentMail CLI to resolve inbox ids, read inboxes, list unread messages, and extract verification codes such as Salesforce 2FA codes from a known inbox. Trigger when a workflow needs AgentMail, email-based verification, inbox/message lookup, or a CLI-first fallback to the AgentMail API.
---

# AgentMail CLI

Use this skill when a workflow needs AgentMail-backed inbox lookup or verification-code retrieval instead of ad hoc inbox scraping or manual code entry.

Do not assume the `agentmail` CLI is installed in the current shell. Start with the bundled helper script when possible, and only use raw `agentmail` commands after confirming the binary exists. The helper path still requires `AGENTMAIL_API_KEY` to be visible in the current shell.

## Read This First

1. Confirm whether the raw CLI is available:

```powershell
agentmail --version
```

2. Treat `AGENTMAIL_API_KEY` as the primary auth path. Do not hard-code the key into scripts or notes.
3. Use the known Salesforce verification inbox `flywheel@agentmail.to` unless the operator specifies a different inbox.
4. Prefer the bundled helper script for code extraction before writing one-off parsing logic.
5. If the helper script reports `AGENTMAIL_API_KEY is not visible in the current shell`, stop and ask for the key location or ask the operator to provide the 2FA code directly.

## Default Workflow

1. Resolve the inbox id by email address.
2. List the newest unread messages for that inbox.
3. Pull the newest message body that matches the expected verification source.
4. Extract the first 6-digit code unless the calling workflow requests a different regex.
5. Return only the code when the calling workflow needs a form fill.

## Helper Script

Use the bundled helper to avoid guessing at CLI JSON shapes:

```powershell
python .codex\skills\agentmail-cli\scripts\get_latest_code.py `
  --email flywheel@agentmail.to `
  --subject-regex "Salesforce|Verify|verification|identity" `
  --output code
```

On Windows, prefer the helper over raw `agentmail.cmd` for Salesforce codes. Salesforce Message-IDs include angle brackets, and the npm `.cmd` shim can treat those as shell redirection when fetching a message body. The helper resolves the installed Node entrypoint directly and avoids that quoting failure.

JSON output mode:

```powershell
python .codex\skills\agentmail-cli\scripts\get_latest_code.py `
  --email flywheel@agentmail.to `
  --subject-regex "Salesforce|Verify|verification|identity" `
  --output json
```

## Raw CLI Commands

List inboxes:

```powershell
agentmail inboxes list --limit 100 --format json
```

List unread messages for a resolved inbox id:

```powershell
agentmail inboxes:messages list `
  --inbox-id inb_xxx `
  --label unread `
  --limit 20 `
  --format json
```

Fetch one message body:

```powershell
agentmail inboxes:messages get `
  --inbox-id inb_xxx `
  --message-id msg_xxx `
  --format json
```

## Guardrails

- Prefer CLI JSON output over brittle text scraping.
- Do not ask the operator to paste a verification code if the inbox path is already known and AgentMail is the approved source.
- Do not mark messages read or mutate inbox state unless the workflow explicitly requires it.
- If `AGENTMAIL_API_KEY` is missing in the current shell, report that precisely and stop instead of pretending AgentMail is unavailable globally.
- If the inbox lookup returns multiple close matches, surface the candidate inboxes and stop.

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
`Get the newest Salesforce 2FA code from flywheel@agentmail.to.`

`Use AgentMail CLI to find the latest unread verification code and return just the digits.`

`Resolve the inbox id for flywheel@agentmail.to and inspect unread messages.`
