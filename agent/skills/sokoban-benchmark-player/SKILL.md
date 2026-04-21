---
name: sokoban-benchmark-player
description: Use this skill when running a Sokoban benchmark attempt, improving a reusable Sokoban-playing skill across repeated attempts, filling benchmark attempt packets, writing result.json and postmortem.md, or updating an agent skill with transferable Sokoban heuristics. Triggers on Sokoban benchmark runs, attempt folders, result.json/postmortem.md/updated-skill.md deliverables, baseline vs improvement arms, held-out attempt 5, and requests to play or analyze Sokoban levels without overfitting.
---

# Sokoban Benchmark Player

Use this skill for benchmark-driven Sokoban play sessions where each attempt must produce:
- `result.json`
- `postmortem.md`
- `updated-skill.md`

## Core workflow

For every attempt:
1. Read `attempt.json`, `prompt.md`, and `input-skill.md` first.
2. Inspect the board and identify:
   - box count
   - goal count
   - walls, corners, and narrow corridors
   - boxes already constrained by walls
3. Write a short plan before acting.
4. Play carefully, preferring low-regret pushes over fast speculative pushes.
5. If a push creates a likely deadlock, use undo immediately when available.
6. If the board becomes broadly irrecoverable, reset instead of grinding.
7. Finish by writing `result.json`, `postmortem.md`, and `updated-skill.md`.

## Transferable heuristics

Keep heuristics compact and reusable.

High-value rules:
- Never push a box into a non-goal corner.
- Before pushing, ask whether the box can still reach any goal afterward.
- Avoid pushing boxes flush against walls unless that wall path clearly leads to a goal.
- Preserve player access around boxes; losing the useful side of a box is often the real failure.
- In corridors, think about box order before the first push.
- Prefer moves that increase mobility and reduce congestion.
- If a push makes future movement obviously worse, undo immediately.
- Reset when multiple boxes are frozen or goal access is blocked beyond cheap recovery.

## What to put in the plan

A good short plan includes:
- which box should move first
- which areas are dangerous
- which pushes are forbidden unless they place a box on goal
- when to prefer undo vs reset

## Postmortem rules

Every postmortem should answer:
- what caused wasted actions or resets
- which heuristic would have prevented the mistake
- what concise rule should be added or refined

Do not store level-specific move sequences in the persistent skill.
Store only transferable state-based heuristics.

## Skill update policy

When updating `updated-skill.md`:
- merge duplicate rules
- prefer short bullets over narrative
- remove rules that did not help
- keep the rule set small enough to apply during play
- do not overfit to the held-out attempt

## Evaluation mindset

On held-out attempt 5:
- apply the learned skill cleanly
- do not rely on memorized exact sequences
- prioritize avoiding deadlocks over flashy speed
- use the benchmark metrics honestly
