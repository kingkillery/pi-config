---
name: keepapi-workflow
description: Extract ALL Google Keep notes (Main, Archive, Trash) to Obsidian vault via Chrome CDP browser automation. On-demand only -- no schedules, no loops, no background processes. Runs when explicitly invoked, then fully exits and cleans up Chrome. Use when the user explicitly asks to sync, export, or archive Google Keep notes. Skip when the user needs two-way sync, real-time sync, scheduled automation, or editing Keep notes from Obsidian.
---

# KeepAPI Workflow

On-demand extraction of ALL Google Keep notes to an Obsidian vault. Runs once when invoked, then fully exits and cleans up.

## Purpose

Single-shot, on-demand sync from Google Keep to Obsidian Markdown. Covers all sections:
- **Main** -- active notes
- **Archive** -- archived notes (prefixed archive_)
- **Trash** -- trashed notes (prefixed trash_)

**Design principle:** No background processes. No scheduled tasks. No loops. Chrome launches, extracts, saves, closes -- fully exits every time.

## Trigger Conditions

Invoke explicitly. Do not auto-run or loop.

- "/keepapi" or "run keepapi"
- "sync my keep notes to obsidian"
- "export google keep"
- "migrate keep notes"
- "archive google keep"
- "download keep notes"
- "keep to obsidian"
- "save ALL keep notes"
- "extract keep archive"

## How to Invoke

### Canonical entry point (all agents should use this)
```bash
python C:\Users\prest\keepapi-mcp\keepapi.py
```

This is the unified CLI that handles preflight cleanup, Chrome lifecycle, and extraction. Agents should invoke this directly rather than managing Chrome or calling sub-scripts.

### Alternative: PowerShell wrapper
```powershell
cd C:\Users\prest\keepapi-mcp
.\keep_automation.ps1 -CloseChromeAfter
```

### Alternative: Direct Python (advanced)
```powershell
cd C:\Users\prest\keepapi-mcp
python extract_all_keep.py --vault "C:\\path\\to\\vault"
```

## What Happens When Invoked

1. **Preflight cleanup** -- kills any zombie Chrome from previous interrupted runs
2. **Launch Chrome** -- opens a hidden Chrome window on a dedicated profile
3. **Extract Main** -- scrolls, loads, extracts all active notes
4. **Extract Archive** -- navigates to archive, extracts all archived notes
5. **Extract Trash** -- navigates to trash, extracts all trashed notes
6. **Save to vault** -- writes Markdown files, skips already-extracted notes
7. **Close Chrome** -- kills the automation Chrome completely
8. **Exit** -- script terminates, nothing persists in memory

Total runtime: ~15-25 seconds for typical note counts.

## Input Schema

```yaml
inputs:
  vault_dir:
    type: path
    required: true
    default: "C:\\dev\\Desktop-Projects\\Helpful-Docs-Prompts\\VAULTS-OBSIDIAN\\Notesandclippings\\Notesandclippings\\Untitled"
  chrome_profile_dir:
    type: path
    required: true
    default: "C:\\Users\\prest\\keepapi-mcp\\chrome_profile"
  debug_port:
    type: integer
    required: true
    default: 9333
    description: Chrome remote debugging port (avoid 9222, conflicts with Comet)
```

## Output Contract

- One .md file per unique note in the vault directory
- Archive notes prefixed with archive_ (e.g., archive_Luma Dream Machine.md)
- Trash notes prefixed with trash_ (e.g., trash_Old Note.md)
- YAML frontmatter containing: title, source, source_section, color, pinned, archived, labels, is_list
- Note body as Markdown (headings for titled notes, checkboxes for lists)
- Footer comment indicating import source
- Duplicate handling: content-hash dedupe within and across runs via manifest.json

### Example Output

```markdown
---
title: Luma Dream Machine
source: google_keep
source_section: archive
color: 
pinned: false
archived: true
labels:
is_list: false
---

# Luma Dream Machine

lumalabs.ai

---
*Imported from Google Keep*
```

## Observation Model

Log every extraction run to C:\Users\prest\keepapi-mcp\observations.jsonl:

```json
{
  "timestamp": "2026-05-14T12:00:00Z",
  "skill_version": "v1.1.0",
  "success": true,
  "sections": {
    "main": {"found": 4, "scroll_height": 1973},
    "archive": {"found": 12, "scroll_height": 2144},
    "trash": {"found": 0, "scroll_height": 482}
  },
  "total_saved": 12,
  "total_skipped": 4,
  "vault_dir": "C:\\dev\\...\\Untitled",
  "chrome_port": 9333,
  "errors": [],
  "warnings": [],
  "duration_seconds": 18.56
}
```

## Chrome Lifecycle Policy

**Chrome must NOT persist after the tool exits.**

- Chrome is launched at the start of each invocation
- Chrome is killed in a `finally` block, guaranteeing cleanup even on errors
- A preflight cleanup kills any zombie Chrome before launching
- `cleanup-chrome.ps1` is available for manual emergency cleanup

**If Chrome is stuck:**
```powershell
.\cleanup-chrome.ps1
```

## Failure Modes and Recovery

| Failure | Detection | Recovery |
|---|---|---|
| Not logged in | URL contains accounts.google.com | Prompt user to log in via Chrome, then retry |
| Port conflict | Test-NetConnection fails | Use alternate port (9333 instead of 9222) |
| Chrome won't start | Debug port never responds | Self-healing: cleanup + retry once |
| Zombie Chrome from last run | Port 9333 already occupied | Preflight cleanup kills it before launch |
| Zero notes found | Selector count == 0 after scroll | Save debug screenshot, inspect DOM class changes |
| DOM class changed | Extraction returns empty cards | Class-agnostic fallback selectors |
| Session expired | Redirected to login on subsequent run | Re-authenticate in Chrome profile |

## What This Tool Is NOT

- **NOT a scheduled task** -- do not register with Task Scheduler
- **NOT a daemon** -- no background process, no polling
- **NOT a loop** -- runs once per invocation, then exits
- **NOT real-time sync** -- does not watch for new notes
- **NOT bidirectional** -- does not write changes back to Keep

## Amendment History

| Version | Date | Change | Evaluation |
|---|---|---|---|
| v1.1.0 | 2026-05-14 | On-demand only. Archive/Trash extraction. Self-healing cleanup. Preflight zombie kill. Chrome lifecycle guarantees. | 16 notes extracted; 0 zombie Chrome left behind |
