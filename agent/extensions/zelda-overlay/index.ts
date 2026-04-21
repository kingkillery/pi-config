/**
 * zelda-overlay — pi coding agent extension
 *
 * Registers the /zelda-overlay command, which renders Zelda: A Link to the
 * Past (SNES) as an animated terminal overlay using half-block Unicode chars.
 *
 * Usage:
 *   /zelda-overlay                     — use default ROM path
 *   /zelda-overlay /path/to/rom.zip    — explicit ROM path
 *   /zelda-overlay /path/to/rom.smc    — raw ROM file
 *
 * The engine instance is persistent — it survives between invocations so the
 * game is paused on exit and resumed on re-entry (same as doom-overlay).
 */

import { loadRom, findRom } from "./rom-loader.js";
import { createZeldaEngine, type ZeldaEngine } from "./zelda-engine.js";
import { ZeldaOverlayComponent } from "./zelda-component.js";

// ---------------------------------------------------------------------------
// Persistent engine instance (survives command re-invocations)
// ---------------------------------------------------------------------------
let _engine: ZeldaEngine | null = null;
let _engineReady = false;

async function getOrInitEngine(romPath?: string): Promise<{ engine: ZeldaEngine; isResume: boolean }> {
  if (_engine && _engineReady) {
    return { engine: _engine, isResume: true };
  }

  // Resolve ROM path
  const resolvedPath = romPath || findRom();
  if (!resolvedPath) {
    throw new Error(
      "Zelda ROM not found.\n" +
      "Expected at: ~/Downloads/Legend of Zelda, The - A Link to the Past (USA).zip\n" +
      "Or pass a path: /zelda-overlay /path/to/rom.zip"
    );
  }

  const romData = loadRom(resolvedPath);
  const engine = createZeldaEngine();
  await engine.init(new Uint8Array(romData.buffer, romData.byteOffset, romData.byteLength));

  _engine = engine;
  _engineReady = true;

  return { engine, isResume: false };
}

// ---------------------------------------------------------------------------
// Extension entry point
// ---------------------------------------------------------------------------

function parseRomPathArg(args: string): string | undefined {
  const trimmed = args.trim();
  if (!trimmed) return undefined;

  if (trimmed.length >= 2) {
    const first = trimmed[0];
    const last = trimmed[trimmed.length - 1];
    if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
      return trimmed.slice(1, -1).trim() || undefined;
    }
  }

  return trimmed;
}

export default function (pi: any) {
  pi.registerCommand("zelda-overlay", {
    description: "Play Zelda: A Link to the Past (SNES) in a terminal overlay. Press Q to pause/exit.",

    handler: async (args: string, ctx: any) => {
      const romPath = parseRomPathArg(args);

      if (!ctx?.hasUI) {
        return "zelda-overlay requires a UI context. Run it from the pi coding agent terminal.";
      }

      let engine: ZeldaEngine;
      let isResume: boolean;

      try {
        ({ engine, isResume } = await getOrInitEngine(romPath));
      } catch (err: any) {
        ctx.ui.notify(err.message, "error");
        return `Error: ${err.message}`;
      }

      ctx.ui.notify(
        isResume
          ? "Resuming Zelda: A Link to the Past..."
          : `Starting Zelda: A Link to the Past — ${engine.statusMessage}`,
        "info",
      );

      await ctx.ui.custom(
        (tui: any, _theme: any, _keybindings: any, done: () => void) => {
          return new ZeldaOverlayComponent(tui, engine, () => done(), isResume);
        },
        {
          overlay: true,
          overlayOptions: {
            width: "90%",
            maxHeight: "90%",
            anchor: "center",
          },
        }
      );
    },
  });

  return {
    name: "zelda-overlay",
    version: "1.0.0",
    description: "Zelda: A Link to the Past SNES emulator overlay for the pi coding agent.",
  };
}
