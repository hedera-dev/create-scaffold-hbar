import * as p from "@clack/prompts";
import type { Options, PackageManager, TemplateOutroSection, TemplateOutroStep } from "../types";
import chalk from "chalk";
import {
  BRAND_COLORS,
  HEDERA_SKILLS_ADD_NONINTERACTIVE_ARGS,
  HEDERA_SKILLS_MARKETPLACE_SPEC,
  SOLIDITY_FRAMEWORKS,
} from "./consts";
import { expandOutroTokens } from "./outro-model";

/**
 * Formats a shell command as a terminal "code chip" so it stands out from prose.
 * Purple background + white text (readable on typical dark terminals).
 */
export function formatCommandSnippet(command: string): string {
  return chalk.bgHex(BRAND_COLORS.hederaPurple).hex(BRAND_COLORS.textPrimary).bold(` ${command} `);
}

function formatSectionTitle(title: string): string {
  return chalk.hex(BRAND_COLORS.hederaTeal).bold(title);
}

function formatStepLabel(label: string): string {
  return chalk.hex(BRAND_COLORS.textPrimary).bold(label);
}

function formatStepText(text: string): string {
  return chalk.hex(BRAND_COLORS.textMuted)(text);
}

/** Generates the run command based on package manager.
 * @param hasArgs - When true, suffix with `--` so appended args reach the script (npm and pnpm).
 */
export function getRunCommand(packageManager: PackageManager, script: string, hasArgs: boolean = false): string {
  if (packageManager === "npm") {
    return hasArgs ? `npm run ${script} --` : `npm run ${script}`;
  }
  if (packageManager === "none") {
    return hasArgs ? `pnpm run ${script} --` : `pnpm ${script}`;
  }
  return `yarn ${script}`;
}

function getInstallAndFormatCommands(packageManager: PackageManager, overrideInstallCommand?: string): string[] {
  if (overrideInstallCommand) {
    return [overrideInstallCommand];
  }
  if (packageManager === "none") {
    return [];
  }
  if (packageManager === "npm") {
    return ["npm install --legacy-peer-deps", "npm run format"];
  }
  return ["yarn install", "yarn format"];
}

