import { EventEmitter } from "events";
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("execa", () => ({
  execa: vi.fn(),
}));

const { execa } = await import("execa");
const { runTaskCommand } = await import("../../src/utils/run-task-command");

type FakeTask = { output?: string };

function createFakeSubprocess(options: {
  exitCode?: number;
  stdoutChunks?: string[];
  stderrChunks?: string[];
  resolvedStdout?: string;
  resolvedStderr?: string;
}) {
  const stdout = new EventEmitter();
  const stderr = new EventEmitter();
  const stdoutChunks = options.stdoutChunks ?? [];
  const stderrChunks = options.stderrChunks ?? [];

  const promise = new Promise<{ exitCode: number; stdout: string; stderr: string }>(resolve => {
    queueMicrotask(() => {
      for (const chunk of stdoutChunks) {
        stdout.emit("data", Buffer.from(chunk));
      }
      for (const chunk of stderrChunks) {
        stderr.emit("data", Buffer.from(chunk));
      }
      resolve({
        exitCode: options.exitCode ?? 0,
        stdout: options.resolvedStdout ?? stdoutChunks.join(""),
        stderr: options.resolvedStderr ?? stderrChunks.join(""),
      });
    });
  });

  return Object.assign(promise, { stdout, stderr });
}

describe("runTaskCommand", () => {
  beforeEach(() => {
    vi.mocked(execa).mockReset();
  });

  it("sets initial status and captures stdout/stderr", async () => {
    const task: FakeTask = {};
    vi.mocked(execa).mockReturnValue(
      createFakeSubprocess({
        stdoutChunks: ["hello "],
        stderrChunks: ["world"],
      }) as never,
    );

    const result = await runTaskCommand({
      file: "yarn",
      args: ["install"],
      cwd: "/tmp/project",
      initialStatus: "Installing packages…",
      task: task as never,
    });

    expect(task.output).toBe("Installing packages…");
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe("hello ");
    expect(result.stderr).toBe("world");
    expect(result.tail).toContain("hello");
    expect(result.tail).toContain("world");
    expect(execa).toHaveBeenCalledWith(
      "yarn",
      ["install"],
      expect.objectContaining({ cwd: "/tmp/project", reject: false }),
    );
  });

  it("updates task.output only when mapPhase returns a new phase", async () => {
    const task: FakeTask = {};
    vi.mocked(execa).mockReturnValue(
      createFakeSubprocess({
        stdoutChunks: ["Resolution step", "still resolving", "Link step"],
      }) as never,
    );

    await runTaskCommand({
      file: "yarn",
      args: ["install"],
      cwd: "/tmp/project",
      initialStatus: "Installing packages…",
      mapPhase: chunk => {
        if (chunk.includes("Resolution")) return "Resolving packages…";
        if (chunk.includes("Link")) return "Linking workspaces…";
        return undefined;
      },
      task: task as never,
    });

    // Capture via a setter so we can assert intermediate updates
    expect(task.output).toBe("Linking workspaces…");
  });

  it("deduplicates identical consecutive phases", async () => {
    const outputs: string[] = [];
    const task = {
      set output(value: string) {
        outputs.push(value);
      },
      get output() {
        return outputs[outputs.length - 1];
      },
    };

    vi.mocked(execa).mockReturnValue(
      createFakeSubprocess({
        stdoutChunks: ["Resolution step", "Resolution step again", "Fetch step"],
      }) as never,
    );

    await runTaskCommand({
      file: "yarn",
      args: ["install"],
      cwd: "/tmp/project",
      initialStatus: "Installing packages…",
      mapPhase: chunk => {
        if (chunk.includes("Resolution")) return "Resolving packages…";
        if (chunk.includes("Fetch")) return "Fetching packages…";
        return undefined;
      },
      task: task as never,
    });

    expect(outputs).toEqual(["Installing packages…", "Resolving packages…", "Fetching packages…"]);
  });

  it("never writes raw chunks to task.output when mapPhase is omitted", async () => {
    const outputs: string[] = [];
    const task = {
      set output(value: string) {
        outputs.push(value);
      },
      get output() {
        return outputs[outputs.length - 1];
      },
    };

    vi.mocked(execa).mockReturnValue(
      createFakeSubprocess({
        stdoutChunks: ["lots of raw yarn spam"],
        stderrChunks: ["and stderr spam"],
      }) as never,
    );

    await runTaskCommand({
      file: "npm",
      args: ["install"],
      cwd: "/tmp/project",
      initialStatus: "Installing packages…",
      task: task as never,
    });

    expect(outputs).toEqual(["Installing packages…"]);
  });

  it("bounds the returned tail", async () => {
    const long = "x".repeat(2000);
    vi.mocked(execa).mockReturnValue(
      createFakeSubprocess({
        stdoutChunks: [long],
      }) as never,
    );

    const result = await runTaskCommand({
      file: "yarn",
      args: ["install"],
      cwd: "/tmp/project",
      tailSize: 100,
      task: {} as never,
    });

    expect(result.tail.length).toBeLessThanOrEqual(100);
    expect(result.stdout.length).toBe(2000);
  });

  it("returns non-zero exit codes without throwing", async () => {
    vi.mocked(execa).mockReturnValue(
      createFakeSubprocess({
        exitCode: 7,
        stderrChunks: ["boom"],
      }) as never,
    );

    const result = await runTaskCommand({
      file: "npx",
      args: ["skills", "add", "spec"],
      cwd: "/tmp/project",
      task: {} as never,
    });

    expect(result.exitCode).toBe(7);
    expect(result.stderr).toBe("boom");
  });

  it("forwards env overrides to execa", async () => {
    vi.mocked(execa).mockReturnValue(createFakeSubprocess({}) as never);

    await runTaskCommand({
      file: "npx",
      args: ["--yes", "skills"],
      cwd: "/tmp/project",
      env: { FORCE_COLOR: "0" },
      task: {} as never,
    });

    expect(execa).toHaveBeenCalledWith(
      "npx",
      ["--yes", "skills"],
      expect.objectContaining({ env: { FORCE_COLOR: "0" } }),
    );
  });
});
