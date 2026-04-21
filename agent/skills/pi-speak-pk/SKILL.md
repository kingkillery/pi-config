---
name: pi-speak-pk
description: "Voice extension for Pi with spoken replies, wake-word listening, remote control, and Telegram integration. Use when user mentions /speak, /mono, /phone, /remote, voice output, spoken replies, or pi-speak extension. Install: pi npm i pi-speak-pk"
---

# pi-speak-pk - Voice Extension for Pi

Voice, wake-word, Telegram, and mobile web remote for `pi-coding-agent`.

## Install

```text
pi npm i pi-speak-pk
```

Then reload Pi.

## Core Commands

### `/speak` — Spoken Replies
```text
/speak on
/speak off
/speak status
/speak test
/speak providers
/speak provider edge
/speak provider openai
/speak provider elevenlabs
/speak rewrite on
/speak rewrite off
```

**Provider priority (auto mode):**
1. `legacy` — local speak11 (requires Python audio deps)
2. `elevenlabs` — requires `ELEVENLABS_API_KEY`
3. `openai` — requires `PI_SPEAK_OPENAI_KEY`
4. `edge` — works immediately (bundled `node-edge-tts`)

### `/mono` — Wake Word Listener
```text
/mono on
/mono off
/mono status
```
- Says `pi mono` to trigger voice input
- `pi mono <session-name>` routes to a named session
- Keep-alive timeout: 15 seconds (configurable via `PI_SPEAK_MONO_ACTIVITY_TIMEOUT`)
- Requires Python audio stack: `numpy`, `sounddevice`, `vosk`, `faster-whisper`

### `/phone` — Telegram Bridge
```text
/phone on
/phone off
/phone status
/phone code      # Get pairing code
/phone unpair   # Reset pairing
```
- Text messages become Pi turns
- Voice notes are transcribed and sent
- Replies delivered as text + audio
- Requires `PI_SPEAK_TELEGRAM_BOT_TOKEN`

### `/remote` — HTTP API + Mobile Web App
```text
/remote on
/remote off
/remote status
/remote token    # View current token
```
- Serves built-in mobile app from `/app/`
- HTTP API for voice/text turns
- Token-based auth for remote access

### `/sess` — Named Sessions
```text
/sess new bugfix
/sess switch bugfix
/sess list
/sess name active-work
```
- Route voice input to specific sessions

## TTS Providers

| Provider | Works Out-of-Box | Requires |
|----------|------------------|----------|
| **edge** | ✅ Yes | Nothing |
| **openai** | ❌ | `PI_SPEAK_OPENAI_KEY` |
| **elevenlabs** | ❌ | `ELEVENLABS_API_KEY` |
| **legacy** | ❌ | Python + speak11 |

### Edge TTS (Default / Recommended)
```env
PI_SPEAK_EDGE_VOICE=en-US-AriaNeural
PI_SPEAK_EDGE_RATE=1           # 0.8 = slower, 1.2 = faster
PI_SPEAK_EDGE_TIMEOUT_MS=15000
```

### OpenAI TTS
```env
PI_SPEAK_OPENAI_KEY=sk-...           # Dedicated key (not general LLM key)
PI_SPEAK_OPENAI_TTS_MODEL=gpt-4o-mini-tts
PI_SPEAK_OPENAI_VOICE=alloy
```

### ElevenLabs TTS
```env
ELEVENLABS_API_KEY=...
PI_SPEAK_ELEVENLABS_VOICE_ID=pNInz6obpgDQGcFmaJgB
PI_SPEAK_ELEVENLABS_MODEL_ID=eleven_multilingual_v2
```

## Remote Access

### Mobile Web App
Open in browser:
```text
https://<your-tailnet-host>/app/
```

The app:
- Records voice with browser mic
- Sends to `/v1/turn/voice`
- Plays reply audio
- Stores token in session (configurable for device persistence)

### HTTP API
```bash
# Text turn with audio reply
curl -X POST http://127.0.0.1:8767/v1/turn/text \
  -H "Content-Type: application/json" \
  -d '{"text":"Summarize the repo","audio":true}'

# Voice turn
curl -X POST "https://<host>/v1/turn/voice?audio=1" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: audio/webm" \
  --data-binary "@voice.webm"
```

## Key Environment Variables

```env
# Core
PI_SPEAK_TTS_PROVIDER=auto|edge|openai|elevenlabs|legacy
PI_SPEAK_REWRITE_ENABLED=true

# HTTP Server
PI_SPEAK_HTTP_HOST=0.0.0.0
PI_SPEAK_HTTP_PORT=8767
PI_SPEAK_HTTP_TOKEN=<generate-with-remote-token>

# Telegram
PI_SPEAK_TELEGRAM_BOT_TOKEN=...

# OpenAI (dedicated, not general LLM key)
PI_SPEAK_OPENAI_KEY=...

# Edge TTS
PI_SPEAK_EDGE_VOICE=en-US-AriaNeural
PI_SPEAK_EDGE_RATE=1
```

## Troubleshooting

### Mic doesn't work in web app
→ You're not on HTTPS. Use Tailscale Serve or a tunnel.

### Voice transcription fails
→ Check Python deps: `numpy`, `sounddevice`, `vosk`, `faster-whisper`

### Wrong TTS provider used
```text
/speak status
/speak provider edge
```

### Telegram pairing stuck
```text
/phone code
/phone unpair
```

## Key Files

- `index.ts` — Extension entrypoint
- `tts.ts` — Multi-provider speech synthesis
- `stt.ts` — Remote voice transcription
- `phone-bridge.ts` — Telegram transport
- `control-server.ts` — HTTP API + web app
- `listener/listener.py` — Always-on wake-word listener
