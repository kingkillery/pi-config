# arXiv Research Output Patterns

## Literature Map

Use when the user asks to find papers or survey an area.

```markdown
I found N relevant papers. The area breaks into these threads:

- Thread A: paper ids/titles and why this thread matters.
- Thread B: paper ids/titles and why this thread matters.

Best starting points:
1. Paper - reason.
2. Paper - reason.
```

## Closest Prior Art

Use when comparing papers to a repo, method, or product idea.

```markdown
Closest: **Paper A**. Next closest: **Paper B**.

| Rank | Paper | Match | Difference |
|---|---|---|---|
| 1 | Paper A | Mechanism/domain overlap | Missing piece |
```

## Gap Analysis

Use after closest-prior-art ranking.

```markdown
Main gaps:

1. Gap name - what prior work covers, what remains open.
2. Gap name - why it matters for the user's setup.

Strongest research angle:
> One precise positioning sentence.
```

## Build/Eval Recommendation

Use when the user asks what pattern to build or how to evaluate.

```markdown
Aim for: **Pattern Name**

Pipeline:
task -> candidates -> evidence extraction -> verifier -> aggregation -> ground-truth comparison

Eval:
- Ground truth:
- Metrics:
- First small sandbox:
- Serious benchmark:
```
