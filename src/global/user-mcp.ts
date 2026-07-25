import { writeFileSync, copyFileSync } from "node:fs";
import { exists, read } from "../utils/fs.js";
import type { McpChange, McpServer } from "../mcp/index.js";
import { claudeConfigPath } from "./paths.js";

interface ClaudeConfig {
  mcpServers?: Record<string, McpServer>;
  [key: string]: unknown;
}

export type UserMcpChange = McpChange | "unparsable";

function load(path: string): ClaudeConfig | null {
  if (!exists(path)) return {};
  try {
    return JSON.parse(read(path)) as ClaudeConfig;
  } catch {
    return null;
  }
}

function save(path: string, data: ClaudeConfig): void {
  if (exists(path)) copyFileSync(path, path + ".claudeset.bak");
  writeFileSync(path, JSON.stringify(data, null, 2) + "\n", "utf8");
}

export function readUserServers(
  path = claudeConfigPath(),
): Record<string, McpServer> | null {
  const data = load(path);
  return data ? (data.mcpServers ?? {}) : null;
}

/** Add or update a user-scope MCP server in `~/.claude.json`. */
export function addUserServer(
  name: string,
  server: McpServer,
  opts: { dryRun?: boolean; path?: string } = {},
): UserMcpChange {
  const path = opts.path ?? claudeConfigPath();
  const data = load(path);
  if (!data) return "unparsable";

  const servers = data.mcpServers ?? {};
  const existed = name in servers;
  if (existed && JSON.stringify(servers[name]) === JSON.stringify(server)) {
    return "unchanged";
  }
  servers[name] = server;
  data.mcpServers = servers;
  if (!opts.dryRun) save(path, data);
  return existed ? "updated" : "added";
}

export function removeUserServer(
  name: string,
  opts: { dryRun?: boolean; path?: string } = {},
): UserMcpChange {
  const path = opts.path ?? claudeConfigPath();
  const data = load(path);
  if (!data) return "unparsable";
  if (!data.mcpServers || !(name in data.mcpServers)) return "absent";
  delete data.mcpServers[name];
  if (!opts.dryRun) save(path, data);
  return "removed";
}
