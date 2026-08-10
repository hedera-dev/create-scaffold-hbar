import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";
import {
  copyLocalTemplateTree,
  filterRootPackageJson,
  updateTextFilesForNpm,
} from "../../src/tasks/copy-template-files";
import {
  isUnderHarnessRecipeDir,
  shouldSkipNpmTextRewrite,
  snapshotHarnessPackageFields,
  restoreHarnessPackageFields,
} from "../../src/utils/harness-recipe";
import { SOLIDITY_FRAMEWORKS } from "../../src/utils/consts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE_TEMPLATE = path.resolve(__dirname, "../fixtures/harness-template");

describe("harness-recipe path helpers", () => {
  it("detects .harness recipe paths", () => {
    expect(isUnderHarnessRecipeDir(".harness")).toBe(true);
    expect(isUnderHarnessRecipeDir(".harness/spec.yaml")).toBe(true);
    expect(isUnderHarnessRecipeDir(".harness/validators/smoke.json")).toBe(true);
    expect(isUnderHarnessRecipeDir("README.md")).toBe(false);
    expect(isUnderHarnessRecipeDir("packages/nextjs/package.json")).toBe(false);
  });

  it("skips npm text rewrite for harness recipes only", () => {
    expect(shouldSkipNpmTextRewrite(".harness/prd.md")).toBe(true);
    expect(shouldSkipNpmTextRewrite("README.md")).toBe(false);
  });
});

describe("harness package field snapshot/restore", () => {
  it("restores harness scripts and hedera-harness when filtering drops them", () => {
    const pkg: Record<string, unknown> = {
      scripts: {
        "harness:run": "hedera-harness run .harness/spec.yaml",
        format: "yarn format",
      },
      devDependencies: {
        "hedera-harness": "1.1.0",
        husky: "^8.0.0",
      },
    };
    const snapshot = snapshotHarnessPackageFields(pkg);
    delete (pkg.scripts as Record<string, string>)["harness:run"];
    delete (pkg.devDependencies as Record<string, string>)["hedera-harness"];
    restoreHarnessPackageFields(pkg, snapshot, {
      "harness:run": "npm run harness:run",
    });
    expect((pkg.scripts as Record<string, string>)["harness:run"]).toBe("npm run harness:run");
    expect((pkg.devDependencies as Record<string, string>)["hedera-harness"]).toBe("1.1.0");
  });
});

