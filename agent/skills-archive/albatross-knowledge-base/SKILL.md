---
name: albatross-knowledge-base
description: >
  Read-only reference for Albatross (SunPower/Blue Raven) portal structure, queues, fields, and navigation.
  WHEN: Planning or validating Albatross workflows, exports, or data extraction.
  WHEN NOT: Portal automation (use browser-agent), project lookup (use ix-codemode).
allowed-tools: Read, Grep, Glob
---

# Albatross Knowledge Base

## Overview

**Albatross** (`https://albatross.myblueraven.com`) is SunPower/Blue Raven Solar's project management and interconnection operations platform. This skill provides comprehensive reference documentation for read-only exploration and data extraction.

## When to Use

- Understanding Albatross structure and layout
- Planning browser automation workflows
- Looking up URL patterns and navigation
- Understanding project data architecture
- Identifying export and reporting capabilities

## Albatross Project ID Lookup (Critical — Use This First)

**Fastest method:** `data_output/Utilities Master Report v4(Proj).csv` contains `Project ID` (numeric) + `Project Name` for all ~2,452 projects. Do a pandas name match — no API call needed.

```python
import pandas as pd
df = pd.read_csv('data_output/Utilities Master Report v4(Proj).csv', encoding='latin-1', low_memory=False)
row = df[df['Project Name'] == 'Nathan Luman']
pid = int(row.iloc[0]['Project ID'])  # e.g. 1056410
```

## Albatross API — Verified Working Endpoints (Feb 2026)

| Endpoint | Status | Notes |
|----------|--------|-------|
| `GET /activity/project/{id}` | ✅ Works | Full activity timeline, best source for notes |
| `GET /smartlist/{id}/export` | ✅ Works | Returns CSV (despite .xlsx filename). Has `Project ID` + `Project Name` cols |
| `GET /smartlist/{id}/projects` | ❌ 404s | Do not use |
| `GET /workQueue/{id}/projects` | ❌ 400s | Do not use |
| `GET /project/search?name=...` | ❌ 400/500 | Do not use |

### Known Smartlist IDs

| ID | Name | Rows | Stage |
|----|------|------|-------|
| 4531 | Post-FIV Pre-FC Pipeline | ~728 | Post-inspection, pre-energization |
| 4530 | Pre-FIV Inspection Queue | ~700 | In AHJ inspection (no FI Verified yet) |

### JWT Auth

- Expires 7 days after issue. Check `exp` field in JWT payload.
- Current JWT (valid ~2026-02-24): see `scripts/pull_albatross_notes.py`
- Renewal: DevTools → Application → LocalStorage → `https://albatross.myblueraven.com` → `user.jwt`

## Platform Architecture

### Authentication
- **Method**: Email/Password
- **Environment Variables**: `ALBATROSS_USERNAME`, `ALBATROSS_PASSWORD`
- **Architecture**: Single Page Application (SPA)
- **Behavior**: URL changes don't trigger full page reloads; data loads asynchronously

---

## Main Navigation Structure

| Section | URL | Purpose |
|---------|-----|---------|
| **Work Queue** | `/workQueue` | Operational hub - IX task queues with SLA metrics |
| **Projects** | `/projects` | Project list with filtering (searchable by ID, name, etc.) |
| **Contacts** | `/contacts` | Customer contact management |
| **Schedule** | `/schedule` | Resource scheduling calendar (day/week views) |
| **Smartlists** | `/smartlist` | Saved searches and filters (2,425+ public) |
| **Inbox** | `/inbox` | Internal messaging (INBOX/SENT tabs) |
| **TOOLS** | dropdown | Company Dashboard, Databases, Documents, SMS Queue |

### User/Admin Navigation (Profile Menu)

| Section | URL | Purpose |
|---------|-----|---------|
| **Settings** | `/settings/userProfile` | User profile and preferences |
| **Users** | `/users` | User management (6,319 users) |
| **Organizations** | `/orgs` | Organization management (1,326 orgs) |

---

## Direct URL Patterns

