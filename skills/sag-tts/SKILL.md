---
name: sag-tts
description: Use the installed sag CLI for local ElevenLabs text-to-speech, spoken status updates, audio-file generation, and quick voice playback for CLI coding agents. Trigger when the user asks an agent to speak, read aloud, generate voice audio, test TTS, use ElevenLabs from the command line, or make conversational spoken feedback.
tags:
  - tts
  - elevenlabs
  - voice
  - audio
  - cli
summary: Use sag for fast local text-to-speech and audio output.
examples:
  - speak this status update out loud
  - generate a short mp3 reply with ElevenLabs
  - use a fast voice model for conversational feedback
  - list available ElevenLabs voices
---

# sag TTS

Use this skill when the user wants a CLI coding agent to speak, read text aloud, create a TTS audio file, test ElevenLabs voices, or provide spoken conversational feedback.

## Tool

`sag` is installed on this machine and available on PATH:

```powershell
sag --version
```

Expected install path:

```text
C:\Users\prest\.local\bin\sag.exe
```

`sag` uses `ELEVENLABS_API_KEY` or `ELEVENLABS_API_KEY_FILE`. Never print API keys, ask the user to paste a key into chat, or include keys in logs.

## Quick Commands

Speak text through the local speakers:

```powershell
sag "Pi Speak is ready."
```

Use the fast and cheap model for short conversational feedback:

```powershell
sag speak --model-id eleven_flash_v2_5 "I am checking that now."
```

Save audio without playback:

```powershell
sag speak --no-play --model-id eleven_flash_v2_5 --output C:\tmp\agent-reply.mp3 "The task is complete."
```

List voices:

```powershell
sag voices
```

Show prompting guidance:

```powershell
sag prompting
```

## Model Choice

- `eleven_flash_v2_5`: default choice for fast conversational status, short replies, and low-latency agent feedback.
- `eleven_turbo_v2_5`: use when a slightly richer voice is worth a small latency/cost increase.
- `eleven_multilingual_v2`: use for stable multilingual output.
- `eleven_v3`: use only when expressiveness matters more than speed.

## Workflow

1. For short status messages, speak directly with `sag speak --model-id eleven_flash_v2_5`.
2. For app/gateway audio artifacts, generate a file with `--no-play --output <path>` and return the path.
3. For repeatable tests, write output under `C:\tmp` unless the user gives another path.
4. If `sag` is missing, check `C:\Users\prest\.local\bin\sag.exe` before assuming it is uninstalled.
5. If authentication fails, report that ElevenLabs credentials are missing or invalid without exposing secret values.

## Safety

- Do not speak private secrets, tokens, passwords, or sensitive file contents unless the user explicitly asks and the context is appropriate.
- Prefer concise spoken messages; do not read long logs or stack traces verbatim unless requested.
- For long technical output, summarize for speech and optionally save the full text separately.
