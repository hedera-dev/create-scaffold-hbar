# Template flow (giget)

The CLI uses **giget** to download the chosen template. There are **no embedded templates** in the create-scaffold-hbar repo and **no extension system**. Template content lives in the template repo as **branch names** (e.g. `templates/blank-template`, `templates/payments-scheduler`).

## Flow

- **Template = branch name**: A built-in key (e.g. `blank`, `payments-scheduler`) is resolved to `https://github.com/buidler-labs/scaffold-hbar#templates/<branch>` (see `getTemplateSpec()` in `src/utils/fetch-available-templates.ts`). The `blank` key maps to branch `templates/blank-template`. Community templates use `org/repo` or `org/repo#branch` as-is.
- **List from GitHub API**: In interactive mode, the "Which starter template?" prompt is filled by calling the GitHub API (matching-refs for `templates/*`). If the request fails (e.g. offline), a **fallback list** from `TEMPLATES_FALLBACK` in `src/utils/consts.ts` is used.
- **Prompt constraints (`template.json`)**: Before prompting for frontend / Solidity framework, `resolveTemplateCapabilities()` loads `template.json` from GitHub (`contents/template.json` on the same ref giget will use). Built-in keys use branch `templates/<name>` on the default template repo; community templates use `owner/repo#ref` so capabilities and defaults match the branch you scaffold.
- **Fetch**: `getTemplateSpec()` and `downloadTemplate(gh:spec)` in `src/tasks/copy-template-files.ts` download the template into a temp dir, then copy into the user's project directory.

## `template.json` — custom outro

Optional `create-scaffold-hbar.outro.steps` is a non-empty array of lines inserted **after** the shared header (`Congratulations`, `cd`, optional install hint) and **before** the closing thanks line. It **replaces** the default contract/frontend-specific middle section when present.

- **`+` prefix**: render the rest of the line in bold.
- **`{run:script}`**: expanded to the correct package-manager command (e.g. `{run:next:start}` → `yarn next:start`, `npm run next:start`). For harness pilots, use `{run:harness:extend}`.

Omit `outro` to keep the standard Scaffold-HBAR next-steps text.

## Optional `.harness/` recipes (hedera-harness)

Templates may ship a tracked **`.harness/`** directory (spec, PRD, validators, contracts) plus root package wiring:

```json
{
  "scripts": {
    "harness:extend": "hedera-harness extend .harness/spec.yaml"
  },
  "devDependencies": {
    "hedera-harness": "1.1.0"
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
      "steps": ["+Extend this app with the harness: {run:harness:extend}"]
    }
  }
}
```

## Template registry ownership

Built-in template resolution uses `TEMPLATE_REPO` in `src/utils/consts.ts` (currently `buidler-labs/scaffold-hbar`). The published CLI package metadata points at `hedera-dev/create-scaffold-hbar`. Before releasing a harness pilot that depends on a new `templates/*` branch, confirm the branch exists on the registry repo actually used by `getTemplateSpec()` (or update `TEMPLATE_REPO` deliberately and retest listing + giget download).

## See also

- `src/utils/fetch-available-templates.ts` — `getTemplateSpec()`, `fetchAvailableTemplates()`
- `src/tasks/copy-template-files.ts` — giget download + `processTemplateManifest()`
- `src/utils/harness-recipe.ts` — `.harness/` preservation helpers
- `tests/unit/harness-recipe-preservation.test.ts` — fixture coverage for copy/filter/npm rewrite
