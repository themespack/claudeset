import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import { existsSync } from "node:fs";

/** Absolute path to the package root (the folder that contains `templates/`). */
export function packageRoot(): string {
  // Compiled file lives at <root>/dist/utils/paths.js, source at <root>/src/utils/paths.ts.
  const here = dirname(fileURLToPath(import.meta.url));
  let dir = here;
  for (let i = 0; i < 5; i++) {
    if (existsSync(join(dir, "templates")) && existsSync(join(dir, "package.json"))) {
      return dir;
    }
    dir = dirname(dir);
  }
  // Fallback: two levels up from dist/utils.
  return resolve(here, "..", "..");
}

export function templatesDir(): string {
  return join(packageRoot(), "templates");
}
