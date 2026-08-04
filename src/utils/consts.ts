/** Repo (owner/repo) used to fetch available template branches. Branches must match prefix. */
export const TEMPLATE_REPO = "buidler-labs/scaffold-hbar";
/** Branch name prefix for template branches, e.g. "templates/blank-template", "templates/payments-scheduler". */
export const TEMPLATE_BRANCH_PREFIX = "templates/";

/**
 * String constants for the two supported solidity frameworks.
 * Used throughout copy-template and validation logic.
 */
export const SOLIDITY_FRAMEWORKS = {
  HARDHAT: "hardhat",
  FOUNDRY: "foundry",
} as const;

/** Starter template options shown in the interactive select prompt (used when dynamic fetch fails). */
export const TEMPLATES = [
  { value: "blank", label: "Blank Starter", hint: "minimal setup, no example contracts" },
] as const;

/** Fallback when fetching template branches fails (e.g. offline). Same shape as TEMPLATES. */
export const TEMPLATES_FALLBACK = TEMPLATES;

/**
 * Display-name overrides for the template select prompt, keyed by template value
 * (the branch suffix after "templates/"). When a value is present here, this label
 * is shown instead of the auto-derived title-cased branch name.
 */
export const TEMPLATE_LABEL_OVERRIDES: Record<string, string> = {
  "hedera-demo": "Hedera Native",
  "payments-scheduler": "Onchain Cron Job",
  "tokenise-subscriptions": "Tokenize Subscriptions",
  "x402-pay-per-use": "x402 Pay-Per-Use",
};

/**
 * Local fallback capabilities for well-known templates.
 * Used when template manifest metadata can't be fetched.
 */
export const TEMPLATE_CAPABILITIES_FALLBACK: Record<
  string,
  {
    frontend?: Array<"nextjs-app" | "none">;
    solidityFramework?: Array<"foundry" | "hardhat" | "none">;
    packageManager?: Array<"yarn" | "npm" | "none">;
    defaults?: {
      frontend?: "nextjs-app" | "none";
      solidityFramework?: "foundry" | "hardhat" | "none";
      packageManager?: "yarn" | "npm" | "none";
    };
  }
> = {
  blank: {
    frontend: ["nextjs-app"],
    solidityFramework: ["foundry", "hardhat"],
    packageManager: ["yarn", "npm"],
    defaults: { frontend: "nextjs-app", solidityFramework: "foundry" },
  },
  "payments-scheduler": {
    frontend: ["nextjs-app"],
    solidityFramework: ["foundry"],
    packageManager: ["yarn", "npm"],
    defaults: { frontend: "nextjs-app", solidityFramework: "foundry" },
  },
  "hedera-demo": {
    frontend: ["nextjs-app"],
    solidityFramework: ["none"],
    packageManager: ["yarn", "npm"],
    defaults: { frontend: "nextjs-app", solidityFramework: "none" },
  },
  "x402-pay-per-use": {
    frontend: ["nextjs-app"],
    solidityFramework: ["hardhat"],
    packageManager: ["yarn", "npm"],
    defaults: { frontend: "nextjs-app", solidityFramework: "hardhat", packageManager: "yarn" },
  },
};

/** Frontend framework options. */
export const FRONTENDS = [
  { value: "nextjs-app", label: "Next.js (App Router)" },
  { value: "none", label: "None (contracts only)" },
] as const;

/**
 * Solidity framework options for the interactive prompt.
 * Named SOLIDITY_FRAMEWORK_OPTIONS (not SOLIDITY_FRAMEWORKS) to avoid
 * colliding with the existing object constant used by copy-template logic.
 */
export const SOLIDITY_FRAMEWORK_OPTIONS = [
  { value: "foundry", label: "Foundry" },
  { value: "hardhat", label: "Hardhat" },
  { value: "none", label: "None" },
] as const;

/** Target Hedera network options (testnet and mainnet only). */
export const NETWORKS = [
  { value: "testnet", label: "Testnet", hint: "free testnet HBAR at portal.hedera.com" },
  { value: "mainnet", label: "Mainnet" },
] as const;

/** Package manager options. */
export const PACKAGE_MANAGERS = [
  { value: "yarn", label: "Yarn", hint: "recommended" },
  { value: "npm", label: "Npm" },
  { value: "none", label: "Template-managed (skip install)" },
] as const;

/** Hedera brand palette used for terminal output styling. */
export const BRAND_COLORS = {
  hederaTeal: "#0031FF",
  hederaPurple: "#8259EF",
  hederaDark: "#11151D",
  textPrimary: "#FFFFFF",
  textMuted: "#9B9B9D",
  successGreen: "#22C55E",
  errorRed: "#EF4444",
  warningAmber: "#F59E0B",
} as const;

/** GitHub spec passed to `npx skills add` for the Hedera marketplace. */
export const HEDERA_SKILLS_MARKETPLACE_SPEC = "hedera-dev/hedera-skills";

/**
 * Flags appended to `skills add` so install runs without TTY prompts (Listr/stdin is not interactive).
 * `--all` = `--skill '*' --agent '*' -y` per `npx skills --help`.
 */
export const HEDERA_SKILLS_ADD_NONINTERACTIVE_ARGS = ["--all"] as const;

/** Defaults applied when the user passes --yes or --ci to skip all prompts. */
export const DEFAULT_OPTIONS = {
  project: "my-hedera-dapp",
  template: "blank",
  frontend: "nextjs-app",
  network: "testnet",
  packageManager: "yarn" as const, // "yarn" or "npm"
  install: true,
  installHederaSkills: true,
  solidityFramework: "foundry",
} as const;

/**
 * Standardised process exit codes.
 * CI systems rely on these to detect failure modes.
 */
export const EXIT_CODES = {
  SUCCESS: 0,
  GENERIC: 1,
  BAD_ARGS: 2,
  DIR_CONFLICT: 3,
  NETWORK_ERROR: 4,
  INSTALL_FAILED: 5,
  CANCELLED: 130,
} as const;

/**
 * EVM chain IDs and endpoint URLs for each Hedera network.
 * Used when generating hardhat.config.ts in scaffolded projects.
 */
export const HEDERA_NETWORKS = {
  testnet: {
    chainId: 296,
    rpcUrl: "https://testnet.hashio.io/api",
    mirrorUrl: "https://testnet.mirrornode.hedera.com/api/v1",
  },
  mainnet: {
    chainId: 295,
    rpcUrl: "https://mainnet.hashio.io/api",
    mirrorUrl: "https://mainnet-public.mirrornode.hedera.com/api/v1",
  },
} as const;
