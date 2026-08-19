import type { Options } from "../types";
import chalk from "chalk";
import {
  BRAND_COLORS,
  HEDERA_SKILLS_ADD_NONINTERACTIVE_ARGS,
  HEDERA_SKILLS_MARKETPLACE_SPEC,
  SOLIDITY_FRAMEWORKS,
} from "./consts";

/**
 * Formats a shell command as a terminal "code chip" so it stands out from prose.
 * Uses a dark background + light text with padding (ANSI stripped when colors are off).
 */
export function formatCommandSnippet(command: string): string {
  return chalk.bgHex(BRAND_COLORS.hederaDark).hex(BRAND_COLORS.textPrimary).bold(` ${command} `);
}

/** Expands `{run:script}` placeholders (e.g. `{run:next:start}` → `yarn next:start` or `npm run next:start`). */
export function expandOutroPlaceholders(line: string, run: (script: string) => string): string {
  return line.replace(/\{run:([a-zA-Z0-9:_-]+)\}/g, (_, script: string) => {
    return formatCommandSnippet(run(script));
  });
}

function formatOutroLine(line: string): string {
  if (line.startsWith("+")) {
    return chalk.bold(line.slice(1));
  }
  return line;
}

/** Generates the run command based on package manager.
 * @param hasArgs - When true, suffix with `--` so appended args reach the script (npm and pnpm).
 */
function getRunCommand(packageManager: Options["packageManager"], script: string, hasArgs: boolean = false): string {
  if (packageManager === "npm") {
    // npm requires `--` separator to forward arguments through script chains
    return hasArgs ? `npm run ${script} --` : `npm run ${script}`;
  }
  if (packageManager === "none") {
    // pnpm forwards extra argv after `pnpm run <script> --` (parity with npm)
    return hasArgs ? `pnpm run ${script} --` : `pnpm ${script}`;
  }
  return `yarn ${script}`;
}

/** Generates the install and format command based on package manager. */
function getInstallAndFormatCommand(
  packageManager: Options["packageManager"],
  overrideInstallCommand?: string,
): string {
  if (overrideInstallCommand) {
    return formatCommandSnippet(overrideInstallCommand);
  }
  if (packageManager === "none") {
    return chalk.cyan("See template README for install command");
  }
  if (packageManager === "npm") {
    // Use --legacy-peer-deps to handle peer dependency conflicts in Hedera packages
    return `${formatCommandSnippet("npm install --legacy-peer-deps")} && ${formatCommandSnippet("npm run format")}`;
  }
  return `${formatCommandSnippet("yarn install")} && ${formatCommandSnippet("yarn format")}`;
}

/**
 * Wraps text into lines of maximum width, preserving existing newlines.
 * ANSI escape sequences are ignored for width measurement so chips wrap sanely.
 */
function wrapText(text: string, maxWidth: number = 80): string {
  // Build via fromCharCode so eslint no-control-regex does not flag ESC in a literal.
  const ansiPattern = new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, "g");
  const stripAnsi = (s: string) => s.replace(ansiPattern, "");
  const lines = text.split("\n");
  const result: string[] = [];

  for (const line of lines) {
    if (stripAnsi(line).length <= maxWidth) {
      result.push(line);
      continue;
    }

    const words = line.split(" ");
    let currentLine = "";

    for (const word of words) {
      const candidate = currentLine.length === 0 ? word : `${currentLine} ${word}`;
      if (stripAnsi(candidate).length > maxWidth && currentLine.length > 0) {
        result.push(currentLine.trim());
        currentLine = word;
      } else {
        currentLine = candidate;
      }
    }

    if (currentLine.trim()) {
      result.push(currentLine.trim());
    }
  }

  return result.join("\n");
}

