# create-scaffold-hbar

## 0.4.0

### Minor Changes

- 3d401d3: Quiet yarn/skills/`forge install` output under Listr status, structured template outro (`sections`, `{run:framework:…}`), and an offline template registry to avoid GitHub rate limits. Prefer `outro.sections` (`outro.steps` remains accepted but deprecated). Default outro frontend command is `next:dev`.

### Patch Changes

- e8fa929: Rename the Tokenize Subscriptions CLI key from `tokenise-subscriptions` to `tokenize-subscriptions`. The old key is not kept as an alias.

## 0.2.8

### Patch Changes

- Align harness handoff with `harness:run` / hedera-harness project-centric flow (replacing the legacy `harness:extend` naming in docs, fixtures, and recipe preservation).

## 0.2.5

### Patch Changes

- 8736096: Update template select prompt labels: "Hedera Demo" → "Hedera Native", "Payments Scheduler" → "Onchain Cron Job", and "Tokenise Subscriptions" → "Tokenize Subscriptions".

## 0.1.3

### Patch Changes

- dc9c448: Only support yarn package manager
- add install hedera skills and manage external templates
