---
name: codechat
description: Voice-driven code agent. Talk to your codebase in natural language with speech-friendly responses. Triggers on "codechat", "voice chat about code", "talk to my codebase", or "chat about code".
---

# codechat - Voice-Driven Code Agent

Talk to your codebase in natural language. Voice in, natural speech out.

## Architecture

```
Voice/Text Input
       |
  Whisper (STT)  ──►  text
       |
  Brain (LLM via OpenRouter)
    ├── Context search (ripgrep)
    ├── File reading
    └── Command extraction
       |
  Voice Output (ElevenLabs via speak11 -s)
       |
  Notification (Windows toast + chime)
```

## Quick Start

```bash
# Interactive voice chat (requires microphone)
codechat

# Interactive text chat (no mic)
codechat --text --no-speak

# One-shot query
codechat "what does the auth module do?" --no-speak

# One-shot with voice output
codechat "explain the main entry point" -v adam -s

# Set working directory
codechat --cwd ~/projects/myapp --text --no-speak

# Smart QMD setup for a repo
codechat --qmd-setup --cwd ~/projects/myapp

# Force embeddings too (global and potentially slow)
codechat --qmd-setup --qmd-embed --cwd ~/projects/myapp
```

## Components

| Module | Purpose | Status |
|--------|---------|--------|
| `config.py` | Central config, API keys, prompts | Done |
| `voice.py` | STT (Whisper) + TTS (ElevenLabs) + summarizer | Done |
| `brain.py` | LLM reasoning, conversation history | Done |
| `context.py` | Codebase search, file reading | Done |
| `executor.py` | Safe command execution with approval gates | Done |
| `queue.py` | Background task queue (file-based) | Done |
| `notify.py` | Windows toast + sound notifications | Done |
| `cli.py` | Main entry point, interactive loop | Done |

## Voices

| Name | Type | Notes |
|------|------|-------|
| `bella` | Female | Default, most natural |
| `antoni` | Male | Clear, warm |
| `arnold` | Male | Deeper tone |
| `adam` | Male | Professional |

## Queue System

```bash
# Enqueue a background task
codechat --enqueue "npm run build"

# Check queue status
codechat --queue

# Start background worker
codechat --worker
```

Queue files live at `~/.codechat/queue/` with subdirectories: pending, running, done, failed.

## QMD Repo Setup

`--qmd-setup` is repo-aware:
- creates a named collection based on the repo folder
- stores a repo → collection mapping in `~/.codechat/qmd_repos.json`
- adds docs-first contexts for README, AGENTS.md, CLAUDE.md, docs/, src/, tests/, specs/, etc.
- skips automatic embeddings when the global QMD index is already large

Use `--qmd-embed` to force embeddings when you explicitly want that slower global step.

## LLM Models

Default: `google/gemini-2.0-flash-001` via OpenRouter.
Override with `--model` or `CODECHAT_MODEL` env var.
Summarizer uses `openai/gpt-oss-20b:nitro`.

## Safety

Commands are categorized as safe (auto-approved) or dangerous (requires user approval).
Safe commands: ls, cat, grep, rg, git status/diff/log, etc.
Dangerous: rm, del, git push, pip uninstall, etc.

Unknown commands default to needing approval.

## Environment Variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `ELEVENLABS_API_KEY` | (built-in) | TTS voice synthesis |
| `OPENROUTER_API_KEY` | (built-in) | LLM access |
| `CODECHAT_MODEL` | google/gemini-2.0-flash-001 | Main LLM model |
| `CODECHAT_VOICE` | bella | Default TTS voice |
| `CODECHAT_NOTIFY` | toast | Notification method |
| `CODECHAT_WORKERS` | 1 | Max queue workers |

## File Location

All code is at:
```
C:\Users\prest\AppData\Roaming\Python\Python314\Scripts\codechat\
C:\Users\prest\AppData\Roaming\Python\Python314\Scripts\codechat.py  (entry point)
C:\Users\prest\AppData\Roaming\Python\Python314\Scripts\codechat.cmd  (cmd wrapper)
```
