# zelda-overlay

Play **Zelda: A Link to the Past** (SNES) inside the Pi coding agent terminal as
an animated overlay.

This extension renders the game at 256x224 using Unicode half-block characters
with 24-bit ANSI color. It is a **Pi extension**, not an Obsidian plugin.

## Artifact role

`zelda-overlay` is a source-first Pi extension root with **vendored runtime
assets** under `core/`.

- Source lives in the TypeScript files at the root.
- Runtime emulator payloads live in `core/`.
- `setup.sh` refreshes the vendored emulator payloads in place.
- The committed `core/` directory is intentional so the extension stays usable
  when copied into `~/.pi/agent/extensions/` without extra setup.

## Quick Start

### 1. Ensure your ROM is in place

The extension auto-detects the ROM at:

```text
~/Downloads/Legend of Zelda, The - A Link to the Past (USA).zip
```

Or pass an explicit path:

```text
/zelda-overlay ~/Downloads/alttp.smc
```

Supported formats: `.zip` (containing `.smc` or `.sfc`), `.smc`, `.sfc`

### 2. Refresh the emulator core if needed

The repo ships with a vendored SNES core in `core/`. In most cases you can run
the overlay immediately. If you want to refresh the committed payloads:

```bash
cd ~/.pi/agent/extensions/zelda-overlay
chmod +x setup.sh
./setup.sh --force
```

### 3. Run

Inside the Pi coding agent:

```text
/zelda-overlay
```

## Validation

This root now includes a small smoke-test path for artifact hygiene:

```bash
cd ~/.pi/agent/extensions/zelda-overlay
npm run smoke
```

The smoke test checks:

- required source files are present
- `package.json` exposes validation and core-refresh scripts
- the vendored core pair exists and looks internally consistent
- the README still declares the extension role and maintenance model

## Controls

| Key | SNES Button |
|-----|-------------|
| Arrow keys / WASD | D-pad |
| Space | A button |
| F | B button |
| E | X button |
| R | Y button |
| Shift | L shoulder |
| Ctrl+R | R shoulder |
| Enter | Start |
| Tab | Select |
| Q | Pause / exit overlay |

## Project structure

```text
zelda-overlay/
|-- package.json              # Local metadata and smoke-test scripts
|-- README.md                 # Operator and maintenance documentation
|-- index.ts                  # Extension entry point, registers /zelda-overlay
|-- zelda-component.ts        # Pi TUI component implementation, 30fps loop
|-- zelda-engine.ts           # Emulator engine interface, WASM engine, mock mode
|-- zelda-keys.ts             # Terminal input to SNES button mapping
|-- rom-loader.ts             # Loads ROM from .zip / .smc / .sfc file
|-- gl-shim.ts                # Software WebGL shim used by the WASM core
|-- setup.sh                  # Refreshes the vendored EmulatorJS core
|-- tests/
|   `-- artifact-smoke.test.mjs
`-- core/
    |-- README.md             # Provenance and maintenance policy for vendored core
    |-- snes9x_libretro.js
    `-- snes9x_libretro.wasm
```

## Rendering

Each terminal row represents 2 SNES pixel rows. The upper half block (`▀`)
character uses:

- foreground color = top pixel row
- background color = bottom pixel row

SNES 256x224 becomes 256 columns by 112 terminal rows.

## Engine states

1. **Mock** (fallback): Loads the ROM, reads the title from the header, and
   renders an animated title screen. Fully wired for input.
2. **WASM** (default when `core/` is valid): Uses the vendored snes9x libretro
   core for full emulation.

## Persistence

The engine instance is kept alive between `/zelda-overlay` invocations. Pressing
`Q` pauses the game, and re-running `/zelda-overlay` resumes from the same
engine instance.

## Maintenance notes

- Do not treat `core/` as handwritten source.
- Keep `snes9x_libretro.js` and `snes9x_libretro.wasm` in sync.
- Use `./setup.sh --force` or `npm run refresh:core` to refresh vendored assets.
- Temporary extraction files produced during setup are ignored by `.gitignore`.
