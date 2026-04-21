/**
 * minimax-rotation - Provider rotation for rate-limit management
 *
 * Two independent rotation tracks, each keeping the SAME model but
 * alternating the provider to spread rate-limit pressure:
 *
 *   Track 1 (GLM):     zai x2  ->  openrouter x1  ->  zai x2  -> ...
 *   Track 2 (MiniMax): minimax x2  ->  openrouter x1  ->  minimax x2  -> ...
 *
 * The active track is auto-detected from whichever model the request
 * targets. Turns on unrelated models (e.g. gpt-5.4) pass through untouched.
 *
 * Commands:
 *   /rotate              - Show status for both tracks
 *   /rotate on           - Enable rotation (both tracks)
 *   /rotate off          - Disable rotation (native providers only)
 *   /rotate glm [on|off] - Toggle GLM track only
 *   /rotate mm  [on|off] - Toggle MiniMax track only
 *   /rotate every <N>    - Set cycle length (default 3: 2 native + 1 openrouter)
 *   /rotate reset        - Reset all counters
 *   /rotate status       - Verbose stats
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { join } from "path";
import { homedir } from "os";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TrackState {
  enabled: boolean;
  turnCount: number;
  nativeTurns: number;
  openrouterTurns: number;
  lastOpenrouterTurn: number | null;
}

interface RotationState {
  /** Cycle length: first (every-1) turns on native, last 1 on openrouter */
  every: number;
  glm: TrackState;
  minimax: TrackState;
}

const DEFAULT_TRACK: TrackState = {
  enabled: true,
  turnCount: 0,
  nativeTurns: 0,
  openrouterTurns: 0,
  lastOpenrouterTurn: null,
};

const DEFAULT_STATE: RotationState = {
  every: 3,
  glm: { ...DEFAULT_TRACK },
  minimax: { ...DEFAULT_TRACK },
};

// ---------------------------------------------------------------------------
// Model / provider mapping
// ---------------------------------------------------------------------------

const TRACKS = {
  glm: {
    label: "GLM 5.1",
    nativeProvider: "zai",
    nativeModelId: "glm-5.1",
    nativeModelMatch: /glm/i,
    openrouterProvider: "openrouter",
    openrouterModel: "z-ai/glm-5.1",
  },
  minimax: {
    label: "MiniMax M2.7",
    nativeProvider: "minimax",
    nativeModelId: "MiniMax-M2.7-highspeed",
    nativeModelMatch: /minimax/i,
    openrouterProvider: "openrouter",
    openrouterModel: "minimax/minimax-m2.7",
  },
} as const;

type TrackName = keyof typeof TRACKS;

