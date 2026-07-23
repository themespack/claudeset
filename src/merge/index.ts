import { dirname } from "node:path";
import { writeFileSync } from "node:fs";
import { exists, read, ensureDir } from "../utils/fs.js";
import type { WriteResult } from "../types.js";

const BLOCK_START = "<!-- claudeset:start -->";
const BLOCK_END = "<!-- claudeset:end -->";

/** Deep-merge two plain objects. Source values fill only missing keys in target. */
export function deepMergeFillMissing(
  target: Record<string, unknown>,
  source: Record<string, unknown>,
): { result: Record<string, unknown>; changed: boolean } {
  let changed = false;
  const result: Record<string, unknown> = { ...target };
  for (const [key, srcVal] of Object.entries(source)) {
    const tgtVal = result[key];
    if (
      isPlainObject(srcVal) &&
      isPlainObject(tgtVal)
    ) {
      const merged = deepMergeFillMissing(tgtVal, srcVal);
      if (merged.changed) changed = true;
      result[key] = merged.result;
    } else if (!(key in result)) {
      result[key] = srcVal;
      changed = true;
    }
  }
  return { result, changed };
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/**
 * Merge a JSON template into an existing JSON file, filling only missing keys.
 * Creates the file when absent.
 */
export function mergeJsonFile(
  target: string,
  templateContent: string,
  opts: { dryRun?: boolean } = {},
): WriteResult {
  const template = JSON.parse(templateContent) as Record<string, unknown>;
  if (!exists(target)) {
    if (!opts.dryRun) {
      ensureDir(dirname(target));
      writeFileSync(target, JSON.stringify(template, null, 2) + "\n", "utf8");
    }
    return { path: target, action: "created" };
  }
  let existing: Record<string, unknown>;
  try {
    existing = JSON.parse(read(target)) as Record<string, unknown>;
  } catch {
    // Malformed target — leave untouched, caller/doctor should flag it.
    return { path: target, action: "skipped" };
  }
  const { result, changed } = deepMergeFillMissing(existing, template);
  if (!changed) return { path: target, action: "skipped" };
  if (!opts.dryRun) {
    writeFileSync(target, JSON.stringify(result, null, 2) + "\n", "utf8");
  }
  return { path: target, action: "merged" };
}

/**
 * Insert or refresh a claudeset-managed block inside a markdown file.
 * The block is delimited by HTML comments so user content outside it is never touched.
 */
export function mergeManagedBlock(
  target: string,
  blockBody: string,
  opts: { force?: boolean; dryRun?: boolean } = {},
): WriteResult {
  const block = `${BLOCK_START}\n${blockBody.trim()}\n${BLOCK_END}`;

  if (!exists(target)) {
    if (!opts.dryRun) {
      ensureDir(dirname(target));
      writeFileSync(target, block + "\n", "utf8");
    }
    return { path: target, action: "created" };
  }

  const current = read(target);
  const startIdx = current.indexOf(BLOCK_START);
  const endIdx = current.indexOf(BLOCK_END);

  if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
    const before = current.slice(0, startIdx);
    const after = current.slice(endIdx + BLOCK_END.length);
    const existingBlock = current.slice(startIdx, endIdx + BLOCK_END.length);
    if (existingBlock === block) return { path: target, action: "skipped" };
    if (!opts.force) return { path: target, action: "skipped" };
    if (!opts.dryRun) {
      writeFileSync(target, before + block + after, "utf8");
    }
    return { path: target, action: "updated" };
  }

  // No managed block yet — append one.
  if (!opts.dryRun) {
    const sep = current.endsWith("\n") ? "\n" : "\n\n";
    writeFileSync(target, current + sep + block + "\n", "utf8");
  }
  return { path: target, action: "merged" };
}
