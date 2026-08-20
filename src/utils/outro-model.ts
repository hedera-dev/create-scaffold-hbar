import type { PackageManager, TemplateOutroSection, TemplateOutroStep } from "../types";

const URL_RE = /^https?:\/\//i;
const COMMAND_RE = /^(yarn|npm|pnpm|npx|cd|make|forge|cast|anvil)\b/i;
const INLINE_LABEL_COMMAND_RE = /^(?:\d+\.\s+)?(.+?):\s*(.+)$/;

function looksLikeUrl(value: string): boolean {
  return URL_RE.test(value);
}

function looksLikeCommand(value: string): boolean {
  return COMMAND_RE.test(value) || /\{run:/.test(value);
}

function attachFollowOn(current: TemplateOutroStep, value: string): TemplateOutroStep | TemplateOutroStep[] {
  if (looksLikeUrl(value)) {
    if (!current.url) {
      return { ...current, url: value };
    }
    return [current, { url: value }];
  }

  if (looksLikeCommand(value)) {
    if (!current.command) {
      return { ...current, command: value };
    }
    return [current, { command: value }];
  }

  if (!current.text) {
    return { ...current, text: value };
  }
  return [current, { text: value }];
}

/**
 * Adapts legacy flat `outro.steps` strings into structured sections.
 * Good enough for current published templates; not a perfect parser.
 */
export function adaptLegacySteps(lines: string[]): TemplateOutroSection[] {
  const steps: TemplateOutroStep[] = [];
  let current: TemplateOutroStep | null = null;

  const flush = () => {
    if (current) {
      steps.push(current);
      current = null;
    }
  };

  for (const raw of lines) {
    const trimmed = raw.trim();
    if (!trimmed) continue;

    if (trimmed.startsWith("+")) {
      flush();
      const withoutPlus = trimmed.slice(1).trim();
      const inline = withoutPlus.match(INLINE_LABEL_COMMAND_RE);
      if (inline && (looksLikeCommand(inline[2]) || looksLikeUrl(inline[2]))) {
        const label = inline[1].trim();
        const payload = inline[2].trim();
        steps.push(looksLikeUrl(payload) ? { label, url: payload } : { label, command: payload });
        current = null;
      } else {
        current = { label: withoutPlus };
      }
      continue;
    }

    const isIndented = /^\s+/.test(raw);
    if (current && (isIndented || looksLikeCommand(trimmed) || looksLikeUrl(trimmed))) {
      const attached = attachFollowOn(current, trimmed);
      if (Array.isArray(attached)) {
        steps.push(attached[0]);
        current = attached[1];
      } else {
        current = attached;
      }
      continue;
    }

    flush();

    const inline = trimmed.match(INLINE_LABEL_COMMAND_RE);
    if (inline && (looksLikeCommand(inline[2]) || looksLikeUrl(inline[2]))) {
      const label = inline[1].replace(/^\+/, "").trim();
      const payload = inline[2].trim();
      if (looksLikeUrl(payload)) {
        steps.push({ label, url: payload });
      } else {
        steps.push({ label, command: payload });
      }
      continue;
    }

    if (looksLikeUrl(trimmed)) {
      steps.push({ url: trimmed });
    } else if (looksLikeCommand(trimmed)) {
      steps.push({ command: trimmed });
    } else {
      steps.push({ text: trimmed });
    }
  }

  flush();
  return steps.length ? [{ steps }] : [];
}

/**
 * Resolves template outro into structured sections.
 * Prefer `sections` when both `sections` and legacy `steps` are present.
 */
export function resolveOutroSections(outro: {
  sections?: TemplateOutroSection[];
  steps?: string[];
}): TemplateOutroSection[] | undefined {
  if (outro.sections?.length) {
    return outro.sections.map(section => ({
      title: section.title,
      steps: section.steps.map(step => ({ ...step })),
    }));
  }
  if (outro.steps?.length) {
    return adaptLegacySteps(outro.steps);
  }
  return undefined;
}

/** Expands `{run:script}` to a package-manager command string (no styling). */
export function expandRunPlaceholders(line: string, run: (script: string) => string): string {
  return line.replace(/\{run:([a-zA-Z0-9:_-]+)\}/g, (match, script: string) => {
    // Leave `{run:framework:…}` for expandFrameworkPlaceholders (or untouched if unset).
    if (script.startsWith("framework:")) return match;
    return run(script);
  });
}

/**
 * Rewrites `{run:framework:script}` using the selected Solidity framework
 * (e.g. `{run:framework:deploy}` → `{run:foundry:deploy}`).
 * Leaves the token unchanged when no framework was selected.
 */
export function expandFrameworkPlaceholders(
  line: string,
  solidityFramework: "hardhat" | "foundry" | null | undefined,
): string {
  if (!solidityFramework) return line;
  return line.replace(/\{run:framework:([a-zA-Z0-9:_-]+)\}/g, (_, script: string) => {
    return `{run:${solidityFramework}:${script}}`;
  });
}

/** Expands `{pm}` to the selected package manager name (`none` → `pnpm`). */
export function expandPmPlaceholder(line: string, packageManager: PackageManager): string {
  const pm = packageManager === "none" ? "pnpm" : packageManager;
  return line.replace(/\{pm\}/g, pm);
}

export function expandOutroTokens(
  line: string,
  run: (script: string) => string,
  packageManager: PackageManager,
  solidityFramework?: "hardhat" | "foundry" | null,
): string {
  return expandPmPlaceholder(
    expandRunPlaceholders(expandFrameworkPlaceholders(line, solidityFramework), run),
    packageManager,
  );
}
