---
name: albatross-pipeline-review
description: >
  Classify interconnection projects as OPEN (in utility hands) or HOLDING (blocked, needs internal action).
  WHEN: Reviewing queue health, prioritizing work, understanding bottlenecks, daily standups.
  WHEN NOT: Submitting applications, making portal changes (use browser-agent).
version: 1.0.0
---

# Albatross Pipeline Review Skill

Systematic classification of interconnection projects to identify what's flowing vs. what's blocked.

## Project ID Conventions

| System | Pattern | Example | Direct URL |
|--------|---------|---------|------------|
| **Albatross** | Pure numeric | `741622` | `https://albatross.myblueraven.com/project/741622` |
| **Salesforce** | `{digits}{LETTERS}` | `317LNICO` | `ambia.lightning.force.com/lightning/r/Opportunity/{sfId}/view` |

> SF codes never appear in Albatross. Cross-reference via `Customer Full Name`.

---

## Core Concept

Every project is either:

| Classification | Meaning | Color | Action |
|----------------|---------|-------|--------|
| **OPEN** | In utility company's hands | 🟢 Green | Monitor, follow up if stale |
| **HOLDING** | Blocked on our/customer action | 🟡 Yellow | Take action to unblock |

---

## Quick Classification Rules

### OPEN (Flowing) - Waiting on Utility

```
OPEN when:
├── IXP1 Submitted → Awaiting UC approval
├── IXP2 Submitted → Awaiting UC receipt/approval  
├── Meter Ordered → Awaiting UC meter install
├── Inspection Results Sent → Awaiting UC response
└── Status = "Pending Utility Work"
```

### HOLDING (Blocked) - Waiting on Us/Customer

```
HOLDING when:
├── Signature Pending → Customer hasn't signed
├── Bill/HOI Issue → Document problem
├── Rejection Received → Needs resubmission
├── Design Rework → Engineering action needed
├── Next Step Not Started → Our action needed
└── Status = HELD (most reasons)
```

---

## Albatross Stage Mapping

### Pre-IXP1 Stages

| Albatross Field | Condition | Classification |
|-----------------|-----------|----------------|
| Utility Bill Verified | Date present, no IA Sent | **HOLDING** |
| IA Sent to HO | Date present, no IA Signed | **HOLDING** (sig) |
| IA Signed | Date present, no IA Submitted | **HOLDING** |

### IXP1 Stages

| Albatross Field | Condition | Classification |
|-----------------|-----------|----------------|
| IA Submitted | No IA Approved | **OPEN** |
| IA Approved | Present | Check next stage |

### IXP2 Stages

| Albatross Field | Condition | Classification |
|-----------------|-----------|----------------|
| FI Verified | No FI Submitted | **HOLDING** |
| FI Submitted | No FI Received | **OPEN** |
| FI Received | Present | Check inspection |

### Post-Installation

| Albatross Field | Condition | Classification |
|-----------------|-----------|----------------|
| ETO Insp Passed | No Meter Ordered | **HOLDING** |
| Meter Ordered | No Rebate Approved | **OPEN** |
| Rebate App Approved | Present | **COMPLETE** |

---

## Decision Tree

```
┌─────────────────────────────────────────────┐
│            PROJECT CLASSIFICATION           │
└─────────────────────────────────────────────┘
                      │
                      ▼
              ┌───────────────┐
              │ Status = HELD? │
              └───────┬───────┘
                      │
         ┌────────────┴────────────┐
         │                         │
         ▼                         ▼
    ┌─────────┐              ┌─────────┐
    │   YES   │              │   NO    │
    └────┬────┘              └────┬────┘
         │                        │
         ▼                        ▼
┌─────────────────┐      ┌─────────────────┐
│ Check HELD reason│      │ Check milestones │
└────────┬────────┘      └────────┬────────┘
         │                        │
    ┌────┴────┐              ┌────┴────┐
    │         │              │         │
    ▼         ▼              ▼         ▼
"Pending   Other         Submitted  Sent but
Utility"   reasons       not        not
                        approved    signed
    │         │              │         │
    ▼         ▼              ▼         ▼
  OPEN    HOLDING          OPEN    HOLDING
```

---

## HELD Status Decoder

| HELD Reason | Classification | Action Owner |
|-------------|----------------|--------------|
| IX Resubmission Hold (Signature) | HOLDING | Customer |
| Pending Design Rework | HOLDING | Design Team |
| Pending HOI Renewal | HOLDING | Customer |
| Pending Utility Work | **OPEN** | Utility |
| Needs Resolution - Utilities | HOLDING | Coordinator |
| Pending Bill Verification | HOLDING | Customer/Coord |
| Inspection Correction | HOLDING | Field Team |

