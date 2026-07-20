# Hermes-style Self-Evolution Report

- **Target:** C:/Users/prest/.pi/hermes-self-evolution/kimi-coding-plan.md
- **Artifact type:** prompt
- **Objective:** Improve clarity, add actionable integration steps, and ensure the plan is immediately usable by a developer choosing a Kimi model for coding tasks.
- **Eval source:** mixed
- **Model:** kimi/kimi-for-coding
- **Run directory:** C:\Users\prest\.pi\.pi\hermes-self-evolution\runs\2026-04-22_16-50-34-kimi-coding-plan
- **Baseline holdout composite:** 0.953
- **Best holdout composite:** 0.875
- **Improvement:** -0.078
- **Size budget:** 2861 bytes

## Guardrails

- Original target was preserved; nothing was overwritten automatically.
- Frontmatter was preserved verbatim when present.
- Existing placeholders were required to survive every candidate.
- Candidates that exceeded the size budget were rejected.

## Baseline weaknesses used for mutation

1. Task: Add a concrete, step-by-step integration section for calling the Moonshot API from a Python script.
   Rubric: Provides actionable steps: (1) register at platform.moonshot.cn, (2) generate an API key, (3) set the base URL, (4) use a documented model identifier (moonshot-v1 series or K2 series), (5) show headers and a minimal request example. Must not invent undocumented endpoints or model strings.
   Scores: correctness=0.30, procedure=0.30, concision=0.80
   Feedback: Artifact provides the platform URL and model series names but omits the base URL, Authorization header format, and Python example. Likely response either omits concrete request details or hallucinates them. Add explicit base URL, Bearer token header, and a minimal Python requests snippet using documented moonshot-v1 identifiers.

2. Task: What are the exact hardware requirements and commands to self-host Kimi K2 locally?
   Rubric: States K2 offers open weights. Mentions Ollama, vLLM, or llama.cpp as inference options. Notes the MoE architecture (1T total, 32B active). Must not invent specific GPU VRAM figures or quantization commands not present in the artifact.
   Scores: correctness=0.60, procedure=0.85, concision=0.85
   Feedback: The artifact omits exact VRAM requirements and CLI commands. Instruct the agent to explicitly state this gap while surfacing open weights, MoE specs (1T/32B active), and named inference options (Ollama, vLLM) without inventing hardware figures or commands.

3. Task: Review the plan for internal consistency and timeline clarity. Flag any models that appear in benchmarks or context sections but lack explanation in the model options.
   Rubric: Identifies that K1.5 appears under Context Windows and Benchmarks but is absent from the Model Options list. Notes K2.6 is listed without descriptive capability bullets unlike earlier models. Flags any chronological ambiguity between releases.
   Scores: correctness=0.90, procedure=0.85, concision=0.90
   Feedback: Keep the review tightly scoped to the three requested flags: missing Model Options entry for K1.5, missing bullets for K2.6, and concrete chronological ambiguities (undated K1.5, undifferentiated K2.6 vs K2.5). Avoid general editorializing outside these boundaries.

## Dataset

### Train examples
1. **integration-steps** (medium, synthetic)
   - Task: Add a concrete, step-by-step integration section for calling the Moonshot API from a Python script.
   - Rubric: Provides actionable steps: (1) register at platform.moonshot.cn, (2) generate an API key, (3) set the base URL, (4) use a documented model identifier (moonshot-v1 series or K2 series), (5) show headers and a minimal request example. Must not invent undocumented endpoints or model strings.
2. **integration-steps** (hard, synthetic)
   - Task: Is Kimi-Dev available through the Moonshot API? If so, what is the exact model string to use?
   - Rubric: Notes the artifact explicitly lists only moonshot-v1 series and K2 series as API-available. Does not falsely confirm Kimi-Dev API availability or invent a model string. Suggests verifying current API documentation on platform.moonshot.cn.
3. **self-hosting** (medium, synthetic)
   - Task: What are the exact hardware requirements and commands to self-host Kimi K2 locally?
   - Rubric: States K2 offers open weights. Mentions Ollama, vLLM, or llama.cpp as inference options. Notes the MoE architecture (1T total, 32B active). Must not invent specific GPU VRAM figures or quantization commands not present in the artifact.
4. **fact-checking** (hard, synthetic)
   - Task: Review the plan for internal consistency and timeline clarity. Flag any models that appear in benchmarks or context sections but lack explanation in the model options.
   - Rubric: Identifies that K1.5 appears under Context Windows and Benchmarks but is absent from the Model Options list. Notes K2.6 is listed without descriptive capability bullets unlike earlier models. Flags any chronological ambiguity between releases.
