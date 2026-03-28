import { describe, it, expect, vi, beforeEach } from "vitest";

const mockCube = {
  move: vi.fn(),
  stop: vi.fn(),
  turnOnLight: vi.fn(),
  playPresetSound: vi.fn(),
  getBatteryStatus: vi.fn().mockResolvedValue({ level: 75 }),
  on: vi.fn(),
  off: vi.fn(),
};

vi.mock("../cube-manager.js", () => ({
  cubeManager: {
    connect: vi.fn().mockResolvedValue({
      message: "cube に接続した。(id: mock)",
      cubeInfo: { id: "mock", localName: null, address: "aa:bb" },
    }),
    disconnect: vi.fn().mockResolvedValue("切断した。(id: mock)"),
    getCube: vi.fn(() => mockCube),
    getConnectedIds: vi.fn(() => ["mock"]),
    isConnected: true,
  },
}));

import { toolDefinitions, toJsonSchema } from "../tools.js";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("toolDefinitions", () => {
  it("10 個のツールが定義されている", () => {
    expect(toolDefinitions).toHaveLength(10);
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
    expect(result).toContain("切断した");
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
    expect(result).toContain("停止した。");
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

  it("get_position → マット上の位置情報を返す", async () => {
    mockCube.on.mockImplementation((event: string, listener: (...args: unknown[]) => void) => {
      if (event === "id:position-id") {
        setTimeout(() => listener({ x: 100, y: 200, angle: 45, sensorX: 0, sensorY: 0 }), 10);
      }
    });
    const tool = toolDefinitions.find((t) => t.name === "get_position")!;
    const result = await tool.execute({ timeoutMs: 1000 });
    expect(result).toContain("x=100");
    expect(result).toContain("y=200");
    expect(result).toContain("角度=45");
    expect(mockCube.on).toHaveBeenCalledWith("id:position-id", expect.any(Function));
    expect(mockCube.off).toHaveBeenCalled();
  });

  it("get_position → マット外ではエラーメッセージを返す", async () => {
    mockCube.on.mockImplementation((event: string, listener: (...args: unknown[]) => void) => {
      if (event === "id:position-id-missed") {
        setTimeout(() => listener(), 10);
      }
    });
    const tool = toolDefinitions.find((t) => t.name === "get_position")!;
    const result = await tool.execute({ timeoutMs: 1000 });
    expect(result).toContain("マット上にない");
  });
});

describe("run_sequence", () => {
  const getTool = () => toolDefinitions.find((t) => t.name === "run_sequence")!;

  it("複数コマンドを順番に実行する", async () => {
    const tool = getTool();
    const result = await tool.execute({
      commands: [
        { tool: "move", args: { left: 50, right: 50, duration: 0 } },
        { tool: "spin", args: { speed: 30, duration: 0 } },
      ],
    });
    expect(mockCube.move).toHaveBeenCalledTimes(2);
    expect(mockCube.move).toHaveBeenNthCalledWith(1, 50, 50, 0);
    expect(mockCube.move).toHaveBeenNthCalledWith(2, 30, -30, 0);
    expect(result).toContain("[1] move:");
    expect(result).toContain("[2] spin:");
  });

  it("禁止ツール（connect, disconnect, run_sequence）はスキップする", async () => {
    const tool = getTool();
    const result = await tool.execute({
      commands: [
        { tool: "connect", args: {} },
        { tool: "disconnect", args: {} },
        { tool: "run_sequence", args: {} },
        { tool: "stop", args: {} },
      ],
    });
    expect(result).toContain("[1] スキップ");
    expect(result).toContain("[2] スキップ");
    expect(result).toContain("[3] スキップ");
    expect(result).toContain("[4] stop:");
    expect(mockCube.stop).toHaveBeenCalledOnce();
  });

  it("不明なツール名はエラーを返す", async () => {
    const tool = getTool();
    const result = await tool.execute({
      commands: [{ tool: "unknown_tool", args: {} }],
    });
    expect(result).toContain('不明なツール "unknown_tool"');
  });

  it("エラー発生時はそこで中断する", async () => {
    mockCube.move.mockImplementationOnce(() => {
      throw new Error("BLE エラー");
    });
    const tool = getTool();
    const result = await tool.execute({
      cubeId: "mock",
      commands: [
        { tool: "move", args: { left: 50, right: 50, duration: 0 } },
        { tool: "stop", args: {} },
      ],
    });
    expect(result).toContain("BLE エラー");
    expect(mockCube.stop).not.toHaveBeenCalled();
  });

  it("cubeId が各コマンドに自動付与される", async () => {
    const { cubeManager } = await import("../cube-manager.js");
    const tool = getTool();
    await tool.execute({
      cubeId: "mock",
      commands: [{ tool: "stop", args: {} }],
    });
    expect(cubeManager.getCube).toHaveBeenCalledWith("mock");
  });

  it("duration 分待ってから次のコマンドを実行する", async () => {
    vi.useFakeTimers();
    const tool = getTool();
    const promise = tool.execute({
      commands: [
        { tool: "move", args: { left: 10, right: 10, duration: 200 } },
        { tool: "stop", args: {} },
      ],
    });

    // move は即実行されるが、stop はまだ
    await vi.advanceTimersByTimeAsync(100);
    expect(mockCube.move).toHaveBeenCalledOnce();
    expect(mockCube.stop).not.toHaveBeenCalled();

    // 200ms 経過後に stop が実行される
    await vi.advanceTimersByTimeAsync(100);
    const result = await promise;
    expect(mockCube.stop).toHaveBeenCalledOnce();
    expect(result).toContain("[1] move:");
    expect(result).toContain("[2] stop:");

    vi.useRealTimers();
  });
});
