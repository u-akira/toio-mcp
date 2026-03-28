import { describe, it, expect, vi, beforeEach } from "vitest";
import { EventEmitter } from "node:events";

// Cube のモック
const mockCubeInstances: Array<{
  id: string;
  address: string;
  connect: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
}> = [];

vi.mock("@toio/cube", () => ({
  Cube: class MockCube {
    static TOIO_SERVICE_ID = "10b201005b3b45719508cf3efcd7bbae";
    id: string;
    address: string;
    connect = vi.fn();
    disconnect = vi.fn();
    constructor(peripheral: { id: string; address: string }) {
      this.id = peripheral.id;
      this.address = peripheral.address;
      mockCubeInstances.push(this);
    }
  },
}));

let cubeManager: Awaited<typeof import("../cube-manager.js")>["cubeManager"];
let _setNobleForTest: Awaited<typeof import("../cube-manager.js")>["_setNobleForTest"];
let mockNoble: EventEmitter & {
  state: string;
  startScanning: ReturnType<typeof vi.fn>;
  stopScanning: ReturnType<typeof vi.fn>;
};

beforeEach(async () => {
  vi.resetModules();
  mockCubeInstances.length = 0;

  // noble モックを毎回作り直す
  mockNoble = Object.assign(new EventEmitter(), {
    state: "poweredOn" as string,
    startScanning: vi.fn(),
    stopScanning: vi.fn(),
  });

  const mod = await import("../cube-manager.js");
  cubeManager = mod.cubeManager;
  _setNobleForTest = mod._setNobleForTest;
  _setNobleForTest(mockNoble as never);
});

/** discover イベントで peripheral を報告するヘルパー */
function emitDiscover(
  peripheral: { id: string; address: string; rssi: number; advertisement?: { localName?: string }; state?: string },
  delayMs = 10,
): void {
  setTimeout(() => mockNoble.emit("discover", peripheral), delayMs);
}

describe("CubeManager", () => {
  describe("connect", () => {
    it("cube に接続してメッセージを返す", async () => {
      emitDiscover({ id: "test-cube-001", address: "aa:bb:cc:dd", rssi: -50 });
      const result = await cubeManager.connect();
      expect(result.message).toContain("cube に接続した");
      expect(result.message).toContain("test-cube-001");
      expect(result.cubeInfo.id).toBe("test-cube-001");
      expect(mockCubeInstances).toHaveLength(1);
      expect(mockCubeInstances[0].connect).toHaveBeenCalledOnce();
    });

    it("既接続の cube をスキップして新しい cube に接続する", async () => {
      // 1台目を接続
      emitDiscover({ id: "cube-A", address: "aa:aa", rssi: -40 });
      await cubeManager.connect();

      // 2台目: 既接続の cube-A と新しい cube-B の両方が discover される
      emitDiscover({ id: "cube-A", address: "aa:aa", rssi: -30 }, 10);
      emitDiscover({ id: "cube-B", address: "bb:bb", rssi: -50 }, 20);
      const result = await cubeManager.connect();

      expect(result.message).toContain("cube に接続した");
      expect(result.cubeInfo.id).toBe("cube-B");
    });

    it("未接続 peripheral が複数ある場合は RSSI が最も高いものを選ぶ", async () => {
      emitDiscover({ id: "cube-far", address: "ff:ff", rssi: -80 }, 10);
      emitDiscover({ id: "cube-near", address: "nn:nn", rssi: -30 }, 20);
      emitDiscover({ id: "cube-mid", address: "mm:mm", rssi: -50 }, 30);
      const result = await cubeManager.connect();
      expect(result.cubeInfo.id).toBe("cube-near");
    });

    it("全 cube が接続済みの場合はエラーを返す", async () => {
      // 1台目を接続
      emitDiscover({ id: "cube-only", address: "aa:aa", rssi: -40 });
      await cubeManager.connect();

      // 2台目: 既接続の cube しか見つからない
      emitDiscover({ id: "cube-only", address: "aa:aa", rssi: -40 });
      await expect(cubeManager.connect()).rejects.toThrow("未接続の cube が見つからなかった");
    });
  });

  describe("disconnect", () => {
    it("指定 ID の cube を切断する", async () => {
      emitDiscover({ id: "test-cube-001", address: "aa:bb:cc:dd", rssi: -50 });
      await cubeManager.connect();
      const result = await cubeManager.disconnect("test-cube-001");
      expect(result).toContain("切断した");
      expect(mockCubeInstances[0].disconnect).toHaveBeenCalledOnce();
    });

    it("ID 省略時は全切断する", async () => {
      emitDiscover({ id: "test-cube-001", address: "aa:bb:cc:dd", rssi: -50 });
      await cubeManager.connect();
      const result = await cubeManager.disconnect();
      expect(result).toContain("全");
      expect(result).toContain("切断した");
      expect(mockCubeInstances[0].disconnect).toHaveBeenCalledOnce();
    });

    it("未接続の場合はそのメッセージを返す", async () => {
      const result = await cubeManager.disconnect();
      expect(result).toBe("接続中の cube はない。");
    });
  });

  describe("getCube", () => {
    it("接続中の cube を返す", async () => {
      emitDiscover({ id: "test-cube-001", address: "aa:bb:cc:dd", rssi: -50 });
      await cubeManager.connect();
      const cube = cubeManager.getCube("test-cube-001");
      expect(cube).toBe(mockCubeInstances[0]);
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
      emitDiscover({ id: "test-cube-001", address: "aa:bb:cc:dd", rssi: -50 });
      await cubeManager.connect();
      expect(cubeManager.isConnected).toBe(true);
    });

    it("切断後は false", async () => {
      emitDiscover({ id: "test-cube-001", address: "aa:bb:cc:dd", rssi: -50 });
      await cubeManager.connect();
      await cubeManager.disconnect();
      expect(cubeManager.isConnected).toBe(false);
    });
  });
});
