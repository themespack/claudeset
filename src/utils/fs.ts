import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  readdirSync,
  statSync,
} from "node:fs";
import { dirname, join, relative } from "node:path";
import type { WriteResult } from "../types.js";

export function exists(p: string): boolean {
  return existsSync(p);
}

export function read(p: string): string {
  return readFileSync(p, "utf8");
}

export function ensureDir(dir: string): void {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

/**
 * Write a file only if it does not already exist (idempotent create).
 * When `force` is true, overwrite and report "updated".
 */
export function writeIfAbsent(
  target: string,
  content: string,
  opts: { force?: boolean; dryRun?: boolean } = {},
): WriteResult {
  const existed = existsSync(target);
  if (existed && !opts.force) {
    return { path: target, action: "skipped" };
  }
  if (!opts.dryRun) {
    ensureDir(dirname(target));
    writeFileSync(target, content, "utf8");
  }
  return { path: target, action: existed ? "updated" : "created" };
}

/** Recursively list files under `dir`, returned as paths relative to `dir`. */
export function walk(dir: string): string[] {
  const out: string[] = [];
  if (!existsSync(dir)) return out;
  const stack = [dir];
  while (stack.length) {
    const current = stack.pop()!;
    for (const entry of readdirSync(current)) {
      const full = join(current, entry);
      if (statSync(full).isDirectory()) {
        stack.push(full);
      } else {
        out.push(relative(dir, full));
      }
    }
  }
  return out;
}