### Project Access
```
Project Status:     /project/{PROJECT_ID}/status
Project Details:    /project/{PROJECT_ID}/details
Process Step:       /project/{PROJECT_ID}/processStep/{STEP_ID}
```

### Work Queue Access
```
Queue Dashboard:    /workQueue
Specific Queue:     /workQueue/{QUEUE_ID}?smartlistId={SMARTLIST_ID}
```

### Database Access
```
Utility List:       /database/utility
Utility Detail:     /database/utility/{UTILITY_ID}/details
```

### Administrative
```
Company Dashboard:  /companyDashboard
Users:              /users
Organizations:      /orgs
Smartlists:         /smartlist/mine (or /public)
```

---

## Project Data Architecture

### Project Identifiers

| System | Pattern | Example | Direct URL |
|--------|---------|---------|------------|
| **Albatross** | Pure numeric | `741622` | `https://albatross.myblueraven.com/project/741622` |
| **Salesforce** | `{digits}{LETTERS}` | `317LNICO` | `ambia.lightning.force.com/lightning/r/Opportunity/{sfId}/view` |

- Albatross IDs are typically 6 digits (e.g., `741622`) — **never** alphanumeric
- SF project codes (`317LNICO`) **never** appear in Albatross
- To cross-reference systems: add `Customer Full Name` to SF export, then search Albatross by name
- SF report downloads are HTML format — use `pd.read_html()` to parse, not `pd.read_csv()`
- **Access**: `/project/{ID}/status`

### Project Detail Layout (3-Panel)

| Panel | Contents |
|-------|----------|
| **Left Sidebar** | Overview, 15+ expandable sections, Contact info |
| **Center Panel** | 8-stage workflow pipeline with milestone checkboxes |
| **Right Panel** | Notes & Activities with hashtag categorization |

### Left Sidebar Sections

1. **General** - Important Notes, Escalation Level/Reason, Project Manager, AHJ, Utility Company, Metro Area
2. **Milestones** - Workflow stage tracking
3. **Sales** - Sales data
4. **System & Financing** - System specs, financing details
5. **Non-standard** - Non-standard flags
6. **HOA** - HOA requirements
7. **Permitting** - Building/Electrical/MPU Permit Numbers, Approval Timeline
8. **Utilities** - Account info, **Interconnection Application ID**, Meter/Premise numbers
9. **Feedback** - Customer feedback
10. **Financials** - Financial data
11. **EPC** - Engineering/Procurement/Construction
12. **Alliance Partners** - Partner information
13. **Uploaded and Linked Documents** - Document management
14. **Current Work Queues** - Active queue assignments
15. **BOM** - Bill of Materials

### Utilities Section Fields (Critical for IX)

| Field | Description |
|-------|-------------|
| **Utility Account Holder** | Name on utility account |
| **Utility Account Number** | Customer's utility account # |
| **Meter Number** | Electric meter identifier |
| **Interconnection Application ID** | IX application tracking ID |
| **Premise Number** | Utility premise identifier |
| **Address on Utility Bill** | Address verification |
| **Homeowner's Insurance Expiration Date** | Date field |
| **Proof of Homeowner's Insurance Obtained** | Checkbox |
| **Homeowner's Insurance Company** | Insurance provider |
| **Meter to be Aggregated** | Checkbox |
| **Meter Aggregation Notes** | Notes field |

---

## 8-Stage Workflow Pipeline

```
1. Project Consultation → 2. Qualification → 3. Design → 4. Installation Prep
→ 5. Installation → 6. Inspection → 7. Energization → 8. Energized
```

### Stage Details with Milestones

**1. Project Consultation**
- Solar Consultation
- Home Improvement Contract Signed

**2. Qualification**
- Site Survey Scheduled
- Site Survey Verified

**3. Design**
- Final Design Created
- Final Design Approved
- Utility Bill Verified
- Final Design Complete

**4. Installation Prep**
- Permit Documents Created
- Permit Submitted to Jurisdiction
- Permit Approved by Jurisdiction
- Installation Ready to Schedule
- Installation Scheduled

**5. Installation**
- Installation Date
- Installation Complete

