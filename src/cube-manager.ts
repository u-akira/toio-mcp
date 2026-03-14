import { NearestScanner } from "@toio/scanner";
import type { Cube } from "@toio/cube";

class CubeManager {
  private cube: Cube | null = null;
  private localName: string | null = null;

  async connect(): Promise<string> {
    if (this.cube) {
      return "既に接続済みである。";
    }

    const cube = await new NearestScanner().start();
    const resolved = Array.isArray(cube) ? cube[0] : cube;
    if (!resolved) {
      throw new Error("cube が見つからなかった。");
    }

    await resolved.connect();
    this.cube = resolved;

    // peripheral は private だが、BLE の Complete Local Name を取得する
    const peripheral = (resolved as unknown as { peripheral: { advertisement?: { localName?: string } } }).peripheral;
    this.localName = peripheral?.advertisement?.localName ?? null;

    return `cube に接続した。(id: ${resolved.id})`;
  }

  async disconnect(): Promise<string> {
    if (!this.cube) {
      return "接続中の cube はない。";
    }

    await this.cube.disconnect();
    this.cube = null;
    this.localName = null;
    return "切断した。";
  }

  getCube(): Cube {
    if (!this.cube) {
      throw new Error("cube が接続されていない。先に connect を実行すること。");
    }
    return this.cube;
  }

  get isConnected(): boolean {
    return this.cube !== null;
  }

  /** 接続中の cube の情報を返す。未接続時は null */
  getCubeInfo(): { localName: string | null; address: string } | null {
    if (!this.cube) return null;
    return { localName: this.localName, address: this.cube.address };
  }
}

export const cubeManager = new CubeManager();
