import { describe, expect, it } from "vitest";
import { parseGithubCommunityTemplate } from "../../src/utils/parse-github-template-ref";

describe("parseGithubCommunityTemplate", () => {
  it("parses owner/repo with default ref main", () => {
    expect(parseGithubCommunityTemplate("acme/widgets")).toEqual({
      owner: "acme",
      repo: "widgets",
      ref: "main",
    });
  });

  it("parses owner/repo#branch", () => {
    expect(parseGithubCommunityTemplate("hedera-dev/scaffold-hbar#draft-templates/hedera-demo")).toEqual({
      owner: "hedera-dev",
      repo: "scaffold-hbar",
      ref: "draft-templates/hedera-demo",
    });
  });

  it("trims whitespace", () => {
    expect(parseGithubCommunityTemplate("  org/repo#feature/foo  ")).toEqual({
      owner: "org",
      repo: "repo",
      ref: "feature/foo",
    });
  });

  it("returns null for built-in template keys", () => {
    expect(parseGithubCommunityTemplate("blank")).toBeNull();
    expect(parseGithubCommunityTemplate("payments-scheduler")).toBeNull();
  });
});