export default function (pi: ExtensionAPI): void {
  // Resolve sessions dir from active profile (same logic as omc-bridge)
  const piBase = join(homedir(), ".pi");
  const currentProfileFile = join(piBase, "current-profile");
  const currentProfile = existsSync(currentProfileFile)
    ? readFileSync(currentProfileFile, "utf-8").trim()
    : null;
  const agentDir = process.env.PI_CODING_AGENT_DIR
    ?? (currentProfile ? join(piBase, "profiles", currentProfile) : join(piBase, "agent"));
  const stateDir = join(agentDir, "sessions");
  const stateFile = join(stateDir, "_provider-rotation-state.json");

  // Colors
  const C = {
    reset: "\x1b[0m",
    bold: "\x1b[1m",
    green: "\x1b[32m",
    blue: "\x1b[34m",
    yellow: "\x1b[33m",
    red: "\x1b[31m",
    dim: "\x1b[2m",
    cyan: "\x1b[36m",
    magenta: "\x1b[35m",
  };
  const fmt = (color: keyof typeof C, t: string) => `${C[color]}${t}${C.reset}`;

  // ---------------------------------------------------------------------------
  // State persistence
  // ---------------------------------------------------------------------------

  function load(): RotationState {
    try {
      if (existsSync(stateFile)) {
        const raw = JSON.parse(readFileSync(stateFile, "utf-8"));
        return {
          every: raw.every ?? DEFAULT_STATE.every,
          glm: { ...DEFAULT_TRACK, ...raw.glm },
          minimax: { ...DEFAULT_TRACK, ...raw.minimax },
        };
      }
    } catch { /* corrupt → reset */ }
    return JSON.parse(JSON.stringify(DEFAULT_STATE));
  }

  function save(s: RotationState): void {
    if (!existsSync(stateDir)) mkdirSync(stateDir, { recursive: true });
    writeFileSync(stateFile, JSON.stringify(s, null, 2));
  }

  // ---------------------------------------------------------------------------
  // Rotation logic
  // ---------------------------------------------------------------------------

  function detectTrack(provider: string, modelId: string): TrackName | null {
    for (const [name, def] of Object.entries(TRACKS)) {
      // Native provider match
      if (provider === def.nativeProvider && def.nativeModelMatch.test(modelId)) {
        return name as TrackName;
      }
      // Openrouter match (from a previous rotation turn)
      if (provider === def.openrouterProvider && modelId === def.openrouterModel) {
        return name as TrackName;
      }
    }
    return null;
  }

  /** Returns true when this turn should route to openrouter. Side-effects: bumps counters. */
  function tick(track: TrackName): { useOpenrouter: boolean; state: RotationState } {
    const state = load();
    const t = state[track];

    t.turnCount++;

    if (!t.enabled) {
      t.nativeTurns++;
      save(state);
      return { useOpenrouter: false, state };
    }

    // Cycle: turns 1..(every-1) → native, turn (every) → openrouter
    const useOpenrouter = t.turnCount % state.every === 0;

    if (useOpenrouter) {
      t.openrouterTurns++;
      t.lastOpenrouterTurn = Date.now();
    } else {
      t.nativeTurns++;
    }

    save(state);
    return { useOpenrouter, state };
  }

  // ---------------------------------------------------------------------------
  // Display
  // ---------------------------------------------------------------------------

  function trackStatus(name: TrackName, s: RotationState, verbose: boolean): string {
    const def = TRACKS[name];
    const t = s[name];
    const mode = t.enabled ? fmt("green", "ON") : fmt("red", "OFF");
    const nextOR = t.enabled
      ? s.every - (t.turnCount % s.every)
      : "—";

    let out = `  ${fmt("bold", def.label)}  ${mode}\n`;
    out += `    ${def.nativeProvider} x${s.every - 1} → openrouter x1\n`;
    out += `    Next openrouter: ${t.enabled ? fmt("yellow", String(nextOR)) + " turn(s)" : "disabled"}\n`;

    if (verbose) {
      out += `    Total: ${t.turnCount}  Native: ${t.nativeTurns}  OR: ${t.openrouterTurns}`;
      if (t.lastOpenrouterTurn) {
        const ago = Math.round((Date.now() - t.lastOpenrouterTurn) / 1000);
        out += `  (last OR ${ago}s ago)`;
      }
      out += "\n";
    }
    return out;
  }

  function showStatus(verbose = false): string {
    const s = load();
    let out = `\n${fmt("bold", "Provider Rotation")}  cycle: ${fmt("cyan", String(s.every))}\n`;
    out += `${"─".repeat(42)}\n`;
    out += trackStatus("glm", s, verbose);
    out += "\n";
    out += trackStatus("minimax", s, verbose);
    out += `\n${fmt("dim", "Commands: /rotate [on|off|glm|mm|every <N>|reset|status]")}\n`;
    return out;
  }

  // ---------------------------------------------------------------------------
  // Commands
  // ---------------------------------------------------------------------------

  function emit(text: string): void {
    pi.sendMessage({ customType: "rotate-output", content: text, display: true });
  }

  pi.registerCommand("rotate", {
    description: "Show or control provider rotation for GLM and MiniMax (/rotate [on|off|glm|mm|every <N>|reset|status])",
    handler: async (args) => {
      const parts = args.trim().split(/\s+/).filter(Boolean);
      const [sub, ...rest] = parts;

      switch (sub) {
        case "on":
        case "enable": {
          const s = load();
          s.glm.enabled = true;
          s.minimax.enabled = true;
          save(s);
          emit(`${fmt("green", "✓")} Both tracks enabled (cycle: ${s.every})`);
          break;
        }

        case "off":
        case "disable": {
          const s = load();
          s.glm.enabled = false;
          s.minimax.enabled = false;
          save(s);
          emit(`${fmt("yellow", "⚠")} Rotation off — native providers only`);
          break;
        }

        case "glm": {
          const s = load();
          s.glm.enabled = rest[0] !== "off" && rest[0] !== "disable";
          save(s);
          emit(`${fmt("green", "✓")} GLM track: ${s.glm.enabled ? "ON" : "OFF"}`);
          break;
        }

        case "mm":
        case "minimax": {
          const s = load();
          s.minimax.enabled = rest[0] !== "off" && rest[0] !== "disable";
          save(s);
          emit(`${fmt("green", "✓")} MiniMax track: ${s.minimax.enabled ? "ON" : "OFF"}`);
          break;
        }

        case "every": {
          const n = parseInt(rest[0], 10);
          if (!n || n < 2 || n > 20) {
            emit(`${fmt("red", "Error:")} Interval must be 2–20. Usage: ${fmt("blue", "/rotate every 3")}`);
            break;
          }
          const s = load();
          s.every = n;
          save(s);
          emit(`${fmt("green", "✓")} Cycle set to ${fmt("cyan", String(n))} (${n - 1} native + 1 openrouter)`);
          break;
        }

        case "reset":
          save(JSON.parse(JSON.stringify(DEFAULT_STATE)));
          emit(`${fmt("green", "✓")} All counters reset`);
          break;

        case "status":
        case "stats":
          emit(showStatus(true));
          break;

        case "help":
        case "--help":
        case "-h":
          emit(`
${fmt("bold", "Provider Rotation Commands")}
${"─".repeat(42)}
  ${fmt("blue", "/rotate")}              Show current status
  ${fmt("blue", "/rotate on")}           Enable both tracks
  ${fmt("blue", "/rotate off")}          Disable both tracks (native only)
  ${fmt("blue", "/rotate glm [on|off]")} Toggle GLM track
  ${fmt("blue", "/rotate mm [on|off]")}  Toggle MiniMax track
  ${fmt("blue", "/rotate every <N>")}    Set cycle length (default 3)
  ${fmt("blue", "/rotate reset")}        Reset all counters
  ${fmt("blue", "/rotate status")}       Detailed stats

${fmt("bold", "How it works (cycle=3):")}
  ${fmt("magenta", "GLM track:")}     zai → zai → ${fmt("cyan", "openrouter")} → zai → zai → ${fmt("cyan", "openrouter")}
  ${fmt("magenta", "MiniMax track:")} minimax → minimax → ${fmt("cyan", "openrouter")} → minimax → minimax → ${fmt("cyan", "openrouter")}

  Same model on every turn, just the provider rotates.
`);
          break;

        default:
          emit(showStatus(false));
      }
    },
  });

  // ---------------------------------------------------------------------------
  // Hook: Rotate provider before each agent turn via setModel
  // ---------------------------------------------------------------------------

  pi.on("before_agent_start", async (_event, ctx) => {
    const currentModel = ctx.model;
    if (!currentModel) return;

    const provider: string = (currentModel as { provider?: string }).provider ?? "";
    const modelId: string = (currentModel as { id?: string }).id ?? "";

    const trackName = detectTrack(provider, modelId);
    if (!trackName) return;

    const { useOpenrouter, state } = tick(trackName);
    const def = TRACKS[trackName];

    if (useOpenrouter) {
      const orModel = ctx.modelRegistry.find(def.openrouterProvider, def.openrouterModel);
      if (orModel) {
        await pi.setModel(orModel);
        ctx.ui.notify(`${def.label} → OpenRouter (turn ${state[trackName].turnCount})`, "info");
      }
    } else if (provider === def.openrouterProvider) {
      // Restore native model when coming off an openrouter rotation turn
      const nativeModel = ctx.modelRegistry.find(def.nativeProvider, def.nativeModelId);
      if (nativeModel) await pi.setModel(nativeModel);
    }
  });

  // ---------------------------------------------------------------------------
  // Tool: Programmatic access
  // ---------------------------------------------------------------------------

  type RotateParams = { action: string; cycle?: number };
  function ok(text: string) {
    return { content: [{ type: "text" as const, text }], details: undefined };
  }

  pi.registerTool({
    name: "provider_rotation",
    label: "Provider Rotation",
    description: "Check or configure provider rotation for GLM and MiniMax rate-limit management.",
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    parameters: {
      type: "object",
      properties: {
        action: {
          type: "string",
          enum: ["status", "enable", "disable", "enable_glm", "disable_glm", "enable_minimax", "disable_minimax", "set_cycle", "reset"],
          description: "Action to perform",
        },
        cycle: {
          type: "number",
          description: "Cycle length for set_cycle (2–20)",
        },
      },
      required: ["action"],
    } as any,
    async execute(_toolCallId, rawParams, _signal, _onUpdate, _ctx) {
      const params = rawParams as RotateParams;
      const s = load();
      switch (params.action) {
        case "status":   return ok(showStatus(true));
        case "enable":   s.glm.enabled = s.minimax.enabled = true;  save(s); return ok("Both tracks enabled");
        case "disable":  s.glm.enabled = s.minimax.enabled = false; save(s); return ok("Both tracks disabled");
        case "enable_glm":   s.glm.enabled = true;  save(s); return ok("GLM track enabled");
        case "disable_glm":  s.glm.enabled = false; save(s); return ok("GLM track disabled");
        case "enable_minimax":  s.minimax.enabled = true;  save(s); return ok("MiniMax track enabled");
        case "disable_minimax": s.minimax.enabled = false; save(s); return ok("MiniMax track disabled");
        case "set_cycle": {
          const n = params.cycle;
          if (!n || n < 2 || n > 20) throw new Error("Cycle must be 2–20");
          s.every = n; save(s); return ok(`Cycle set to ${n}`);
        }
        case "reset":
          save(JSON.parse(JSON.stringify(DEFAULT_STATE)));
          return ok("All state reset");
        default:
          throw new Error(`Unknown action: ${params.action}`);
      }
    },
  });
}
