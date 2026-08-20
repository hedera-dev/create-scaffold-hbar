import { execa } from "execa";
import { Options } from "../types";
import path from "path";
import fs from "fs";
import { SOLIDITY_FRAMEWORKS } from "../utils/consts";
import { resolveFoundryLibraries } from "../utils/resolve-foundry-libraries";
import { runTaskCommand, type TaskCommandTask } from "../utils/run-task-command";
import packageJson from "../../package.json";

const createScaffoldHbarVersion = packageJson.version;

/** Maps `forge install` output to concise Listr status phases. */
export function mapForgeInstallPhase(chunk: string): string | undefined {
  if (/Cloning into/i.test(chunk)) {
    return "Cloning Foundry libraries…";
  }
  if (/Updating dependencies|Submodule/i.test(chunk)) {
    return "Updating Foundry libraries…";
  }
  if (/Installing\s+\S+/i.test(chunk)) {
    return "Installing Foundry libraries…";
  }
  return undefined;
}

/**
 * Stages all files, creates the initial commit (message: create-scaffold-hbar branding),
 * and when Foundry is selected runs forge install and amends the commit with lib submodules.
 *
 * We use --no-gpg-sign so that users with commit signing (e.g. SSH key with passphrase)
 * are not prompted in this non-interactive context; the initial commit stays unsigned.
 */
export async function createFirstGitCommit(targetDir: string, options: Options, task: TaskCommandTask) {
  try {
    task.output = "Creating initial commit…";
    await execa("git", ["add", "-A"], { cwd: targetDir });
    await execa(
      "git",
      [
        "commit",
        "-m",
        `Initial commit with create-scaffold-hbar @ ${createScaffoldHbarVersion}`,
        "--no-verify",
        "--no-gpg-sign",
      ],
      { cwd: targetDir },
    );

    if (options.solidityFramework === SOLIDITY_FRAMEWORKS.FOUNDRY) {
      const foundryWorkSpacePath = path.resolve(targetDir, "packages", SOLIDITY_FRAMEWORKS.FOUNDRY);
      const libDir = path.join(foundryWorkSpacePath, "lib");
      const foundryLibraries = await resolveFoundryLibraries(foundryWorkSpacePath);

      // Remove any pre-existing lib directories copied from the template so that
      // `forge install` (which adds git submodules) doesn't fail with
      // "already exists and is not a valid git repo".
      if (fs.existsSync(libDir)) {
        task.output = "Preparing Foundry libraries…";
        await fs.promises.rm(libDir, { recursive: true, force: true });
        // Stage the removal so the initial commit doesn't reference the old files
        await execa("git", ["add", "-A"], { cwd: targetDir });
        await execa("git", ["commit", "--amend", "--no-edit", "--no-verify", "--no-gpg-sign"], { cwd: targetDir });
      }

      const forgeResult = await runTaskCommand({
        file: "forge",
        args: ["install", ...foundryLibraries],
        cwd: foundryWorkSpacePath,
        initialStatus: "Installing Foundry libraries…",
        mapPhase: mapForgeInstallPhase,
        task,
      });
      if (forgeResult.exitCode !== 0) {
        throw new Error(
          `forge install failed (exit code ${forgeResult.exitCode})${forgeResult.tail ? `: ${forgeResult.tail}` : ""}`,
        );
      }

      task.output = "Amending commit with Foundry libraries…";
      await execa("git", ["add", "-A"], { cwd: targetDir });
      await execa("git", ["commit", "--amend", "--no-edit", "--no-gpg-sign"], { cwd: targetDir });
    }
  } catch (e: any) {
    // cast error as ExecaError to get stderr
    throw new Error("Failed to initialize git repository", {
      cause: e?.stderr ?? e?.message ?? e,
    });
  }
}
