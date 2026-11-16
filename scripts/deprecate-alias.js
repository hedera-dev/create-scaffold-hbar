#!/usr/bin/env node
/**
 * Re-applies the npm deprecation to the alias version that was just published.
 *
 * `npm deprecate` writes per-version metadata, so every `npm publish ./alias` puts a
 * fresh, NOT-deprecated version on the registry and silently undoes the deprecation.
 * Running this as part of `alias:publish` is what keeps that from being a chore someone
 * has to remember.
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
const { name, version } = JSON.parse(fs.readFileSync(aliasPath, "utf8"));

const spec = `${name}@${version}`;
console.log(`Deprecating ${spec}`);

try {
  execFileSync("npm", ["deprecate", spec, DEPRECATION_MESSAGE], { stdio: "inherit" });
  console.log(`${spec} is deprecated.`);
} catch {
  // A failed deprecate must not look like a failed release - the publish already
  // succeeded by this point, and the fix is to re-run this one command.
  console.error(
    `\nCould not deprecate ${spec}. The publish itself succeeded; re-apply it with:\n` +
      `  npm deprecate ${spec} "${DEPRECATION_MESSAGE}"\n`,
  );
  process.exitCode = 1;
}
