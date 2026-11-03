#!/usr/bin/env node
/**
 * Writes bin/scaffold-hbar.js so the CLI can be run via the bin entry.
 * Run after rollup build (dist/cli.js must exist).
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const content = `#!/usr/bin/env node
import { cli } from "../dist/cli.js";

cli(process.argv);
`;

const binDir = path.join(__dirname, "..", "bin");
const binPath = path.join(binDir, "scaffold-hbar.js");

fs.mkdirSync(binDir, { recursive: true });
fs.writeFileSync(binPath, content, "utf8");
fs.chmodSync(binPath, 0o755);
