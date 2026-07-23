import { join } from "node:path";
import { detectProject } from "../detect/index.js";
import { buildVars, copyTemplateTree, readTemplate } from "../template/index.js";
import { mergeJsonFile } from "../merge/index.js";
import { RTK_MEMORY_DIR, RTK_PROMPT_DIR } from "../memory/rtk.js";
import { printResults } from "./summary.js";
import { log } from "../utils/log.js";
import type { WriteResult } from "../types.js";

/**
 * Refresh managed templates to their latest version.
 * With `force`, overwrites prompt library + settings-fill; memory files are
 * left alone by default (they hold user content) unless `force` is set.
 */
export function runUpdate(
  root: string,
  opts: { force?: boolean; dryRun?: boolean } = {},
): void {
  const info = detectProject(root);
  const vars = buildVars(info);
  const writeOpts = { force: opts.force ?? false, dryRun: opts.dryRun };

  log.title("claudeset update");
  const results: WriteResult[] = [];

  // Prompt library is safe to refresh — it is claudeset-owned.
  results.push(
    ...copyTemplateTree("prompts", join(root, RTK_PROMPT_DIR), vars, {
      force: true,
      dryRun: opts.dryRun,
    }),
  );

  // Settings: always fill new default keys, never remove user keys.
  results.push(
    mergeJsonFile(
      join(root, ".claude", "settings.json"),
      readTemplate("claude/settings.json", vars),
      { dryRun: opts.dryRun },
    ),
  );

  // Memory files only touched with explicit --force.
  results.push(
    ...copyTemplateTree("memories", join(root, RTK_MEMORY_DIR), vars, writeOpts),
  );

  const changed = results.filter((r) => r.action !== "skipped");
  if (changed.length === 0) {
    log.ok("Already up to date.");
    return;
  }
  log.info("Updated templates:");
  printResults(root, changed);
  if (opts.dryRun) log.warn("Dry-run: no files were written.");
}
