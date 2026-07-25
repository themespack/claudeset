import { join } from "node:path";
import prompts from "prompts";
import { detectProject } from "../detect/index.js";
import { buildVars, copyTemplateTree, readTemplate } from "../template/index.js";
import { mergeJsonFile } from "../merge/index.js";
import { installRtk, installCaveman } from "../memory/index.js";
import { printResults } from "./summary.js";
import { MCP_CATALOG } from "../catalog/mcp.js";
import { SKILL_CATALOG } from "../catalog/skills.js";
import { PRESETS, resolvePreset, type PresetName } from "../catalog/presets.js";
import { installMcp, installSkills } from "../catalog/install.js";
import { reportPrerequisites } from "./mcp.js";
import { linkProjectSkills, type LinkResult } from "../global/skills.js";
import { actionLabel, log } from "../utils/log.js";
import type { InitOptions, WriteResult } from "../types.js";

/** The skills symlink is not a file write, so it reports itself. */
function reportSkillLink(link: LinkResult): void {
  switch (link.status) {
    case "linked":
      log.info(`  ${actionLabel("created").padEnd(18)} .agents/skills -> .claude/skills`);
      break;
    case "conflict":
      log.warn(".agents/skills already exists — left alone");
      break;
    case "unsupported":
      log.warn(".agents/skills symlink not supported here; Zed will not see project skills");
      break;
    default:
      break;
  }
}

interface Selection {
  mcp: string[];
  skills: string[];
}

/**
 * Decide which catalog items to install: explicit flags win, then a preset,
 * then an interactive picker. Non-interactive runs fall back to `standard`.
 */
async function chooseExtras(opts: InitOptions): Promise<Selection> {
  if (opts.mcp || opts.skills) {
    const base = opts.preset ? resolvePreset(opts.preset) : { mcp: [], skills: [] };
    return {
      mcp: [...new Set([...base.mcp, ...(opts.mcp ?? [])])],
      skills: [...new Set([...base.skills, ...(opts.skills ?? [])])],
    };
  }
  if (opts.preset) return resolvePreset(opts.preset);
  if (opts.yes || opts.dryRun || !process.stdin.isTTY) return resolvePreset("standard");

  const { preset } = await prompts({
    type: "select",
    name: "preset",
    message: "MCP servers and skills",
    initial: 0,
    choices: [
      { title: `standard — ${PRESETS.standard.description}`, value: "standard" },
      { title: `ultimate — ${PRESETS.ultimate.description}`, value: "ultimate" },
      { title: "choose individually", value: "pick" },
      { title: "none for now", value: "none" },
    ],
  });

  if (preset === undefined) return { mcp: [], skills: [] };
  if (preset !== "pick") return resolvePreset(preset as PresetName);

  const standard = PRESETS.standard;
  const answers = await prompts([
    {
      type: "multiselect",
      name: "mcp",
      message: "MCP servers (space to toggle)",
      instructions: false,
      choices: MCP_CATALOG.map((e) => ({
        title: e.title,
        value: e.id,
        description: e.description,
        selected: standard.mcp.includes(e.id),
      })),
    },
    {
      type: "multiselect",
      name: "skills",
      message: "Skills (space to toggle)",
      instructions: false,
      choices: SKILL_CATALOG.map((e) => ({
        title: e.title,
        value: e.id,
        description: e.description,
        selected: standard.skills.includes(e.id),
      })),
    },
  ]);

  return { mcp: answers.mcp ?? [], skills: answers.skills ?? [] };
}

export async function runInit(root: string, opts: InitOptions): Promise<void> {
  const detected = detectProject(root);
  const writeOpts = { force: opts.force, dryRun: opts.dryRun };

  log.title("claudeset init");
  log.dim(
    `  project: ${buildVars(detected).projectName}  ·  framework: ${detected.framework}` +
      `  ·  ${detected.hasTypeScript ? "TypeScript" : "JavaScript"}` +
      (opts.dryRun ? "  ·  (dry-run)" : ""),
  );

  if (!opts.yes && !opts.dryRun) {
    const { go } = await prompts({
      type: "confirm",
      name: "go",
      message: `Scaffold Claude Code into ./${buildVars(detected).projectName}?`,
      initial: true,
    });
    if (!go) {
      log.warn("Aborted.");
      return;
    }
  }

  const selection = await chooseExtras(opts);

  // Picking the Caveman skill counts as enabling Caveman, so the scaffolding it
  // expects gets created in the same run.
  const caveman =
    opts.caveman === "auto"
      ? detected.caveman || selection.skills.includes("caveman")
      : opts.caveman;
  const info = detectProject(root, { caveman, rtk: opts.rtk });
  const vars = buildVars(info);

  const results: WriteResult[] = [];

  // 1. Base docs + dotfiles (CLAUDE.md, AGENTS.md, .editorconfig, .gitignore).
  log.step("base files");
  results.push(...copyTemplateTree("base", root, vars, writeOpts));

  // 2. .claude/ config — settings merged (never clobber user keys), commands copied.
  log.step(".claude config");
  results.push(
    mergeJsonFile(
      join(root, ".claude", "settings.json"),
      readTemplate("claude/settings.json", vars),
      { dryRun: opts.dryRun },
    ),
  );
  results.push(...copyTemplateTree("claude/commands", join(root, ".claude", "commands"), vars, writeOpts));

  // 2b. Project skills, plus the `.agents/skills` alias Zed's agent reads.
  log.step("skills");
  results.push(...copyTemplateTree("claude/skills", join(root, ".claude", "skills"), vars, writeOpts));
  results.push(...installSkills(root, selection.skills, vars, writeOpts));
  reportSkillLink(linkProjectSkills(root, { dryRun: opts.dryRun }));

  // 3. RTK memory + prompt library.
  if (info.rtk) {
    log.step("RTK memory + prompts");
    results.push(...installRtk(root, vars, writeOpts));
  }

  // 4. Caveman scaffolding (opt-in / auto-detected).
  if (info.caveman) {
    log.step("Caveman scaffolding");
    results.push(...installCaveman(root, vars, writeOpts));
  }

  // 5. MCP servers from the catalog, written to .mcp.json.
  if (selection.mcp.length) {
    log.step(`MCP servers (${selection.mcp.length})`);
    for (const { entry } of installMcp(root, selection.mcp, { dryRun: opts.dryRun })) {
      log.info(`  ${actionLabel("created").padEnd(18)} ${entry.id}`);
    }
  }

  log.title("Result");
  printResults(root, results);
  if (selection.mcp.length) reportPrerequisites(selection.mcp);

  log.title("Next");
  log.step("Review CLAUDE.md and .claude/memories/*");
  log.step("Run `claudeset doctor` to verify");
  if (opts.dryRun) log.warn("Dry-run: no files were written.");
}
