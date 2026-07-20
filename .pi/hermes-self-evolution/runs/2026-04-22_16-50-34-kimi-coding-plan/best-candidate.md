# Kimi Coding Plan

## Purpose
Task-oriented quick-reference for choosing and integrating Kimi models for coding.

## Pick a Model
| Scenario | Model | How to Access |
|----------|-------|---------------|
| IDE autocomplete, quick snippets | Kimi K2.5 / K2.6 | Moonshot API |
| Complex debugging / SWE tasks | Kimi-Dev (verify) or K2 Thinking | Check docs / API |
| Multi-step agentic coding | K2 Thinking, K2-Instruct-0905 | Moonshot API |
| Video/image to code | Kimi K2.5 | Moonshot API |
| Local self-hosting | Kimi K2 | Open weights |

## Model Details
- **Kimi-Dev** (June 2025): 72B coding model (Qwen2.5-72B). SOTA open-source on SWE-bench. **Unconfirmed on Moonshot API**; check platform.moonshot.cn.
- **Kimi K1.5** (Original): Earlier generation with 128K context. Matched OpenAI o1 on math + coding.
- **Kimi K2** (July 2025): 1T MoE / 32B active. Open weights (modified MIT). Strong on LiveCodeBench.
  - **Kimi-K2-Instruct-0905** (Sept 2025): 256K context, improved agentic coding.
- **Kimi K2 Thinking** (Nov 2025): 256K context, 71.3% SWE-Bench Verified, 200-300 autonomous tool calls.
- **Kimi K2.5** (Jan 2026): Multimodal with native vision (MoonViT). Long-context with KDA attention.
- **Kimi K2.6** (April 2026): Latest flagship; refined reasoning and coding performance.

## API Quick Reference
Base URL: `https://api.moonshot.cn/v1`
Headers: `Authorization: Bearer <API_KEY>`
Python example:
```python
import requests
r = requests.post(
    "https://api.moonshot.cn/v1/chat/completions",
    headers={"Authorization": "Bearer <KEY>", "Content-Type": "application/json"},
    json={"model": "moonshot-v1-8k", "messages": [{"role": "user", "content": "Hello"}]}
)
```

Available API series: `moonshot-v1` and K2 series. Register at https://platform.moonshot.cn.

## Local Inference
Run Kimi K2 from open weights via Ollama, vLLM, or llama.cpp. Exact VRAM and CLI commands depend on quantization and framework; the MoE architecture (1T total, 32B active) means requirements vary by serving mode.

## Context Windows
- K2 / K2 Thinking / K2-Instruct-0905: 256K
- K1.5: 128K

## License & Notes
- Modified MIT requires attribution for >100M MAU or >$20M monthly revenue.
- Moonshot AI (月之暗面) is China-based; API may have regional latency or availability considerations.
