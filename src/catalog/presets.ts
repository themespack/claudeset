import { MCP_CATALOG } from "./mcp.js";
import { SKILL_CATALOG } from "./skills.js";

export type PresetName = "standard" | "ultimate" | "none";

export interface Preset {
  name: PresetName;
  description: string;
  mcp: string[];
  skills: string[];
}

/**
 * `standard` is stack-agnostic and needs no API keys beyond a GitHub token.
 * `ultimate` is everything — expect API keys, `uv` and Docker.
 */
export const PRESETS: Record<Exclude<PresetName, "none">, Preset> = {
  standard: {
    name: "standard",
    description: "Everyday setup: no API keys except GitHub, works in any stack.",
    mcp: ["filesystem", "git", "github", "context7", "fetch", "memory", "sequential-thinking"],
    skills: [
      "rtk",
      "code-review",
      "refactoring",
      "testing",
      "debugging",
      "git-workflow",
      "security",
      "documentation",
    ],
  },
  ultimate: {
    name: "ultimate",
    description: "Every server and skill in the catalog.",
    mcp: MCP_CATALOG.map((e) => e.id),
    skills: SKILL_CATALOG.map((e) => e.id),
  },
};

export function resolvePreset(name: PresetName): { mcp: string[]; skills: string[] } {
  if (name === "none") return { mcp: [], skills: [] };
  return { mcp: PRESETS[name].mcp, skills: PRESETS[name].skills };
}

export function parsePreset(value: string | undefined): PresetName | undefined {
  if (value === undefined) return undefined;
  if (value === "standard" || value === "ultimate" || value === "none") return value;
  throw new Error(`Unknown --preset "${value}". Use standard, ultimate or none.`);
}

/** Parse a comma-separated id list, rejecting unknown ids. */
export function parseIds(
  value: string | undefined,
  known: string[],
  label: string,
): string[] | undefined {
  if (value === undefined) return undefined;
  const ids = value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const unknown = ids.filter((id) => !known.includes(id));
  if (unknown.length) {
    throw new Error(`Unknown ${label}: ${unknown.join(", ")}. Run \`claudeset ${label} list\`.`);
  }
  return ids;
}
