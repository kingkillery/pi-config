/**
 * rom-loader.ts
 * Loads a SNES ROM from a .zip archive or directly from a .smc/.sfc file.
 */

import { existsSync, readFileSync } from "fs";
import { join } from "path";
import * as zlib from "zlib";

// Minimal ZIP parser — covers Deflate and Stored entries
// Full PKZIP local-file-header format used here.

const ZIP_LOCAL_MAGIC = 0x04034b50;

interface ZipEntry {
  filename: string;
  compressedData: Buffer;
  compressionMethod: number;
  uncompressedSize: number;
}

function parseZip(buf: Buffer): ZipEntry[] {
  const entries: ZipEntry[] = [];
  let offset = 0;

  while (offset + 4 <= buf.length) {
    const magic = buf.readUInt32LE(offset);
    if (magic !== ZIP_LOCAL_MAGIC) {
      // Skip bytes until we find next local file header or run out
      offset++;
      continue;
    }

    const compressionMethod = buf.readUInt16LE(offset + 8);
    const compressedSize = buf.readUInt32LE(offset + 18);
    const uncompressedSize = buf.readUInt32LE(offset + 22);
    const filenameLen = buf.readUInt16LE(offset + 26);
    const extraLen = buf.readUInt16LE(offset + 28);

    const filenameStart = offset + 30;
    const filenameEnd = filenameStart + filenameLen;
    const dataStart = filenameEnd + extraLen;

    if (filenameEnd > buf.length || dataStart > buf.length) break;

    const filename = buf.subarray(filenameStart, filenameEnd).toString("utf-8");

    // compressedSize=0 with data descriptor is handled by scanning for next header
    let actualCompressedSize = compressedSize;
    if (actualCompressedSize === 0 && uncompressedSize === 0) {
      // Try to find data descriptor or next local header
      const searchBuf = buf.subarray(dataStart);
      const nextLocal = searchBuf.indexOf(Buffer.from([0x50, 0x4b, 0x03, 0x04]));
      const dataDesc = searchBuf.indexOf(Buffer.from([0x50, 0x4b, 0x07, 0x08]));
      const boundary = Math.min(
        nextLocal >= 0 ? nextLocal : Infinity,
        dataDesc >= 0 ? dataDesc : Infinity
      );
      actualCompressedSize = boundary === Infinity ? searchBuf.length : boundary;
    }

    const dataEnd = dataStart + actualCompressedSize;
    if (dataEnd > buf.length) break;

    const compressedData = buf.subarray(dataStart, dataEnd);

    entries.push({ filename, compressedData, compressionMethod, uncompressedSize });

    offset = dataEnd;
  }

  return entries;
}

function decompressEntry(entry: ZipEntry): Buffer {
  if (entry.compressionMethod === 0) {
    // Stored — no compression
    return Buffer.from(entry.compressedData);
  } else if (entry.compressionMethod === 8) {
    // Deflate — use zlib inflateRawSync
    return zlib.inflateRawSync(entry.compressedData);
  } else {
    throw new Error(`Unsupported ZIP compression method: ${entry.compressionMethod}`);
  }
}

/**
 * Load a SNES ROM. Accepts:
 *   - A .zip file containing a .smc or .sfc ROM
 *   - A raw .smc or .sfc file
 *
 * Returns the raw ROM bytes as a Buffer.
 */
export function loadRom(romPath: string): Buffer {
  if (!existsSync(romPath)) {
    throw new Error(`ROM not found: ${romPath}`);
  }

  const ext = romPath.toLowerCase();

  if (ext.endsWith(".smc") || ext.endsWith(".sfc")) {
    return readFileSync(romPath);
  }

  if (ext.endsWith(".zip")) {
    const zipData = readFileSync(romPath);
    const entries = parseZip(zipData);

    const romEntry = entries.find(e => {
      const name = e.filename.toLowerCase();
      return name.endsWith(".smc") || name.endsWith(".sfc");
    });

    if (!romEntry) {
      const names = entries.map(e => e.filename).join(", ");
      throw new Error(`No .smc/.sfc ROM found in ZIP. Files found: ${names || "(none)"}`);
    }

    return decompressEntry(romEntry);
  }

  throw new Error(`Unsupported ROM file type: ${romPath}. Expected .zip, .smc, or .sfc`);
}

/**
 * Returns a list of likely SNES ROM paths to check, in order of preference.
 */
function getDefaultRomPaths(): string[] {
  const home = process.env.HOME || process.env.USERPROFILE || "";
  return [
    join(home, "Downloads", "Legend of Zelda, The - A Link to the Past (USA).zip"),
    join(home, "Downloads", "zelda_alttp.smc"),
    join(home, "Downloads", "zelda_alttp.sfc"),
    join(home, "Downloads", "Zelda - A Link to the Past.smc"),
    join(home, "Downloads", "alttp.smc"),
    join(home, "roms", "snes", "zelda_alttp.smc"),
    join(home, "roms", "zelda_alttp.smc"),
  ];
}

/**
 * Find the first available ROM from default paths.
 */
export function findRom(): string | null {
  for (const p of getDefaultRomPaths()) {
    if (existsSync(p)) return p;
  }
  return null;
}
