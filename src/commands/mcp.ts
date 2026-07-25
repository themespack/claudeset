import chalk from "chalk";
import {
  addServer,
  listServers,
  parseCommand,
  removeServer,
  type McpServer,
} from "../mcp/index.js";
import { removeZedServer } from "../global/zed.js";
import { removeUserServer } from "../global/user-mcp.js";
import { MCP_CATALOG, resolveServer } from "../catalog/mcp.js";
import { PRESETS, resolvePreset, type PresetName } from "../catalog/presets.js";
import { installMcp, missingRuntimes, requiredEnv } from "../catalog/install.js";
import {
  USER_SCOPE_AGENTS,
  findAgent,
  readAgentServers,
  readAgentServersAt,
  userConfigPath,
  writeAgentServers,
  writeAgentServersAt,
  type AgentId,
} from "../agents/targets.js";
import { log } from "../utils/log.js";

/** `project` writes `.mcp.json`; `user` writes the machine-wide configs. */
export type McpScope = "project" | "user";
/**
 * Which agent's user-scope config to write. `all` fans out to every agent that
 * exposes a dedicated MCP file; `both` is kept as a Claude+Zed alias so older
 * commands keep working.
 */
export type McpTarget = AgentId | "all" | "both";

export interface McpOptions {
  dryRun?: boolean;
  scope?: McpScope;
  target?: McpTarget;
}

export function parseScope(value: string | undefined): McpScope {
  if (value === undefined) return "project";
  if (value === "project" || value === "user") return value;
  throw new Error(`Unknown --scope "${value}". Use project or user.`);
}

const TARGETS: readonly McpTarget[] = [...USER_SCOPE_AGENTS, "all", "both"];

export function parseTarget(value: string | undefined): McpTarget {
  if (value === undefined) return "all";
  if ((TARGETS as readonly string[]).includes(value)) return value as McpTarget;
  throw new Error(`Unknown --target "${value}". Use one of: ${TARGETS.join(", ")}.`);
}

/** Expand `all` / `both` to the concrete agent ids they cover. */
export function resolveTargetAgents(target: McpTarget): AgentId[] {
  if (target === "all") return USER_SCOPE_AGENTS;
  if (target === "both") return ["claude", "zed"];
  return [target];
}

function printServer(name: string, s: McpServer): void {
  const cmd = [s.command, ...(s.args ?? [])].join(" ");
  log.info(`  ${chalk.cyan(name.padEnd(16))} ${cmd}`);
}

export function mcpList(root: string, opts: McpOptions = {}): void {
  const scope = opts.scope ?? "project";
  if (scope === "project") {
    log.title("MCP servers (.mcp.json)");
    const servers = listServers(root);
    const names = Object.keys(servers);
    if (names.length === 0) {
      log.dim("  none configured");
      return;
    }
    for (const name of names) printServer(name, servers[name]);
    return;
  }

  for (const id of resolveTargetAgents(opts.target ?? "all")) {
    const path = userConfigPath(id);
    if (!path) continue;
    log.title(`${findAgent(id)!.title} user scope (${path})`);
    const servers = readAgentServersAt(path, id);
    if (servers === null) log.fail("  file could not be parsed");
    else if (Object.keys(servers).length === 0) log.dim("  none configured");
    else for (const [name, s] of Object.entries(servers)) printServer(name, s);
  }
}

/** List the curated catalog, marking what this project already has. */
export function mcpCatalog(root: string): void {
  const installed = new Set(Object.keys(listServers(root)));

  log.title(`MCP catalog (${installed.size} installed in .mcp.json)`);
  for (const entry of MCP_CATALOG) {
    const mark = installed.has(entry.id) ? chalk.green("✔") : chalk.dim("·");
    const needs = entry.requiresEnv?.length ? chalk.yellow(" [needs key]") : "";
    const runtime = entry.runtime === "node" ? "" : chalk.yellow(` [${entry.runtime}]`);
    log.info(
      `  ${mark} ${chalk.cyan(entry.id.padEnd(20))} ${chalk.dim(entry.description)}${needs}${runtime}`,
    );
  }

  log.title("Presets");
  for (const preset of Object.values(PRESETS)) {
    log.info(
      `  ${chalk.cyan(preset.name.padEnd(10))} ${preset.mcp.length} servers — ${chalk.dim(preset.description)}`,
    );
  }
}

/** Install catalog servers by id, or a whole preset. */
export function mcpInstall(
  root: string,
  ids: string[],
  opts: McpOptions & { preset?: PresetName } = {},
): void {
  const selected = [...new Set([...(opts.preset ? resolvePreset(opts.preset).mcp : []), ...ids])];
  if (selected.length === 0) {
    log.warn("Nothing to add. Pass server ids or --preset standard|ultimate.");
    return;
  }

  const results = installMcp(root, selected, opts);
  log.title(`MCP servers (${results.length})`);
  for (const { entry, written } of results) {
    const server = resolveServer(entry, root);
    printServer(entry.id, server);
    log.dim(`  ${" ".repeat(16)} → ${written.join(", ")}`);
    if (entry.note) log.dim(`  ${" ".repeat(16)}   ${entry.note}`);
  }
  reportPrerequisites(selected);
  if (opts.dryRun) log.warn("Dry-run: nothing written.");
}

