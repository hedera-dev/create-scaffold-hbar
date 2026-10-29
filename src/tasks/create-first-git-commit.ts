import { execa } from "execa";
import { type TaskCommandTask } from "../utils/run-task-command";
import packageJson from "../../package.json";

const createScaffoldHbarVersion = packageJson.version;

/**
 * Stages all files and creates the initial commit (message: create-scaffold-hbar branding).
 * Foundry lib submodules are already in place by now — see installFoundryLibraries — so the
 * single `git add -A` below captures them without any amend.
 *
 * We use --no-gpg-sign so that users with commit signing (e.g. SSH key with passphrase)
 * are not prompted in this non-interactive context; the initial commit stays unsigned.
 */
export async function createFirstGitCommit(targetDir: string, task: TaskCommandTask) {
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
  } catch (e: any) {
    // cast error as ExecaError to get stderr
    throw new Error("Failed to initialize git repository", {
      cause: e?.stderr ?? e?.message ?? e,
    });
  }
}
