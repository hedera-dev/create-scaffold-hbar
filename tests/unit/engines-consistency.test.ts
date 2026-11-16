import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import semver from "semver";
import { nodeVersionError } from "../../src/utils/system-validation";

/**
 * The supported Node floor is written in three places: the runtime gate
 * (REQUIRED_NODE_VERSION) and the `engines` range of both published packages. Nothing
 * stops those drifting apart, and the failure is silent — `engines` would advertise a
 * range the CLI then refuses, or accept one it actually rejects. These tests pin them
 * together through the exported gate, so the floor can only be changed in lockstep.
 */
const readEngines = (relative: string): string => {
  const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, "../..", relative), "utf8"));
  const range = pkg.engines?.node;
  expect(range, `${relative} must declare engines.node`).toBeTruthy();
  return range as string;
};

const floorOf = (range: string): string => {
  const floor = semver.minVersion(range)?.version;
  expect(floor, `could not read a floor from "${range}"`).toBeTruthy();
  return floor as string;
};

describe("engines agrees with the runtime Node gate", () => {
  it("declares the same range in both published packages", () => {
    expect(readEngines("alias/package.json")).toBe(readEngines("package.json"));
  });

  it("accepts the floor that engines advertises", () => {
    expect(nodeVersionError(floorOf(readEngines("package.json")))).toBeNull();
  });

  it("is not looser than the gate: the version below the floor is rejected", () => {
    const floor = semver.parse(floorOf(readEngines("package.json")))!;
    const below =
      floor.patch > 0
        ? `${floor.major}.${floor.minor}.${floor.patch - 1}`
        : `${floor.major}.${Math.max(floor.minor - 1, 0)}.0`;
    expect(nodeVersionError(below)).toContain("must be >=");
  });
});