**6. Inspection**
- Inspection Ready to Schedule
- Inspection Scheduled with Customer
- Inspection Scheduled with Jurisdiction
- Inspection Passed
- Inspection Results Sent to Utility

**7. Energization**
- Net Meter Installed
- Energization Confirmed

**8. Energized** (Final stage)
- Project Complete / PTO Received

---

## Work Queue System

### Dashboard Controls
- **Team Filter**: Dropdown (e.g., "Utilities")
- **View Modes**: % Completed On Time, Projects Completed, Change in WIP
- **Toggles**:
  - Show empty work queues
  - Hide work with next follow-up date in future
  - Hide work with event start date in future

### Queue Card Metrics

| Metric | Description |
|--------|-------------|
| **Queue Name** | Descriptive name |
| **Count** | Projects in queue (large number) |
| **Target %** | SLA target percentage |
| **3-Day %** | Completion rate within 3 days |
| **14-Day %** | Completion rate within 14 days |
| **Expected Time** | Target completion timeframe |

### IX-Specific Work Queues (Complete List)

#### IX Application Flow Queues
| Queue Name | ID | SmartList | Target | Time |
|------------|-----|-----------|--------|------|
| Ready for utility bill verification | 35 | 2141 | 75% | 5 Days |
| Ready to verify renewed HOI | 278 | 2615 | 75% | 5 Days |
| Ready to send IX application | 36 | 2211 | 75% | 3 Days |
| Ready for IX signature verification | 136 | 2068 | 60% | 5 Days |
| Pending hold resolution before submission | 496 | 5339 | - | - |
| Ready to submit IX application | 37 | 2245 | 75% | 3 Days |
| Ready for IX application resubmission | 39 | 2208 | 75% | 3 Days |
| Ready for IX approval | 38 | 2246 | 70% | 2 Weeks |
| Ready for application revision disposition | 200 | 2247 | - | - |

#### Post-Approval & Inspection Queues
| Queue Name | ID | SmartList | Target | Time |
|------------|-----|-----------|--------|------|
| Ready to send inspection results | 40 | 2248 | 75% | 3 Days |
| Ready for utility meter follow up | 41 | 2249 | 70% | 7 Days |
| Ready for PTO follow up | 42 | 2251 | 80% | 11 Days |
| Ready to schedule utility work | 498 | 5361 | 75% | 3 Days |
| Pending utility work | 497 | 5350 | - | - |
| Needs utility re-inspection | 81 | 2254 | 65% | 14 Days |

#### Special/Pipeline Queues
| Queue Name | ID | SmartList | Target | Time |
|------------|-----|-----------|--------|------|
| Post-FIV Pre-FC Pipeline | 428 | 4531 | 85% | 3 Weeks |
| Needs immediate escalation action | 455 | 4838 | 95% | 7 Days |
| Pending IX approval for PTO | 303 | 2918 | - | - |
| Needs Utility DB Info | 604 | 7045 | - | - |
| Pending other work for PTO | 609 | 7178 | - | - |
| Ready for Post Event Disposition | 643 | 7610 | - | - |
| Needs multiple failed IX review | 656 | 7912 | - | - |
| Needs approval for homeowner payment | 734 | 8912 | - | - |

### Queue List View Columns (CSV Export)

| Column | Description |
|--------|-------------|
| Project Name | Customer name with tags |
| Project ID | 7-digit identifier |
| Process Step Name | Current workflow step |
| Process Step Status Type | HELD or ACTIVE |
| Days In Queue | Age (can be 1000+) |
| State Abbreviation | Two-letter state code |
| Owner | Assigned team member |
| Active Process Steps | Comma-separated blockers |
| Utility Company | Electric utility name |
| Project Stage | Current stage |
| Permit Pack Complete | Date milestone |
| AHJ Final Inspection Verified | Date milestone |
| FI Submitted to Utility Date | Date milestone |
| Next Follow-up Date | Scheduled follow-up |
| Note Content | Most recent note |
| Note Created By/At | Author and timestamp |

---

## Status Types

### HELD Statuses (Require Action)

