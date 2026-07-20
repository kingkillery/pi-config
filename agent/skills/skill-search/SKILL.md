---
name: skill-search
description: Search the pk-skills1 knowledge base to find the most relevant skills for a task. Use when you need to discover which skill applies, when "using-agent-skills" tree doesn't cover the domain, or when you want semantic search over all 280+ available skills. Triggers on "find a skill for", "which skill", "search skills", "skill for this task", or when no obvious skill match exists.
allowed-tools: Bash(qmd:*), mcp__pk-qmd__*
---

# Skill Search — QMD-Powered Skill Discovery

Find the right skill for any task by querying the `pk-skills1` collection (2,800+ indexed markdown documents covering 280+ skills).

## How It Works

Each skill in `pk-skills1` has a `SKILL.md` with a name, description, trigger patterns, and detailed instructions. This skill uses QMD hybrid search (BM25 + vector + reranking) to match your task description against all skill documents and return the best candidates.

## Delegate the search — do not burn main-context tokens

Skill discovery is a high-token, low-intelligence job: several QMD queries, dozens of hits to scan, and a handful of long `SKILL.md` files to read. Push that work to a cheap delegate lane and keep only the short verdict in this session.

All three lanes run through 9router (`http://127.0.0.1:20128/v1`), so the only requirement is that the 9router daemon is up. Run the search with the fork CLI (`omp --print --model <selector>`, which reads `~/.omp/agent/models.yml`) on one of these, in preference order:

| Order | Model selector | Why |
|-------|----------------|-----|
| 1 | `9router-anthropic/minimax/MiniMax-M3` | MiniMax M3, 1M context — holds every candidate `SKILL.md` at once |
| 2 | `9router/kimi-k2.7-code-fallback` | Kimi K2.7 Code — strong instruction-following on structured retrieval |
| 3 | `9router/cx/gpt-5.6-luna` | Codex GPT-5.6 Luna — fallback when the other two are unavailable |

MiniMax M3 must go through the `9router-anthropic` provider (`/v1/messages`), **not** `9router` (`/v1/chat/completions`) — that router node speaks the Anthropic protocol upstream, and the OpenAI-compat translation silently returns an empty body. The `minimax-code` subagent alias in `config.yml` points at the same corrected selector.

Hand the lane a self-contained prompt: the task description, the Query Strategy and Query Writing Guide sections below, and this output contract:

1. Top 3 candidate skills — name, one-line purpose, match score.
2. The single best pick, with a one-sentence justification.
3. Absolute path to the winning `SKILL.md`.
4. Do not perform the task itself — only identify the skill.

**In a delegate lane, always use the structured multi-line query form** (explicit `lex:` / `vec:` lines, per Step 3 below). A bare single-line `qmd query "text"` triggers LLM query expansion, which is *disabled in headless/CI contexts* — the lane will fail with an "LLM disabled" error and return nothing. Expansion is also slow (~70s vs ~19s). `qmd search` (BM25) and `qmd vsearch` need no LLM and are always safe.

If a selector errors, fall back to the next row. If all three fail the same way, 9router itself is likely down — check `curl -s http://127.0.0.1:20128/v1/models` before assuming a model is missing. Only when 9router is unreachable should you run the QMD queries inline in this session.

Everything below is both the instruction set the delegate lane executes and the inline fallback procedure.

## Query Strategy

Write queries that describe **what you need to accomplish**, not the skill name you're looking for. QMD supports three search modes — combine them for best results.

### Windows filename preflight — prefer Everything for paths

On Windows, before broad recursive scans or when you need the exact path for a known skill name, use Everything through the local wrapper to find candidate `SKILL.md` paths quickly:

```powershell
powershell -NoProfile -File C:\Users\prest\.agents\skills1\pk-skills1\everything-search\scripts\Invoke-EverythingSearch.ps1 "clearwing SKILL.md" -Limit 20
```

Use Everything only for filename/path discovery. After it returns candidates, read the selected `SKILL.md` with `qmd get`, `qmd multi-get`, or the normal file reader before making claims. Prefer QMD search for semantic matching; prefer Everything for exact-name/path lookup, stale-index suspicion, or finding installed skill copies across local skill roots.

### Step 1: Keyword Search (fast, exact terms)

```bash
qmd search "your task keywords" -c pk-skills1 -n 10 --files
```

Good for: known terms, tool names, framework names, exact phrases.

### Step 2: Semantic Search (meaning-based)

```bash
qmd vsearch "describe what you need to do" -c pk-skills1 -n 10 --files
```

Good for: conceptual matching when you don't know the right keywords.

### Step 3: Hybrid Query (best quality)

```bash
qmd query "describe the task" -c pk-skills1 -n 5
```

Or use structured multi-line queries for precision:

```bash
qmd query $'intent: find skill for building a dashboard\nlex: dashboard interactive HTML\nvec: create data visualization with charts and filters' -c pk-skills1 -n 5
```

### Step 4: Read the Top Candidates

Once you identify promising skills, read their full SKILL.md:

```bash
qmd get "pk-skills1/skill-name/SKILL.md" --full
```

Or retrieve multiple at once:

```bash
qmd multi-get "pk-skills1/candidate-1/SKILL.md, pk-skills1/candidate-2/SKILL.md"
```

## Query Writing Guide

