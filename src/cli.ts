import { createProject } from "./main";
import { InstallError } from "./tasks";
import { parseArgumentsIntoOptions } from "./utils/parse-arguments-into-options";
import { promptForMissingOptions } from "./utils/prompt-for-missing-options";
import { renderIntroMessage } from "./utils/render-intro-message";
import type { Args } from "./types";
import chalk from "chalk";
import { SOLIDITY_FRAMEWORKS, EXIT_CODES } from "./utils/consts";
import { validateFoundry, checkCoreSystemRequirements, checkPackageManagerToolchain } from "./utils/system-validation";

function printRequirementsErrors(errors: string[]) {
  console.log(chalk.red("\n❌ create-scaffold-hbar requirements not met:"));
  errors.forEach(error => console.log(chalk.red(`  - ${error}`)));
}

export async function cli(args: Args) {
  try {
    renderIntroMessage();

    const { rawOptions } = parseArgumentsIntoOptions(args);

    let { errors } = await checkCoreSystemRequirements();
    // When `--package-manager` is omitted, PM stays null until template capabilities resolve — do not
    // infer yarn/npm via lockfile detection or we falsely require Yarn for template-managed (`none`) flows.
    const cliPm = rawOptions.packageManager;
    const explicitCliYarnOrNpm = cliPm === "yarn" || cliPm === "npm";
    if (cliPm === "yarn" || cliPm === "npm") {
      errors = [...errors, ...(await checkPackageManagerToolchain(cliPm)).errors];
    }

    if (errors.length > 0) {
      printRequirementsErrors(errors);
      process.exit(EXIT_CODES.GENERIC);
    }

    const options = await promptForMissingOptions(rawOptions);

    if (options.packageManager !== "none") {
      const needPmRecheck = !explicitCliYarnOrNpm || cliPm !== options.packageManager;
      if (needPmRecheck) {
        const { errors: pmErrors } = await checkPackageManagerToolchain(options.packageManager);
        if (pmErrors.length > 0) {
          printRequirementsErrors(pmErrors);
          process.exit(EXIT_CODES.GENERIC);
        }
      }
    }
    // Foundry is a system toolchain, so it is installed on demand. Hardhat needs no
    // equivalent step: it is a workspace devDependency and arrives with the install.
    if (options.solidityFramework === SOLIDITY_FRAMEWORKS.FOUNDRY) {
      await validateFoundry();
    } else if (options.solidityFramework === SOLIDITY_FRAMEWORKS.HARDHAT && options.install) {
      console.log(chalk.dim("\nHardhat ships with the template and is installed with your dependencies."));
    }

    await createProject(options);
  } catch (error: unknown) {
    if (error instanceof InstallError) {
      console.error(chalk.red(`\n${error.message}`));
      process.exit(error.exitCode);
    }
    console.log("%s Error occurred", chalk.red.bold("ERROR"), error);
    console.log("%s Exiting...", chalk.red.bold("Uh oh! Sorry about that!"));
    process.exitCode = EXIT_CODES.GENERIC;
    return;
  }
}
