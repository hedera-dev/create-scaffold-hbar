import type { Frontend, PackageManager, SolidityFramework } from "../types";

/**
 * Built-in starter template registry: labels + prompt capabilities in one place.
 *
 * This is the offline source of truth so interactive scaffolds do not depend on
 * GitHub API quota for known templates. When adding a `templates/<name>` branch:
 * 1. Add/update an entry here (value = branch suffix; use `blank` for blank-template).
 * 2. Mirror capabilities/defaults from that branch's `template.json`.
 * Live GitHub fetch only discovers branches not yet listed here.
 */
export type TemplateRegistryCapabilities = {
  frontend: Frontend[];
  solidityFramework: Array<SolidityFramework | "none">;
  packageManager: PackageManager[];
  defaults: {
    frontend?: Frontend;
    solidityFramework?: SolidityFramework | "none";
    packageManager?: PackageManager;
  };
};

export type TemplateRegistryEntry = {
  /** CLI / prompt value (usually the `templates/` branch suffix). */
  value: string;
  label: string;
  hint?: string;
  capabilities: TemplateRegistryCapabilities;
};

export const TEMPLATE_REGISTRY: readonly TemplateRegistryEntry[] = [
  {
    value: "blank",
    label: "Blank Starter",
    hint: "minimal setup, no example contracts",
    capabilities: {
      frontend: ["nextjs-app"],
      solidityFramework: ["foundry", "hardhat"],
      packageManager: ["yarn", "npm"],
      defaults: { frontend: "nextjs-app", solidityFramework: "foundry", packageManager: "yarn" },
    },
  },
  {
    value: "bridge",
    label: "Bridge",
    hint: "Axelar ITS, Chainlink CCIP, and LayerZero OFT",
    capabilities: {
      frontend: ["nextjs-app"],
      solidityFramework: ["foundry"],
      packageManager: ["yarn", "npm"],
      defaults: { frontend: "nextjs-app", solidityFramework: "foundry" },
    },
  },
  {
    value: "cross-chain-dca",
    label: "Cross-Chain DCA",
    hint: "cross-chain dollar-cost averaging flows",
    capabilities: {
      frontend: ["nextjs-app"],
      solidityFramework: ["hardhat"],
      packageManager: ["yarn", "npm"],
      defaults: { frontend: "nextjs-app", solidityFramework: "hardhat" },
    },
  },
  {
    value: "hedera-demo",
    label: "Hedera Native",
    hint: "native services demo without Solidity workspaces",
    capabilities: {
      frontend: ["nextjs-app"],
      solidityFramework: ["none"],
      packageManager: ["yarn"],
      defaults: { frontend: "nextjs-app", solidityFramework: "none", packageManager: "yarn" },
    },
  },
  {
    value: "oracles",
    label: "Oracles",
    hint: "oracle-backed contract examples",
    capabilities: {
      frontend: ["nextjs-app"],
      solidityFramework: ["foundry"],
      packageManager: ["yarn", "npm"],
      defaults: { frontend: "nextjs-app", solidityFramework: "foundry" },
    },
  },
  {
    value: "payments-scheduler",
    label: "Onchain Cron Job",
    hint: "scheduled on-chain payments",
    capabilities: {
      frontend: ["nextjs-app"],
      solidityFramework: ["foundry"],
      packageManager: ["yarn", "npm"],
      defaults: { frontend: "nextjs-app", solidityFramework: "foundry" },
    },
  },
  {
    value: "tokenise-subscriptions",
    label: "Tokenize Subscriptions",
    hint: "NFT subscription marketplace with HTS",
    capabilities: {
      frontend: ["nextjs-app"],
      solidityFramework: ["hardhat"],
      packageManager: ["yarn", "npm"],
      defaults: { frontend: "nextjs-app", solidityFramework: "hardhat" },
    },
  },
  {
    value: "x402-pay-per-use",
    label: "x402 Pay-Per-Use",
    hint: "pay-per-download marketplace with x402",
    capabilities: {
      frontend: ["nextjs-app"],
      solidityFramework: ["hardhat"],
      packageManager: ["yarn", "npm"],
      defaults: { frontend: "nextjs-app", solidityFramework: "hardhat", packageManager: "yarn" },
    },
  },
] as const;

/** Prompt options derived from {@link TEMPLATE_REGISTRY}. */
export const TEMPLATES = TEMPLATE_REGISTRY.map(({ value, label, hint }) =>
  hint ? { value, label, hint } : { value, label },
);

/** Fallback when live branch discovery fails. Same as {@link TEMPLATES}. */
export const TEMPLATES_FALLBACK = TEMPLATES;

/** Label overrides for live-fetched branch suffixes (including `blank-template`). */
export const TEMPLATE_LABEL_OVERRIDES: Record<string, string> = {
  "blank-template": "Blank Starter",
  ...Object.fromEntries(TEMPLATE_REGISTRY.map(entry => [entry.value, entry.label])),
};

/**
 * Capabilities keyed by template value (and `blank-template` alias).
 * Prefer {@link getRegistryCapabilities} over reading this map directly.
 */
export const TEMPLATE_CAPABILITIES_FALLBACK: Record<string, TemplateRegistryCapabilities> = {
  ...Object.fromEntries(TEMPLATE_REGISTRY.map(entry => [entry.value, entry.capabilities])),
  "blank-template": TEMPLATE_REGISTRY.find(e => e.value === "blank")!.capabilities,
};

export function getRegistryEntry(template: string): TemplateRegistryEntry | undefined {
  if (template === "blank-template") {
    return TEMPLATE_REGISTRY.find(entry => entry.value === "blank");
  }
  return TEMPLATE_REGISTRY.find(entry => entry.value === template);
}

export function getRegistryCapabilities(template: string): TemplateRegistryCapabilities | undefined {
  return getRegistryEntry(template)?.capabilities;
}
