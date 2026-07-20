---
name: msi-skill-sync
description: Sync agent skills from a canonical source directory into one or more Obsidian vaults or project workspaces. Compares skill directories by file count and total size, reports new/updated/vault-only skills, then copies everything from canonical into the target while preserving target-only skills. Triggers on "sync skills", "update skills", "skill sync", "refresh skills", "pull latest skills", "sync vault skills", "check for skill updates", or "are my skills up to date".
---

# MSI Skill Sync

Sync skill directories from a canonical source into Obsidian vaults or project workspaces. Reports diffs, copies new/updated skills, preserves target-only skills, and logs every sync.

## Architecture

```
Canonical source (truth)    →    Target workspace(s)
C:\Users\prest\.agents\         Any vault/project folder with
  skills1\pk-skills1\             a Skills\skills1\ subdirectory
```

The script is **non-destructive**: it adds and overwrites but never deletes files that only exist in the target.

## When To Use

- After new skills are added to the canonical `.agents` directory
- When switching machines or syncing a fresh vault
- During vault stewardship / reorganization sessions
- On a schedule (e.g., weekly) to keep vault-internal skill snapshots current
- Before skill-heavy work sessions to ensure all references are up to date

## Quick Start

```bash
# Dry-run: show what's new/changed without copying anything
powershell -ExecutionPolicy Bypass -File "${SKILL_DIR}/scripts/sync-skills.ps1" -Canonical "C:\Users\prest\.agents\skills1\pk-skills1" -Target "C:\path\to\vault\Skills\skills1" -DryRun

# Sync with confirmation prompt
powershell -ExecutionPolicy Bypass -File "${SKILL_DIR}/scripts/sync-skills.ps1" -Canonical "C:\Users\prest\.agents\skills1\pk-skills1" -Target "C:\path\to\vault\Skills\skills1"

# Force sync (no prompt)
powershell -ExecutionPolicy Bypass -File "${SKILL_DIR}/scripts/sync-skills.ps1" -Canonical "C:\Users\prest\.agents\skills1\pk-skills1" -Target "C:\path\to\vault\Skills\skills1" -Force
```

## Parameters

| Parameter | Required | Description |
|-----------|----------|-------------|
| `-Canonical` | Yes | Path to canonical skill source directory |
| `-Target` | Yes | Path to target skills directory to update |
| `-DryRun` | No | Show diff only, don't copy files |
| `-Force` | No | Skip confirmation prompt |
| `-Manifest` | No | Path to a manifest file to append sync log entries (optional) |

## What The Script Does

1. **Scans** both canonical and target directories
2. **Categorizes** every skill as NEW (canonical only), UPDATED (in both but file count/size differs), VAULT-ONLY (target only), or UNCHANGED
3. **Reports** full diff with counts and skill names
4. **Copies** all canonical content into target (overwrites older files, preserves target-only files)
5. **Logs** the sync to a manifest file if `-Manifest` is provided

## Current Known Targets

| Vault / Workspace | Target Path |
|-------------------|-------------|
| SPWR vault | `VAULTS-OBSIDIAN\SPWR\SPWR\1-Projects\Work\WIP-SWAP\Docs-Workspace\WIP-SWAP-DOCS\WIP-SWAP\Skills\skills1` |

When adding new vaults, add them to the table above and to the vault's AGENTS.md.

## Integration With AGENTS.md

After running this skill, the vault's `_ORG/_MANIFEST.md` is updated with a dated sync entry. The vault AGENTS.md should reference this skill in a **Skills Sync** section so agents know the sync command and canonical source.

## Safety Guarantees

- **Never deletes** files — only copies and overwrites
- **Preserves** target-only skills (not in canonical)
- **Idempotent** — safe to run multiple times
- **Dry-run first** — always preview before syncing
