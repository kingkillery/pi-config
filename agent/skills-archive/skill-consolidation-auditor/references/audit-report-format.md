# Skill Consolidation Audit Report Format

Use this structure for consolidation audits and draft rewrites.

```markdown
# Skill Consolidation Audit

## Summary

- Current skill count:
- Proposed skill count:
- Net reduction:
- Highest-confidence merges:
- Skills to keep separate:
- Main risks:
- Expected benefit:

---

## Global Duplicate Rules Found

| Rule | Appears In | Recommendation |
|---|---|---|
| [Repeated rule] | [Files] | Move to [shared reference/base section] |

---

## Proposed Skill Groups

### Group 1: [New Skill Name]

**Merge decision:** [High-confidence merge / Possible merge / Keep separate / Blocked]

**Merge score:** [0-10]

**Files:**
- `path/to/skill-a/SKILL.md`
- `path/to/skill-b/SKILL.md`

**Primary user intent:**
[Intent.]

**Why merge:**
[Brief reason.]

**What stays top-level:**
- [Routing/safety/tool requirement]

**What becomes references/examples:**
- [Format-specific details]
- [Long examples]
- [Rare edge cases]

**Hard requirements preserved:**
- [Requirement]
- [Requirement]

**Conflicts or risks:**
- [Conflict/risk, or `None found.`]

**Proposed decision tree:**

```markdown
- If the user asks for X, use branch A.
- If the user asks for Y, use branch B.
- If the output format is unclear but inferable, proceed with the safest likely branch.
- If ambiguity affects tool choice, safety, or irreversible work, ask one targeted question.
```

---

## Skills to Keep Separate

### `path/to/skill/SKILL.md`

**Reason:**
[Why this should remain separate.]

**Non-merge factor:**
[Safety/tool/runtime/failure-mode/user-intent difference.]

---

## Proposed Directory Structure

```text
skills/
  [merged_skill]/
    SKILL.md
    references/
      [branch-a].md
      [branch-b].md
```

---

## Draft Rewritten Skills

For each merged skill, provide this draft:

```markdown
# [Skill Name]

## Use this skill when

[Trigger.]

## Do not use this skill when

[Exclusions.]

## First decision

- If [condition], use [branch].
- If [condition], use [branch].
- If unclear, [default/ask rule].

## Workflow

1. Inspect the user request and available inputs.
2. Select the correct branch.
3. Apply branch-specific tool rules.
4. Preserve all hard constraints.
5. Validate the result.
6. Return the required output.

## Branches

### [Branch A]

Use when:
- [Condition]

Do:
- [Rule]
- [Rule]

Reference:
- `references/[branch-a].md`

### [Branch B]

Use when:
- [Condition]

Do:
- [Rule]
- [Rule]

Reference:
- `references/[branch-b].md`

## Output requirements

- [Requirement]
- [Requirement]

## Validation

Before final response, verify:

- [ ] Correct branch selected
- [ ] Required tools used
- [ ] Hard constraints preserved
- [ ] Output format satisfied
- [ ] File links/citations included if required
- [ ] No duplicated or contradictory rules remain

## Examples

### Example

User asks:
> [Example request]

Use:
[Branch/workflow]
```

---

## Final Recommendation

End with:

```markdown
## Recommended Next Step

Start by merging:

1. [Highest-confidence merge]
2. [Second-highest-confidence merge]
3. [Third-highest-confidence merge]

Avoid merging:

1. [Skill/group]
2. [Skill/group]

Reason:
[Brief rationale.]

## Manual Testing Checklist

- [ ] Run 5 representative user requests through the old skill set.
- [ ] Run the same requests through the proposed consolidated skill set.
- [ ] Compare branch selection accuracy.
- [ ] Compare token load.
- [ ] Check whether any hard requirement was lost.
- [ ] Check whether any safety or permission rule became less visible.
- [ ] Check whether the new top-level skill list is easier to choose from.
```
```
