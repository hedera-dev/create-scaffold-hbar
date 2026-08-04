/** Tracked recipe directory copied from templates into scaffolded projects. */
export const HARNESS_RECIPE_DIR = ".harness";

/** Runtime / cache paths under `.harness/` that templates may ignore (not rewritten either). */
export const HARNESS_RUNTIME_DIR_NAMES = new Set(["runs", "cache", "runtime"]);

/**
 * True when `relativePath` is inside the tracked `.harness/` recipe tree.
 * Accepts OS-specific separators; compares as posix.
 */
export function isUnderHarnessRecipeDir(relativePath: string): boolean {
  const normalized = relativePath.replace(/\\/g, "/").replace(/^\.\//, "");
  return normalized === HARNESS_RECIPE_DIR || normalized.startsWith(`${HARNESS_RECIPE_DIR}/`);
}

/**
 * npm-mode text rewrite must not touch harness recipe files (YAML/JSON/Markdown/etc.).
 * Validator commands like `yarn install --immutable` must stay yarn for the pilot.
 */
export function shouldSkipNpmTextRewrite(relativePath: string): boolean {
  return isUnderHarnessRecipeDir(relativePath);
}

/** Root package script keys owned by hedera-harness (must survive package filtering). */
export function isHarnessScriptKey(scriptKey: string): boolean {
  return scriptKey === "harness:extend" || scriptKey.startsWith("harness:");
}

export function isHederaHarnessPackageName(name: string): boolean {
  return name === "hedera-harness";
}

/**
 * Snapshot harness-owned root package.json fields before transforms that may
 * rewrite or drop unrelated scripts.
 */
export function snapshotHarnessPackageFields(pkg: Record<string, unknown>): {
  scripts: Record<string, string>;
  dependencyEntries: Array<{ field: "dependencies" | "devDependencies"; name: string; version: string }>;
} {
  const scripts: Record<string, string> = {};
  if (pkg.scripts && typeof pkg.scripts === "object") {
    for (const [key, value] of Object.entries(pkg.scripts as Record<string, unknown>)) {
      if (isHarnessScriptKey(key) && typeof value === "string") {
        scripts[key] = value;
      }
    }
  }

  const dependencyEntries: Array<{
    field: "dependencies" | "devDependencies";
    name: string;
    version: string;
  }> = [];
  for (const field of ["dependencies", "devDependencies"] as const) {
    const deps = pkg[field];
    if (!deps || typeof deps !== "object") continue;
    for (const [name, version] of Object.entries(deps as Record<string, unknown>)) {
      if (isHederaHarnessPackageName(name) && typeof version === "string") {
        dependencyEntries.push({ field, name, version });
      }
    }
  }

  return { scripts, dependencyEntries };
}

/**
 * Restore harness scripts/deps after root package filtering.
 * Script values are taken from `transformedScripts` when present (so yarn→npm
 * rewrite of `harness:extend` is kept); otherwise the pre-filter snapshot is used.
 */
export function restoreHarnessPackageFields(
  pkg: Record<string, unknown>,
  snapshot: ReturnType<typeof snapshotHarnessPackageFields>,
  transformedScripts?: Record<string, string>,
): void {
  if (!pkg.scripts || typeof pkg.scripts !== "object") {
    pkg.scripts = {};
  }
  const scripts = pkg.scripts as Record<string, string>;
  for (const [key, original] of Object.entries(snapshot.scripts)) {
    scripts[key] = transformedScripts?.[key] ?? original;
  }

  for (const { field, name, version } of snapshot.dependencyEntries) {
    const current = pkg[field];
    if (!current || typeof current !== "object") {
      pkg[field] = { [name]: version };
    } else {
      (current as Record<string, string>)[name] = version;
    }
  }
}
