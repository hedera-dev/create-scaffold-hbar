import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, describe, expect, it } from "vitest";
import {
  defaultFoundryLibraries,
  githubInstallSpecFromUrl,
  parseGitmodules,
  parseRemappedLibNames,
  resolveFoundryLibraries,
} from "../../src/utils/resolve-foundry-libraries";

const tempDirs: string[] = [];

async function makeWorkspace(files: {
  remappings?: string;
  gitmodules?: string;
  foundryLock?: Record<string, unknown>;
}): Promise<string> {
  const rootDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "resolve-foundry-libraries-"));
  tempDirs.push(rootDir);

  const foundryWorkspacePath = path.join(rootDir, "packages", "foundry");
  await fs.promises.mkdir(foundryWorkspacePath, { recursive: true });

  if (files.remappings !== undefined) {
    await fs.promises.writeFile(path.join(foundryWorkspacePath, "remappings.txt"), files.remappings, "utf8");
  }

  if (files.gitmodules !== undefined) {
    await fs.promises.writeFile(path.join(rootDir, ".gitmodules"), files.gitmodules, "utf8");
  }

  if (files.foundryLock !== undefined) {
    await fs.promises.writeFile(
      path.join(foundryWorkspacePath, "foundry.lock"),
      JSON.stringify(files.foundryLock, null, 2),
      "utf8",
    );
  }

  return foundryWorkspacePath;
}

function gitmodules(entries: Array<{ name: string; path: string; url: string }>): string {
  return entries
    .map(
      entry => `[submodule "${entry.name}"]
\tpath = ${entry.path}
\turl = ${entry.url}`,
    )
    .join("\n");
}

describe("parseRemappedLibNames", () => {
  it("extracts unique lib names from remappings", () => {
    expect(
      parseRemappedLibNames(`
        # ignored
        forge-std/=lib/forge-std/src/
        @openzeppelin/contracts/= lib/openzeppelin-contracts/contracts/
        lib/forge-std/src/
        pyth-sdk-solidity/=lib/pyth-sdk-solidity/
      `),
    ).toEqual(["forge-std", "openzeppelin-contracts", "pyth-sdk-solidity"]);
  });
});

describe("parseGitmodules", () => {
  it("parses submodule sections with path and url", () => {
    expect(
      parseGitmodules(`
        [submodule "packages/foundry/lib/forge-std"]
          path = packages/foundry/lib/forge-std
          url = https://github.com/foundry-rs/forge-std
      `),
    ).toEqual([
      {
        name: "packages/foundry/lib/forge-std",
        path: "packages/foundry/lib/forge-std",
        url: "https://github.com/foundry-rs/forge-std",
      },
    ]);
  });
});

describe("githubInstallSpecFromUrl", () => {
  it("converts HTTPS and SSH GitHub URLs to forge install specs", () => {
    expect(githubInstallSpecFromUrl("https://github.com/smartcontractkit/chainlink-brownie-contracts.git")).toBe(
      "smartcontractkit/chainlink-brownie-contracts",
    );
    expect(githubInstallSpecFromUrl("git@github.com:pyth-network/pyth-sdk-solidity.git")).toBe(
      "pyth-network/pyth-sdk-solidity",
    );
  });

  it("returns undefined for unsupported URLs", () => {
    expect(githubInstallSpecFromUrl("https://gitlab.com/example/repo")).toBeUndefined();
  });
});

