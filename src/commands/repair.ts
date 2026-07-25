import { join } from "node:path";
import { detectProject } from "../detect/index.js";
import { buildVars, copyTemplateTree, readTemplate } from "../template/index.js";
import { mergeJsonFile } from "../merge/index.js";
import { installRtk, installCaveman } from "../memory/index.js";
import { printResults } from "./summary.js";
import { linkProjectSkills } from "../global/skills.js";
import { log } from "../utils/log.js";
import type { WriteResult } from "../types.js";

/**
 * Recreate any missing scaffolding without overwriting existing files.
 * Repair never uses force — it only fills gaps.
 */
export function runRepair(root: string, opts: { dryRun?: boolean } = {}): void {
  const info = detectProject(root);
  const vars = buildVars(info);
  const writeOpts = { force: false, dryRun: opts.dryRun };

  log.title("claudeset repair");
  const results: WriteResult[] = [];

  results.push(...copyTemplateTree("base", root, vars, writeOpts));
  results.push(
    mergeJsonFile(
      join(root, ".claude", "settings.json"),
      readTemplate("claude/settings.json", vars),
      { dryRun: opts.dryRun },
    ),
  );
  results.push(
    ...copyTemplateTree(
      "claude/commands",
      join(root, ".claude", "commands"),
      vars,
      writeOpts,
    ),
  );
  results.push(
    ...copyTemplateTree("claude/skills", join(root, ".claude", "skills"), vars, writeOpts),
  );
  linkProjectSkills(root, { dryRun: opts.dryRun });
  results.push(...installRtk(root, vars, writeOpts));
  if (info.caveman) results.push(...installCaveman(root, vars, writeOpts));

  const fixed = results.filter((r) => r.action !== "skipped");
  if (fixed.length === 0) {
    log.ok("Nothing to repair — everything present.");
    return;
  }
  log.warn(`Restored ${fixed.length} item(s):`);
  printResults(root, fixed);
  if (opts.dryRun) log.warn("Dry-run: no files were written.");
}
