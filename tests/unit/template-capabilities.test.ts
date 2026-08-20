import { afterEach, describe, expect, it, vi } from "vitest";
import { resolveTemplateCapabilities } from "../../src/utils/template-capabilities";
import { TEMPLATE_REGISTRY } from "../../src/utils/template-registry";

describe("resolveTemplateCapabilities", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("loads capabilities from template.json for owner/repo#ref", async () => {
    const manifestJson = {
      name: "demo",
      "create-scaffold-hbar": {
        capabilities: {
          frontend: ["nextjs-app"],
          solidityFramework: ["none"],
          packageManager: ["none"],
        },
        defaults: {
          frontend: "nextjs-app",
          solidityFramework: "none",
          packageManager: "none",
        },
      },
    };
    const b64 = Buffer.from(JSON.stringify(manifestJson), "utf8").toString("base64");

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ content: b64, encoding: "base64" }),
      }),
    );

    const caps = await resolveTemplateCapabilities("acme/demo#my-branch");

    expect(fetch).toHaveBeenCalledWith(
      "https://api.github.com/repos/acme/demo/contents/template.json?ref=my-branch",
      expect.any(Object),
    );
    expect(caps.frontend).toEqual(["nextjs-app"]);
    expect(caps.solidityFramework).toEqual(["none"]);
    expect(caps.packageManager).toEqual(["none"]);
    expect(caps.defaults).toEqual({ frontend: "nextjs-app", solidityFramework: "none", packageManager: "none" });
  });

  it("falls back to default capabilities when community fetch fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 404 }));

    const caps = await resolveTemplateCapabilities("unknown/repo#missing");

    expect(caps.frontend).toContain("nextjs-app");
    expect(caps.solidityFramework.length).toBeGreaterThan(0);
  });

  it("uses the built-in registry for known starters without calling GitHub", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const caps = await resolveTemplateCapabilities("bridge");

    expect(fetchMock).not.toHaveBeenCalled();
    expect(caps.solidityFramework).toEqual(["foundry"]);
    expect(caps.frontend).toEqual(["nextjs-app"]);
  });

  it("covers every registry template with explicit capabilities", async () => {
    for (const entry of TEMPLATE_REGISTRY) {
      const caps = await resolveTemplateCapabilities(entry.value);
      expect(caps.frontend.length).toBeGreaterThan(0);
      expect(caps.solidityFramework.length).toBeGreaterThan(0);
      expect(caps.packageManager.length).toBeGreaterThan(0);
      expect(caps).toEqual(entry.capabilities);
    }
  });
});
