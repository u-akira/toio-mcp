import { describe, it, expect, vi, beforeEach } from "vitest";

const mockCreate = vi.fn();

vi.mock("openai", () => ({
  default: class {
    chat = { completions: { create: mockCreate } };
  },
}));

import { OpenAIProvider } from "../../llm/openai.js";
import type { ToolDefinition } from "../../tools.js";

const testTools: ToolDefinition[] = [
  {
    name: "connect",
    description: "接続する",
    schema: {},
    execute: vi.fn(),
  },
];

beforeEach(() => {
  mockCreate.mockReset();
});

describe("OpenAIProvider", () => {
  it("text レスポンスを返す", async () => {
    mockCreate.mockResolvedValue({
      choices: [
        {
          message: { content: "了解した。", tool_calls: undefined },
        },
      ],
    });

    const provider = new OpenAIProvider("test-key");
    const result = await provider.chat("こんにちは", testTools);

    expect(result.type).toBe("text");
    expect(result.text).toBe("了解した。");
  });

  it("tool_calls レスポンスを FunctionCall に変換する", async () => {
    mockCreate.mockResolvedValue({
      choices: [
        {
          message: {
            content: null,
            tool_calls: [
              {
                function: { name: "connect", arguments: "{}" },
              },
            ],
          },
        },
      ],
    });

    const provider = new OpenAIProvider("test-key");
    const result = await provider.chat("接続して", testTools);

    expect(result.type).toBe("function_call");
    expect(result.functionCalls).toHaveLength(1);
    expect(result.functionCalls![0].name).toBe("connect");
  });

  it("複数の tool_calls を全て変換する", async () => {
    mockCreate.mockResolvedValue({
      choices: [
        {
          message: {
            content: null,
            tool_calls: [
              { function: { name: "connect", arguments: "{}" } },
              {
                function: {
                  name: "move",
                  arguments: '{"left":50,"right":50,"duration":1000}',
                },
              },
            ],
          },
        },
      ],
    });

    const provider = new OpenAIProvider("test-key");
    const result = await provider.chat("接続して前に進んで", testTools);

    expect(result.functionCalls).toHaveLength(2);
    expect(result.functionCalls![1].arguments).toEqual({
      left: 50,
      right: 50,
      duration: 1000,
    });
  });

  it("choices が空の場合はデフォルトテキストを返す", async () => {
    mockCreate.mockResolvedValue({ choices: [] });

    const provider = new OpenAIProvider("test-key");
    const result = await provider.chat("テスト", testTools);

    expect(result.type).toBe("text");
    expect(result.text).toBe("応答がなかった。");
  });

  it("デフォルトモデルが gpt-4o", async () => {
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: "ok" } }],
    });

    const provider = new OpenAIProvider("test-key");
    await provider.chat("テスト", testTools);

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ model: "gpt-4o" }),
    );
  });
});
