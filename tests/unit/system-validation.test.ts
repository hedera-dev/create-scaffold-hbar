import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("execa", () => ({
  execa: vi.fn(),
}));

const { execa } = await import("execa");
const { validateFoundry } = await import("../../src/utils/system-validation");

const forgeVersionOutput = (version: string) => ({ stdout: `forge Version: ${version}-stable` });

describe("validateFoundry", () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.mocked(execa).mockReset();
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  it("throws when forge is not installed", async () => {
    vi.mocked(execa).mockRejectedValue(new Error("command not found"));

    await expect(validateFoundry()).rejects.toThrow(/Could not parse foundry version/);
  });

  it("throws when forge version is below the minimum", async () => {
    vi.mocked(execa).mockResolvedValue(forgeVersionOutput("1.3.9") as never);

    await expect(validateFoundry()).rejects.toThrow(/older than required/);
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it("passes silently on forge 1.7.x", async () => {
    vi.mocked(execa).mockResolvedValue(forgeVersionOutput("1.7.1") as never);

    await expect(validateFoundry()).resolves.toBeUndefined();
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it("warns without throwing on forge >= 1.8.0", async () => {
    vi.mocked(execa).mockResolvedValue(forgeVersionOutput("1.8.1") as never);

    await expect(validateFoundry()).resolves.toBeUndefined();
    expect(warnSpy).toHaveBeenCalledTimes(1);
    const warning = warnSpy.mock.calls[0][0] as string;
    expect(warning).toContain("foundryup -v v1.7.1");
    expect(warning).toContain("hiero-json-rpc-relay/issues/5826");
  });
});
