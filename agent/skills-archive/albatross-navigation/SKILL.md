---
name: albatross-navigation
description: >
  Navigate Albatross queues/projects and interpret queue status/metrics.
  WHEN: Reviewing queues, exporting queue CSVs, or navigating to project status by ID.
  WHEN NOT: Portal automation (use browser-agent) or data processing (use ix-codemode).
allowed-tools: Read, Grep, Glob
---

# Albatross Navigation Skill

## Overview
This skill provides guidance for navigating Albatross (albatross.myblueraven.com), SunPower's project management and interconnection operations system.

## SPWR Daily / IX Reporting Bridge

For the `SPWR-Daily/Interconnection-Dash-2026` workspace, use Albatross navigation as a read-only evidence source unless the operator explicitly asks for a portal action. When queue/project findings need to affect Salesforce exports, the Field Work Report, or IX prioritization, hand off the exported queue or project facts to `ix-codemode`, `field-spreadsheet`, or `project-prioritization` rather than editing workbook artifacts directly. Always carry forward project id, queue/smartlist id, process step, status, and timestamp so the downstream report can cite current Albatross evidence.

## When to Use
Use this skill when the user asks to:
- Review Albatross queues or work queues
- Look up project status in Albatross
- Find held or blocked projects
- Export queue data
- Navigate to specific projects by ID
- Understand queue statuses
- Analyze IX pipeline health

## Key URLs

### Main Navigation
- **Work Queue**: `https://albatross.myblueraven.com/workQueue`
- **Projects**: `https://albatross.myblueraven.com/projects`
- **Contacts**: `https://albatross.myblueraven.com/contacts`
- **Schedule**: `https://albatross.myblueraven.com/schedule`
- **SmartLists**: `https://albatross.myblueraven.com/smartlist/mine`
- **Inbox**: `https://albatross.myblueraven.com/inbox`

### Direct Project Access
- **Project by ID**: `https://albatross.myblueraven.com/project/{PROJECT_ID}/status`
- **Project Process Step**: `https://albatross.myblueraven.com/project/{PROJECT_ID}/processStep/{STEP_ID}`

## Complete Utilities Work Queue List

### IX Application Flow Queues
| Queue Name | URL Path | SmartList ID | Target | Expected Time |
|------------|----------|--------------|--------|---------------|
| Ready for utility bill verification | `/workQueue/35?smartlistId=2141` | 2141 | 75% | 5 Days |
| Ready to verify renewed homeowner's insurance | `/workQueue/278?smartlistId=2615` | 2615 | 75% | 5 Days |
| Ready to send interconnection (IX) application | `/workQueue/36?smartlistId=2211` | 2211 | 75% | 3 Days |
| Ready for IX signature verification | `/workQueue/136?smartlistId=2068` | 2068 | 60% | 5 Days |
| Pending hold resolution before submission | `/workQueue/496?smartlistId=5339` | 5339 | - | - |
| Ready to submit IX application | `/workQueue/37?smartlistId=2245` | 2245 | 75% | 3 Days |
| Ready for IX application resubmission | `/workQueue/39?smartlistId=2208` | 2208 | 75% | 3 Days |
| Ready for IX approval | `/workQueue/38?smartlistId=2246` | 2246 | 70% | 2 Weeks |
| Ready for application revision disposition | `/workQueue/200?smartlistId=2247` | 2247 | - | - |

### Post-Approval & Inspection Queues
| Queue Name | URL Path | SmartList ID | Target | Expected Time |
|------------|----------|--------------|--------|---------------|
| Ready to send inspection results to utility | `/workQueue/40?smartlistId=2248` | 2248 | 75% | 3 Days |
| Ready for utility meter follow up | `/workQueue/41?smartlistId=2249` | 2249 | 70% | 7 Days |
| Ready for PTO follow up | `/workQueue/42?smartlistId=2251` | 2251 | 80% | 11 Days |
| Ready to schedule utility work | `/workQueue/498?smartlistId=5361` | 5361 | 75% | 3 Days |
| Pending utility work | `/workQueue/497?smartlistId=5350` | 5350 | - | - |
| Needs utility re-inspection | `/workQueue/81?smartlistId=2254` | 2254 | 65% | 14 Days |

