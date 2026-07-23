import { relative } from "node:path";
import { actionLabel, log } from "../utils/log.js";
import type { WriteResult } from "../types.js";

/** Pretty-print a batch of write results, grouped, relative to `root`. */
export function printResults(root: string, results: WriteResult[]): void {
  for (const r of results) {
    const rel = relative(root, r.path) || r.path;
    log.info(`  ${actionLabel(r.action).padEnd(18)} ${rel}`);
  }
  const counts = results.reduce<Record<string, number>>((acc, r) => {
    acc[r.action] = (acc[r.action] ?? 0) + 1;
    return acc;
  }, {});
  const parts = Object.entries(counts).map(([k, v]) => `${v} ${k}`);
  if (parts.length) log.dim(`  (${parts.join(", ")})`);
}