export function renderOutroMessage(options: Options) {
  const run = (script: string) => getRunCommand(options.packageManager, script);
  const installAndFormat = getInstallAndFormatCommand(options.packageManager, options.outroInstallCommand);
  const frameworkPrefix = options.solidityFramework ? `${options.solidityFramework}:` : "";
  const contractScript = (script: string) => `${frameworkPrefix}${script}`;
  const frontendStartScript = "next:start";
  const cmd = formatCommandSnippet;

  let message = `
  ${chalk.bold.green("Congratulations!")} Your project has been scaffolded! 🎉

  ${chalk.bold("Next steps:")}

    ${cmd(`cd ${options.project}`)}
`;

  if (options.solidityFramework === SOLIDITY_FRAMEWORKS.FOUNDRY) {
    message += `
  ${chalk.yellow("Note:")} Foundry (forge, cast, anvil) must be installed. See ${chalk.cyan("https://book.getfoundry.sh")}
`;
  }

  if (!options.install) {
    message += `
  ${chalk.bold("Install dependencies & format files")}
    ${installAndFormat}
`;
  }

  if (!options.installHederaSkills) {
    message += `
  ${chalk.bold("Optional: Hedera agent skills")}
    ${chalk.dim("Add the official marketplace for Cursor / Claude Code (non-interactive):")}
    ${cmd(`npx skills add ${HEDERA_SKILLS_MARKETPLACE_SPEC} ${HEDERA_SKILLS_ADD_NONINTERACTIVE_ARGS.join(" ")}`)}
`;
  }

  const customSteps = options.outroSteps;
  if (customSteps?.length) {
    message += "\n";
    for (const raw of customSteps) {
      const expanded = expandOutroPlaceholders(raw, run);
      const formatted = formatOutroLine(expanded);
      // Wrap long lines and add proper indentation
      const wrapped = wrapText(formatted, 76);
      const indented = wrapped.split("\n").join("\n    ");
      message += `  ${indented}\n`;
    }
  } else if (
    options.solidityFramework === SOLIDITY_FRAMEWORKS.HARDHAT ||
    options.solidityFramework === SOLIDITY_FRAMEWORKS.FOUNDRY
  ) {
    // npm and template "none" (pnpm) require `--` before forwarded script args
    const chainCmd = run(contractScript("chain"));
    const deployCmd = getRunCommand(options.packageManager, contractScript("deploy"), true);
    const testCmd = run(contractScript("test"));
    const accountGenerateCmd = run(contractScript("account:generate"));
    const verifyTestnetCmd = run(contractScript("verify:testnet"));
    const verifyMainnetCmd = run(contractScript("verify:mainnet"));
    message += `
  ${chalk.bold("Run locally:")}
    1. Start the local chain:
       ${cmd(chainCmd)}
    2. In another terminal, deploy to the local node:
       ${cmd(`${deployCmd} --network localhost`)}
    3. ${options.solidityFramework === SOLIDITY_FRAMEWORKS.FOUNDRY ? "Run contract tests:" : "Run contract tests (with the chain running):"}
       ${cmd(testCmd)}
`;
    if (options.frontend !== "none") {
      message += `    4. Start the frontend:
       ${cmd(run(frontendStartScript))}
`;
    }

    const deployTestnet =
      options.solidityFramework === SOLIDITY_FRAMEWORKS.HARDHAT
        ? `${deployCmd} --network hederaTestnet`
        : `${deployCmd} --network hedera_testnet`;
    message += `
  ${chalk.bold("Deploy to Hedera testnet:")}
    Set your deployer key (e.g. ${cmd(accountGenerateCmd)}), then:
       ${cmd(deployTestnet)}
    After deploy, verify on Hashscan (no args needed):
       ${cmd(verifyTestnetCmd)}
    For mainnet:
       ${cmd(verifyMainnetCmd)}
`;
  } else if (options.frontend !== "none") {
    message += `
  ${chalk.bold("Start the frontend")}
    ${cmd(run(frontendStartScript))}
`;
  }

  message += `
  ${chalk.bold.green("Thanks for using Scaffold-HBAR 🙏, Happy Building!")}
`;

  console.log(message);
}
