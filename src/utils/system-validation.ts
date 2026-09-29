import chalk from "chalk";
import { execa } from "execa";
import semver from "semver";
import type { PackageManager } from "../types";

const REQUIRED_FOUNDRY_VERSION = "1.4.0";
const REQUIRED_NPM_VERSION = "8.0.0"; // npm workspaces support
// forge >= 1.8 sends EIP-1898 block objects that the Hedera JSON-RPC relay rejects on state
// getters, breaking `forge script` deploys and fork tests. Compile and local tests work.
// Remove once https://github.com/hiero-ledger/hiero-json-rpc-relay/issues/5826 is resolved.
const FOUNDRY_EIP1898_RELAY_BREAK_VERSION = "1.8.0";

// Custom error for Foundry validation
class FoundryValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FoundryValidationError";
  }
}

export const validateFoundry = async () => {
  let versionMatch: RegExpMatchArray | null = null;
  // Check if forge is installed
  try {
    const { stdout: forgeVersion } = await execa("forge", ["--version"]);
    // Extract version from output like "forge Version: 1.4.3-stable"
    versionMatch = forgeVersion.match(/forge Version: (\d+\.\d+\.\d+)/);
    if (!versionMatch) {
      throw new Error();
    }
  } catch {
    const message = ` 
    ${chalk.bold.yellow("Could not parse foundry version.")}
    ${chalk.bold.yellow("Please ensure foundry is properly installed")}
    ${chalk.bold.yellow("Checkout: https://getfoundry.sh")}
       `;
    throw new FoundryValidationError(message);
  }

  // Parse and validate version
  try {
    const version = versionMatch[1];
    if (semver.lt(version, REQUIRED_FOUNDRY_VERSION)) {
      const message = `
 ${chalk.bold.yellow("Foundry version is older than required.")}
 ${chalk.bold.yellow(`Current version: ${version}, required: >= ${REQUIRED_FOUNDRY_VERSION}`)}
 ${chalk.bold.yellow("Update via: foundryup (official) or brew upgrade foundry (Homebrew)")}
 ${chalk.bold.yellow("Checkout: https://getfoundry.sh")}
    `;
      throw new FoundryValidationError(message);
    }
    if (semver.gte(version, FOUNDRY_EIP1898_RELAY_BREAK_VERSION)) {
      console.warn(`
 ${chalk.bold.yellow("Warning: forge >= 1.8.0 detected.")}
 ${chalk.yellow("`forge script` deploys and fork tests against the Hedera JSON-RPC relay currently fail")}
 ${chalk.yellow("(relay rejects EIP-1898 block objects). Compiling and local tests are unaffected.")}
 ${chalk.yellow("To deploy or fork-test, pin forge until the relay ships support: foundryup -v v1.7.1")}
 ${chalk.yellow("Details: https://github.com/hiero-ledger/hiero-json-rpc-relay/issues/5826")}
`);
    }
  } catch (error) {
    // Re-throw custom validation errors
    if (error instanceof FoundryValidationError) {
      throw error;
    }
    throw new Error("Unknown error occurred while validating Foundry version");
  }
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
