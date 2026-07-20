# Kimi Coding Plan

## Purpose
A developer quick-reference for selecting, accessing, and deploying Moonshot AI's Kimi models for software engineering tasks.

## Model Options

### Dedicated Coding
- **Kimi-Dev** (June 2025)
  - 72B parameters based on Qwen2.5-72B
  - SOTA open-source result on SWE-bench Verified
  - **Not confirmed on the Moonshot API**; verify at platform.moonshot.cn

### General-Purpose & Reasoning
- **Kimi K1.5** (Original release)
  - 128K context window; matched OpenAI o1 on mathematics and coding benchmarks

- **Kimi K2** (July 2025)
  - 1T parameter MoE, 32B active; open weights under modified MIT license
  - Strong LiveCodeBench scores
  - **Kimi-K2-Instruct-0905** (Sept 2025): agentic improvements, 256K context

- **Kimi K2 Thinking** (Nov 2025)
  - 256K context; 71.3% on SWE-Bench Verified
  - Supports 200-300 sequential autonomous tool calls

- **Kimi K2.5** (Jan 2026)
  - Native multimodal vision (MoonViT) for coding from images/video
  - Long-context support with efficient KDA attention

- **Kimi K2.6** (April 2026)
  - Latest flagship with upgraded reasoning and agentic coding capabilities

## Usage Patterns

### Moonshot API Quick Start
1. Register and create a key at https://platform.moonshot.cn.
2. Set base URL to `https://api.moonshot.cn/v1`.
3. Include `Authorization: Bearer <API_KEY>` in headers.
4. Use documented identifiers from the `moonshot-v1` series or K2 series.

```python
import requests

response = requests.post(
    "https://api.moonshot.cn/v1/chat/completions",
    headers={
        "Authorization": "Bearer <API_KEY>",
        "Content-Type": "application/json"
    },
    json={
        "model": "moonshot-v1-8k",
        "messages": [{"role": "user", "content": "Refactor this function."}]
    }
)
data = response.json()
```

### When to Use Which
| Task | Model |
|------|-------|
| Quick autocomplete / inline help | K2.5 / K2.6 via API |
| Deep debugging / SWE tasks | Kimi-Dev (local/verify) or K2 Thinking |
| Agentic multi-step workflows | K2 Thinking, K2-Instruct-0905 |
| Multimodal (image/video) inputs | K2.5 |

### Self-Hosting
Kimi K2 open weights can be served with Ollama, vLLM, or llama.cpp. Because the model uses a 1T/32B-active MoE architecture, hardware requirements vary significantly by quantization and batch size; consult your inference framework’s documentation rather than using a fixed VRAM estimate.

## Context Windows
- K2 / K2 Thinking / K2-Instruct-0905: 256K tokens
- K2.5: long context with efficient KDA attention
- K1.5: 128K tokens

## Notes
- Modified MIT license: attribution required for products >100M MAU or $20M monthly revenue.
- Moonshot AI (月之暗面) is headquartered in China; evaluate regional API latency and compliance as needed.
