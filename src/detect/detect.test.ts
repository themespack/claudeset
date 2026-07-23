import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { detectFramework, detectPackageManager } from "./index.js";

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "ck-detect-"));
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

function pkg(deps: Record<string, string>): void {
  writeFileSync(join(dir, "package.json"), JSON.stringify({ dependencies: deps }));
}

describe("detectFramework", () => {
  it("detects next over react", () => {
    pkg({ next: "14", react: "18" });
    expect(detectFramework(dir)).toBe("next");
  });
  it("detects react when no meta-framework", () => {
    pkg({ react: "18" });
    expect(detectFramework(dir)).toBe("react");
  });
  it("falls back to node for a plain package.json", () => {
    pkg({ lodash: "4" });
    expect(detectFramework(dir)).toBe("node");
  });
  it("detects python via pyproject.toml", () => {
    writeFileSync(join(dir, "pyproject.toml"), "");
    expect(detectFramework(dir)).toBe("python");
  });
});

describe("detectPackageManager", () => {
  it("detects pnpm from lockfile", () => {
    writeFileSync(join(dir, "pnpm-lock.yaml"), "");
    expect(detectPackageManager(dir)).toBe("pnpm");
  });
  it("returns unknown for empty dir", () => {
    mkdirSync(join(dir, "sub"));
    expect(detectPackageManager(dir)).toBe("unknown");
  });
});
