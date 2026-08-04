import { execa } from "execa";
import { downloadTemplate } from "giget";
import { Options, TemplateManifestSchema, PackageManager } from "../types";
import type { SolidityFramework } from "../types";
import fs from "fs";
import os from "os";
import fse from "fs-extra";
import path from "path";
import { getTemplateSpec } from "../utils/fetch-available-templates";
import { SOLIDITY_FRAMEWORKS } from "../utils/consts";
import {
  restoreHarnessPackageFields,
  shouldSkipNpmTextRewrite,
  snapshotHarnessPackageFields,
} from "../utils/harness-recipe";
import { applyRenameMap } from "./apply-rename-map";
import { generateEnvExample } from "./generate-env-example";

const TEMPLATE_MANIFEST_FILENAME = "template.json";
const NEXTJS_PACKAGE = "nextjs";
const NPM_PACKAGE_MANAGER_VERSION = "npm@10.0.0";
const NEXTJS_PACKAGE_JSON_PATH = path.join("packages", NEXTJS_PACKAGE, "package.json");
const HARDHAT_PACKAGE_JSON_PATH = path.join("packages", SOLIDITY_FRAMEWORKS.HARDHAT, "package.json");
const TEXT_FILE_EXTENSIONS = new Set([
  ".md",
  ".txt",
  ".json",
  ".js",
  ".cjs",
  ".mjs",
  ".ts",
  ".mts",
  ".cts",
  ".yml",
  ".yaml",
  ".env",
  ".example",
  ".rc",
]);

/**
 * Removes husky-related scripts from package.json when using npm.
 * This prevents errors since we remove the .husky directory for npm projects.
 * @param targetDir - The target directory containing package.json.
 * @param packageManager - The package manager being used.
 */
function removeHuskyScripts(targetDir: string, packageManager: PackageManager): void {
  if (packageManager !== "npm") return;

  const pkgPath = path.join(targetDir, "package.json");
  if (!fs.existsSync(pkgPath)) return;

  try {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8")) as Record<string, unknown>;

    if (pkg.scripts && typeof pkg.scripts === "object") {
      const scripts = pkg.scripts as Record<string, string>;

      // Remove husky-related scripts that will fail without .husky directory
      delete scripts["postinstall"]; // Usually "husky"
      delete scripts["precommit"]; // Usually "lint-staged"
      delete scripts["lint-staged"];
    }

    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2), "utf8");
  } catch (err) {
    console.warn("Warning: Could not update package.json scripts:", err);
  }
}

/**
 * Transforms yarn-specific script commands to npm equivalents.
 * Handles:
 * - `yarn workspace @sh/<pkg> <script>` → `npm run <script> -w @sh/<pkg>`
 * - `yarn <script>` → `npm run <script>` (for npm package manager)
 * - Adds `--` to npm scripts that chain to other scripts, so arguments are forwarded
 */
function transformScriptForPackageManager(script: string, packageManager: PackageManager): string {
  if (packageManager === "yarn") {
    return script;
  }

  let transformed = script;

  // Transform `yarn workspace @sh/<pkg> <script>` → `npm run <script> -w @sh/<pkg> --`
  // The trailing `--` ensures arguments are forwarded through npm script chains
  transformed = transformed.replace(/yarn\s+workspace\s+(@sh\/\w+)\s+(\S+)/g, "npm run $2 -w $1 --");

  // Transform standalone `yarn <script>` (where <script> doesn't contain spaces or special chars)
  // This matches patterns like `yarn format`, `yarn compile`, but not `yarn workspace ...`
  // We need to be careful not to double-transform already transformed scripts
  // Also add `--` to wrapper scripts so arguments forward properly
  transformed = transformed.replace(/\byarn\s+([a-zA-Z0-9:_-]+)\b(?!\s*-w)/g, (match: string, scriptName: string) => {
    // Check if this looks like a wrapper script (chaining to other scripts)
    // These typically have names like "deploy", "verify", "foundry:*" that call other scripts
    const isWrapperScript =
      scriptName === "deploy" ||
      scriptName === "verify" ||
      scriptName === "chain" ||
      scriptName === "compile" ||
      scriptName === "fork" ||
      scriptName === "test" ||
      scriptName.startsWith("foundry:") ||
      scriptName.startsWith("hardhat:") ||
      scriptName.startsWith("next:");

    if (isWrapperScript) {
      return `npm run ${scriptName} --`;
    }
    return `npm run ${scriptName}`;
  });

  return transformed;
}

