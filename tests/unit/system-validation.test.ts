import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("execa", () => ({
  execa: vi.fn(),
}));

const { execa } = await import("execa");
const { validateFoundry } = await import("../../src/utils/system-validation");

/** `version` may carry a build suffix, e.g. "1.5.1-Homebrew", matching real `forge --version`. */
const forgeVersionOutput = (version: string) =>
  version.includes("-") ? { stdout: `forge Version: ${version}` } : { stdout: `forge Version: ${version}-stable` };

/**
 * Routes mocked execa calls by command so a single test can describe both the
 * forge probes and the installer. `forgeVersions` is consumed one entry per
 * `forge --version` call, so a test can model "absent, then present after install".
 */
function mockExeca(options: { forgeVersions: (string | null)[]; installFails?: boolean }) {
  const versions = [...options.forgeVersions];
  const calls: string[] = [];

  vi.mocked(execa).mockImplementation(((file: string, args?: readonly string[]) => {
    calls.push([file, ...(args ?? [])].join(" "));

    if (file === "forge") {
      const next = versions.shift() ?? null;
      if (next === null) return Promise.reject(new Error("command not found: forge"));
      return Promise.resolve(forgeVersionOutput(next));
    }

    // bash -c "curl ... | bash"  and  ~/.foundry/bin/foundryup
    if (options.installFails) return Promise.reject(new Error("network unreachable"));
    return Promise.resolve({ stdout: "" });
  }) as never);

  return { calls };
}

const ranInstaller = (calls: string[]) => calls.some(c => c.includes("foundry.paradigm.xyz"));
const ranFoundryup = (calls: string[]) => calls.some(c => c.includes("foundryup"));

describe("validateFoundry", () => {
  let logSpy: ReturnType<typeof vi.spyOn>;
  const originalPath = process.env.PATH;
  const originalPlatform = process.platform;

  beforeEach(() => {
    vi.mocked(execa).mockReset();
    logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
    process.env.PATH = originalPath;
    Object.defineProperty(process, "platform", { value: originalPlatform });
  });

  it("passes without installing when forge already meets the minimum", async () => {
    const { calls } = mockExeca({ forgeVersions: ["1.4.3"] });

    await expect(validateFoundry()).resolves.toBeUndefined();
    expect(ranInstaller(calls)).toBe(false);
    expect(ranFoundryup(calls)).toBe(false);
  });

  it("passes without installing on forge >= 1.8.0 (relay EIP-1898 gap is fixed, no pin)", async () => {
    const { calls } = mockExeca({ forgeVersions: ["1.8.1"] });

    await expect(validateFoundry()).resolves.toBeUndefined();
    expect(ranInstaller(calls)).toBe(false);
    // The obsolete warning advised pinning v1.7.1; it must not come back.
    expect(logSpy.mock.calls.flat().join("\n")).not.toContain("1.7.1");
  });

  it("installs Foundry automatically when forge is absent", async () => {
    // absent on PATH, absent in ~/.foundry/bin, present after the install
    const { calls } = mockExeca({ forgeVersions: [null, null, "1.9.0"] });

    await expect(validateFoundry()).resolves.toBeUndefined();
    expect(ranInstaller(calls)).toBe(true);
    expect(ranFoundryup(calls)).toBe(true);
  });

  it("upgrades automatically when forge is below the minimum", async () => {
    const { calls } = mockExeca({ forgeVersions: ["1.3.9", "1.9.0"] });

    await expect(validateFoundry()).resolves.toBeUndefined();
    expect(ranInstaller(calls)).toBe(true);
    expect(ranFoundryup(calls)).toBe(true);
  });

  it("passes without installing when a Homebrew forge already meets the minimum", async () => {
    const { calls } = mockExeca({ forgeVersions: ["1.5.1-Homebrew"] });

    await expect(validateFoundry()).resolves.toBeUndefined();
    expect(ranInstaller(calls)).toBe(false);
  });

  it("defers to brew instead of installing a parallel toolchain when a Homebrew forge is outdated", async () => {
    const { calls } = mockExeca({ forgeVersions: ["1.3.9-Homebrew"] });

    await expect(validateFoundry()).rejects.toThrow(/brew upgrade foundry/);
    expect(ranInstaller(calls)).toBe(false);
    expect(ranFoundryup(calls)).toBe(false);
  });

  it("adds ~/.foundry/bin to PATH so a fresh install is callable", async () => {
    process.env.PATH = "/usr/bin";
    mockExeca({ forgeVersions: [null, null, "1.9.0"] });

    await validateFoundry();

    expect(process.env.PATH).toContain(".foundry");
  });

  it("leaves PATH untouched when forge already resolves, so another forge is not shadowed", async () => {
    // A machine can have both a brew forge (first on PATH) and an older ~/.foundry/bin
    // one; prepending would silently switch which binary every child process uses.
    process.env.PATH = "/opt/homebrew/bin:/usr/bin";
    mockExeca({ forgeVersions: ["1.5.1-Homebrew"] });

    await validateFoundry();

    expect(process.env.PATH).toBe("/opt/homebrew/bin:/usr/bin");
  });

  it("falls back to ~/.foundry/bin when forge is not on PATH but already installed there", async () => {
    process.env.PATH = "/usr/bin";
    const { calls } = mockExeca({ forgeVersions: [null, "1.9.0"] });

    await expect(validateFoundry()).resolves.toBeUndefined();
    expect(process.env.PATH).toContain(".foundry");
    // Already present in ~/.foundry/bin, so nothing should be downloaded.
    expect(ranInstaller(calls)).toBe(false);
  });

  it("throws with manual instructions when the installer fails", async () => {
    mockExeca({ forgeVersions: [null], installFails: true });

    await expect(validateFoundry()).rejects.toThrow(/Automatic Foundry installation failed/);
  });

  it("throws when forge is still unreadable after a reported-successful install", async () => {
    mockExeca({ forgeVersions: [null, null] });

    await expect(validateFoundry()).rejects.toThrow(/could not be read/);
  });

  it("throws with manual instructions instead of auto-installing on Windows", async () => {
    Object.defineProperty(process, "platform", { value: "win32" });
    const { calls } = mockExeca({ forgeVersions: [null] });

    await expect(validateFoundry()).rejects.toThrow(/cannot be auto-installed on Windows/);
    expect(ranInstaller(calls)).toBe(false);
  });
});
