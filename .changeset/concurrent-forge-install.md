---
"create-scaffold-hbar": patch
---

Run the Foundry library clones concurrently with the dependency install.

`forge install` clones four git submodules (~19MB, mostly openzeppelin-contracts) and
used to run in the final git task, after `yarn install` had already finished — about
16s with nothing overlapping it. It now joins the install group, which hides it inside
the longer dependency install: a default Foundry scaffold drops from ~51s to ~33s,
matching Hardhat.

Because the libs land before the initial commit, the two `git commit --amend` passes
that used to fold them in are gone; one `git add -A` now captures everything.
