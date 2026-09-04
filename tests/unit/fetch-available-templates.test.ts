import { describe, expect, it, vi, afterEach } from "vitest";
import {
  fetchAvailableTemplates,
  getTemplateSpec,
  mergeTemplateOptions,
  normalizeTemplateValue,
} from "../../src/utils/fetch-available-templates";
import { TEMPLATE_REPO } from "../../src/utils/consts";
import { TEMPLATES } from "../../src/utils/template-registry";

describe("normalizeTemplateValue", () => {
  it("maps blank-template to blank", () => {
    expect(normalizeTemplateValue("blank-template")).toBe("blank");
    expect(normalizeTemplateValue("bridge")).toBe("bridge");
    expect(normalizeTemplateValue("tokenize-subscriptions")).toBe("tokenize-subscriptions");
  });
});

describe("mergeTemplateOptions", () => {
  it("keeps registry entries and appends unknown live branches", () => {
    const merged = mergeTemplateOptions(
      [{ value: "blank", label: "Blank Starter" }],
      [
        { value: "blank", label: "Ignored Live Label" },
        { value: "brand-new", label: "Brand New" },
      ],
    );
    expect(merged).toEqual([
      { value: "blank", label: "Blank Starter" },
      { value: "brand-new", label: "Brand New" },
    ]);
  });
});

describe("fetchAvailableTemplates", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("returns the registry when GitHub is rate-limited", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 403 }));

    const options = await fetchAvailableTemplates();
    const values = options.map(o => o.value);

    expect(values).toEqual(TEMPLATES.map(t => t.value));
    expect(values).toContain("tokenize-subscriptions");
    expect(values).not.toContain("tokenise-subscriptions");
    expect(options.find(o => o.value === "bridge")?.label).toBe("Bridge");
  });

  it("merges previously unknown live branches onto the registry", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve([
            { ref: "refs/heads/templates/blank-template" },
            { ref: "refs/heads/templates/bridge" },
            { ref: "refs/heads/templates/future-demo" },
          ]),
      }),
    );

    const options = await fetchAvailableTemplates();
    const values = options.map(o => o.value);

    expect(values).toContain("blank");
    expect(values).toContain("bridge");
    expect(values).toContain("future-demo");
    expect(values).not.toContain("blank-template");
    expect(options.find(o => o.value === "blank")?.label).toBe("Blank Starter");
  });
});

describe("getTemplateSpec", () => {
  it("maps built-in keys to git branches", () => {
    expect(getTemplateSpec("blank")).toBe(`${TEMPLATE_REPO}#templates/blank-template`);
    expect(getTemplateSpec("tokenize-subscriptions")).toBe(`${TEMPLATE_REPO}#templates/tokenize-subscriptions`);
    expect(getTemplateSpec("acme/demo#main")).toBe("acme/demo#main");
  });
});
