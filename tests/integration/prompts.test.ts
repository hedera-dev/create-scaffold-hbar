import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { DEFAULT_OPTIONS, EXIT_CODES } from "../../src/utils/consts";
import type { RawOptions } from "../../src/types";
import { ValidationError } from "../../src/utils/errors";
import type { TemplateCapabilities } from "../../src/utils/template-capabilities";

// ─── Mock @clack/prompts ─────────────────────────────────────────────────────
// Track which prompts were actually invoked so we can assert that pre-supplied
// options correctly skip their corresponding prompt.

const mockText = vi.fn();
const mockSelect = vi.fn();
const mockConfirm = vi.fn();
const mockCancel = vi.fn();

vi.mock("@clack/prompts", () => ({
  text: (...args: unknown[]): unknown => mockText(...args),
  select: (...args: unknown[]): unknown => mockSelect(...args),
  confirm: (...args: unknown[]): unknown => mockConfirm(...args),
  cancel: (...args: unknown[]): unknown => mockCancel(...args),
  isCancel: vi.fn().mockReturnValue(false),
  intro: vi.fn(),
  outro: vi.fn(),
  log: { info: vi.fn(), success: vi.fn(), warn: vi.fn(), error: vi.fn(), message: vi.fn(), step: vi.fn() },
}));

const defaultTemplateCapabilities: TemplateCapabilities = {
  frontend: ["nextjs-app", "none"],
  solidityFramework: ["foundry", "hardhat", "none"],
  packageManager: ["yarn", "npm"],
  defaults: { frontend: "nextjs-app", solidityFramework: "foundry", packageManager: DEFAULT_OPTIONS.packageManager },
};

const { mockResolveTemplateCapabilities, mockFetchAvailableTemplates } = vi.hoisted(() => ({
  mockResolveTemplateCapabilities: vi.fn(),
  mockFetchAvailableTemplates: vi.fn(),
}));

vi.mock("../../src/utils/template-capabilities", () => ({
  resolveTemplateCapabilities: mockResolveTemplateCapabilities,
}));

vi.mock("../../src/utils/fetch-available-templates", () => ({
  fetchAvailableTemplates: mockFetchAvailableTemplates,
}));

// ─── Import the function under test AFTER mocks are registered ───────────────
import { promptForMissingOptions } from "../../src/utils/prompt-for-missing-options";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeRawOptions(overrides: Partial<RawOptions> = {}): RawOptions {
  return {
    project: null,
    template: null,
    frontend: null,
    solidityFramework: null,
    network: null,
    packageManager: "yarn",
    install: true,
    help: false,
    ...overrides,
  };
}

