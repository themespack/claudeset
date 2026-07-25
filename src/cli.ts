#!/usr/bin/env node
import { Command } from "commander";
import chalk from "chalk";
import { runInit } from "./commands/init.js";
import { runDoctor } from "./commands/doctor.js";
import { runRepair } from "./commands/repair.js";
import { runUpdate } from "./commands/update.js";
import { runMemory } from "./commands/memory.js";
import {
  mcpAdd,
  mcpCatalog,
  mcpInstall,
  mcpList,
  mcpRemove,
  parseScope,
  parseTarget,
} from "./commands/mcp.js";
import { skillsAdd, skillsList } from "./commands/skills.js";
import { runGlobal, runGlobalStatus } from "./commands/global.js";
import { MCP_CATALOG } from "./catalog/mcp.js";
import { SKILL_CATALOG } from "./catalog/skills.js";
import { parseIds, parsePreset } from "./catalog/presets.js";
import { hooksAdd, hooksList } from "./commands/hooks.js";
import { runClean } from "./commands/clean.js";
import type { InitOptions } from "./types.js";

const VERSION = "0.1.0";

function resolveCaveman(v: {
  caveman?: boolean;
  noCaveman?: boolean;
}): boolean | "auto" {
  if (v.noCaveman) return false;
  if (v.caveman) return true;
  return "auto";
}

const program = new Command();

program
  .name("claudeset")
  .description(
    "Bootstrap Claude Code config, project memory, RTK prompts and Caveman support.",
  )
  .version(VERSION, "-v, --version");

program
  .command("init")
  .description("Scaffold Claude Code config into the current project (idempotent).")
  .option("-f, --force", "overwrite existing files", false)
  .option("-y, --yes", "skip confirmation prompt", false)
  .option("--dry-run", "show what would change without writing", false)
  .option("--no-rtk", "skip RTK memory + prompt library")
  .option("--caveman", "force-enable Caveman scaffolding")
  .option("--no-caveman", "disable Caveman scaffolding")
  .option("-p, --preset <name>", "standard, ultimate or none")
  .option("--mcp <ids>", "comma-separated MCP server ids from the catalog")
  .option("--skills <ids>", "comma-separated skill ids from the catalog")
  .action(async (o) => {
    const opts: InitOptions = {
      force: Boolean(o.force),
      yes: Boolean(o.yes),
      dryRun: Boolean(o.dryRun),
      rtk: o.rtk !== false,
      caveman: resolveCaveman(o),
      preset: parsePreset(o.preset),
      mcp: parseIds(o.mcp, MCP_CATALOG.map((e) => e.id), "mcp"),
      skills: parseIds(o.skills, SKILL_CATALOG.map((e) => e.id), "skills"),
    };
    await runInit(process.cwd(), opts);
  });

program
  .command("doctor")
  .description("Check the health of the Claude Code setup.")
  .action(() => {
    process.exitCode = runDoctor(process.cwd());
  });

program
  .command("repair")
  .description("Recreate missing files without overwriting existing ones.")
  .option("--dry-run", "show what would change without writing", false)
  .action((o) => {
    runRepair(process.cwd(), { dryRun: Boolean(o.dryRun) });
  });

program
  .command("update")
  .description("Refresh managed templates to the latest version.")
  .option("-f, --force", "also overwrite memory files", false)
  .option("--dry-run", "show what would change without writing", false)
  .action((o) => {
    runUpdate(process.cwd(), { force: Boolean(o.force), dryRun: Boolean(o.dryRun) });
  });

program
  .command("memory")
  .description("List and create project memory files.")
  .option("-y, --yes", "create all missing files without asking", false)
  .option("--dry-run", "show what would change without writing", false)
  .action(async (o) => {
    await runMemory(process.cwd(), { yes: Boolean(o.yes), dryRun: Boolean(o.dryRun) });
  });

const SCOPE_HELP = "project (.mcp.json) or user (machine-wide)";
const TARGET_HELP = "with --scope user: claude, zed or both";

const mcp = program
  .command("mcp")
  .description("Manage MCP servers for the project, Claude Code or Zed.");
