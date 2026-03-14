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

/** ツール実行結果（履歴に追加する用） */
export interface ToolResult {
  name: string;
  result: string;
}

/** LLM プロバイダの共通インターフェース */
export interface LlmProvider {
  chat(message: string, tools: ToolDefinition[]): Promise<LlmResponse>;
  /** ツール実行結果を履歴に追加する */
  addToolResults(results: ToolResult[]): void;
  /** 会話履歴をクリアする */
  clearHistory(): void;
}
