import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { EXIT_CODES, DEFAULT_OPTIONS } from "../../src/utils/consts";

// ─── Mock external I/O dependencies ──────────────────────────────────────────
// These must be hoisted before importing the module under test so vitest
// replaces them before the module is evaluated.

vi.mock("execa", () => ({
  execa: vi.fn(),
}));

vi.mock("@clack/prompts", () => ({
  confirm: vi.fn().mockResolvedValue(false),
  cancel: vi.fn(),
  isCancel: vi.fn().mockReturnValue(false),
}));

// Import the module under test AFTER mocks are set up
const { parseArgumentsIntoOptions } = await import("../../src/utils/parse-arguments-into-options");

/** Wraps raw string args the same way process.argv works (node + script prefix). */
const args = (...flags: string[]) => ["node", "scaffold-hbar", ...flags];

/** Captures process.exit calls without actually exiting. */
function mockProcessExit() {
  return vi.spyOn(process, "exit").mockImplementation((code?: number | string | null) => {
    throw new Error(`process.exit(${code})`);
  }) as unknown as ReturnType<typeof vi.spyOn>;
}

describe("parseArgumentsIntoOptions", () => {
  let exitSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    exitSpy = mockProcessExit();
    // Reset env vars that the parser writes
    delete process.env.HBAR_CI;
    delete process.env.HBAR_ACCEPT_DEFAULTS;
    delete process.env.HBAR_LOG_LEVEL;
  });

  afterEach(() => {
    exitSpy.mockRestore();
    vi.clearAllMocks();
  });

  describe("positional project-name", () => {
    it("sets project from positional arg", () => {
      const { rawOptions } = parseArgumentsIntoOptions(args("my-hedera-dapp"));
      expect(rawOptions.project).toBe("my-hedera-dapp");
    });

    it("leaves project null when no positional arg or destination flag", () => {
      const { rawOptions } = parseArgumentsIntoOptions(args());
      expect(rawOptions.project).toBeNull();
    });
  });

  describe("--destination / -d", () => {
    it("sets project from --destination flag", () => {
      const { rawOptions } = parseArgumentsIntoOptions(args("--destination", "my-dapp"));
      expect(rawOptions.project).toBe("my-dapp");
    });

    it("-d short alias works", () => {
      const { rawOptions } = parseArgumentsIntoOptions(args("-d", "short-dapp"));
      expect(rawOptions.project).toBe("short-dapp");
    });

    it("--destination takes precedence over positional arg", () => {
      const { rawOptions } = parseArgumentsIntoOptions(args("positional-name", "--destination", "flag-name"));
      expect(rawOptions.project).toBe("flag-name");
    });
  });

  describe("--template / -t", () => {
    it("sets template to a built-in key", () => {
      const { rawOptions } = parseArgumentsIntoOptions(args("--template", "payments-scheduler"));
      expect(rawOptions.template).toBe("payments-scheduler");
    });

    it("-t short alias works", () => {
      const { rawOptions } = parseArgumentsIntoOptions(args("-t", "hcs-dao"));
      expect(rawOptions.template).toBe("hcs-dao");
    });

    it("passes through community org/repo template without validation", () => {
      const { rawOptions } = parseArgumentsIntoOptions(args("--template", "my-org/my-template"));
      expect(rawOptions.template).toBe("my-org/my-template");
    });

    it("accepts any template name (no hardcoded list validation)", () => {
      const { rawOptions } = parseArgumentsIntoOptions(args("--template", "hedera-nft"));
      expect(rawOptions.template).toBe("hedera-nft");
    });

    it("leaves template null when flag is omitted", () => {
      const { rawOptions } = parseArgumentsIntoOptions(args());
      expect(rawOptions.template).toBeNull();
    });
  });

  describe("--frontend / -f", () => {
    it("accepts nextjs-app", () => {
      const { rawOptions } = parseArgumentsIntoOptions(args("--frontend", "nextjs-app"));
      expect(rawOptions.frontend).toBe("nextjs-app");
    });

    it("accepts none", () => {
      const { rawOptions } = parseArgumentsIntoOptions(args("--frontend", "none"));
      expect(rawOptions.frontend).toBe("none");
    });

    it("exits BAD_ARGS on invalid frontend value", () => {
      expect(() => parseArgumentsIntoOptions(args("--frontend", "react-native"))).toThrow(
        `process.exit(${EXIT_CODES.BAD_ARGS})`,
      );
    });
  });

  describe("--solidity-framework / -s", () => {
    it("accepts foundry", () => {
      const { rawOptions } = parseArgumentsIntoOptions(args("-s", "foundry"));
      expect(rawOptions.solidityFramework).toBe("foundry");
    });

    it("accepts hardhat", () => {
      const { rawOptions } = parseArgumentsIntoOptions(args("-s", "hardhat"));
      expect(rawOptions.solidityFramework).toBe("hardhat");
    });

    it("accepts none", () => {
      const { rawOptions } = parseArgumentsIntoOptions(args("-s", "none"));
      expect(rawOptions.solidityFramework).toBe("none");
    });

    it("exits BAD_ARGS on invalid value", () => {
      expect(() => parseArgumentsIntoOptions(args("--solidity-framework", "truffle"))).toThrow(
        `process.exit(${EXIT_CODES.BAD_ARGS})`,
      );
    });
  });

  describe("--network", () => {
    it("accepts testnet", () => {
      const { rawOptions } = parseArgumentsIntoOptions(args("--network", "testnet"));
      expect(rawOptions.network).toBe("testnet");
    });

    it("accepts mainnet", () => {
      const { rawOptions } = parseArgumentsIntoOptions(args("--network", "mainnet"));
      expect(rawOptions.network).toBe("mainnet");
    });

    it("exits BAD_ARGS on invalid network (e.g. local)", () => {
      expect(() => parseArgumentsIntoOptions(args("--network", "local"))).toThrow(
        `process.exit(${EXIT_CODES.BAD_ARGS})`,
      );
    });

    it("exits BAD_ARGS on unknown network value", () => {
      expect(() => parseArgumentsIntoOptions(args("--network", "ropsten"))).toThrow(
        `process.exit(${EXIT_CODES.BAD_ARGS})`,
      );
    });
  });

  describe("--package-manager", () => {
    it("accepts npm", () => {
      const { rawOptions } = parseArgumentsIntoOptions(args("--package-manager", "npm"));
      expect(rawOptions.packageManager).toBe("npm");
    });

    it("accepts yarn", () => {
      const { rawOptions } = parseArgumentsIntoOptions(args("--package-manager", "yarn"));
      expect(rawOptions.packageManager).toBe("yarn");
    });

    it("accepts none", () => {
      const { rawOptions } = parseArgumentsIntoOptions(args("--package-manager", "none"));
      expect(rawOptions.packageManager).toBe("none");
    });

    it("defaults to null when flag is absent", () => {
      const { rawOptions } = parseArgumentsIntoOptions(args());
      expect(rawOptions.packageManager).toBeNull();
    });

    it("exits BAD_ARGS on unsupported package manager value", () => {
      expect(() => parseArgumentsIntoOptions(args("--package-manager", "pnpm"))).toThrow(
        `process.exit(${EXIT_CODES.BAD_ARGS})`,
      );
    });
  });

  describe("--skip-install", () => {
    it("sets install to false", () => {
      const { rawOptions } = parseArgumentsIntoOptions(args("--skip-install"));
      expect(rawOptions.install).toBe(false);
    });

    it("install defaults to true when flag is absent", () => {
      const { rawOptions } = parseArgumentsIntoOptions(args());
      expect(rawOptions.install).toBe(true);
    });
  });

  describe("--yes / -y", () => {
    it("applies all DEFAULT_OPTIONS when no other flags given", () => {
      const { rawOptions } = parseArgumentsIntoOptions(args("--yes"));
      expect(rawOptions.project).toBe(DEFAULT_OPTIONS.project);
      expect(rawOptions.template).toBe(DEFAULT_OPTIONS.template);
      expect(rawOptions.frontend).toBeNull();
      expect(rawOptions.network).toBe(DEFAULT_OPTIONS.network);
      expect(rawOptions.install).toBe(DEFAULT_OPTIONS.install);
      expect(rawOptions.installHederaSkills).toBe(DEFAULT_OPTIONS.installHederaSkills);
    });

    it("explicit flags win over --yes defaults", () => {
      const { rawOptions } = parseArgumentsIntoOptions(
        args("--yes", "--template", "payments-scheduler", "--network", "mainnet"),
      );
      expect(rawOptions.template).toBe("payments-scheduler");
      expect(rawOptions.network).toBe("mainnet");
    });

    it("-y short alias works", () => {
      const { rawOptions } = parseArgumentsIntoOptions(args("-y"));
      expect(rawOptions.project).toBe(DEFAULT_OPTIONS.project);
    });
  });

  describe("--install-hedera-skills / --skip-hedera-skills", () => {
    it("leaves installHederaSkills undefined when neither flag is passed (interactive)", () => {
      const { rawOptions } = parseArgumentsIntoOptions(args());
      expect(rawOptions.installHederaSkills).toBeUndefined();
    });

    it("sets installHederaSkills true with --install-hedera-skills", () => {
      const { rawOptions } = parseArgumentsIntoOptions(args("--install-hedera-skills"));
      expect(rawOptions.installHederaSkills).toBe(true);
    });

    it("sets installHederaSkills false with --skip-hedera-skills", () => {
      const { rawOptions } = parseArgumentsIntoOptions(args("--skip-hedera-skills"));
      expect(rawOptions.installHederaSkills).toBe(false);
    });

    it("exits BAD_ARGS when both flags are passed", () => {
      expect(() => parseArgumentsIntoOptions(args("--install-hedera-skills", "--skip-hedera-skills"))).toThrow(
        `process.exit(${EXIT_CODES.BAD_ARGS})`,
      );
    });

    it("with --yes, install-hedera-skills remains true (default)", () => {
      const { rawOptions } = parseArgumentsIntoOptions(args("--yes", "--install-hedera-skills"));
      expect(rawOptions.installHederaSkills).toBe(true);
    });

    it("with --yes alone, installHederaSkills defaults to true", () => {
      const { rawOptions } = parseArgumentsIntoOptions(args("--yes", "--skip-install"));
      expect(rawOptions.installHederaSkills).toBe(true);
    });
  });

  describe("--ci", () => {
    it("implies --yes: applies all defaults", () => {
      const { rawOptions } = parseArgumentsIntoOptions(args("--ci"));
      expect(rawOptions.project).toBe(DEFAULT_OPTIONS.project);
      expect(rawOptions.template).toBe(DEFAULT_OPTIONS.template);
      expect(rawOptions.network).toBe(DEFAULT_OPTIONS.network);
      expect(rawOptions.installHederaSkills).toBe(true);
    });

    it("sets HBAR_CI env var to '1'", () => {
      parseArgumentsIntoOptions(args("--ci"));
      expect(process.env.HBAR_CI).toBe("1");
    });

    it("does not set HBAR_CI when --ci is absent", () => {
      parseArgumentsIntoOptions(args());
      expect(process.env.HBAR_CI).toBeUndefined();
    });
  });

  describe("--log-level", () => {
    it("defaults to info", () => {
      parseArgumentsIntoOptions(args());
      expect(process.env.HBAR_LOG_LEVEL).toBe("info");
    });

    it("accepts verbose", () => {
      parseArgumentsIntoOptions(args("--log-level", "verbose"));
      expect(process.env.HBAR_LOG_LEVEL).toBe("verbose");
    });

    it("exits BAD_ARGS on invalid log level", () => {
      expect(() => parseArgumentsIntoOptions(args("--log-level", "trace"))).toThrow(
        `process.exit(${EXIT_CODES.BAD_ARGS})`,
      );
    });
  });

  describe("solidityFrameworkChoices", () => {
    it("returns all three choices when no extension is given", () => {
      const { solidityFrameworkChoices } = parseArgumentsIntoOptions(args());
      expect(solidityFrameworkChoices).toHaveLength(3);
    });
  });
});
