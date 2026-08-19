import { TEMPLATE_BRANCH_PREFIX, TEMPLATE_LABEL_OVERRIDES, TEMPLATE_REPO, TEMPLATES_FALLBACK } from "./consts";
import { TEMPLATES } from "./template-registry";

/** Branch name for the "blank" starter template (actual branch is blank-template). */
const BLANK_TEMPLATE_BRANCH = "blank-template";

/**
 * Resolves template to a giget spec (owner/repo#branch).
 * - If template contains "/", treat as community (org/repo or org/repo#branch).
 * - Otherwise use TEMPLATE_REPO and branch "templates/<template>" (blank → templates/blank-template).
 */
export function getTemplateSpec(template: string): string {
  if (template.includes("/")) return template;
  const prefix = TEMPLATE_BRANCH_PREFIX.endsWith("/") ? TEMPLATE_BRANCH_PREFIX : `${TEMPLATE_BRANCH_PREFIX}/`;
  const branchSuffix = template === "blank" ? BLANK_TEMPLATE_BRANCH : template;
  const branch = `${prefix}${branchSuffix}`;
  return `${TEMPLATE_REPO}#${branch}`;
}

export type TemplateOption = { value: string; label: string; hint?: string };

function registryOptions(): TemplateOption[] {
  return TEMPLATES.map(t => ({ ...t }));
}

function titleCaseBranch(value: string): string {
  return value
    .split(/[-_]/)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

/**
 * Normalizes a live branch suffix to the CLI template value.
 * `blank-template` is exposed as `blank` to match defaults and the registry.
 */
export function normalizeTemplateValue(branchSuffix: string): string {
  return branchSuffix === BLANK_TEMPLATE_BRANCH ? "blank" : branchSuffix;
}

/**
 * Merges the built-in registry with any extra live `templates/*` branches.
 * Registry entries always win for known values (labels/hints stay stable).
 */
export function mergeTemplateOptions(registry: TemplateOption[], live: TemplateOption[]): TemplateOption[] {
  const byValue = new Map<string, TemplateOption>();
  for (const option of registry) {
    byValue.set(option.value, option);
  }
  for (const option of live) {
    if (!byValue.has(option.value)) {
      byValue.set(option.value, option);
    }
  }
  return [...byValue.values()].sort((a, b) => a.value.localeCompare(b.value));
}

/**
 * Fetches branch names from the template repo that match "templates/*"
 * and merges them with the built-in registry.
 *
 * Known starters always come from the registry (no GitHub required for the menu).
 * A successful live fetch only adds branches not yet shipped in the CLI registry.
 * On API failure, returns the registry list unchanged.
 */
export async function fetchAvailableTemplates(): Promise<TemplateOption[]> {
  const registry = registryOptions();
  const [owner, repo] = TEMPLATE_REPO.split("/");
  if (!owner || !repo) return registry.length > 0 ? registry : [...TEMPLATES_FALLBACK];

  const refPrefix = `heads/${TEMPLATE_BRANCH_PREFIX.replace(/\/$/, "")}`;
  const url = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/matching-refs/${refPrefix}`;

  try {
    const res = await fetch(url, {
      headers: { Accept: "application/vnd.github+json" },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return registry;

    const refs: { ref: string }[] = await res.json();
    if (!Array.isArray(refs) || refs.length === 0) return registry;

    const live: TemplateOption[] = refs
      .map(r => {
        const match = r.ref?.match(/^refs\/heads\/templates\/(.+)$/);
        if (!match) return null;
        const value = normalizeTemplateValue(match[1]);
        const label = TEMPLATE_LABEL_OVERRIDES[match[1]] ?? TEMPLATE_LABEL_OVERRIDES[value] ?? titleCaseBranch(value);
        return { value, label };
      })
      .filter((o): o is TemplateOption => o != null);

    return mergeTemplateOptions(registry, live);
  } catch {
    return registry;
  }
}
