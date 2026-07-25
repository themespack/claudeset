import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { maskComments, parseJsonc, topLevelValueStart, matchBrace } from "./jsonc.js";
import { addZedServer, removeZedServer, readZedServers } from "./zed.js";
import { addUserServer, removeUserServer, readUserServers } from "./user-mcp.js";

let dir: string;
let settings: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "claudeset-"));
  settings = join(dir, "settings.json");
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

const server = { command: "npx", args: ["-y", "server-github"] };

describe("jsonc", () => {
  it("masks comments without shifting offsets", () => {
    const text = '{\n  // note\n  "a": 1 /* x */\n}';
    const masked = maskComments(text);
    expect(masked.length).toBe(text.length);
    expect(masked).not.toContain("note");
    expect(masked.indexOf('"a"')).toBe(text.indexOf('"a"'));
  });

  it("leaves comment-like content inside strings alone", () => {
    const text = '{ "url": "https://x.dev//y" }';
    expect(parseJsonc<{ url: string }>(text)?.url).toBe("https://x.dev//y");
  });

  it("parses comments and trailing commas", () => {
    const parsed = parseJsonc<{ a: number }>('{\n "a": 1, // c\n}');
    expect(parsed).toEqual({ a: 1 });
  });

  it("returns null on malformed input", () => {
    expect(parseJsonc("{ nope")).toBeNull();
  });

  it("finds a top-level value and its extent", () => {
    const text = '{ "a": { "b": 1 }, "c": 2 }';
    const masked = maskComments(text);
    const start = topLevelValueStart(masked, "a");
    expect(text.slice(start, matchBrace(masked, start) + 1)).toBe('{ "b": 1 }');
  });

  it("does not match a nested key with the same name", () => {
    const text = '{ "a": { "c": 1 } }';
    expect(topLevelValueStart(maskComments(text), "c")).toBe(-1);
  });
});

describe("zed settings", () => {
  it("creates the file when missing", () => {
    expect(addZedServer("gh", server, { path: settings }).change).toBe("added");
    expect(readZedServers(settings)).toHaveProperty("gh");
  });

  it("preserves comments and unrelated keys", () => {
    writeFileSync(
      settings,
      '// my settings\n{\n  "theme": "One Dark",\n  "context_servers": {\n    "old": { "command": "x" }\n  }\n}\n',
    );
    expect(addZedServer("gh", server, { path: settings }).change).toBe("added");
    const after = readFileSync(settings, "utf8");
    expect(after).toContain("// my settings");
    expect(after).toContain('"theme": "One Dark"');
    const servers = readZedServers(settings)!;
    expect(Object.keys(servers).sort()).toEqual(["gh", "old"]);
  });

  it("adds the context_servers key when absent", () => {
    writeFileSync(settings, '{\n  "theme": "One Dark"\n}\n');
    addZedServer("gh", server, { path: settings });
    expect(readZedServers(settings)).toHaveProperty("gh");
    expect(readFileSync(settings, "utf8")).toContain('"theme"');
  });

  it("fills an empty context_servers object", () => {
    writeFileSync(settings, '{\n  "context_servers": {}\n}\n');
    addZedServer("gh", server, { path: settings });
    expect(readZedServers(settings)).toHaveProperty("gh");
  });

  it("is idempotent", () => {
    addZedServer("gh", server, { path: settings });
    const before = readFileSync(settings, "utf8");
    expect(addZedServer("gh", server, { path: settings }).change).toBe("unchanged");
    expect(readFileSync(settings, "utf8")).toBe(before);
  });

  it("updates a changed server in place", () => {
    addZedServer("gh", server, { path: settings });
    const result = addZedServer("gh", { command: "bunx" }, { path: settings });
    expect(result.change).toBe("updated");
    expect(readZedServers(settings)!.gh).toMatchObject({ command: "bunx" });
  });

  it("writes nothing on dry-run", () => {
    writeFileSync(settings, "{}\n");
    addZedServer("gh", server, { path: settings, dryRun: true });
    expect(readFileSync(settings, "utf8")).toBe("{}\n");
  });

  it("refuses to touch an unparsable file", () => {
    writeFileSync(settings, "{ broken");
    const result = addZedServer("gh", server, { path: settings });
    expect(result.change).toBe("unparsable");
    expect(result.snippet).toContain("context_servers");
    expect(readFileSync(settings, "utf8")).toBe("{ broken");
  });

  it("removes a server and keeps the rest valid", () => {
    addZedServer("gh", server, { path: settings });
    addZedServer("fs", { command: "npx" }, { path: settings });
    expect(removeZedServer("gh", { path: settings }).change).toBe("removed");
    expect(Object.keys(readZedServers(settings)!)).toEqual(["fs"]);
    expect(removeZedServer("gh", { path: settings }).change).toBe("absent");
  });
});

describe("claude user scope", () => {
  it("adds without disturbing other keys", () => {
    const path = join(dir, ".claude.json");
    writeFileSync(path, JSON.stringify({ numStartups: 6 }, null, 2));
    expect(addUserServer("gh", server, { path })).toBe("added");
    const parsed = JSON.parse(readFileSync(path, "utf8"));
    expect(parsed.numStartups).toBe(6);
    expect(parsed.mcpServers.gh).toEqual(server);
  });

  it("is idempotent and removable", () => {
    const path = join(dir, ".claude.json");
    addUserServer("gh", server, { path });
    expect(addUserServer("gh", server, { path })).toBe("unchanged");
    expect(removeUserServer("gh", { path })).toBe("removed");
    expect(readUserServers(path)).toEqual({});
  });

  it("reports unparsable files instead of clobbering them", () => {
    const path = join(dir, ".claude.json");
    writeFileSync(path, "{ broken");
    expect(addUserServer("gh", server, { path })).toBe("unparsable");
    expect(readFileSync(path, "utf8")).toBe("{ broken");
  });
});
