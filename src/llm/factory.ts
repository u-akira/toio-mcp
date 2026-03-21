import type { LlmProvider } from "./types.js";
import { ClaudeProvider } from "./claude.js";
import { OpenAIProvider } from "./openai.js";

/** 環境変数に基づいて LLM プロバイダを生成する */
export function createLlmProvider(): LlmProvider {
  const provider = process.env.LLM_PROVIDER ?? "openai";

  switch (provider) {
    case "claude": {
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) throw new Error("ANTHROPIC_API_KEY が設定されていない。");
      return new ClaudeProvider(apiKey, process.env.LLM_MODEL);
    }
    case "openai": {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) throw new Error("OPENAI_API_KEY が設定されていない。");
      return new OpenAIProvider(apiKey, process.env.LLM_MODEL, process.env.OPENAI_BASE_URL);
    }
    case "ollama": {
      const baseURL = process.env.OLLAMA_BASE_URL ?? "http://localhost:11434/v1/";
      const model = process.env.LLM_MODEL ?? "qwen2.5";
      return new OpenAIProvider("ollama", model, baseURL);
    }
    default:
      throw new Error(`不明な LLM_PROVIDER: ${provider}`);
  }
}