### Special/Pipeline Queues
| Queue Name | URL Path | SmartList ID | Target | Expected Time |
|------------|----------|--------------|--------|---------------|
| Post-FIV Pre-FC Pipeline | `/workQueue/428?smartlistId=4531` | 4531 | 85% | 3 Weeks |
| Needs immediate escalation action | `/workQueue/455?smartlistId=4838` | 4838 | 95% | 7 Days |
| Pending IX application approval for PTO | `/workQueue/303?smartlistId=2918` | 2918 | - | - |
| Needs Utility DB Info | `/workQueue/604?smartlistId=7045` | 7045 | - | - |
| Pending other work for PTO | `/workQueue/609?smartlistId=7178` | 7178 | - | - |
| Ready for Post Event Disposition | `/workQueue/643?smartlistId=7610` | 7610 | - | - |
| Needs multiple failed IX review | `/workQueue/656?smartlistId=7912` | 7912 | - | - |
| Needs approval for homeowner payment (Utilities) | `/workQueue/734?smartlistId=8912` | 8912 | - | - |

## Queue Structure

### Work Queue Dashboard
The Work Queue page shows queue cards with:
- **Queue Name**: Descriptive name of the queue
- **Count**: Number of projects in queue (displayed prominently)
- **Target %**: SLA target for completion
- **3-Day %**: Percentage completed within 3 days
- **14-Day %**: Percentage completed within 14 days
- **Expected Time**: Target completion timeframe

### Dashboard Controls
- **Filter Dropdown**: Select team (e.g., "Utilities")
- **View Options**: "% Completed On Time", "Projects Completed", "Change in WIP"
- **Toggle Switches**:
  - Show empty work queues
  - Hide work with next follow-up date in future
  - Hide work with event start date in future

### Queue List View (CSV Export Columns)
| Column | Description |
|--------|-------------|
| Project Name | Customer name with tags displayed |
| Project ID | Unique identifier (6-7 digits) |
| Process Step Name | Current process step |
| Process Step Status Type | HELD or ACTIVE status |
| Days In Queue | Age in queue (can be 1000+ for old projects) |
| State Abbreviation | Two-letter state code |
| Owner | Assigned team member |
| Active Process Steps | Comma-separated list of blockers |
| Utility Company | Electric utility name |
| Project Stage | Design/Installation Prep/Installation/Inspection/Energization |
| Permit Pack Complete | Date milestone completed |
| AHJ Final Inspection Verified | Date inspection passed |
| Next Follow-up Date | Scheduled follow-up |
| Note Content | Most recent note text |
| Note Created By | Note author |
| Note Created At | Note timestamp |

## Project Status Types (HELD vs ACTIVE)

### HELD Statuses (Require Action)
| Status | Meaning | Required Action |
|--------|---------|-----------------|
| `IX Resubmission Hold (Signature)` | Waiting for customer signature | Customer outreach for signature |
| `Pending IX Signature` | Awaiting IX signature | Follow up with customer |
| `Pending Design Rework` | Design rejected/needs modification | Design team to fix |
| `IX Resubmission Hold (Revision/Rework)` | IX application rejected by utility | Fix issues and resubmit |
| `Pending Permit Rework` | Permit needs modification | Permit team action |
| `Pending HOI Renewal` | Homeowner Insurance expired | Customer needs to renew |
| `Pending Utility Work` | Waiting on utility action | Follow up with utility |
| `Needs Resolution - Utilities` | Utility issue needs resolution | Utility Ops action |

### ACTIVE Statuses (In Progress)
| Status | Meaning |
|--------|---------|
| `Active` | Project actively being worked |
| `Pending IX Application Approval` | Submitted, waiting utility approval |
| `Pending Utility Bill Verification` | Waiting for bill verification |