| Task Type | Query Strategy |
|-----------|---------------|
| Known domain (e.g. "PDF work") | `lex: pdf` — keyword is enough |
| Vague goal (e.g. "make it pretty") | `vec: improve visual design and UI aesthetics` — semantic |
| Complex task | Combine: `lex: react component` + `vec: build production UI with accessibility` |
| Workflow question | `hyde: A skill that guides you through planning and breaking down large features into tasks` |

### Tips for Better Results

- **Be specific about the outcome**, not the tool: "generate a Word document" not "docx"
- **Include the domain**: "solar interconnection application" not just "application"
- **Use multiple angles**: a lex query for exact terms + a vec query for the concept
- **Filter by score**: `--min-score 0.3` to cut noise
- **Go broad first**: `-n 15 --files` to scan, then `--full` on top hits

## Example Workflows

### "I need to create a slide deck"

```bash
qmd search "slides presentation pptx" -c pk-skills1 -n 5 --files
# → pptx, canvas-design, theme-factory
qmd get "pk-skills1/pptx/SKILL.md" --full
```

### "How do I set up automated testing?"

```bash
qmd query $'intent: find skill for test automation\nlex: testing CI automated\nvec: set up continuous integration with test suites' -c pk-skills1 -n 5
```

### "I need to research a company before a call"

```bash
qmd vsearch "research company before sales call preparation" -c pk-skills1 -n 8 --files
# → call-prep, account-research, daily-briefing, competitive-intelligence
```

## Decision Flow

```
Task arrives → Do you know which skill to use?
  │
  ├── Yes → Use it directly
  └── No  → Run skill-search
              │
              ├── 1+ strong matches (score > 0.5) → Read top SKILL.md, pick best
              ├── Weak matches (0.2-0.5) → Try different query angles
              └── No matches → Task may not have a dedicated skill; proceed manually
```

## Maintenance

The pk-skills1 collection lives at `C:\Users\prest\.agents\skills1\pk-skills1`. After adding or modifying skills:

```bash
qmd update -c pk-skills1
qmd embed -c pk-skills1
```

If a selector errors, fall back to the next row. If all three fail the same way, 9router itself is likely down — check `curl -s http://127.0.0.1:20128/v1/models` before assuming a model is missing. Only when 9router is unreachable should you run the QMD queries inline in this session.

Everything below is both the instruction set the delegate lane executes and the inline fallback procedure.

## Query Strategy

Write queries that describe **what you need to accomplish**, not the skill name you're looking for. QMD supports three search modes — combine them for best results.

### Step 1: Keyword Search (fast, exact terms)

```bash
qmd search "your task keywords" -c pk-skills1 -n 10 --files
```

Good for: known terms, tool names, framework names, exact phrases.

### Step 2: Semantic Search (meaning-based)

```bash
qmd vsearch "describe what you need to do" -c pk-skills1 -n 10 --files
```

Good for: conceptual matching when you don't know the right keywords.

### Step 3: Hybrid Query (best quality)

```bash
qmd query "describe the task" -c pk-skills1 -n 5
```

Or use structured multi-line queries for precision:

```bash
qmd query $'intent: find skill for building a dashboard\nlex: dashboard interactive HTML\nvec: create data visualization with charts and filters' -c pk-skills1 -n 5
```

### Step 4: Read the Top Candidates

Once you identify promising skills, read their full SKILL.md:

```bash
qmd get "pk-skills1/skill-name/SKILL.md" --full
```

Or retrieve multiple at once:

```bash
qmd multi-get "pk-skills1/candidate-1/SKILL.md, pk-skills1/candidate-2/SKILL.md"
```

## Query Writing Guide

| Task Type | Query Strategy |
|-----------|---------------|
| Known domain (e.g. "PDF work") | `lex: pdf` — keyword is enough |
| Vague goal (e.g. "make it pretty") | `vec: improve visual design and UI aesthetics` — semantic |
| Complex task | Combine: `lex: react component` + `vec: build production UI with accessibility` |
| Workflow question | `hyde: A skill that guides you through planning and breaking down large features into tasks` |

### Tips for Better Results

- **Be specific about the outcome**, not the tool: "generate a Word document" not "docx"
- **Include the domain**: "solar interconnection application" not just "application"
- **Use multiple angles**: a lex query for exact terms + a vec query for the concept
- **Filter by score**: `--min-score 0.3` to cut noise
- **Go broad first**: `-n 15 --files` to scan, then `--full` on top hits

## Example Workflows

### "I need to create a slide deck"

```bash
qmd search "slides presentation pptx" -c pk-skills1 -n 5 --files
# → pptx, canvas-design, theme-factory
qmd get "pk-skills1/pptx/SKILL.md" --full
```

### "How do I set up automated testing?"

```bash
qmd query $'intent: find skill for test automation\nlex: testing CI automated\nvec: set up continuous integration with test suites' -c pk-skills1 -n 5
```

### "I need to research a company before a call"

```bash
qmd vsearch "research company before sales call preparation" -c pk-skills1 -n 8 --files
# → call-prep, account-research, daily-briefing, competitive-intelligence
```

## Decision Flow

```
Task arrives → Do you know which skill to use?
  │
  ├── Yes → Use it directly
  └── No  → Run skill-search
              │
              ├── 1+ strong matches (score > 0.5) → Read top SKILL.md, pick best
              ├── Weak matches (0.2-0.5) → Try different query angles
              └── No matches → Task may not have a dedicated skill; proceed manually
```

## Maintenance

The pk-skills1 collection lives at `C:\Users\prest\.agents\skills1\pk-skills1`. After adding or modifying skills:

```bash
qmd update -c pk-skills1
qmd embed -c pk-skills1
```
