import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, writeFileSync, readFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  AGENT_TARGETS,
  parseAgents,
  readAgentServers,
  writeAgentServers,
} from "./targets.js";
import { refreshSkillsBlock } from "./skills-block.js";

let dir: string;
const server = { command: "npx", args: ["-y", "pkg"] };

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "claudeset-agents-"));
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

function write(rel: string, content: string): void {
  mkdirSync(join(dir, rel, ".."), { recursive: true });
  writeFileSync(join(dir, rel), content, "utf8");
}

describe("agent targets", () => {
  it("rejects unknown agent ids and defaults to all", () => {
    expect(parseAgents(undefined)).toEqual(AGENT_TARGETS.map((t) => t.id));
    expect(parseAgents("cursor,zed")).toEqual(["cursor", "zed"]);
    expect(() => parseAgents("emacs")).toThrow(/Unknown agent/);
  });

  it("round-trips servers for every agent", () => {
    for (const target of AGENT_TARGETS) {
      const result = writeAgentServers(dir, target.id, { demo: server });
      expect(result.failed).toBeUndefined();
      expect(Object.keys(readAgentServers(dir, target.id)!)).toContain("demo");
    }
  });

  it("gives VS Code an explicit stdio type", () => {
    writeAgentServers(dir, "vscode", { demo: server });
    const parsed = JSON.parse(readFileSync(join(dir, ".vscode", "mcp.json"), "utf8"));
    expect(parsed.servers.demo.type).toBe("stdio");
    expect(parsed.servers.demo.command).toBe("npx");
  });

  it("keeps unrelated keys in an existing config", () => {
    write(".cursor/mcp.json", JSON.stringify({ mcpServers: { old: { command: "x" } }, other: 1 }));
    writeAgentServers(dir, "cursor", { demo: server });
    const parsed = JSON.parse(readFileSync(join(dir, ".cursor", "mcp.json"), "utf8"));
    expect(parsed.other).toBe(1);
    expect(Object.keys(parsed.mcpServers).sort()).toEqual(["demo", "old"]);
  });

  it("appends TOML tables for Codex without touching other settings", () => {
    write(".codex/config.toml", 'model = "gpt-5"\n');
    writeAgentServers(dir, "codex", { demo: server });
    const text = readFileSync(join(dir, ".codex", "config.toml"), "utf8");
    expect(text).toContain('model = "gpt-5"');
    expect(text).toContain("[mcp_servers.demo]");
    expect(text).toContain('args = ["-y", "pkg"]');

    // Second write is a no-op: the table is already there.
    expect(writeAgentServers(dir, "codex", { demo: server }).written).toEqual([]);
  });

  it("preserves comments in a project Zed config", () => {
    write(".zed/settings.json", '// mine\n{\n  "theme": "One"\n}\n');
    writeAgentServers(dir, "zed", { demo: server });
    const text = readFileSync(join(dir, ".zed", "settings.json"), "utf8");
    expect(text).toContain("// mine");
    expect(text).toContain('"theme": "One"');
    expect(readAgentServers(dir, "zed")).toHaveProperty("demo");
  });

  it("reports an unreadable config instead of overwriting it", () => {
    write(".gemini/settings.json", "{ broken");
    expect(readAgentServers(dir, "gemini")).toBeNull();
    expect(writeAgentServers(dir, "gemini", { demo: server }).failed).toBe("not valid JSON");
    expect(readFileSync(join(dir, ".gemini", "settings.json"), "utf8")).toBe("{ broken");
  });
});

describe("skills block", () => {
  it("lists installed skills in AGENTS.md and refreshes on change", () => {
    mkdirSync(join(dir, ".claude", "skills", "testing"), { recursive: true });
    writeFileSync(join(dir, ".claude", "skills", "testing", "SKILL.md"), "---\nname: testing\n---\n");
    writeFileSync(join(dir, "AGENTS.md"), "# Rules\n\nMine.\n");

    refreshSkillsBlock(dir);
    let text = readFileSync(join(dir, "AGENTS.md"), "utf8");
    expect(text).toContain("Mine.");
    expect(text).toContain(".claude/skills/testing/SKILL.md");

    mkdirSync(join(dir, ".claude", "skills", "react"));
    writeFileSync(join(dir, ".claude", "skills", "react", "SKILL.md"), "---\nname: react\n---\n");
    refreshSkillsBlock(dir);
    text = readFileSync(join(dir, "AGENTS.md"), "utf8");
    expect(text).toContain(".claude/skills/react/SKILL.md");
    expect(text.match(/claudeset:start/g)).toHaveLength(1);
  });

  it("does nothing when no skills are installed", () => {
    expect(refreshSkillsBlock(dir)).toBeNull();
  });
});
