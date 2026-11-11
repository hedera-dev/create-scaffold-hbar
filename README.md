# create-scaffold-hbar

**Scaffold Hedera dApp projects from the command line.** Pick a template, frontend, and Solidity framework—then get a runnable project in one step.

create-scaffold-hbar is an interactive CLI (like `create-next-app` or `create-react-app`) for the [Hedera](https://hedera.com) ecosystem. It fetches a **template from a Git branch** (via [giget](https://github.com/unjs/giget)), then generates a monorepo with contracts (Hardhat or Foundry), frontend (Next.js), and Hedera network configuration. There are **no embedded templates** in the CLI repo and **no extension system**—templates are branches in the template repo (e.g. `templates/blank-template`).

---

## Features

- **Starter templates** — Blank Starter, Bridge, Cross-Chain DCA, Hedera Native, Oracles, Onchain Cron Job, Tokenize Subscriptions, or x402 Pay-Per-Use (template = branch name; list from GitHub API with fallback)
- **Frontend** — Next.js (App Router)
- **Solidity** — Hardhat or Foundry (or none)
- **Networks** — Testnet or Mainnet (Hashio RPC + Mirror Node URLs)
- **Non-interactive** — Use `--yes` or full flags for CI and scripts
- **Hedera Skills (on by default)** — Interactive prompt (default yes) or `--yes` / `--ci` installs the marketplace unless you pass `--skip-hedera-skills`; runs `npx skills add hedera-dev/hedera-skills --all` ([repo](https://github.com/hedera-dev/hedera-skills))

---

## Prerequisites

- **Node.js** ≥ 22.23.4 (the 22.x line)  
  [nodejs.org](https://nodejs.org/) — Node 20 has no vendor fix for the 2026-10-21 runtime
  advisories, and the templates target 22.x, so they pin `>=22.23.4 <23`.
- **Git** (with `user.name` and `user.email` configured)  
  [git-scm.com](https://git-scm.com/)
- **Yarn or npm** — Yarn is the default and recommended; npm is fully supported  
  (the CLI converts the project to npm workspaces).  
  Install Yarn via Corepack: `corepack enable && corepack prepare yarn@stable --activate`

If you choose **Foundry** as the Solidity framework, Foundry is **installed automatically**
when `forge` is missing (or older than 1.4.0), using the official installer plus `foundryup`.
This writes to `~/.foundry` and updates your shell profile. To set it up yourself beforehand:

- **Official installer** (includes `forge` and `foundryup`):
  ```bash
  curl -L https://foundry.paradigm.xyz | bash
  ```
  Then restart your terminal and run:
  ```bash
  foundryup
  ```
- **Homebrew** (macOS):
  ```bash
  brew install foundry
  ```
  Update later with `brew upgrade foundry` (Homebrew does not install the `foundryup` command).

Notes on the automatic install:

- **Windows** is not auto-installed (the installer is a shell script); the CLI prints the
  commands above instead.
- A **Homebrew**-managed `forge` that is too old is _not_ replaced, since that would leave two
  toolchains with `~/.foundry/bin` shadowing the brew one. The CLI asks you to run
  `brew upgrade foundry`.
- If `forge` already resolves on your `PATH`, the CLI leaves `PATH` alone, so an existing
  install is never shadowed by one in `~/.foundry/bin`.

If you choose **Hardhat** or **none**, no extra install is required — Hardhat is a workspace
dependency and arrives with your dependency install.

---

## Quick start (run from npm)

Create a new Hedera dApp without cloning this repo:

```bash
npm create scaffold-hbar@latest
```

`npx create-scaffold-hbar@latest` is equivalent and needs no `--` before flags.

You’ll get interactive prompts for all projects' options. A prompt is skipped when the chosen template allows only one answer.

To accept all defaults and skip prompts (Yarn, unless the template overrides it):

```bash
npm create scaffold-hbar@latest -- --yes
```

To skip installing dependencies (e.g. to install yourself later):

```bash
npm create scaffold-hbar@latest -- --yes --skip-install
```

With `--yes` or `--ci`, Hedera Skills are **installed by default** (same non-interactive `npx skills add hedera-dev/hedera-skills --all` step). To skip them:

```bash
npm create scaffold-hbar@latest -- --yes --skip-hedera-skills
```

---

## CLI options

| Option                          | Description                                                                                          |
| ------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `[project-name]`                | Project directory name (or use `--destination`)                                                      |
| `-d, --destination <path>`      | Output path instead of positional name                                                               |
| `-t, --template <key>`          | Built-in (`blank`, `payments-scheduler`, …) or `org/repo`                                            |
| `-f, --frontend <fw>`           | `nextjs-app` \| `none` (contracts only)                                                              |
| `-s, --solidity-framework <fw>` | `foundry` \| `hardhat` \| `none`                                                                     |
| `--network <network>`           | `testnet` \| `mainnet`                                                                               |
| `--package-manager <pm>`        | `yarn` \| `npm` \| `none` (template-managed, skips install)                                          |
| `--skip-install`                | Don’t run install after scaffolding                                                                  |
| `--install-hedera-skills`       | Install Hedera Skills (`npx skills add … --all`); default with `--yes` unless `--skip-hedera-skills` |
| `--skip-hedera-skills`          | Do not install Hedera Skills (cannot combine with `--install-hedera-skills`)                         |
| `-y, --yes`                     | Use defaults for all prompts (non-interactive)                                                       |
| `--ci`                          | CI mode (implies `--yes`, structured output)                                                         |
| `-h, --help`                    | Show help                                                                                            |
| `-v, --version`                 | Show version                                                                                         |
| `--log-level <level>`           | Log verbosity: `error` \| `warn` \| `info` (default) \| `verbose` \| `debug`                         |

---

## Project structure

```
create-scaffold-hbar/
├── bin/create-scaffold-hbar.js    # CLI entry (points to dist/)
├── src/
│   ├── cli.ts            # Main CLI flow
│   ├── main.ts           # createProject task list
│   ├── types.ts          # Shared types
│   ├── utils/            # Prompts, parsing, validation, intro/outro
│   └── tasks/            # Copy template (giget), install, git, format
├── tests/
│   ├── unit/             # Unit tests (consts, types, parse-arguments)
│   └── integration/      # Integration tests (prompts)
└── dist/                 # Built output (generated by yarn build)
```

Templates are **not** embedded: the CLI fetches them via giget from the template repo (branch names like `templates/blank-template`). See `contributors/TEMPLATES.md` for the flow.

---

## Links

- [Hedera Developer Portal](https://docs.hedera.com/)
- [Hedera Documentation](https://docs.hedera.com/hedera/core-concepts/)
- [Get testnet HBAR](https://portal.hedera.com/)

---

## License

MIT
