# create-scaffold-hbar

## 0.4.2

### Patch Changes

- 0bf6a25: Warn non-blockingly when forge >= 1.8.0 is detected: `forge script` deploys and fork tests against the Hedera JSON-RPC relay currently fail because the relay rejects EIP-1898 block objects ([hiero-json-rpc-relay#5826](https://github.com/hiero-ledger/hiero-json-rpc-relay/issues/5826)). Compiling and local tests are unaffected; the warning advises pinning `foundryup -v v1.7.1` until the relay ships support.
- 0ceaf14: Point the built-in template registry at `hedera-dev/scaffold-hbar` (the repo's current home; `buidler-labs/scaffold-hbar` only redirects). Drop create-eth-era leftovers: `funding.json`, yarn 1 `.yarnrc`, and the dead `bgipfs` script rewrite.

## 0.4.1

### Patch Changes

- c0f5afe: Drop template Foundry submodule entries before `forge install`, so scaffolding on forge 1.8+ does not fail when `.gitmodules` already lists those libraries.

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
