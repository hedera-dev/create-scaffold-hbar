import fs from "fs";
import path from "path";

export type GitmoduleEntry = {
  name: string;
  path: string;
  url: string;
};

export const defaultFoundryLibraries = [
  "foundry-rs/forge-std",
  "OpenZeppelin/openzeppelin-contracts",
  "gnsps/solidity-bytes-utils",
  "hashgraph/hedera-forking",
];

type FoundryLock = Record<string, { tag?: { name?: unknown } } | undefined>;

export function parseRemappedLibNames(remappings: string): string[] {
  const libs = new Set<string>();

  for (const line of remappings.split("\n")) {
    const trimmedLine = line.trim();
    if (!trimmedLine || trimmedLine.startsWith("#")) continue;

    const match = trimmedLine.match(/(?:^|=)\s*lib\/([^/]+)\//);
    if (match) libs.add(match[1]);
  }

  return [...libs];
}

export function parseGitmodules(contents: string): GitmoduleEntry[] {
  const entries: GitmoduleEntry[] = [];
  let currentEntry: Partial<GitmoduleEntry> | undefined;

  for (const line of contents.split("\n")) {
    const sectionMatch = line.trim().match(/^\[submodule\s+"([^"]+)"\]$/);
    if (sectionMatch) {
      if (currentEntry?.name && currentEntry.path && currentEntry.url) {
        entries.push(currentEntry as GitmoduleEntry);
      }
      currentEntry = { name: sectionMatch[1] };
      continue;
    }

    if (!currentEntry) continue;

    const propertyMatch = line.match(/^\s*([^=]+?)\s*=\s*(.*?)\s*$/);
    if (!propertyMatch) continue;

    const key = propertyMatch[1].trim();
    const value = propertyMatch[2].trim();
    if (key === "path" || key === "url") {
      currentEntry[key] = value;
    }
  }

  if (currentEntry?.name && currentEntry.path && currentEntry.url) {
    entries.push(currentEntry as GitmoduleEntry);
  }

  return entries;
}

const FOUNDRY_LIB_SUBMODULE_PREFIX = "packages/foundry/lib/";

/** Drops Foundry lib submodule sections. Empty string means the file should be removed. */
export function withoutFoundryGitmodules(contents: string): string {
  const drop = new Set(
    parseGitmodules(contents)
      .filter(entry => entry.path.startsWith(FOUNDRY_LIB_SUBMODULE_PREFIX))
      .map(entry => entry.name),
  );
  if (drop.size === 0) return contents;

  let skip = false;
  const kept = contents.split("\n").filter(line => {
    const section = line.trim().match(/^\[submodule\s+"([^"]+)"\]$/);
    if (section) skip = drop.has(section[1]);
    return !skip;
  });

  const next = kept
    .join("\n")
    .replace(/^\n+/, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return next.length > 0 ? `${next}\n` : "";
}

/** Removes Foundry lib entries so a later `forge install` can recreate them. */
export async function stripFoundryGitmodules(targetDir: string): Promise<boolean> {
  const gitmodulesPath = path.join(targetDir, ".gitmodules");
  if (!fs.existsSync(gitmodulesPath)) return false;

  const contents = await fs.promises.readFile(gitmodulesPath, "utf8");
  const next = withoutFoundryGitmodules(contents);
  if (next === contents) return false;

  if (next.length === 0) await fs.promises.rm(gitmodulesPath);
  else await fs.promises.writeFile(gitmodulesPath, next);
  return true;
}

export function githubInstallSpecFromUrl(url: string): string | undefined {
  const normalized = url.trim().replace(/\.git$/, "");

  if (normalized.startsWith("https://github.com/")) {
    return normalized.replace("https://github.com/", "");
  }

  if (normalized.startsWith("git@github.com:")) {
    return normalized.replace("git@github.com:", "");
  }

  return undefined;
}

function getFoundryLockTag(foundryLock: FoundryLock, libName: string): string | undefined {
  const tag = foundryLock[`lib/${libName}`]?.tag?.name;
  return typeof tag === "string" && tag.length > 0 ? tag : undefined;
}

export async function resolveFoundryLibraries(foundryWorkSpacePath: string): Promise<string[]> {
  const targetDir = path.resolve(foundryWorkSpacePath, "../..");
  const remappingsPath = path.join(foundryWorkSpacePath, "remappings.txt");
  const gitmodulesPath = path.join(targetDir, ".gitmodules");
  const lockPath = path.join(foundryWorkSpacePath, "foundry.lock");

  if (!fs.existsSync(remappingsPath)) return defaultFoundryLibraries;

  const remappings = await fs.promises.readFile(remappingsPath, "utf8");
  const libNames = parseRemappedLibNames(remappings);
  if (libNames.length === 0) return defaultFoundryLibraries;

  const gitmodules = fs.existsSync(gitmodulesPath)
    ? parseGitmodules(await fs.promises.readFile(gitmodulesPath, "utf8"))
    : [];

  const foundryLock: FoundryLock = fs.existsSync(lockPath)
    ? JSON.parse(await fs.promises.readFile(lockPath, "utf8"))
    : {};

  return libNames.map(libName => {
    const entry = gitmodules.find(item => item.path === `packages/foundry/lib/${libName}`);
    if (!entry) {
      throw new Error(`Foundry library "${libName}" is used in remappings.txt but has no .gitmodules entry`);
    }

    const repo = githubInstallSpecFromUrl(entry.url);
    if (!repo) {
      throw new Error(`Foundry library "${libName}" uses an unsupported git URL: ${entry.url}`);
    }

    const tag = getFoundryLockTag(foundryLock, libName);
    return tag ? `${repo}@${tag}` : repo;
  });
}
