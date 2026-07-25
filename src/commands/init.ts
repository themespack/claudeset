import { join } from "node:path";
import prompts from "prompts";
import { detectProject } from "../detect/index.js";
import { buildVars, copyTemplateTree, readTemplate } from "../template/index.js";
import { mergeJsonFile } from "../merge/index.js";
import { installRtk, installCaveman } from "../memory/index.js";
import { printResults } from "./summary.js";
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

export async function runInit(root: string, opts: InitOptions): Promise<void> {
  const caveman =
    opts.caveman === "auto" ? detectProject(root).caveman : opts.caveman;
  const info = detectProject(root, { caveman, rtk: opts.rtk });
  const vars = buildVars(info);
  const writeOpts = { force: opts.force, dryRun: opts.dryRun };

  log.title("claudeset init");
  log.dim(
    `  project: ${vars.projectName}  ·  framework: ${info.framework}  ·  ${vars.language}` +
      (opts.dryRun ? "  ·  (dry-run)" : ""),
  );

  if (!opts.yes && !opts.dryRun) {
    const { go } = await prompts({
      type: "confirm",
      name: "go",
      message: `Scaffold Claude Code into ./${vars.projectName}?`,
      initial: true,
    });
    if (!go) {
      log.warn("Aborted.");
      return;
    }
  }

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

  log.title("Result");
  printResults(root, results);

  log.title("Next");
  log.step("Review CLAUDE.md and .claude/memories/*");
  log.step("Run `claudeset doctor` to verify");
  if (opts.dryRun) log.warn("Dry-run: no files were written.");
}