describe("promptForMissingOptions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockResolveTemplateCapabilities.mockResolvedValue(defaultTemplateCapabilities);
    mockFetchAvailableTemplates.mockResolvedValue([
      { value: "blank", label: "Blank Starter" },
      { value: "hcs-dao", label: "HCS DAO" },
      { value: "payments-scheduler", label: "Payments Scheduler" },
    ]);
    // Default mock return values simulate user accepting defaults
    mockText.mockResolvedValue(DEFAULT_OPTIONS.project);
    mockSelect.mockImplementation((opts: { initialValue?: unknown }) => Promise.resolve(opts.initialValue));
    mockConfirm.mockResolvedValue(true);
  });

  afterEach(() => {
    delete process.env.HBAR_ACCEPT_DEFAULTS;
    delete process.env.HBAR_CI;
  });

  // ── Skipping prompts when value is pre-supplied ──────────────────────────

  it("skips project prompt when project is pre-supplied", async () => {
    const result = await promptForMissingOptions(makeRawOptions({ project: "my-app" }));
    expect(result.project).toBe("my-app");
    expect(mockText).not.toHaveBeenCalled();
  });

  it("skips template prompt when template is pre-supplied", async () => {
    const result = await promptForMissingOptions(makeRawOptions({ template: "payments-scheduler" }));
    expect(result.template).toBe("payments-scheduler");
  });

  it("skips frontend prompt when frontend is pre-supplied", async () => {
    const result = await promptForMissingOptions(makeRawOptions({ frontend: "nextjs-app" }));
    expect(result.frontend).toBe("nextjs-app");
  });

  it("skips solidityFramework prompt when pre-supplied", async () => {
    const result = await promptForMissingOptions(makeRawOptions({ solidityFramework: "hardhat" }));
    expect(result.solidityFramework).toBe("hardhat");
  });

  it("skips network prompt when network is pre-supplied", async () => {
    const result = await promptForMissingOptions(makeRawOptions({ network: "mainnet" }));
    expect(result.network).toBe("mainnet");
  });

  it("defaults to yarn when CLI package manager is unset and defaults are accepted", async () => {
    process.env.HBAR_ACCEPT_DEFAULTS = "1";
    const result = await promptForMissingOptions(makeRawOptions({ packageManager: null, installHederaSkills: false }));
    expect(result.packageManager).toBe("yarn");
  });

  it("auto-selects packageManager none without a prompt when template only supports none", async () => {
    mockResolveTemplateCapabilities.mockResolvedValue({
      frontend: ["nextjs-app"],
      solidityFramework: ["foundry"],
      packageManager: ["none"],
      defaults: {
        frontend: "nextjs-app",
        solidityFramework: "foundry",
        packageManager: "none",
      },
    });

    const result = await promptForMissingOptions(
      makeRawOptions({
        project: "pnpm-only-app",
        template: "acme/template-managed#branch",
        frontend: "nextjs-app",
        solidityFramework: "foundry",
        network: "testnet",
        packageManager: null,
        installHederaSkills: false,
        install: true,
      }),
    );

    expect(result.packageManager).toBe("none");
    expect(result.install).toBe(false);
    expect(
      mockSelect.mock.calls.some(
        c => typeof c[0] === "object" && (c[0] as { message?: string }).message === "Which package manager?",
      ),
    ).toBe(false);
    expect(
      mockConfirm.mock.calls.some(
        c =>
          typeof c[0] === "object" &&
          (c[0] as { message?: string }).message?.includes("Install dependencies after scaffolding"),
      ),
    ).toBe(false);
  });

  it("rejects a CLI package manager that the template does not support", async () => {
    mockResolveTemplateCapabilities.mockResolvedValue({
      frontend: ["nextjs-app"],
      solidityFramework: ["foundry"],
      packageManager: ["none"],
      defaults: {
        frontend: "nextjs-app",
        solidityFramework: "foundry",
        packageManager: "none",
      },
    });

    const raw = makeRawOptions({
      project: "p",
      template: "acme/template-managed#branch",
      frontend: "nextjs-app",
      solidityFramework: "foundry",
      network: "testnet",
      packageManager: "yarn",
      installHederaSkills: false,
    });

    try {
      await promptForMissingOptions(raw);
      expect.fail("expected promise to reject with ValidationError");
    } catch (e) {
      expect(e).toBeInstanceOf(ValidationError);
      expect((e as Error).message).toMatch(/does not support package manager/);
    }
  });

  it("skips install prompt when install is false (--skip-install)", async () => {
    const result = await promptForMissingOptions(makeRawOptions({ install: false, installHederaSkills: false }));
    expect(result.install).toBe(false);
    expect(mockConfirm).not.toHaveBeenCalled();
  });

  it("prompts for Hedera Skills when installHederaSkills is not preset", async () => {
    mockConfirm.mockResolvedValueOnce(false);
    const result = await promptForMissingOptions(makeRawOptions({ project: "p", template: "blank" }));
    expect(mockConfirm).toHaveBeenCalled();
    const firstConfirm = mockConfirm.mock.calls[0]?.[0] as { message?: string };
    expect(firstConfirm.message).toMatch(/Hedera Skills/i);
    expect(result.installHederaSkills).toBe(false);
  });

  // ── All prompts active (no flags supplied) ───────────────────────────────

  it("invokes interactive prompts when flags are not pre-supplied", async () => {
    await promptForMissingOptions(makeRawOptions());
    expect(mockText).toHaveBeenCalledTimes(1);
    expect(mockSelect).toHaveBeenCalled();
  });

  it("invokes text prompt for project name when not supplied", async () => {
    mockText.mockResolvedValue("user-typed-name");
    const result = await promptForMissingOptions(makeRawOptions());
    expect(mockText).toHaveBeenCalledTimes(1);
    expect(result.project).toBe("user-typed-name");
  });

  it("invokes select for template when not supplied", async () => {
    mockSelect.mockResolvedValue("hcs-dao");
    const result = await promptForMissingOptions(makeRawOptions());
    expect(result.template).toBe("hcs-dao");
  });

  // ── Solidity framework "none" resolves to null ───────────────────────────

  it('maps solidityFramework "none" to null in resolved options', async () => {
    const result = await promptForMissingOptions(makeRawOptions({ solidityFramework: "none" }));
    expect(result.solidityFramework).toBeNull();
  });

  it("keeps solidityFramework value when not none", async () => {
    const result = await promptForMissingOptions(makeRawOptions({ solidityFramework: "foundry" }));
    expect(result.solidityFramework).toBe("foundry");
  });

  // ── Pass-through fields ──────────────────────────────────────────────────

  // ── onCancel exits with 130 ──────────────────────────────────────────────

  it("exits with CANCELLED code when a prompt returns cancel", async () => {
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => {
      throw new Error(`process.exit(${EXIT_CODES.CANCELLED})`);
    });
    const clack = await import("@clack/prompts");
    const isCancelMock = clack.isCancel as unknown as ReturnType<typeof vi.fn>;
    isCancelMock.mockReturnValueOnce(true);
    mockText.mockResolvedValueOnce("__cancel__");

    try {
      await expect(promptForMissingOptions(makeRawOptions())).rejects.toThrow(`process.exit(${EXIT_CODES.CANCELLED})`);
      expect(mockCancel).toHaveBeenCalledWith("Scaffolding cancelled.");
      expect(exitSpy).toHaveBeenCalledWith(EXIT_CODES.CANCELLED);
    } finally {
      isCancelMock.mockReset();
      isCancelMock.mockReturnValue(false);
      exitSpy.mockRestore();
    }
  });

  // ── Full options flow: all flags pre-supplied ────────────────────────────

  it("skips all prompts and returns correct options when fully pre-supplied", async () => {
    const raw = makeRawOptions({
      project: "full-project",
      template: "defi-swap",
      frontend: "nextjs-app",
      solidityFramework: "foundry",
      network: "mainnet",
      packageManager: "yarn",
      install: false,
      installHederaSkills: false,
    });

    const result = await promptForMissingOptions(raw);

    expect(result).toEqual({
      project: "full-project",
      template: "defi-swap",
      frontend: "nextjs-app",
      solidityFramework: "foundry",
      network: "mainnet",
      packageManager: "yarn",
      install: false,
      installHederaSkills: false,
    });

    expect(mockText).not.toHaveBeenCalled();
    expect(mockSelect).not.toHaveBeenCalled();
    expect(mockConfirm).not.toHaveBeenCalled();
  });
});