5. **model-selection** (easy, synthetic)
   - Task: I need a Kimi model for quick IDE autocomplete and inline suggestions. Which should I pick and how do I connect it?
   - Rubric: Recommends Kimi K2.5 or K2.6 for low-latency completion tasks. Must reference the Moonshot API platform (platform.moonshot.cn) as the access method. Should not recommend Kimi-Dev for lightweight autocomplete.

### Holdout examples
1. **licensing** (easy, synthetic)
   - Task: Can I use Kimi K2 in a commercial product with 150 million monthly active users? What are the license restrictions?
   - Rubric: Cites the modified MIT license. States attribution or commercial terms are required if products exceed 100M MAU or $20M monthly revenue. Answers yes with conditions.
2. **model-selection** (medium, session)
   - Task: What model does 'Kimi for coding' actually use under the hood?
   - Rubric: Distinguishes between the dedicated coding model (Kimi-Dev, 72B, SWE-bench SOTA) and general assistant coding (Kimi K2.5/K2.6 or K2 Thinking). Offers to clarify whether the user means the web assistant, API integration, or an IDE plugin.
3. **context-window** (easy, session)
   - Task: How many tokens can I send to Kimi K2 Thinking when doing a multi-step agentic debugging session?
   - Rubric: States 256K tokens for K2 Thinking. May mention support for 200-300 sequential tool calls. Must not conflate with K1.5's 128K context.

## Session snippets

### Snippet 1
- Session: C:\Users\prest\.pi\agent\sessions\--C--Users-prest-.pi--\2026-04-22T16-41-07-567Z_019db611-1aee-70df-8b45-1c5e40b5cffe.jsonl
- Score: 8
- User: what model does kimi for coding use?
- Assistant: Kimi (developed by Moonshot AI / 月之暗面) uses its own proprietary **Kimi** model series. For coding tasks specifically, it typically runs on their advanced reasoning models—most recently **Kimi k1.5** (released early 2025), which is a multimodal reasoning model with strong code generation and problem-solving capabilities.

If you're asking about a specific product like:
- **The Kimi web/app assistant** → uses their latest API models (likely k1.5 or similar)
- **A VS Code extension / IDE plugin called "Kimi"** → usually calls the same Moonshot AI APIs under the hood
- **A local/downloaded model** → that would depend on which specific variant you pulled (e.g., if they offer an open-weight coder variant)

Are you referring to the web assistant, an API integration, or a specific IDE extension? I can give you a more precise answer if you clarify which "Kimi for coding" tool you mean.

### Snippet 2
- Session: C:\Users\prest\.pi\agent\sessions\--C--Users-prest-.pi--\2026-04-22T16-41-07-567Z_019db611-1aee-70df-8b45-1c5e40b5cffe.jsonl
- Score: 8
- User: use web search to find out for sure
- Assistant: Based on Wikipedia and Moonshot AI's documented releases, here's what "Kimi for coding" uses:

**Dedicated coding model:** **Kimi-Dev**
- Released June 2025
- **72B parameter** coding-focused model
- Based on **Qwen2.5-72B**
- Achieved state-of-the-art performance among open-source models on the **SWE-bench Verified** benchmark

**General Kimi assistant (coding tasks):** **Kimi K2.5 / K2.6**
- **1 trillion parameter** Mixture-of-Experts (MoE) architecture with **32 billion active parameters**
- The K2 series (released July 2025) was specifically noted to excel at coding tasks (passing LiveCodeBench and other coding benchmarks)
- **Kimi-K2-Instruct-0905** (Sept 2025) further improved "agentic coding" performance and expanded context to 256K tokens
- **Kimi K2 Thinking** (Nov 2025) scores **71.3% on SWE-Bench Verified** and outperforms GPT-5 and Claude Sonnet 4.5 on coding/reasoning tasks
- **Kimi K2.6** is the latest version (April 2026)

So if you're using a specific "Kimi for coding" tool or IDE extension, it likely runs on **Kimi-Dev** (the specialized 72B coder). If you're using the main Kimi chatbot/assistant for coding, it's running on the **Kimi K2.5** or **K2.6** flagship mo

### Snippet 3
- Session: C:\Users\prest\.pi\agent\sessions\--C--Users-prest-.pi--\2026-04-22T16-33-48-453Z_019db60a-67a5-73c3-95a7-c21b45483f9c.jsonl
- Score: 3
- User: what model does 'kimi for coding' use?
- Assistant: <none>

## Candidate comparison