/** API keys and runtimes are the user's job — claudeset never writes secrets. */
export function reportPrerequisites(ids: string[]): void {
  const env = requiredEnv(ids);
  if (env.length) {
    log.title("Set these before the servers will start");
    for (const e of env) {
      log.info(`  ${chalk.cyan(e.name.padEnd(32))} ${chalk.dim(`${e.server} — ${e.hint}`)}`);
    }
    log.dim("  Export them in your shell profile. Never commit them.");
  }

  for (const missing of missingRuntimes(ids)) {
    log.warn(
      `${missing.runtime} not found on PATH — ${missing.servers.join(", ")} will not start. ${missing.hint}`,
    );
  }
}

/**
 * Mirror `.mcp.json` into the other agents' config files so one project setup
 * serves Cursor, VS Code, Gemini, Zed and Codex as well as Claude Code.
 */
export function mcpSync(
  root: string,
  agents: AgentId[],
  opts: { dryRun?: boolean } = {},
): void {
  const servers = listServers(root);
  const names = Object.keys(servers);

  log.title(`Sync MCP servers to other agents (${names.length} server(s))`);
  if (names.length === 0) {
    log.warn("`.mcp.json` has no servers yet. Run `claudeset mcp add --preset standard` first.");
    return;
  }

  for (const id of agents) {
    if (id === "claude") continue; // the source of truth
    const target = findAgent(id)!;
    const before = readAgentServers(root, id);
    if (before === null) {
      log.fail(`${target.title.padEnd(18)} ${target.file} — unreadable, left untouched`);
      continue;
    }

    const missing = Object.fromEntries(names.filter((n) => !(n in before)).map((n) => [n, servers[n]]));
    if (Object.keys(missing).length === 0) {
      log.ok(`${target.title.padEnd(18)} ${target.file} — already in sync`);
      continue;
    }

    const result = writeAgentServers(root, id, missing, opts);
    if (result.failed) {
      log.fail(`${target.title.padEnd(18)} ${target.file} — ${result.failed}`);
      continue;
    }
    log.ok(`${target.title.padEnd(18)} ${target.file} — added ${result.written.join(", ")}`);
  }

  if (opts.dryRun) log.warn("Dry-run: nothing written.");
  else log.dim("  Existing keys in those files were preserved; backups end in .claudeset.bak");
}

export function mcpAdd(
  root: string,
  name: string,
  command: string,
  opts: McpOptions = {},
): void {
  const server = parseCommand(command);
  const scope = opts.scope ?? "project";

  if (scope === "project") {
    report(".mcp.json", name, addServer(root, name, server, opts));
  } else {
    for (const id of resolveTargetAgents(opts.target ?? "all")) {
      const path = userConfigPath(id);
      if (!path) continue;
      const result = writeAgentServersAt(path, id, { [name]: server }, { dryRun: opts.dryRun });
      const label = `${findAgent(id)!.title} user scope`;
      if (result.failed) report(label, name, "unparsable");
      else report(label, name, "added");
    }
  }

  printServer(name, server);
  if (opts.dryRun) log.warn("Dry-run: nothing written.");
  else if (scope === "user") log.dim("  Restart affected agents to load it.");
}

export function mcpRemove(root: string, name: string, opts: McpOptions = {}): void {
  const scope = opts.scope ?? "project";

  if (scope === "project") {
    report(".mcp.json", name, removeServer(root, name, opts));
  } else {
    // Removal still goes through the per-agent helpers where they exist; the
    // rest are advertised to the user rather than silently ignored.
    for (const id of resolveTargetAgents(opts.target ?? "all")) {
      const label = `${findAgent(id)!.title} user scope`;
      if (id === "claude") report(label, name, removeUserServer(name, opts));
      else if (id === "zed") report(label, name, removeZedServer(name, opts).change);
      else log.warn(`  ${label}: removal not implemented; edit ${userConfigPath(id)} by hand.`);
    }
  }
  if (opts.dryRun) log.warn("Dry-run: nothing written.");
}

type AnyChange = "added" | "updated" | "unchanged" | "removed" | "absent" | "unparsable";

function report(where: string, name: string, change: AnyChange): void {
  switch (change) {
    case "unchanged":
      log.ok(`${where}: "${name}" already configured`);
      break;
    case "absent":
      log.warn(`${where}: no server named "${name}"`);
      break;
    case "unparsable":
      log.fail(`${where}: config could not be parsed — left untouched`);
      break;
    default:
      log.ok(`${where}: ${change} "${name}"`);
  }
}

