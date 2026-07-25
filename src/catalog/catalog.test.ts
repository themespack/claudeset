import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { MCP_CATALOG, findMcp, resolveServer } from "./mcp.js";
import { SKILL_CATALOG } from "./skills.js";
import { PRESETS, parseIds, parsePreset, resolvePreset } from "./presets.js";
import { installMcp, installSkills, requiredEnv } from "./install.js";
import { readMcp } from "../mcp/index.js";

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "claudeset-catalog-"));
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

describe("catalog", () => {
  it("has unique ids and a template per skill", () => {
    const mcpIds = MCP_CATALOG.map((e) => e.id);
    const skillIds = SKILL_CATALOG.map((e) => e.id);
    expect(new Set(mcpIds).size).toBe(mcpIds.length);
    expect(new Set(skillIds).size).toBe(skillIds.length);
    for (const id of skillIds) {
      expect(existsSync(join("templates", "skills", id, "SKILL.md"))).toBe(true);
    }
  });

  it("gives every skill template frontmatter matching its id", () => {
    for (const { id } of SKILL_CATALOG) {
      const text = readFileSync(join("templates", "skills", id, "SKILL.md"), "utf8");
      expect(text.startsWith("---\n")).toBe(true);
      expect(text).toContain(`name: ${id}`);
    }
  });

  it("substitutes the project root into server arguments", () => {
    const server = resolveServer(findMcp("filesystem")!, "/srv/app");
    expect(server.args).toContain("/srv/app");
    expect(JSON.stringify(server)).not.toContain("{{root}}");
  });

  it("resolves presets to known ids only", () => {
    for (const preset of Object.values(PRESETS)) {
      for (const id of preset.mcp) expect(findMcp(id)).toBeDefined();
      for (const id of preset.skills) {
        expect(SKILL_CATALOG.some((s) => s.id === id)).toBe(true);
      }
    }
    expect(resolvePreset("none")).toEqual({ mcp: [], skills: [] });
    expect(PRESETS.ultimate.mcp.length).toBe(MCP_CATALOG.length);
  });

  it("rejects unknown ids and presets", () => {
    expect(() => parsePreset("deluxe")).toThrow(/Unknown --preset/);
    expect(() => parseIds("git,nope", ["git"], "mcp")).toThrow(/nope/);
    expect(parseIds("git", ["git"], "mcp")).toEqual(["git"]);
    expect(parseIds(undefined, ["git"], "mcp")).toBeUndefined();
  });
});

describe("install", () => {
  it("copies selected skills and skips unknown ids", () => {
    const results = installSkills(dir, ["testing", "nope"], { projectName: "x" });
    expect(results).toHaveLength(1);
    expect(existsSync(join(dir, ".claude", "skills", "testing", "SKILL.md"))).toBe(true);
    expect(existsSync(join(dir, ".claude", "skills", "nope"))).toBe(false);
  });

  it("writes catalog servers to .mcp.json under their catalog id", () => {
    installMcp(dir, ["memory", "filesystem"]);
    const servers = readMcp(dir).mcpServers;
    expect(Object.keys(servers).sort()).toEqual(["filesystem", "memory"]);
    expect(servers.filesystem.args).toContain(dir);
  });

  it("reports required environment variables once", () => {
    const env = requiredEnv(["github", "brave-search", "github"]);
    expect(env.map((e) => e.name)).toEqual(["GITHUB_PERSONAL_ACCESS_TOKEN", "BRAVE_API_KEY"]);
  });

  it("writes nothing on dry-run", () => {
    installMcp(dir, ["memory"], { dryRun: true });
    installSkills(dir, ["testing"], { projectName: "x" }, { dryRun: true });
    expect(existsSync(join(dir, ".mcp.json"))).toBe(false);
    expect(existsSync(join(dir, ".claude", "skills", "testing"))).toBe(false);
  });
});
