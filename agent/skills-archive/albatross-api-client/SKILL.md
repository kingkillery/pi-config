---
name: albatross-api-client
description: "Direct REST API client for Albatross (albatross-api.myblueraven.com) — query work queues, projects, process steps, and export smartlists via JWT Bearer auth. WHEN: Live data queries, smartlist exports, project/step detail retrieval. WHEN NOT: Submitting, approving, or modifying portal data without explicit approval. See albatross-knowledge-base for portal structure reference."
allowed-tools: Read, Grep, Glob, Bash
---

# Albatross API Client Skill

> Portal: `https://albatross.myblueraven.com`
> API Base: `https://albatross-api.myblueraven.com/api/v1/flow`
> Type: Angular SPA + REST API
> Auth: JWT Bearer token (from `localStorage['user'].jwt`)
> Client library: `src/ix_agent/clients/albatross_api.py`

## Safety Rule
**Read-only queries only unless explicitly approved.** Never submit, update, or create portal records without explicit human approval.

## SPWR Daily / IX Reporting Bridge

When Albatross data is being used for this `SPWR-Daily/Interconnection-Dash-2026` workspace, keep the Albatross step read-only and hand exported or queried data back to the IX reporting flow instead of editing workbook outputs manually.

- Use this skill for live Albatross project, process-step, queue, or smartlist reads.
- Use `ix-codemode` for local joins against Salesforce CSVs or workbook-derived views.
- Use `field-spreadsheet` only after the source export/data artifact is staged and the workbook contract is clear.
- Preserve project identifiers, smartlist ids, process step ids, and export timestamps in any handoff notes so workbook or Salesforce conclusions can be traced back to Albatross evidence.

## Auth Pattern

```python
from ix_agent.clients.albatross_api import AlbatrossApiClient

# Option 1: Manual copy (safest)
# DevTools → Application → Local Storage → https://albatross.myblueraven.com
# Expand 'user' key → copy .jwt field value

client = AlbatrossApiClient(jwt="<paste JWT here>")

# Option 2: Extract via Playwright (automated)
from ix_agent.clients.albatross_api import extract_jwt_from_browser
jwt = extract_jwt_from_browser()  # opens browser, waits for login, extracts JWT
client = AlbatrossApiClient(jwt=jwt)
```

**JWT Expiry:** The `user.expiryDate` field indicates expiry. JWTs expire after session inactivity — re-login when needed.

## Key Operations

### Work Queue Metrics
```python
metrics = client.get_work_queue_metrics(category_id=8)
# returns list of {workQueueTypeId, shortWindowExited, longWindowExited, shortWip, longWip, expectedTarget}
```

### Smartlist Export
```python
# Export as file (binary)
client.export_smartlist(smartlist_id=2141, dest_path="./queue_export.xlsx")

# Get projects in smartlist (JSON)
projects = client.get_smartlist_projects(smartlist_id=2141)
```

### Project Detail
```python
project = client.get_project(project_id=741622)
steps = client.get_process_steps(project_id=741622)  # 135 steps
notes = client.get_step_notes(process_step_id=13240940)
```

### All Categories
```python
categories = client.get_all_categories()  # 65+ WQ categories
```

## REST API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/flow/user/current` | Current user profile |
| GET | `/api/v1/flow/workQueueCategory` | All 65+ categories |
| GET | `/api/v1/flow/workQueue/metrics?workQueueCategoryId={id}` | WQ tile metrics |
| GET | `/api/v1/flow/workQueue/{id}` | Single WQ definition |
| GET | `/api/v1/flow/workQueue/{id}/projects` | Projects in WQ |
| GET | `/api/v1/flow/smartlist/{id}` | Smartlist definition |
| GET | `/api/v1/flow/smartlist/{id}/projects` | Projects in smartlist |
| GET | `/api/v1/flow/smartlist/{id}/export` | Export smartlist (binary) |
| GET | `/api/v1/flow/project/{id}` | Full project record |
| GET | `/api/v1/flow/project/{id}/processSteps` | All process steps |
| GET | `/api/v1/flow/processStep/{id}` | Single process step detail |
| GET | `/api/v1/flow/processStep/{id}/notes` | Notes on a step |
| GET | `/api/v1/flow/notifications` | User notifications |
| GET | `/api/v1/flow/announcements/active` | Active announcements |

## URL Patterns (Frontend)

```
Work Queue list:    /workQueue
Work Queue detail:  /workQueue/{wqTypeId}?smartlistId={smartlistId}
Project + step:     /project/{projectId}/processStep/{processStepId}
```

## Key Object Schemas

**Work Queue Metrics (per tile):**
```json
{
  "workQueueTypeId": 35,
  "shortWindowExited": 5,
  "longWindowExited": 12,
  "shortWip": 45,
  "longWip": 103,
  "expectedTarget": 75
}
```

**Project Fields:**
```
id, processId, companyId, contactId, projectStatusTypeId,
projectName, firstName, lastName, processName, projectStatusType,
state, timeZone, country, street1, city, postalCode,
stateAbbreviation, createdBy, phone, companyName, email,
dateCreated, owner, tags, childProjects, latitude, longitude
```

## Refresh Workflow (Integration with ix ingest-manual)

After exporting smartlist data:
```bash
# Export via client, then ingest:
python -c "
from ix_agent.clients.albatross_api import AlbatrossApiClient
client = AlbatrossApiClient(jwt='...')
client.export_smartlist(2141, '~/Downloads/albatross-proj.xlsx')
"
ix ingest-manual --src ~/Downloads
```
