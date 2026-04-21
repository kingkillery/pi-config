/**
 * zelda-keys.ts
 * Maps terminal key input to SNES controller buttons.
 *
 * Uses Key / matchesKey / parseKey from @mariozechner/pi-tui where available,
 * falls back to raw escape-sequence parsing for portability.
 */

// SNES button bitmask — matches standard libretro SNES button layout
export const SNES_BUTTON = {
  B:      0x0001,
  Y:      0x0002,
  SELECT: 0x0004,
  START:  0x0008,
  UP:     0x0010,
  DOWN:   0x0020,
  LEFT:   0x0040,
  RIGHT:  0x0080,
  A:      0x0100,
  X:      0x0200,
  L:      0x0400,
  R:      0x0800,
} as const;

export type SnesButton = keyof typeof SNES_BUTTON;

/** Current state of all SNES buttons (bitmask) */
export interface SnesInputState {
  buttons: number;
}

/** Map a raw terminal input sequence to a SNES button bitmask, or null if unmapped */
export function mapInputToButton(data: string): number | null {
  // Arrow keys
  if (data === "\x1b[A" || data === "w" || data === "W") return SNES_BUTTON.UP;
  if (data === "\x1b[B" || data === "s" || data === "S") return SNES_BUTTON.DOWN;
  if (data === "\x1b[D" || data === "a" || data === "A") return SNES_BUTTON.LEFT;
  if (data === "\x1b[C" || data === "d" || data === "D") return SNES_BUTTON.RIGHT;

  // Face buttons
  if (data === " ")  return SNES_BUTTON.A;
  if (data === "f" || data === "F") return SNES_BUTTON.B;
  if (data === "e" || data === "E") return SNES_BUTTON.X;
  if (data === "r" || data === "R") return SNES_BUTTON.Y;

  // Shoulders — Shift+arrow for L, Ctrl+R for R
  if (data === "\x1b[1;2A" || data === "\x1b[1;2B" || data === "\x1b[1;2C" || data === "\x1b[1;2D") {
    return SNES_BUTTON.L;
  }
  if (data === "\x02") return SNES_BUTTON.L;
  if (data === "\x12") return SNES_BUTTON.R;

  // Start / Select
  if (data === "\r" || data === "\n") return SNES_BUTTON.START;
  if (data === "\t") return SNES_BUTTON.SELECT;

  return null;
}

/** Returns true if the input should quit/pause the overlay */
export function isQuitKey(data: string): boolean {
  return data === "q" || data === "Q" || data === "\x03"; // q, Q, or Ctrl+C
}

/**
 * Apply a momentary button press to the current input state.
 * Terminal input is key-by-key — buttons are set for one frame then cleared.
 */
export function applyInput(state: SnesInputState, data: string): void {
  const button = mapInputToButton(data);
  if (button !== null) state.buttons |= button;
}

/** Clear all momentary button presses (call after each frame tick) */
export function clearMomentaryButtons(state: SnesInputState): void {
  // In terminal mode all inputs are momentary — clear after each tick
  state.buttons = 0;
}

/** Create a fresh input state */
export function createInputState(): SnesInputState {
  return { buttons: 0 };
}