/** Normalizes scripts and packageManager metadata for npm in workspace packages. */
function normalizeWorkspacePackagesForNpm(
  targetDir: string,
  selectedFramework: SolidityFramework | null | undefined,
  frontend: Options["frontend"],
  packageManager: PackageManager,
): void {
  if (packageManager !== "npm") return;

  const workspacePackageJsonPaths: string[] = [];
  if (selectedFramework === SOLIDITY_FRAMEWORKS.HARDHAT) {
    workspacePackageJsonPaths.push(HARDHAT_PACKAGE_JSON_PATH);
  }
  if (frontend !== "none") {
    workspacePackageJsonPaths.push(NEXTJS_PACKAGE_JSON_PATH);
  }

  for (const relPath of workspacePackageJsonPaths) {
    const pkgPath = path.join(targetDir, relPath);
    if (!fs.existsSync(pkgPath)) continue;

    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8")) as Record<string, unknown>;
    const scripts = pkg.scripts as Record<string, string> | undefined;
    if (scripts && typeof scripts === "object") {
      for (const key of Object.keys(scripts)) {
        if (typeof scripts[key] !== "string") continue;
        scripts[key] = transformScriptForPackageManager(scripts[key], packageManager);

        // In npm mode, convert yarn binary invocations to npx.
        scripts[key] = scripts[key].replace(/\bnpm run bgipfs\b/g, "npx bgipfs");
      }
    }

    pkg.packageManager = NPM_PACKAGE_MANAGER_VERSION;
    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2), "utf8");
  }
}

/**
 * If template.json exists in project root, parse it, run rename and env
 * generation, then remove the manifest file.
 *
 * @returns Custom outro metadata from template.json when present.
 */
function processTemplateManifest(
  projectDir: string,
  projectName: string,
): { outroSteps?: string[]; outroInstallCommand?: string } | undefined {
  const manifestPath = path.join(projectDir, TEMPLATE_MANIFEST_FILENAME);
  if (!fs.existsSync(manifestPath)) return undefined;

  const raw = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const manifest = TemplateManifestSchema.parse(raw);
  const createScaffoldHbar = manifest["create-scaffold-hbar"];

  const outroSteps = createScaffoldHbar?.outro?.steps;
  const outroInstallCommand = createScaffoldHbar?.outro?.installCommand;

  if (createScaffoldHbar?.rename) {
    applyRenameMap(projectDir, createScaffoldHbar.rename, projectName);
  }
  if (createScaffoldHbar?.envVars?.length) {
    generateEnvExample(projectDir, createScaffoldHbar.envVars);
  }

  fs.unlinkSync(manifestPath);

  const result: { outroSteps?: string[]; outroInstallCommand?: string } = {};
  if (outroSteps?.length) result.outroSteps = [...outroSteps];
  if (outroInstallCommand?.trim()) result.outroInstallCommand = outroInstallCommand.trim();
  return Object.keys(result).length > 0 ? result : undefined;
}

/**
 * Removes packages/ for frameworks the user did not select so only the chosen
 * solidity framework (and nextjs if frontend is not "none") remain.
 */
function removeUnselectedFrameworkPackages(targetDir: string, solidityFramework: SolidityFramework | null): void {
  const packagesDir = path.join(targetDir, "packages");
  if (!fs.existsSync(packagesDir)) return;

  const toRemove: string[] = [];
  if (solidityFramework === SOLIDITY_FRAMEWORKS.FOUNDRY) {
    toRemove.push(SOLIDITY_FRAMEWORKS.HARDHAT);
  } else if (solidityFramework === SOLIDITY_FRAMEWORKS.HARDHAT) {
    toRemove.push(SOLIDITY_FRAMEWORKS.FOUNDRY);
  } else {
    toRemove.push(SOLIDITY_FRAMEWORKS.HARDHAT, SOLIDITY_FRAMEWORKS.FOUNDRY);
  }

  for (const name of toRemove) {
    const pkgPath = path.join(packagesDir, name);
    if (fs.existsSync(pkgPath)) {
      fs.rmSync(pkgPath, { recursive: true });
    }
  }
}

