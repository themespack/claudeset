export type Framework =
  | "next"
  | "react"
  | "vue"
  | "svelte"
  | "astro"
  | "express"
  | "node"
  | "python"
  | "go"
  | "rust"
  | "unknown";

export type PackageManager = "npm" | "pnpm" | "yarn" | "bun" | "unknown";

export interface ProjectInfo {
  root: string;
  framework: Framework;
  packageManager: PackageManager;
  hasGit: boolean;
  hasTypeScript: boolean;
  /** True when a Caveman skill/config is present or requested. */
  caveman: boolean;
  /** True when RTK prompt library should be installed. */
  rtk: boolean;
}

/** Result of writing/merging a single file. */
export type WriteAction = "created" | "merged" | "skipped" | "updated";

export interface WriteResult {
  path: string;
  action: WriteAction;
}

export interface CheckResult {
  label: string;
  ok: boolean;
  detail?: string;
}

export interface InitOptions {
  force: boolean;
  rtk: boolean;
  caveman: boolean | "auto";
  yes: boolean;
  dryRun: boolean;
}
