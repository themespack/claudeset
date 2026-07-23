import chalk from "chalk";
import type { WriteAction } from "../types.js";

export const log = {
  info: (msg: string) => console.log(msg),
  title: (msg: string) => console.log("\n" + chalk.bold(msg)),
  dim: (msg: string) => console.log(chalk.dim(msg)),
  ok: (msg: string) => console.log(`${chalk.green("✔")} ${msg}`),
  warn: (msg: string) => console.log(`${chalk.yellow("!")} ${msg}`),
  fail: (msg: string) => console.log(`${chalk.red("✘")} ${msg}`),
  step: (msg: string) => console.log(`  ${chalk.cyan("›")} ${msg}`),
};

const actionColor: Record<WriteAction, (s: string) => string> = {
  created: chalk.green,
  merged: chalk.cyan,
  updated: chalk.blue,
  skipped: chalk.dim,
};

export function actionLabel(action: WriteAction): string {
  return actionColor[action](action);
}
