import fs from "fs";
import path from "path";
import { SOLIDITY_FRAMEWORKS } from "../utils/consts";
import { resolveFoundryLibraries, stripFoundryGitmodules } from "../utils/resolve-foundry-libraries";
import { runTaskCommand, type TaskCommandTask } from "../utils/run-task-command";

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
 * `forge install` adds submodule sections to .git/config, and yarn's husky postinstall
 * writes core.hooksPath to the same file. `git config` takes .git/config.lock with
 * O_EXCL and never retries, so the loser of a collision fails outright.
 */
const GIT_CONFIG_LOCK_RE = /could not lock config file|config\.lock/i;

/**
 * Clones the Foundry lib submodules into packages/foundry/lib.
 *
 * Runs before the initial commit so it can overlap the dependency install: it is
 * network-bound and writes only packages/foundry/lib, .gitmodules and the submodule
 * sections of .git/config, so it never races node_modules/ or .claude/. The commit
 * task afterwards picks the libs up with its single `git add -A`.
 */
export async function installFoundryLibraries(targetDir: string, task: TaskCommandTask): Promise<void> {
  const foundryWorkSpacePath = path.resolve(targetDir, "packages", SOLIDITY_FRAMEWORKS.FOUNDRY);
  const libDir = path.join(foundryWorkSpacePath, "lib");
  const foundryLibraries = await resolveFoundryLibraries(foundryWorkSpacePath);

  const attempt = async () => {
    // The template tarball ships empty lib/ dirs — GitHub tarballs omit submodule
    // contents — plus their .gitmodules entries. Leftover dirs fail with "already
    // exists and is not a valid git repo"; leftover entries fail on forge >= 1.8 when
    // .gitmodules lists a path the index has no gitlink for. Re-running this makes a
    // retry safe after a partial install.
    task.output = "Preparing Foundry libraries…";
    await fs.promises.rm(libDir, { recursive: true, force: true });
    await stripFoundryGitmodules(targetDir);

    return runTaskCommand({
      file: "forge",
      args: ["install", ...foundryLibraries],
      cwd: foundryWorkSpacePath,
      initialStatus: "Installing Foundry libraries…",
      mapPhase: mapForgeInstallPhase,
      task,
    });
  };

  let result = await attempt();
  if (result.exitCode !== 0 && GIT_CONFIG_LOCK_RE.test(result.tail)) {
    result = await attempt();
  }

  if (result.exitCode !== 0) {
    throw new Error(`forge install failed (exit code ${result.exitCode})${result.tail ? `: ${result.tail}` : ""}`);
  }
}
