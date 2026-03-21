import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("../../llm/claude.js", () => ({
  ClaudeProvider: vi.fn(),
}));

vi.mock("../../llm/openai.js", () => ({
  OpenAIProvider: vi.fn(),
}));

import { ClaudeProvider } from "../../llm/claude.js";
import { OpenAIProvider } from "../../llm/openai.js";

const savedEnv = { ...process.env };

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  process.env = { ...savedEnv };
});

describe("createLlmProvider", () => {
  async function loadFactory() {
    vi.resetModules();
    return import("../../llm/factory.js");
  }

  it("デフォルトで OpenAIProvider を生成する", async () => {
    delete process.env.LLM_PROVIDER;
    process.env.OPENAI_API_KEY = "test-key";
    const { createLlmProvider } = await loadFactory();
    createLlmProvider();
    expect(OpenAIProvider).toHaveBeenCalledWith("test-key", undefined, undefined);
  });

  it("LLM_PROVIDER=claude で ClaudeProvider を生成する", async () => {
    process.env.LLM_PROVIDER = "claude";
    process.env.ANTHROPIC_API_KEY = "sk-ant-test";
    process.env.LLM_MODEL = "claude-haiku";
    const { createLlmProvider } = await loadFactory();
    createLlmProvider();
    expect(ClaudeProvider).toHaveBeenCalledWith("sk-ant-test", "claude-haiku");
  });

  it("LLM_PROVIDER=openai で OpenAIProvider を生成する", async () => {
    process.env.LLM_PROVIDER = "openai";
    process.env.OPENAI_API_KEY = "sk-openai-test";
    const { createLlmProvider } = await loadFactory();
    createLlmProvider();
    expect(OpenAIProvider).toHaveBeenCalledWith("sk-openai-test", undefined, undefined);
  });

  it("OPENAI_BASE_URL を渡せる", async () => {
    process.env.LLM_PROVIDER = "openai";
    process.env.OPENAI_API_KEY = "test-key";
    process.env.OPENAI_BASE_URL = "https://api.groq.com/openai/v1";
    process.env.LLM_MODEL = "llama-3.3-70b-versatile";
    const { createLlmProvider } = await loadFactory();
    createLlmProvider();
    expect(OpenAIProvider).toHaveBeenCalledWith(
      "test-key",
      "llama-3.3-70b-versatile",
      "https://api.groq.com/openai/v1",
    );
  });

  it("ANTHROPIC_API_KEY がないとエラー", async () => {
    process.env.LLM_PROVIDER = "claude";
    delete process.env.ANTHROPIC_API_KEY;
    const { createLlmProvider } = await loadFactory();
    expect(() => createLlmProvider()).toThrowError(
      "ANTHROPIC_API_KEY が設定されていない。",
    );
  });

  it("OPENAI_API_KEY がないとエラー", async () => {
    process.env.LLM_PROVIDER = "openai";
    delete process.env.OPENAI_API_KEY;
    const { createLlmProvider } = await loadFactory();
    expect(() => createLlmProvider()).toThrowError(
      "OPENAI_API_KEY が設定されていない。",
    );
  });

  it("LLM_PROVIDER=ollama で OpenAIProvider を生成する（API キー不要）", async () => {
    process.env.LLM_PROVIDER = "ollama";
    delete process.env.OPENAI_API_KEY;
    const { createLlmProvider } = await loadFactory();
    createLlmProvider();
    expect(OpenAIProvider).toHaveBeenCalledWith(
      "ollama",
      "qwen2.5",
      "http://localhost:11434/v1/",
    );
  });

  it("LLM_PROVIDER=ollama でカスタム設定を渡せる", async () => {
    process.env.LLM_PROVIDER = "ollama";
    process.env.LLM_MODEL = "llama3";
    process.env.OLLAMA_BASE_URL = "http://192.168.1.100:11434/v1/";
    const { createLlmProvider } = await loadFactory();
    createLlmProvider();
    expect(OpenAIProvider).toHaveBeenCalledWith(
      "ollama",
      "llama3",
      "http://192.168.1.100:11434/v1/",
    );
  });

  it("不明なプロバイダはエラー", async () => {
    process.env.LLM_PROVIDER = "gemini";
    const { createLlmProvider } = await loadFactory();
    expect(() => createLlmProvider()).toThrowError(
      "不明な LLM_PROVIDER: gemini",
    );
  });
});