/** Removes packages/nextjs when frontend is "none" (contracts-only scaffold). */
function removeNextjsPackage(targetDir: string): void {
  const nextjsPath = path.join(targetDir, "packages", NEXTJS_PACKAGE);
  if (fs.existsSync(nextjsPath)) {
    fs.rmSync(nextjsPath, { recursive: true });
  }
}

/** Yarn-specific files/directories to remove when using npm */
const YARN_SPECIFIC_PATHS = [
  ".yarnrc.yml",
  ".yarn",
  "yarn.lock",
  ".husky", // Husky hooks often contain yarn-specific commands
];

/**
 * Removes Yarn-specific configuration files when using npm.
 * This prevents conflicts between Yarn 3 configuration and npm.
 */
function removeYarnSpecificFiles(targetDir: string, packageManager: PackageManager): void {
  if (packageManager !== "npm") {
    return;
  }

  for (const relativePath of YARN_SPECIFIC_PATHS) {
    const fullPath = path.join(targetDir, relativePath);
    if (fs.existsSync(fullPath)) {
      try {
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          fs.rmSync(fullPath, { recursive: true, force: true });
        } else {
          fs.unlinkSync(fullPath);
        }
      } catch (err) {
        // Log but don't fail - these files are optional cleanup
        console.warn(`Warning: Could not remove ${relativePath}:`, err);
      }
    }
  }
}

function replaceYarnReference(content: string): string {
  let next = content;

  // Keep URL/docs references coherent before generic command conversion.
  next = next
    .replace(/https:\/\/yarnpkg\.com\/?/gi, "https://www.npmjs.com/")
    .replace(/\bYarn\b/g, "npm")
    .replace(/\byarn\b/g, "npm");

  next = next.replace(/\bnpm\s+workspace\s+(@sh\/[a-zA-Z0-9_-]+)\s+([a-zA-Z0-9:_-]+)\b/g, "npm run $2 -w $1 --");
  next = next.replace(/\bnpm\s+install\s+--immutable\b/g, "npm install");
  next = next.replace(/\bnpm\s+([a-zA-Z0-9:_-]+)\b/g, (match: string, scriptName: string) => {
    if (scriptName === "run" || scriptName === "install" || scriptName === "exec" || scriptName === "ci") {
      return match;
    }
    return `npm run ${scriptName}`;
  });

  return next;
}

/**
 * Rewrites yarn→npm in project text files when scaffolding with npm.
 * Skips the entire `.harness/` recipe tree so validator/spec commands stay intact.
 * Exported for fixture-driven unit tests.
 */
export function updateTextFilesForNpm(targetDir: string, packageManager: PackageManager): void {
  if (packageManager !== "npm") return;

  const walk = (dir: string): void => {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relativePath = path.relative(targetDir, fullPath);

      if (entry.isDirectory()) {
        if (entry.name === ".git" || entry.name === "node_modules") continue;
        // Do not rewrite tracked harness recipes (or ignored runtime dirs under .harness/).
        if (shouldSkipNpmTextRewrite(relativePath)) continue;
        walk(fullPath);
        continue;
      }

      if (shouldSkipNpmTextRewrite(relativePath)) {
        continue;
      }

      const ext = path.extname(entry.name);
      if (
        !TEXT_FILE_EXTENSIONS.has(ext) &&
        entry.name !== ".lintstagedrc.js" &&
        entry.name !== ".gitignore" &&
        entry.name !== ".prettierignore"
      ) {
        continue;
      }

      const original = fs.readFileSync(fullPath, "utf8");
      let updated = replaceYarnReference(original);
      if (entry.name === ".gitignore" || entry.name === ".prettierignore") {
        updated = updated
          .split("\n")
          .filter(line => !line.includes(".yarn") && !line.includes(".yarnrc") && !line.includes("yarn.lock"))
          .filter((line, index, lines) => !(line.trim() === "# npm" && lines[index + 1]?.trim() === ""))
          .join("\n");
      }
      if (updated !== original) {
        fs.writeFileSync(fullPath, updated, "utf8");
      }
    }
  };

  walk(targetDir);
}

