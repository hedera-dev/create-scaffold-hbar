---
"scaffold-hbar": minor
---

Raise the Node.js requirement to >= 22.23.4.

The CLI accepted Node >= 20.18.3 while every template pins `>=22.23.4 <23`. Node 20
received no vendor fix for the 2026-10-21 runtime advisories, and a template's `engines`
range is documentation only — Yarn 3 enforces neither it nor a root preinstall script —
so nothing stopped a scaffold from being created and installed on an unpatched runtime.
This check is now the gate.

Scaffolding on Node 20 or 21 fails with a clear message instead of silently producing a
project its own toolchain does not support.

The check now reads `process.version` — the runtime actually executing the CLI — instead
of shelling out to `node --version`, which reported whichever `node` came first on
`PATH`. Under nvm, mise or Volta those are different, and the old check was wrong in both
directions: it rejected a supported runtime invoked by absolute path, and let an
unsupported one through whenever a newer `node` happened to sit earlier on `PATH`.