## Project Tags

| Tag | Meaning | Priority | Action |
|-----|---------|----------|--------|
| `Escalated` | Customer escalation, high priority | HIGH | Prioritize resolution |
| `Legal Involvement` | Legal case involved | CRITICAL | **DO NOT TOUCH** |
| `Post SC 270+` | Past substantial completion 270+ days | HIGH | Expedite to close |
| `ITC` | Investment Tax Credit project | MEDIUM | Track for tax deadlines |
| `Backup Battery Only` | Battery-only project | MEDIUM | Different IX process |

## Project Stages (Flow)

```
Design --> Installation Prep --> Installation --> Inspection --> Energization --> Energized
```

### Stage Details with Milestones
1. **Design**
   - Solar Consultation
   - Home Improvement Contract Signed
   - Site Survey Scheduled/Verified
   - Final Design Approved
   - Utility Bill Verified
   - Final Design Complete

2. **Installation Prep**
   - Permit Documents Created
   - Permit Submitted to Jurisdiction
   - Permit Approved by Jurisdiction

3. **Installation**
   - Installation Scheduled
   - Installation Complete

4. **Inspection**
   - Inspection Scheduled with Jurisdiction
   - Inspection Passed
   - Inspection Results Sent to Utility

5. **Energization**
   - Net Meter Installed
   - Energization Confirmed
   - PTO Received

6. **Energized**
   - Project Complete

## Common Active Process Steps (Blockers)

### High Priority Blockers
| Process Step | Meaning | Team |
|--------------|---------|------|
| `Legal` | Legal case involved | Legal |
| `Escalation` | Customer escalated | Leadership |
| `Credit Expired` / `Credit Status` | Credit issues | Finance |
| `Sign Interconnection Application` | Signature needed | IX Team |
| `Multiple Failed IX Submission Review` | Repeated failures | IX Team |
| `Aged Account` | Very old project | Pipeline |

### Standard Process Steps
| Process Step | Meaning | Team |
|--------------|---------|------|
| `Safety Management` | Safety review pending | Safety |
| `Design and Financing` | Design work needed | Design |
| `Permit Pack Creation/Submission` | Permit processing | Permits |
| `Verify Interconnection Application Approval` | Waiting utility | IX Team |
| `Submit AHJ Inspection Approval to Utility` | Send inspection results | IX Team |
| `Materials` | Materials procurement | Operations |
| `Homeowner Payments` | Payment collection | Finance |
| `Pending IX Application Approval for PTO` | Waiting utility approval | IX Team |

## Notes & Activities Panel

### Structure
Located on right side of project view:
- **Timeline Tab**: Chronological activity log
- **Topic Tab**: Grouped by topic/tag
- **Search Bar**: Filter notes by text
- **Pinned Notes**: Critical notes pinned to top (yellow background)
- **+ Add Note**: Button to create new note

### Note Types Discovered
| Tag | Description | Example |
|-----|-------------|---------|
| `#interconnection` | IX-related notes | "IX APPLICATION SIGNATURE FOLLOW-UP ATTEMPT #5" |
| `#work-order` | Work order references | "Roof Leak Repair (7724597)" |
| `#wo-roof-leak` | Specific work order type | Linked to work order ID |
| `#credit` | Credit-related notes | "CREDIT EXPIRING" |
| `#permitting` | Permit status updates |
| `#process-step` | Process step changes | Automated step transitions |

### Common Note Patterns
- **Inbound Phone Call**: Structured with CALLER, REASON FOR CALLING
- **IX Signature Follow-up**: "IX APPLICATION SIGNATURE FOLLOW-UP ATTEMPT #N"
- **Work Order Links**: Clickable links to work order IDs
- **DO NOT TOUCH**: Legal involvement warning

## Key Actions Available

### Queue Level
- **Export**: Click "Export" button to download CSV of all queue items
- **Filter**: Use column headers to filter/sort
- **Hide Future Follow-ups**: Toggle to hide items with future dates

