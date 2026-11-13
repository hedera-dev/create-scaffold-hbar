#!/usr/bin/env node
// `npm create scaffold-hbar` resolves to `create-scaffold-hbar`, so this package
// exists purely to forward to the real CLI. Version and dependency pin are kept in
// lockstep with the root package.json by scripts/sync-alias-version.js.
import process from "node:process";

import { cli } from "scaffold-hbar";

cli(process.argv);
