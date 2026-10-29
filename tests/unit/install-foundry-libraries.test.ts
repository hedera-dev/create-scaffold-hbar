import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockRunTaskCommand, mockResolveFoundryLibraries, mockStripFoundryGitmodules, mockRm } = vi.hoisted(() => ({
  mockRunTaskCommand: vi.fn(),
  mockResolveFoundryLibraries: vi.fn(),
  mockStripFoundryGitmodules: vi.fn(),
  mockRm: vi.fn(),
}));

vi.mock("../../src/utils/run-task-command", () => ({ runTaskCommand: mockRunTaskCommand }));
vi.mock("../../src/utils/resolve-foundry-libraries", () => ({
  resolveFoundryLibraries: mockResolveFoundryLibraries,
  stripFoundryGitmodules: mockStripFoundryGitmodules,
}));
vi.mock("fs", () => ({ default: { promises: { rm: mockRm } }, promises: { rm: mockRm } }));

const { installFoundryLibraries, mapForgeInstallPhase } = await import("../../src/tasks/install-foundry-libraries");

const task = { output: "" } as never;
const ok = { exitCode: 0, stdout: "", stderr: "", tail: "" };
const fail = (tail: string) => ({ exitCode: 1, stdout: "", stderr: "", tail });

describe("mapForgeInstallPhase", () => {
  it("maps cloning / installing / updating chunks", () => {
    expect(mapForgeInstallPhase("Cloning into '/tmp/lib/forge-std'...")).toBe("Cloning Foundry libraries…");
    expect(mapForgeInstallPhase("Installing forge-std in /tmp/lib/forge-std")).toBe("Installing Foundry libraries…");
    expect(mapForgeInstallPhase("Updating dependencies in /tmp/lib/forge-std")).toBe("Updating Foundry libraries…");
  });

  it("ignores unrelated output", () => {
    expect(mapForgeInstallPhase("Compiling 12 files with Solc")).toBeUndefined();
  });
});

describe("installFoundryLibraries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockResolveFoundryLibraries.mockResolvedValue(["foundry-rs/forge-std@v1.15.0"]);
    mockStripFoundryGitmodules.mockResolvedValue(true);
    mockRm.mockResolvedValue(undefined);
  });

  it("clears lib/ and the .gitmodules entries before installing", async () => {
    mockRunTaskCommand.mockResolvedValue(ok);

    await installFoundryLibraries("/p", task);

    expect(mockRm).toHaveBeenCalledWith(expect.stringContaining("packages/foundry/lib"), {
      recursive: true,
      force: true,
    });
    expect(mockStripFoundryGitmodules).toHaveBeenCalledWith("/p");
    expect(mockRunTaskCommand).toHaveBeenCalledTimes(1);
    const call = mockRunTaskCommand.mock.calls[0][0];
    expect(call.file).toBe("forge");
    expect(call.args).toEqual(["install", "foundry-rs/forge-std@v1.15.0"]);
  });

  it("retries once when it loses the .git/config lock to husky", async () => {
    mockRunTaskCommand
      .mockResolvedValueOnce(fail("error: could not lock config file .git/config: File exists"))
      .mockResolvedValueOnce(ok);

    await expect(installFoundryLibraries("/p", task)).resolves.toBeUndefined();
    expect(mockRunTaskCommand).toHaveBeenCalledTimes(2);
    // A retry re-clones from scratch, so lib/ must be cleared again or forge fails with
    // "already exists and is not a valid git repo".
    expect(mockRm).toHaveBeenCalledTimes(2);
    expect(mockStripFoundryGitmodules).toHaveBeenCalledTimes(2);
  });

  it("throws when the retry also loses the lock", async () => {
    mockRunTaskCommand.mockResolvedValue(fail("could not lock config file .git/config: File exists"));

    await expect(installFoundryLibraries("/p", task)).rejects.toThrow(/forge install failed \(exit code 1\)/);
    expect(mockRunTaskCommand).toHaveBeenCalledTimes(2);
  });

  it("does not retry an ordinary failure, so a bad tag fails fast", async () => {
    mockRunTaskCommand.mockResolvedValue(fail('Error: Tag: "v9.9.9" not found for repo'));

    await expect(installFoundryLibraries("/p", task)).rejects.toThrow(/Tag: "v9.9.9" not found/);
    expect(mockRunTaskCommand).toHaveBeenCalledTimes(1);
  });
});
