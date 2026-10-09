# @nich87/discord-rpc

軽量で完全に型付けされたNode.js用Discord RPCクライアント

[![CI](https://github.com/Nich87/discord-rpc/actions/workflows/ci.yml/badge.svg)](https://github.com/Nich87/discord-rpc/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/@nich87/discord-rpc)](https://www.npmjs.com/package/@nich87/discord-rpc)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

## 特徴

- **Node.jsネイティブ** — `node:net` IPCソケットを使用し、Node.js ≥24専用にビルド
- **完全な型付け** — 型付き`EventEmitter`を含む完全なTypeScript型、`any`の漏れなし
- **依存関係ゼロ** — Node.jsの組み込みモジュールのみを使用
- **堅牢な接続** — ステートマシン、タイムアウト処理、Flatpak/Snap Discord対応
- **リクエストの相関** — Nonceベースのコマンド/レスポンスマッチング、自動タイムアウト
- **クリーンなライフサイクル** — 適切なリソースクリーンアップ（タイマー、リスナー、保留中のリクエスト）
- **検証済みビルダー** — 入力検証とFluentAPIを備えた`PresenceBuilder`

## インストール

```bash
npm install @nich87/discord-rpc
# または
pnpm add @nich87/discord-rpc
# または
yarn add @nich87/discord-rpc
```

## クイックスタート

```typescript
import { Client, PresenceBuilder, ActivityType } from '@nich87/discord-rpc';

const client = new Client();

// グレースフルシャットダウン
process.on('SIGINT', async () => {
	await client.destroy();
	process.exit(0);
});

// 接続
const { user } = await client.login({ clientId: 'YOUR_CLIENT_ID' });
console.log(`${user.username}としてログインしました`);

// リッチプレゼンスを設定
const activity = new PresenceBuilder()
	.setType(ActivityType.Playing)
	.setDetails('My awesome game')
	.setState('メインメニュー')
	.setStartTimestamp(Date.now())
	.setLargeImage('game_icon', 'My Game')
	.addButton('ウェブサイト', 'https://example.com')
	.build();

await client.setActivity(activity);
```

## APIリファレンス

### `Client`

メインのRPCクライアントクラス。型付きイベントを持つ`EventEmitter`を拡張します。

#### コンストラクタ

```typescript
const client = new Client({
	heartbeatInterval: 30_000, // Ping間隔（ミリ秒）、デフォルト: 30000
	connectionTimeout: 10_000, // 接続/リクエストタイムアウト（ミリ秒）、デフォルト: 10000
});
```

#### メソッド

| メソッド                                | 説明                                                       |
| --------------------------------------- | ---------------------------------------------------------- |
| `login(options)`                        | Discordに接続してハンドシェイクを実行。`ReadyData`を返す。 |
| `destroy()`                             | グレースフルに切断（最初にアクティビティをクリア）。       |
| `setActivity(activity)`                 | リッチプレゼンスを設定。                                   |
| `clearActivity()`                       | 現在のアクティビティをクリア。                             |
| `authorize(options)`                    | OAuth2認証をリクエスト。                                   |
| `authenticate(token)`                   | アクセストークンで認証。                                   |
| `exchangeCode(options)`                 | 認証コードをアクセストークンに交換（HTTP）。               |
| `subscribe(event, args?)`               | RPCイベントを購読。`{ unsubscribe }`を返す。               |
| `request(cmd, args?, evt?)`             | 生のコマンドを送信。                                       |
| `getAvatarUrl(userId, hash?, options?)` | CDNアバターURLを生成。                                     |
| `getRelationships()`                    | ユーザーのフレンドリストを取得（認証が必要）。             |
| `ping()`                                | キープアライブPingを送信。                                 |

#### ロビーメソッド

| メソッド                                        | 説明                   |
| ----------------------------------------------- | ---------------------- |
| `createLobby(type, capacity, metadata?)`        | 新しいロビーを作成。   |
| `updateLobby(lobbyId, options?)`                | ロビー設定を更新。     |
| `deleteLobby(lobbyId)`                          | ロビーを削除。         |
| `connectToLobby(lobbyId, secret)`               | ロビーに接続。         |
| `disconnectFromLobby(lobbyId)`                  | ロビーから切断。       |
| `sendToLobby(lobbyId, data)`                    | ロビーにデータを送信。 |
| `updateLobbyMember(lobbyId, userId, metadata?)` | ロビーメンバーを更新。 |

#### イベント

```typescript
client.on('ready', (data) => {
	/* ReadyData */
});
client.on('connected', () => {
	/* トランスポート接続済み */
});
client.on('disconnected', (reason?) => {
	/* 接続切断 */
});
client.on('error', (error) => {
	/* RPCError */
});
client.on('stateChange', (state) => {
	/* ConnectionState */
});
client.on('rpcEvent', (event, data) => {
	/* サブスクリプションディスパッチ */
});
```

#### プロパティ

| プロパティ        | 型                | 説明                                                                   |
| ----------------- | ----------------- | ---------------------------------------------------------------------- |
| `connectionState` | `ConnectionState` | 現在の状態: `'disconnected' \| 'connecting' \| 'connected' \| 'ready'` |
| `isReady`         | `boolean`         | クライアントがコマンドを送信できるかどうか                             |

### `PresenceBuilder`

検証機能付きの`Activity`ペイロード用Fluentビルダー。

```typescript
const presence = new PresenceBuilder()
	.setType(ActivityType.Playing)
	.setDetails('世界を探索中') // 最大128文字
	.setState('ゾーン: クリスタル洞窟') // 最大128文字
	.setStartTimestamp(Date.now())
	.setEndTimestamp(Date.now() + 3600000)
	.setLargeImage('world_map', 'ワールドマップ')
	.setSmallImage('character', 'レベル42')
	.setParty('party-id', 2, 5) // サイズを検証
	.setSecrets({ join: 'secret-123' })
	.addButton('参加', 'https://...') // 最大2つのボタン、ラベル最大32文字
	.setInstance(true)
	.build();
```

### エラークラス

| クラス            | 説明                                              |
| ----------------- | ------------------------------------------------- |
| `RPCError`        | 基本エラークラス                                  |
| `ConnectionError` | IPC接続失敗                                       |
| `CommandError`    | Discordコマンドエラー（`.code`を含む）            |
| `TimeoutError`    | 操作タイムアウト                                  |
| `StateError`      | 無効な状態（例: `login()`前にメソッドを呼び出す） |

### 定数

すべての定数は、より良いツリーシェイキングのために`as const`オブジェクトを使用：

```typescript
import {
	OpCode, // Handshake, Frame, Close, Ping, Pong
	Command, // SetActivity, Authorize, Authenticate, ...
	RPCEvent, // Ready, Error, ActivityJoin, ...
	ActivityType, // Playing, Streaming, Listening, Watching, Competing
	LobbyType, // Private, Public
	Scope, // OAuth2スコープ
	CloseCode, // IPCクローズコード
	RPCErrorCode, // Discord RPCエラーコード
} from '@nich87/discord-rpc';
```

## OAuth2フロー

```typescript
// 1. 認証をリクエスト
const { code } = await client.authorize({
	clientId: 'YOUR_CLIENT_ID',
	scopes: [Scope.Identify, Scope.RPC],
});

// 2. コードをトークンに交換（サーバーサイド推奨）
const { access_token } = await client.exchangeCode({
	clientId: 'YOUR_CLIENT_ID',
	clientSecret: 'YOUR_CLIENT_SECRET',
	code,
	redirectUri: 'http://localhost',
});

// 3. 認証
const auth = await client.authenticate(access_token);
console.log(`アプリ: ${auth.application.name}`);
```

## アーキテクチャ

```
┌──────────┐    IPC Socket     ┌─────────────┐
│  Client   │ ◄──────────────► │   Discord    │
│           │   Binary frames  │   Desktop    │
│  ┌──────┐ │                  │   Client     │
│  │Trans-│ │                  └─────────────┘
│  │port  │ │
│  └──────┘ │
└──────────┘
```

- **Transport** (`IPCTransport`): 低レベルのソケット管理、バイナリフレーミング、パイプ検出（Windows、Linux、macOS; Flatpak/Snap対応）
- **Client**: 高レベルAPI、イベント処理、リクエスト/レスポンス相関、ハートビート

## 要件

- **Node.js** ≥ 24.13.0
- **Discord Desktop**クライアントが実行されている必要があります

## 貢献

開発セットアップとガイドラインについては、[CONTRIBUTING.md](CONTRIBUTING.md)を参照してください。

## ライセンス

[MIT](LICENSE)
