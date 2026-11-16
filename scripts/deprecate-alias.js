#!/usr/bin/env node
/**
 * Re-applies the npm deprecation to every published version of the alias.
 *
 * `npm deprecate` writes per-version metadata, so each `npm publish ./alias` puts a
 * fresh, NOT-deprecated version on the registry and silently undoes the deprecation.
 * Running this as part of `alias:publish` is what keeps that from being a chore someone
 * has to remember.
 *
 * It deprecates the bare package name rather than the version just published, so one
 * run covers the whole back catalogue as well as the new release. That makes it
 * idempotent and independent of ordering: an earlier version of this script targeted
 * `name@version`, which left 1.1.1 undeprecated when the steps ran out of order.
 */
import console from "node:console";
import { execFileSync } from "node:child_process";
import fs from "fs";
import path from "path";
import process from "node:process";
import { fileURLToPath } from "url";

/** Single source of truth for the message users see on install. */
export const DEPRECATION_MESSAGE =
  "create-scaffold-hbar is now only an alias. The CLI moved to the 'scaffold-hbar' package - use 'npx scaffold-hbar@latest' instead.";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const aliasPath = path.join(__dirname, "..", "alias", "package.json");
const { name } = JSON.parse(fs.readFileSync(aliasPath, "utf8"));

console.log(`Deprecating every published version of ${name}`);

try {
  execFileSync("npm", ["deprecate", name, DEPRECATION_MESSAGE], { stdio: "inherit" });
  console.log(`${name} is deprecated.`);
} catch {
  // A failed deprecate must not look like a failed release - the publish already
  // succeeded by this point, and the fix is to re-run this one command.
  console.error(
    `\nCould not deprecate ${name}. The publish itself succeeded; re-apply it with:\n` +
      `  npm deprecate ${name} "${DEPRECATION_MESSAGE}"\n`,
  );
  process.exitCode = 1;
}
