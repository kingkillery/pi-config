# Pi Agent Extensions

Reference for all extensions in `~/.pi/agent/extensions/`.

Pi auto-discovers `.ts` and `.js` files in this directory. Extensions registered
via `settings.json > extensions[]` are loaded from explicit paths instead.

---

## Active Extensions

| Extension | File | Version | Purpose |
|-----------|------|---------|---------|
| provider-rotation | `minimax-rotation.ts` | 2.0.0 | Rate-limit spreading across providers |
| omc-bridge | `omc-bridge.ts` | 1.0.0 | OMC skill commands for pi |
| pi-profiles | `pi-profiles.ts` | 1.0.0 | Isolated profile management |
| zelda-overlay | `zelda-overlay/` | 1.0.0 | SNES emulator overlay |
| youtube-overlay | `youtube-overlay/` | 1.0.0 | YouTube terminal video overlay |

### External (settings.json)

| Package | Path |
|---------|------|
| pi-speak-pk | `C:\dev\Desktop-Projects\pi-speak-extension\dist\index.js` |

### Disabled

| File | Original Purpose |
|------|------------------|
| `_disabled/speak-output.ts.bak` | Speakturbo TTS toggle (superseded by pi-speak-pk) |
| `_disabled/speak.ts.bak` | ElevenLabs TTS with CodeChat mode (superseded by pi-speak-pk) |

---

## provider-rotation (minimax-rotation.ts)

Spreads rate-limit pressure by rotating the **provider** while keeping the
**same model**. Two independent tracks, each with its own counter:

```
GLM track:     zai -> zai -> openrouter -> zai -> zai -> openrouter -> ...
MiniMax track: minimax -> minimax -> openrouter -> minimax -> minimax -> ...
```

### Provider mapping

| Track | Native Provider | Native Model ID | OpenRouter Model ID |
|-------|-----------------|-----------------|---------------------|
| GLM | `zai` | `glm-5.1` | `z-ai/glm-5.1` |
| MiniMax | `minimax` | `MiniMax-M2.7-highspeed` | `minimax/minimax-m2.7` |

### How it works

The `before_agent_start` event fires before each agent turn. The hook:

1. Reads the current model from `ctx.model` (provider + model ID)
2. Matches provider/model against track definitions
3. Increments the track's turn counter
4. If `turnCount % every === 0`, finds the OpenRouter model via
   `ctx.modelRegistry.find()` and switches with `pi.setModel()`
5. On non-openrouter turns, restores the native model if the previous
   turn had switched to openrouter

State persists in `sessions/_provider-rotation-state.json`.

### Commands

```
/rotate              Show status for both tracks
/rotate on           Enable both tracks
/rotate off          Disable both (native providers only)
/rotate glm [on|off] Toggle GLM track
/rotate mm [on|off]  Toggle MiniMax track
/rotate every <N>    Set cycle length (default 3 = 2 native + 1 openrouter)
/rotate reset        Reset all counters
/rotate status       Verbose stats with turn counts and ratios
/rotate help         Full help text
```

### Tool

Name: `provider_rotation`

Actions: `status`, `enable`, `disable`, `enable_glm`, `disable_glm`,
`enable_minimax`, `disable_minimax`, `set_cycle`, `reset`

### State file schema

```json
{
  "every": 3,
  "glm": {
    "enabled": true,
    "turnCount": 0,
    "nativeTurns": 0,
    "openrouterTurns": 0,
    "lastOpenrouterTurn": null
  },
  "minimax": { "..." }
}
```

### Configuration files touched

- `auth.json` — `openrouter` provider entry (reads `OPENROUTER_API_KEY` env var)
- `models.json` — OpenRouter provider with `z-ai/glm-5.1` and `minimax/minimax-m2.7`
- `settings.json` — `enabledModels[]` includes both OpenRouter model IDs

### Env vars required

```
ZAI_API_KEY          — ZhipuAI direct API
MINIMAX_API_KEY      — MiniMax direct API
OPENROUTER_API_KEY   — OpenRouter (fallback provider)
```

---

## omc-bridge (omc-bridge.ts)

Bridges oh-my-claudecode (OMC) skills into pi. Loads SKILL.md files from
`~/.pi/agent/skills/` and injects them as system-level context.

### Registered commands

| Command | Aliases | Skill |
|---------|---------|-------|
| `/autopilot` | `/auto` | Full autonomous execution |
| `/ralph` | `/ral` | Self-referential loop with verification |
| `/ultrawork` | `/ulw` | Parallel execution engine |
| `/plan` | `/omc-plan` | Strategic planning |
| `/team` | `/omc-team` | N coordinated agents |
| `/ralplan` | `/rp` | Consensus planning loop |
| `/trace` | | Causal tracing with hypotheses |
| `/deepsearch` | `/ds` | Thorough codebase search |

### Utility commands

```
/omc-skills          List all available skills
/omc-run <name>      Run any skill by name
/cancel              Stop active OMC mode
```

### Skill discovery

Searches these directories in order:
1. `$PI_CODING_AGENT_DIR/skills/`
2. `$PI_CODING_AGENT_DIR/skills/pk-skills1-imported/`