mcp
  .command("list")
  .description("List configured MCP servers.")
  .option("-s, --scope <scope>", SCOPE_HELP)
  .option("-t, --target <target>", TARGET_HELP)
  .action((o) => {
    mcpList(process.cwd(), { scope: parseScope(o.scope), target: parseTarget(o.target) });
  });
mcp
  .command("catalog")
  .description("Show the curated MCP servers and presets.")
  .action(() => mcpCatalog(process.cwd()));
mcp
  .command("add [name] [command...]")
  .description(
    "Add a catalog server by id (`mcp add github`), a preset (`--preset standard`), " +
      'or a custom one (`mcp add gh "npx -y pkg"`).',
  )
  .option("-p, --preset <name>", "standard, ultimate or none")
  .option("-s, --scope <scope>", SCOPE_HELP)
  .option("-t, --target <target>", TARGET_HELP)
  .option("--dry-run", "preview without writing", false)
  .action((name: string | undefined, command: string[], o) => {
    const opts = {
      dryRun: Boolean(o.dryRun),
      scope: parseScope(o.scope),
      target: parseTarget(o.target),
    };
    // A bare name (or none, with --preset) means "from the catalog".
    if (command.length === 0) {
      const ids = parseIds(name, MCP_CATALOG.map((e) => e.id), "mcp") ?? [];
      mcpInstall(process.cwd(), ids, { ...opts, preset: parsePreset(o.preset) });
      return;
    }
    mcpAdd(process.cwd(), name!, command.join(" "), opts);
  });
mcp
  .command("remove <name>")
  .description("Remove an MCP server.")
  .option("-s, --scope <scope>", SCOPE_HELP)
  .option("-t, --target <target>", TARGET_HELP)
  .option("--dry-run", "preview without writing", false)
  .action((name: string, o) => {
    mcpRemove(process.cwd(), name, {
      dryRun: Boolean(o.dryRun),
      scope: parseScope(o.scope),
      target: parseTarget(o.target),
    });
  });

const skills = program
  .command("skills")
  .description("Install skills from the catalog into .claude/skills/.");
skills
  .command("list")
  .description("Show catalog skills, which are installed, and the presets.")
  .action(() => skillsList(process.cwd()));
skills
  .command("add [ids...]")
  .description("Add skills by id, or a whole preset with --preset.")
  .option("-p, --preset <name>", "standard, ultimate or none")
  .option("-f, --force", "overwrite an existing skill", false)
  .option("--dry-run", "preview without writing", false)
  .action((ids: string[], o) => {
    skillsAdd(
      process.cwd(),
      parseIds(ids.join(","), SKILL_CATALOG.map((e) => e.id), "skills") ?? [],
      { preset: parsePreset(o.preset), force: Boolean(o.force), dryRun: Boolean(o.dryRun) },
    );
  });

const globalCmd = program
  .command("global")
  .description("Share skills, instructions and MCP across every agent and project.")
  .option("--dry-run", "show what would change without writing", false)
  .action((o) => {
    runGlobal({ dryRun: Boolean(o.dryRun) });
  });
globalCmd
  .command("status")
  .description("Check the machine-wide setup without changing anything.")
  .action(() => {
    process.exitCode = runGlobalStatus();
  });

const hooks = program
  .command("hooks")
  .description("Manage Claude Code hooks in .claude/settings.json.");
hooks
  .command("list")
  .description("List configured hooks and available presets.")
  .action(() => hooksList(process.cwd()));
hooks
  .command("add <preset>")
  .description("Add a hook preset (prettier, typecheck, protect-env).")
  .option("--dry-run", "preview without writing", false)
  .action((preset: string, o) => {
    hooksAdd(process.cwd(), preset, { dryRun: Boolean(o.dryRun) });
  });

program
  .command("clean")
  .description("Remove claudeset-generated files (regenerable by default).")
  .option("--all", "also remove CLAUDE.md, AGENTS.md, settings and memories", false)
  .option("-y, --yes", "skip confirmation", false)
  .option("--dry-run", "preview without removing", false)
  .action(async (o) => {
    await runClean(process.cwd(), {
      all: Boolean(o.all),
      yes: Boolean(o.yes),
      dryRun: Boolean(o.dryRun),
    });
  });

program.parseAsync(process.argv).catch((err: unknown) => {
  console.error(chalk.red("claudeset error:"), err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
