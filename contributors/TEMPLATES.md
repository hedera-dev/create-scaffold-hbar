# Template flow (giget)

The CLI uses **giget** to download the chosen template. There are **no embedded templates** in the create-scaffold-hbar repo and **no extension system**. Template content lives in the template repo as **branch names** (e.g. `templates/blank-template`, `templates/payments-scheduler`).

## Flow

- **Template = branch name**: A built-in key (e.g. `blank`, `payments-scheduler`) is resolved to `https://github.com/buidler-labs/scaffold-hbar#templates/<branch>` (see `getTemplateSpec()` in `src/utils/fetch-available-templates.ts`). The `blank` key maps to branch `templates/blank-template`. Community templates use `org/repo` or `org/repo#branch` as-is.
- **List from GitHub API**: In interactive mode, the "Which starter template?" prompt is filled by calling the GitHub API (matching-refs for `templates/*`). If the request fails (e.g. offline), a **fallback list** from `TEMPLATES_FALLBACK` in `src/utils/consts.ts` is used.
- **Prompt constraints (`template.json`)**: Built-in starters resolve prompt capabilities from the **CLI template registry** (`src/utils/template-registry.ts`) without calling GitHub. Community templates (`org/repo#ref`) still load `template.json` from GitHub. Live `templates/*` branch discovery only **adds** branches not yet listed in the registry when the API is available.
- **Fetch**: `getTemplateSpec()` and `downloadTemplate(gh:spec)` in `src/tasks/copy-template-files.ts` download the template into a temp dir, then copy into the user's project directory.

## Built-in template registry

Known starters (labels, hints, frontend / solidity / package-manager capabilities) live in [`src/utils/template-registry.ts`](../src/utils/template-registry.ts). That file is the offline source of truth so rate limits and outages do not break the template menu or prompt constraints.

When you ship a new `templates/<name>` branch:

1. Add an entry to `TEMPLATE_REGISTRY` (capabilities/defaults must match that branch’s `template.json`).
2. Publish a CLI release that includes the registry update.

Until then, a successful live GitHub fetch can still surface the new branch in the menu, but capabilities will use permissive defaults until the registry entry exists.

## `template.json` — custom outro

Optional `create-scaffold-hbar.outro` replaces the default contract/frontend middle section of the CLI outro (after the shared header: congratulations, `cd`, optional install / Hedera Skills tips).

### Preferred: `outro.sections`

```json
{
  "create-scaffold-hbar": {
    "outro": {
      "sections": [
        {
          "title": "Next steps",
          "steps": [
            {
              "label": "Generate a deployer account",
              "command": "{run:framework:account:generate}"
            },
            {
              "label": "Fund with testnet HBAR",
              "url": "https://portal.hedera.com/faucet"
            },
            {
              "label": "Start the frontend",
              "command": "{run:next:dev}"
            },
            {
              "text": "Then customize contracts, UI, and operational controls."
            }
          ]
        }
      ]
    }
  }
}
```

Each step may include any of:

| Field     | Purpose                                                                                      |
| --------- | -------------------------------------------------------------------------------------------- |
| `label`   | Bold heading above the payload                                                               |
| `command` | Highlighted shell chip; supports `{run:script}`, `{run:framework:script}`, and trailing args |
| `url`     | Cyan link (not a chip)                                                                       |
| `text`    | Plain prose; supports `{run:script}`, `{run:framework:script}`, and `{pm}`                   |

`{run:script}` expands to the selected package manager command (`yarn script`, `npm run script`, or `pnpm script`). `{run:framework:script}` inserts the chosen Solidity framework (`hardhat` or `foundry`) before the script (e.g. `{run:framework:deploy}` → `yarn foundry:deploy`). `{pm}` expands to `yarn`, `npm`, or `pnpm` (when package manager is `none`).

Optional `outro.installCommand` overrides the shared skip-install hint (e.g. `"pnpm install"`).

When both `sections` and legacy `steps` are present, **`sections` wins**.

### Legacy: `outro.steps`

Flat string lines are still accepted and adapted into structured steps:

- Leading `+` → step `label`
- Following indented / command-looking lines → `command`, `url`, or `text`
- Prefer migrating to `sections` when you next touch a template

Example:

```json
{
  "create-scaffold-hbar": {
    "outro": {
      "steps": ["+Start the frontend:", "  {run:next:dev}", "+Run the harness recipe:", "  {run:harness:run}"]
    }
  }
}
```

Omit `outro` to keep the standard Scaffold-HBAR next-steps text.

## Optional `.harness/` recipes (hedera-harness)

Templates may ship a tracked **`.harness/`** directory (spec, PRD, validators, contracts) plus root package wiring:

```json
{
  "scripts": {
    "harness:run": "hedera-harness run .harness/spec.yaml"
  },
  "devDependencies": {
    "hedera-harness": "1.1.2"
  }
}
```

`create-scaffold-hbar` guarantees:

- Dot directories such as `.harness/` are copied into the project (same as other template files).
- npm-mode yarn→npm text rewrite **does not** modify files under `.harness/`, so recipe validator commands (often `yarn …`) are not silently rewritten.
- Root `harness:*` scripts and the `hedera-harness` dependency survive workspace/script filtering for solidity/frontend selection.

Ignore runtime paths in the template (do **not** commit them): `.harness/runs/`, `.harness/cache/`, `.harness/runtime/`, `.skill-cache/`. Keep the tracked recipe files.

Outro tip for harness-enabled templates:

```json
{
  "create-scaffold-hbar": {
    "outro": {
      "sections": [
        {
          "steps": [
            {
              "label": "Further develop this template with our agentic harness",
              "command": "{run:harness:run}"
            }
          ]
        }
      ]
    }
  }
}
```

## Template registry ownership

Built-in template resolution uses `TEMPLATE_REPO` in `src/utils/consts.ts` (currently `buidler-labs/scaffold-hbar`). The published CLI package metadata points at `hedera-dev/create-scaffold-hbar`. Before releasing a harness pilot that depends on a new `templates/*` branch, confirm the branch exists on the registry repo actually used by `getTemplateSpec()` (or update `TEMPLATE_REPO` deliberately and retest listing + giget download).

## See also

- `src/utils/fetch-available-templates.ts` — `getTemplateSpec()`, `fetchAvailableTemplates()`
- `src/tasks/copy-template-files.ts` — giget download + `processTemplateManifest()`
- `src/utils/outro-model.ts` — structured outro resolution + legacy adapter
- `src/utils/harness-recipe.ts` — `.harness/` preservation helpers
- `tests/unit/harness-recipe-preservation.test.ts` — fixture coverage for copy/filter/npm rewrite
