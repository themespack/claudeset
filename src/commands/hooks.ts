import chalk from "chalk";
import { HOOK_PRESETS, addHookPreset, listHooks } from "../hooks/index.js";
import { log } from "../utils/log.js";

export function hooksList(root: string): void {
  log.title("Configured hooks (.claude/settings.json)");
  const hooks = listHooks(root);
  if (hooks.length === 0) {
    log.dim("  none configured");
  } else {
    for (const h of hooks) {
      log.info(`  ${chalk.cyan(h.event)} ${chalk.dim(h.matcher)}`);
      log.dim(`    ${h.command}`);
    }
  }

  log.title("Available presets");
  for (const p of HOOK_PRESETS) {
    log.info(`  ${chalk.green(p.id.padEnd(12))} ${p.description}`);
  }
  log.dim("\n  add with: claudeset hooks add <preset>");
}

export function hooksAdd(
  root: string,
  presetId: string,
  opts: { dryRun?: boolean } = {},
): void {
  const change = addHookPreset(root, presetId, opts);
  switch (change) {
    case "unknown-preset":
      log.fail(`Unknown preset "${presetId}". Run \`claudeset hooks list\`.`);
      break;
    case "exists":
      log.ok(`Hook "${presetId}" already configured.`);
      break;
    case "added":
      log.ok(`Added hook "${presetId}".`);
      if (opts.dryRun) log.warn("Dry-run: nothing written.");
      break;
  }
}
