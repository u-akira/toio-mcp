import Anthropic from "@anthropic-ai/sdk";
import type { LlmProvider, LlmResponse, ToolResult } from "./types.js";
import type { ToolDefinition } from "../tools.js";
import { toJsonSchema } from "../tools.js";

const SYSTEM_PROMPT =
  "あなたは toio ロボットキューブを制御するアシスタントである。ユーザーの自然言語の指示を、利用可能なツールを使って実行する。cube が未接続の場合は、まず connect ツールを実行してから操作を行う。";

/** 保持する最大ターン数 */
const MAX_HISTORY_TURNS = 20;

type Message = Anthropic.MessageParam;

export class ClaudeProvider implements LlmProvider {
  private client: Anthropic;
  private model: string;
  private history: Message[] = [];
  /** 直前の assistant 応答の content（addToolResults で使う） */
  private lastAssistantContent: Anthropic.ContentBlock[] = [];

  constructor(apiKey: string, model = "claude-sonnet-4-20250514") {
    this.client = new Anthropic({ apiKey });
    this.model = model;
  }

  async chat(message: string, tools: ToolDefinition[]): Promise<LlmResponse> {
    this.history.push({ role: "user", content: message });
    this.trimHistory();

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: this.history,
      tools: tools.map((t) => ({
        name: t.name,
        description: t.description,
        input_schema: toJsonSchema(t) as Anthropic.Tool["input_schema"],
      })),
    });

    // assistant メッセージを履歴に追加
    this.lastAssistantContent = response.content;
    this.history.push({ role: "assistant", content: response.content });

    const functionCalls = response.content
      .filter((block): block is Anthropic.ToolUseBlock => block.type === "tool_use")
      .map((block) => ({
        name: block.name,
        arguments: block.input as Record<string, unknown>,
      }));

    if (functionCalls.length > 0) {
      return { type: "function_call", functionCalls };
    }

    const text = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("\n");

    return { type: "text", text };
  }

  addToolResults(results: ToolResult[]): void {
    // Claude API は tool_use の後に user ロールで tool_result を返す
    const toolUseBlocks = this.lastAssistantContent.filter(
      (block): block is Anthropic.ToolUseBlock => block.type === "tool_use",
    );

    const toolResultContent: Anthropic.ToolResultBlockParam[] = [];
    for (const block of toolUseBlocks) {
      const result = results.find((r) => r.name === block.name);
      toolResultContent.push({
        type: "tool_result",
        tool_use_id: block.id,
        content: result?.result ?? "",
      });
    }

    if (toolResultContent.length > 0) {
      this.history.push({ role: "user", content: toolResultContent });
    }
    this.lastAssistantContent = [];
  }

  clearHistory(): void {
    this.history = [];
    this.lastAssistantContent = [];
  }

  /** 履歴が上限を超えたら古いターンを削除する */
  private trimHistory(): void {
    const userCount = this.history.filter((m) => m.role === "user").length;
    if (userCount <= MAX_HISTORY_TURNS) return;

    // 最初の user → 次の user の手前まで削除
    const firstUserIdx = this.history.findIndex((m) => m.role === "user");
    if (firstUserIdx === -1) return;

    let endIdx = firstUserIdx + 1;
    while (endIdx < this.history.length && this.history[endIdx].role !== "user") {
      endIdx++;
    }
    this.history.splice(firstUserIdx, endIdx - firstUserIdx);
  }
}
