import "dotenv/config";
import { serve } from "@hono/node-server";
import { createApp } from "./app.js";
import { createLlmProvider } from "./llm/factory.js";

const llm = createLlmProvider();
const app = createApp(llm);

const port = Number(process.env.PORT ?? 3000);
serve({ fetch: app.fetch, port }, () => {
  console.log(`toio WebAPI サーバーを起動した: http://localhost:${port}`);
});
