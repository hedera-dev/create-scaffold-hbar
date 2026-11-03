---
"scaffold-hbar": minor
---

**Renamed the published package from `create-scaffold-hbar` to `scaffold-hbar`.**

The CLI is now run as `npx scaffold-hbar@latest`. `npm create scaffold-hbar@latest`
keeps working: `npm create <x>` resolves to `create-<x>`, so `create-scaffold-hbar`
is still published as a thin alias that forwards to this package.

**Renamed alongside the package:**

- Bin entry: `bin/create-scaffold-hbar.js` → `bin/scaffold-hbar.js`
- Local template seam: `CREATE_SCAFFOLD_HBAR_TEMPLATE_DIR` → `SCAFFOLD_HBAR_TEMPLATE_DIR`
  (the old variable is still honoured for one release)
- `template.json` manifest block: `scaffold-hbar` is now the canonical key. The former
  `create-scaffold-hbar` and `create-hbar` spellings are still accepted and normalized
  to it, so existing templates need no change. A manifest carrying more than one
  spelling keeps the newest.

Intro banner, `--help` name, requirement errors and the initial commit message of
scaffolded projects now read `scaffold-hbar`.
