import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import {
  mkdtempSync,
  rmSync,
  writeFileSync,
  readFileSync,
  mkdirSync,
  existsSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runGlobalSyncMcp } from "./global.js";

let fake: string;
let originalHome: string | undefined;

beforeEach(() => {
  fake = mkdtempSync(join(tmpdir(), "claudeset-global-"));
  originalHome = process.env.HOME;
  process.env.HOME = fake;
  vi.spyOn(console, "log").mockImplementation(() => {});
});
afterEach(() => {
  vi.restoreAllMocks();
  process.env.HOME = originalHome;
  rmSync(fake, { recursive: true, force: true });
});

function seed(rel: string, content: string): void {
  mkdirSync(join(fake, rel, ".."), { recursive: true });
  writeFileSync(join(fake, rel), content, "utf8");
}

describe("global sync-mcp", () => {
  it("mirrors the Claude user-scope servers into every other agent", () => {
    seed(".claude.json", JSON.stringify({ mcpServers: { gh: { command: "npx", args: ["-y", "gh"] } } }));
    runGlobalSyncMcp({});
    expect(existsSync(join(fake, ".cursor", "mcp.json"))).toBe(true);
    expect(existsSync(join(fake, ".gemini", "settings.json"))).toBe(true);
    expect(existsSync(join(fake, ".codex", "config.toml"))).toBe(true);
    expect(readFileSync(join(fake, ".codex", "config.toml"), "utf8")).toContain("[mcp_servers.gh]");
  });

  it("writes nothing on dry-run", () => {
    seed(".claude.json", JSON.stringify({ mcpServers: { gh: { command: "npx" } } }));
    runGlobalSyncMcp({ dryRun: true });
    expect(existsSync(join(fake, ".cursor", "mcp.json"))).toBe(false);
    expect(existsSync(join(fake, ".codex", "config.toml"))).toBe(false);
  });

  it("keeps unrelated Zed keys and comments", () => {
    seed(".claude.json", JSON.stringify({ mcpServers: { gh: { command: "npx" } } }));
    seed(".config/zed/settings.json", '// zed\n{\n  "theme": "One"\n}\n');
    runGlobalSyncMcp({});
    const text = readFileSync(join(fake, ".config", "zed", "settings.json"), "utf8");
    expect(text).toContain("// zed");
    expect(text).toContain('"theme": "One"');
    expect(text).toContain('"gh"');
  });

  it("does not duplicate a server that is already present", () => {
    seed(".claude.json", JSON.stringify({ mcpServers: { gh: { command: "npx" } } }));
    seed(".cursor/mcp.json", JSON.stringify({ mcpServers: { gh: { command: "npx" } } }));
    runGlobalSyncMcp({});
    const parsed = JSON.parse(readFileSync(join(fake, ".cursor", "mcp.json"), "utf8"));
    expect(Object.keys(parsed.mcpServers)).toEqual(["gh"]);
  });
});
