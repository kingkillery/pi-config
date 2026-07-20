---
name: arxiv-research
description: Use for finding, reviewing, comparing, and synthesizing arXiv papers for a research question, including literature maps, closest-prior-art ranking, gap analysis, and reading-order recommendations. Prefer primary arXiv pages/PDFs and deterministic API search; use this before broad web search when the user asks for arXiv papers, related work, verifier/judge literature, or a concise research brief.
metadata:
  short-description: arXiv paper search and synthesis
---

# arXiv Research

Use this skill when the task is to find or reason over arXiv papers. The goal is not just search results; the goal is a defensible research answer grounded in primary sources.

## Principles

- Prefer primary sources: arXiv abstract pages, PDFs, TeX/HTML, author code links from arXiv pages.
- Search broadly, then synthesize narrowly. Use multiple query phrasings, dedupe by arXiv ID, then read only likely matches.
- Separate exact evidence from inference. Say when a claim is inferred from abstracts or titles.
- Rank papers by fit to the user's concrete setup, not by keyword overlap alone.
- Keep outputs actionable: closest matches, why they match, gaps, and what to read next.
- Include links for every paper used.

## Fast Workflow

1. Restate the user's target in one sentence.
2. Generate 4-10 query variants covering synonyms, method names, and neighboring terms.
3. Run `scripts/search_arxiv.py` for deterministic retrieval.
4. Dedupe results by arXiv ID and inspect abstracts for candidate papers.
5. If comparing against a local repo or system, inspect the local implementation before ranking papers.
6. Classify papers into themes: foundational, closest operational match, adjacent method, cautionary/limitations, survey.
7. Produce the answer in the smallest useful format: ranked list, table, gap analysis, or reading order.

## Search

Run the bundled helper from this skill directory:

```powershell
python .\scripts\search_arxiv.py "LLM verifier" --max 10 --sort relevance
python .\scripts\search_arxiv.py "verifier guided test time scaling" --max 10 --sort date
python .\scripts\search_arxiv.py "LLM as judge trajectory agent" --max 10 --sort relevance
```

For exact phrases, quote inside the query:

```powershell
python .\scripts\search_arxiv.py '"Training Verifiers to Solve Math Word Problems"' --max 5
```

If the helper is unavailable, use the arXiv API directly or web search restricted to `arxiv.org`.

## Review Heuristics

When deciding which paper is closest, compare against these dimensions:

- **Object verified**: final answer, reasoning step, full trajectory, environment state, code artifact, formal property.
- **Verifier type**: prompted LLM judge, trained reward model, generative verifier, deterministic executable checker, formal verifier, agentic judge with tools.
- **Timing**: post-hoc evaluation, Best-of-N/test-time selection, in-loop self-correction, RL training signal.
- **Evidence**: trace-only, tool/environment inspection, tests/simulator, ground truth labels, formal proof.
- **Aggregation**: direct score, pairwise rank, listwise rank, tournament, calibrated probability, pass/fail.
- **Domain**: math, coding, tool-using agents, science, instruction following, safety/privacy.

Prefer the paper with the closest mechanism and evaluation target. If one paper matches mechanism and another matches domain, say that explicitly.

## Output Patterns

For detailed answer shapes, read `references/output-patterns.md` only when needed.

Default concise ranking:

```markdown
Closest: **Paper A**, with **Paper B** as the strongest adjacent match.

1. **Paper A** - why it matches, key difference. Link.
2. **Paper B** - why it matches, key difference. Link.

Main gap: one sentence.
```

## Quality Checks

Before finalizing:

- Did every important claim have an arXiv link or clear local-code basis?
- Did you avoid treating title keywords as proof of fit?
- Did you distinguish "closest prior art" from "foundational/background"?
- Did you surface gaps instead of only listing papers?
- Did you include concrete next steps when the user asks what to build or evaluate?
