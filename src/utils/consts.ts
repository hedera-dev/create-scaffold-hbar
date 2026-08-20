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

export {
  TEMPLATES,
  TEMPLATES_FALLBACK,
  TEMPLATE_LABEL_OVERRIDES,
  TEMPLATE_CAPABILITIES_FALLBACK,
  TEMPLATE_REGISTRY,
  getRegistryCapabilities,
  getRegistryEntry,
} from "./template-registry";
export type { TemplateRegistryCapabilities, TemplateRegistryEntry } from "./template-registry";

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
  /** Muted purple for command chips — readable on dark terminals without neon punch. */
  commandChipBg: "#3F3658",
  commandChipText: "#E4D9FF",
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
