# Pipeline Classification Quick Reference

## The Question

> **Is this project OPEN (flowing) or HOLDING (blocked)?**

---

## One-Liner Rules

| If you see... | It's... | Because... |
|---------------|---------|------------|
| "IA Submitted" with no "IA Approved" | **OPEN** | Waiting on utility approval |
| "FI Submitted" with no "FI Received" | **OPEN** | Waiting on utility receipt |
| "Meter Ordered" with no "PTO" | **OPEN** | Waiting on utility meter |
| "IA Sent" with no "IA Signed" | **HOLDING** | Waiting on customer signature |
| "IA Approved" with no "FI Submitted" | **HOLDING** | We need to submit IXP2 |
| Status = "HELD" | **HOLDING** | Check the reason |
| "Pending Utility Work" | **OPEN** | Exception - utility action |

---

## Visual Decision

```
                    ┌─────────────┐
                    │   PROJECT   │
                    └──────┬──────┘
                           │
              ┌────────────┴────────────┐
              │                         │
     ┌────────▼────────┐       ┌────────▼────────┐
     │   SUBMITTED     │       │   WAITING FOR   │
     │   to Utility?   │       │   Our Action?   │
     └────────┬────────┘       └────────┬────────┘
              │                         │
              │                         │
         ┌────▼────┐               ┌────▼────┐
         │  OPEN   │               │ HOLDING │
         │   🟢    │               │   🟡    │
         └─────────┘               └─────────┘
```

---

## Stage Cheatsheet

### Pre-IXP1
| Stage | OPEN/HOLDING | Why |
|-------|--------------|-----|
| Bill needs verification | HOLDING | We verify |
| IA sent, not signed | HOLDING | Customer signs |
| IA signed, not submitted | HOLDING | We submit |

### IXP1
| Stage | OPEN/HOLDING | Why |
|-------|--------------|-----|
| IA submitted, not approved | **OPEN** | UC reviews |
| IA rejected | HOLDING | We fix & resubmit |
| IA approved | HOLDING | We prep next step |

### IXP2
| Stage | OPEN/HOLDING | Why |
|-------|--------------|-----|
| FIN received, not submitted | HOLDING | We submit |
| FI submitted, not received | **OPEN** | UC reviews |
| FI received, inspection pending | HOLDING | We schedule |

### Post-Install
| Stage | OPEN/HOLDING | Why |
|-------|--------------|-----|
| Inspection passed, no meter | HOLDING | We request |
| Meter ordered, no PTO | **OPEN** | UC installs |
| PTO granted | COMPLETE | Done |

---

## HELD Reasons Decoded

| Reason | Classification |
|--------|----------------|
| Signature pending | HOLDING (customer) |
| Design rework | HOLDING (design) |
| HOI renewal | HOLDING (customer) |
| **Pending Utility Work** | **OPEN** |
| Needs Resolution | HOLDING (coord) |
| Bill verification | HOLDING (coord) |

---

## Quick Commands

```bash
# Check one project
python -m ix_agent.cli rundown "PROJECT_ID"

# Get recommendations  
python -m ix_agent.cli assist "PROJECT_ID"

# Check if data is fresh
python -m ix_agent.cli status
```

---

## Remember

1. **OPEN** = Ball is in utility's court
2. **HOLDING** = Ball is in our court (or customer's)
3. **When in doubt** = Check notes for recent activity
4. **HELD status** = Usually HOLDING (except "Pending Utility Work")
