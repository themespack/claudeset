import { join } from "node:path";
import { writeFileSync, copyFileSync } from "node:fs";
import { dirname } from "node:path";
import { exists, read, ensureDir } from "../utils/fs.js";
import { parseJsonc } from "../global/jsonc.js";
import { addZedServer, readZedServers } from "../global/zed.js";
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

/** Read whichever servers an agent's config currently declares, or null when unreadable. */
export function readAgentServers(
  root: string,
  id: AgentId,
): Record<string, McpServer> | null {
  const target = findAgent(id)!;
  const path = join(root, target.file);

  if (id === "zed") {
    const servers = readZedServers(path);
    return servers as Record<string, McpServer> | null;
  }
  if (id === "codex") return readCodexServers(path);
  if (!exists(path)) return {};

  const parsed = parseJsonc<Record<string, unknown>>(read(path));
  if (!parsed) return null;
  const section = parsed[target.key];
  if (!section || typeof section !== "object") return {};
  return section as Record<string, McpServer>;
}

/**
 * Write servers into one agent's config, preserving keys claudeset does not own.
 * Returns the ids actually written.
 */
export function writeAgentServers(
  root: string,
  id: AgentId,
  servers: Record<string, McpServer>,
  opts: { dryRun?: boolean } = {},
): { written: string[]; failed?: string } {
  const target = findAgent(id)!;
  const path = join(root, target.file);
  const names = Object.keys(servers);

  if (id === "zed") {
    for (const name of names) {
      const result = addZedServer(name, servers[name], { path, dryRun: opts.dryRun });
      if (result.change === "unparsable") return { written: [], failed: "not valid JSONC" };
    }
    return { written: names };
  }

  if (id === "codex") return writeCodexServers(path, servers, opts);

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
