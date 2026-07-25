import { homedir } from "node:os";
import { join } from "node:path";

/** Zed's config directory (`%APPDATA%\Zed` on Windows, `~/.config/zed` elsewhere). */
export function zedConfigDir(): string {
  if (process.platform === "win32") {
    const appData = process.env.APPDATA ?? join(homedir(), "AppData", "Roaming");
    return join(appData, "Zed");
  }
  return join(homedir(), ".config", "zed");
}

export function zedSettingsPath(): string {
  return join(zedConfigDir(), "settings.json");
}

/** Personal agent instructions Zed loads for every project. */
export function zedAgentsMdPath(): string {
  return join(zedConfigDir(), "AGENTS.md");
}

/** Cross-editor skills root defined by the Agent Skills spec; Zed reads this. */
export function agentSkillsDir(): string {
  return join(homedir(), ".agents", "skills");
}

export function claudeHome(): string {
  return join(homedir(), ".claude");
}

export function claudeSkillsDir(): string {
  return join(claudeHome(), "skills");
}

export function claudeMdPath(): string {
  return join(claudeHome(), "CLAUDE.md");
}

/** Claude Code's user-scope config, which holds user-scope MCP servers. */
export function claudeConfigPath(): string {
  return join(homedir(), ".claude.json");
}
