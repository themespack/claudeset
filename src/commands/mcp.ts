import chalk from "chalk";
import {
  addServer,
  listServers,
  parseCommand,
  removeServer,
  type McpServer,
} from "../mcp/index.js";
import { log } from "../utils/log.js";

function printServer(name: string, s: McpServer): void {
  const cmd = [s.command, ...(s.args ?? [])].join(" ");
  log.info(`  ${chalk.cyan(name.padEnd(16))} ${cmd}`);
}

export function mcpList(root: string): void {
  log.title("MCP servers (.mcp.json)");
  const servers = listServers(root);
  const names = Object.keys(servers);
  if (names.length === 0) {
    log.dim("  none configured");
    return;
  }
  for (const name of names) printServer(name, servers[name]);
}

export function mcpAdd(
  root: string,
  name: string,
  command: string,
  opts: { dryRun?: boolean } = {},
): void {
  const server = parseCommand(command);
  const change = addServer(root, name, server, opts);
  if (change === "unchanged") {
    log.ok(`${name} already configured (unchanged)`);
    return;
  }
  log.ok(`${change} MCP server "${name}"`);
  printServer(name, server);
  if (opts.dryRun) log.warn("Dry-run: nothing written.");
}

export function mcpRemove(
  root: string,
  name: string,
  opts: { dryRun?: boolean } = {},
): void {
  const change = removeServer(root, name, opts);
  if (change === "absent") {
    log.warn(`No MCP server named "${name}".`);
    return;
  }
  log.ok(`Removed MCP server "${name}"`);
  if (opts.dryRun) log.warn("Dry-run: nothing written.");
}
