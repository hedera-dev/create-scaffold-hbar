#!/usr/bin/env node
/**
 * Pins alias/package.json to the root package version.
 *
 * The alias depends on an exact version of the real CLI, so publishing it with a
 * stale pin yields a package whose dependency does not exist yet. Deriving both
 * fields from the root package.json keeps that from being a hand-edit.
 */
import console from "node:console";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const { name, version } = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));

const aliasPath = path.join(root, "alias", "package.json");
const alias = JSON.parse(fs.readFileSync(aliasPath, "utf8"));

alias.version = version;
alias.dependencies[name] = version;

fs.writeFileSync(aliasPath, `${JSON.stringify(alias, null, 2)}\n`, "utf8");
console.log(`alias/package.json → ${alias.name}@${version} (depends on ${name}@${version})`);
