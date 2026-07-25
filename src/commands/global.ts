import chalk from "chalk";
import { relative } from "node:path";
import { homedir } from "node:os";
import { exists, writeIfAbsent } from "../utils/fs.js";
import { readTemplate } from "../template/index.js";
import { log, actionLabel } from "../utils/log.js";
import { linkSkills, invalidSkills, listSkills } from "../global/skills.js";
import {
  USER_SCOPE_AGENTS,
  findAgent,
  readAgentServersAt,
  userConfigPath,
  writeAgentServersAt,
  type AgentId,
} from "../agents/targets.js";
import type { McpServer } from "../mcp/index.js";
import { claudeMdPath, zedAgentsMdPath } from "../global/paths.js";

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

interface Snapshot {
  id: AgentId;
  title: string;
  path: string;
  servers: Record<string, McpServer> | null;
}

function snapshot(): Snapshot[] {
  return USER_SCOPE_AGENTS.map((id) => {
    const path = userConfigPath(id)!;
    return {
      id,
      title: findAgent(id)!.title,
      path,
      servers: readAgentServersAt(path, id),
    };
  });
}

function printMcp(): void {
  const snaps = snapshot();
  for (const snap of snaps) {
    if (snap.servers === null) log.fail(`${tilde(snap.path)} could not be parsed`);
    else log.info(`  ${snap.title.padEnd(14)} (${tilde(snap.path)}): ${fmt(Object.keys(snap.servers))}`);
  }

  // Drift: any server present in one agent but missing in another.
  const readable = snaps.filter((s): s is Snapshot & { servers: Record<string, McpServer> } => s.servers !== null);
  const allNames = new Set(readable.flatMap((s) => Object.keys(s.servers)));
  const drift: string[] = [];
  for (const name of allNames) {
    const missing = readable.filter((s) => !(name in s.servers)).map((s) => s.title);
    if (missing.length && missing.length < readable.length) {
      drift.push(`${name} (missing in ${missing.join(", ")})`);
    }
  }
  if (drift.length) {
    log.warn(`Drift: ${drift.join("; ")}`);
    log.dim("    Fix with: claudeset global sync-mcp   (or: mcp add <name> <cmd> --scope user --target all)");
  }
}

/**
 * Mirror one agent's user-scope servers into every other user-scope agent, so
 * running Claude with a set of MCP servers also lights them up in Cursor, Gemini,
 * Zed and Codex globally. `source` defaults to whichever config has the most.
 */
export function runGlobalSyncMcp(opts: { dryRun?: boolean; source?: AgentId } = {}): void {
  const snaps = snapshot();
  const readable = snaps.filter((s): s is Snapshot & { servers: Record<string, McpServer> } => s.servers !== null);
  if (readable.length === 0) {
    log.fail("No readable user-scope config found.");
    return;
  }

  const source =
    opts.source !== undefined
      ? readable.find((s) => s.id === opts.source)
      : [...readable].sort((a, b) => Object.keys(b.servers).length - Object.keys(a.servers).length)[0];
  if (!source) {
    log.fail(`Source agent "${opts.source}" has no readable config.`);
    return;
  }

  const names = Object.keys(source.servers);
  log.title(`Global MCP sync from ${source.title} (${names.length} server(s))`);
  if (names.length === 0) {
    log.warn(`${source.title} has no servers to copy.`);
    return;
  }

  for (const target of snaps) {
    if (target.id === source.id) continue;
    if (target.servers === null) {
      log.fail(`${target.title.padEnd(14)} ${tilde(target.path)} — unreadable, left untouched`);
      continue;
    }
    const missing = Object.fromEntries(
      names.filter((n) => !(n in (target.servers as Record<string, McpServer>))).map((n) => [n, source.servers[n]]),
    );
    if (Object.keys(missing).length === 0) {
      log.ok(`${target.title.padEnd(14)} ${tilde(target.path)} — already in sync`);
      continue;
    }
    const result = writeAgentServersAt(target.path, target.id, missing, { dryRun: opts.dryRun });
    if (result.failed) log.fail(`${target.title.padEnd(14)} ${tilde(target.path)} — ${result.failed}`);
    else log.ok(`${target.title.padEnd(14)} ${tilde(target.path)} — added ${result.written.join(", ")}`);
  }

  if (opts.dryRun) log.warn("Dry-run: nothing written.");
  else log.dim("  Restart affected agents to load the new servers.");
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
