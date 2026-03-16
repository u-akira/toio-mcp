import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import { cubeManager } from "./cube-manager.js";

export interface ToolDefinition {
  name: string;
  description: string;
  schema: Record<string, z.ZodTypeAny>;
  execute: (args: Record<string, unknown>) => Promise<string>;
}

/**
 * 指定された cubeId（または "all"）に対してアクションを実行するヘルパー。
 * "all" の場合は全台に実行して結果をまとめて返す。
 */
async function forCubes(
  cubeId: unknown,
  action: (id: string) => Promise<string>,
): Promise<string> {
  if (cubeId === "all" || cubeId === undefined) {
    const ids = cubeManager.getConnectedIds();
    if (ids.length === 0) {
      throw new Error("cube が接続されていない。先に connect を実行すること。");
    }
    const results = await Promise.all(
      ids.map(async (id) => {
        try {
          return `[${id}] ${await action(id)}`;
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          return `[${id}] エラー: ${msg}`;
        }
      }),
    );
    return results.join("\n");
  }

  return action(cubeId as string);
}

const cubeIdSchema = z
  .string()
  .optional()
  .describe('対象の cube ID。"all" で全台、省略時も全台');

export const toolDefinitions: ToolDefinition[] = [
  // --- 接続管理 ---
  {
    name: "connect",
    description: "最寄りの toio cube に Bluetooth 接続する（複数回呼ぶと追加接続）",
    schema: {},
    execute: async () => {
      const { message } = await cubeManager.connect();
      return message;
    },
  },
  {
    name: "disconnect",
    description:
      "toio cube との接続を切断する。cubeId 指定で個別切断、省略で全切断",
    schema: {
      cubeId: z.string().optional().describe("切断する cube の ID。省略時は全切断"),
    },
    execute: async (args) =>
      cubeManager.disconnect(args.cubeId as string | undefined),
  },

  // --- モーター制御 ---
  {
    name: "move",
    description:
      "左右のモーター速度と時間を指定して cube を移動させる。速度は -115〜115（負で後退）、時間はミリ秒。",
    schema: {
      cubeId: cubeIdSchema,
      left: z.coerce.number().min(-115).max(115).describe("左モーター速度"),
      right: z.coerce.number().min(-115).max(115).describe("右モーター速度"),
      duration: z.coerce
        .number()
        .min(0)
        .max(10000)
        .describe("持続時間（ミリ秒）"),
    },
    execute: async (args) =>
      forCubes(args.cubeId, async (id) => {
        const cube = cubeManager.getCube(id);
        cube.move(args.left as number, args.right as number, args.duration as number);
        return `移動: left=${args.left}, right=${args.right}, duration=${args.duration}ms`;
      }),
  },
  {
    name: "stop",
    description: "cube の動きを停止する",
    schema: {
      cubeId: cubeIdSchema,
    },
    execute: async (args) =>
      forCubes(args.cubeId, async (id) => {
        const cube = cubeManager.getCube(id);
        cube.stop();
        return "停止した。";
      }),
  },
  {
    name: "spin",
    description:
      "cube をその場で回転させる。正の値で時計回り、負の値で反時計回り。",
    schema: {
      cubeId: cubeIdSchema,
      speed: z.coerce.number().min(-115).max(115).describe("回転速度"),
      duration: z.coerce
        .number()
        .min(0)
        .max(10000)
        .describe("持続時間（ミリ秒）"),
    },
    execute: async (args) =>
      forCubes(args.cubeId, async (id) => {
        const cube = cubeManager.getCube(id);
        cube.move(args.speed as number, -(args.speed as number), args.duration as number);
        return `回転: speed=${args.speed}, duration=${args.duration}ms`;
      }),
  },

  // --- LED ---
  {
    name: "set_led",
    description: "cube の LED の色を変更する。RGB 値（各 0〜255）で指定する。",
    schema: {
      cubeId: cubeIdSchema,
      r: z.coerce.number().min(0).max(255).describe("赤 (0-255)"),
      g: z.coerce.number().min(0).max(255).describe("緑 (0-255)"),
      b: z.coerce.number().min(0).max(255).describe("青 (0-255)"),
      duration: z.coerce
        .number()
        .min(0)
        .max(10000)
        .default(2000)
        .describe("点灯時間（ミリ秒、デフォルト 2000）"),
    },
    execute: async (args) =>
      forCubes(args.cubeId, async (id) => {
        const cube = cubeManager.getCube(id);
        cube.turnOnLight({
          durationMs: args.duration as number,
          red: args.r as number,
          green: args.g as number,
          blue: args.b as number,
        });
        return `LED を設定した: rgb(${args.r}, ${args.g}, ${args.b}), ${args.duration}ms`;
      }),
  },

  // --- サウンド ---
  {
    name: "play_preset_sound",
    description:
      "cube の内蔵効果音を再生する。soundId: 0=Enter, 1=Selected, 2=Cancel, 3=Cursor, 4=Mat in, 5=Mat out, 6=Get 1, 7=Get 2, 8=Get 3, 9=Effect 1, 10=Effect 2",
    schema: {
      cubeId: cubeIdSchema,
      soundId: z.coerce.number().min(0).max(10).describe("効果音 ID (0-10)"),
    },
    execute: async (args) =>
      forCubes(args.cubeId, async (id) => {
        const cube = cubeManager.getCube(id);
        cube.playPresetSound(args.soundId as number);
        return `効果音を再生した: soundId=${args.soundId}`;
      }),
  },

  // --- センサー ---
  {
    name: "get_battery",
    description: "cube のバッテリー残量を取得する",
    schema: {
      cubeId: cubeIdSchema,
    },
    execute: async (args) =>
      forCubes(args.cubeId, async (id) => {
        const cube = cubeManager.getCube(id);
        const battery = await cube.getBatteryStatus();
        return `バッテリー残量: ${battery.level}%`;
      }),
  },
];

/** ツール定義の Zod スキーマを JSON Schema に変換する */
export function toJsonSchema(tool: ToolDefinition): Record<string, unknown> {
  const keys = Object.keys(tool.schema);
  if (keys.length === 0) {
    return { type: "object", properties: {} };
  }
  return zodToJsonSchema(z.object(tool.schema as z.ZodRawShape), {
    target: "openApi3",
  });
}
