---
"create-scaffold-hbar": patch
---

Drop template Foundry submodule entries before `forge install`, so scaffolding on forge 1.8+ does not fail when `.gitmodules` already lists those libraries.
