import OpenAI from "openai";
import type { LlmProvider, LlmResponse } from "./types.js";
import type { ToolDefinition } from "../tools.js";
import { toJsonSchema } from "../tools.js";

const SYSTEM_PROMPT =
  "あなたは toio ロボットキューブを制御するアシスタントである。ユーザーの自然言語の指示を、利用可能なツールを使って実行する。cube が未接続の場合は、まず connect ツールを実行してから操作を行う。";

export class OpenAIProvider implements LlmProvider {
  private client: OpenAI;
  private model: string;

  constructor(apiKey: string, model = "gpt-4o", baseURL?: string) {
    this.client = new OpenAI({ apiKey, ...(baseURL && { baseURL }) });
    this.model = model;
  }

  async chat(message: string, tools: ToolDefinition[]): Promise<LlmResponse> {
    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: message },
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

    const toolCalls = choice.message.tool_calls;
    if (toolCalls && toolCalls.length > 0) {
      const functionCalls = toolCalls.map((tc) => ({
        name: tc.function.name,
        arguments: JSON.parse(tc.function.arguments) as Record<string, unknown>,
      }));
      return { type: "function_call", functionCalls };
    }

    return { type: "text", text: choice.message.content ?? "" };
  }
}
