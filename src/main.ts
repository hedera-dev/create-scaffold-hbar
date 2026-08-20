import {
  copyTemplateFiles,
  createProjectDirectory,
  createFirstGitCommit,
  prettierFormat,
  installPackages,
  installHederaSkillsMarketplace,
} from "./tasks";
import type { Options } from "./types";
import { renderOutroMessage } from "./utils/render-outro-message";
import chalk from "chalk";
import { Listr } from "listr2";
import path from "path";
import { SOLIDITY_FRAMEWORKS } from "./utils/consts";

export async function createProject(options: Options) {
  console.log(`\n`);

  const targetDirectory = path.resolve(process.cwd(), options.project);
  let outroSections: Options["outroSections"];
  let outroInstallCommand: string | undefined;

  const tasks = new Listr(
    [
      {
        title: `📁 Create project directory ${targetDirectory}`,
        task: () => createProjectDirectory(options.project),
      },
      {
        title: `🚀 Creating a new Scaffold-HBAR app in ${chalk.green.bold(options.project)}`,
        task: async () => {
          const { outroSections: sections, outroInstallCommand: installCommand } = await copyTemplateFiles(
            options,
            targetDirectory,
          );
          outroSections = sections;
          outroInstallCommand = installCommand;
        },
      },
      {
        title: `📦 Installing dependencies with ${options.packageManager}`,
        task: (_, task) => installPackages(targetDirectory, task, options.packageManager),
        skip: () => {
          if (options.packageManager === "none") {
            return "Skipped — this template manages dependency installation outside create-scaffold-hbar";
          }
          if (!options.install) {
            return "Manually skipped, since `--skip-install` flag was passed";
          }
          return false;
        },
      },
      {
        title: "📚 Installing Hedera Skills",
        task: (_, task) => installHederaSkillsMarketplace(targetDirectory, task),
        skip: () => (!options.installHederaSkills ? "Skipped — install Hedera Skills was not selected" : false),
      },
      {
        title: "🪄 Formatting files",
        task: () => prettierFormat(targetDirectory, options.packageManager),
        skip: () => {
          if (!options.install) {
            return "Can't use source prettier, since dependency installation was skipped";
          }
          return false;
        },
      },
      {
        title: `📡 Initializing Git repository${options.solidityFramework === SOLIDITY_FRAMEWORKS.FOUNDRY ? " and submodules" : ""}`,
        task: () => createFirstGitCommit(targetDirectory, options),
      },
    ],
    { rendererOptions: { collapseSkips: false, suffixSkips: true } },
  );

  await tasks.run();
  renderOutroMessage(
    outroSections?.length || outroInstallCommand ? { ...options, outroSections, outroInstallCommand } : options,
  );
}
