import { join, relative } from "node:path";
import { rmSync } from "node:fs";
import prompts from "prompts";
import chalk from "chalk";
import { exists } from "../utils/fs.js";
import { log } from "../utils/log.js";

/** Regenerable, claudeset-owned files — safe to remove and re-create. */
const REGENERABLE = [
  ".claude/prompts",
  ".claude/commands/sync-memory.md",
  "RTK.md",
  "CAVEMAN.md",
  ".caveman",
];

/** Additional targets removed only with --all (includes user-editable files). */
const EXTRA = [
  "CLAUDE.md",
  "AGENTS.md",
  ".editorconfig",
  ".claude/settings.json",
  ".claude/memories",
];

export async function runClean(
  root: string,
  opts: { all?: boolean; yes?: boolean; dryRun?: boolean } = {},
): Promise<void> {
  const targets = [...REGENERABLE, ...(opts.all ? EXTRA : [])];
  const present = targets.filter((t) => exists(join(root, t)));

  log.title("claudeset clean");
  if (present.length === 0) {
    log.ok("Nothing to remove.");
    return;
  }

  log.warn("Will remove:");
  for (const t of present) log.info(`  ${chalk.red("−")} ${t}`);
  if (opts.all) {
    log.warn(
      "⚠ --all removes CLAUDE.md, AGENTS.md and .claude/memories (may contain your own content).",
    );
  }

  if (opts.dryRun) {
    log.warn("Dry-run: nothing removed.");
    return;
  }

  if (!opts.yes) {
    const { go } = await prompts({
      type: "confirm",
      name: "go",
      message: `Delete ${present.length} item(s)? This cannot be undone.`,
      initial: false,
    });
    if (!go) {
      log.warn("Aborted.");
      return;
    }
  }

  for (const t of present) {
    rmSync(join(root, t), { recursive: true, force: true });
    log.info(`  ${chalk.red("removed")} ${relative(root, join(root, t))}`);
  }
  log.ok(`Removed ${present.length} item(s).`);
}
