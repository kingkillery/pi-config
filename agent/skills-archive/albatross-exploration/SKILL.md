---
name: albatross-exploration
description: >
  Fast, deep extraction protocol for Albatross project context (DOM slurp + inference).
  WHEN: Rapidly auditing a project page or diagnosing portal desyncs.
  WHEN NOT: Portal automation (use browser-agent) or portfolio analysis (use project-prioritization).
allowed-tools: Read, Grep, Glob
---

# Albatross Exploration Skill (The Diver Mission)

## Purpose
The "Diver Mission" is a high-speed, deep-dive protocol for extracting 100% of the relevant context from an Albatross project in the minimum amount of time. It prioritizes semantic depth over UI navigation.

## Core Methodology: "Fast & Deep"

### 1. Direct Entry
- **Action**: Use direct URL patterns to bypass search.
- **Entry Points**: 
  - `https://albatross.myblueraven.com/project/{id}/status` (Primary)
  - `https://albatross.myblueraven.com/project/{id}/details` (Metadata)

### 2. The "DOM Slurp" (Data Capture)
- **Goal**: Minimize browser interactions by capturing large chunks of context in one go.
- **Protocol**:
  - Open the project page.
  - Run a single extraction script to grab:
    - Current Process Step & Description.
    - All visible Notes (with tags and timestamps).
    - Timeline milestones.
  - **Fast Extraction Snippet**:
    ```javascript
    // Capture the core project context blob
    const context = {
        meta: document.querySelector('.project-header-info')?.innerText,
        status: document.querySelector('.process-steps-list')?.innerText,
        notes: document.querySelector('.notes-activity-feed')?.innerText
    };
    console.log(JSON.stringify(context));
    ```

### 3. Ultra-Fast Inference (Cerebras/OpenRouter)
- **Concept**: Feed the raw "DOM Slurp" blob into a high-speed inference engine (e.g., Llama-3-70B via Cerebras/OpenRouter).
- **Benefit**: Reductions in latency of 5-10x compared to standard LLMs, allowing for sub-second classification of complex legal notes or utility bottlenecks.
- **Prompt Strategy**:
  - "Identify the *real* blocker from the following raw Albatross text: [BLOB]"
  - "Extract the exact date of 'IA Approval' vs 'Utility Submission'."

## Exploration Tiers

| Tier | Focus | Time |
|------|-------|------|
| **Tier 1: Surface Scan** | Project Status & current Process Step. | < 2s |
| **Tier 2: Deep Dive** | Full Notes audit + Timeline analysis. | < 5s |
| **Tier 3: Utility Audit** | Comparison with `Utilities Master Report` for desync identification. | < 10s |

## High-Speed Inference Tooling

### OpenRouter / Cerebras Integration
For mission-critical speed during batch processing, use the Cerebras-hosted Llama-3-70B model.

**Example Python Implementation**:
```python
import requests
import os

def fast_parse_albatross(dom_blob):
    api_key = os.getenv("OPENROUTER_API_KEY")
    response = requests.post(
        url="https://openrouter.ai/api/v1/chat/completions",
        headers={
            "Authorization": f"Bearer {api_key}",
        },
        data=json.dumps({
            "model": "cerebras/llama-3.1-70b", # Ultra-fast 1000+ t/s
            "messages": [
                {"role": "system", "content": "You are a specialized Albatross Data Diver."},
                {"role": "user", "content": f"Extract the root cause from this Albatross data: {dom_blob}"}
            ]
        })
    )
    return response.json()
```

### Batch Processing Loop (Aggressive)
When exploring multiple projects (Diver Mission), the agent should:
1.  **Tab Parallelization**: Open 5-10 project tabs simultaneously.
2.  **Snapshot Extraction**: Iterate through tabs and capture DOM states without waiting for full page paints (if the data is in the DOM).
3.  **Background Inference**: Send all 10 blobs to the Cerebras API in a single async batch to reduce total wall-clock time.

- **Detection**: Project is "Active" in Albatross but has had no notes or updates for > 15 days despite being in a sensitive stage (e.g., "Post-FIV").
- **Action**: Check for "Portal Desync" via the Utility-specific skill.

### Portal Desync Workflow
- **Detection**: Albatross says "Submitted," but manual portal check (PowerClerk) says "Pending Documents."
- **Verification**: Cross-reference the "Albatross ID" with the "Utility Reference ID."

## Skill Integration
- Use this skill in conjunction with `albatross-navigation.md` for utility-specific nuances.
- Log all discoveries to `workspace_data/exploration/diver_reports/`.