/** Script keys that reference the Next.js package; removed when frontend is "none". */
const NEXTJS_SCRIPT_KEYS = [
  "start",
  "next:build",
  "next:check-types",
  "next:format",
  "next:lint",
  "next:serve",
  "vercel",
  "vercel:yolo",
  "vercel:login",
  "ipfs",
];

/**
 * Updates root package.json so workspaces and scripts only reference the
 * selected solidity framework and, when frontend is not "none", the nextjs package.
 * Also transforms scripts for the selected package manager.
 * Preserves `harness:*` scripts and `hedera-harness` dependency pins.
 * Exported for fixture-driven unit tests.
 */
export function filterRootPackageJson(
  targetDir: string,
  selectedFramework: SolidityFramework | null | undefined,
  frontend: Options["frontend"],
  packageManager: PackageManager,
): void {
  const pkgPath = path.join(targetDir, "package.json");
  if (!fs.existsSync(pkgPath)) return;

  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8")) as Record<string, unknown>;
  const harnessSnapshot = snapshotHarnessPackageFields(pkg);

  const unselected = [SOLIDITY_FRAMEWORKS.FOUNDRY, SOLIDITY_FRAMEWORKS.HARDHAT].filter(sf => sf !== selectedFramework);

  if (pkg.workspaces) {
    const ws = pkg.workspaces as string[] | { packages?: string[] };
    const wsList: string[] = Array.isArray(ws)
      ? ws
      : Array.isArray((ws as { packages?: string[] }).packages)
        ? (ws as { packages: string[] }).packages
        : [];
    let filtered = wsList.filter(w => !unselected.some(sf => w.includes(sf)));
    if (frontend === "none") {
      filtered = filtered.filter(w => !w.includes(NEXTJS_PACKAGE));
    }
    if (Array.isArray(pkg.workspaces)) {
      pkg.workspaces = filtered;
    } else if (typeof pkg.workspaces === "object" && pkg.workspaces !== null && "packages" in pkg.workspaces) {
      (pkg.workspaces as { packages: string[] }).packages = filtered;
    }
  }

  if (pkg.scripts && typeof pkg.scripts === "object") {
    const scripts = pkg.scripts as Record<string, string>;

    if (frontend === "none") {
      for (const key of NEXTJS_SCRIPT_KEYS) {
        delete scripts[key];
      }
      if (selectedFramework === SOLIDITY_FRAMEWORKS.HARDHAT) {
        scripts["format"] = packageManager === "npm" ? "npm run hardhat:format" : "yarn hardhat:format";
        scripts["lint"] = packageManager === "npm" ? "npm run hardhat:lint" : "yarn hardhat:lint";
      } else if (selectedFramework === SOLIDITY_FRAMEWORKS.FOUNDRY) {
        scripts["format"] =
          packageManager === "npm" ? "npm run format -w @sh/foundry --" : "yarn workspace @sh/foundry format";
        scripts["lint"] =
          packageManager === "npm" ? "npm run lint -w @sh/foundry --" : "yarn workspace @sh/foundry lint";
      } else {
        delete scripts["format"];
        delete scripts["lint"];
      }
    }

    for (const key of Object.keys(scripts)) {
      if (unselected.some(sf => key === sf || key.startsWith(`${sf}:`))) {
        delete scripts[key];
      }
    }
    for (const key of Object.keys(scripts)) {
      if (typeof scripts[key] !== "string") continue;

      // If a framework is selected, remap top-level "yarn hardhat:*"/"yarn foundry:*"
      // commands to the selected one.
      if (selectedFramework) {
        for (const sf of unselected) {
          const prefix = `yarn ${sf}:`;
          if (scripts[key].startsWith(prefix)) {
            const sub = scripts[key].slice(prefix.length);
            scripts[key] = `yarn ${selectedFramework}:${sub}`;
          }
        }
      }

      // Always strip command segments for unselected frameworks. This must also
      // run when selectedFramework is null (e.g. templates that default to "none").
      for (const sf of unselected) {
        scripts[key] = scripts[key]
          .replace(new RegExp(`\\s*&&\\s*yarn ${sf}:[^\\s&]+`, "g"), "")
          .replace(new RegExp(`yarn ${sf}:[^\\s&]+\\s*&&\\s*`, "g"), "")
          .trim();
      }

      // Transform yarn commands to npm equivalents if needed
      if (packageManager === "npm") {
        scripts[key] = transformScriptForPackageManager(scripts[key], packageManager);
      }

      if (scripts[key] === "") {
        delete scripts[key];
      }
    }
  }

  // Update packageManager field to match selected package manager
  if (packageManager === "npm") {
    // Get npm version for the packageManager field
    pkg.packageManager = NPM_PACKAGE_MANAGER_VERSION; // Will be updated with actual version during install
  }
  // For yarn, keep the template's packageManager field as-is

  // Ensure harness scripts/deps survive filtering; keep post-transform script bodies
  // (e.g. `yarn harness:extend` → `npm run harness:extend` in npm mode).
  const transformedHarnessScripts: Record<string, string> = {};
  if (pkg.scripts && typeof pkg.scripts === "object") {
    for (const key of Object.keys(harnessSnapshot.scripts)) {
      const value = (pkg.scripts as Record<string, string>)[key];
      if (typeof value === "string") {
        transformedHarnessScripts[key] = value;
      }
    }
  }
  restoreHarnessPackageFields(pkg, harnessSnapshot, transformedHarnessScripts);

  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2), "utf8");
}

