# toio-mcp

自然言語で toio ロボットキューブを制御する MCP サーバー。
toio.js 経由で BLE 接続した toio を、Claude Desktop や MCP 対応クライアントから操作できる。

## 前提条件

- **Node.js 20 以上**
- **Bluetooth 4.0 (BLE) 対応** の PC
- **toio Core Cube** （実機が必要）

### Windows の場合

toio.js が依存する noble のネイティブモジュールをビルドするため、以下が追加で必要である。

1. **Visual Studio Build Tools 2022** — 「C++ によるデスクトップ開発」ワークロードを選択してインストールする
2. **Python 3** — node-gyp が使用する

> `package.json` の `overrides` で `noble` を Windows WinRT BLE 対応の `@abandonware/noble` に差し替えている。

## セットアップ

```bash
cd toio-mcp
npm install
npm run build
```

## WebAPI サーバー

stackchan などの外部デバイスから自然言語で toio を操作するための WebAPI サーバーを内蔵している。
自然言語テキストを LLM（Claude / OpenAI）が解釈し、toio の操作に変換して実行する。

### 環境変数の設定

`.env.example` をコピーして `.env` を作成し、API キーを設定する。

```bash
cp .env.example .env
```

`.env` の内容:

```env
# LLM プロバイダ（claude または openai）
LLM_PROVIDER=claude

# Claude API を使う場合
ANTHROPIC_API_KEY=sk-ant-...

# OpenAI API を使う場合
# OPENAI_API_KEY=sk-...

# モデル名（省略時はデフォルト値を使用）
# LLM_MODEL=claude-sonnet-4-20250514

# WebAPI サーバーのポート番号
PORT=3000
```

### WebAPI の起動

```bash
npm run dev:web    # 開発モード（tsx で直接実行）
npm run start:web  # ビルド済みファイルで起動
```

### エンドポイント

| メソッド | パス | 説明 | リクエストボディ |
|---------|------|------|-----------------|
| GET | `/api/health` | ヘルスチェック | なし |
| POST | `/api/chat` | 自然言語で制御 | `{ "message": "前に進んで" }` |
| POST | `/api/tools/:name` | LLM を介さず直接制御 | ツール引数の JSON |

### リクエスト例

```bash
# 自然言語で制御
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "前に進んで"}'

# 直接ツール呼び出し
curl -X POST http://localhost:3000/api/tools/move \
  -H "Content-Type: application/json" \
  -d '{"left": 50, "right": 50, "duration": 1000}'
```

## MCP サーバーの起動方法

### 1. Claude Desktop から使う（推奨）

Claude Desktop の設定ファイル `claude_desktop_config.json` に以下を追加する。
`args` のパスは実際のインストール先に合わせて変更すること。

```json
{
  "mcpServers": {
    "toio": {
      "command": "node",
      "args": ["/path/to/toio-mcp/dist/index.js"]
    }
  }
}
```

設定後、Claude Desktop を再起動すると toio ツールが利用可能になる。

### 2. Claude Code から使う

Claude Code の MCP 設定（`.claude/settings.json` など）に同様のサーバー定義を追加する。

### 3. 開発モードで起動する

ビルドなしで直接実行する場合は以下を使用する。

```bash
npm run dev
```

### 4. MCP Inspector でテストする

MCP Inspector を使って各ツールを対話的にテストできる。

```bash
npm run inspect
```

## 使い方

1. MCP クライアント（Claude Desktop など）から `connect` ツールを呼び出し、toio cube に BLE 接続する
2. `move`, `spin`, `set_led` などのツールで cube を操作する
3. 操作が終わったら `disconnect` で切断する

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

## 技術スタック

- TypeScript
- Node.js ≥ 20
- `@toio/scanner` + `@toio/cube`
- `@modelcontextprotocol/sdk`
- `zod`
