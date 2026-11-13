import type {
  Args,
  SolidityFramework,
  RawOptions,
  SolidityFrameworkChoices,
  Network,
  Frontend,
  PackageManager,
} from "../types";
import { Command } from "commander";
import chalk from "chalk";
import {
  SOLIDITY_FRAMEWORKS,
  DEFAULT_OPTIONS,
  EXIT_CODES,
  FRONTENDS,
  SOLIDITY_FRAMEWORK_OPTIONS,
  NETWORKS,
  PACKAGE_MANAGERS,
} from "./consts";
import { validateNpmName } from "./validate-name";
import packageJson from "../../package.json";

// ─── Valid enum values derived from consts (single source of truth) ───────────
// Extracting .value from each option array means adding a new entry to consts.ts
// automatically makes it valid here — no second edit needed.

const VALID_FRONTENDS = FRONTENDS.map(f => f.value) as readonly Frontend[];
const VALID_SOLIDITY_FRAMEWORKS = SOLIDITY_FRAMEWORK_OPTIONS.map(s => s.value) as readonly (
  | SolidityFramework
  | "none"
)[];
const VALID_NETWORKS = NETWORKS.map(n => n.value) as readonly Network[];
const VALID_LOG_LEVELS = ["error", "warn", "info", "verbose", "debug"] as const;
const VALID_PACKAGE_MANAGERS = PACKAGE_MANAGERS.map(p => p.value) as readonly PackageManager[];

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Prints an error message and exits with BAD_ARGS (exit code 2).
 * Used for invalid flag values caught at parse time.
 */
function exitWithBadArgs(message: string): never {
  console.error(chalk.red(`\nError: ${message}`));
  console.error(chalk.gray(`Run with --help to see available options.\n`));
  process.exit(EXIT_CODES.BAD_ARGS);
}

/**
 * Validates that a flag value belongs to an allowed set.
 * Exits with code 2 if the value is not in the list.
 */
function validateEnum<T extends string>(value: string, allowed: readonly T[], flagName: string): T {
  const lower = value.toLowerCase() as T;
  if (!allowed.includes(lower)) {
    exitWithBadArgs(`"${value}" is not a valid value for --${flagName}. Allowed: ${allowed.join(", ")}`);
  }
  return lower;
}

/**
 * Parses CLI arguments using commander and returns raw (pre-prompt) options.
 */
