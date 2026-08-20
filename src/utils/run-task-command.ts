import { DefaultRenderer, ListrTaskWrapper, SimpleRenderer } from "listr2";
import { execa } from "execa";

export type TaskCommandTask = ListrTaskWrapper<any, typeof DefaultRenderer, typeof SimpleRenderer>;

export interface RunTaskCommandOptions {
  /** Executable to run (e.g. `yarn`, `npx`). */
  file: string;
  /** Arguments passed to the executable. */
  args?: readonly string[];
  cwd: string;
  env?: NodeJS.ProcessEnv;
  /** Initial status shown under the Listr task spinner. */
  initialStatus?: string;
  /**
   * Maps a raw output chunk to a human-readable phase.
   * Return undefined to keep the current status unchanged.
   */
  mapPhase?: (chunk: string) => string | undefined;
  /** Max characters retained in `tail` (and used when trimming internal buffers). Default 1024. */
  tailSize?: number;
  task: TaskCommandTask;
}

export interface TaskCommandResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  /** Bounded recent output suitable for recovery / diagnostic messages. */
  tail: string;
}

/**
 * Runs a subprocess quietly under a Listr task: captures all output, never
 * dumps raw chunks into the renderer, and only updates `task.output` when a
 * recognized phase changes.
 */
export async function runTaskCommand(options: RunTaskCommandOptions): Promise<TaskCommandResult> {
  const { file, args = [], cwd, env, initialStatus, mapPhase, tailSize = 1024, task } = options;

  if (initialStatus) {
    task.output = initialStatus;
  }

  const subprocess = execa(file, [...args], {
    cwd,
    reject: false,
    env,
  });

  let stdout = "";
  let stderr = "";
  let outputBuffer = "";
  let currentPhase = initialStatus;

  const pushChunk = (stream: "stdout" | "stderr", data: Buffer) => {
    const chunk = data.toString();
    if (stream === "stdout") {
      stdout += chunk;
    } else {
      stderr += chunk;
    }

    outputBuffer += chunk;
    if (outputBuffer.length > tailSize) {
      outputBuffer = outputBuffer.slice(-tailSize);
    }

    if (!mapPhase) {
      return;
    }

    const nextPhase = mapPhase(chunk);
    if (nextPhase && nextPhase !== currentPhase) {
      currentPhase = nextPhase;
      task.output = nextPhase;
    }
  };

  subprocess.stdout?.on("data", (data: Buffer) => pushChunk("stdout", data));
  subprocess.stderr?.on("data", (data: Buffer) => pushChunk("stderr", data));

  const result = await subprocess;
  const exitCode = result.exitCode ?? 1;
  const finalStdout = result.stdout || stdout;
  const finalStderr = result.stderr || stderr;
  const combined = [finalStdout, finalStderr].filter(Boolean).join("\n").trim();
  const tail = combined.slice(-tailSize);

  return {
    exitCode,
    stdout: finalStdout,
    stderr: finalStderr,
    tail,
  };
}
