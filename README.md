# create-scaffold-hbar

**Scaffold Hedera dApp projects from the command line.** Pick a template, frontend, and Solidity framework—then get a runnable project in one step.

create-scaffold-hbar is an interactive CLI (like `create-next-app` or `create-react-app`) for the [Hedera](https://hedera.com) ecosystem. It fetches a **template from a Git branch** (via [giget](https://github.com/unjs/giget)), then generates a monorepo with contracts (Hardhat or Foundry), frontend (Next.js), and Hedera network configuration. There are **no embedded templates** in the CLI repo and **no extension system**—templates are branches in the template repo (e.g. `templates/blank-template`).

---

## Features

- **Starter templates** — Blank, HTS fungible, HTS NFT, HCS DAO, or DeFi swap (template = branch name; list from GitHub API with fallback)
- **Frontend** — Next.js (App Router)
- **Solidity** — Hardhat or Foundry (or none)
- **Networks** — Testnet or Mainnet (Hashio RPC + Mirror Node URLs)
- **Non-interactive** — Use `--yes` or full flags for CI and scripts
- **Hedera Skills (on by default)** — Interactive prompt (default yes) or `--yes` / `--ci` installs the marketplace unless you pass `--skip-hedera-skills`; runs `npx skills add hedera-dev/hedera-skills --all` ([repo](https://github.com/hedera-dev/hedera-skills))

---

## Prerequisites

- **Node.js** ≥ 20.18.3  
  [nodejs.org](https://nodejs.org/)
- **Git** (with `user.name` and `user.email` configured)  
  [git-scm.com](https://git-scm.com/)
- **Yarn** (the scaffolded projects use Yarn workspaces; npm and pnpm are not supported)  
  Install via Corepack: `corepack enable && corepack prepare yarn@stable --activate`

If you choose **Foundry** as the Solidity framework, you need Foundry installed:

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

If you choose **Hardhat** or **none**, no extra install is required.

---

## Quick start (run from npm)

Create a new Hedera dApp without cloning this repo:

```bash
npx create-scaffold-hbar@latest
```

You’ll get interactive prompts for project name, template, frontend, framework, and network. Yarn is used automatically as the package manager. To accept all defaults and skip prompts:

```bash
npx create-scaffold-hbar@latest --yes
```

To skip installing dependencies (e.g. to install yourself later):

```bash
npx create-scaffold-hbar@latest --yes --skip-install
```

With `--yes` or `--ci`, Hedera Skills are **installed by default** (same non-interactive `npx skills add hedera-dev/hedera-skills --all` step). To skip them:

```bash
npx create-scaffold-hbar@latest --yes --skip-hedera-skills
```

---

## Running locally (development)

Use this when you’re working on the create-scaffold-hbar CLI itself.

### 1. Clone and install

```bash
git clone https://github.com/hedera-dev/create-scaffold-hbar.git
cd create-scaffold-hbar
yarn install
```

### 2. Build

The CLI runs from compiled output in `dist/`:

```bash
yarn build
```

### 3. Run the CLI

From the repo root:

```bash
node bin/create-scaffold-hbar.js [project-name] [options]
```

Or use the `cli` script:

```bash
yarn cli
```

**Examples (run from repo root):**

```bash
# Interactive: prompts for everything
node bin/create-scaffold-hbar.js --skip-install

# Non-interactive: default project name, no install, no Foundry check
node bin/create-scaffold-hbar.js --yes --skip-install --solidity-framework none

# Non-interactive with Hardhat
node bin/create-scaffold-hbar.js --yes --skip-install --solidity-framework hardhat

# Custom project name and template
node bin/create-scaffold-hbar.js my-hts-app --template payments-scheduler --frontend nextjs-app --skip-install

# See all options
node bin/create-scaffold-hbar.js --help
```

To avoid creating the project inside the repo, run from another directory:

```bash
cd /tmp
node /path/to/create-scaffold-hbar/bin/create-scaffold-hbar.js --yes --skip-install my-hedera-dapp
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
| `--skip-install`                | Don’t run install after scaffolding                                                                  |
| `--install-hedera-skills`       | Install Hedera Skills (`npx skills add … --all`); default with `--yes` unless `--skip-hedera-skills` |
| `--skip-hedera-skills`          | Do not install Hedera Skills (cannot combine with `--install-hedera-skills`)                         |
| `-y, --yes`                     | Use defaults for all prompts (non-interactive)                                                       |
| `--ci`                          | CI mode (implies `--yes`, structured output)                                                         |
| `-h, --help`                    | Show help                                                                                            |
| `-v, --version`                 | Show version                                                                                         |

---

## Development (contributing)

- **Typecheck:** `yarn type-check`
- **Lint:** `yarn lint`
- **Format:** `yarn format`
- **Tests:** `yarn test`
- **Tests (watch):** `yarn test:watch`
- **Coverage:** `yarn test:coverage`

Pre-commit hooks (lefthook) run format, type-check, and lint.

---

## E2E scenarios (manual check)

From the repo root after `yarn build`, you can run:

| Scenario        | Command                                                                                                               | What to check                         |
| --------------- | --------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| Help            | `node bin/create-scaffold-hbar.js --help`                                                                             | All options listed                    |
| Default         | `node bin/create-scaffold-hbar.js e2e-scenarios/default --yes --skip-install`                                         | Scaffold + skip install               |
| Solidity none   | `node bin/create-scaffold-hbar.js e2e-scenarios/sol-none --yes --skip-install -s none`                                | No "and submodules"                   |
| Hardhat         | `node bin/create-scaffold-hbar.js e2e-scenarios/sol-hardhat --yes --skip-install -s hardhat`                          | `packages/hardhat` + `nextjs`         |
| Custom flags    | `node bin/create-scaffold-hbar.js e2e-scenarios/custom --yes --skip-install -t blank -f nextjs-app --network mainnet` | Scaffold with defaults                |
| Install failure | `node bin/create-scaffold-hbar.js e2e-scenarios/with-install --yes -s hardhat`                                        | Exit code **5**, InstallError message |

Output goes under `e2e-scenarios/` (gitignored).

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
