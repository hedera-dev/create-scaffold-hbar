import chalk from "chalk";
import { execa } from "execa";
import os from "os";
import path from "path";
import semver from "semver";
import type { PackageManager } from "../types";

const REQUIRED_FOUNDRY_VERSION = "1.4.0";
const REQUIRED_NPM_VERSION = "8.0.0"; // npm workspaces support

/** Where the official installer puts `foundryup`, `forge`, `cast` and `anvil`. */
const FOUNDRY_BIN_DIR = path.join(os.homedir(), ".foundry", "bin");
const FOUNDRY_INSTALLER_URL = "https://foundry.paradigm.xyz";

const MANUAL_FOUNDRY_INSTRUCTIONS = `
 ${chalk.bold.yellow("Install Foundry manually, then re-run this command:")}
 ${chalk.yellow(`  curl -L ${FOUNDRY_INSTALLER_URL} | bash`)}
 ${chalk.yellow("  foundryup")}
 ${chalk.yellow("Checkout: https://getfoundry.sh")}
`;

// Custom error for Foundry validation
class FoundryValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FoundryValidationError";
  }
}

/**
 * Prepends `~/.foundry/bin` to this process's PATH so a Foundry we just installed
 * (or one installed outside the current shell's PATH) is callable by child processes.
 */
function addFoundryBinToPath(): void {
  const current = process.env.PATH ?? "";
  if (current.split(path.delimiter).includes(FOUNDRY_BIN_DIR)) return;
  process.env.PATH = `${FOUNDRY_BIN_DIR}${path.delimiter}${current}`;
}

type ForgeInstall = {
  version: string;
  /** Homebrew builds report e.g. "forge Version: 1.5.1-Homebrew" and are upgraded via brew. */
  isHomebrew: boolean;
};

/** Returns the installed forge build, or null when forge is absent/unparseable. */
async function readForgeInstall(): Promise<ForgeInstall | null> {
  try {
    const { stdout } = await execa("forge", ["--version"]);
    const version = stdout.match(/forge Version: (\d+\.\d+\.\d+)/)?.[1];
    if (!version) return null;
    return { version, isHomebrew: /homebrew/i.test(stdout) };
  } catch {
    return null;
  }
}

/**
 * Installs (or upgrades) Foundry with the official installer, then runs `foundryup`
 * to fetch the latest toolchain. Not supported on Windows, where the installer is
 * a shell script — there we surface manual instructions instead.
 */
async function installFoundry(): Promise<void> {
  if (process.platform === "win32") {
    throw new FoundryValidationError(
      `\n ${chalk.bold.yellow("Foundry was not found and cannot be auto-installed on Windows.")}\n${MANUAL_FOUNDRY_INSTRUCTIONS}`,
    );
  }

  console.log(chalk.cyan(`\n⬇ Foundry not found — installing from ${FOUNDRY_INSTALLER_URL} (this adds ~/.foundry).`));

  try {
    await execa("bash", ["-c", `curl -fsSL ${FOUNDRY_INSTALLER_URL} | bash`], { stdio: "inherit" });
    addFoundryBinToPath();
    await execa(path.join(FOUNDRY_BIN_DIR, "foundryup"), [], { stdio: "inherit" });
  } catch {
    throw new FoundryValidationError(
      `\n ${chalk.bold.yellow("Automatic Foundry installation failed.")}\n${MANUAL_FOUNDRY_INSTRUCTIONS}`,
    );
  }
}

/**
 * Ensures a usable Foundry toolchain is present when the user selected Foundry.
 *
 * Missing or older than {@link REQUIRED_FOUNDRY_VERSION} triggers an automatic
 * install/upgrade via the official installer plus `foundryup`. Latest is installed
 * unpinned: the Hedera JSON-RPC relay accepts EIP-1898 block objects as of relay
 * 0.80.x (hiero-json-rpc-relay#5826), so forge >= 1.8 no longer breaks deploys or
 * fork tests and the previous version pin is obsolete.
 */
