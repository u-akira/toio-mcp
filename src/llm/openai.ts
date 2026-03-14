import OpenAI from "openai";
import type { LlmProvider, LlmResponse, ToolResult } from "./types.js";
import type { ToolDefinition } from "../tools.js";
import { toJsonSchema } from "../tools.js";

const SYSTEM_PROMPT =
  "あなたは toio ロボットキューブを制御するアシスタントである。ユーザーの自然言語の指示を、利用可能なツールを使って実行する。cube が未接続の場合は、まず connect ツールを実行してから操作を行う。";

/** 保持する最大ターン数（user+assistant で1ターン） */
const MAX_HISTORY_TURNS = 20;

type Message = OpenAI.ChatCompletionMessageParam;

export class OpenAIProvider implements LlmProvider {
  private client: OpenAI;
  private model: string;
  private history: Message[] = [];
  /** 直前の assistant メッセージに含まれた tool_calls の ID マップ */
  private lastToolCallIds: Map<string, string> = new Map();

  constructor(apiKey: string, model = "gpt-4o", baseURL?: string) {
    this.client = new OpenAI({ apiKey, ...(baseURL && { baseURL }) });
    this.model = model;
  }

  async chat(message: string, tools: ToolDefinition[]): Promise<LlmResponse> {
    this.history.push({ role: "user", content: message });
    this.trimHistory();

    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        ...this.history,
      ],
      tools: tools.map((t) => ({
        type: "function" as const,
        function: {
          name: t.name,
          description: t.description,
          parameters: toJsonSchema(t),
        },
      })),
    });

    const choice = response.choices[0];
    if (!choice) {
      return { type: "text", text: "応答がなかった。" };
    }

    // assistant メッセージを履歴に追加
    this.history.push(choice.message as Message);

    const toolCalls = choice.message.tool_calls;
    if (toolCalls && toolCalls.length > 0) {
      // tool_call ID を保存（addToolResults で使う）
      this.lastToolCallIds.clear();
      for (const tc of toolCalls) {
        this.lastToolCallIds.set(tc.function.name, tc.id);
      }

      const functionCalls = toolCalls.map((tc) => ({
        name: tc.function.name,
        arguments: JSON.parse(tc.function.arguments) as Record<string, unknown>,
      }));
      return { type: "function_call", functionCalls };
    }

    return { type: "text", text: choice.message.content ?? "" };
  }

  addToolResults(results: ToolResult[]): void {
    for (const r of results) {
      const toolCallId = this.lastToolCallIds.get(r.name);
      if (toolCallId) {
        this.history.push({
          role: "tool",
          tool_call_id: toolCallId,
          content: r.result,
        });
      }
    }
    this.lastToolCallIds.clear();
  }

  clearHistory(): void {
    this.history = [];
    this.lastToolCallIds.clear();
  }

  /** 履歴が上限を超えたら古いメッセージを削除する */
  private trimHistory(): void {
    // user メッセージの数でターン数を数える
    const userCount = this.history.filter((m) => m.role === "user").length;
    if (userCount <= MAX_HISTORY_TURNS) return;

    // 最初の user メッセージとそれに続く非 user メッセージを削除
    const firstUserIdx = this.history.findIndex((m) => m.role === "user");
    if (firstUserIdx === -1) return;

    let endIdx = firstUserIdx + 1;
    while (endIdx < this.history.length && this.history[endIdx].role !== "user") {
      endIdx++;
    }
    this.history.splice(firstUserIdx, endIdx - firstUserIdx);
  }
}
