# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

自然言語で toio ロボットキューブを制御する MCP サーバー。toio.js 経由で BLE 接続した toio を操作する。

**Stack:** TypeScript · Node.js ≥ 20 · `@toio/scanner` + `@toio/cube` · `@modelcontextprotocol/sdk` · `zod`

## Commands

すべて `toio-mcp/` ディレクトリで実行する。

```bash
npm install          # 依存パッケージのインストール
npm run build        # tsc で dist/ にコンパイル
npm run dev          # tsx で直接実行（開発用）
npm run inspect      # MCP Inspector でツールを対話的にテスト
```

Claude Desktop への登録 (`claude_desktop_config.json`):
```json
{
  "mcpServers": {
    "toio": {
      "command": "node",
      "args": ["C:/Users/work/vibe-coding/toio-mcp/dist/index.js"]
    }
  }
}
```

## Architecture

```
toio-mcp/src/
  index.ts          # McpServer 作成、全ツール登録、StdioServerTransport 接続
  cube-manager.ts   # toio cube の接続管理（シングルトンで接続状態を保持）
```

`cube-manager.ts` が接続状態を一元管理し、`index.ts` の各ツールハンドラが `cubeManager.getCube()` で接続済み cube を取得する。未接続時はエラーを返す。

## MCP ツール一覧

| ツール名 | 引数 | 動作 |
|----------|------|------|
| `connect` | なし | 最寄りの cube に BLE 接続 |
| `disconnect` | なし | 切断 |
| `move` | `left`, `right` (-115〜115), `duration` (ms) | 左右モーター制御 |
| `stop` | なし | 停止 |
| `spin` | `speed` (-115〜115), `duration` (ms) | その場で回転 |
| `set_led` | `r`, `g`, `b` (0-255), `duration?` (ms) | LED 色変更 |
| `play_preset_sound` | `soundId` (0-10) | 内蔵効果音を再生 |
| `get_battery` | なし | バッテリー残量を取得 |

## Windows セットアップ

toio.js の BLE ライブラリ（noble）はネイティブモジュールのビルドが必要である。

### 前提条件
1. **Bluetooth 4.0 以上** — 最近の Windows PC は内蔵 BLE で動作する。別途アダプタは不要なことが多い
2. **Visual Studio Build Tools 2022** + **VC++ ツールセット** — ネイティブモジュールのコンパイルに必要
3. **Python 3** — node-gyp が使用する

### インストール手順
1. Visual Studio Build Tools 2022 をインストールし、**「C++ によるデスクトップ開発」** ワークロードを選択する（VC++ ツールセットが含まれる）
2. `npm install` を実行する

### noble の差し替え
toio.js が依存する `noble` v1.9.1 は Windows 非対応である。`package.json` の `overrides` で `@abandonware/noble`（Windows WinRT BLE 対応フォーク）に差し替えている。

## Key Constraints

- **BLE 接続は物理デバイスが必要。** テスト時は実機が必要である。
- **macOS** は 10.13 以上を推奨（10.12 は BLE notify が遅い）。
- cube への接続は非同期で時間がかかるため、ツール呼び出し前に `connect` を実行済みであること。

## エージェントへのお願い

- 回答・ドキュメント・コード内のコメントは日本語の常体（で・ある調）を使用する。