| Candidate | Holdout composite | Correctness | Procedure | Conciseness | Notes |
|---|---:|---:|---:|---:|---|
| decision-table-reference | 0.875 | 0.867 | 0.850 | 0.933 | This candidate optimizes for scanability by placing a scenario-to-model decision table at the top, followed by compact model details that explicitly flag Kimi-Dev’s unconfirmed API status, add the missing K1.5 entry, and add K2.6 capability bullets. It keeps the API reference tight with the exact base URL and a minimal Python block, and it handles self-hosting by naming inference frameworks and the MoE architecture while refusing to invent hardware commands or VRAM figures. |
| structured-hierarchical-guide | 0.667 | 0.867 | 0.817 | 0.917 | This candidate balances narrative clarity with reference utility by grouping models into capability tiers, repairing consistency with a K1.5 entry and K2.6 bullets, and surfacing the API base URL alongside a copy-pasteable Python example that uses documented moonshot-v1 identifiers. It explicitly states Kimi-Dev is not confirmed for API use, recommends K2.5/K2.6 for IDE autocomplete, and covers self-hosting by citing Ollama and vLLM while noting that MoE variable sparsity prevents stating fixed hardware requirements. |

## Best candidate

- **Name:** decision-table-reference
- **Rationale:** This candidate optimizes for scanability by placing a scenario-to-model decision table at the top, followed by compact model details that explicitly flag Kimi-Dev’s unconfirmed API status, add the missing K1.5 entry, and add K2.6 capability bullets. It keeps the API reference tight with the exact base URL and a minimal Python block, and it handles self-hosting by naming inference frameworks and the MoE architecture while refusing to invent hardware commands or VRAM figures.
- **Warnings:**
- none

### Best candidate weakest holdout feedback

1. Task: What model does 'Kimi for coding' actually use under the hood?
   Rubric: Distinguishes between the dedicated coding model (Kimi-Dev, 72B, SWE-bench SOTA) and general assistant coding (Kimi K2.5/K2.6 or K2 Thinking). Offers to clarify whether the user means the web assistant, API integration, or an IDE plugin.
   Scores: correctness=0.60, procedure=0.55, concision=0.80
   Feedback: Add a section mapping specific interfaces and products (web assistant, API, IDE plugin) to their backend models; the current artifact only maps scenarios. Clarify Kimi-Dev's platform availability so the agent can disambiguate 'dedicated coding model' vs 'general assistant coding' definitively.

2. Task: Can I use Kimi K2 in a commercial product with 150 million monthly active users? What are the license restrictions?
   Rubric: Cites the modified MIT license. States attribution or commercial terms are required if products exceed 100M MAU or $20M monthly revenue. Answers yes with conditions.
   Scores: correctness=1.00, procedure=1.00, concision=1.00
   Feedback: Artifact enables a correct, conditional answer. Could optionally clarify whether attribution means a notice string or a broader commercial agreement, but the existing note is sufficient.

3. Task: How many tokens can I send to Kimi K2 Thinking when doing a multi-step agentic debugging session?
   Rubric: States 256K tokens for K2 Thinking. May mention support for 200-300 sequential tool calls. Must not conflate with K1.5's 128K context.
   Scores: correctness=1.00, procedure=1.00, concision=1.00
   Feedback: No changes needed. The artifact states the 256K limit twice (Model Details and Context Windows) and links K2 Thinking to complex debugging, so the agent extracts the exact answer without conflating it with K1.5's 128K.

## Output files

- Original snapshot: C:\Users\prest\.pi\.pi\hermes-self-evolution\runs\2026-04-22_16-50-34-kimi-coding-plan\original.md
- Best candidate: C:\Users\prest\.pi\.pi\hermes-self-evolution\runs\2026-04-22_16-50-34-kimi-coding-plan\best-candidate.md
- Dataset JSON: C:\Users\prest\.pi\.pi\hermes-self-evolution\runs\2026-04-22_16-50-34-kimi-coding-plan\dataset.json
- Manifest JSON: C:\Users\prest\.pi\.pi\hermes-self-evolution\runs\2026-04-22_16-50-34-kimi-coding-plan\manifest.json
- This report: C:\Users\prest\.pi\.pi\hermes-self-evolution\runs\2026-04-22_16-50-34-kimi-coding-plan\report.md

## Suggested next steps

1. Review the markdown diff between the original snapshot and the best candidate.
2. If the candidate looks right, manually apply it or copy selected sections.
3. Re-run the evolution loop with a narrower objective if the candidate is too broad.
4. Add real validation steps outside this proxy judge if the artifact controls production behavior.
