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
