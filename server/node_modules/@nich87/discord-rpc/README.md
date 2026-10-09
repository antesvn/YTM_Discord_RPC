# @nich87/discord-rpc

A lightweight, fully-typed Discord RPC client for **Node.js** — zero external dependencies.

[![CI](https://github.com/Nich87/discord-rpc/actions/workflows/ci.yml/badge.svg)](https://github.com/Nich87/discord-rpc/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/@nich87/discord-rpc)](https://www.npmjs.com/package/@nich87/discord-rpc)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

## Features

- **Node.js Native** — Built exclusively for Node.js ≥24 using `node:net` IPC sockets
- **Fully Typed** — Complete TypeScript types with typed `EventEmitter`, no `any` leaks
- **Zero Dependencies** — Only uses Node.js built-in modules
- **Robust Connection** — State machine, timeout handling, and Flatpak/Snap Discord support
- **Request Correlation** — Nonce-based command/response matching with automatic timeout
- **Clean Lifecycle** — Proper resource cleanup (timers, listeners, pending requests)
- **Validated Builder** — `PresenceBuilder` with input validation and fluent API

## Installation

```bash
npm install @nich87/discord-rpc
# or
pnpm add @nich87/discord-rpc
# or
yarn add @nich87/discord-rpc
```

## Quick Start

```typescript
import { Client, PresenceBuilder, ActivityType } from '@nich87/discord-rpc';

const client = new Client();

// Graceful shutdown
process.on('SIGINT', async () => {
	await client.destroy();
	process.exit(0);
});

// Connect
const { user } = await client.login({ clientId: 'YOUR_CLIENT_ID' });
console.log(`Logged in as ${user.username}`);

// Set Rich Presence
const activity = new PresenceBuilder()
	.setType(ActivityType.Playing)
	.setDetails('My awesome game')
	.setState('In the main menu')
	.setStartTimestamp(Date.now())
	.setLargeImage('game_icon', 'My Game')
	.addButton('Website', 'https://example.com')
	.build();

await client.setActivity(activity);
```

## API Reference

### `Client`

The main RPC client class. Extends `EventEmitter` with typed events.

#### Constructor

```typescript
const client = new Client({
	heartbeatInterval: 30_000, // Ping interval (ms), default: 30000
	connectionTimeout: 10_000, // Connection/request timeout (ms), default: 10000
});
```

#### Methods

| Method                                  | Description                                                    |
| --------------------------------------- | -------------------------------------------------------------- |
| `login(options)`                        | Connect to Discord and perform handshake. Returns `ReadyData`. |
| `destroy()`                             | Gracefully disconnect (clears activity first).                 |
| `setActivity(activity)`                 | Set Rich Presence.                                             |
| `clearActivity()`                       | Clear current activity.                                        |
| `authorize(options)`                    | Request OAuth2 authorization.                                  |
| `authenticate(token)`                   | Authenticate with an access token.                             |
| `exchangeCode(options)`                 | Exchange auth code for access token (HTTP).                    |
| `subscribe(event, args?)`               | Subscribe to an RPC event. Returns `{ unsubscribe }`.          |
| `request(cmd, args?, evt?)`             | Send a raw command.                                            |
| `getAvatarUrl(userId, hash?, options?)` | Generate a CDN avatar URL.                                     |
| `getRelationships()`                    | Get the user's friends list (requires auth).                   |
| `ping()`                                | Send a keep-alive ping.                                        |

#### Lobby Methods

| Method                                          | Description              |
| ----------------------------------------------- | ------------------------ |
| `createLobby(type, capacity, metadata?)`        | Create a new lobby.      |
| `updateLobby(lobbyId, options?)`                | Update lobby settings.   |
| `deleteLobby(lobbyId)`                          | Delete a lobby.          |
| `connectToLobby(lobbyId, secret)`               | Connect to a lobby.      |
| `disconnectFromLobby(lobbyId)`                  | Disconnect from a lobby. |
| `sendToLobby(lobbyId, data)`                    | Send data to a lobby.    |
| `updateLobbyMember(lobbyId, userId, metadata?)` | Update a lobby member.   |

#### Events

```typescript
client.on('ready', (data) => {
	/* ReadyData */
});
client.on('connected', () => {
	/* Transport connected */
});
client.on('disconnected', (reason?) => {
	/* Connection lost */
});
client.on('error', (error) => {
	/* RPCError */
});
client.on('stateChange', (state) => {
	/* ConnectionState */
});
client.on('rpcEvent', (event, data) => {
	/* Subscription dispatch */
});
```

#### Properties

| Property          | Type              | Description                                                               |
| ----------------- | ----------------- | ------------------------------------------------------------------------- |
| `connectionState` | `ConnectionState` | Current state: `'disconnected' \| 'connecting' \| 'connected' \| 'ready'` |
| `isReady`         | `boolean`         | Whether the client can send commands                                      |

### `PresenceBuilder`

Fluent builder for `Activity` payloads with validation.

```typescript
const presence = new PresenceBuilder()
	.setType(ActivityType.Playing)
	.setDetails('Exploring the world') // max 128 chars
	.setState('Zone: Crystal Caves') // max 128 chars
	.setStartTimestamp(Date.now())
	.setEndTimestamp(Date.now() + 3600000)
	.setLargeImage('world_map', 'World Map')
	.setSmallImage('character', 'Level 42')
	.setParty('party-id', 2, 5) // validates size
	.setSecrets({ join: 'secret-123' })
	.addButton('Join', 'https://...') // max 2 buttons, label max 32 chars
	.setInstance(true)
	.build();
```

### Error Classes

| Class             | Description                                            |
| ----------------- | ------------------------------------------------------ |
| `RPCError`        | Base error class                                       |
| `ConnectionError` | IPC connection failures                                |
| `CommandError`    | Discord command errors (includes `.code`)              |
| `TimeoutError`    | Operation timeouts                                     |
| `StateError`      | Invalid state (e.g., calling methods before `login()`) |

### Constants

All constants use `as const` objects for better tree-shaking:

```typescript
import {
	OpCode, // Handshake, Frame, Close, Ping, Pong
	Command, // SetActivity, Authorize, Authenticate, ...
	RPCEvent, // Ready, Error, ActivityJoin, ...
	ActivityType, // Playing, Streaming, Listening, Watching, Competing
	LobbyType, // Private, Public
	Scope, // OAuth2 scopes
	CloseCode, // IPC close codes
	RPCErrorCode, // Discord RPC error codes
} from '@nich87/discord-rpc';
```

## OAuth2 Flow

```typescript
// 1. Request authorization
const { code } = await client.authorize({
	clientId: 'YOUR_CLIENT_ID',
	scopes: [Scope.Identify, Scope.RPC],
});

// 2. Exchange code for token (server-side recommended)
const { access_token } = await client.exchangeCode({
	clientId: 'YOUR_CLIENT_ID',
	clientSecret: 'YOUR_CLIENT_SECRET',
	code,
	redirectUri: 'http://localhost',
});

// 3. Authenticate
const auth = await client.authenticate(access_token);
console.log(`App: ${auth.application.name}`);
```

## Architecture

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

- **Transport** (`IPCTransport`): Low-level socket management, binary framing, pipe discovery (Windows, Linux, macOS; Flatpak/Snap support)
- **Client**: High-level API, event handling, request/response correlation, heartbeat

## Requirements

- **Node.js** ≥ 24.13.0
- **Discord Desktop** client must be running

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup and guidelines.

## License

[MIT](LICENSE)
