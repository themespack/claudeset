import { lstatSync, readlinkSync, symlinkSync, readdirSync, existsSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { ensureDir, exists } from "../utils/fs.js";
import { agentSkillsDir, claudeSkillsDir } from "./paths.js";

export type LinkStatus =
  | "linked" // we created the symlink
  | "already-linked" // symlink already points at the source
  | "conflict" // a real directory (or foreign symlink) is in the way
  | "no-source" // nothing to link from
  | "unsupported"; // the platform refused the symlink (Windows without privilege)

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
 * Point a skills root at another one, creating the source when missing.
 * An existing real directory (or a symlink elsewhere) is never replaced.
 */
export function linkSkillsDir(
  source: string,
  target: string,
  opts: { dryRun?: boolean; relative?: boolean } = {},
): LinkResult {
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
    // A relative link survives the repo being cloned or moved elsewhere.
    const linkPath = opts.relative ? relative(dirname(target), source) : source;
    try {
      symlinkSync(linkPath, target, "junction");
    } catch {
      // Windows refuses symlinks without developer mode or admin rights.
      return { ...base, status: "unsupported" };
    }
  }
  return { ...base, status: "linked" };
}

/**
 * Point `~/.agents/skills` at `~/.claude/skills` so Zed's agent and Claude Code
 * load the same skills.
 */
export function linkSkills(opts: { dryRun?: boolean } = {}): LinkResult {
  return linkSkillsDir(claudeSkillsDir(), agentSkillsDir(), opts);
}

/** Same idea, one project down: `<root>/.agents/skills` → `<root>/.claude/skills`. */
export function linkProjectSkills(root: string, opts: { dryRun?: boolean } = {}): LinkResult {
  return linkSkillsDir(join(root, ".claude", "skills"), join(root, ".agents", "skills"), {
    ...opts,
    relative: true,
  });
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