/**
 * Copies a local template tree into `targetDir` the same way giget results are
 * copied (including dot directories like `.harness/`). Used by tests; production
 * still downloads via giget then uses the same `fse.copy` behavior.
 */
export async function copyLocalTemplateTree(sourceDir: string, targetDir: string): Promise<void> {
  const entries = fs.readdirSync(sourceDir, { withFileTypes: true });
  for (const entry of entries) {
    const src = path.join(sourceDir, entry.name);
    const dest = path.join(targetDir, entry.name);
    await fse.copy(src, dest, { overwrite: true });
  }
}

/**
 * Resolves the template to a giget spec (repo#branch), downloads it to a temp
 * dir, copies contents into targetDir, removes the unselected solidity framework
 * package(s), updates root package.json, runs manifest post-processing, and inits git.
 */
export async function copyTemplateFiles(
  options: Options,
  targetDir: string,
): Promise<{ outroSteps?: string[]; outroInstallCommand?: string }> {
  const spec = getTemplateSpec(options.template as string);
  const tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "create-scaffold-hbar-"));

  try {
    await downloadTemplate(`gh:${spec}`, { dir: tmpDir });
    await copyLocalTemplateTree(tmpDir, targetDir);

    removeUnselectedFrameworkPackages(targetDir, options.solidityFramework);
    if (options.frontend === "none") {
      removeNextjsPackage(targetDir);
    }
    normalizeWorkspacePackagesForNpm(targetDir, options.solidityFramework, options.frontend, options.packageManager);
    filterRootPackageJson(targetDir, options.solidityFramework, options.frontend, options.packageManager);

    // Remove Yarn-specific files when using npm to prevent conflicts
    removeYarnSpecificFiles(targetDir, options.packageManager);
    updateTextFilesForNpm(targetDir, options.packageManager);

    // Remove husky scripts from package.json when using npm (husky is yarn-specific)
    removeHuskyScripts(targetDir, options.packageManager);

    const outro = processTemplateManifest(targetDir, options.project);

    await execa("git", ["init"], { cwd: targetDir });
    await execa("git", ["checkout", "-b", "main"], { cwd: targetDir });

    return outro ?? {};
  } finally {
    await fs.promises.rm(tmpDir, { recursive: true, force: true });
  }
}
