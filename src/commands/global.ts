import chalk from "chalk";
import { relative } from "node:path";
import { homedir } from "node:os";
import { exists, writeIfAbsent } from "../utils/fs.js";
import { readTemplate } from "../template/index.js";
import { log, actionLabel } from "../utils/log.js";
import { linkSkills, invalidSkills, listSkills } from "../global/skills.js";
import { readZedServers } from "../global/zed.js";
import { readUserServers } from "../global/user-mcp.js";
import {
  claudeConfigPath,
  claudeMdPath,
  zedAgentsMdPath,
  zedSettingsPath,
} from "../global/paths.js";

/** Render `~/…` so output stays readable. */
function tilde(p: string): string {
  const rel = relative(homedir(), p);
  return rel.startsWith("..") ? p : `~/${rel}`;
}

export function runGlobal(opts: { dryRun?: boolean } = {}): void {
  const vars = { date: new Date().toISOString().slice(0, 10) };

  log.title("claudeset global");
  log.dim("  Makes skills, instructions and MCP visible to every agent, every project.");

  log.title("Shared skills");
  const link = linkSkills(opts);
  switch (link.status) {
    case "linked":
      log.ok(`${tilde(link.target)} → ${tilde(link.source)}`);
      break;
    case "already-linked":
      log.ok(`${tilde(link.target)} already links to ${tilde(link.source)}`);
      break;
    case "no-source":
      log.warn(`${tilde(link.source)} does not exist yet (dry-run: would create it)`);
      break;
    case "conflict":
      log.fail(
        `${tilde(link.target)} already exists${
          link.pointsTo ? ` → ${tilde(link.pointsTo)}` : " as a real directory"
        }`,
      );
      log.dim(`    Move or remove it, then re-run. Nothing was touched.`);
      break;
  }

  const skills = listSkills();
  log.info(`  ${skills.length} skill(s): ${skills.length ? skills.join(", ") : chalk.dim("none")}`);
  const bad = invalidSkills();
  if (bad.length) {
    log.warn(`Missing SKILL.md, so Zed will skip: ${bad.join(", ")}`);
  }

  log.title("Always-on instructions");
  for (const [path, template] of [
    [zedAgentsMdPath(), "global/AGENTS.md"],
    [claudeMdPath(), "global/CLAUDE.md"],
  ] as const) {
    const result = writeIfAbsent(path, readTemplate(template, vars), opts);
    log.info(`  ${actionLabel(result.action).padEnd(18)} ${tilde(path)}`);
  }

  log.title("MCP");
  printMcp();

  if (opts.dryRun) log.warn("Dry-run: nothing written.");
  else log.ok("Global setup complete. Restart Zed to pick it up.");
}

function printMcp(): void {
  const zed = readZedServers();
  const user = readUserServers();

  if (zed === null) log.fail(`${tilde(zedSettingsPath())} is not valid JSON/JSONC`);
  else log.info(`  Zed  (${tilde(zedSettingsPath())}): ${fmt(Object.keys(zed))}`);

  if (user === null) log.fail(`${tilde(claudeConfigPath())} is not valid JSON`);
  else log.info(`  Claude (${tilde(claudeConfigPath())}): ${fmt(Object.keys(user))}`);

  if (zed && user) {
    const zedNames = new Set(Object.keys(zed));
    const userNames = new Set(Object.keys(user));
    const drift = [
      ...[...userNames].filter((n) => !zedNames.has(n)).map((n) => `${n} (Claude only)`),
      ...[...zedNames].filter((n) => !userNames.has(n)).map((n) => `${n} (Zed only)`),
    ];
    if (drift.length) {
      log.warn(`Drift: ${drift.join(", ")}`);
      log.dim("    Fix with: claudeset mcp add <name> <command> --scope user --target both");
    }
  }
}

function fmt(names: string[]): string {
  return names.length ? names.join(", ") : chalk.dim("none");
}

/** Read-only view of the same checks, for `claudeset global status`. */
export function runGlobalStatus(): number {
  log.title("claudeset global status");

  let failures = 0;
  // Dry-run, so any status other than "already-linked" means it is not set up yet.
  const link = linkSkills({ dryRun: true });
  if (link.status === "already-linked") {
    log.ok(`skills shared: ${tilde(link.target)} → ${tilde(link.source)}`);
  } else if (link.status === "conflict") {
    failures++;
    log.fail(`${tilde(link.target)} exists but is not a claudeset symlink`);
  } else {
    failures++;
    log.fail(`${tilde(link.target)} missing — run \`claudeset global\``);
  }

  const bad = invalidSkills();
  if (bad.length) {
    failures++;
    log.fail(`skills without SKILL.md: ${bad.join(", ")}`);
  } else {
    log.ok(`${listSkills().length} skill(s) valid`);
  }

  for (const path of [zedAgentsMdPath(), claudeMdPath()]) {
    if (exists(path)) log.ok(tilde(path));
    else {
      failures++;
      log.fail(`${tilde(path)} missing`);
    }
  }

  log.title("MCP");
  printMcp();

  log.title("Summary");
  if (failures === 0) {
    log.ok("Global setup healthy");
    return 0;
  }
  log.fail(`${failures} issue(s). Run \`claudeset global\`.`);
  return 1;
}
