## Introduction

Welcome to the guide for developing third-party templates for `create-scaffold-hbar`.

`create-scaffold-hbar` supports:

- Built-in templates (for example: `blank`, `payments-scheduler`)
- Community templates from GitHub using `owner/repo` (optionally with `#branch`)

Use your template repository via:

```bash
npx create-scaffold-hbar@latest --template {github-owner}/{template-repo}
```

Or with an explicit branch:

```bash
npx create-scaffold-hbar@latest --template {github-owner}/{template-repo}#{branch}
```

## Supported Template Workflows

`create-scaffold-hbar` supports template modules (`-t`) or template registries.

Use one of these two workflows:

1. **Fork-first workflow (recommended):**
   - Fork [`hedera-dev/scaffold-hbar`](https://github.com/hedera-dev/scaffold-hbar)
   - Keep only the template shape you want to distribute
   - Publish and version your template branches

2. **Scaffold-then-curate workflow:**
   - Run `create-scaffold-hbar` to generate a new project
   - Customize that generated project
   - Extract/commit the resulting template-ready structure into your own repo
   - Publish and reference it via `--template owner/repo[#branch]`

## Third-Party Template Repository Structure

```text
your-template-repo/
├── packages/
│   ├── foundry/
│   │   └── ...
│   ├── hardhat/
│   │   └── ...
│   └── nextjs/
│       └── ...
├── .gitignore
└── README.md
```

## Key Guidelines

1. Keep your repository focused on templates, not extension patches.
2. If you add or modify templated files, keep links aligned with [`TEMPLATE-FILES.md`](./TEMPLATE-FILES.md) where applicable.
3. Include clear setup instructions in your repository `README.md`.
4. Prefer stable branch names for installability, and use `#branch` only when needed.

## Creating a Third-Party Template

1. Start from a clean repository.
2. Add `packages/foundry`, `packages/hardhat`, and/or `packages/nextjs` based on what your template supports.
3. Implement your customizations in those package directories.
4. Push to GitHub.
5. Test with:

```bash
npx create-scaffold-hbar@latest --template {github-owner}/{template-repo}
```

## Local Testing Workflow

To iterate quickly while authoring templates:

1. Clone `create-scaffold-hbar` locally.
2. Run:

```bash
yarn install
yarn build:dev
```

3. Run the local CLI against your template repo:

```bash
yarn cli --template {github-owner}/{template-repo}
```

4. Repeat until scaffolded output matches your expected result.

## Publishing and Versioning

- Publish template updates through normal Git workflow.
- If you need predictable installs, publish template changes on a dedicated branch and document it.
- When sharing usage examples, prefer explicit commands, for example:

```bash
npx create-scaffold-hbar@latest --template {github-owner}/{template-repo}#{branch}
```

## Notes

- Third-party customization should be provided through templates (`--template`).