| Status | Meaning | Action |
|--------|---------|--------|
| `IX Resubmission Hold (Signature)` | Waiting for customer signature | Customer outreach |
| `Pending IX Signature` | Awaiting IX signature | Follow up |
| `Pending Design Rework` | Design rejected | Design team fix |
| `IX Resubmission Hold (Revision/Rework)` | Utility rejected | Fix and resubmit |
| `Pending Permit Rework` | Permit needs modification | Permit team |
| `Pending HOI Renewal` | Insurance expired | Customer renewal |
| `Pending Utility Work` | Waiting on utility | Follow up |
| `Needs Resolution - Utilities` | Utility issue | Utility Ops action |

### ACTIVE Statuses (In Progress)

| Status | Meaning |
|--------|---------|
| `Active` | Being worked |
| `Pending IX Application Approval` | Submitted, waiting utility |
| `Pending Utility Bill Verification` | Waiting for verification |

---

## Project Tags

| Tag | Priority | Action |
|-----|----------|--------|
| `Escalated` | HIGH | Prioritize resolution |
| `Legal Involvement` | CRITICAL | **DO NOT TOUCH** |
| `Post SC 270+` | HIGH | Expedite to close |
| `ITC` | MEDIUM | Track tax deadlines |
| `Backup Battery Only` | MEDIUM | Different IX process |
| `Credit Expiring Soon` | HIGH | Prioritize |

---

## Notes & Activities System

### Structure
- **Location**: Right panel of project view
- **Tabs**: Timeline (chronological) / Topic (grouped)
- **Features**: Search, Filter, Pinned notes (yellow)

### Note Tags

| Tag | Description |
|-----|-------------|
| `#interconnection` | IX-related notes |
| `#work-order` | Work order references |
| `#credit` | Credit-related |
| `#permitting` | Permit-related |
| `#process-step` | Step transitions |
| `#site-survey` | Site survey notes |
| `#event` | Event-related |
| `#project` | General project |
| `#escalation` | Escalation notes |
| `#legal` | Legal involvement |

### Note Format Pattern
```
#tag (optional)
TITLE IN CAPS
• FIELD: value
• FIELD: value
Content text
Author Name, Role(Team) | MM/DD/YY H:MM am/pm
```

---

## Export & Reporting Capabilities

### Export Methods

| Method | Location | Format |
|--------|----------|--------|
| **Smartlists** | `/smartlist` | CSV (download button per list) |
| **Company Dashboard** | `/companyDashboard` | Export button (metrics) |
| **Users** | `/users` | Export button |
| **Queue Export** | Queue list view | CSV (Export button) |

### Pre-Built IX Smartlists (13 Identified)

1. Inspection Verified, Pending Interconnection Approval for PTO Submission
2. Interconnection
3. Interconnection Resubmissions
4. Interconnection Submission Queue
5. Interior Subpanel Interconnections
6. Pending Interconnection Approval Audit
7. Rejected Interconnection Application Queue
8. Send Interconnection
9. Sign Interconnection
10. Sign Interconnection (1)
11. Substantially complete, pending interconnection approval...

### Company Dashboard Milestones Tracked

- First Time Appointments Created
- Planned Appointments / Pitches / Bookings
- Site Surveys Verified
- Final Designs (Created, Sent, Approved, Completed)
- Plan Sets / Permit Packs Created
- Permits (Submitted, Approved)
- Installations (Ready/Scheduled/Planned)
- Substantial Completions
- Inspections (Scheduled, Planned, Passed)
- Inspection Results Submitted
- Final Completions

---

## Administrative Features

### Users (`/users`)
- **Count**: 6,319 total users
- **Filters**: Status, Position, Organization, Department, Area, Region
- **Actions**: View Images, Send Email/Text, Export

### Organizations (`/orgs`)
- **Count**: 1,326 total organizations
- **Types**: New Homes Partner, Installation Partner, Contractor, Sales Dealer Partner
- **Parent Orgs**: New Homes, Non-Installing Dealer Network, Work Order

### TOOLS Menu

