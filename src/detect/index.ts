import { join } from "node:path";
import { exists, read } from "../utils/fs.js";
import type { Framework, PackageManager, ProjectInfo } from "../types.js";

interface PkgJson {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

function readPkg(root: string): PkgJson | null {
  const p = join(root, "package.json");
  if (!exists(p)) return null;
  try {
    return JSON.parse(read(p)) as PkgJson;
  } catch {
    return null;
  }
}

function allDeps(pkg: PkgJson | null): Record<string, string> {
  if (!pkg) return {};
  return { ...pkg.dependencies, ...pkg.devDependencies };
}

export function detectFramework(root: string): Framework {
  const pkg = readPkg(root);
  const deps = allDeps(pkg);
  const has = (name: string) => name in deps;

  if (has("next")) return "next";
  if (has("astro")) return "astro";
  if (has("svelte") || has("@sveltejs/kit")) return "svelte";
  if (has("vue") || has("nuxt")) return "vue";
  if (has("react") || has("react-dom")) return "react";
  if (has("express") || has("fastify") || has("koa") || has("@nestjs/core"))
    return "express";
  if (pkg) return "node";

  if (exists(join(root, "pyproject.toml")) || exists(join(root, "requirements.txt")))
    return "python";
  if (exists(join(root, "go.mod"))) return "go";
  if (exists(join(root, "Cargo.toml"))) return "rust";
  return "unknown";
}

export function detectPackageManager(root: string): PackageManager {
  if (exists(join(root, "bun.lockb")) || exists(join(root, "bun.lock"))) return "bun";
  if (exists(join(root, "pnpm-lock.yaml"))) return "pnpm";
  if (exists(join(root, "yarn.lock"))) return "yarn";
  if (exists(join(root, "package-lock.json"))) return "npm";
  if (exists(join(root, "package.json"))) return "npm";
  return "unknown";
}

export function detectTypeScript(root: string): boolean {
  return exists(join(root, "tsconfig.json"));
}

export function detectCaveman(root: string): boolean {
  return (
    exists(join(root, ".caveman")) ||
    exists(join(root, ".claude", "skills", "caveman")) ||
    exists(join(root, ".claude", "commands", "caveman.md"))
  );
}

export function detectProject(
  root: string,
  overrides: { caveman?: boolean; rtk?: boolean } = {},
): ProjectInfo {
  return {
    root,
    framework: detectFramework(root),
    packageManager: detectPackageManager(root),
    hasGit: exists(join(root, ".git")),
    hasTypeScript: detectTypeScript(root),
    caveman: overrides.caveman ?? detectCaveman(root),
    rtk: overrides.rtk ?? true,
  };
}
