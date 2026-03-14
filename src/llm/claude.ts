import Anthropic from "@anthropic-ai/sdk";
import type { LlmProvider, LlmResponse } from "./types.js";
import type { ToolDefinition } from "../tools.js";
import { toJsonSchema } from "../tools.js";

const SYSTEM_PROMPT =
  "あなたは toio ロボットキューブを制御するアシスタントである。ユーザーの自然言語の指示を、利用可能なツールを使って実行する。cube が未接続の場合は、まず connect ツールを実行してから操作を行う。";

export class ClaudeProvider implements LlmProvider {
  private client: Anthropic;
  private model: string;

  constructor(apiKey: string, model = "claude-sonnet-4-20250514") {
    this.client = new Anthropic({ apiKey });
    this.model = model;
  }

  async chat(message: string, tools: ToolDefinition[]): Promise<LlmResponse> {
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: message }],
      tools: tools.map((t) => ({
        name: t.name,
        description: t.description,
        input_schema: toJsonSchema(t) as Anthropic.Tool["input_schema"],
      })),
    });

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
}
