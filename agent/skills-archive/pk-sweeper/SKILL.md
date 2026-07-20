---
name: pk-sweeper
description: Use when a user or agent wants to run PK Sweeper against a GitHub repository, inspect open issue/PR review candidates, generate conservative review artifacts, or understand safe plan/quick/apply workflows. Prefer running from inside the target repository checkout so git remote auto-detection and `.pksweeper` output behave correctly.
---

# PK Sweeper

PK Sweeper is a conservative GitHub issue/PR maintenance reviewer. Use it to plan review candidates and generate review artifacts. Do not apply close/merge decisions unless the user explicitly asks.

## Proven Setup

- Global commands are expected: `pksweeper` and `pk-sweeper`.
- GitHub auth should already be available through `gh auth status`.
- Run from the target repository checkout whenever possible.
- The target repo is auto-detected from `origin`; use `--repo owner/repo` only when running outside the target checkout.
- Leave `sweeper.config.json` `targetRepo` as `null` for normal local use. Placeholder repo values are ignored and reported.
- Current safe behavior was verified with `kingkillery/Interconnection-Dash-2026`.

## Safe Workflow

From the target repo directory, use the normal coding-session sweep:

```powershell
pksweeper sweep
```

This checks both issues and PRs with balanced selection, includes maintainer-authored items for recommendations, and writes reports only.

Before reviewing, `sweep` preflights the resolved repo, current working directory, target directory, output workspace, GitHub CLI auth, Codex CLI, and target checkout dirty status. It stops before shard work if a required check fails.

For a plan-only preview:

```powershell
pksweeper plan
```

Then run a small review:

```powershell
pksweeper quick --agents 1 --concurrency 1 --batch-size 1 --max-pages 1
```

For a broader but still cautious run:

```powershell
pksweeper quick --agents 4 --concurrency 2 --batch-size 1 --max-pages 2
```

If not inside the target checkout:

```powershell
pksweeper plan --repo owner/repo
pksweeper quick --repo owner/repo --agents 1 --concurrency 1 --batch-size 1 --max-pages 1
```

## Output

When run from a target checkout, PK Sweeper writes artifacts under:

```text
<target-repo>\.pksweeper\
```

Common files and folders:

- `.pksweeper\quick-plan.json`
- `.pksweeper\items\*.md`
- `.pksweeper\artifacts\reviews\...`
- `quick-summary.md`, `todo.md`, and `plan.md` when the run produces summary outputs

If `.pksweeper` makes the checkout appear dirty, make sure the installed PK Sweeper is current:

```powershell
npm ls -g pk-sweeper --depth=0
```

Update from the local PK Sweeper source checkout if needed:

```powershell
cd C:\dev\Desktop-Projects\pk-sweeper
npm install -g .
```

## Guardrails

- Always run `pksweeper plan` before `quick`.
- Start with low limits: `--agents 1 --concurrency 1 --batch-size 1 --max-pages 1`.
- Do not run `apply-decisions` unless the user explicitly asks to act on GitHub.
- Do not use `--merge-prs` unless the user explicitly asks for PR merges.
- Do not pass `--allow-dirty` unless the user confirms local target checkout changes are intentional.
- Treat generated `decision: keep_open` with `review_status: failed` as an execution failure, not a meaningful review.
- If the target repo is dirty before review, inspect `git status --short` and avoid sweeping until unrelated changes are understood.

## Useful Commands

```powershell
gh auth status
pksweeper --help
pksweeper sweep
pksweeper plan
pksweeper quick --agents 1 --concurrency 1 --batch-size 1 --max-pages 1
git status --short
```
