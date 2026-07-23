import { join } from "node:path";
import { writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { exists, read, ensureDir } from "../utils/fs.js";

/** A single hook command, per Claude Code settings schema. */
export interface HookCommand {
  type: "command";
  command: string;
}

/** A matcher group binding a tool matcher to one or more hook commands. */
export interface HookMatcher {
  matcher?: string;
  hooks: HookCommand[];
}

export type HookEvent =
  | "PreToolUse"
  | "PostToolUse"
  | "Stop"
  | "SubagentStop"
  | "UserPromptSubmit";

export interface HookPreset {
  id: string;
  description: string;
  event: HookEvent;
  matcher?: string;
  command: string;
}

/** Built-in, opt-in hook presets. */
export const HOOK_PRESETS: HookPreset[] = [
  {
    id: "prettier",
    description: "Format edited JS/TS files with Prettier after each edit",
    event: "PostToolUse",
    matcher: "Edit|Write|MultiEdit",
    command:
      "jq -r '.tool_input.file_path // empty' | { read f; [ -n \"$f\" ] && npx prettier --write \"$f\" 2>/dev/null || true; }",
  },
  {
    id: "typecheck",
    description: "Run tsc --noEmit when the agent stops",
    event: "Stop",
    command: "npx tsc --noEmit 2>&1 | tail -20 || true",
  },
  {
    id: "protect-env",
    description: "Warn before the agent reads .env files",
    event: "PreToolUse",
    matcher: "Read",
    command:
      "jq -r '.tool_input.file_path // empty' | grep -q '\\.env' && echo 'claudeset: reading a .env file' >&2 || true",
  },
];

interface SettingsWithHooks {
  hooks?: Partial<Record<HookEvent, HookMatcher[]>>;
  [key: string]: unknown;
}

function settingsPath(root: string): string {
  return join(root, ".claude", "settings.json");
}

export function readSettings(root: string): SettingsWithHooks {
  const p = settingsPath(root);
  if (!exists(p)) return {};
  try {
    return JSON.parse(read(p)) as SettingsWithHooks;
  } catch {
    return {};
  }
}

function writeSettings(root: string, data: SettingsWithHooks, dryRun?: boolean): void {
  if (dryRun) return;
  const p = settingsPath(root);
  ensureDir(dirname(p));
  writeFileSync(p, JSON.stringify(data, null, 2) + "\n", "utf8");
}

export function getPreset(id: string): HookPreset | undefined {
  return HOOK_PRESETS.find((p) => p.id === id);
}

export type HookChange = "added" | "exists" | "unknown-preset";

/** Add a preset's hook to settings.json (idempotent). */
export function addHookPreset(
  root: string,
  presetId: string,
  opts: { dryRun?: boolean } = {},
): HookChange {
  const preset = getPreset(presetId);
  if (!preset) return "unknown-preset";

  const settings = readSettings(root);
  settings.hooks ??= {};
  const groups = (settings.hooks[preset.event] ??= []);

  // Already present? (same event + matcher + command)
  for (const g of groups) {
    if ((g.matcher ?? "") === (preset.matcher ?? "")) {
      if (g.hooks.some((h) => h.command === preset.command)) return "exists";
      g.hooks.push({ type: "command", command: preset.command });
      writeSettings(root, settings, opts.dryRun);
      return "added";
    }
  }

  groups.push({
    ...(preset.matcher ? { matcher: preset.matcher } : {}),
    hooks: [{ type: "command", command: preset.command }],
  });
  writeSettings(root, settings, opts.dryRun);
  return "added";
}

/** Flatten configured hooks for display. */
export function listHooks(
  root: string,
): Array<{ event: string; matcher: string; command: string }> {
  const settings = readSettings(root);
  const out: Array<{ event: string; matcher: string; command: string }> = [];
  for (const [event, groups] of Object.entries(settings.hooks ?? {})) {
    for (const g of groups ?? []) {
      for (const h of g.hooks) {
        out.push({ event, matcher: g.matcher ?? "*", command: h.command });
      }
    }
  }
  return out;
}
