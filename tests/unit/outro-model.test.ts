import { describe, it, expect } from "vitest";
import { adaptLegacySteps, expandOutroTokens, resolveOutroSections } from "../../src/utils/outro-model";

describe("adaptLegacySteps", () => {
  it("adapts a tokenise-subscriptions-shaped outro", () => {
    const sections = adaptLegacySteps([
      "This template uses Hardhat and deploys to Hedera testnet/mainnet.",
      "+Set up deployer account:",
      "  {run:hardhat:account:generate}",
      "+Fund your account with testnet HBAR:",
      "  https://portal.hedera.com/faucet",
      "+Deploy contracts:",
      "  {run:hardhat:deploy} --network hederaTestnet",
      "+Create NFT collection:",
      "  cd packages/hardhat && npx ts-node scripts/createCollection.ts",
      "+Start the frontend:",
      "  {run:next:start}",
      "+Further develop this template with our agentic harness: {run:harness:run}",
    ]);

    expect(sections).toHaveLength(1);
    const steps = sections[0].steps;
    expect(steps[0]).toEqual({
      text: "This template uses Hardhat and deploys to Hedera testnet/mainnet.",
    });
    expect(steps).toContainEqual({
      label: "Set up deployer account:",
      command: "{run:hardhat:account:generate}",
    });
    expect(steps).toContainEqual({
      label: "Fund your account with testnet HBAR:",
      url: "https://portal.hedera.com/faucet",
    });
    expect(steps).toContainEqual({
      label: "Deploy contracts:",
      command: "{run:hardhat:deploy} --network hederaTestnet",
    });
    expect(steps).toContainEqual({
      label: "Create NFT collection:",
      command: "cd packages/hardhat && npx ts-node scripts/createCollection.ts",
    });
    expect(steps).toContainEqual({
      label: "Start the frontend:",
      command: "{run:next:start}",
    });
    expect(steps).toContainEqual({
      label: "Further develop this template with our agentic harness",
      command: "{run:harness:run}",
    });
  });

  it("treats numbered inline label:command lines as structured steps", () => {
    const [section] = adaptLegacySteps(["1. Start the frontend: {run:next:dev}", "2. Open docs: https://example.com"]);
    expect(section.steps).toEqual([
      { label: "Start the frontend", command: "{run:next:dev}" },
      { label: "Open docs", url: "https://example.com" },
    ]);
  });
});

describe("resolveOutroSections", () => {
  it("prefers sections when both sections and steps are present", () => {
    const sections = resolveOutroSections({
      sections: [{ title: "Preferred", steps: [{ label: "A", command: "yarn a" }] }],
      steps: ["+Legacy:", "  yarn legacy"],
    });
    expect(sections).toEqual([{ title: "Preferred", steps: [{ label: "A", command: "yarn a" }] }]);
  });

  it("adapts legacy steps when sections are absent", () => {
    const sections = resolveOutroSections({
      steps: ["+Start:", "  {run:next:dev}"],
    });
    expect(sections?.[0].steps).toEqual([{ label: "Start:", command: "{run:next:dev}" }]);
  });
});

describe("expandOutroTokens", () => {
  const run = (script: string) => `yarn ${script}`;

  it("expands {run:script} and {pm}", () => {
    expect(expandOutroTokens("Use {pm} then {run:next:dev}", run, "yarn")).toBe("Use yarn then yarn next:dev");
    expect(expandOutroTokens("{pm} install", run, "none")).toBe("pnpm install");
  });
});
