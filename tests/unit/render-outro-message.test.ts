import { describe, it, expect, vi, afterEach } from "vitest";
import { formatCommandSnippet, formatOutroMessage, renderOutroMessage } from "../../src/utils/render-outro-message";
import type { Options } from "../../src/types";
import {
  HEDERA_SKILLS_ADD_NONINTERACTIVE_ARGS,
  HEDERA_SKILLS_MARKETPLACE_SPEC,
  SOLIDITY_FRAMEWORKS,
} from "../../src/utils/consts";

const ANSI_PATTERN = new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, "g");

function stripAnsi(text: string): string {
  return text.replace(ANSI_PATTERN, "");
}

vi.mock("@clack/prompts", () => ({
  outro: vi.fn(),
}));

const { outro } = await import("@clack/prompts");

function baseOptions(overrides: Partial<Options> = {}): Options {
  return {
    project: "my-app",
    install: true,
    installHederaSkills: false,
    solidityFramework: SOLIDITY_FRAMEWORKS.FOUNDRY,
    template: "blank",
    frontend: "nextjs-app",
    network: "testnet",
    packageManager: "yarn",
    ...overrides,
  };
}

describe("formatCommandSnippet", () => {
  it("keeps the command text readable after ANSI stripping", () => {
    expect(stripAnsi(formatCommandSnippet("yarn next:dev")).trim()).toBe("yarn next:dev");
  });
});

describe("formatOutroMessage", () => {
  it("uses default Foundry sections when outroSections is absent", () => {
    const text = stripAnsi(formatOutroMessage(baseOptions()));
    expect(text).toContain("Run locally");
    expect(text).toContain("Deploy to Hedera testnet");
    expect(text).toContain("Optional: Hedera agent skills");
    expect(text).toContain(
      `npx skills add ${HEDERA_SKILLS_MARKETPLACE_SPEC} ${HEDERA_SKILLS_ADD_NONINTERACTIVE_ARGS.join(" ")}`,
    );
    expect(text).toContain("yarn foundry:chain");
    expect(text).toContain("yarn next:dev");
    expect(text).not.toContain("yarn next:start");
  });

  it("omits Hedera Skills tip when marketplace was installed during scaffold", () => {
    const text = stripAnsi(formatOutroMessage(baseOptions({ installHederaSkills: true })));
    expect(text).not.toContain("Optional: Hedera agent skills");
  });

  it("renders structured template sections with spacing", () => {
    const text = stripAnsi(
      formatOutroMessage(
        baseOptions({
          solidityFramework: null,
          installHederaSkills: true,
          outroSections: [
            {
              title: "Get started",
              steps: [
                { label: "Start the frontend", command: "{run:next:dev}" },
                { label: "Open the faucet", url: "https://portal.hedera.com/faucet" },
              ],
            },
          ],
        }),
      ),
    );
    expect(text).not.toContain("Run locally");
    expect(text).toContain("Get started");
    expect(text).toContain("Start the frontend");
    expect(text).toContain("yarn next:dev");
    expect(text).toContain("https://portal.hedera.com/faucet");
    // Blank line between steps for readability
    expect(text).toMatch(/Start the frontend\n\s+yarn next:dev\s*\n\n\s*Open the faucet/);
  });

  it("expands {run:harness:run} for yarn and npm", () => {
    const yarnText = stripAnsi(
      formatOutroMessage(
        baseOptions({
          solidityFramework: null,
          installHederaSkills: true,
          packageManager: "yarn",
          outroSections: [{ steps: [{ label: "Run harness", command: "{run:harness:run}" }] }],
        }),
      ),
    );
    expect(yarnText).toContain("yarn harness:run");

    const npmText = stripAnsi(
      formatOutroMessage(
        baseOptions({
          solidityFramework: null,
          installHederaSkills: true,
          packageManager: "npm",
          outroSections: [{ steps: [{ label: "Run harness", command: "{run:harness:run}" }] }],
        }),
      ),
    );
    expect(npmText).toContain("npm run harness:run");
    expect(npmText).not.toContain("yarn harness:run");
  });

  it("uses npm commands when npm package manager is selected", () => {
    const text = stripAnsi(formatOutroMessage(baseOptions({ packageManager: "npm" })));
    expect(text).toContain("npm run foundry:chain");
    expect(text).toContain("npm run foundry:deploy -- --network");
    expect(text).not.toContain("yarn foundry:chain");
  });

  it("uses pnpm with run -- when packageManager is none and deploy appends flags", () => {
    const text = stripAnsi(formatOutroMessage(baseOptions({ packageManager: "none" })));
    expect(text).toContain("pnpm foundry:chain");
    expect(text).toContain("pnpm run foundry:deploy -- --network");
    expect(text).not.toContain("yarn foundry:chain");
  });

  it("shows install command chips when install is skipped", () => {
    const text = stripAnsi(formatOutroMessage(baseOptions({ install: false, packageManager: "npm" })));
    expect(text).toContain("npm install --legacy-peer-deps");
    expect(text).toContain("npm run format");
    expect(text).not.toContain("yarn install");
  });

  it("renders the cd step as a command snippet", () => {
    const text = stripAnsi(formatOutroMessage(baseOptions({ installHederaSkills: true })));
    expect(text).toContain("cd my-app");
  });

  it("expands {pm} in structured text", () => {
    const text = stripAnsi(
      formatOutroMessage(
        baseOptions({
          solidityFramework: null,
          installHederaSkills: true,
          packageManager: "npm",
          outroSections: [{ steps: [{ text: "Then run {pm} run lint" }] }],
        }),
      ),
    );
    expect(text).toContain("Then run npm run lint");
  });

  it("expands {run:framework:script} from the scaffold Solidity choice", () => {
    const foundryText = stripAnsi(
      formatOutroMessage(
        baseOptions({
          solidityFramework: SOLIDITY_FRAMEWORKS.FOUNDRY,
          installHederaSkills: true,
          outroSections: [
            {
              steps: [{ label: "Deploy", command: "{run:framework:deploy} --network localhost" }],
            },
          ],
        }),
      ),
    );
    expect(foundryText).toContain("yarn foundry:deploy --network localhost");
    expect(foundryText).not.toContain("{run:framework:");

    const hardhatText = stripAnsi(
      formatOutroMessage(
        baseOptions({
          solidityFramework: SOLIDITY_FRAMEWORKS.HARDHAT,
          installHederaSkills: true,
          packageManager: "npm",
          outroSections: [
            {
              steps: [{ command: "{run:framework:account:generate}" }],
            },
          ],
        }),
      ),
    );
    expect(hardhatText).toContain("npm run hardhat:account:generate");
  });
});

describe("renderOutroMessage", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.mocked(outro).mockClear();
  });

  it("prints the body and calls clack outro for the footer", () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    renderOutroMessage(baseOptions({ installHederaSkills: true }));
    const text = stripAnsi(log.mock.calls.map(c => c.join("")).join("\n"));
    expect(text).toContain("Congratulations!");
    expect(outro).toHaveBeenCalled();
  });
});
