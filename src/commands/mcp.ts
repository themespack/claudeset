import chalk from "chalk";
import {
  addServer,
  listServers,
  parseCommand,
  removeServer,
  type McpServer,
} from "../mcp/index.js";
import { addZedServer, readZedServers, removeZedServer } from "../global/zed.js";
import { addUserServer, readUserServers, removeUserServer } from "../global/user-mcp.js";
import { claudeConfigPath, zedSettingsPath } from "../global/paths.js";
import { MCP_CATALOG, resolveServer } from "../catalog/mcp.js";
import { PRESETS, resolvePreset, type PresetName } from "../catalog/presets.js";
import { installMcp, missingRuntimes, requiredEnv } from "../catalog/install.js";
import { log } from "../utils/log.js";

/** `project` writes `.mcp.json`; `user` writes the machine-wide configs. */
export type McpScope = "project" | "user";
/** Which agent's config to write when the scope is `user`. */
export type McpTarget = "claude" | "zed" | "both";

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

export function parseTarget(value: string | undefined): McpTarget {
  if (value === undefined) return "both";
  if (value === "claude" || value === "zed" || value === "both") return value;
  throw new Error(`Unknown --target "${value}". Use claude, zed or both.`);
}

function printServer(name: string, s: McpServer): void {
  const cmd = [s.command, ...(s.args ?? [])].join(" ");
  log.info(`  ${chalk.cyan(name.padEnd(16))} ${cmd}`);
}

function wants(target: McpTarget, who: "claude" | "zed"): boolean {
  return target === "both" || target === who;
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

  const target = opts.target ?? "both";
  if (wants(target, "claude")) {
    log.title(`MCP servers — Claude Code user scope (${claudeConfigPath()})`);
    const servers = readUserServers();
    if (servers === null) log.fail("  file is not valid JSON");
    else if (Object.keys(servers).length === 0) log.dim("  none configured");
    else for (const [name, s] of Object.entries(servers)) printServer(name, s);
  }
  if (wants(target, "zed")) {
    log.title(`MCP servers — Zed context_servers (${zedSettingsPath()})`);
    const servers = readZedServers();
    if (servers === null) log.fail("  file is not valid JSON/JSONC");
    else if (Object.keys(servers).length === 0) log.dim("  none configured");
    else {
      for (const [name, s] of Object.entries(servers)) printServer(name, s as McpServer);
    }
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
    const target = opts.target ?? "both";
    if (wants(target, "claude")) {
      report("Claude user scope", name, addUserServer(name, server, opts));
    }
    if (wants(target, "zed")) {
      const result = addZedServer(name, server, opts);
      report("Zed context_servers", name, result.change);
      if (result.snippet) {
        log.dim("    Could not edit safely — paste this into Zed's settings.json:");
        log.info(indent(result.snippet));
      }
    }
  }

  printServer(name, server);
  if (opts.dryRun) log.warn("Dry-run: nothing written.");
  else if (scope === "user") log.dim("  Restart Zed / Claude Code to load it.");
}

export function mcpRemove(root: string, name: string, opts: McpOptions = {}): void {
  const scope = opts.scope ?? "project";

  if (scope === "project") {
    report(".mcp.json", name, removeServer(root, name, opts));
  } else {
    const target = opts.target ?? "both";
    if (wants(target, "claude")) {
      report("Claude user scope", name, removeUserServer(name, opts));
    }
    if (wants(target, "zed")) {
      report("Zed context_servers", name, removeZedServer(name, opts).change);
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

function indent(text: string): string {
  return text
    .split("\n")
    .map((l) => "    " + l)
    .join("\n");
}
