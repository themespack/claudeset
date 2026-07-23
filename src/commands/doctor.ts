import { join } from "node:path";
import chalk from "chalk";
import { detectProject } from "../detect/index.js";
import { exists, read } from "../utils/fs.js";
import { checkMemory } from "../memory/index.js";
import { RTK_PROMPT_DIR } from "../memory/rtk.js";
import { CAVEMAN_DIR } from "../memory/caveman.js";
import { listServers } from "../mcp/index.js";
import { listHooks } from "../hooks/index.js";
import { log } from "../utils/log.js";
import type { CheckResult } from "../types.js";

function line(c: CheckResult): void {
  const mark = c.ok ? chalk.green("✔") : chalk.red("✘");
  const detail = c.detail ? chalk.dim(` (${c.detail})`) : "";
  log.info(`  ${mark} ${c.label}${detail}`);
}

function jsonValid(path: string): CheckResult {
  if (!exists(path)) return { label: path, ok: false, detail: "missing" };
  try {
    JSON.parse(read(path));
    return { label: path, ok: true };
  } catch {
    return { label: path, ok: false, detail: "invalid JSON" };
  }
}

/** Returns process exit code: 0 healthy, 1 problems found. */
export function runDoctor(root: string): number {
  const info = detectProject(root);
  log.title("claudeset doctor");
  log.dim(`  ${root}`);

  const groups: Array<[string, CheckResult[]]> = [];

  groups.push([
    "Core",
    [
      { label: "CLAUDE.md", ok: exists(join(root, "CLAUDE.md")) },
      { label: "AGENTS.md", ok: exists(join(root, "AGENTS.md")) },
      {
        ...jsonValid(join(root, ".claude", "settings.json")),
        label: ".claude/settings.json",
      },
    ],
  ]);

  groups.push(["Memory", checkMemory(root)]);

  groups.push([
    "RTK prompts",
    [
      {
        label: RTK_PROMPT_DIR,
        ok: exists(join(root, RTK_PROMPT_DIR)),
        detail: exists(join(root, RTK_PROMPT_DIR)) ? undefined : "missing",
      },
    ],
  ]);

  if (info.caveman) {
    groups.push([
      "Caveman",
      [
        {
          label: CAVEMAN_DIR,
          ok: exists(join(root, CAVEMAN_DIR)),
          detail: exists(join(root, CAVEMAN_DIR)) ? undefined : "missing",
        },
      ],
    ]);
  }

  let failures = 0;
  for (const [title, checks] of groups) {
    log.title(title);
    for (const c of checks) {
      if (!c.ok) failures++;
      line(c);
    }
  }

  // Informational — absence is not a failure.
  const servers = Object.keys(listServers(root));
  const hooks = listHooks(root);
  log.title("Integrations");
  log.info(
    `  MCP servers: ${servers.length ? servers.join(", ") : chalk.dim("none")}`,
  );
  log.info(`  Hooks: ${hooks.length ? String(hooks.length) : chalk.dim("none")}`);

  log.title("Project");
  log.info(
    `  framework: ${info.framework} · pm: ${info.packageManager} · git: ${
      info.hasGit ? "yes" : "no"
    }`,
  );

  log.title("Summary");
  if (failures === 0) {
    log.ok("Healthy");
    return 0;
  }
  log.fail(`${failures} issue(s). Run \`claudeset repair\`.`);
  return 1;
}