| Tool | URL | Purpose |
|------|-----|---------|
| Company Dashboard | `/companyDashboard` | Milestone metrics with export |
| Databases | (submenu) | System configuration/lookups |
| Electronic Documents | `/electronicDocuments/request` | Document requests |
| Installation Agreements | `/installation-agreements/request` | Agreement processing |
| Road Map | `/roadmap` | Feature roadmap (Productboard) |
| SMS Queue | `/smsQueue` | SMS message queue |

---

## Utility Database

- **Location**: `/database/utility`
- **Count**: 438 utilities
- **Pagination**: 1-100 per page
- **Detail View**: Click utility name (not edit pencil) → `/database/utility/{id}/details`

### Cached Data Locations
```
workspace_data/albatross_utility_cache.json
workspace_data/albatross_all_utility_ids.json
```

---

## SPA Behavior & Timing

### Key Behaviors
1. URL changes don't trigger full page reloads
2. Data loads asynchronously after navigation
3. Table population takes 2-3 seconds
4. Notes lazy-load on scroll
5. Export downloads immediately (no dialog)

### Recommended Wait Times

| Action | Wait |
|--------|------|
| After navigating to queue | 2-3 seconds |
| After navigating to project | 2-3 seconds |
| After scrolling notes | 1 second |
| Before clicking export | 2-3 seconds after load |

---

## Critical Patterns to Detect

| Pattern | Meaning | Action |
|---------|---------|--------|
| "DO NOT FOLLOW UP" | Project on hold | Skip automation |
| "DO NOT TOUCH" | Absolute blocker | **Never automate** |
| "Legal Involvement" | Legal review | Requires approval |
| "SALES ENABLEMENT TAKING OVER" | Cancellation in progress | Monitor only |
| "LEGAL DO NOT TOUCH" | Legal hold | No action |

---

## DOM Selectors (For Extraction)

| Element | Selectors |
|---------|-----------|
| Project ID | `.project-id`, `[data-project-id]`, `h1` first number |
| Project Name | `.project-name`, `h1.project-title` |
| Status Badge | `.status-badge`, `.status-type` |
| Owner | `.owner`, `.owner-name`, `.assigned-to` |
| Utility | `.utility`, `.utility-company` |
| Days in Queue | `.days-in-queue`, `.queue-days` |
| Process Steps | `.process-step`, `.active-step` |
| Notes Panel | `.notes-panel`, `.activity-timeline` |
| Export Button | `button` with "Export" text |

---

## Integration with IX-Agent

### CLI Commands
```bash
python -m ix_agent.cli lookup <project_id> --json
python -m ix_agent.cli rundown <project_id> --json
python -m ix_agent.cli qa <project_id> --question "..." --json
python -m ix_agent.cli status   # Check data freshness
python -m ix_agent.cli refresh  # Full refresh
```

### Data Mapping (Albatross → IX-Agent Canonical)

| Albatross CSV Column | Canonical Field |
|---------------------|-----------------|
| `fdc_date` | `project_accepted` |
| `utility_bill_verified` | `bill_verified` |
| `ia_sent_to_ho` | `ixp1_prepared` |
| `ia_submitted` | `ixp1_submitted` |
| `ia_signed` | `ixp1_signed` |
| `ia_approved` | `ixp1_approved` |
| `fi_verified` | `electrical_fin_received` |
| `fc_date` | `install_complete` |
| `eto_insp_passed` | `inspections_complete` |
| `fi_submitted` | `ixp2_submitted` |
| `fi_received` | `ixp2_approved` |
| `meter_ordered` | `meter_ordered` |
| `rebate_app_approved` | `pto_granted` |

---

## Related Skills

- `albatross-navigation.md` - Queue IDs and URL patterns
- `albatross-exploration.md` - Fast & Deep extraction methodology
- `albatross-data-extraction.md` - JavaScript extraction techniques
- `albatross-pipeline-review/SKILL.md` - Pipeline classification
- `browser-agent/workflows/albatross.md` - Browser automation workflows

---

## Version History

- **2026-01-17**: Initial comprehensive documentation from multi-agent exploration
