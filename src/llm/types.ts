import type { ToolDefinition } from "../tools.js";

/** LLM が返す Function Call */
export interface FunctionCall {
  name: string;
  arguments: Record<string, unknown>;
}

/** LLM の応答 */
export interface LlmResponse {
  type: "text" | "function_call";
  text?: string;
  functionCalls?: FunctionCall[];
}

/** LLM プロバイダの共通インターフェース */
export interface LlmProvider {
  chat(message: string, tools: ToolDefinition[]): Promise<LlmResponse>;
}
