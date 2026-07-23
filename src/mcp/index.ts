import { join } from "node:path";
import { writeFileSync } from "node:fs";
import { exists, read, ensureDir } from "../utils/fs.js";
import { dirname } from "node:path";

/** A project-scoped MCP server entry, as stored in `.mcp.json`. */
export interface McpServer {
  command: string;
  args?: string[];
  env?: Record<string, string>;
}

interface McpFile {
  mcpServers: Record<string, McpServer>;
}

export function mcpPath(root: string): string {
  return join(root, ".mcp.json");
}

export function readMcp(root: string): McpFile {
  const p = mcpPath(root);
  if (!exists(p)) return { mcpServers: {} };
  try {
    const parsed = JSON.parse(read(p)) as Partial<McpFile>;
    return { mcpServers: parsed.mcpServers ?? {} };
  } catch {
    return { mcpServers: {} };
  }
}

function writeMcp(root: string, data: McpFile, dryRun?: boolean): void {
  if (dryRun) return;
  const p = mcpPath(root);
  ensureDir(dirname(p));
  writeFileSync(p, JSON.stringify(data, null, 2) + "\n", "utf8");
}

export function listServers(root: string): Record<string, McpServer> {
  return readMcp(root).mcpServers;
}

export type McpChange = "added" | "updated" | "unchanged" | "removed" | "absent";

export function addServer(
  root: string,
  name: string,
  server: McpServer,
  opts: { dryRun?: boolean } = {},
): McpChange {
  const data = readMcp(root);
  const existed = name in data.mcpServers;
  if (existed && JSON.stringify(data.mcpServers[name]) === JSON.stringify(server)) {
    return "unchanged";
  }
  data.mcpServers[name] = server;
  writeMcp(root, data, opts.dryRun);
  return existed ? "updated" : "added";
}

export function removeServer(
  root: string,
  name: string,
  opts: { dryRun?: boolean } = {},
): McpChange {
  const data = readMcp(root);
  if (!(name in data.mcpServers)) return "absent";
  delete data.mcpServers[name];
  writeMcp(root, data, opts.dryRun);
  return "removed";
}

/** Parse a CLI-supplied command string into command + args. */
export function parseCommand(input: string): McpServer {
  const parts = input.trim().split(/\s+/);
  const [command, ...args] = parts;
  return args.length ? { command, args } : { command };
}
