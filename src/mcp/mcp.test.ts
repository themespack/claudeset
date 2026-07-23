import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { addServer, listServers, removeServer, parseCommand } from "./index.js";

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "ck-mcp-"));
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe("mcp", () => {
  it("adds, is idempotent, and removes", () => {
    const s = { command: "npx", args: ["-y", "server"] };
    expect(addServer(dir, "gh", s)).toBe("added");
    expect(addServer(dir, "gh", s)).toBe("unchanged");
    expect(Object.keys(listServers(dir))).toEqual(["gh"]);
    expect(addServer(dir, "gh", { command: "node" })).toBe("updated");
    expect(removeServer(dir, "gh")).toBe("removed");
    expect(removeServer(dir, "gh")).toBe("absent");
  });
});

describe("parseCommand", () => {
  it("splits command and args", () => {
    expect(parseCommand("npx -y pkg")).toEqual({ command: "npx", args: ["-y", "pkg"] });
    expect(parseCommand("node")).toEqual({ command: "node" });
  });
});
