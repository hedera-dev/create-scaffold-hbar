import path from "path";
import { DefaultRenderer, ListrTaskWrapper, SimpleRenderer } from "listr2";
import chalk from "chalk";
import { HEDERA_SKILLS_ADD_NONINTERACTIVE_ARGS, HEDERA_SKILLS_MARKETPLACE_SPEC } from "../utils/consts";
import { runTaskCommand } from "../utils/run-task-command";

/**
 * Runs `npx skills add` for {@link HEDERA_SKILLS_MARKETPLACE_SPEC} in the project root.
 * Failures are non-fatal: the scaffolded app is still usable without marketplace skills.
 */
export async function installHederaSkillsMarketplace(
  targetDir: string,
  task: ListrTaskWrapper<any, typeof DefaultRenderer, typeof SimpleRenderer>,
): Promise<void> {
  const result = await runTaskCommand({
    file: "npx",
    args: ["--yes", "skills", "add", HEDERA_SKILLS_MARKETPLACE_SPEC, ...HEDERA_SKILLS_ADD_NONINTERACTIVE_ARGS],
    cwd: targetDir,
    // Do not force CI=1: skills uses multiselect when not given -y/--all; keep user's CI if set.
    env: { ...process.env, FORCE_COLOR: "0" },
    initialStatus: "Installing Hedera Skills…",
    task,
  });

  if (result.exitCode !== 0) {
    task.output = chalk.yellow(
      `Hedera Skills install exited with code ${result.exitCode}. You can add them later:\n` +
        `  cd ${path.basename(targetDir)} && npx skills add ${HEDERA_SKILLS_MARKETPLACE_SPEC} ${HEDERA_SKILLS_ADD_NONINTERACTIVE_ARGS.join(" ")}` +
        (result.tail ? `\n${result.tail}` : ""),
    );
  }
}
