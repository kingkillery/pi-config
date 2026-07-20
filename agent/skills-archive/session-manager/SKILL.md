---
name: session-manager
description: Load, search, name, and compress past AI agent sessions (Claude Code, Codex, Antigravity, Gemini) into a bundle small enough to feed back into a model. Trigger when the user asks to "find my session about X", "load that earlier conversation", "what did I do yesterday in <project>", "summarize the kanban session", "compress that transcript", "rename this session", "load SM sessions", or any time you need to recover context from a prior chat with another agent. The skill wraps a local `sm` CLI; no network calls except optional OpenRouter naming.
---

# session-manager skill

This skill drives the local `sm` CLI (the `session-manager` Python package). It indexes every Claude Code, Codex, Antigravity, and Gemini session on disk into a SQLite DB, then lets you list, search, view, rename, and compress them through one consistent surface.

## When to use

- The user references a previous chat ("the session where I worked on X")
- You need to recover context that already exists in another agent's transcript
- You need to feed a long session back into a model with the noise removed
- The user wants to organize / rename / describe sessions
- The user asks to "load SM sessions"

## When NOT to use

- The user is asking about the CURRENT session — just answer directly
- The work is plain coding with no prior-session lookup involved

## One-shot fetch (the 90% command)

```
sm get <id-or-title> --compress --max-tokens 6000
```

That prints a self-describing bundle to stdout.

`<id-or-title>` accepts a full session id, an 8-char prefix, an exact title, or an FTS5 query like `"kanban dir"`.

## Sessions List and Load

To list discovered conversations across providers:

```bash
sm sessions list
sm sessions list -p antigravity -n 10 --json
```

To load the full raw transcript of a session:

```bash
sm sessions load <session_id_or_prefix>
```

Available providers: `antigravity` (Gemini), `codex`, `claude`, `kimi`, `copilot`.

## Discovery commands

| Goal                                | Command |
| ----------------------------------- | ------- |
| Find a session by keyword           | `sm list -q "kanban" --json` |
| Filter by source                    | `sm list --source claude --limit 20` |
| Filter by working directory         | `sm list --cwd CLI-Tool-Session-Manager` |
| Filter by date                      | `sm list --since 2026-05-01 --before 2026-05-14` |
| Filter by model                     | `sm list --model gpt-oss` |
| Only sessions that have compacts    | `sm list --has-segments` |
| Show one session in JSON            | `sm show <id> --json` |
| Print just the source file path     | `sm path <id>` |

Add `--json` to `list`, `show`, `get`, `stats`, `sources`, `describe`, `install-skill`, and `where` for machine-readable output.

## Compress + segment

`sm` understands pre/post-compact segments (boundary detected per adapter).

```
sm show <id> --segment 0          # pre-compact window
sm get  <id> --segment 1          # post-compact window only
sm compress <id> --no-semantic    # structural compression (no model needed)
sm compress <id> --ratio 0.3      # aim for ~30% of original tokens (needs LLMLingua-2)
```

Structural compression strips `<system-reminder>` tags, redacts long tool outputs, and collapses repeated directory listings. Semantic compression uses LLMLingua-2 (Microsoft) and only runs if installed (`pip install 'session-manager[compress]'`).

## Housekeeping

```
sm index            # incremental reindex of all sources
sm index --force    # full reparse
sm sources          # list configured source roots
sm stats            # per-source session/turn/char counts
sm where            # paths to the SQLite DB, exports, and state dir
```

## Notes

- The full state directory is `~/.session-manager/` (override is not yet supported — let the user know if they ask).
- The tool works on Windows, macOS, and Linux. On Windows, paths in `cwd` contain backslashes; quote them when passing to other tools.
- Antigravity sessions are parsed from `~/.gemini/antigravity-cli/brain/` using a safe permission-error-resilient walk.
