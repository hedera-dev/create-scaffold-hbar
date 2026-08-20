import { z } from "zod";

export type Args = string[];

/** Package manager for the generated project. "none" = template-managed install flow. */
export type PackageManager = "yarn" | "npm" | "none";

/** Hedera network targets. */
export type Network = "testnet" | "mainnet";

/** Built-in starter templates. Also accepts `"org/repo"` strings for community templates. */
export type Template = "blank" | "hts-fungible" | "payments-scheduler" | "hcs-dao" | "defi-swap";

/** Frontend framework. "none" = contracts only (Hardhat or Foundry). */
export type Frontend = "nextjs-app" | "none";

/**
 * Solidity / contract framework choices.
 */
export type SolidityFramework = "hardhat" | "foundry";

const EnvVarSchema = z.object({
  /** Environment variable key, e.g. HEDERA_ACCOUNT_ID */
  key: z.string().min(1),
  /** Human-readable description written as a comment in .env.example */
  description: z.string(),
});

const RenameEntrySchema = z.object({
  /**
   * Replacement string. Use `{{projectName}}` as a placeholder for the
   * user-supplied project name.
   */
  to: z.string().min(1),
  /** Relative paths (from the project root) to run the replacement across. */
  paths: z.array(z.string().min(1)).min(1),
});

const TemplateCapabilitiesSchema = z.object({
  /** Allowed frontend options for this template. */
  frontend: z.array(z.enum(["nextjs-app", "none"])).optional(),
  /** Allowed solidity framework options for this template. */
  solidityFramework: z.array(z.enum(["hardhat", "foundry", "none"])).optional(),
  /** Allowed package manager options for this template. */
  packageManager: z.array(z.enum(["yarn", "npm", "none"])).optional(),
});

const TemplateDefaultsSchema = z.object({
  frontend: z.enum(["nextjs-app", "none"]).optional(),
  solidityFramework: z.enum(["hardhat", "foundry", "none"]).optional(),
  packageManager: z.enum(["yarn", "npm", "none"]).optional(),
});

const TemplateOutroStepSchema = z
  .object({
    /** Bold step heading shown above command/url/text. */
    label: z.string().min(1).optional(),
    /**
     * Shell command. May include `{run:script}` (expanded to the selected PM command)
     * and `{run:framework:script}` (prefixes hardhat/foundry from the scaffold choice).
     * Trailing args are allowed after the placeholder.
     */
    command: z.string().min(1).optional(),
    /** Link shown in cyan (not as a command chip). */
    url: z.string().min(1).optional(),
    /** Plain prose / notes. Supports `{run:script}`, `{run:framework:script}`, and `{pm}` placeholders. */
    text: z.string().min(1).optional(),
  })
  .refine(
    step => step.label !== undefined || step.command !== undefined || step.url !== undefined || step.text !== undefined,
    {
      message: "Each outro step must include at least one of 'label', 'command', 'url', or 'text'.",
    },
  );

const TemplateOutroSectionSchema = z.object({
  /** Optional section heading (e.g. "Next steps"). */
  title: z.string().min(1).optional(),
  steps: z.array(TemplateOutroStepSchema).min(1),
});

const TemplateOutroSchema = z
  .object({
    /**
     * Preferred structured outro body. When present, replaces the default
     * contract/frontend middle section. Takes precedence over legacy `steps`.
     */
    sections: z.array(TemplateOutroSectionSchema).min(1).optional(),
    /**
     * Legacy flat lines. Prefer `sections`. Leading `+` renders bold.
     * Use `{run:script}` for the selected package manager command.
     */
    steps: z.array(z.string().min(1)).min(1).optional(),
    /**
     * Optional override for the shared install hint shown when `--skip-install` is used.
     * Example: `pnpm install`
     */
    installCommand: z.string().min(1).optional(),
  })
  .refine(outro => outro.sections !== undefined || outro.steps !== undefined || outro.installCommand !== undefined, {
    message: "Template outro must define at least one of 'sections', 'steps', or 'installCommand'.",
  });

/** Structured outro step from `template.json` (after Zod parse). */
export type TemplateOutroStep = z.infer<typeof TemplateOutroStepSchema>;
/** Structured outro section from `template.json` (after Zod parse). */
export type TemplateOutroSection = z.infer<typeof TemplateOutroSectionSchema>;

