import { describe, it, expect } from "vitest";
import { nodeVersionError } from "../../src/utils/system-validation";

describe("nodeVersionError", () => {
  it("accepts the floor itself and newer runtimes", () => {
    expect(nodeVersionError("v22.23.4")).toBeNull();
    expect(nodeVersionError("22.23.4")).toBeNull();
    expect(nodeVersionError("v24.15.0")).toBeNull();
  });

  it("rejects runtimes below the floor, quoting what was found", () => {
    expect(nodeVersionError("v20.20.0")).toContain("Current version: v20.20.0");
    expect(nodeVersionError("v22.23.3")).toContain("must be >= 22.23.4");
  });

  it("reports an unreadable version instead of silently passing", () => {
    expect(nodeVersionError("not-a-version")).toContain("Could not read the Node.js version");
  });
});
