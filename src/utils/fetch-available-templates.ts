import { TEMPLATE_BRANCH_PREFIX, TEMPLATE_LABEL_OVERRIDES, TEMPLATE_REPO, TEMPLATES_FALLBACK } from "./consts";

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

/**
 * Fetches branch names from the template repo that match "templates/*"
 * and returns options for the interactive prompt.
 * Uses GitHub API matching-refs; falls back to TEMPLATES_FALLBACK on error (e.g. offline).
 */
export async function fetchAvailableTemplates(): Promise<TemplateOption[]> {
  const [owner, repo] = TEMPLATE_REPO.split("/");
  if (!owner || !repo) return [...TEMPLATES_FALLBACK];

  const refPrefix = `heads/${TEMPLATE_BRANCH_PREFIX.replace(/\/$/, "")}`;
  const url = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/matching-refs/${refPrefix}`;

  try {
    const res = await fetch(url, {
      headers: { Accept: "application/vnd.github+json" },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return [...TEMPLATES_FALLBACK];

    const refs: { ref: string }[] = await res.json();
    if (!Array.isArray(refs) || refs.length === 0) return [...TEMPLATES_FALLBACK];

    const options: TemplateOption[] = refs
      .map(r => {
        const match = r.ref?.match(/^refs\/heads\/templates\/(.+)$/);
        if (!match) return null;
        const value = match[1];
        const label =
          TEMPLATE_LABEL_OVERRIDES[value] ??
          value
            .split(/[-_]/)
            .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
            .join(" ");
        return { value, label };
      })
      .filter((o): o is TemplateOption => o != null)
      .sort((a, b) => a.value.localeCompare(b.value));

    return options.length > 0 ? options : [...TEMPLATES_FALLBACK];
  } catch {
    return [...TEMPLATES_FALLBACK];
  }
}