describe("resolveFoundryLibraries", () => {
  afterEach(async () => {
    await Promise.all(tempDirs.splice(0).map(tempDir => fs.promises.rm(tempDir, { recursive: true, force: true })));
  });

  it("falls back to default libraries when remappings.txt is missing", async () => {
    const foundryWorkspacePath = await makeWorkspace({});

    await expect(resolveFoundryLibraries(foundryWorkspacePath)).resolves.toEqual(defaultFoundryLibraries);
  });

  it("falls back to default libraries when remappings.txt has no lib entries", async () => {
    const foundryWorkspacePath = await makeWorkspace({
      remappings: "# no foundry remappings here\n@scope/=node_modules/@scope/",
    });

    await expect(resolveFoundryLibraries(foundryWorkspacePath)).resolves.toEqual(defaultFoundryLibraries);
  });

  it("resolves current default remappings from .gitmodules", async () => {
    const foundryWorkspacePath = await makeWorkspace({
      remappings: `
        @openzeppelin/contracts/=lib/openzeppelin-contracts/contracts/
        forge-std/=lib/forge-std/src/
        solidity-bytes-utils/=lib/solidity-bytes-utils/contracts/
        hedera-forking/=lib/hedera-forking/contracts/
      `,
      gitmodules: gitmodules([
        {
          name: "packages/foundry/lib/forge-std",
          path: "packages/foundry/lib/forge-std",
          url: "https://github.com/foundry-rs/forge-std",
        },
        {
          name: "packages/foundry/lib/solidity-bytes-utils",
          path: "packages/foundry/lib/solidity-bytes-utils",
          url: "https://github.com/gnsps/solidity-bytes-utils",
        },
        {
          name: "packages/foundry/lib/hedera-forking",
          path: "packages/foundry/lib/hedera-forking",
          url: "https://github.com/hashgraph/hedera-forking",
        },
        {
          name: "packages/foundry/lib/openzeppelin-contracts",
          path: "packages/foundry/lib/openzeppelin-contracts",
          url: "https://github.com/OpenZeppelin/openzeppelin-contracts",
        },
      ]),
    });

    await expect(resolveFoundryLibraries(foundryWorkspacePath)).resolves.toEqual([
      "OpenZeppelin/openzeppelin-contracts",
      "foundry-rs/forge-std",
      "gnsps/solidity-bytes-utils",
      "hashgraph/hedera-forking",
    ]);
  });

  it("resolves Chainlink and Pyth libraries and appends foundry.lock tags", async () => {
    const foundryWorkspacePath = await makeWorkspace({
      remappings: `
        chainlink/=lib/chainlink-brownie-contracts/contracts/
        pyth-sdk-solidity/=lib/pyth-sdk-solidity/
      `,
      gitmodules: gitmodules([
        {
          name: "packages/foundry/lib/chainlink-brownie-contracts",
          path: "packages/foundry/lib/chainlink-brownie-contracts",
          url: "https://github.com/smartcontractkit/chainlink-brownie-contracts.git",
        },
        {
          name: "packages/foundry/lib/pyth-sdk-solidity",
          path: "packages/foundry/lib/pyth-sdk-solidity",
          url: "git@github.com:pyth-network/pyth-sdk-solidity.git",
        },
      ]),
      foundryLock: {
        "lib/pyth-sdk-solidity": {
          tag: {
            name: "v2.2.0",
            rev: "abc123",
          },
        },
      },
    });

    await expect(resolveFoundryLibraries(foundryWorkspacePath)).resolves.toEqual([
      "smartcontractkit/chainlink-brownie-contracts",
      "pyth-network/pyth-sdk-solidity@v2.2.0",
    ]);
  });

  it("throws a clear error when a remapped library has no .gitmodules entry", async () => {
    const foundryWorkspacePath = await makeWorkspace({
      remappings: "pyth-sdk-solidity/=lib/pyth-sdk-solidity/",
      gitmodules: "",
    });

    await expect(resolveFoundryLibraries(foundryWorkspacePath)).rejects.toThrow(
      'Foundry library "pyth-sdk-solidity" is used in remappings.txt but has no .gitmodules entry',
    );
  });

  it("throws a clear error when a remapped library uses an unsupported URL", async () => {
    const foundryWorkspacePath = await makeWorkspace({
      remappings: "pyth-sdk-solidity/=lib/pyth-sdk-solidity/",
      gitmodules: gitmodules([
        {
          name: "packages/foundry/lib/pyth-sdk-solidity",
          path: "packages/foundry/lib/pyth-sdk-solidity",
          url: "https://gitlab.com/pyth-network/pyth-sdk-solidity",
        },
      ]),
    });

    await expect(resolveFoundryLibraries(foundryWorkspacePath)).rejects.toThrow(
      'Foundry library "pyth-sdk-solidity" uses an unsupported git URL: https://gitlab.com/pyth-network/pyth-sdk-solidity',
    );
  });
});
