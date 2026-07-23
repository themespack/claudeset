import { join } from "node:path";
import { exists } from "../utils/fs.js";
import { copyTemplateTree, type Vars } from "../template/index.js";
import { RTK_MEMORY_DIR, RTK_MEMORY_FILES, RTK_PROMPT_DIR } from "./rtk.js";
import { CAVEMAN_DIR } from "./caveman.js";
import type { CheckResult, WriteResult } from "../types.js";

export * from "./rtk.js";
export * from "./caveman.js";

/** Install RTK memory files + prompt library (idempotent). */
export function installRtk(
  root: string,
  vars: Vars,
  opts: { force?: boolean; dryRun?: boolean } = {},
): WriteResult[] {
  return [
    ...copyTemplateTree("memories", join(root, RTK_MEMORY_DIR), vars, opts),
    ...copyTemplateTree("prompts", join(root, RTK_PROMPT_DIR), vars, opts),
  ];
}

/** Install Caveman scaffolding (idempotent). */
export function installCaveman(
  root: string,
  vars: Vars,
  opts: { force?: boolean; dryRun?: boolean } = {},
): WriteResult[] {
  return copyTemplateTree("caveman", join(root, CAVEMAN_DIR), vars, opts);
}

/** Report which RTK memory files exist vs missing. */
export function checkMemory(root: string): CheckResult[] {
  return RTK_MEMORY_FILES.map((file) => {
    const ok = exists(join(root, RTK_MEMORY_DIR, file));
    return { label: file, ok, detail: ok ? undefined : "missing" };
  });
}

export function missingMemoryFiles(root: string): string[] {
  return RTK_MEMORY_FILES.filter(
    (file) => !exists(join(root, RTK_MEMORY_DIR, file)),
  );
}
