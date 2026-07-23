#!/usr/bin/env node
import { Command } from "commander";
import chalk from "chalk";
import { runInit } from "./commands/init.js";
import { runDoctor } from "./commands/doctor.js";
import { runRepair } from "./commands/repair.js";
import { runUpdate } from "./commands/update.js";
import { runMemory } from "./commands/memory.js";
import { mcpAdd, mcpList, mcpRemove } from "./commands/mcp.js";
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
  .action(async (o) => {
    const opts: InitOptions = {
      force: Boolean(o.force),
      yes: Boolean(o.yes),
      dryRun: Boolean(o.dryRun),
      rtk: o.rtk !== false,
      caveman: resolveCaveman(o),
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

const mcp = program
  .command("mcp")
  .description("Manage project-scoped MCP servers (.mcp.json).");
mcp
  .command("list")
  .description("List configured MCP servers.")
  .action(() => mcpList(process.cwd()));
mcp
  .command("add <name> <command...>")
  .description('Add an MCP server, e.g. `mcp add gh "npx -y @modelcontextprotocol/server-github"`.')
  .option("--dry-run", "preview without writing", false)
  .action((name: string, command: string[], o) => {
    mcpAdd(process.cwd(), name, command.join(" "), { dryRun: Boolean(o.dryRun) });
  });
mcp
  .command("remove <name>")
  .description("Remove an MCP server.")
  .option("--dry-run", "preview without writing", false)
  .action((name: string, o) => {
    mcpRemove(process.cwd(), name, { dryRun: Boolean(o.dryRun) });
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
