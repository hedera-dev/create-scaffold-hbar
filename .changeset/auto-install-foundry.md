---
"create-scaffold-hbar": minor
---

Install Foundry automatically when the user selects it and `forge` is missing or older than 1.4.0, using the official installer plus `foundryup`. Latest is installed unpinned: the Hedera JSON-RPC relay accepts EIP-1898 block objects as of relay 0.80.x ([hiero-json-rpc-relay#5826](https://github.com/hiero-ledger/hiero-json-rpc-relay/issues/5826), verified live against testnet and mainnet Hashio), so the `forge >= 1.8.0` warning and the `foundryup -v v1.7.1` pin advice are obsolete and have been removed.

Guards on the automatic install: Windows falls back to printed instructions, an outdated Homebrew-managed `forge` defers to `brew upgrade foundry` rather than installing a second toolchain, and `PATH` is only extended with `~/.foundry/bin` when `forge` does not already resolve, so an existing install is never shadowed.

Hardhat needs no equivalent step — it is a workspace devDependency and arrives with the dependency install — so selecting it just notes that.
