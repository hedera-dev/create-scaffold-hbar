import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import os from "os";
import { applyRenameMap } from "../../src/tasks/apply-rename-map";
import { generateEnvExample } from "../../src/tasks/generate-env-example";
import { TemplateManifestSchema } from "../../src/types";

const fixtureManifest = {
  name: "payments-scheduler",
  description: "NFT Collection template",
  version: "1.0.0",
  "scaffold-hbar": {
    rename: {
      HtsNftTemplate: {
        to: "{{projectName}}",
        paths: ["contracts", "frontend/src"],
      },
    },
    envVars: [
      { key: "HEDERA_ACCOUNT_ID", description: "Your Hedera account ID (0.0.XXXXX)" },
      { key: "HEDERA_PRIVATE_KEY", description: "Your ECDSA or ED25519 private key" },
    ],
  },
};

describe("applyRenameMap", () => {
  it("replaces placeholder in files under specified paths", () => {
    const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), "apply-rename-"));
    try {
      const contractsDir = path.join(projectDir, "contracts");
      fs.mkdirSync(contractsDir, { recursive: true });
      fs.writeFileSync(path.join(contractsDir, "Greeter.ts"), "export const name = HtsNftTemplate;", "utf8");

      applyRenameMap(projectDir, { HtsNftTemplate: { to: "{{projectName}}", paths: ["contracts"] } }, "my-dapp");

      const content = fs.readFileSync(path.join(contractsDir, "Greeter.ts"), "utf8");
      expect(content).toBe("export const name = my-dapp;");
    } finally {
      fs.rmSync(projectDir, { recursive: true, force: true });
    }
  });

  it("leaves files outside specified paths untouched", () => {
    const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), "apply-rename-"));
    try {
      fs.mkdirSync(path.join(projectDir, "contracts"), { recursive: true });
      fs.mkdirSync(path.join(projectDir, "other"), { recursive: true });
      fs.writeFileSync(path.join(projectDir, "contracts", "A.ts"), "HtsNftTemplate", "utf8");
      fs.writeFileSync(path.join(projectDir, "other", "B.txt"), "HtsNftTemplate", "utf8");

      applyRenameMap(projectDir, { HtsNftTemplate: { to: "{{projectName}}", paths: ["contracts"] } }, "replaced");

      expect(fs.readFileSync(path.join(projectDir, "contracts", "A.ts"), "utf8")).toBe("replaced");
      expect(fs.readFileSync(path.join(projectDir, "other", "B.txt"), "utf8")).toBe("HtsNftTemplate");
    } finally {
      fs.rmSync(projectDir, { recursive: true, force: true });
    }
  });

  it("replaces multiple occurrences and resolves {{projectName}}", () => {
    const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), "apply-rename-"));
    try {
      fs.mkdirSync(path.join(projectDir, "src"), { recursive: true });
      fs.writeFileSync(
        path.join(projectDir, "src", "index.ts"),
        "Hello HtsNftTemplate and HtsNftTemplate again",
        "utf8",
      );

      applyRenameMap(projectDir, { HtsNftTemplate: { to: "{{projectName}}", paths: ["src"] } }, "my-project");

      const content = fs.readFileSync(path.join(projectDir, "src", "index.ts"), "utf8");
      expect(content).toBe("Hello my-project and my-project again");
    } finally {
      fs.rmSync(projectDir, { recursive: true, force: true });
    }
  });
});

describe("generateEnvExample", () => {
  it("writes .env.example with commented descriptions and empty values", () => {
    const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), "env-example-"));
    try {
      const envVars = [
        { key: "HEDERA_ACCOUNT_ID", description: "Your Hedera account ID (0.0.XXXXX)" },
        { key: "HEDERA_PRIVATE_KEY", description: "Your ECDSA private key" },
      ];

      generateEnvExample(projectDir, envVars);

      const content = fs.readFileSync(path.join(projectDir, ".env.example"), "utf8");
      expect(content).toContain("# Your Hedera account ID (0.0.XXXXX)");
      expect(content).toContain("HEDERA_ACCOUNT_ID=");
      expect(content).toContain("# Your ECDSA private key");
      expect(content).toContain("HEDERA_PRIVATE_KEY=");
    } finally {
      fs.rmSync(projectDir, { recursive: true, force: true });
    }
  });

  it("handles empty envVars array", () => {
    const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), "env-example-"));
    try {
      generateEnvExample(projectDir, []);
      const content = fs.readFileSync(path.join(projectDir, ".env.example"), "utf8");
      expect(content.trim()).toBe("");
    } finally {
      fs.rmSync(projectDir, { recursive: true, force: true });
    }
  });
});

describe("template manifest integration", () => {
  it("parse + applyRenameMap + generateEnvExample produces expected output", () => {
    const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), "manifest-int-"));
    try {
      fs.writeFileSync(path.join(projectDir, "template.json"), JSON.stringify(fixtureManifest), "utf8");
      fs.mkdirSync(path.join(projectDir, "contracts"), { recursive: true });
      fs.mkdirSync(path.join(projectDir, "frontend", "src"), { recursive: true });
      fs.writeFileSync(path.join(projectDir, "contracts", "Token.ts"), "contract HtsNftTemplate {}", "utf8");
      fs.writeFileSync(path.join(projectDir, "frontend", "src", "config.ts"), "name: HtsNftTemplate", "utf8");

      const raw = JSON.parse(fs.readFileSync(path.join(projectDir, "template.json"), "utf8"));
      const manifest = TemplateManifestSchema.parse(raw);
      const createScaffoldHbar = manifest["scaffold-hbar"];

      if (createScaffoldHbar?.rename) {
        applyRenameMap(projectDir, createScaffoldHbar.rename, "my-hedera-dapp");
      }
      if (createScaffoldHbar?.envVars?.length) {
        generateEnvExample(projectDir, createScaffoldHbar.envVars);
      }

      expect(fs.readFileSync(path.join(projectDir, "contracts", "Token.ts"), "utf8")).toBe(
        "contract my-hedera-dapp {}",
      );
      expect(fs.readFileSync(path.join(projectDir, "frontend", "src", "config.ts"), "utf8")).toBe(
        "name: my-hedera-dapp",
      );

      const envExample = fs.readFileSync(path.join(projectDir, ".env.example"), "utf8");
      expect(envExample).toContain("# Your Hedera account ID (0.0.XXXXX)");
      expect(envExample).toContain("HEDERA_ACCOUNT_ID=");
      expect(envExample).toContain("HEDERA_PRIVATE_KEY=");
    } finally {
      fs.rmSync(projectDir, { recursive: true, force: true });
    }
  });
});