export const validateFoundry = async () => {
  let installed = await readForgeInstall();

  // Only reach into ~/.foundry/bin when forge is not resolvable at all, so we never
  // reorder PATH for someone who deliberately has another forge (e.g. brew) first.
  if (installed === null) {
    addFoundryBinToPath();
    installed = await readForgeInstall();
  }

  if (installed !== null && semver.gte(installed.version, REQUIRED_FOUNDRY_VERSION)) {
    return;
  }

  if (installed !== null) {
    // Auto-installing over a brew-managed forge would leave two toolchains installed,
    // with ~/.foundry/bin shadowing the brew one. Let brew own its install.
    if (installed.isHomebrew) {
      throw new FoundryValidationError(
        `\n ${chalk.bold.yellow(`Foundry ${installed.version} (Homebrew) is older than the required ${REQUIRED_FOUNDRY_VERSION}.`)}\n` +
          ` ${chalk.bold.yellow("Upgrade it with the package manager that owns it, then re-run:")}\n` +
          ` ${chalk.yellow("  brew upgrade foundry")}\n`,
      );
    }
    console.log(
      chalk.cyan(
        `\n⬆ Foundry ${installed.version} is older than the required ${REQUIRED_FOUNDRY_VERSION} — upgrading via foundryup.`,
      ),
    );
  }

  await installFoundry();

  const reinstalled = await readForgeInstall();
  if (reinstalled === null) {
    throw new FoundryValidationError(
      `\n ${chalk.bold.yellow("Foundry was installed but `forge --version` could not be read.")}\n${MANUAL_FOUNDRY_INSTRUCTIONS}`,
    );
  }
  if (semver.lt(reinstalled.version, REQUIRED_FOUNDRY_VERSION)) {
    throw new FoundryValidationError(
      `\n ${chalk.bold.yellow("Foundry version is older than required.")}\n` +
        ` ${chalk.bold.yellow(`Current version: ${reinstalled.version}, required: >= ${REQUIRED_FOUNDRY_VERSION}`)}\n${MANUAL_FOUNDRY_INSTRUCTIONS}`,
    );
  }

  console.log(chalk.green(`✔ Foundry ${reinstalled.version} ready.`));
};

/** Node.js + Git checks that every scaffold path needs. */
export const checkCoreSystemRequirements = async (): Promise<{ errors: string[] }> => {
  const errors: string[] = [];

  try {
    const { stdout: nodeVersion } = await execa("node", ["--version"]);
    const cleanNodeVersion = nodeVersion.replace("v", "");
    if (semver.lt(cleanNodeVersion, "20.18.3")) {
      errors.push(`Node.js version must be >= 20.18.3. Current version: ${nodeVersion}`);
    }
  } catch {
    errors.push("Node.js is not installed. Please install Node.js >= 20.18.3");
  }

  try {
    await execa("git", ["--version"]);

    try {
      await execa("git", ["config", "user.name"]);
    } catch {
      errors.push("Git user.name is not configured. Please set it using: git config --global user.name 'Your Name'");
    }

    try {
      await execa("git", ["config", "user.email"]);
    } catch {
      errors.push(
        "Git user.email is not configured. Please set it using: git config --global user.email 'your.email@example.com'",
      );
    }
  } catch {
    errors.push("Git is not installed. Please install Git");
  }

  return { errors };
};

/** Ensures the selected package manager CLI is present and new enough. Omit when `packageManager` is `"none"`. */
export const checkPackageManagerToolchain = async (
  packageManager: Exclude<PackageManager, "none">,
): Promise<{ errors: string[] }> => {
  const errors: string[] = [];

  if (packageManager === "yarn") {
    try {
      const { stdout: yarnVersion } = await execa("yarn", ["--version"]);
      if (semver.lt(yarnVersion, "1.0.0")) {
        errors.push(
          `Yarn version should be >= 1.0.0. Recommended version is >= 2.0.0. Current version: ${yarnVersion}`,
        );
      }
    } catch {
      errors.push("Yarn is not installed. Please install Yarn >= 1.0.0. Recommended version is >= 2.0.0");
    }
  } else {
    try {
      const { stdout: npmVersion } = await execa("npm", ["--version"]);
      if (semver.lt(npmVersion, REQUIRED_NPM_VERSION)) {
        errors.push(
          `npm version must be >= ${REQUIRED_NPM_VERSION} for workspaces support. Current version: ${npmVersion}`,
        );
      }
    } catch {
      errors.push(`npm is not installed. Please install npm >= ${REQUIRED_NPM_VERSION}`);
    }
  }

  return { errors };
};

/** Core + optional Yarn/npm checks. For `"none"`, only core requirements run. */
export const checkSystemRequirements = async (
  packageManager: PackageManager = "yarn",
): Promise<{ errors: string[] }> => {
  const core = await checkCoreSystemRequirements();
  if (packageManager === "none") {
    return core;
  }
  const pm = await checkPackageManagerToolchain(packageManager);
  return { errors: [...core.errors, ...pm.errors] };
};