const TemplateManifestBlockSchema = z.object({
  /**
   * Token replacement map.
   * Keys are placeholder strings in template files; values describe what
   * to replace them with and which paths to scan.
   */
  rename: z.record(z.string(), RenameEntrySchema).optional(),
  /**
   * Post-scaffold instructions printed in the outro.
   * Lines starting with `+` are rendered bold.
   * `{pm}` is replaced with the detected package manager name.
   */
  instructions: z.array(z.string()).optional(),
  /**
   * Minimum version requirements for external tools.
   * Keys are tool names (e.g. `node`, `hedera-local-node`),
   * values are semver ranges (e.g. `>=18.0.0`).
   */
  requirements: z.record(z.string(), z.string()).optional(),
  /** Environment variables written into `.env.example`. */
  envVars: z.array(EnvVarSchema).optional(),
  /** Template-specific prompt constraints used by the CLI. */
  capabilities: TemplateCapabilitiesSchema.optional(),
  /** Template-specific default values used when multiple options exist. */
  defaults: TemplateDefaultsSchema.optional(),
  /** Optional custom outro body; prefer `outro.sections` (legacy `outro.steps` still accepted). */
  outro: TemplateOutroSchema.optional(),
});

function normalizeTemplateManifestRaw(raw: unknown): unknown {
  if (!raw || typeof raw !== "object") return raw;
  const o = { ...(raw as Record<string, unknown>) };
  if ("create-hbar" in o) {
    if (!("create-scaffold-hbar" in o)) {
      o["create-scaffold-hbar"] = o["create-hbar"];
    }
    delete o["create-hbar"];
  }
  return o;
}

/**
 * Zod schema for `template.json` manifests shipped with each starter template.
 * Validated at runtime after the template is downloaded/copied.
 *
 * Legacy manifests may use the `create-hbar` key; it is normalized to
 * `create-scaffold-hbar` before validation.
 */
export const TemplateManifestSchema = z.preprocess(
  normalizeTemplateManifestRaw,
  z.object({
    name: z.string().min(1),
    description: z.string().optional(),
    version: z.string().optional(),
    "create-scaffold-hbar": TemplateManifestBlockSchema.optional(),
  }),
);

/** Inferred TypeScript type from TemplateManifestSchema. */
export type TemplateManifest = z.infer<typeof TemplateManifestSchema>;

type BaseOptions = {
  /** Output project directory name. */
  project: string | null;
  /** Run `yarn install` after scaffolding. */
  install: boolean;
  /**
   * When set, skips the interactive confirm for Hedera Skills.
   * Omitted means the CLI may prompt (non-`--yes` flows).
   */
  installHederaSkills?: boolean;
  /** Solidity / contract framework. `"none"` means contracts-only with no framework. */
  solidityFramework: SolidityFramework | "none" | null;
  /** Starter template key or `"org/repo"` community template path. */
  template: (Template | (string & {})) | null;
  /** Frontend framework (Next.js). */
  frontend: Frontend | null;
  /** Target Hedera network. */
  network: Network | null;
  /** Package manager — yarn or npm. */
  packageManager: PackageManager | null;
};

/** Raw options after flag parsing, before interactive prompts fill in nulls. */
export type RawOptions = BaseOptions & {
  /** `--help` flag — print help text and exit. */
  help: boolean;
};

/**
 * Fully resolved options after all prompts have been answered.
 * All nullable fields are guaranteed non-null except `solidityFramework`
 * (which can legitimately be null for "none").
 */
export type Options = {
  [Prop in keyof Omit<
    BaseOptions,
    "solidityFramework" | "template" | "frontend" | "network" | "installHederaSkills"
  >]: NonNullable<BaseOptions[Prop]>;
} & {
  solidityFramework: SolidityFramework | null;
  template: Template | (string & {});
  frontend: Frontend;
  network: Network;
  installHederaSkills: boolean;
  /**
   * Structured outro body from the template manifest (native `outro.sections`
   * or adapted from legacy `outro.steps`). When set, replaces the default
   * contract/frontend middle section.
   */
  outroSections?: TemplateOutroSection[];
  /**
   * Optional install command override from template manifest `outro.installCommand`.
   * Used to keep shared outro text in sync with templates that prefer pnpm.
   */
  outroInstallCommand?: string;
};

/** Describes a single `.template.` file found during template processing. */
export type TemplateDescriptor = {
  path: string;
  fileUrl: string;
  relativePath: string;
  source: string;
};

/** Solidity framework choices for the prompt (fixed list). */
export type SolidityFrameworkChoices = (SolidityFramework | "none" | { value: null; name: string })[];
