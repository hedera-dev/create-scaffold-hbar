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

The install docs now present `npm create scaffold-hbar` as a legacy fallback rather than
an equal alternative, because the `create-scaffold-hbar` alias is deprecated on npm.
