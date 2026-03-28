import { createRequire } from "node:module";
import { NearestScanner } from "@toio/scanner";
import { Cube } from "@toio/cube";

const require = createRequire(import.meta.url);

interface Noble {
  state: string;
  startScanning: (ids: string[], allowDuplicates?: boolean) => void;
  stopScanning: () => void;
  removeAllListeners: (event: string) => void;
  listenerCount: (event: string) => number;
  emit: (event: string, ...args: unknown[]) => void;
}

function log(message: string, data?: Record<string, unknown>): void {
  const ts = new Date().toISOString();
  const extra = data ? ` ${JSON.stringify(data)}` : "";
  console.log(`[${ts}] [cube-manager] ${message}${extra}`);
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`タイムアウト (${ms}ms)`)), ms),
    ),
  ]);
}

/** noble を動的に取得する（テスト環境ではネイティブモジュールが無い場合がある） */
function getNoble(): Noble | null {
  try {
    // overrides で noble → @abandonware/noble に差し替えているため、
    // require 先は "noble" である
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require("noble");
  } catch {
    return null;
  }
}

export interface CubeInfo {
  id: string;
  localName: string | null;
  address: string;
}

export interface HealthCheckResult {
  id: string;
  localName: string | null;
  healthy: boolean;
  battery: number | null;
  error?: string;
}

/** キャンセルを示すセンチネル値 */
const SCAN_CANCELLED = Symbol("SCAN_CANCELLED");

class CubeManager {
  private cubes: Map<string, { cube: Cube; localName: string | null }> =
    new Map();
  private activeScanner: NearestScanner | null = null;
  private cancelResolve: ((value: typeof SCAN_CANCELLED) => void) | null = null;

  /** スキャン中かどうか */
  get isScanning(): boolean {
    return this.activeScanner !== null;
  }

