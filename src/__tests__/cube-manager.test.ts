import { describe, it, expect, vi, beforeEach } from "vitest";

const mockCube = {
  id: "test-cube-001",
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
      expect(result).toContain("cube に接続した");
      expect(result).toContain("test-cube-001");
      expect(mockCube.connect).toHaveBeenCalledOnce();
    });

    it("既に接続済みの場合はそのメッセージを返す", async () => {
      await cubeManager.connect();
      const result = await cubeManager.connect();
      expect(result).toBe("既に接続済みである。");
      expect(mockCube.connect).toHaveBeenCalledOnce();
    });
  });

  describe("disconnect", () => {
    it("接続中の cube を切断する", async () => {
      await cubeManager.connect();
      const result = await cubeManager.disconnect();
      expect(result).toBe("切断した。");
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
      const cube = cubeManager.getCube();
      expect(cube).toBe(mockCube);
    });

    it("未接続の場合はエラーを投げる", () => {
      expect(() => cubeManager.getCube()).toThrowError(
        "cube が接続されていない。先に connect を実行すること。",
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
