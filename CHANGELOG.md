# create-scaffold-hbar

## 0.5.0

### Minor Changes

- 9028513: Install Foundry automatically when the user selects it and `forge` is missing or older than 1.4.0, using the official installer plus `foundryup`. Latest is installed unpinned: the Hedera JSON-RPC relay accepts EIP-1898 block objects as of relay 0.80.x ([hiero-json-rpc-relay#5826](https://github.com/hiero-ledger/hiero-json-rpc-relay/issues/5826), verified live against testnet and mainnet Hashio), so the `forge >= 1.8.0` warning and the `foundryup -v v1.7.1` pin advice are obsolete and have been removed.

  Guards on the automatic install: Windows falls back to printed instructions, an outdated Homebrew-managed `forge` defers to `brew upgrade foundry` rather than installing a second toolchain, and `PATH` is only extended with `~/.foundry/bin` when `forge` does not already resolve, so an existing install is never shadowed.

  Hardhat needs no equivalent step — it is a workspace devDependency and arrives with the dependency install — so selecting it just notes that.

### Patch Changes

- 5073cf7: Run the Foundry library clones concurrently with the dependency install.

  `forge install` clones four git submodules (~19MB, mostly openzeppelin-contracts) and
  used to run in the final git task, after `yarn install` had already finished — about
  16s with nothing overlapping it. It now joins the install group, which hides it inside
  the longer dependency install: a default Foundry scaffold drops from ~51s to ~33s,
  matching Hardhat.

  Because the libs land before the initial commit, the two `git commit --amend` passes
  that used to fold them in are gone; one `git add -A` now captures everything.

- 725545c: Run the Hedera Skills install concurrently with dependency installation. Both steps are network-bound and write to disjoint paths (`node_modules/` vs `.claude/`), so the skills download now happens inside the much longer dependency install instead of after it. Measured on a `--yes -s hardhat` scaffold: ~48.5s → ~36s (the ~8s skills step is fully hidden). Skip reasons, failure messages, and the exit code 5 install-failure path are unchanged.
- 25d29c7: Start the template-list fetch before the project-name prompt instead of between that prompt and the template menu, so the GitHub request overlaps with the user typing. Removes a silent stall (462ms measured, up to the 10s request timeout on a slow connection) that had no spinner or message. The prefetch is gated so `--template`, `--yes` and `--ci` continue to make no network calls at all.
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
