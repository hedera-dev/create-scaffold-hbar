# Developer Guide

This repo is the source of the CLI that users consume via `npx`. It is maintainer
documentation — the user-facing docs are in the [README](../README.md).

Projects created by the CLI are referred to here as "instance projects", to keep them
distinct from this repo.

## Setup

```bash
git clone https://github.com/hedera-dev/create-scaffold-hbar.git
cd create-scaffold-hbar
yarn install
```

The CLI runs from compiled output in `dist/`, so build it before running:

```bash
yarn build
```

`yarn dev` watches instead, rebuilding as you save.

## Scripts

| Script               | What it does                         |
| -------------------- | ------------------------------------ |
| `yarn build`         | Compile to `dist/` and write the bin |
| `yarn dev`           | Rebuild on save                      |
| `yarn cli`           | Run the compiled CLI                 |
| `yarn type-check`    | `tsc --noEmit`                       |
| `yarn lint`          | ESLint                               |
| `yarn format`        | Prettier, writing in place           |
| `yarn test`          | Vitest, single run                   |
| `yarn test:watch`    | Vitest, watch mode                   |
| `yarn test:coverage` | Vitest with coverage                 |

Pre-commit hooks (lefthook) run format, type-check and lint on staged files.

If a commit fails with `Unknown commands: run, csjones/lefthook-plugin`, lefthook's
binary lookup fell through to an unrelated `mint` on your `PATH`. Commit with
`LEFTHOOK=0 git commit …` and run `yarn format`, `yarn type-check` and `yarn lint`
by hand. Note that `--no-verify` is not enough — it skips `pre-commit` but not
`prepare-commit-msg`.

## Running the CLI

```bash
# Interactive: prompts for everything
yarn cli --skip-install

# Non-interactive: default project name, no install, no Foundry check
yarn cli --yes --skip-install --solidity-framework none

# Non-interactive with Hardhat
yarn cli --yes --skip-install --solidity-framework hardhat

# Custom project name and template
yarn cli my-hts-app --template payments-scheduler --frontend nextjs-app --skip-install

# See all options
yarn cli --help
```

`yarn cli` scaffolds into the current directory, so these create projects inside the
repo. To keep it out of the working tree, pass a path outside it:

```bash
yarn cli /tmp/my-hedera-dapp --yes --skip-install
```

## E2E scenarios (manual check)

After `yarn build`, from the repo root:

| Scenario        | Command                                                                                       | What to check                         |
| --------------- | --------------------------------------------------------------------------------------------- | ------------------------------------- |
| Help            | `yarn cli --help`                                                                             | All options listed                    |
| Default         | `yarn cli e2e-scenarios/default --yes --skip-install`                                         | Scaffold + skip install               |
| Solidity none   | `yarn cli e2e-scenarios/sol-none --yes --skip-install -s none`                                | No "and submodules"                   |
| Hardhat         | `yarn cli e2e-scenarios/sol-hardhat --yes --skip-install -s hardhat`                          | `packages/hardhat` + `nextjs`         |
| Custom flags    | `yarn cli e2e-scenarios/custom --yes --skip-install -t blank -f nextjs-app --network mainnet` | Scaffold with defaults                |
| Install failure | `yarn cli e2e-scenarios/with-install --yes -s hardhat`                                        | Exit code **5**, InstallError message |

Output goes under `e2e-scenarios/` (gitignored).

## Project layout

```
create-scaffold-hbar/
├── bin/                  # CLI entry (points to dist/)
├── src/
│   ├── cli.ts            # Main CLI flow
│   ├── main.ts           # createProject task list
│   ├── types.ts          # Shared types
│   ├── utils/            # Prompts, parsing, validation, intro/outro
│   └── tasks/            # Copy template (giget), install, git, format
├── tests/
│   ├── unit/             # Unit tests
│   └── integration/      # Integration tests (prompts)
└── dist/                 # Built output (yarn build)
```

Templates are not embedded here. The CLI fetches them with
[giget](https://github.com/unjs/giget) from branches of
[`hedera-dev/scaffold-hbar`](https://github.com/hedera-dev/scaffold-hbar), named like
`templates/blank-template`. See [`TEMPLATES.md`](./TEMPLATES.md) for that flow and
[`THIRD-PARTY-TEMPLATES.md`](./THIRD-PARTY-TEMPLATES.md) for external ones.

## Adding or removing a new project type

- [ ] Update the [`TEMPLATES.md`](./TEMPLATES.md) file to include or remove the template file.
- [ ] (optional) If the file was removed then we add the changeset as `minor` update.
