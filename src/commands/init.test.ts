import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { mkdtempSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runInit } from "./init.js";
import { runDoctor } from "./doctor.js";
import type { InitOptions } from "../types.js";

let dir: string;

const options = (extra: Partial<InitOptions> = {}): InitOptions => ({
  force: false,
  rtk: true,
  caveman: "auto",
  yes: true,
  dryRun: false,
  ...extra,
});

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "claudeset-init-"));
  vi.spyOn(console, "log").mockImplementation(() => {});
});
afterEach(() => {
  vi.restoreAllMocks();
  rmSync(dir, { recursive: true, force: true });
});

describe("init", () => {
  it("leaves a project doctor considers healthy", async () => {
    await runInit(dir, options({ preset: "ultimate" }));
    expect(runDoctor(dir)).toBe(0);
  });

  it("creates Caveman scaffolding when the Caveman skill is selected", async () => {
    await runInit(dir, options({ preset: "none", skills: ["caveman"] }));
    expect(existsSync(join(dir, ".claude", "skills", "caveman", "SKILL.md"))).toBe(true);
    // Without the scaffolding, detectCaveman would make doctor fail on .caveman.
    expect(existsSync(join(dir, ".caveman"))).toBe(true);
    expect(runDoctor(dir)).toBe(0);
  });

  it("skips Caveman scaffolding when the skill is not selected", async () => {
    await runInit(dir, options({ preset: "standard" }));
    expect(existsSync(join(dir, ".caveman"))).toBe(false);
    expect(runDoctor(dir)).toBe(0);
  });

  it("honours --no-caveman even when the skill is selected", async () => {
    await runInit(dir, options({ preset: "none", skills: ["caveman"], caveman: false }));
    expect(existsSync(join(dir, ".caveman"))).toBe(false);
  });

  it("writes nothing on dry-run", async () => {
    await runInit(dir, options({ preset: "ultimate", dryRun: true }));
    expect(existsSync(join(dir, "CLAUDE.md"))).toBe(false);
    expect(existsSync(join(dir, ".mcp.json"))).toBe(false);
  });
});