### Project Level
- **View Status**: `/project/{ID}/status` - See milestone checklist
- **View Process Step**: Click process step to see details
- **View Notes**: Notes & Activities panel on right side
- **Add Note**: Click "+ Add Note" button
- **Send Message**: Button in Overview panel to message customer

### TOOLS Menu Options
- Company Dashboard
- Databases
- Electronic Documents
- Installation Agreements
- Road Map
- SMS Queue

## Critical Queues to Monitor (Current Stats)

### 1. Needs Immediate Escalation Action
- **Count**: ~65 projects
- **Target**: 95% completion in 7 days
- **Status**: Likely underperforming
- **Alert**: Projects with customer escalations, legal involvement, negative reviews

### 2. Post-FIV Pre-FC Pipeline
- **Count**: ~723 projects (LARGEST)
- **Target**: 85% completion in 3 weeks
- **3-Day**: 49%, **14-Day**: 66%
- **Note**: Many 1000+ day old projects, massive backlog

### 3. Ready for Application Revision Disposition
- **Count**: ~284 projects
- **Focus**: Projects needing IX application corrections

### 4. Ready for IX Approval
- **Count**: ~190 projects
- **Target**: 70% in 2 weeks
- **3-Day**: 49%, **14-Day**: 50%
- **Note**: Waiting on utility approvals

### 5. Needs Approval for Homeowner Payment
- **Count**: ~174 projects
- **Focus**: Payment approvals needed

### 6. Ready for PTO Follow Up
- **Count**: ~114 projects
- **Target**: 80% in 11 days
- **3-Day**: 65%, **14-Day**: 62%

### 7. Ready to Send Inspection Results
- **Count**: ~105 projects
- **Target**: 75% in 3 days
- **3-Day**: 37%, **14-Day**: 61%

### 8. Pending Hold Resolution
- **Count**: ~48 projects
- **Focus**: Projects held for signatures/design rework

## Browser Automation Tips

### DOM Element Patterns
- Queue cards are `<a>` links with href pattern `/workQueue/{ID}?smartlistId={SMARTLIST_ID}`
- Project names in lists have tag badges (Escalated, Legal Involvement, etc.)
- Notes panel has `Timeline` and `Topic` tabs
- Milestone checkboxes show completion status with dates

### Read Page Strategy
When using `read_page`:
- Use `filter: "interactive"` to find clickable elements
- Queue links contain smartlistId in href
- Project counts appear as text inside queue card links

### Navigation Pattern
1. Start at `/workQueue` with Utilities filter
2. Click queue card to see list view
3. Click Export to download CSV
4. Click project name to see detail view
5. Scroll notes panel for history

## Integration with IX-Agent

The IX-Agent CLI can look up projects using:
```bash
python -m ix_agent.cli lookup <project_id>
python -m ix_agent.cli rundown <project_id>
```

Cross-reference Albatross data with Salesforce using project ID.

## Utility Companies (Common)

### California Utilities
| Utility | Abbreviation | Notes |
|---------|--------------|-------|
| Pacific Gas & Electric Co. | PG&E | Large volume, transformer upgrades common |
| Southern California Edison | SCE | High volume |
| San Diego Gas & Electric | SDG&E | Moderate volume |
| Los Angeles Department of Water & Power | LADWP | Municipal |
| Imperial Irrigation District | IID | Rural |

### Midwest Utilities
| Utility | States | Notes |
|---------|--------|-------|
| Xcel Energy MN | MN | High volume, supplemental reviews |
| Xcel Energy | CO | High volume, feeder upgrades |
| Wisconsin Power and Light (Alliant Energy) | WI | AE- prefix; requires post-inspection AHJ submission |
| We Energies | WI | Moderate volume |
| Consumers Energy | MI | MI PE Stamp req; Inverter vs Battery rating checks |
| DTE Energy | MI | DE- prefix; PowerClerk IX agreement send-out |
| AES Indiana | IN | Engineering reviews |
| ComEd | IL | $50 IX fee; standard geography-based flow |

