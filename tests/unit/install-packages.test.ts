import { describe, it, expect, vi, beforeEach } from "vitest";
import { InstallError } from "../../src/utils/errors";

vi.mock("execa", () => ({
  execa: vi.fn(),
}));

vi.mock("../../src/utils/run-task-command", () => ({
  runTaskCommand: vi.fn(),
}));

const { execa } = await import("execa");
const { runTaskCommand } = await import("../../src/utils/run-task-command");
const { installPackages, mapYarnInstallPhase } = await import("../../src/tasks/install-packages");

describe("mapYarnInstallPhase", () => {
  it("maps resolution / fetch / link phases", () => {
    expect(mapYarnInstallPhase("➤ YN0000: ┌ Resolution step")).toBe("Resolving packages…");
    expect(mapYarnInstallPhase("➤ YN0000: ┌ Fetch step")).toBe("Fetching packages…");
    expect(mapYarnInstallPhase("➤ YN0000: ┌ Link step")).toBe("Linking workspaces…");
  });

  it("returns undefined for unrecognized output", () => {
    expect(mapYarnInstallPhase("some unrelated line")).toBeUndefined();
  });
});

describe("installPackages", () => {
  beforeEach(() => {
    vi.mocked(execa).mockReset();
    vi.mocked(runTaskCommand).mockReset();
  });

  it("skips when package manager is none", async () => {
    const task = { output: "" };
    await installPackages("/tmp/app", task as never, "none");
    expect(task.output).toContain("Install step skipped");
    expect(runTaskCommand).not.toHaveBeenCalled();
  });

  it("warns when package manager is missing from PATH", async () => {
    vi.mocked(execa).mockResolvedValue({ exitCode: 1 } as never);
    const task = { output: "" };

    await installPackages("/tmp/app", task as never, "yarn");

    expect(task.output).toContain("yarn not found on PATH");
    expect(runTaskCommand).not.toHaveBeenCalled();
  });

  it("uses yarn phase mapping and succeeds", async () => {
    vi.mocked(execa).mockResolvedValue({ exitCode: 0 } as never);
    vi.mocked(runTaskCommand).mockResolvedValue({
      exitCode: 0,
      stdout: "ok",
      stderr: "",
      tail: "ok",
    });
    const task = { output: "" };

    await installPackages("/tmp/app", task as never, "yarn");

    expect(runTaskCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        file: "yarn",
        args: ["install"],
        cwd: "/tmp/app",
        initialStatus: "Installing packages…",
        mapPhase: mapYarnInstallPhase,
      }),
    );
  });

  it("uses npm fallback status without yarn phase mapping", async () => {
    vi.mocked(execa).mockResolvedValue({ exitCode: 0 } as never);
    vi.mocked(runTaskCommand).mockResolvedValue({
      exitCode: 0,
      stdout: "ok",
      stderr: "",
      tail: "ok",
    });

    await installPackages("/tmp/app", { output: "" } as never, "npm");

    expect(runTaskCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        file: "npm",
        args: ["install", "--legacy-peer-deps"],
        initialStatus: "Installing packages…",
        mapPhase: undefined,
      }),
    );
  });

  it("throws InstallError with full output hint on failure", async () => {
    vi.mocked(execa).mockResolvedValue({ exitCode: 0 } as never);
    vi.mocked(runTaskCommand).mockResolvedValue({
      exitCode: 1,
      stdout: "stdout boom",
      stderr: "stderr boom",
      tail: "boom",
    });

    await expect(installPackages("/tmp/app", { output: "" } as never, "yarn")).rejects.toSatisfy(
      (err: unknown) =>
        err instanceof InstallError && err.message.includes("exit code 1") && err.hint === "stdout boom\nstderr boom",
    );
  });
});
