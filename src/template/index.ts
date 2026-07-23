import { join, basename } from "node:path";
import { read, writeIfAbsent, walk } from "../utils/fs.js";
import { templatesDir } from "../utils/paths.js";
import type { ProjectInfo, WriteResult } from "../types.js";

export type Vars = Record<string, string>;

/** Replace {{key}} occurrences. Unknown keys are left intact. */
export function render(content: string, vars: Vars): string {
  return content.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (whole, key: string) =>
    key in vars ? vars[key] : whole,
  );
}

export function buildVars(info: ProjectInfo): Vars {
  return {
    projectName: basename(info.root) || "project",
    framework: info.framework,
    packageManager: info.packageManager,
    language: info.hasTypeScript ? "TypeScript" : "JavaScript",
    date: new Date().toISOString().slice(0, 10),
  };
}

/** Read a single template file and render it. */
export function readTemplate(relPath: string, vars: Vars): string {
  return render(read(join(templatesDir(), relPath)), vars);
}

/**
 * Copy every file under a template subdirectory into `destRoot`, rendering vars.
 * Files named `gitignore` / `editorconfig` are re-dotted to `.gitignore` / `.editorconfig`
 * (npm strips leading dots from published packages).
 */
export function copyTemplateTree(
  subdir: string,
  destRoot: string,
  vars: Vars,
  opts: { force?: boolean; dryRun?: boolean } = {},
): WriteResult[] {
  const src = join(templatesDir(), subdir);
  const results: WriteResult[] = [];
  for (const rel of walk(src)) {
    const content = render(read(join(src, rel)), vars);
    const target = join(destRoot, redot(rel));
    results.push(writeIfAbsent(target, content, opts));
  }
  return results;
}

const REDOT = new Set(["gitignore", "editorconfig", "npmignore"]);

function redot(rel: string): string {
  const parts = rel.split(/[\\/]/);
  const last = parts[parts.length - 1];
  if (REDOT.has(last)) parts[parts.length - 1] = "." + last;
  return parts.join("/");
}
