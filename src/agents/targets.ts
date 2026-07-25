import { join } from "node:path";
import { homedir } from "node:os";
import { writeFileSync, copyFileSync } from "node:fs";
import { dirname } from "node:path";
import { exists, read, ensureDir } from "../utils/fs.js";
import { parseJsonc } from "../global/jsonc.js";
import { addZedServer, readZedServers } from "../global/zed.js";
import { addUserServer, readUserServers } from "../global/user-mcp.js";
import { zedSettingsPath, claudeConfigPath } from "../global/paths.js";
import type { McpServer } from "../mcp/index.js";

/**
 * Where each agent looks for project-scoped MCP servers. Paths and key names are
 * the ones each vendor documents; the shapes differ enough that they cannot be
 * written by a single serialiser.
 */
export type AgentId = "claude" | "cursor" | "vscode" | "gemini" | "zed" | "codex";

export interface AgentTarget {
  id: AgentId;
  title: string;
  /** Path relative to the project root. */
  file: string;
  /** Human description of where servers land inside the file. */
  key: string;
}

export const AGENT_TARGETS: AgentTarget[] = [
  { id: "claude", title: "Claude Code", file: ".mcp.json", key: "mcpServers" },
  { id: "cursor", title: "Cursor", file: join(".cursor", "mcp.json"), key: "mcpServers" },
  { id: "vscode", title: "VS Code / Copilot", file: join(".vscode", "mcp.json"), key: "servers" },
  { id: "gemini", title: "Gemini CLI", file: join(".gemini", "settings.json"), key: "mcpServers" },
  { id: "zed", title: "Zed", file: join(".zed", "settings.json"), key: "context_servers" },
  { id: "codex", title: "Codex CLI", file: join(".codex", "config.toml"), key: "[mcp_servers.*]" },
];

export function findAgent(id: string): AgentTarget | undefined {
  return AGENT_TARGETS.find((t) => t.id === id);
}

/**
 * Machine-wide config path each agent reads for MCP servers, or `null` when the
 * agent does not surface user-scope MCP through a dedicated file (VS Code buries
 * it inside its main settings.json, which claudeset does not touch).
 */
export function userConfigPath(id: AgentId): string | null {
  switch (id) {
    case "claude":
      return claudeConfigPath();
    case "zed":
      return zedSettingsPath();
    case "cursor":
      return join(homedir(), ".cursor", "mcp.json");
    case "gemini":
      return join(homedir(), ".gemini", "settings.json");
    case "codex":
      return join(homedir(), ".codex", "config.toml");
    case "vscode":
      return null;
  }
}

export const USER_SCOPE_AGENTS: AgentId[] = ["claude", "cursor", "gemini", "zed", "codex"];

export function parseAgents(value: string | undefined): AgentId[] {
  if (!value) return AGENT_TARGETS.map((t) => t.id);
  const ids = value.split(",").map((s) => s.trim()).filter(Boolean);
  const unknown = ids.filter((id) => !findAgent(id));
  if (unknown.length) {
    throw new Error(
      `Unknown agent: ${unknown.join(", ")}. Known: ${AGENT_TARGETS.map((t) => t.id).join(", ")}.`,
    );
  }
  return ids as AgentId[];
}

function backup(path: string): void {
  if (exists(path)) copyFileSync(path, path + ".claudeset.bak");
}

function writeJson(path: string, data: unknown, dryRun?: boolean): void {
  if (dryRun) return;
  ensureDir(dirname(path));
  backup(path);
  writeFileSync(path, JSON.stringify(data, null, 2) + "\n", "utf8");
}

/** Read servers from an explicit path, using the schema for `id`. */
export function readAgentServersAt(
  path: string,
  id: AgentId,
): Record<string, McpServer> | null {
  const target = findAgent(id)!;

  if (id === "zed") return readZedServers(path) as Record<string, McpServer> | null;
  if (id === "codex") return readCodexServers(path);
  if (id === "claude") return readUserServers(path);
  if (!exists(path)) return {};

  const parsed = parseJsonc<Record<string, unknown>>(read(path));
  if (!parsed) return null;
  const section = parsed[target.key];
  if (!section || typeof section !== "object") return {};
  return section as Record<string, McpServer>;
}

