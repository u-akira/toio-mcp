import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { toolDefinitions } from "./tools.js";

const server = new McpServer({
  name: "toio-mcp",
  version: "1.0.0",
});

for (const tool of toolDefinitions) {
  server.tool(tool.name, tool.description, tool.schema, async (args) => {
    const text = await tool.execute(args);
    return { content: [{ type: "text", text }] };
  });
}

const transport = new StdioServerTransport();
await server.connect(transport);
