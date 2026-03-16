import { describe, it, expect, vi, beforeEach } from "vitest";

const mockCube = {
  id: "test-cube-001",
  address: "aa:bb:cc:dd",
  connect: vi.fn(),
  disconnect: vi.fn(),
};

vi.mock("@toio/scanner", () => ({
  NearestScanner: class {
    start() {
      return Promise.resolve(mockCube);
    }
  },
}));

// cube-manager はシングルトンなので、テストごとに新しいインスタンスが必要
let cubeManager: Awaited<typeof import("../cube-manager.js")>["cubeManager"];

beforeEach(async () => {
  vi.resetModules();
  const mod = await import("../cube-manager.js");
  cubeManager = mod.cubeManager;
  mockCube.connect.mockReset();
  mockCube.disconnect.mockReset();
});

describe("CubeManager", () => {
  describe("connect", () => {
    it("cube に接続してメッセージを返す", async () => {
      const result = await cubeManager.connect();
      expect(result.message).toContain("cube に接続した");
      expect(result.message).toContain("test-cube-001");
      expect(result.cubeInfo.id).toBe("test-cube-001");
      expect(mockCube.connect).toHaveBeenCalledOnce();
    });

    it("既に接続済みの場合はそのメッセージを返す", async () => {
      await cubeManager.connect();
      const result = await cubeManager.connect();
      expect(result.message).toContain("既に接続済みである");
      expect(mockCube.connect).toHaveBeenCalledOnce();
    });
  });

  describe("disconnect", () => {
    it("指定 ID の cube を切断する", async () => {
      await cubeManager.connect();
      const result = await cubeManager.disconnect("test-cube-001");
      expect(result).toContain("切断した");
      expect(mockCube.disconnect).toHaveBeenCalledOnce();
    });

    it("ID 省略時は全切断する", async () => {
      await cubeManager.connect();
      const result = await cubeManager.disconnect();
      expect(result).toContain("全");
      expect(result).toContain("切断した");
      expect(mockCube.disconnect).toHaveBeenCalledOnce();
    });

    it("未接続の場合はそのメッセージを返す", async () => {
      const result = await cubeManager.disconnect();
      expect(result).toBe("接続中の cube はない。");
    });
  });

  describe("getCube", () => {
    it("接続中の cube を返す", async () => {
      await cubeManager.connect();
      const cube = cubeManager.getCube("test-cube-001");
      expect(cube).toBe(mockCube);
    });

    it("未接続の ID を指定するとエラーを投げる", () => {
      expect(() => cubeManager.getCube("unknown")).toThrowError(
        "cube が接続されていない",
      );
    });
  });

  describe("isConnected", () => {
    it("初期状態は false", () => {
      expect(cubeManager.isConnected).toBe(false);
    });

    it("接続後は true", async () => {
      await cubeManager.connect();
      expect(cubeManager.isConnected).toBe(true);
    });

    it("切断後は false", async () => {
      await cubeManager.connect();
      await cubeManager.disconnect();
      expect(cubeManager.isConnected).toBe(false);
    });
  });
});
