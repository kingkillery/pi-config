/**
 * pi-profiles - Profile management extension for pi coding agent
 * 
 * Provides /profile commands for managing isolated profile directories
 * with their own auth, settings, sessions, skills, and extensions.
 * 
 * Each profile lives at ~/.pi/profiles/<name>/ with the same structure
 * as the default ~/.pi/agent/ directory.
 * 
 * Commands:
 *   /profile list              - List all profiles
 *   /profile create <name>    - Create new profile
 *   /profile use <name>       - Set as sticky default
 *   /profile show [name]      - Show profile details
 *   /profile delete <name>    - Delete a profile
 *   /profile rename <a> <b>   - Rename a profile
 *   /profile copy <from> <to> - Copy profile
 *   /profile export [name]    - Export profile
 *   /profile import <file>    - Import profile
 *   /profile shell <name>     - Run with profile environment
 *   /profile edit [name]      - Open profile in explorer
 */

import { join } from "path";
import { homedir } from "os";
import { existsSync, readFileSync, writeFileSync, readdirSync, statSync, mkdirSync, rmSync, cpSync } from "fs";
import { execSync } from "child_process";

export default function (pi: ExtensionAPI) {
  // Configuration paths
  const baseDir = join(homedir(), ".pi");
  const profilesDir = join(baseDir, "profiles");
  const agentDir = join(baseDir, "agent");
  const currentProfileFile = join(baseDir, "current-profile");

  // Colors for output
  const colors = {
    reset: "\x1b[0m",
    bold: "\x1b[1m",
    green: "\x1b[32m",
    blue: "\x1b[34m",
    yellow: "\x1b[33m",
    red: "\x1b[31m",
    dim: "\x1b[2m",
  };

  const c = (color: keyof typeof colors, text: string) => `${colors[color]}${text}${colors.reset}`;

  // ---------------------------------------------------------------------------
  // Helper Functions
  // ---------------------------------------------------------------------------

  function ensureDirs() {
    if (!existsSync(profilesDir)) mkdirSync(profilesDir, { recursive: true });
    if (!existsSync(agentDir)) mkdirSync(agentDir, { recursive: true });
  }

  function getProfileDir(name: string): string {
    return join(profilesDir, name);
  }

  function getCurrentProfile(): string | null {
    if (existsSync(currentProfileFile)) {
      return readFileSync(currentProfileFile, "utf-8").trim();
    }
    return null;
  }

  function validateName(name: string): { valid: boolean; error?: string } {
    if (!/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(name)) {
      return { valid: false, error: "Invalid name. Use letters, numbers, hyphens, underscores. Cannot start with number or hyphen." };
    }
    if (name === "agent") {
      return { valid: false, error: "'agent' is a reserved name." };
    }
    return { valid: true };
  }

  function getDirSize(dir: string): number {
    let size = 0;
    try {
      const files = readdirSync(dir, { withFileTypes: true });
      for (const file of files) {
        const filePath = join(dir, file.name);
        if (file.isDirectory()) {
          size += getDirSize(filePath);
        } else {
          size += statSync(filePath).size;
        }
      }
    } catch { /* ignore */ }
    return size;
  }

  function formatSize(bytes: number): string {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  }

  // ---------------------------------------------------------------------------
  // Command Handlers
  // ---------------------------------------------------------------------------

  function cmdList(): string {
    const current = getCurrentProfile();
    let output = `\n${c("bold", "Pi Profiles")}\n${"=".repeat(40)}\n\n`;

    // Default profile
    if (!current) {
      output += `  ${c("green", "●")} ${c("bold", "default")}  ← active\n`;
    } else {
      output += `    default\n`;
    }
    output += `    ${agentDir}\n\n`;

    // Profiles
    if (existsSync(profilesDir)) {
      const profiles = readdirSync(profilesDir).filter(p => {
        try {
          return statSync(join(profilesDir, p)).isDirectory();
        } catch { return false; }
      });

      if (profiles.length === 0) {
        output += `  No profiles created yet. Run ${c("blue", "'/profile create <name>'")} to create one.\n`;
      } else {
        for (const profile of profiles) {
          const dir = getProfileDir(profile);
          const size = getDirSize(dir);
          if (profile === current) {
            output += `  ${c("green", "●")} ${c("bold", profile)}  ← active\n`;
          } else {
            output += `    ${profile}\n`;
          }
          output += `    ${dir} (${formatSize(size)})\n\n`;
        }
      }
    } else {
      output += `  No profiles directory yet.\n`;
    }

    return output;
  }

  function cmdCreate(name: string): string {
    const validation = validateName(name);
    if (!validation.valid) {
      return `${c("red", "Error:")} ${validation.error}`;
    }

    ensureDirs();
    const dir = getProfileDir(name);

    if (existsSync(dir)) {
      return `${c("red", "Error:")} Profile '${name}' already exists at ${dir}`;
    }

    // Create directory structure
    mkdirSync(join(dir, "sessions"), { recursive: true });
    mkdirSync(join(dir, "skills"), { recursive: true });
    mkdirSync(join(dir, "prompts"), { recursive: true });
    mkdirSync(join(dir, "themes"), { recursive: true });
    mkdirSync(join(dir, "extensions"), { recursive: true });

    // Copy defaults if they exist
    if (existsSync(join(agentDir, "settings.json"))) {
      cpSync(join(agentDir, "settings.json"), join(dir, "settings.json"));
    } else {
      writeFileSync(join(dir, "settings.json"), "{}");
    }

    writeFileSync(join(dir, "auth.json"), JSON.stringify({ providers: {} }, null, 2));

    if (existsSync(join(agentDir, "models.json"))) {
      cpSync(join(agentDir, "models.json"), join(dir, "models.json"));
    }

    return `${c("green", "✓")} Created profile '${name}' at ${dir}\n${c("blue", "→")} Use ${c("bold", "'/profile use " + name + "'")} to activate it`;
  }

  function cmdUse(name: string): string {
    if (name === "default") {
      if (existsSync(currentProfileFile)) {
        rmSync(currentProfileFile);
      }
      return `${c("green", "✓")} Using default profile (${agentDir})`;
    }

    const validation = validateName(name);
    if (!validation.valid) {
      return `${c("red", "Error:")} ${validation.error}`;
    }

    const dir = getProfileDir(name);
    if (!existsSync(dir)) {
      return `${c("red", "Error:")} Profile '${name}' does not exist. Run ${c("blue", "'/profile create " + name + "'")} first.`;
    }

    writeFileSync(currentProfileFile, name);
    return `${c("green", "✓")} Switched to profile '${name}'\n${c("blue", "→")} Active directory: ${dir}`;
  }

  function cmdShow(name?: string): string {
    const current = getCurrentProfile();
    const target = name || current;

    if (!target) {
      let output = `\n${c("bold", "Current Profile:")} ${c("green", "default")}\n${"=".repeat(40)}\n\n`;
      output += `Using global agent directory:\n  ${agentDir}\n\n`;
      output += showDirContents(agentDir);
      return output;
    }

    const dir = target === "default" ? agentDir : getProfileDir(target);

    if (!existsSync(dir)) {
      return `${c("red", "Error:")} Profile '${target}' does not exist`;
    }

    let output = `\n${c("bold", "Profile:")} ${c("green", target)}\n${"=".repeat(40)}\n\n`;
    output += `Location: ${dir}\n\n`;
    output += showDirContents(dir);

    if (target === current) {
      output += `${c("green", "✓")} Currently active\n`;
    }

    return output;
  }

  function showDirContents(dir: string): string {
    let output = `${c("bold", "Contents:")}\n`;

    // Auth
    const authPath = join(dir, "auth.json");
    if (existsSync(authPath)) {
      const size = statSync(authPath).size;
      output += size > 50 ? `  ${c("green", "✓")} auth.json\n` : `  ${c("yellow", "○")} auth.json (empty)\n`;
    } else {
      output += `  ${c("dim", "-")} auth.json (not set)\n`;
    }

    // Settings
    output += existsSync(join(dir, "settings.json"))
      ? `  ${c("green", "✓")} settings.json\n`
      : `  ${c("yellow", "○")} settings.json (default)\n`;

    // Models
    output += existsSync(join(dir, "models.json"))
      ? `  ${c("green", "✓")} models.json\n`
      : `  ${c("yellow", "○")} models.json (inherited)\n`;

    // Sessions
    const sessionsDir = join(dir, "sessions");
    if (existsSync(sessionsDir)) {
      const sessions = readdirSync(sessionsDir).filter(f => f.endsWith(".jsonl"));
      output += sessions.length > 0
        ? `  ${c("green", "✓")} sessions/ (${sessions.length} files)\n`
        : `  ${c("yellow", "○")} sessions/ (empty)\n`;
    } else {
      output += `  ${c("dim", "-")} sessions/ (not created)\n`;
    }

    // Skills
    const skillsDir = join(dir, "skills");
    if (existsSync(skillsDir)) {
      const skills = readdirSync(skillsDir, { withFileTypes: true });
      const skillCount = skills.filter(s => s.isDirectory()).length +
        skills.filter(s => s.name === "SKILL.md").length;
      output += skillCount > 0
        ? `  ${c("green", "✓")} skills/ (${skillCount} skills)\n`
        : `  ${c("yellow", "○")} skills/ (none)\n`;
    } else {
      output += `  ${c("yellow", "○")} skills/ (none)\n`;
    }

    // Extensions
    const extDir = join(dir, "extensions");
    if (existsSync(extDir)) {
      const exts = readdirSync(extDir).filter(f => f.endsWith(".ts") || f.endsWith(".js"));
      output += exts.length > 0
        ? `  ${c("green", "✓")} extensions/ (${exts.length} files)\n`
        : `  ${c("yellow", "○")} extensions/ (none)\n`;
    } else {
      output += `  ${c("yellow", "○")} extensions/ (none)\n`;
    }

    output += "\n";
    return output;
  }

  function cmdDelete(name: string): string {
    const validation = validateName(name);
    if (!validation.valid) {
      return `${c("red", "Error:")} ${validation.error}`;
    }

    const dir = getProfileDir(name);
    if (!existsSync(dir)) {
      return `${c("red", "Error:")} Profile '${name}' does not exist`;
    }

    const current = getCurrentProfile();
    if (name === current) {
      return `${c("yellow", "Warning:")} This is the currently active profile!\nRun ${c("blue", "'/profile use default'")} first to switch away`;
    }

    rmSync(dir, { recursive: true });
    return `${c("green", "✓")} Deleted profile '${name}' (was at ${dir})`;
  }

  function cmdRename(oldName: string, newName: string): string {
    const oldValidation = validateName(oldName);
    if (!oldValidation.valid) return `${c("red", "Error:")} ${oldValidation.error}`;

    const newValidation = validateName(newName);
    if (!newValidation.valid) return `${c("red", "Error:")} ${newValidation.error}`;

    const oldDir = getProfileDir(oldName);
    const newDir = getProfileDir(newName);

    if (!existsSync(oldDir)) {
      return `${c("red", "Error:")} Profile '${oldName}' does not exist`;
    }
    if (existsSync(newDir)) {
      return `${c("red", "Error:")} Profile '${newName}' already exists`;
    }

    cpSync(oldDir, newDir, { recursive: true });
    rmSync(oldDir, { recursive: true });

    const current = getCurrentProfile();
    if (oldName === current) {
      writeFileSync(currentProfileFile, newName);
    }

    return `${c("green", "✓")} Renamed '${oldName}' to '${newName}'`;
  }

  function cmdCopy(from: string, to: string): string {
    const fromValidation = validateName(from);
    if (!fromValidation.valid) return `${c("red", "Error:")} ${fromValidation.error}`;

    const toValidation = validateName(to);
    if (!toValidation.valid) return `${c("red", "Error:")} ${toValidation.error}`;

    const fromDir = getProfileDir(from);
    const toDir = getProfileDir(to);

    if (!existsSync(fromDir)) {
      return `${c("red", "Error:")} Profile '${from}' does not exist`;
    }
    if (existsSync(toDir)) {
      return `${c("red", "Error:")} Profile '${to}' already exists`;
    }

    cpSync(fromDir, toDir, { recursive: true });
    return `${c("green", "✓")} Copied '${from}' to '${to}'\n${c("blue", "→")} Use ${c("bold", "'/profile use " + to + "'")} to activate it`;
  }

  function cmdExport(name?: string): string {
    const current = getCurrentProfile();
    const target = name || current;

    if (!target) {
      return `${c("red", "Error:")} Specify a profile name or activate a profile first`;
    }

    const dir = target === "default" ? agentDir : getProfileDir(target);
    if (!existsSync(dir)) {
      return `${c("red", "Error:")} Profile '${target}' does not exist`;
    }

    ensureDirs();
    const outputPath = join(baseDir, `${target}-profile.tar.gz`);

    try {
      execSync(`tar -czf "${outputPath}" -C "${profilesDir}" "${target}"`, { stdio: "pipe" });
      return `${c("green", "✓")} Exported to ${outputPath}\n${c("blue", "→")} Size: ${formatSize(statSync(outputPath).size)}`;
    } catch {
      return `${c("red", "Error:")} Export failed. Make sure tar is available in your PATH.`;
    }
  }

  function cmdImport(filePath: string, name?: string): string {
    if (!existsSync(filePath)) {
      return `${c("red", "Error:")} File not found: ${filePath}`;
    }

    let targetName = name;
    if (!targetName) {
      // Extract name from filename
      const basename = filePath.split(/[/\\]/).pop() || "";
      targetName = basename.replace(/\.(tar\.gz|zip|tgz)$/i, "").replace(/[-_]?profile$/i, "");
    }

    const validation = validateName(targetName);
    if (!validation.valid) {
      return `${c("red", "Error:")} ${validation.error}\n${c("blue", "→")} Specify a name: ${c("bold", "'/profile import <file> <name>'")}`;
    }

    const dir = getProfileDir(targetName);
    if (existsSync(dir)) {
      return `${c("red", "Error:")} Profile '${targetName}' already exists`;
    }

    ensureDirs();

    try {
      execSync(`tar -xzf "${filePath}" -C "${profilesDir}"`, { stdio: "pipe" });

      // Handle potentially different extracted folder name
      const entries = readdirSync(profilesDir);
      const extracted = entries.find(e => e !== targetName && existsSync(join(profilesDir, e, "auth.json")));

      if (extracted && extracted !== targetName) {
        cpSync(join(profilesDir, extracted), dir, { recursive: true });
        rmSync(join(profilesDir, extracted), { recursive: true });
      }

      return `${c("green", "✓")} Imported as profile '${targetName}'\n${c("blue", "→")} Use ${c("bold", "'/profile use " + targetName + "'")} to activate it`;
    } catch {
      return `${c("red", "Error:")} Import failed. Make sure tar is available and the file is a valid archive.`;
    }
  }

  function cmdShell(name: string): string {
    const validation = validateName(name);
    if (!validation.valid) {
      return `${c("red", "Error:")} ${validation.error}`;
    }

    const dir = name === "default" ? agentDir : getProfileDir(name);
    if (!existsSync(dir)) {
      return `${c("red", "Error:")} Profile '${name}' does not exist`;
    }

    return `${c("green", "✓")} Shell environment configured for '${name}'\n` +
           `PI_PROFILE=${name}\n` +
           `PI_CODING_AGENT_DIR=${dir}\n\n` +
           `${c("yellow", "Note:")} This profile will be used for new pi sessions.\n` +
           `Restart pi or run ${c("blue", "'/profile use " + name + "'")} to activate.`;
  }

  function cmdHelp(): string {
    return `
${c("bold", "Pi Profile Commands")}
${"=".repeat(40)}

${c("bold", "Management:")}
  ${c("blue", "/profile list")}              List all profiles
  ${c("blue", "/profile create <name>")}     Create a new profile
  ${c("blue", "/profile use <name>")}        Set as sticky default
  ${c("blue", "/profile show [name]")}       Show profile details
  ${c("blue", "/profile delete <name>")}      Delete a profile
  ${c("blue", "/profile rename <a> <b>")}     Rename a profile
  ${c("blue", "/profile copy <from> <to>")}   Copy a profile

${c("bold", "Import/Export:")}
  ${c("blue", "/profile export [name]")}      Export profile to tar.gz
  ${c("blue", "/profile import <file>")}     Import from archive

${c("bold", "Quick Access:")}
  ${c("blue", "/profile shell <name>")}       Show profile environment
  ${c("blue", "/profile edit [name]")}        Open profile folder

${c("bold", "CLI (standalone):")}
  ${c("dim", "pi-profile list")}
  ${c("dim", "pi-profile create <name>")}
  ${c("dim", "pi-profile use <name>")}

${c("bold", "Environment Variables:")}
  PI_PROFILE=<name>          Override active profile (per-session)
  PI_CODING_AGENT_DIR=<path> Full override (native pi env var)

${c("bold", "Profile Layout:")}
  ~/.pi/
  ├── agent/                  Default profile
  │   ├── auth.json
  │   ├── settings.json
  │   └── sessions/
  ├── profiles/
  │   ├── work/
  │   └── personal/
  └── current-profile         Active profile marker
`;
  }

  // ---------------------------------------------------------------------------
  // Register Commands
  // ---------------------------------------------------------------------------

  pi.registerCommand("profile", async (args: string[]) => {
    const [subcommand, ...rest] = args;

    switch (subcommand) {
      case "list":
      case "ls":
        return cmdList();

      case "create":
      case "new":
        if (!rest[0]) return `${c("red", "Error:")} Specify a name: ${c("blue", "'/profile create <name>'")}`;
        return cmdCreate(rest[0]);

      case "use":
      case "switch":
        if (!rest[0]) return `${c("red", "Error:")} Specify a name: ${c("blue", "'/profile use <name>'")}`;
        return cmdUse(rest[0]);

      case "show":
      case "info":
        return cmdShow(rest[0]);

      case "delete":
      case "rm":
      case "remove":
        if (!rest[0]) return `${c("red", "Error:")} Specify a name: ${c("blue", "'/profile delete <name>'")}`;
        return cmdDelete(rest[0]);

      case "rename":
      case "mv":
        if (!rest[0] || !rest[1]) return `${c("red", "Error:")} Usage: ${c("blue", "'/profile rename <old> <new>'")}`;
        return cmdRename(rest[0], rest[1]);

      case "copy":
      case "cp":
        if (!rest[0] || !rest[1]) return `${c("red", "Error:")} Usage: ${c("blue", "'/profile copy <from> <to>'")}`;
        return cmdCopy(rest[0], rest[1]);

      case "export":
      case "dump":
        return cmdExport(rest[0]);

      case "import":
      case "load":
        if (!rest[0]) return `${c("red", "Error:")} Specify a file: ${c("blue", "'/profile import <file> [name]'")}`;
        return cmdImport(rest[0], rest[1]);

      case "shell":
      case "run":
        if (!rest[0]) return `${c("red", "Error:")} Specify a name: ${c("blue", "'/profile shell <name>'")}`;
        return cmdShell(rest[0]);

      case "edit":
        const dir = rest[0] === "default" || !rest[0]
          ? (rest[0] === "default" ? agentDir : (getCurrentProfile() ? getProfileDir(getCurrentProfile()!) : agentDir))
          : getProfileDir(rest[0]);
        try {
          execSync(`start "" "${dir}"`, { shell: "cmd.exe", stdio: "ignore" });
          return `${c("green", "✓")} Opening ${dir}`;
        } catch {
          return `${c("blue", "→")} Open manually: ${dir}`;
        }

      case "help":
      case "--help":
      case "-h":
      case "":
        return cmdHelp();

      default:
        return `${c("red", "Unknown command:")} ${subcommand}\n${c("dim", "Run '/profile help' for usage.")}`;
    }
  });

  // Register /profiles as alias
  pi.registerCommand("profiles", async () => {
    return cmdList();
  });

  // ---------------------------------------------------------------------------
  // Hook: Inject profile context into session
  // ---------------------------------------------------------------------------

  pi.on("session_start", async (_event, ctx) => {
    const currentProfile = getCurrentProfile();
    if (currentProfile) {
      ctx.ui.notify(`Profile '${currentProfile}' is active. Run '/profile list' to switch.`, "info");
    }
  });

  // ---------------------------------------------------------------------------
  // Tool: Profile Management Tool
  // ---------------------------------------------------------------------------

  pi.registerTool({
    name: "profile",
    label: "Profile",
    description: "Manage pi coding agent profiles. Each profile has isolated auth, settings, sessions, skills, and extensions.",
    parameters: {
      type: "object",
      properties: {
        action: {
          type: "string",
          enum: ["list", "create", "use", "show", "delete", "rename", "copy", "export", "import", "shell", "edit"],
          description: "The profile action to perform"
        },
        name: {
          type: "string",
          description: "Profile name (for create, use, show, delete, shell, edit)"
        },
        new_name: {
          type: "string",
          description: "New name (for rename)"
        },
        from: {
          type: "string",
          description: "Source profile (for copy)"
        },
        to: {
          type: "string",
          description: "Destination profile (for copy)"
        },
        file: {
          type: "string",
          description: "File path (for import/export)"
        }
      },
      required: ["action"]
    },
    async execute(_toolCallId, params, _signal, _onUpdate, _ctx) {
      const { action, name, new_name, from, to, file } = params;

      switch (action) {
        case "list":
          return cmdList();
        case "create":
          if (!name) throw new Error("Profile name required");
          return cmdCreate(name);
        case "use":
          if (!name) throw new Error("Profile name required");
          return cmdUse(name);
        case "show":
          return cmdShow(name);
        case "delete":
          if (!name) throw new Error("Profile name required");
          return cmdDelete(name);
        case "rename":
          if (!name || !new_name) throw new Error("Both old and new name required");
          return cmdRename(name, new_name);
        case "copy":
          if (!from || !to) throw new Error("Both from and to names required");
          return cmdCopy(from, to);
        case "export":
          return cmdExport(name);
        case "import":
          if (!file) throw new Error("File path required");
          return cmdImport(file, name);
        case "shell":
          if (!name) throw new Error("Profile name required");
          return cmdShell(name);
        case "edit":
          return cmdHelp();
        default:
          throw new Error(`Unknown action: ${action}`);
      }
    }
  });

  // ---------------------------------------------------------------------------
  // Extension Info
  // ---------------------------------------------------------------------------

  return {
    name: "pi-profiles",
    version: "1.0.0",
    description: "Profile management for pi coding agent with isolated config, sessions, and skills per profile."
  };
}