### Ohio Utilities
| Utility | Notes |
|---------|-------|
| First Energy (Ohio Edison) | High volume |
| Duke Energy OH | Multiple legal holds |
| AEP Ohio | Moderate volume |
| AES Ohio | Engineering reviews |
| Cleveland Public Power | Municipal |
| South Central Power | Cooperative |

### Other Regional Utilities
| Utility | State | Notes |
|---------|-------|-------|
| National Grid MA | MA | High volume |
| Evergy MO Metro / West | MO | Moderate volume |
| NV Energy | NV | NVE- prefix; AHJ trigger for Meter Order; 2-week PTO window |
| Duke Energy Progress NC | NC | REJECTS missing "per occurrence" HOI; Signature desync risk |
| Entergy TX | TX | Account mismatch/Finalled account rejections |
| Seattle City Light | WA | Municipal |
| South Central Power | Cooperative |

## Team Owner Assignments

| Owner | Primary Regions/Utilities | Focus |
|-------|---------------------------|-------|
| Rachel Hatch | CA (PG&E, SDG&E, SCE), NC, OH | West coast, high volume |
| Daniel Kron | MN/CO (Xcel), CT, MA, OR | Midwest, supplemental reviews |
| BMM - Ben Myles-Mills | WI, OH, IN, MI, MO, WA | Midwest, cooperatives |
| Jacob Cook | MN (Xcel), older legal holds | Legacy projects |
| Cody Baxter | IN, various | Support |

## Common Utility-Specific Note Patterns

| Note Pattern | Meaning | Typical Utilities |
|--------------|---------|-------------------|
| "LEGAL DO NOT TOUCH" | Legal hold, no action | Xcel, Duke |
| "FEEDER UPGRADE" | Utility infrastructure upgrade | Xcel MN |
| "Transformer Upgrade" | Grid capacity issue | PG&E, Xcel CO |
| "Engineering Review" | Technical review by utility | AES Indiana, DTE |
| "Supplemental review" | Additional review required | Xcel (CO/MN) |
| "Pending payment" / "Pending Check" | Payment processing | Alliant Energy |
| "In review, pending approval" | Standard utility review | All |
| "Completeness Review" | Application validation | DTE Energy |

## Advanced Operational Context (Deep-Dive Insights)

### Technical Rejection Patterns
- **Inverter Discrepancies**: (Consumers Energy) Flags mismatch between micro-inverter ratings and battery storage nameplates.
- **HOI Specifics**: (Duke Energy) Rejects policies without "per occurrence" liability language.
- **Account Mismatches**: (Entergy TX) Rejections common if the utility account was "finalled" or name doesn't match exactly.

### Systemic Bottlenecks
- **Portal Desync**: Customer signs but portal remains "Pending." Recommendation: Monitored re-signing or document regeneration.
- **Documentation Closeout Loops**: Projects showing "Active" months post-PTO due to missing internal photos or work orders.
- **Ghost Queue Clearing**: Operational pattern where coordinators advance interconnection milestones on projects marked for cancellation just to remove them from their immediate active dashboard. This inflates "Active IA" counts in automated reports.
- **AHJ Handoff**: AHJ Inspection passing is NOT enough; "Submit AHJ Results to Utility" is the official trigger for Meter Orders and PTO.

### Escalation Levels
- **Major Corporate Operations Failure**: Internal high-priority monitoring for organizational issues (crew availability, permit lapses).
- **At Risk**: High probability of cancellation or significant delay due to homeowner health or legal disputes.

## Queue Performance Interpretation

### Health Indicators
- **Green**: 3-Day/14-Day % >= Target %
- **Yellow**: 3-Day/14-Day % within 10% of Target
- **Red**: 3-Day/14-Day % significantly below Target

### Priority Formula
High priority queues combine:
1. Large project count
2. Low completion percentage vs target
3. Customer-facing impact (escalations, payments)
4. Regulatory deadlines (ITC projects)