export function parseArgumentsIntoOptions(rawArgs: Args): {
  rawOptions: RawOptions;
  solidityFrameworkChoices: SolidityFrameworkChoices;
} {
  const program = new Command();

  program
    .name("scaffold-hbar")
    .description("Scaffold a Hedera dApp project")
    .version(packageJson.version, "-v, --version", "Print CLI version and exit")
    .argument("[project-name]", "Name / path of the project directory to create")
    .option("-d, --destination <path>", "Output directory (alternative to positional arg)")
    .option("-t, --template <template>", "Starter template key or GitHub org/repo")
    .option("-f, --frontend <framework>", "Frontend framework (nextjs-app|none)")
    .option("-s, --solidity-framework <fw>", "Solidity framework (foundry|hardhat|none)")
    .option("--network <network>", "Target network (testnet|mainnet)")
    .option("--package-manager <pm>", "Package manager (yarn|npm|none)")
    .option("--skip-install", "Skip dependency installation")
    .option("--install-hedera-skills", "Install Hedera Skills marketplace after scaffold (default with --yes/--ci)")
    .option("--skip-hedera-skills", "Skip Hedera Skills install (overrides default when using --yes/--ci)")
    .option("-y, --yes", "Accept all defaults and skip all prompts")
    .option("--ci", "CI mode: non-interactive, structured log output, no TTY color")
    .option("--log-level <level>", "Log verbosity (error|warn|info|verbose|debug)", "info")
    .helpOption("-h, --help", "Display help text and exit")
    // Prevent commander from calling process.exit on unknown options so we
    // can surface a friendlier BAD_ARGS message ourselves.
    .allowUnknownOption(false)
    .exitOverride();

  try {
    program.parse(rawArgs);
  } catch (err: any) {
    // commander throws CommanderError for --help / --version (exit code 0)
    // and for unknown options (exit code 1). Re-map parse errors to BAD_ARGS.
    if (err?.code === "commander.helpDisplayed" || err?.code === "commander.version") {
      process.exit(EXIT_CODES.SUCCESS);
    }
    exitWithBadArgs(err?.message ?? "Invalid arguments");
  }

  const opts = program.opts();
  const [positionalName] = program.args;

  // ── Resolve project name: destination flag > positional arg ──────────────
  const rawProject: string | null = (opts.destination as string | undefined) ?? positionalName ?? null;

  let project: string | null = rawProject;
  if (project) {
    const validation = validateNpmName(project);
    if (!validation.valid) {
      console.error(chalk.red(`\nCould not create a project called ${chalk.yellow(`"${project}"`)}`));
      validation.problems.forEach((prob: string) => console.error(chalk.red(`  >> ${prob}`)));
      project = null;
    }
  }

  // ── Template: community (org/repo) pass-through, or built-in name (any templates/* branch name) ──
  let template: string | null = null;
  if (opts.template) {
    const raw = (opts.template as string).trim();
    if (raw.includes("/")) {
      template = raw; // community template: org/repo or org/repo#branch
    } else if (raw.length > 0) {
      template = raw; // built-in: resolved to repo#templates/<name> later; no hardcoded list
    } else {
      exitWithBadArgs("Template name cannot be empty.");
    }
  }

  const frontend = opts.frontend ? validateEnum(opts.frontend as string, VALID_FRONTENDS, "frontend") : null;

  const solidityFrameworkRaw = opts.solidityFramework
    ? validateEnum(opts.solidityFramework as string, VALID_SOLIDITY_FRAMEWORKS, "solidity-framework")
    : null;

  const network = opts.network ? validateEnum(opts.network as string, VALID_NETWORKS, "network") : null;

  const packageManager = opts.packageManager
    ? validateEnum(opts.packageManager as string, VALID_PACKAGE_MANAGERS, "package-manager")
    : null;

  const logLevel = validateEnum(opts.logLevel as string, VALID_LOG_LEVELS, "log-level");

  // ── --ci implies --yes ────────────────────────────────────────────────────
  const acceptDefaults = Boolean(opts.yes) || Boolean(opts.ci);

  const wantInstallHederaSkills = Boolean(opts.installHederaSkills);
  const wantSkipHederaSkills = Boolean(opts.skipHederaSkills);
  if (wantInstallHederaSkills && wantSkipHederaSkills) {
    exitWithBadArgs("Cannot use both --install-hedera-skills and --skip-hedera-skills.");
  }

  const installHederaSkills: boolean | undefined = acceptDefaults
    ? wantSkipHederaSkills
      ? false
      : true
    : wantInstallHederaSkills
      ? true
      : wantSkipHederaSkills
        ? false
        : undefined;

  const solidityFrameworkChoices: SolidityFrameworkChoices = [
    SOLIDITY_FRAMEWORKS.HARDHAT,
    SOLIDITY_FRAMEWORKS.FOUNDRY,
    { value: null, name: "none" },
  ];

  const solidityFramework: SolidityFramework | "none" | null = solidityFrameworkRaw;

  // ── Apply --yes / --ci defaults for any still-null fields ─────────────────
  const rawOptions: RawOptions = {
    project: acceptDefaults ? (project ?? DEFAULT_OPTIONS.project) : project,
    install: opts.skipInstall ? false : acceptDefaults ? DEFAULT_OPTIONS.install : true,
    installHederaSkills,
    help: false, // --help is handled by commander before we reach here
    solidityFramework,
    template: acceptDefaults ? (template ?? DEFAULT_OPTIONS.template) : template,
    frontend,
    network: acceptDefaults ? (network ?? DEFAULT_OPTIONS.network) : network,
    // Keep null here so template capabilities can decide the package manager later.
    packageManager: packageManager ?? null,
  };

  if (opts.ci) process.env.HBAR_CI = "1";
  if (acceptDefaults) process.env.HBAR_ACCEPT_DEFAULTS = "1";
  process.env.HBAR_LOG_LEVEL = logLevel;

  return { rawOptions, solidityFrameworkChoices };
}
