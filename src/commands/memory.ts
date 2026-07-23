import { join } from "node:path";
import prompts from "prompts";
import chalk from "chalk";
import { detectProject } from "../detect/index.js";
import { buildVars, readTemplate } from "../template/index.js";
import { writeIfAbsent } from "../utils/fs.js";
import { checkMemory, missingMemoryFiles } from "../memory/index.js";
import { RTK_MEMORY_DIR } from "../memory/rtk.js";
import { log } from "../utils/log.js";

/**
 * Interactive memory manager: list memory files, offer to create missing ones.
 * With `yes`, creates all missing files non-interactively.
 */
export async function runMemory(
  root: string,
  opts: { yes?: boolean; dryRun?: boolean } = {},
): Promise<void> {
  const info = detectProject(root);
  const vars = buildVars(info);

  log.title("claudeset memory");
  for (const c of checkMemory(root)) {
    const mark = c.ok ? chalk.green("✔") : chalk.yellow("missing");
    log.info(`  ${c.label.padEnd(20)} ${mark}`);
  }

  const missing = missingMemoryFiles(root);
  if (missing.length === 0) {
    log.ok("All memory files present.");
    return;
  }

  let create = opts.yes ?? false;
  if (!create && !opts.dryRun) {
    const res = await prompts({
      type: "confirm",
      name: "create",
      message: `Create ${missing.length} missing memory file(s)?`,
      initial: true,
    });
    create = Boolean(res.create);
  }
  if (!create) {
    log.warn("Skipped.");
    return;
  }

  for (const file of missing) {
    const content = readTemplate(`memories/${file}`, vars);
    const r = writeIfAbsent(join(root, RTK_MEMORY_DIR, file), content, {
      dryRun: opts.dryRun,
    });
    log.ok(`${r.action} ${file}`);
  }
  if (opts.dryRun) log.warn("Dry-run: no files were written.");
}
