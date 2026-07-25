import { join } from "node:path";
import { mergeManagedBlock } from "../merge/index.js";
import { listSkills } from "../global/skills.js";
import type { WriteResult } from "../types.js";

/**
 * Not every agent implements the skills spec. Cursor, Gemini CLI and Copilot read
 * `AGENTS.md` instead, so the installed skills are advertised there in a managed
 * block — the file's own content is never touched.
 */
export function refreshSkillsBlock(
  root: string,
  opts: { dryRun?: boolean } = {},
): WriteResult | null {
  const skills = listSkills(join(root, ".claude", "skills"));
  if (skills.length === 0) return null;

  const body = [
    "## Skills",
    "",
    "This project ships skills — task-specific instructions with a `description`",
    "saying when they apply. Read the matching one before starting that kind of work.",
    "",
    ...skills.map((id) => `- \`${id}\` — \`.claude/skills/${id}/SKILL.md\``),
    "",
    "Agents implementing the skills spec (Claude Code, Zed, Codex) load these",
    "automatically from `.claude/skills` or `.agents/skills`.",
  ].join("\n");

  return mergeManagedBlock(join(root, "AGENTS.md"), body, { force: true, dryRun: opts.dryRun });
}
