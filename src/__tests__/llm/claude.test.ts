import { describe, it, expect, vi, beforeEach } from "vitest";

const mockCreate = vi.fn();

vi.mock("@anthropic-ai/sdk", () => ({
  default: class {
    messages = { create: mockCreate };
  },
}));

import { ClaudeProvider } from "../../llm/claude.js";
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

describe("ClaudeProvider", () => {
  it("text レスポンスを返す", async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: "text", text: "了解した。" }],
    });

    const provider = new ClaudeProvider("test-key");
    const result = await provider.chat("こんにちは", testTools);

    expect(result.type).toBe("text");
    expect(result.text).toBe("了解した。");
    expect(result.functionCalls).toBeUndefined();
  });

  it("tool_use レスポンスを FunctionCall に変換する", async () => {
    mockCreate.mockResolvedValue({
      content: [
        {
          type: "tool_use",
          name: "connect",
          input: {},
        },
      ],
    });

    const provider = new ClaudeProvider("test-key");
    const result = await provider.chat("接続して", testTools);

    expect(result.type).toBe("function_call");
    expect(result.functionCalls).toHaveLength(1);
    expect(result.functionCalls![0].name).toBe("connect");
    expect(result.functionCalls![0].arguments).toEqual({});
  });

  it("複数の tool_use を全て変換する", async () => {
    mockCreate.mockResolvedValue({
      content: [
        { type: "tool_use", name: "connect", input: {} },
        {
          type: "tool_use",
          name: "move",
          input: { left: 50, right: 50, duration: 1000 },
        },
      ],
    });

    const provider = new ClaudeProvider("test-key");
    const result = await provider.chat("接続して前に進んで", testTools);

    expect(result.functionCalls).toHaveLength(2);
    expect(result.functionCalls![0].name).toBe("connect");
    expect(result.functionCalls![1].name).toBe("move");
    expect(result.functionCalls![1].arguments).toEqual({
      left: 50,
      right: 50,
      duration: 1000,
    });
  });

  it("デフォルトモデルが使用される", async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: "text", text: "ok" }],
    });

    const provider = new ClaudeProvider("test-key");
    await provider.chat("テスト", testTools);

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "claude-sonnet-4-20250514",
      }),
    );
  });

  it("カスタムモデルを指定できる", async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: "text", text: "ok" }],
    });

    const provider = new ClaudeProvider("test-key", "claude-haiku-4-5-20251001");
    await provider.chat("テスト", testTools);

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "claude-haiku-4-5-20251001",
      }),
    );
  });
});
