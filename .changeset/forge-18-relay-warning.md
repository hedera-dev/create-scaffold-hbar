---
"create-scaffold-hbar": patch
---

Warn non-blockingly when forge >= 1.8.0 is detected: `forge script` deploys and fork tests against the Hedera JSON-RPC relay currently fail because the relay rejects EIP-1898 block objects ([hiero-json-rpc-relay#5826](https://github.com/hiero-ledger/hiero-json-rpc-relay/issues/5826)). Compiling and local tests are unaffected; the warning advises pinning `foundryup -v v1.7.1` until the relay ships support.
