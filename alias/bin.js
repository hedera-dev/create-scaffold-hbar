#!/usr/bin/env node
// `npm create scaffold-hbar` resolves to `create-scaffold-hbar`, so this package
// exists purely to forward to the real CLI. Version and dependency pin are kept in
// lockstep with the root package.json by scripts/sync-alias-version.js.
import console from "node:console";
import process from "node:process";

import { cli } from "scaffold-hbar";

// npm's own deprecation warning is one line that scrolls past in the install output, and
// it never appears at all on a warm npx cache. This is the notice users actually read.
// stderr, never stdout, so it cannot corrupt piped or parsed output.
console.warn(
  [
    "",
    "  ┌──────────────────────────────────────────────────────────────┐",
    "  │  The Scaffold HBAR CLI has moved to the 'scaffold-hbar'      │",
    "  │  package. Please use this from now on:                       │",
    "  │                                                              │",
    "  │      npx scaffold-hbar@latest                                │",
    "  │                                                              │",
    "  │  'create-scaffold-hbar' is now only a deprecated alias. It   │",
    "  │  keeps working, so nothing breaks today.                     │",
    "  └──────────────────────────────────────────────────────────────┘",
    "",
  ].join("\n"),
);

cli(process.argv);
