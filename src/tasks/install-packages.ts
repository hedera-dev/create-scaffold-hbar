import { DefaultRenderer, ListrTaskWrapper, SimpleRenderer } from "listr2";
import { execa } from "execa";
import chalk from "chalk";
import type { PackageManager } from "../types";
import { InstallError } from "../utils/errors";
import { runTaskCommand } from "../utils/run-task-command";

const INSTALL_ARGS: Record<Exclude<PackageManager, "none">, string[]> = {
  yarn: ["install"],
  // Use --legacy-peer-deps to handle peer dependency conflicts common in Hedera ecosystem packages
  npm: ["install", "--legacy-peer-deps"],
};

export { InstallError };

const FALLBACK_STATUS = "Installing packages…";

/** Maps Yarn Berry install output to concise Listr status phases. */
export function mapYarnInstallPhase(chunk: string): string | undefined {
  if (/Resolution step|Resolving/i.test(chunk)) {
    return "Resolving packages…";
  }
  if (/Fetch step|Fetching/i.test(chunk)) {
    return "Fetching packages…";
  }
  if (/Link step|Linking/i.test(chunk)) {
    return "Linking workspaces…";
  }
  return undefined;
}

function getBinary(pm: PackageManager): string {
  return pm;
}

/** Returns true if the package manager binary is available on PATH. */
async function isPackageManagerAvailable(pm: PackageManager): Promise<boolean> {
  const binary = getBinary(pm);
  const checkCmd = process.platform === "win32" ? "where" : "which";
  const args = process.platform === "win32" ? [binary] : [binary];
  const { exitCode } = await execa(checkCmd, args, { reject: false });
  return exitCode === 0;
}

function getInstallCommand(pm: PackageManager): string {
  return `${pm} install`;
}

export async function installPackages(
  targetDir: string,
  task: ListrTaskWrapper<any, typeof DefaultRenderer, typeof SimpleRenderer>,
  packageManager: PackageManager,
): Promise<void> {
  if (packageManager === "none") {
    task.output = chalk.yellow("Template-managed package manager selected. Install step skipped.");
    return;
  }

  const available = await isPackageManagerAvailable(packageManager);
  if (!available) {
    const cmd = getInstallCommand(packageManager);
    task.output = chalk.yellow(`${packageManager} not found on PATH. Run manually: ${chalk.bold(cmd)}`);
    return;
  }

  const args = INSTALL_ARGS[packageManager];
  const mapPhase = packageManager === "yarn" ? mapYarnInstallPhase : undefined;

  try {
    const result = await runTaskCommand({
      file: packageManager,
      args,
      cwd: targetDir,
      initialStatus: FALLBACK_STATUS,
      mapPhase,
      task,
    });

    if (result.exitCode !== 0) {
      const output = [result.stdout, result.stderr].filter(Boolean).join("\n").trim();
      throw new InstallError(
        `Dependency installation failed (exit code ${result.exitCode}).`,
        undefined,
        output || undefined,
      );
    }
  } catch (err) {
    if (err instanceof InstallError) throw err;
    const exitCode = err && typeof err === "object" && "exitCode" in err ? (err as { exitCode: number }).exitCode : 1;
    throw new InstallError(`Dependency installation failed (exit code ${exitCode}).`, err);
  }
}
