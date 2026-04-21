# Vendored Emulator Core

This directory intentionally contains the runtime assets used by `zelda-overlay`:

- `snes9x_libretro.js`
- `snes9x_libretro.wasm`

These files are vendored into the extension root so the overlay can run without
an additional setup step after the extension is copied into `~/.pi/agent/extensions/`.

## Provenance

The committed assets come from the EmulatorJS `@emulatorjs/core-snes9x` package
and are refreshed by [setup.sh](..\setup.sh).

## Maintenance Policy

- Treat this directory as vendored runtime state, not handwritten source.
- Use `npm run refresh:core` or `./setup.sh --force` to replace the assets.
- Keep the committed pair in sync: do not update one file without the other.
- Temporary extraction files produced by `setup.sh` are intentionally ignored.
