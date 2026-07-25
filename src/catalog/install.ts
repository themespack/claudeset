import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { copyTemplateTree, type Vars } from "../template/index.js";
import { addServer } from "../mcp/index.js";
import { addUserServer } from "../global/user-mcp.js";
import { addZedServer } from "../global/zed.js";
import type { McpScope, McpTarget } from "../commands/mcp.js";
import { findMcp, resolveServer, type McpEntry, type Runtime } from "./mcp.js";
import { findSkill } from "./skills.js";
import type { WriteResult } from "../types.js";

export interface InstallOptions {
  force?: boolean;
  dryRun?: boolean;
  scope?: McpScope;
  target?: McpTarget;
}

/** Copy catalog skills into `.claude/skills/<id>/`. Unknown ids are ignored. */
export function installSkills(
  root: string,
  ids: string[],
  vars: Vars,
  opts: InstallOptions = {},
): WriteResult[] {
  const results: WriteResult[] = [];
  for (const id of ids) {
    if (!findSkill(id)) continue;
    results.push(
      ...copyTemplateTree(join("skills", id), join(root, ".claude", "skills", id), vars, {
        force: opts.force,
        dryRun: opts.dryRun,
      }),
    );
  }
  return results;
}

export interface McpInstallResult {
  entry: McpEntry;
  /** Where it was written, e.g. `.mcp.json` or `Zed context_servers`. */
  written: string[];
}

/** Add catalog servers to the project, or machine-wide with `scope: "user"`. */
export function installMcp(
  root: string,
  ids: string[],
  opts: InstallOptions = {},
): McpInstallResult[] {
  const scope = opts.scope ?? "project";
  const target = opts.target ?? "both";
  const out: McpInstallResult[] = [];

  for (const id of ids) {
    const entry = findMcp(id);
    if (!entry) continue;
    const server = resolveServer(entry, root);
    const written: string[] = [];

    if (scope === "project") {
      addServer(root, entry.id, server, { dryRun: opts.dryRun });
      written.push(".mcp.json");
    } else {
      if (target !== "zed") {
        addUserServer(entry.id, server, { dryRun: opts.dryRun });
        written.push("~/.claude.json");
      }
      if (target !== "claude") {
        const result = addZedServer(entry.id, server, { dryRun: opts.dryRun });
        written.push(result.change === "unparsable" ? "Zed (failed)" : "Zed settings");
      }
    }
    out.push({ entry, written });
  }
  return out;
}

/** Environment variables the chosen servers need, deduplicated. */
export function requiredEnv(ids: string[]): Array<{ name: string; hint: string; server: string }> {
  const out: Array<{ name: string; hint: string; server: string }> = [];
  for (const id of ids) {
    const entry = findMcp(id);
    for (const env of entry?.requiresEnv ?? []) {
      if (!out.some((e) => e.name === env.name)) out.push({ ...env, server: entry!.title });
    }
  }
  return out;
}

const RUNTIME_COMMAND: Record<Runtime, string> = {
  node: "npx",
  uv: "uvx",
  docker: "docker",
};

const RUNTIME_HINT: Record<Runtime, string> = {
  node: "install Node.js",
  uv: "install uv — https://docs.astral.sh/uv/",
  docker: "install Docker and start the daemon",
};

function onPath(command: string): boolean {
  const probe = process.platform === "win32" ? "where" : "which";
  return spawnSync(probe, [command], { stdio: "ignore" }).status === 0;
}

/** Runtimes a selection needs that are not installed on this machine. */
export function missingRuntimes(ids: string[]): Array<{ runtime: Runtime; hint: string; servers: string[] }> {
  const byRuntime = new Map<Runtime, string[]>();
  for (const id of ids) {
    const entry = findMcp(id);
    if (!entry) continue;
    byRuntime.set(entry.runtime, [...(byRuntime.get(entry.runtime) ?? []), entry.title]);
  }
  const out: Array<{ runtime: Runtime; hint: string; servers: string[] }> = [];
  for (const [runtime, servers] of byRuntime) {
    if (!onPath(RUNTIME_COMMAND[runtime])) {
      out.push({ runtime, hint: RUNTIME_HINT[runtime], servers });
    }
  }
  return out;
}