---

## Using IX-Agent for Classification

### Single Project
```bash
python -m ix_agent.cli rundown "PROJECT_ID"
```

Look for:
- `current_stage` - Where in pipeline
- `next_steps` - What's needed
- `last_milestone` / `next_milestone` - Progress indicators

### Batch Classification (Code Mode)

```python
from ix_agent import api as ix

def classify_pipeline(limit=100):
    """Classify projects in pipeline."""
    results = {"open": [], "holding": []}
    
    # Get active projects
    projects = ix.lookup_search("", limit=limit)
    
    for proj in projects.get("results", []):
        project_id = proj.get("project_name")
        status = ix.rundown(project_id)
        
        classification = classify_single(status)
        results[classification].append({
            "id": project_id,
            "stage": status.get("current_stage"),
            "next_step": status.get("next_steps", ["Unknown"])[0]
        })
    
    return results

def classify_single(status):
    """Classify a single project status."""
    stage = status.get("current_stage", "")
    evidence = status.get("evidence", {})
    
    # OPEN stages (in UC hands)
    open_stages = [
        "ixp1_submitted",
        "ixp2_submitted", 
        "meter_ordered",
        "ixp2_received"
    ]
    
    # HOLDING stages (our action)
    holding_stages = [
        "ixp1_sent",      # Signature pending
        "ixp1_signed",    # Submission pending
        "ixp1_approved",  # Next step pending
        "fin_received",   # IXP2 prep pending
        "inspection_passed",  # Meter request pending
        "bill_verified",  # IXP1 prep pending
    ]
    
    if stage in open_stages:
        return "open"
    elif stage in holding_stages:
        return "holding"
    else:
        # Check for HELD status
        status_text = evidence.get("project_status_text", "")
        if "HELD" in str(status_text).upper():
            if "utility work" in str(status_text).lower():
                return "open"
            return "holding"
        return "open"  # Default
```

---

## Browser Review Workflow

When you need to visually review in Albatross:

### 1. Navigate to Queue
```
Direct URL: https://albatross.myblueraven.com/workQueue/{queue_id}?smartlistId={smartlist_id}
```

### 2. Key Columns to Check
- **Status** - ACTIVE vs HELD
- **Active Process Steps** - Blockers
- **Days in Queue** - Stall indicator
- **Last Activity** - Recent work

### 3. Quick Visual Classification

| What You See | Classification |
|--------------|----------------|
| Green status badge | Likely OPEN |
| Yellow/Red status badge | Likely HOLDING |
| "HELD" in status | Check reason |
| High days in queue | Needs attention |

---

## Output Format

### Summary Report

```markdown
## Pipeline Review: [Date]

### Overview
| Classification | Count | % |
|----------------|-------|---|
| OPEN | 45 | 60% |
| HOLDING | 30 | 40% |

### OPEN Projects (In UC Hands)
| Project | Stage | Days | Utility |
|---------|-------|------|---------|
| ABC123 | IXP1 Submitted | 5 | Duke |
| DEF456 | Meter Ordered | 12 | Xcel |

### HOLDING Projects (Action Needed)
| Project | Stage | Blocker | Owner |
|---------|-------|---------|-------|
| GHI789 | Signature Pending | Customer sig | Coord |
| JKL012 | HOI Expired | HOI renewal | Customer |
```

---

## Common Patterns

### Pattern: Signature Backlog
- Many projects with IA Sent but not IA Signed
- **Action**: Bulk signature follow-up

### Pattern: Post-Approval Stall
- Projects approved but no next milestone started
- **Action**: Review for missing FIN or prep work

### Pattern: Rejection Pile-up
- Multiple projects in resubmission queue
- **Action**: Address common rejection reasons

---

## Integration Points

| Tool | Purpose |
|------|---------|
| `rundown` | Get individual project status |
| `assist` | Get recommendations for blocked projects |
| `status` | Check data freshness before review |
| `codemode` | Bulk classification |
| `browser-agent` | Visual queue review |

---

## Files

| File | Purpose |
|------|---------|
| `SKILL.md` | This file - core skill definition |
| `../workflows/albatross-pipeline-review.md` | Detailed workflow steps |
| `../browser-agent/workflows/albatross.md` | Browser automation for Albatross |

---

## See Also

- `docs/CANONICAL_SCHEMA.md` - Milestone field mappings
- `src/ix_agent/status_inference.py` - Classification logic
- `src/ix_agent/pipelines/albatross.py` - Data loading
