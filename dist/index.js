import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { cubeManager } from "./cube-manager.js";
const server = new McpServer({
    name: "toio-mcp",
    version: "1.0.0",
});
// --- 接続管理 ---
server.tool("connect", "最寄りの toio cube に Bluetooth 接続する", {}, async () => {
    const message = await cubeManager.connect();
    return { content: [{ type: "text", text: message }] };
});
server.tool("disconnect", "toio cube との接続を切断する", {}, async () => {
    const message = await cubeManager.disconnect();
    return { content: [{ type: "text", text: message }] };
});
// --- モーター制御 ---
server.tool("move", "左右のモーター速度と時間を指定して cube を移動させる。速度は -115〜115（負で後退）、時間はミリ秒。", {
    left: z.coerce.number().min(-115).max(115).describe("左モーター速度"),
    right: z.coerce.number().min(-115).max(115).describe("右モーター速度"),
    duration: z.coerce.number().min(0).max(10000).describe("持続時間（ミリ秒）"),
}, async ({ left, right, duration }) => {
    const cube = cubeManager.getCube();
    cube.move(left, right, duration);
    return {
        content: [
            {
                type: "text",
                text: `移動: left=${left}, right=${right}, duration=${duration}ms`,
            },
        ],
    };
});
server.tool("stop", "cube の動きを停止する", {}, async () => {
    const cube = cubeManager.getCube();
    cube.stop();
    return { content: [{ type: "text", text: "停止した。" }] };
});
server.tool("spin", "cube をその場で回転させる。正の値で時計回り、負の値で反時計回り。", {
    speed: z.coerce.number().min(-115).max(115).describe("回転速度"),
    duration: z.coerce.number().min(0).max(10000).describe("持続時間（ミリ秒）"),
}, async ({ speed, duration }) => {
    const cube = cubeManager.getCube();
    cube.move(speed, -speed, duration);
    return {
        content: [
            { type: "text", text: `回転: speed=${speed}, duration=${duration}ms` },
        ],
    };
});
// --- LED ---
server.tool("set_led", "cube の LED の色を変更する。RGB 値（各 0〜255）で指定する。", {
    r: z.coerce.number().min(0).max(255).describe("赤 (0-255)"),
    g: z.coerce.number().min(0).max(255).describe("緑 (0-255)"),
    b: z.coerce.number().min(0).max(255).describe("青 (0-255)"),
    duration: z.coerce
        .number()
        .min(0)
        .max(10000)
        .default(2000)
        .describe("点灯時間（ミリ秒、デフォルト 2000）"),
}, async ({ r, g, b, duration }) => {
    const cube = cubeManager.getCube();
    cube.turnOnLight({ durationMs: duration, red: r, green: g, blue: b });
    return {
        content: [
            {
                type: "text",
                text: `LED を設定した: rgb(${r}, ${g}, ${b}), ${duration}ms`,
            },
        ],
    };
});
// --- サウンド ---
server.tool("play_preset_sound", "cube の内蔵効果音を再生する。soundId: 0=Enter, 1=Selected, 2=Cancel, 3=Cursor, 4=Mat in, 5=Mat out, 6=Get 1, 7=Get 2, 8=Get 3, 9=Effect 1, 10=Effect 2", {
    soundId: z.coerce.number().min(0).max(10).describe("効果音 ID (0-10)"),
}, async ({ soundId }) => {
    const cube = cubeManager.getCube();
    cube.playPresetSound(soundId);
    return {
        content: [{ type: "text", text: `効果音を再生した: soundId=${soundId}` }],
    };
});
// --- センサー ---
server.tool("get_battery", "cube のバッテリー残量を取得する", {}, async () => {
    const cube = cubeManager.getCube();
    const battery = await cube.getBatteryStatus();
    return {
        content: [
            { type: "text", text: `バッテリー残量: ${battery.level}%` },
        ],
    };
});
// --- サーバー起動 ---
const transport = new StdioServerTransport();
await server.connect(transport);