describe("copy + package-manager transforms preserve harness recipes", () => {
  let targetDir: string;

  beforeEach(async () => {
    targetDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "create-hbar-harness-"));
    await copyLocalTemplateTree(FIXTURE_TEMPLATE, targetDir);
  });

  afterEach(async () => {
    await fs.promises.rm(targetDir, { recursive: true, force: true });
  });

  it("copies the .harness/ dot directory from the template tree", () => {
    expect(fs.existsSync(path.join(targetDir, ".harness", "spec.yaml"))).toBe(true);
    expect(fs.existsSync(path.join(targetDir, ".harness", "prd.md"))).toBe(true);
    expect(fs.existsSync(path.join(targetDir, ".harness", "validators", "smoke.json"))).toBe(true);
  });

  it("skips .git, node_modules, .next, and .env from a live template checkout", async () => {
    const dirty = await fs.promises.mkdtemp(path.join(os.tmpdir(), "create-hbar-dirty-"));
    const out = await fs.promises.mkdtemp(path.join(os.tmpdir(), "create-hbar-out-"));
    try {
      fs.mkdirSync(path.join(dirty, ".git"));
      fs.writeFileSync(path.join(dirty, ".git", "HEAD"), "ref: refs/heads/main\n");
      fs.mkdirSync(path.join(dirty, "node_modules", "left-pad"), { recursive: true });
      fs.writeFileSync(path.join(dirty, "node_modules", "left-pad", "index.js"), "module.exports=1");
      fs.mkdirSync(path.join(dirty, "packages", "nextjs", ".next"), { recursive: true });
      fs.writeFileSync(path.join(dirty, "packages", "nextjs", ".next", "trace"), "x");
      fs.writeFileSync(path.join(dirty, ".env"), "SECRET=1\n");
      fs.mkdirSync(path.join(dirty, "packages", "nextjs"), { recursive: true });
      fs.writeFileSync(path.join(dirty, "packages", "nextjs", ".env"), "SECRET=2\n");
      fs.mkdirSync(path.join(dirty, ".harness"), { recursive: true });
      fs.writeFileSync(path.join(dirty, ".harness", "spec.yaml"), "name: keep\n");
      fs.writeFileSync(path.join(dirty, "README.md"), "ok\n");

      await copyLocalTemplateTree(dirty, out);

      expect(fs.existsSync(path.join(out, ".harness", "spec.yaml"))).toBe(true);
      expect(fs.existsSync(path.join(out, "README.md"))).toBe(true);
      expect(fs.existsSync(path.join(out, ".git"))).toBe(false);
      expect(fs.existsSync(path.join(out, "node_modules"))).toBe(false);
      expect(fs.existsSync(path.join(out, "packages", "nextjs", ".next"))).toBe(false);
      expect(fs.existsSync(path.join(out, ".env"))).toBe(false);
      expect(fs.existsSync(path.join(out, "packages", "nextjs", ".env"))).toBe(false);
    } finally {
      await fs.promises.rm(dirty, { recursive: true, force: true });
      await fs.promises.rm(out, { recursive: true, force: true });
    }
  });

  it("keeps harness:run and hedera-harness through yarn root package filtering", () => {
    filterRootPackageJson(targetDir, SOLIDITY_FRAMEWORKS.HARDHAT, "nextjs-app", "yarn");
    const pkg = JSON.parse(fs.readFileSync(path.join(targetDir, "package.json"), "utf8"));
    expect(pkg.scripts["harness:run"]).toBe("hedera-harness run .harness/spec.yaml");
    expect(pkg.devDependencies["hedera-harness"]).toBe("1.1.0");
    expect(pkg.scripts["foundry:compile"]).toBeUndefined();
  });

  it("keeps harness fields in npm mode and rewrites only non-recipe yarn text", () => {
    const originalSpec = fs.readFileSync(path.join(targetDir, ".harness", "spec.yaml"), "utf8");
    const originalPrd = fs.readFileSync(path.join(targetDir, ".harness", "prd.md"), "utf8");
    const originalValidator = fs.readFileSync(path.join(targetDir, ".harness", "validators", "smoke.json"), "utf8");

    filterRootPackageJson(targetDir, SOLIDITY_FRAMEWORKS.HARDHAT, "nextjs-app", "npm");
    updateTextFilesForNpm(targetDir, "npm");

    const pkg = JSON.parse(fs.readFileSync(path.join(targetDir, "package.json"), "utf8"));
    expect(pkg.scripts["harness:run"]).toBe("hedera-harness run .harness/spec.yaml");
    expect(pkg.devDependencies["hedera-harness"]).toBe("1.1.0");

    expect(fs.readFileSync(path.join(targetDir, ".harness", "spec.yaml"), "utf8")).toBe(originalSpec);
    expect(fs.readFileSync(path.join(targetDir, ".harness", "prd.md"), "utf8")).toBe(originalPrd);
    expect(fs.readFileSync(path.join(targetDir, ".harness", "validators", "smoke.json"), "utf8")).toBe(
      originalValidator,
    );
    expect(originalSpec).toContain("yarn install --immutable");
    expect(originalValidator).toContain("yarn workspace");

    const readme = fs.readFileSync(path.join(targetDir, "README.md"), "utf8");
    expect(readme).toContain("npm install");
    expect(readme).not.toContain("yarn install");
  });

  it("preserves harness fields when frontend/solidity filtering is aggressive", () => {
    filterRootPackageJson(targetDir, null, "none", "npm");
    const pkg = JSON.parse(fs.readFileSync(path.join(targetDir, "package.json"), "utf8"));
    expect(pkg.scripts["harness:run"]).toBe("hedera-harness run .harness/spec.yaml");
    expect(pkg.devDependencies["hedera-harness"]).toBe("1.1.0");
    // Unselected solidity scripts are stripped; harness wiring must remain.
    expect(pkg.scripts["hardhat:compile"]).toBeUndefined();
    expect(pkg.scripts["foundry:compile"]).toBeUndefined();
  });
});