/** Write servers to an explicit path, using the schema for `id`. */
export function writeAgentServersAt(
  path: string,
  id: AgentId,
  servers: Record<string, McpServer>,
  opts: { dryRun?: boolean } = {},
): { written: string[]; failed?: string } {
  const target = findAgent(id)!;
  const names = Object.keys(servers);

  if (id === "zed") {
    for (const name of names) {
      const result = addZedServer(name, servers[name], { path, dryRun: opts.dryRun });
      if (result.change === "unparsable") return { written: [], failed: "not valid JSONC" };
    }
    return { written: names };
  }

  if (id === "codex") return writeCodexServers(path, servers, opts);

  if (id === "claude") {
    for (const name of names) {
      const change = addUserServer(name, servers[name], { path, dryRun: opts.dryRun });
      if (change === "unparsable") return { written: [], failed: "not valid JSON" };
    }
    return { written: names };
  }

  const existing = exists(path) ? parseJsonc<Record<string, unknown>>(read(path)) : {};
  if (!existing) return { written: [], failed: "not valid JSON" };

  const section = { ...((existing[target.key] as Record<string, unknown>) ?? {}) };
  for (const name of names) {
    // VS Code needs an explicit transport type; the others infer stdio.
    section[name] = id === "vscode" ? { type: "stdio", ...servers[name] } : servers[name];
  }
  writeJson(path, { ...existing, [target.key]: section }, opts.dryRun);
  return { written: names };
}

/** Project-scoped convenience wrapper — path derived from the agent's default file. */
export function readAgentServers(root: string, id: AgentId) {
  return readAgentServersAt(join(root, findAgent(id)!.file), id);
}
export function writeAgentServers(
  root: string,
  id: AgentId,
  servers: Record<string, McpServer>,
  opts: { dryRun?: boolean } = {},
) {
  return writeAgentServersAt(join(root, findAgent(id)!.file), id, servers, opts);
}

// --- Codex TOML -------------------------------------------------------------
//
// Codex reads `.codex/config.toml`. Rather than re-serialise a file that may hold
// unrelated settings, tables are appended and matched by header — TOML tables are
// order-independent, so appending is safe.

const TABLE = /^\[mcp_servers\.([A-Za-z0-9_-]+)\]/;

function readCodexServers(path: string): Record<string, McpServer> | null {
  if (!exists(path)) return {};
  const out: Record<string, McpServer> = {};
  let current: string | null = null;

  for (const line of read(path).split("\n")) {
    const header = TABLE.exec(line.trim());
    if (header) {
      current = header[1];
      out[current] = { command: "" };
      continue;
    }
    if (line.trim().startsWith("[")) {
      current = null;
      continue;
    }
    if (!current) continue;
    const command = /^command\s*=\s*"(.*)"/.exec(line.trim());
    if (command) out[current].command = command[1];
    const args = /^args\s*=\s*\[(.*)\]/.exec(line.trim());
    if (args) {
      out[current].args = args[1]
        .split(",")
        .map((s) => s.trim().replace(/^"|"$/g, ""))
        .filter(Boolean);
    }
  }
  return out;
}

function tomlTable(name: string, server: McpServer): string {
  const args = (server.args ?? []).map((a) => JSON.stringify(a)).join(", ");
  const lines = [`[mcp_servers.${name}]`, `command = ${JSON.stringify(server.command)}`];
  if (server.args?.length) lines.push(`args = [${args}]`);
  return lines.join("\n") + "\n";
}

function writeCodexServers(
  path: string,
  servers: Record<string, McpServer>,
  opts: { dryRun?: boolean } = {},
): { written: string[]; failed?: string } {
  const existing = readCodexServers(path) ?? {};
  const missing = Object.keys(servers).filter((name) => !(name in existing));
  if (missing.length === 0) return { written: [] };

  const current = exists(path) ? read(path) : "";
  const separator = current === "" || current.endsWith("\n\n") ? "" : current.endsWith("\n") ? "\n" : "\n\n";
  const added = missing.map((name) => tomlTable(name, servers[name])).join("\n");

  if (!opts.dryRun) {
    ensureDir(dirname(path));
    backup(path);
    writeFileSync(path, current + separator + added, "utf8");
  }
  return { written: missing };
}
