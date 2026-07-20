---
name: albatross-data-extraction
description: >
  Techniques for extracting data from Albatross pages (utilities, queues, notes) and caching results.
  WHEN: Planning extraction scripts or parsing Albatross DOM/table data.
  WHEN NOT: Portal automation (use browser-agent) or direct project lookup (use ix-codemode).
allowed-tools: Read, Grep, Glob
---

# Albatross Data Extraction Skill

## Purpose
Reusable techniques for extracting data from Albatross CRM (albatross.myblueraven.com) including:
- Utility database (438 utilities)
- Project notes and activities
- Queue data and project lists
- **Advanced Exploration**: See [albatross-exploration.md](file:///.claude/skills/albatross-exploration.md) for "Fast & Deep" methodology.

## URL Patterns

### Utility Database
```
List:   https://albatross.myblueraven.com/database/utility
Detail: https://albatross.myblueraven.com/database/utility/{utilityId}/details
```

### Project Pages
```
Status: https://albatross.myblueraven.com/project/{projectId}/status
Notes:  https://albatross.myblueraven.com/project/{projectId}/notes
```

### Work Queues
```
Queue:  https://albatross.myblueraven.com/workQueue/{queueId}?smartlistId={smartlistId}
```

## Extraction Techniques

### 1. Click Utility Names (Not Edit Button)
Utility names in the database list ARE clickable links even though they don't look like hyperlinks.
- Click the name text directly → navigates to /database/utility/{id}/details
- Don't click the edit pencil icon

### 2. DOM Text Extraction
```javascript
// Basic page text extraction
var text = document.body.innerText;

// Check for critical patterns
var hasDoNotTouch = text.indexOf('DO NOT') > -1;
var hasLegalHold = text.indexOf('Legal Involvement') > -1;

// Count notes (pipe separators indicate author lines)
var noteCount = text.split(' | ').length - 1;
```

### 3. Table Row Extraction
```javascript
// Extract table data
var rows = document.querySelectorAll('table tbody tr');
var data = [];
for (var i = 0; i < rows.length; i++) {
  var cells = rows[i].querySelectorAll('td');
  if (cells.length >= 3) {
    data.push({
      col1: cells[0].innerText.trim(),
      col2: cells[1].innerText.trim(),
      col3: cells[2].innerText.trim()
    });
  }
}
```

### 4. Notes Parsing Pattern
Notes in Albatross follow this structure:
```
#tag (optional)
TITLE IN CAPS
• FIELD: value
• FIELD: value
Content text
Author Name, Role(Team) | MM/DD/YY H:MM am/pm
```

### 5. Pagination Handling
- Database shows "1-100 of 438"
- Use "Rows per page" dropdown to show 100 at a time
- Navigate pages or scroll to load more

## Caching Strategy

### Notes Cache Location
```
workspace_data/albatross_notes_cache.json
```

### Utility Cache Location
```
workspace_data/albatross_utility_cache.json
```

### Cache Structure
```json
{
  "meta": {
    "last_full_refresh": "ISO timestamp",
    "total_count": 438
  },
  "items": {
    "id": {
      "last_scraped": "ISO timestamp",
      "data": {...}
    }
  }
}
```

## Multi-Tool Parallel Extraction

### Option 1: Claude for Chrome (Visual)
- Best for: Complex UI navigation, modal dialogs
- Speed: ~3s per page

### Option 2: Codex CLI (Headless)
```bash
codex --model o4-mini "Extract utility data from Albatross page"
```

### Option 3: Gemini CLI (Headless)
```bash
python -m ix_agent.cli orchestrate "Extract all utilities from Albatross database"
```

### Option 4: Droid Subagent
```python
# Use factory-droid:code-reason for data processing
# Use factory-droid:pk-poet for planning extraction
```

## Speed Benchmarks

| Operation | Browser | Cached |
|-----------|---------|--------|
| Single utility detail | 3s | 5ms |
| 100 utilities | 5 min | 500ms |
| All 438 utilities | 22 min | 2s |
| Single project notes | 3s | 5ms |
| 100 project notes | 5 min | 500ms |

## Integration with IxCodeMode

```python
from ix_agent.codemode.api import IxCodeMode
from ix_agent.pipelines.albatross_notes import get_cached_notes, has_do_not_touch

ix = IxCodeMode()

# Lookup project with cached notes
project = ix.lookup_find("586699")
notes = get_cached_notes("586699")
safe_to_touch = not has_do_not_touch("586699")
```

## Batch Extraction Loop

```python
# Pseudocode for batch utility extraction
utilities = get_utility_list()  # 438 utilities
for util in utilities:
    navigate_to(f"/database/utility/{util['id']}/details")
    wait_for_load()
    data = extract_page_text()
    cache_utility(util['id'], data)
    # Rate limit: 1 request per 2 seconds
```

## Critical Patterns to Detect

| Pattern | Meaning | Action |
|---------|---------|--------|
| "DO NOT FOLLOW UP" | Project on hold | Skip automation |
| "DO NOT TOUCH" | Absolute blocker | Never automate |
| "Legal Involvement" | Legal review | Requires approval |
| "SALES ENABLEMENT TAKING OVER" | Cancellation in progress | Monitor only |
