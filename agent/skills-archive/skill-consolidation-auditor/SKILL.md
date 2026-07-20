---
name: skill-consolidation-auditor
description: Audit, consolidate, and rewrite directories of agent skills around primary user intent. Use when asked to reduce duplicate or overlapping SKILL.md/SKILLS.md files, propose DRY skill groupings, preserve hard safety/tool/output constraints, draft merged skills, or produce a skill consolidation audit.
---

# Skill Consolidation Auditor

## Use this skill when

Use this skill when the user asks to audit a skill collection for overlap, reduce top-level skill count, merge related skills, rewrite skills for progressive disclosure, or produce a DRY consolidation plan.

## Do not use this skill when

- The request is to create one unrelated new skill from scratch.
- The request is only to sync existing skill mirrors without analyzing consolidation.
- The files are not agent skills or do not contain skill instructions.

## First decision

- If the user asks for an audit only, inspect the target skill files and return the audit report.
- If the user asks to rewrite or implement consolidation, audit first, then edit only the approved or clearly requested skill groups.
- If the target directory is unclear, infer it from the working directory when it contains skill folders; otherwise ask one targeted question.
- If a merge would lose or weaken any hard requirement, mark it `[blocked]` instead of rewriting it.

## Workflow

1. Inventory candidate `SKILL.md` and `SKILLS.md` files.
2. For each file, identify the primary user intent and extract hard requirements:
   - safety, privacy, legal, and permission constraints
   - tool-specific requirements
   - artifact or output requirements
   - validation steps
   - citation or file-link rules
   - external side-effect gates
3. Compare skills for overlap using the consolidation score.
4. Recommend merging only when the merged skill is easier to choose, easier to execute, and no weaker in safety or specificity.
5. Keep safety-critical, permission-critical, routing, and completion criteria in the top-level skill.
6. Move format-specific, tool-specific, verbose examples, rare edge cases, and implementation details into `references/`.
7. Draft rewritten skills in the standard progressive-disclosure order.
8. Validate that every hard requirement from the originals is preserved or explicitly marked blocked.

## Branches

### Audit only

Use when the user asks for recommendations, an inventory, or a consolidation plan.

Do:
- Return the audit using `references/audit-report-format.md`.
- Include current count, proposed count, net reduction, proposed groups, keep-separate decisions, risks, and next steps.
- Score each proposed merge from 0 to 10.
- Do not edit files unless the user asked for implementation.

### Rewrite consolidated skills

Use when the user asks to create, edit, or implement merged skills.

Do:
- Preserve stricter safety, privacy, legal, and permission rules when sources differ.
- Preserve tool-specific requirements and validation checks exactly unless the user explicitly changes them.
- Use the standard section order:
  1. `# [Skill Name]`
  2. `## Use this skill when`
  3. `## Do not use this skill when`
  4. `## First decision`
  5. `## Workflow`
  6. `## Branches`
  7. `## References`
  8. `## Output requirements`
  9. `## Validation`
  10. `## Examples`
- Keep the first 20 to 30 lines sufficient for routing and branch selection.
- Put long branch details in directly linked reference files.

### Blocked or unsafe merge

Use when overlap exists but consolidation would hide, weaken, or conflict with hard requirements.

Do:
- Mark the merge as `[blocked]`.
- Name the blocking safety, tool, runtime, permission, failure-mode, or user-intent conflict.
- Recommend a safer alternative, such as shared references, duplicated warning text, or a parent routing skill.

## Consolidation score

Start at 0 and apply:

```text
+2 same primary user intent
+2 similar trigger language
+1 shared workflow structure
+1 shared output requirements
+1 shared validation pattern
+1 compatible tools
+1 compatible safety/permission model
+1 token or decision-path reduction

-3 incompatible safety boundary
-2 incompatible tool/runtime requirement
-2 materially different failure mode
-1 merged skill would be harder to route
```

Use this recommendation guide:

```text
8-10: High-confidence merge
5-7: Possible merge; needs careful rewrite
3-4: Usually keep separate
0-2: Do not merge
```

## References

- `references/audit-report-format.md` for the required audit and draft rewrite output structure.

## Output requirements

- Lead with findings and recommendations, not process narration.
- Include file paths for every skill involved in a proposed group.
- State hard requirements preserved for each proposed merge.
- State conflicts or risks, using `None found.` only after checking.
- Include a final recommended next step and manual testing checklist.

## Validation

Before final response or file edits, verify:

- [ ] Every proposed group has one primary user intent.
- [ ] Hard safety, privacy, legal, permission, tool, output, and validation requirements are preserved.
- [ ] Merge scores match the rubric.
- [ ] Blocked merges are clearly marked.
- [ ] Top-level rewritten skills keep routing and critical constraints visible.
- [ ] Reference files are directly linked from the top-level skill.
- [ ] No invented tools or capabilities were added.

## Examples

### Audit request

User asks:
> Audit this skills directory and recommend DRY merges.

Use:
Inventory the skill files, score candidate groups, return the audit report, and do not edit files.

### Rewrite request

User asks:
> Merge the artifact creation skills and draft the consolidated skill.

Use:
Audit the affected skills, preserve all hard requirements, create a concise top-level skill with branches, and move format-specific details into references.
