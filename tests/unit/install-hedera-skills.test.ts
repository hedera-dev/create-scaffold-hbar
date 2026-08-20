import { describe, it, expect, vi, beforeEach } from "vitest";
import { HEDERA_SKILLS_ADD_NONINTERACTIVE_ARGS, HEDERA_SKILLS_MARKETPLACE_SPEC } from "../../src/utils/consts";

vi.mock("../../src/utils/run-task-command", () => ({
  runTaskCommand: vi.fn(),
}));

const { runTaskCommand } = await import("../../src/utils/run-task-command");
const { installHederaSkillsMarketplace } = await import("../../src/tasks/install-hedera-skills");

describe("installHederaSkillsMarketplace", () => {
  beforeEach(() => {
    vi.mocked(runTaskCommand).mockReset();
  });

  it("runs skills add quietly with an initial status", async () => {
    vi.mocked(runTaskCommand).mockResolvedValue({
      exitCode: 0,
      stdout: "ok",
      stderr: "",
      tail: "ok",
    });
    const task = { output: "" };

    await installHederaSkillsMarketplace("/tmp/my-app", task as never);

    expect(runTaskCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        file: "npx",
        args: ["--yes", "skills", "add", HEDERA_SKILLS_MARKETPLACE_SPEC, ...HEDERA_SKILLS_ADD_NONINTERACTIVE_ARGS],
        cwd: "/tmp/my-app",
        initialStatus: "Installing Hedera Skills…",
        env: expect.objectContaining({ FORCE_COLOR: "0" }),
      }),
    );
  });

  it("keeps failures non-fatal and writes a recovery message", async () => {
    vi.mocked(runTaskCommand).mockResolvedValue({
      exitCode: 2,
      stdout: "",
      stderr: "skills failed hard",
      tail: "skills failed hard",
    });
    const task = { output: "" };

    await expect(installHederaSkillsMarketplace("/tmp/my-app", task as never)).resolves.toBeUndefined();

    expect(task.output).toContain("exited with code 2");
    expect(task.output).toContain(`cd my-app && npx skills add ${HEDERA_SKILLS_MARKETPLACE_SPEC}`);
    expect(task.output).toContain("skills failed hard");
  });
});
