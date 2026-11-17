---
"scaffold-hbar": patch
---

Drop the legacy `npm create scaffold-hbar` note from the Quick Start.

The Quick Start is where new users learn the command, and explaining the old name there
taught them a name they would otherwise never encounter. Nothing about the alias changes:
it stays published and keeps working. The deprecation is already surfaced where people
actually hit it — npm's install warning, the alias's own runtime banner, and the
deprecation note on the docs page. Contributor-facing details stay in CONTRIBUTING.
