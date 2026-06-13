import { describe, expect, it } from "bun:test";

import { resolveInferenceTarget } from "../api/index.ts";

describe("resolveInferenceTarget", () => {
  it("prefers LM Studio when it is available locally", () => {
    const target = resolveInferenceTarget({
      apiKey: "",
      env: {
        ANTHROPIC_API_KEY: "",
        LM_STUDIO_BASE_URL: "http://localhost:1234",
        LM_STUDIO_API_KEY: "lmstudio",
        LM_STUDIO_MODEL: "ibm/granite-4-micro",
      },
    });

    expect(target.provider).toBe("lm-studio");
    expect(target.baseUrl).toBe("http://localhost:1234");
    expect(target.apiKey).toBe("lmstudio");
    expect(target.model).toBe("ibm/granite-4-micro");
  });

  it("falls back to Anthropic when LM Studio is unavailable", () => {
    const target = resolveInferenceTarget({
      apiKey: "sk-ant-test-key",
      env: {
        ANTHROPIC_API_KEY: "sk-ant-test-key",
        LM_STUDIO_BASE_URL: "",
        LM_STUDIO_API_KEY: "",
        LM_STUDIO_MODEL: "",
      },
    });

    expect(target.provider).toBe("anthropic");
    expect(target.baseUrl).toBe("https://api.anthropic.com");
    expect(target.apiKey).toBe("sk-ant-test-key");
  });
});
