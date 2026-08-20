import { describe, it, expect } from "vitest";
import { TemplateManifestSchema } from "../../src/types";

const minimalManifest = {
  name: "payments-scheduler",
};

const fullManifest = {
  name: "payments-scheduler",
  description: "NFT Collection template using Hedera Token Service",
  version: "1.0.0",
  "create-scaffold-hbar": {
    rename: {
      HtsNftTemplate: {
        to: "{{projectName}}",
        paths: ["contracts", "frontend/src"],
      },
    },
    instructions: ["Get free testnet HBAR at: https://portal.hedera.com", "+cp .env.example .env", "+{pm} run dev"],
    requirements: {
      node: ">=18.0.0",
    },
    envVars: [
      { key: "HEDERA_ACCOUNT_ID", description: "Your Hedera account ID (0.0.XXXXX)" },
      { key: "HEDERA_PRIVATE_KEY", description: "Your ECDSA or ED25519 private key" },
      { key: "HEDERA_NETWORK", description: "testnet | mainnet" },
    ],
  },
};

describe("TemplateManifestSchema", () => {
  describe("valid manifests", () => {
    it("accepts a minimal manifest with only a name", () => {
      const result = TemplateManifestSchema.safeParse(minimalManifest);
      expect(result.success).toBe(true);
    });

    it("accepts a fully-populated manifest", () => {
      const result = TemplateManifestSchema.safeParse(fullManifest);
      expect(result.success).toBe(true);
    });

    it("accepts a manifest without a create-scaffold-hbar block", () => {
      const result = TemplateManifestSchema.safeParse({ name: "blank" });
      expect(result.success).toBe(true);
    });

    it("accepts a create-scaffold-hbar block with only envVars", () => {
      const result = TemplateManifestSchema.safeParse({
        name: "blank",
        "create-scaffold-hbar": {
          envVars: [{ key: "HEDERA_ACCOUNT_ID", description: "Account ID" }],
        },
      });
      expect(result.success).toBe(true);
    });

    it("maps legacy create-hbar manifest key to create-scaffold-hbar", () => {
      const result = TemplateManifestSchema.safeParse({
        name: "blank",
        "create-hbar": {
          envVars: [{ key: "HEDERA_ACCOUNT_ID", description: "Account ID" }],
        },
      });
      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data["create-scaffold-hbar"]?.envVars).toHaveLength(1);
    });

    it("accepts outro.steps for a custom CLI outro body", () => {
      const result = TemplateManifestSchema.safeParse({
        name: "hedera-demo",
        "create-scaffold-hbar": {
          outro: { steps: ["+Start the frontend: {run:next:start}"] },
        },
      });
      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data["create-scaffold-hbar"]?.outro?.steps).toEqual(["+Start the frontend: {run:next:start}"]);
    });

    it("accepts outro.sections for a structured CLI outro body", () => {
      const result = TemplateManifestSchema.safeParse({
        name: "bridge",
        "create-scaffold-hbar": {
          outro: {
            sections: [
              {
                title: "Next steps",
                steps: [
                  { label: "Compile", command: "{run:foundry:compile}" },
                  { label: "Faucet", url: "https://portal.hedera.com/faucet" },
                  { text: "Customize the providers." },
                ],
              },
            ],
          },
        },
      });
      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data["create-scaffold-hbar"]?.outro?.sections?.[0].title).toBe("Next steps");
      expect(result.data["create-scaffold-hbar"]?.outro?.sections?.[0].steps).toHaveLength(3);
    });

    it("accepts outro with both sections and legacy steps (sections preferred at runtime)", () => {
      const result = TemplateManifestSchema.safeParse({
        name: "bridge",
        "create-scaffold-hbar": {
          outro: {
            sections: [{ steps: [{ command: "yarn next:dev" }] }],
            steps: ["+legacy"],
          },
        },
      });
      expect(result.success).toBe(true);
    });

    it("accepts outro.installCommand without steps (install hint only)", () => {
      const result = TemplateManifestSchema.safeParse({
        name: "pnpm-template",
        "create-scaffold-hbar": {
          outro: { installCommand: "pnpm install" },
        },
      });
      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data["create-scaffold-hbar"]?.outro?.steps).toBeUndefined();
      expect(result.data["create-scaffold-hbar"]?.outro?.installCommand).toBe("pnpm install");
    });

    it("rejects an outro step with no payload fields", () => {
      const result = TemplateManifestSchema.safeParse({
        name: "test",
        "create-scaffold-hbar": {
          outro: { sections: [{ steps: [{}] }] },
        },
      });
      expect(result.success).toBe(false);
    });

    it("preserves rename entry structure on parse", () => {
      const result = TemplateManifestSchema.safeParse(fullManifest);
      expect(result.success).toBe(true);
      if (!result.success) return;
      const renameEntry = result.data["create-scaffold-hbar"]?.rename?.["HtsNftTemplate"];
      expect(renameEntry?.to).toBe("{{projectName}}");
      expect(renameEntry?.paths).toEqual(["contracts", "frontend/src"]);
    });
  });

  describe("invalid manifests", () => {
    it("rejects a manifest with no name", () => {
      const result = TemplateManifestSchema.safeParse({ description: "no name" });
      expect(result.success).toBe(false);
    });

    it("rejects a manifest with an empty name string", () => {
      const result = TemplateManifestSchema.safeParse({ name: "" });
      expect(result.success).toBe(false);
    });

    it("rejects an envVar entry missing a key", () => {
      const result = TemplateManifestSchema.safeParse({
        name: "test",
        "create-scaffold-hbar": {
          envVars: [{ description: "missing key field" }],
        },
      });
      expect(result.success).toBe(false);
    });

    it("rejects an envVar entry with an empty key", () => {
      const result = TemplateManifestSchema.safeParse({
        name: "test",
        "create-scaffold-hbar": {
          envVars: [{ key: "", description: "empty key" }],
        },
      });
      expect(result.success).toBe(false);
    });

    it("rejects a rename entry with an empty paths array", () => {
      const result = TemplateManifestSchema.safeParse({
        name: "test",
        "create-scaffold-hbar": {
          rename: {
            Placeholder: { to: "{{projectName}}", paths: [] },
          },
        },
      });
      expect(result.success).toBe(false);
    });

    it("rejects a rename entry with an empty 'to' string", () => {
      const result = TemplateManifestSchema.safeParse({
        name: "test",
        "create-scaffold-hbar": {
          rename: {
            Placeholder: { to: "", paths: ["contracts"] },
          },
        },
      });
      expect(result.success).toBe(false);
    });

    it("rejects an outro block with neither sections, steps, nor installCommand", () => {
      const result = TemplateManifestSchema.safeParse({
        name: "test",
        "create-scaffold-hbar": {
          outro: {},
        },
      });
      expect(result.success).toBe(false);
    });
  });

  describe("inferred types", () => {
    it("returns typed envVars after a successful parse", () => {
      const result = TemplateManifestSchema.safeParse(fullManifest);
      expect(result.success).toBe(true);
      if (!result.success) return;
      const envVars = result.data["create-scaffold-hbar"]?.envVars ?? [];
      expect(envVars[0].key).toBe("HEDERA_ACCOUNT_ID");
      expect(envVars[1].key).toBe("HEDERA_PRIVATE_KEY");
      expect(envVars[2].key).toBe("HEDERA_NETWORK");
    });

    it("returns typed instructions after a successful parse", () => {
      const result = TemplateManifestSchema.safeParse(fullManifest);
      expect(result.success).toBe(true);
      if (!result.success) return;
      const instructions = result.data["create-scaffold-hbar"]?.instructions ?? [];
      expect(instructions).toHaveLength(3);
      expect(instructions[0]).toBe("Get free testnet HBAR at: https://portal.hedera.com");
    });
  });
});
