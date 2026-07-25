import { writeFileSync, copyFileSync } from "node:fs";
import { dirname } from "node:path";
import { exists, read, ensureDir } from "../utils/fs.js";
import type { McpServer } from "../mcp/index.js";
import {
  detectIndent,
  insertMember,
  matchBrace,
  maskComments,
  memberValueStart,
  parseJsonc,
  replaceValue,
  rootBrace,
  topLevelValueStart,
} from "./jsonc.js";
import { zedSettingsPath } from "./paths.js";

/** Zed calls MCP servers "context servers". */
export const ZED_MCP_KEY = "context_servers";

export type ZedChange = "added" | "updated" | "unchanged" | "removed" | "absent" | "unparsable";

export interface ZedResult {
  change: ZedChange;
  /** JSON to paste by hand when the file could not be edited safely. */
  snippet?: string;
}

interface ZedSettings {
  context_servers?: Record<string, unknown>;
}

export function readZedServers(path = zedSettingsPath()): Record<string, unknown> | null {
  if (!exists(path)) return {};
  const parsed = parseJsonc<ZedSettings>(read(path));
  if (!parsed) return null;
  return parsed.context_servers ?? {};
}

function zedEntry(server: McpServer): Record<string, unknown> {
  return {
    command: server.command,
    args: server.args ?? [],
    env: server.env ?? {},
  };
}

function snippetFor(name: string, server: McpServer): string {
  return JSON.stringify({ [ZED_MCP_KEY]: { [name]: zedEntry(server) } }, null, 2);
}

function backup(path: string): void {
  copyFileSync(path, path + ".claudeset.bak");
}

/**
 * Add or update a context server in Zed's settings.
 *
 * The file is JSONC and user-owned, so the edit is a text splice rather than a
 * re-serialisation; comments and formatting elsewhere in the file survive.
 */
export function addZedServer(
  name: string,
  server: McpServer,
  opts: { dryRun?: boolean; path?: string } = {},
): ZedResult {
  const path = opts.path ?? zedSettingsPath();
  const entry = zedEntry(server);

  if (!exists(path)) {
    if (!opts.dryRun) {
      ensureDir(dirname(path));
      writeFileSync(path, JSON.stringify({ [ZED_MCP_KEY]: { [name]: entry } }, null, 2) + "\n", "utf8");
    }
    return { change: "added" };
  }

  const text = read(path);
  const parsed = parseJsonc<ZedSettings>(text);
  if (!parsed) return { change: "unparsable", snippet: snippetFor(name, server) };

  const current = parsed.context_servers?.[name];
  if (current && JSON.stringify(current) === JSON.stringify(entry)) {
    return { change: "unchanged" };
  }

  const masked = maskComments(text);
  const unit = detectIndent(text);
  const csStart = topLevelValueStart(masked, ZED_MCP_KEY);

  let next: string;
  let change: ZedChange;

  if (csStart === -1) {
    const root = rootBrace(masked);
    if (root === -1) return { change: "unparsable", snippet: snippetFor(name, server) };
    next = insertMember(text, root, ZED_MCP_KEY, { [name]: entry }, unit);
    change = "added";
  } else if (masked[csStart] !== "{") {
    return { change: "unparsable", snippet: snippetFor(name, server) };
  } else if (current) {
    const valStart = memberValueStart(masked, csStart, name);
    const valEnd = matchBrace(masked, valStart);
    if (valStart === -1 || valEnd === -1) {
      return { change: "unparsable", snippet: snippetFor(name, server) };
    }
    next = replaceValue(text, valStart, valEnd + 1, entry, unit);
    change = "updated";
  } else {
    next = insertMember(text, csStart, name, entry, unit);
    change = "added";
  }

  if (!opts.dryRun) {
    backup(path);
    writeFileSync(path, next, "utf8");
  }
  return { change };
}

export function removeZedServer(
  name: string,
  opts: { dryRun?: boolean; path?: string } = {},
): ZedResult {
  const path = opts.path ?? zedSettingsPath();
  if (!exists(path)) return { change: "absent" };

  const text = read(path);
  const parsed = parseJsonc<ZedSettings>(text);
  if (!parsed) return { change: "unparsable" };
  if (!parsed.context_servers || !(name in parsed.context_servers)) {
    return { change: "absent" };
  }

  const masked = maskComments(text);
  const csStart = topLevelValueStart(masked, ZED_MCP_KEY);
  const valStart = memberValueStart(masked, csStart, name);
  const valEnd = matchBrace(masked, valStart);
  if (valStart === -1 || valEnd === -1) return { change: "unparsable" };

  // Widen to the whole member: back to the start of its key, forward past a trailing comma.
  const keyStart = text.lastIndexOf(JSON.stringify(name), valStart);
  const lineStart = text.lastIndexOf("\n", keyStart) + 1;
  let end = valEnd + 1;
  while (end < text.length && /[ \t]/.test(text[end])) end++;
  if (text[end] === ",") end++;
  if (text[end] === "\n") end++;

  const next = text.slice(0, lineStart) + text.slice(end);
  if (!opts.dryRun) {
    backup(path);
    writeFileSync(path, next, "utf8");
  }
  return { change: "removed" };
}
