#!/usr/bin/env bash
# setup.sh - Refresh the vendored snes9x WASM core for zelda-overlay
#
# Extracts the pre-built snes9x libretro core from the EmulatorJS npm package.
# The core files (snes9x_libretro.js + snes9x_libretro.wasm) are placed in ./core/.
#
# By default the script is conservative: if a valid core is already present, it
# leaves the committed assets alone. Pass --force to refresh them in place.
#
# Requirements: npm, 7z (7-Zip)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CORE_DIR="$SCRIPT_DIR/core"
FORCE_REFRESH=0

if [[ "${1:-}" == "--force" ]]; then
  FORCE_REFRESH=1
fi

echo "==> Refreshing snes9x WASM core for zelda-overlay"

# Check if already extracted
if [[ "$FORCE_REFRESH" -eq 0 && -f "$CORE_DIR/snes9x_libretro.wasm" ]]; then
  WASM_SIZE=$(wc -c < "$CORE_DIR/snes9x_libretro.wasm")
  if [[ "$WASM_SIZE" -gt 1000000 ]]; then
    echo "==> Vendored core already looks valid ($WASM_SIZE bytes). Nothing to do."
    echo "    Use ./setup.sh --force to refresh the committed runtime assets."
    exit 0
  fi
fi

mkdir -p "$CORE_DIR"

# Step 1: Download the npm package
echo "==> Downloading @emulatorjs/core-snes9x..."
cd "$CORE_DIR"
npm pack @emulatorjs/core-snes9x 2>/dev/null

TARBALL=$(ls emulatorjs-core-snes9x-*.tgz 2>/dev/null | head -1)
if [[ -z "$TARBALL" ]]; then
  echo "ERROR: npm pack failed. Check your npm configuration." >&2
  exit 1
fi

# Step 2: Extract the tarball
echo "==> Extracting npm package..."
tar xzf "$TARBALL"

# Step 3: Extract the 7z data file
DATA_FILE="package/snes9x-wasm.data"
if [[ ! -f "$DATA_FILE" ]]; then
  echo "ERROR: snes9x-wasm.data not found in package." >&2
  exit 1
fi

echo "==> Extracting WASM core from 7z archive..."
if ! command -v 7z &>/dev/null; then
  echo "ERROR: 7z not found. Install 7-Zip and ensure it's in your PATH." >&2
  echo "       On Windows: winget install 7zip.7zip" >&2
  echo "       On macOS: brew install p7zip" >&2
  echo "       On Linux: apt install p7zip-full" >&2
  exit 1
fi

7z x -y "$DATA_FILE" -o. >/dev/null

# Step 4: Verify
if [[ ! -f "snes9x_libretro.wasm" ]]; then
  echo "ERROR: WASM file not found after extraction." >&2
  exit 1
fi

WASM_SIZE=$(wc -c < "snes9x_libretro.wasm")
echo "==> Core installed: snes9x_libretro.wasm ($WASM_SIZE bytes)"

# Cleanup
rm -f "$TARBALL" build.json core.json license.txt
rm -rf package

echo ""
echo "==> Core refresh complete. zelda-overlay will use the real SNES emulator."
echo "    The committed assets under ./core/ are intentional vendored runtime files."
echo "    Run /zelda-overlay in pi to start playing."
