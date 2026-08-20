import { describe, it, expect } from "vitest";
import { mapForgeInstallPhase } from "../../src/tasks/create-first-git-commit";

describe("mapForgeInstallPhase", () => {
  it("maps cloning / installing / updating chunks", () => {
    expect(mapForgeInstallPhase("Cloning into '/tmp/lib/forge-std'...")).toBe("Cloning Foundry libraries…");
    expect(mapForgeInstallPhase("Installing forge-std in /tmp/lib/forge-std")).toBe("Installing Foundry libraries…");
    expect(mapForgeInstallPhase("Updating dependencies in /tmp/lib/forge-std")).toBe("Updating Foundry libraries…");
  });

  it("ignores unrelated output", () => {
    expect(mapForgeInstallPhase("Compiling 12 files with Solc")).toBeUndefined();
  });
});
