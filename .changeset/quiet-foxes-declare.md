---
"scaffold-hbar": patch
---

**Declare the supported Node range in `engines`.**

Both `scaffold-hbar` and the `create-scaffold-hbar` alias now set
`"engines": { "node": ">=22.23.4" }`, so npm warns at install time instead of leaving the
CLI's runtime check as the only gate. The bound matches what the CLI actually enforces —
`REQUIRED_NODE_VERSION` in `src/utils/system-validation.ts` is a lower bound only, so
Node 23 and later are in range. The templates' narrower `>=22.23.4 <23` is their own
Hardhat constraint, not the CLI's.

**The `create-scaffold-hbar` alias now tells people where the CLI went.** Running it
prints a notice pointing at `npx scaffold-hbar@latest` before the CLI starts, on stderr so
piped output is unaffected. npm's own deprecation warning is a single line that scrolls
past in install output and is skipped entirely on a warm npx cache, so it was not enough
on its own.

`yarn alias:publish` now re-applies the npm deprecation to the version it just published.
Deprecation is per-version metadata, so publishing the alias would otherwise silently
undo it on every release.

The install docs present `npm create scaffold-hbar` as a legacy fallback rather than an
equal alternative, since both routes through the alias are deprecated.
