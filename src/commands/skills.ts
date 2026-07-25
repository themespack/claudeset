import chalk from "chalk";
import { join } from "node:path";
import { detectProject } from "../detect/index.js";
import { buildVars } from "../template/index.js";
import { SKILL_CATALOG, findSkill } from "../catalog/skills.js";
import { PRESETS, resolvePreset, type PresetName } from "../catalog/presets.js";
import { installSkills } from "../catalog/install.js";
import { installCaveman } from "../memory/index.js";
import { listSkills, linkProjectSkills } from "../global/skills.js";
import { printResults } from "./summary.js";
import { log } from "../utils/log.js";

const SKILLS_DIR = join(".claude", "skills");

export function skillsList(root: string): void {
  const installed = new Set(listSkills(join(root, SKILLS_DIR)));

  log.title(`Skills (${installed.size} installed in ${SKILLS_DIR})`);
  for (const skill of SKILL_CATALOG) {
    const mark = installed.has(skill.id) ? chalk.green("✔") : chalk.dim("·");
    log.info(`  ${mark} ${chalk.cyan(skill.id.padEnd(20))} ${chalk.dim(skill.description)}`);
  }

  const extra = [...installed].filter((id) => !findSkill(id));
  if (extra.length) {
    log.title("Your own skills");
    for (const id of extra) log.info(`  ${chalk.green("✔")} ${id}`);
  }

  log.title("Presets");
  for (const preset of Object.values(PRESETS)) {
    log.info(`  ${chalk.cyan(preset.name.padEnd(10))} ${preset.skills.length} skills — ${chalk.dim(preset.description)}`);
  }
}

export function skillsAdd(
  root: string,
  ids: string[],
  opts: { preset?: PresetName; force?: boolean; dryRun?: boolean } = {},
): void {
  const selected = [...new Set([...(opts.preset ? resolvePreset(opts.preset).skills : []), ...ids])];
  if (selected.length === 0) {
    log.warn("Nothing to add. Pass skill ids or --preset standard|ultimate.");
    return;
  }

  const info = detectProject(root);
  const vars = buildVars(info);
  const writeOpts = { force: opts.force, dryRun: opts.dryRun };
  const results = installSkills(root, selected, vars, writeOpts);
  linkProjectSkills(root, { dryRun: opts.dryRun });

  // The Caveman skill makes detectCaveman true, so the scaffolding it implies
  // has to exist too — otherwise `doctor` fails on the project we just set up.
  if (selected.includes("caveman")) {
    results.push(...installCaveman(root, vars, writeOpts));
  }

  log.title(`Skills (${selected.length} selected)`);
  printResults(root, results);
  if (opts.dryRun) log.warn("Dry-run: nothing written.");
}