  /** 最寄りの未接続 cube を1台追加する */
  async connect(): Promise<{ message: string; cubeInfo: CubeInfo }> {
    if (this.activeScanner) {
      log("前回のスキャンが残っている。キャンセルする");
      this.cancelScan();
    }

    log("スキャン開始", { connectedCubes: this.getConnectedIds() });

    const scanner = new NearestScanner();
    this.activeScanner = scanner;

    // キャンセル用 Promise を作成し、scanner.start() と race させる
    const cancelPromise = new Promise<typeof SCAN_CANCELLED>((resolve) => {
      this.cancelResolve = resolve;
    });

    this.cleanupNoble();

    // scanner.start() は stateChange イベント経由で startScanning を呼ぶが、
    // 2回目以降は既に poweredOn のため発火しない。
    // scanner がリスナーを登録した後に、allowDuplicates=true で手動スキャンを開始する。
    // allowDuplicates=true がないと切断済みデバイスが再発見されない。
    const scanStartPromise = scanner.start();
    const noble = getNoble();
    if (noble) {
      log("noble 状態", {
        state: noble.state,
        discoverListeners: noble.listenerCount("discover"),
        stateChangeListeners: noble.listenerCount("stateChange"),
      });
      if (noble.state === "poweredOn") {
        log("手動で startScanning 呼び出し (allowDuplicates=true)");
        noble.startScanning([Cube.TOIO_SERVICE_ID], true);
      }
    } else {
      log("noble が取得できなかった");
    }

    let result: Cube | Cube[] | typeof SCAN_CANCELLED;
    try {
      result = await Promise.race([scanStartPromise, cancelPromise]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      log("スキャン中にエラー", { error: msg });
      this.activeScanner = null;
      this.cancelResolve = null;
      throw e;
    }
    this.activeScanner = null;
    this.cancelResolve = null;

    if (result === SCAN_CANCELLED) {
      log("スキャンがキャンセルされた");
      return { message: "スキャンをキャンセルした。", cubeInfo: null as unknown as CubeInfo };
    }

    const resolved = Array.isArray(result) ? result[0] : result;
    if (!resolved) {
      log("cube が見つからなかった");
      throw new Error("cube が見つからなかった。");
    }

    log("cube を発見", { id: resolved.id, address: resolved.address });

    // 既に接続済みの cube は弾く
    if (this.cubes.has(resolved.id)) {
      log("既に接続済み", { id: resolved.id });
      return {
        message: `既に接続済みである。(id: ${resolved.id})`,
        cubeInfo: this.buildCubeInfo(resolved.id)!,
      };
    }

    log("BLE 接続中…", { id: resolved.id });
    await resolved.connect();

    const peripheral = (
      resolved as unknown as {
        peripheral: { advertisement?: { localName?: string } };
      }
    ).peripheral;
    const localName = peripheral?.advertisement?.localName ?? null;

    this.cubes.set(resolved.id, { cube: resolved, localName });

    log("接続完了", { id: resolved.id, localName, address: resolved.address });
    return {
      message: `cube に接続した。(id: ${resolved.id})`,
      cubeInfo: { id: resolved.id, localName, address: resolved.address },
    };
  }

  /** 進行中のスキャンをキャンセルする */
  cancelScan(): string {
    if (!this.activeScanner) {
      log("cancelScan: スキャン中ではない");
      return "スキャン中ではない。";
    }
    log("cancelScan: スキャンを停止する");
    this.activeScanner.stop();
    this.activeScanner = null;
    if (this.cancelResolve) {
      this.cancelResolve(SCAN_CANCELLED);
      this.cancelResolve = null;
    }
    return "スキャンをキャンセルした。";
  }

  /** noble の orphan リスナーと状態をクリアする */
  private cleanupNoble(): void {
    const noble = getNoble();
    if (noble) {
      const before = {
        discover: noble.listenerCount("discover"),
        stateChange: noble.listenerCount("stateChange"),
      };
      noble.stopScanning();
      noble.removeAllListeners("discover");
      noble.removeAllListeners("stateChange");
      log("cleanupNoble", {
        before,
        after: {
          discover: noble.listenerCount("discover"),
          stateChange: noble.listenerCount("stateChange"),
        },
      });
    }
  }

  /** 指定 ID の cube を切断する。省略時は全切断 */
  async disconnect(cubeId?: string): Promise<string> {
    if (cubeId) {
      const entry = this.cubes.get(cubeId);
      if (!entry) {
        log("disconnect: 対象が見つからない", { cubeId });
        return `id=${cubeId} の cube は接続されていない。`;
      }
      log("disconnect: 個別切断", { cubeId });
      await entry.cube.disconnect();
      this.cubes.delete(cubeId);
      if (this.cubes.size === 0) this.cleanupNoble();
      return `切断した。(id: ${cubeId})`;
    }

    if (this.cubes.size === 0) {
      log("disconnect: 接続中の cube なし");
      return "接続中の cube はない。";
    }
    log("disconnect: 全切断", { count: this.cubes.size, ids: this.getConnectedIds() });
    for (const [, entry] of this.cubes) {
      await entry.cube.disconnect();
    }
    const count = this.cubes.size;
    this.cubes.clear();
    this.cleanupNoble();
    return `全 ${count} 台を切断した。`;
  }

  /** 指定 ID の cube を取得する */
  getCube(cubeId: string): Cube {
    const entry = this.cubes.get(cubeId);
    if (!entry) {
      throw new Error(
        `id=${cubeId} の cube が接続されていない。先に connect を実行すること。`,
      );
    }
    return entry.cube;
  }

  /** 接続中の全 cube ID を返す */
  getConnectedIds(): string[] {
    return [...this.cubes.keys()];
  }

  get isConnected(): boolean {
    return this.cubes.size > 0;
  }

  /** 接続中の全 cube の情報を返す */
  getAllCubeInfo(): CubeInfo[] {
    return [...this.cubes.entries()].map(([id, entry]) => ({
      id,
      localName: entry.localName,
      address: entry.cube.address,
    }));
  }

  /** 各接続済み cube に BLE 通信して生存確認する */
  async healthCheck(): Promise<HealthCheckResult[]> {
    const results: HealthCheckResult[] = [];
    for (const [id, entry] of this.cubes) {
      try {
        const battery = await withTimeout(entry.cube.getBatteryStatus(), 5000);
        results.push({
          id,
          localName: entry.localName,
          healthy: true,
          battery: battery.level,
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        log("healthCheck: 通信失敗", { id, error: msg });
        results.push({
          id,
          localName: entry.localName,
          healthy: false,
          battery: null,
          error: msg,
        });
      }
    }
    return results;
  }

  /** 指定した cube 1 台だけ BLE 通信して生存確認する */
  async healthCheckSingle(cubeId: string): Promise<HealthCheckResult> {
    const entry = this.cubes.get(cubeId);
    if (!entry) {
      throw new Error(`id=${cubeId} の cube が接続されていない。`);
    }
    try {
      const battery = await withTimeout(entry.cube.getBatteryStatus(), 5000);
      return { id: cubeId, localName: entry.localName, healthy: true, battery: battery.level };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      log("healthCheckSingle: 通信失敗", { id: cubeId, error: msg });
      return { id: cubeId, localName: entry.localName, healthy: false, battery: null, error: msg };
    }
  }

  private buildCubeInfo(id: string): CubeInfo | null {
    const entry = this.cubes.get(id);
    if (!entry) return null;
    return { id, localName: entry.localName, address: entry.cube.address };
  }
}

export const cubeManager = new CubeManager();
