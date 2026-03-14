import { Hono } from "hono";
import { serveStatic } from "@hono/node-server/serve-static";
import { z } from "zod";
import { toolDefinitions } from "./tools.js";
import { cubeManager } from "./cube-manager.js";
import type { LlmProvider } from "./llm/types.js";

const chatSchema = z.object({
  message: z.string().min(1),
});

/** LLM プロバイダを受け取って Hono アプリを構築する */
export function createApp(llm: LlmProvider): Hono {
  const app = new Hono();

  // グローバルエラーハンドラ — 未捕捉エラーも JSON で返す
  app.onError((err, c) => {
    const msg = err instanceof Error ? err.message : String(err);
    return c.json({ error: msg }, 500);
  });

  // ヘルスチェック
  app.get("/api/health", (c) => {
    return c.json({
      status: "ok",
      connected: cubeManager.isConnected,
      cubeInfo: cubeManager.getCubeInfo(),
    });
  });

  // 自然言語で制御
  app.post("/api/chat", async (c) => {
    const body = await c.req.json();
    const parsed = chatSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: "message フィールドが必要である。" }, 400);
    }

    const llmResponse = await llm.chat(parsed.data.message, toolDefinitions);

    if (llmResponse.type === "text") {
      return c.json({ type: "text", result: llmResponse.text });
    }

    const results: { tool: string; result: string }[] = [];
    for (const fc of llmResponse.functionCalls ?? []) {
      const tool = toolDefinitions.find((t) => t.name === fc.name);
      if (!tool) {
        results.push({ tool: fc.name, result: `不明なツール: ${fc.name}` });
        continue;
      }
      try {
        const result = await tool.execute(fc.arguments);
        results.push({ tool: fc.name, result });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        results.push({ tool: fc.name, result: `エラー: ${msg}` });
      }
    }

    // ツール実行結果を会話履歴に追加
    llm.addToolResults(
      results.map((r) => ({ name: r.tool, result: r.result })),
    );

    return c.json({ type: "function_call", results });
  });

  // 直接ツール呼び出し（LLM を介さない）
  app.post("/api/tools/:name", async (c) => {
    const toolName = c.req.param("name");
    const tool = toolDefinitions.find((t) => t.name === toolName);
    if (!tool) {
      return c.json({ error: `不明なツール: ${toolName}` }, 404);
    }

    const args = await c.req.json().catch(() => ({}));
    try {
      const result = await tool.execute(args as Record<string, unknown>);
      return c.json({ tool: toolName, result });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return c.json({ error: msg }, 500);
    }
  });

  // 静的ファイル配信（テスト UI） — GET のみ、API パスは除外
  app.get(
    "/*",
    serveStatic({ root: "./src/public/", rewriteRequestPath: (p) => p }),
  );

  return app;
}
