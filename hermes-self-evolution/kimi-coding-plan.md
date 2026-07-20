# Kimi Coding Plan

## Purpose
A quick-reference guide for using Moonshot AI's Kimi models for software engineering, code generation, and debugging tasks.

## Model Options

### Dedicated Coding Model
- **Kimi-Dev** (released June 2025)
  - 72B parameter coding-focused model
  - Based on Qwen2.5-72B
  - State-of-the-art among open-source models on SWE-bench Verified
  - Use when: focused code generation, refactoring, or debugging tasks

### General-Purpose Models (Strong at Coding)
- **Kimi K2** (July 2025)
  - 1 trillion parameter MoE, 32B active parameters
  - Open-sourced under modified MIT license
  - Strong performance on LiveCodeBench and coding benchmarks
  - **Kimi-K2-Instruct-0905** (Sept 2025): improved agentic coding, 256K context

- **Kimi K2 Thinking** (Nov 2025)
  - Designed for advanced reasoning and agentic tasks
  - 71.3% on SWE-Bench Verified
  - 256K context, 200-300 sequential tool calls autonomously

- **Kimi K2.5** (Jan 2026)
  - Multimodal upgrade with native vision (MoonViT encoder)
  - Advanced agentic capabilities for coding from video/images

- **Kimi K2.6** (April 2026)
  - Latest flagship release

## Usage Patterns

### API Access
- Platform: https://platform.moonshot.cn
- Models available via API: moonshot-v1 series, K2 series

### When to Use Which
| Task | Recommended Model |
|------|------------------|
| Quick code snippets, completion | Kimi K2.5 / K2.6 |
| Complex debugging, SWE tasks | Kimi-Dev or Kimi K2 Thinking |
| Agentic coding (multi-step) | Kimi K2 Thinking, K2-Instruct-0905 |
| Multimodal coding (video/image) | Kimi K2.5 |
| Local/self-hosted | Kimi K2 (open weights) |

## Context Windows
- K2 / K2 Thinking: up to 256K tokens
- K1.5: up to 128K tokens (original)
- K2.5: supports long context with efficient attention (KDA)

## Benchmarks
- SWE-bench Verified: Kimi-Dev (SOTA open-source), K2 Thinking (71.3%)
- LiveCodeBench: K2 excels
- Mathematics + coding: K1.5 matched OpenAI o1

## Integration Ideas
- IDE plugin via Moonshot API
- Local inference with K2 open weights (Ollama, vLLM, etc.)
- Agentic workflows using 200+ sequential tool calls (K2 Thinking)

## Notes
- Kimi K2 is open-source and can be downloaded/modified
- Modified MIT license requires attribution for products >100M MAU or $20M monthly revenue
- Chinese company (Moonshot AI / 月之暗面); hosted API may have regional considerations
