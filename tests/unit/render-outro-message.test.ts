import { describe, it, expect, vi, afterEach } from "vitest";
import { expandOutroPlaceholders, renderOutroMessage } from "../../src/utils/render-outro-message";
import type { Options } from "../../src/types";
import {
  HEDERA_SKILLS_ADD_NONINTERACTIVE_ARGS,
  HEDERA_SKILLS_MARKETPLACE_SPEC,
  SOLIDITY_FRAMEWORKS,
} from "../../src/utils/consts";

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

describe("expandOutroPlaceholders", () => {
  const run = (s: string) => `yarn ${s}`;

  it("replaces {run:script} tokens", () => {
    expect(expandOutroPlaceholders("Run {run:next:start} now", run)).toBe("Run yarn next:start now");
  });

  it("supports multiple placeholders", () => {
    expect(expandOutroPlaceholders("{run:hardhat:chain} then {run:hardhat:deploy}", run)).toBe(
      "yarn hardhat:chain then yarn hardhat:deploy",
    );
  });
});

describe("renderOutroMessage", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("uses default Foundry outro when outroSteps is absent", () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    renderOutroMessage(baseOptions());
    const text = log.mock.calls.map(c => c.join("")).join("\n");
    expect(text).toContain("Run locally:");
    expect(text).toContain("Deploy to Hedera testnet:");
    expect(text).toContain("Optional: Hedera agent skills");
    expect(text).toContain(
      `npx skills add ${HEDERA_SKILLS_MARKETPLACE_SPEC} ${HEDERA_SKILLS_ADD_NONINTERACTIVE_ARGS.join(" ")}`,
    );
  });

  it("omits Hedera Skills tip when marketplace was installed during scaffold", () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    renderOutroMessage(baseOptions({ installHederaSkills: true }));
    const text = log.mock.calls.map(c => c.join("")).join("\n");
    expect(text).not.toContain("Optional: Hedera agent skills");
  });

  it("renders template outro steps instead of default body", () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    renderOutroMessage(
      baseOptions({
        outroSteps: ["+Start the frontend: {run:next:start}"],
        solidityFramework: null,
      }),
    );
    const text = log.mock.calls.map(c => c.join("")).join("\n");
    expect(text).not.toContain("Run locally:");
    expect(text).toContain("yarn next:start");
    expect(text).toContain("Congratulations!");
    expect(text).toContain("Thanks for using Scaffold-HBAR");
  });

  it("expands {run:harness:extend} for yarn and npm outro steps", () => {
    const yarnLog = vi.spyOn(console, "log").mockImplementation(() => {});
    renderOutroMessage(
      baseOptions({
        outroSteps: ["+Extend with the harness: {run:harness:extend}"],
        solidityFramework: null,
        packageManager: "yarn",
      }),
    );
    expect(yarnLog.mock.calls.map(c => c.join("")).join("\n")).toContain("yarn harness:extend");
    yarnLog.mockRestore();

    const npmLog = vi.spyOn(console, "log").mockImplementation(() => {});
    renderOutroMessage(
      baseOptions({
        outroSteps: ["+Extend with the harness: {run:harness:extend}"],
        solidityFramework: null,
        packageManager: "npm",
      }),
    );
    const npmText = npmLog.mock.calls.map(c => c.join("")).join("\n");
    expect(npmText).toContain("npm run harness:extend");
    expect(npmText).not.toContain("yarn harness:extend");
  });

  it("uses npm commands when npm package manager is selected", () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    renderOutroMessage(baseOptions({ packageManager: "npm" }));
    const text = log.mock.calls.map(c => c.join("")).join("\n");
    expect(text).toContain("npm run foundry:chain");
    expect(text).toContain("npm run foundry:deploy -- --network"); // Should have -- separator for args
    expect(text).not.toContain("yarn foundry:chain");
  });

  it("uses pnpm with run -- when packageManager is none and deploy appends flags", () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    renderOutroMessage(baseOptions({ packageManager: "none" }));
    const text = log.mock.calls.map(c => c.join("")).join("\n");
    expect(text).toContain("pnpm foundry:chain");
    expect(text).toContain("pnpm run foundry:deploy -- --network");
    expect(text).not.toContain("yarn foundry:chain");
  });

  it("shows npm install instructions when install is skipped", () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    renderOutroMessage(baseOptions({ install: false, packageManager: "npm" }));
    const text = log.mock.calls.map(c => c.join("")).join("\n");
    expect(text).toContain("npm install --legacy-peer-deps && npm run format");
    expect(text).not.toContain("yarn install");
  });
});
