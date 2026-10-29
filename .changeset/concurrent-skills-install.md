---
"create-scaffold-hbar": patch
---

Run the Hedera Skills install concurrently with dependency installation. Both steps are network-bound and write to disjoint paths (`node_modules/` vs `.claude/`), so the skills download now happens inside the much longer dependency install instead of after it. Measured on a `--yes -s hardhat` scaffold: ~48.5s → ~36s (the ~8s skills step is fully hidden). Skip reasons, failure messages, and the exit code 5 install-failure path are unchanged.
