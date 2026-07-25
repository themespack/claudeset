import { lstatSync, readlinkSync, symlinkSync, readdirSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { ensureDir, exists } from "../utils/fs.js";
import { agentSkillsDir, claudeSkillsDir } from "./paths.js";

export type LinkStatus =
  | "linked" // we created the symlink
  | "already-linked" // symlink already points at the source
  | "conflict" // a real directory (or foreign symlink) is in the way
  | "no-source"; // nothing to link from

export interface LinkResult {
  status: LinkStatus;
  target: string;
  source: string;
  /** Where an existing, differing symlink points. */
  pointsTo?: string;
}

function linkTarget(p: string): string | null {
  try {
    if (!lstatSync(p).isSymbolicLink()) return null;
    return resolve(dirname(p), readlinkSync(p));
  } catch {
    return null;
  }
}

/**
 * Point `~/.agents/skills` at `~/.claude/skills` so Zed's agent and Claude Code
 * load the same skills. An existing real directory is never replaced.
 */
export function linkSkills(opts: { dryRun?: boolean } = {}): LinkResult {
  const source = claudeSkillsDir();
  const target = agentSkillsDir();
  const base = { source, target };

  if (!exists(source)) {
    if (opts.dryRun) return { ...base, status: "no-source" };
    ensureDir(source);
  }

  if (exists(target) || linkTarget(target)) {
    const points = linkTarget(target);
    if (points && resolve(points) === resolve(source)) {
      return { ...base, status: "already-linked" };
    }
    return { ...base, status: "conflict", pointsTo: points ?? undefined };
  }

  if (!opts.dryRun) {
    ensureDir(dirname(target));
    symlinkSync(source, target, "dir");
  }
  return { ...base, status: "linked" };
}

/**
 * Skills Zed will refuse to load: the spec requires each skill to be a *direct*
 * child of the skills root with a `SKILL.md` inside.
 */
export function invalidSkills(dir = claudeSkillsDir()): string[] {
  if (!existsSync(dir)) return [];
  const bad: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory() && !entry.isSymbolicLink()) continue;
    if (entry.name.startsWith(".")) continue;
    if (!existsSync(join(dir, entry.name, "SKILL.md"))) bad.push(entry.name);
  }
  return bad;
}

export function listSkills(dir = claudeSkillsDir()): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true })
    .filter((e) => (e.isDirectory() || e.isSymbolicLink()) && !e.name.startsWith("."))
    .map((e) => e.name)
    .sort();
}
