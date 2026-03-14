import { describe, it, expect, vi, beforeEach } from "vitest";

const mockCube = {
  move: vi.fn(),
  stop: vi.fn(),
  turnOnLight: vi.fn(),
  playPresetSound: vi.fn(),
  getBatteryStatus: vi.fn().mockResolvedValue({ level: 75 }),
};

vi.mock("../cube-manager.js", () => ({
  cubeManager: {
    connect: vi.fn().mockResolvedValue("cube に接続した。(id: mock)"),
    disconnect: vi.fn().mockResolvedValue("切断した。"),
    getCube: vi.fn(() => mockCube),
    isConnected: true,
  },
}));

import { toolDefinitions, toJsonSchema } from "../tools.js";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("toolDefinitions", () => {
  it("8 個のツールが定義されている", () => {
    expect(toolDefinitions).toHaveLength(8);
  });

  it("全ツールに name, description, schema, execute がある", () => {
    for (const tool of toolDefinitions) {
      expect(tool.name).toBeTruthy();
      expect(tool.description).toBeTruthy();
      expect(tool.schema).toBeDefined();
      expect(typeof tool.execute).toBe("function");
    }
  });
});

describe("toJsonSchema", () => {
  it("空スキーマのツールは空の properties を返す", () => {
    const connectTool = toolDefinitions.find((t) => t.name === "connect")!;
    const schema = toJsonSchema(connectTool);
    expect(schema).toEqual({ type: "object", properties: {} });
  });

  it("フィールドありのツールは JSON Schema に変換する", () => {
    const moveTool = toolDefinitions.find((t) => t.name === "move")!;
    const schema = toJsonSchema(moveTool) as Record<string, unknown>;
    expect(schema.type).toBe("object");
    const properties = schema.properties as Record<string, unknown>;
    expect(properties).toHaveProperty("left");
    expect(properties).toHaveProperty("right");
    expect(properties).toHaveProperty("duration");
  });
});

describe("ツール実行", () => {
  it("connect → cubeManager.connect を呼ぶ", async () => {
    const tool = toolDefinitions.find((t) => t.name === "connect")!;
    const result = await tool.execute({});
    expect(result).toContain("cube に接続した");
  });

  it("disconnect → cubeManager.disconnect を呼ぶ", async () => {
    const tool = toolDefinitions.find((t) => t.name === "disconnect")!;
    const result = await tool.execute({});
    expect(result).toBe("切断した。");
  });

  it("move → cube.move を正しい引数で呼ぶ", async () => {
    const tool = toolDefinitions.find((t) => t.name === "move")!;
    const result = await tool.execute({ left: 50, right: 50, duration: 1000 });
    expect(mockCube.move).toHaveBeenCalledWith(50, 50, 1000);
    expect(result).toContain("left=50");
    expect(result).toContain("right=50");
    expect(result).toContain("duration=1000ms");
  });

  it("stop → cube.stop を呼ぶ", async () => {
    const tool = toolDefinitions.find((t) => t.name === "stop")!;
    const result = await tool.execute({});
    expect(mockCube.stop).toHaveBeenCalledOnce();
    expect(result).toBe("停止した。");
  });

  it("spin → cube.move(speed, -speed, duration) を呼ぶ", async () => {
    const tool = toolDefinitions.find((t) => t.name === "spin")!;
    const result = await tool.execute({ speed: 30, duration: 500 });
    expect(mockCube.move).toHaveBeenCalledWith(30, -30, 500);
    expect(result).toContain("speed=30");
  });

  it("set_led → cube.turnOnLight を正しい引数で呼ぶ", async () => {
    const tool = toolDefinitions.find((t) => t.name === "set_led")!;
    const result = await tool.execute({
      r: 255,
      g: 0,
      b: 128,
      duration: 3000,
    });
    expect(mockCube.turnOnLight).toHaveBeenCalledWith({
      durationMs: 3000,
      red: 255,
      green: 0,
      blue: 128,
    });
    expect(result).toContain("rgb(255, 0, 128)");
  });

  it("play_preset_sound → cube.playPresetSound を呼ぶ", async () => {
    const tool = toolDefinitions.find((t) => t.name === "play_preset_sound")!;
    const result = await tool.execute({ soundId: 3 });
    expect(mockCube.playPresetSound).toHaveBeenCalledWith(3);
    expect(result).toContain("soundId=3");
  });

  it("get_battery → バッテリー残量を返す", async () => {
    const tool = toolDefinitions.find((t) => t.name === "get_battery")!;
    const result = await tool.execute({});
    expect(mockCube.getBatteryStatus).toHaveBeenCalledOnce();
    expect(result).toContain("75%");
  });
});
