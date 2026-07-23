import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { addHookPreset, listHooks, readSettings } from "./index.js";

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "ck-hooks-"));
  mkdirSync(join(dir, ".claude"), { recursive: true });
  writeFileSync(
    join(dir, ".claude", "settings.json"),
    JSON.stringify({ permissions: { allow: ["Bash(ls:*)"] } }, null, 2),
  );
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe("addHookPreset", () => {
  it("adds a preset and is idempotent", () => {
    expect(addHookPreset(dir, "typecheck")).toBe("added");
    expect(addHookPreset(dir, "typecheck")).toBe("exists");
    expect(listHooks(dir)).toHaveLength(1);
  });

  it("rejects unknown presets", () => {
    expect(addHookPreset(dir, "nope")).toBe("unknown-preset");
  });

  it("preserves existing settings keys", () => {
    addHookPreset(dir, "prettier");
    const settings = readSettings(dir) as { permissions?: { allow: string[] } };
    expect(settings.permissions?.allow).toEqual(["Bash(ls:*)"]);
  });

  it("keeps separate matchers in the same event apart", () => {
    addHookPreset(dir, "prettier"); // PostToolUse, matcher Edit|Write|MultiEdit
    addHookPreset(dir, "typecheck"); // Stop
    expect(listHooks(dir)).toHaveLength(2);
  });
});
