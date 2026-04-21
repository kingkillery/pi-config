/**
 * omc-bridge - OMC orchestration layer for pi coding agent
 *
 * Registers tier-0 OMC skill commands (/autopilot, /ralph, /ultrawork,
 * /plan, /team, /ralplan) and keyword-triggered dispatch so that
 * running pi via the `omc` wrapper feels like oh-my-claudecode.
 *
 * Each command loads its SKILL.md from ~/.pi/agent/skills/ and injects
 * it as a system-level instruction for the current turn.
 */

import type { ExtensionAPI, ExtensionCommandContext } from "@mariozechner/pi-coding-agent";
import { existsSync, readFileSync, readdirSync } from "fs";
import { join } from "path";
import { homedir } from "os";

interface SkillDef {
	name: string;
	description: string;
	content: string;
}

export default function (pi: ExtensionAPI): void {
	// Resolve agent dir: env var > active profile > default
	const piBase = join(homedir(), ".pi");
	const currentProfileFile = join(piBase, "current-profile");
	const currentProfile = existsSync(currentProfileFile)
		? readFileSync(currentProfileFile, "utf-8").trim()
		: null;
	const agentDir = process.env.PI_CODING_AGENT_DIR
		|| (currentProfile ? join(piBase, "profiles", currentProfile) : join(piBase, "agent"));

	const skillsDirs = [
		join(agentDir, "skills"),
		join(agentDir, "skills", "pk-skills1-imported"),
	];

	// -----------------------------------------------------------------------
	// Skill loader
	// -----------------------------------------------------------------------

	function loadSkill(name: string): SkillDef | null {
		for (const base of skillsDirs) {
			const skillDir = join(base, name);
			const skillFile = join(skillDir, "SKILL.md");
			if (existsSync(skillFile)) {
				const content = readFileSync(skillFile, "utf-8");
				// Parse frontmatter (CRLF-safe)
				const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
				if (fmMatch) {
					const fm = fmMatch[1];
					const descMatch = fm.match(/description:\s*(.+)/);
					return {
						name,
						description: descMatch ? descMatch[1].trim() : name,
						content: fmMatch[2].trim(),
					};
				}
				return { name, description: name, content: content.trim() };
			}
		}
		return null;
	}

	function buildSkillPrompt(skill: SkillDef, cmdName: string, userMessage: string): string {
		return [
			`<skill name="${skill.name}">`,
			skill.content,
			`</skill>`,
			"",
			`The user invoked /${cmdName}. Follow the skill instructions above.`,
			"",
			`User request: ${userMessage || "(no additional context — ask the user what they need)"}`,
		].join("\n");
	}

	function listAvailableSkills(): string[] {
		const skills = new Set<string>();
		for (const base of skillsDirs) {
			if (!existsSync(base)) continue;
			try {
				for (const entry of readdirSync(base, { withFileTypes: true })) {
					if (entry.isDirectory() && existsSync(join(base, entry.name, "SKILL.md"))) {
						skills.add(entry.name);
					}
				}
			} catch { /* ignore */ }
		}
		return [...skills].sort();
	}

	// -----------------------------------------------------------------------
	// Tier-0 OMC commands
	// -----------------------------------------------------------------------

	const tier0Skills: Record<string, { aliases: string[]; description: string }> = {
		autopilot: {
			aliases: ["auto"],
			description: "Full autonomous execution from idea to working code",
		},
		ralph: {
			aliases: ["ral"],
			description: "Self-referential loop until task completion with verification",
		},
		ultrawork: {
			aliases: ["ulw"],
			description: "Parallel execution engine for high-throughput task completion",
		},
		plan: {
			aliases: ["omc-plan"],
			description: "Strategic planning with optional interview workflow",
		},
		team: {
			aliases: ["omc-team"],
			description: "N coordinated agents on shared task list",
		},
		ralplan: {
			aliases: ["rp"],
			description: "Consensus planning with Planner/Architect/Critic loop",
		},
		trace: {
			aliases: [],
			description: "Evidence-driven causal tracing with competing hypotheses",
		},
		deepsearch: {
			aliases: ["ds"],
			description: "Thorough codebase search",
		},
	};

	for (const [skillName, meta] of Object.entries(tier0Skills)) {
		const registerCmd = (cmdName: string) => {
			pi.registerCommand(cmdName, {
				description: meta.description,
				handler: async (args: string, ctx: ExtensionCommandContext) => {
					const skill = loadSkill(skillName);
					if (!skill) {
						ctx.ui.notify(
							`Skill '${skillName}' not found. Run /omc-skills to see available skills.`,
							"error",
						);
						return;
					}

					const userMessage = args?.trim() || "";
					ctx.ui.notify(userMessage
						? `Running /${cmdName}: ${userMessage.slice(0, 60)}...`
						: `Activating ${skillName} mode`, "info");

					await pi.sendUserMessage(buildSkillPrompt(skill, cmdName, userMessage));
				},
			});
		};

		registerCmd(skillName);
		for (const alias of meta.aliases) {
			registerCmd(alias);
		}
	}

	// -----------------------------------------------------------------------
	// /omc-skills — list all available skills
	// -----------------------------------------------------------------------

	pi.registerCommand("omc-skills", {
		description: "List all available OMC skills",
		handler: async (_args: string, _ctx: ExtensionCommandContext) => {
			const skills = listAvailableSkills();
			const lines = [
				"\x1b[1mOMC Skills\x1b[0m",
				"=".repeat(40),
				"",
				`\x1b[2m${skills.length} skills available\x1b[0m`,
				"",
				"\x1b[1mTier-0 (registered as commands):\x1b[0m",
			];

			for (const [name, meta] of Object.entries(tier0Skills)) {
				const aliases = meta.aliases.length > 0
					? ` \x1b[2m(${meta.aliases.map(a => "/" + a).join(", ")})\x1b[0m`
					: "";
				lines.push(`  \x1b[34m/${name}\x1b[0m${aliases} — ${meta.description}`);
			}

			lines.push("", "\x1b[1mAll skills:\x1b[0m");
			const colWidth = 30;
			const cols = 3;
			for (let i = 0; i < skills.length; i += cols) {
				lines.push("  " + skills.slice(i, i + cols).map(s => s.padEnd(colWidth)).join(""));
			}

			pi.sendMessage({ customType: "omc-skills", content: lines.join("\n"), display: true });
		},
	});

	// -----------------------------------------------------------------------
	// /omc-run <skill-name> [args] — run any skill by name
	// -----------------------------------------------------------------------

	pi.registerCommand("omc-run", {
		description: "Run any OMC skill by name: /omc-run <skill> [args]",
		handler: async (args: string, ctx: ExtensionCommandContext) => {
			const parts = (args || "").trim().split(/\s+/);
			const skillName = parts[0];
			const rest = parts.slice(1).join(" ");

			if (!skillName) {
				ctx.ui.notify("Usage: /omc-run <skill-name> [args]", "error");
				return;
			}

			const skill = loadSkill(skillName);
			if (!skill) {
				ctx.ui.notify(`Skill '${skillName}' not found. Run /omc-skills to list.`, "error");
				return;
			}

			ctx.ui.notify(`Running skill: ${skillName}`, "info");
			await pi.sendUserMessage(buildSkillPrompt(skill, skillName, rest));
		},
	});

	// -----------------------------------------------------------------------
	// /cancel — stop active OMC mode
	// -----------------------------------------------------------------------

	pi.registerCommand("cancel", {
		description: "Cancel any active OMC execution mode",
		handler: async (_args: string, ctx: ExtensionCommandContext) => {
			const cancelSkill = loadSkill("cancel");
			if (cancelSkill) {
				await pi.sendUserMessage(cancelSkill.content);
			} else {
				ctx.ui.notify("OMC modes cancelled. Returning to normal operation.", "info");
			}
		},
	});

	// -----------------------------------------------------------------------
	// Extension info
	// -----------------------------------------------------------------------

}