A skill is a directory containing a `SKILL.md` file. Frontmatter with
`description:` is parsed if present.

---

## pi-profiles (pi-profiles.ts)

Manages isolated profile directories under `~/.pi/profiles/<name>/`. Each
profile has its own auth, settings, sessions, skills, and extensions.

### Commands

```
/profile list              List all profiles (alias: /profiles)
/profile create <name>     Create new profile (copies settings + models)
/profile use <name>        Set as sticky default
/profile show [name]       Show profile details
/profile delete <name>     Delete a profile (refuses if active)
/profile rename <a> <b>    Rename a profile
/profile copy <from> <to>  Copy a profile
/profile export [name]     Export to tar.gz
/profile import <file>     Import from archive
/profile shell <name>      Show env vars for profile
/profile edit [name]       Open profile folder in explorer
```

### Tool

Name: `profile`

Actions: `list`, `create`, `use`, `show`, `delete`, `rename`, `copy`,
`export`, `import`, `shell`, `edit`

### Directory layout

```
~/.pi/
  agent/                    Default profile
    auth.json
    settings.json
    models.json
    sessions/
    skills/
    extensions/
  profiles/
    work/                   Named profile
    personal/               Named profile
  current-profile           Active profile marker (text file)
```

### Env var overrides

```
PI_PROFILE=<name>           Override active profile per-session
PI_CODING_AGENT_DIR=<path>  Full directory override (native pi env var)
```

### Hook

On `session_start`, notifies the user which profile is active.

---

## zelda-overlay (zelda-overlay/)

SNES emulator overlay for Zelda: A Link to the Past. Renders at 256x224
using half-block Unicode characters at 30fps.

Project notes:
- Source-first extension root with vendored runtime assets under `core/`
- `npm run smoke` validates artifact completeness
- `./setup.sh --force` refreshes the committed emulator core

See `zelda-overlay/README.md` for full details.

## youtube-overlay (youtube-overlay/)

YouTube video overlay for Pi. Supports direct URL playback and search-driven
selection, then renders the chosen video in the terminal using half-block
Unicode characters and 24-bit ANSI color.

### Command

```
/youtube-overlay [youtube-url-or-search-query]
```

### Controls

| Key | Action |
|-----|--------|
| Space | Play / pause |
| J | Seek back 10s |
| L | Seek forward 10s |
| 0 | Restart |
| Q | Pause / exit overlay |

### Notes

- Silent playback only (video, no audio)
- Downloads `yt-dlp` into `youtube-overlay/bin/` on first run
- Uses local `ffmpeg-static` for frame decoding
- Reopening the same video resumes from the last paused position

### Command

```
/zelda-overlay [path/to/rom]
```

### Controls

| Key | SNES |
|-----|------|
| WASD / Arrows | D-pad |
| Space | A |
| F | B |
| E | X |
| R | Y |
| Enter | Start |
| Tab | Select |
| Q | Pause/exit |

### Engine states

- **Mock** (default): Animated title screen from ROM header
- **WASM** (after `setup.sh`): Full snes9x-2010 emulation

---

## Changelog

### 2026-04-21

**All extensions — API correctness audit**
- Replaced `before_completion` (non-existent event) with `before_agent_start`
  in minimax-rotation.ts; use `ctx.modelRegistry.find()` + `pi.setModel()`
- Rewrote all `registerCommand(name, fn)` calls to options-object form
  `{description, handler}` — bare-function form silently drops the handler
- Replaced `ctx.session.prompt()` (non-existent) with `pi.sendUserMessage()`
  in omc-bridge.ts
- Replaced `pi.notify()` with `ctx.ui.notify()` throughout
- Routed all command output through `pi.sendMessage()` — return values ignored
- Fixed `registerTool`: added `label`, fixed `execute` signature, fixed
  `AgentToolResult` return shape
- Added `tsconfig.json` with local `node_modules` paths alias
- Added `package.json` with pinned `@mariozechner/pi-coding-agent@^0.68.0`
  and `npm run check` script (typecheck + 18 smoke tests)
- Added `omc-bridge.test.mjs` (6 assertions)
- tsc: zero errors. Smoke tests: 18/18 pass.

### 2026-04-15

**provider-rotation v2.0.0**
- Rewrote from single-track (MiniMax->GLM swap) to two-track design
  (same model, provider rotation)
- Track 1: GLM 5.1 — zai x2 -> openrouter x1
- Track 2: MiniMax M2.7 — minimax x2 -> openrouter x1
- Added openrouter re-entry guard (prevents double-tick when provider
  is already openrouter)
- Fixed OpenRouter GLM model ID: `zhipuai/glm-5.1` -> `z-ai/glm-5.1`
  (verified via OpenRouter API)
- Added `openrouter` provider to auth.json and models.json
- Added OpenRouter model entries to settings.json enabledModels

**pi-profiles v1.0.0**
- Fixed `cmdDelete`: was returning a `confirmAction` callback that was
  never invoked — deletion silently did nothing. Now deletes directly.
- Removed dead `.text` property access from command and tool handlers
- Removed unused `readdir` import (only `readdirSync` is used)

**zelda-overlay v1.0.0**
- Fixed `done(undefined)` -> `done()` (callback typed as `() => void`)
