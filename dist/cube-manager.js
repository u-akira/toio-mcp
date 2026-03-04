import { NearestScanner } from "@toio/scanner";
class CubeManager {
    cube = null;
    async connect() {
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
        return `cube に接続した。(id: ${resolved.id})`;
    }
    async disconnect() {
        if (!this.cube) {
            return "接続中の cube はない。";
        }
        await this.cube.disconnect();
        this.cube = null;
        return "切断した。";
    }
    getCube() {
        if (!this.cube) {
            throw new Error("cube が接続されていない。先に connect を実行すること。");
        }
        return this.cube;
    }
    get isConnected() {
        return this.cube !== null;
    }
}
export const cubeManager = new CubeManager();