function wrapText(text: string, maxWidth: number): string {
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

function terminalWidth(): number {
  return Math.max(40, Math.min(process.stdout.columns ?? 80, 100));
}

function buildDefaultSections(options: Options): TemplateOutroSection[] {
  const run = (script: string) => getRunCommand(options.packageManager, script);
  const frameworkPrefix = options.solidityFramework ? `${options.solidityFramework}:` : "";
  const contractScript = (script: string) => `${frameworkPrefix}${script}`;
  const deployCmd = getRunCommand(options.packageManager, contractScript("deploy"), true);

  if (
    options.solidityFramework === SOLIDITY_FRAMEWORKS.HARDHAT ||
    options.solidityFramework === SOLIDITY_FRAMEWORKS.FOUNDRY
  ) {
    const localSteps: TemplateOutroStep[] = [
      { label: "Start the local chain", command: run(contractScript("chain")) },
      {
        label: "In another terminal, deploy to the local node",
        command: `${deployCmd} --network localhost`,
      },
      {
        label:
          options.solidityFramework === SOLIDITY_FRAMEWORKS.FOUNDRY
            ? "Run contract tests"
            : "Run contract tests (with the chain running)",
        command: run(contractScript("test")),
      },
    ];
    if (options.frontend !== "none") {
      localSteps.push({ label: "Start the frontend", command: run("next:dev") });
    }

    const deployTestnet =
      options.solidityFramework === SOLIDITY_FRAMEWORKS.HARDHAT
        ? `${deployCmd} --network hederaTestnet`
        : `${deployCmd} --network hedera_testnet`;

    return [
      { title: "Run locally", steps: localSteps },
      {
        title: "Deploy to Hedera testnet",
        steps: [
          {
            label: "Set your deployer key",
            command: run(contractScript("account:generate")),
            text: "Then deploy:",
          },
          { command: deployTestnet },
          {
            label: "After deploy, verify on Hashscan (no args needed)",
            command: run(contractScript("verify:testnet")),
          },
          { label: "For mainnet", command: run(contractScript("verify:mainnet")) },
        ],
      },
    ];
  }

  if (options.frontend !== "none") {
    return [
      {
        title: "Start the frontend",
        steps: [{ command: run("next:dev") }],
      },
    ];
  }

  return [];
}

function formatStep(
  step: TemplateOutroStep,
  options: Options,
  run: (script: string) => string,
  width: number,
): string[] {
  const lines: string[] = [];
  if (step.label) {
    lines.push(formatStepLabel(expandOutroTokens(step.label, run, options.packageManager, options.solidityFramework)));
  }
  if (step.command) {
    const command = expandOutroTokens(step.command, run, options.packageManager, options.solidityFramework);
    lines.push(`  ${formatCommandSnippet(command)}`);
  }
  if (step.url) {
    const url = expandOutroTokens(step.url, run, options.packageManager, options.solidityFramework);
    lines.push(`  ${chalk.cyan.underline(url)}`);
  }
  if (step.text) {
    const text = expandOutroTokens(step.text, run, options.packageManager, options.solidityFramework);
    const wrapped = wrapText(text, width - 2);
    for (const wrappedLine of wrapped.split("\n")) {
      lines.push(`  ${formatStepText(wrappedLine)}`);
    }
  }
  return lines;
}

/**
 * Builds the full outro text (without the clack footer). Exported for unit tests.
 */
export function formatOutroMessage(options: Options): string {
  const run = (script: string) => getRunCommand(options.packageManager, script);
  const width = terminalWidth();
  const blocks: string[] = [];

  blocks.push(`${chalk.hex(BRAND_COLORS.successGreen).bold("Congratulations!")} Your project has been scaffolded! 🎉`);
  blocks.push("");
  blocks.push(formatSectionTitle("Next steps"));
  blocks.push(`  ${formatCommandSnippet(`cd ${options.project}`)}`);

  if (options.solidityFramework === SOLIDITY_FRAMEWORKS.FOUNDRY) {
    blocks.push("");
    blocks.push(
      `${chalk.hex(BRAND_COLORS.warningAmber).bold("Note:")} Foundry (forge, cast, anvil) must be installed. See ${chalk.cyan.underline("https://book.getfoundry.sh")}`,
    );
  }

  if (!options.install) {
    blocks.push("");
    blocks.push(formatSectionTitle("Install dependencies & format files"));
    const installCommands = getInstallAndFormatCommands(options.packageManager, options.outroInstallCommand);
    if (installCommands.length === 0) {
      blocks.push(`  ${formatStepText("See template README for install command")}`);
    } else {
      for (const command of installCommands) {
        blocks.push(`  ${formatCommandSnippet(command)}`);
      }
    }
  }

  if (!options.installHederaSkills) {
    blocks.push("");
    blocks.push(formatSectionTitle("Optional: Hedera agent skills"));
    blocks.push(`  ${formatStepText("Add the official marketplace for Cursor / Claude Code (non-interactive):")}`);
    blocks.push(
      `  ${formatCommandSnippet(`npx skills add ${HEDERA_SKILLS_MARKETPLACE_SPEC} ${HEDERA_SKILLS_ADD_NONINTERACTIVE_ARGS.join(" ")}`)}`,
    );
  }

  const sections = options.outroSections?.length ? options.outroSections : buildDefaultSections(options);

  for (const section of sections) {
    blocks.push("");
    if (section.title) {
      blocks.push(formatSectionTitle(section.title));
    }
    for (let i = 0; i < section.steps.length; i++) {
      const stepLines = formatStep(section.steps[i], options, run, width);
      blocks.push(...stepLines);
      if (i < section.steps.length - 1) {
        blocks.push("");
      }
    }
  }

  return blocks.join("\n");
}

export function renderOutroMessage(options: Options) {
  const body = formatOutroMessage(options);
  console.log(`\n${body}\n`);
  p.outro(chalk.hex(BRAND_COLORS.successGreen).bold("Thanks for using Scaffold-HBAR — happy building!"));
}
