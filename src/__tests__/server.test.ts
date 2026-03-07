import { describe, it, expect, vi, beforeEach } from "vitest";

const mockCube = {
  move: vi.fn(),
  stop: vi.fn(),
  turnOnLight: vi.fn(),
  playPresetSound: vi.fn(),
  getBatteryStatus: vi.fn().mockResolvedValue({ level: 80 }),
};

vi.mock("../cube-manager.js", () => ({
  cubeManager: {
    connect: vi.fn().mockResolvedValue("cube に接続した。(id: mock)"),
    disconnect: vi.fn().mockResolvedValue("切断した。"),
    getCube: vi.fn(() => mockCube),
    get isConnected() {
      return false;
    },
  },
}));

import { createApp } from "../app.js";
import type { LlmProvider } from "../llm/types.js";

const mockLlm: LlmProvider = {
  chat: vi.fn(),
};

let app: ReturnType<typeof createApp>;

beforeEach(() => {
  vi.clearAllMocks();
  app = createApp(mockLlm);
});

describe("GET /api/health", () => {
  it("ステータスを返す", async () => {
    const res = await app.request("/api/health");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ status: "ok", connected: false });
  });
});

describe("POST /api/chat", () => {
  it("message がないと 400 エラー", async () => {
    const res = await app.request("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("message");
  });

  it("LLM が text を返す場合", async () => {
    vi.mocked(mockLlm.chat).mockResolvedValue({
      type: "text",
      text: "了解した。",
    });

    const res = await app.request("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "こんにちは" }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ type: "text", result: "了解した。" });
  });

  it("LLM が function_call を返す場合、ツールを実行する", async () => {
    vi.mocked(mockLlm.chat).mockResolvedValue({
      type: "function_call",
      functionCalls: [{ name: "connect", arguments: {} }],
    });

    const res = await app.request("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "接続して" }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.type).toBe("function_call");
    expect(body.results).toHaveLength(1);
    expect(body.results[0].tool).toBe("connect");
    expect(body.results[0].result).toContain("cube に接続した");
  });

  it("不明なツール名の場合、エラーメッセージを含む", async () => {
    vi.mocked(mockLlm.chat).mockResolvedValue({
      type: "function_call",
      functionCalls: [{ name: "unknown_tool", arguments: {} }],
    });

    const res = await app.request("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "不明な操作" }),
    });
    const body = await res.json();
    expect(body.results[0].result).toContain("不明なツール");
  });
});

describe("POST /api/tools/:name", () => {
  it("存在するツールを実行する", async () => {
    const res = await app.request("/api/tools/stop", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.tool).toBe("stop");
    expect(body.result).toBe("停止した。");
  });

  it("存在しないツールは 404", async () => {
    const res = await app.request("/api/tools/unknown", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toContain("不明なツール");
  });

  it("body なしでもデフォルト引数で実行する", async () => {
    const res = await app.request("/api/tools/connect", {
      method: "POST",
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.result).toContain("cube に接続した");
  });
});
