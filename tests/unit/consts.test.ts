import { describe, it, expect } from "vitest";
import {
  SOLIDITY_FRAMEWORKS,
  TEMPLATES,
  FRONTENDS,
  SOLIDITY_FRAMEWORK_OPTIONS,
  NETWORKS,
  PACKAGE_MANAGERS,
  BRAND_COLORS,
  DEFAULT_OPTIONS,
  EXIT_CODES,
  HEDERA_NETWORKS,
  HEDERA_SKILLS_ADD_NONINTERACTIVE_ARGS,
} from "../../src/utils/consts";

describe("backward-compatible constants", () => {
  it("SOLIDITY_FRAMEWORKS retains the original object shape", () => {
    expect(SOLIDITY_FRAMEWORKS.HARDHAT).toBe("hardhat");
    expect(SOLIDITY_FRAMEWORKS.FOUNDRY).toBe("foundry");
  });
});

describe("HEDERA_SKILLS_ADD_NONINTERACTIVE_ARGS", () => {
  it("uses --all for non-interactive skills add", () => {
    expect(HEDERA_SKILLS_ADD_NONINTERACTIVE_ARGS).toEqual(["--all"]);
  });
});

describe("HEDERA_NETWORKS", () => {
  it("testnet has chain ID 296", () => {
    expect(HEDERA_NETWORKS.testnet.chainId).toBe(296);
  });

  it("mainnet has chain ID 295", () => {
    expect(HEDERA_NETWORKS.mainnet.chainId).toBe(295);
  });

  it("testnet RPC URL points to Hashio testnet relay", () => {
    expect(HEDERA_NETWORKS.testnet.rpcUrl).toBe("https://testnet.hashio.io/api");
  });

  it("mainnet RPC URL points to Hashio mainnet relay", () => {
    expect(HEDERA_NETWORKS.mainnet.rpcUrl).toBe("https://mainnet.hashio.io/api");
  });
});

describe("EXIT_CODES", () => {
  it("SUCCESS is 0", () => expect(EXIT_CODES.SUCCESS).toBe(0));
  it("GENERIC is 1", () => expect(EXIT_CODES.GENERIC).toBe(1));
  it("BAD_ARGS is 2", () => expect(EXIT_CODES.BAD_ARGS).toBe(2));
  it("DIR_CONFLICT is 3", () => expect(EXIT_CODES.DIR_CONFLICT).toBe(3));
  it("NETWORK_ERROR is 4", () => expect(EXIT_CODES.NETWORK_ERROR).toBe(4));
  it("INSTALL_FAILED is 5", () => expect(EXIT_CODES.INSTALL_FAILED).toBe(5));
  it("CANCELLED is 130 (SIGINT standard)", () => expect(EXIT_CODES.CANCELLED).toBe(130));
  it("all codes are unique", () => {
    const codes = Object.values(EXIT_CODES);
    expect(new Set(codes).size).toBe(codes.length);
  });
});

describe("BRAND_COLORS", () => {
  it("hederaTeal is the correct Hedera brand hex", () => {
    expect(BRAND_COLORS.hederaTeal).toBe("#0031FF");
  });

  it("hederaPurple is the correct Hedera accent hex", () => {
    expect(BRAND_COLORS.hederaPurple).toBe("#8259EF");
  });

  it("all color values start with #", () => {
    for (const color of Object.values(BRAND_COLORS)) {
      expect(color).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });
});

describe("TEMPLATES", () => {
  it("includes the blank starter", () => {
    expect(TEMPLATES.map(t => t.value)).toContain("blank");
  });

  it("lists known starter templates from the registry", () => {
    const values = TEMPLATES.map(t => t.value);
    expect(values).toEqual([
      "blank",
      "bridge",
      "cross-chain-dca",
      "hedera-demo",
      "oracles",
      "payments-scheduler",
      "tokenise-subscriptions",
      "x402-pay-per-use",
    ]);
  });

  it("every template has a non-empty label", () => {
    for (const t of TEMPLATES) {
      expect(t.label.length).toBeGreaterThan(0);
    }
  });

  it("keeps capabilities in sync for every listed template", async () => {
    const { TEMPLATE_REGISTRY, TEMPLATE_CAPABILITIES_FALLBACK } = await import("../../src/utils/template-registry");
    for (const entry of TEMPLATE_REGISTRY) {
      expect(TEMPLATE_CAPABILITIES_FALLBACK[entry.value]).toEqual(entry.capabilities);
    }
    expect(TEMPLATE_CAPABILITIES_FALLBACK["blank-template"]).toEqual(
      TEMPLATE_REGISTRY.find(e => e.value === "blank")?.capabilities,
    );
  });
});

describe("FRONTENDS", () => {
  it("includes nextjs-app and none", () => {
    const values = FRONTENDS.map(f => f.value);
    expect(values).toContain("nextjs-app");
    expect(values).toContain("none");
  });
});

describe("SOLIDITY_FRAMEWORK_OPTIONS", () => {
  it("lists foundry before hardhat", () => {
    expect(SOLIDITY_FRAMEWORK_OPTIONS[0].value).toBe("foundry");
    expect(SOLIDITY_FRAMEWORK_OPTIONS[1].value).toBe("hardhat");
  });

  it("includes a none option", () => {
    expect(SOLIDITY_FRAMEWORK_OPTIONS.map(sf => sf.value)).toContain("none");
  });
});

describe("NETWORKS", () => {
  it("only includes testnet and mainnet", () => {
    expect(NETWORKS.map(n => n.value)).toEqual(["testnet", "mainnet"]);
  });
});

describe("PACKAGE_MANAGERS", () => {
  it("includes yarn and npm", () => {
    const values = PACKAGE_MANAGERS.map(pm => pm.value);
    expect(values).toContain("npm");
    expect(values).toContain("yarn");
  });

  it("defaults to yarn as first option", () => {
    expect(PACKAGE_MANAGERS[0].value).toBe("yarn");
  });
});

describe("DEFAULT_OPTIONS", () => {
  it("defaults to testnet network", () => {
    expect(DEFAULT_OPTIONS.network).toBe("testnet");
  });

  it("defaults to blank template", () => {
    expect(DEFAULT_OPTIONS.template).toBe("blank");
  });

  it("defaults install to true", () => {
    expect(DEFAULT_OPTIONS.install).toBe(true);
  });

  it("defaults installHederaSkills to true", () => {
    expect(DEFAULT_OPTIONS.installHederaSkills).toBe(true);
  });

  it("default project name is my-hedera-dapp", () => {
    expect(DEFAULT_OPTIONS.project).toBe("my-hedera-dapp");
  });

  it("defaults packageManager to yarn", () => {
    expect(DEFAULT_OPTIONS.packageManager).toBe("yarn");
  });
});
