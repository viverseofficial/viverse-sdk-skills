---
name: viverse-multiplayer
description: VIVERSE Matchmaking & Play SDK integration for multiplayer games. Use when building online 2-player games, turn-based sync, room create/join, or custom state sharing.
prerequisites: [VIVERSE Auth (checkAuth, account_id), VIVERSE SDK script tag, VIVERSE Studio App ID]
tags: [viverse, multiplayer, matchmaking, play-sdk, rooms, sync]
---

# VIVERSE Multiplayer Integration

Add online multiplayer with VIVERSE Matchmaking + Play SDK for room lifecycle and in-game sync.

## When To Use This Skill

Use when a project needs:
- Online 2+ player rooms
- Create/join/start game flow
- Custom state sync (turn-based or real-time)
- Reliable rejoin/leave behavior between test sessions

## Pre-Generation Checklist (Run Before Coding)

1. Define `actorIdOf(actor)` and `roomIdOf(room)` helpers that are null-safe.
2. Normalize all SDK room/actor payloads before any `.id` access.
3. Decide late-join recovery path up front:
   - `requestState` handshake, or
   - host periodic authoritative state replay.
4. Keep manual room controls (`Create`, `Join`, `Leave`) even if auto-match exists.
5. Gate `Start Match` by live actor count (`2/2` for 1v1) and host role.

## Read Order (Important)

1. This file (workflow + safety rules)
2. [patterns/matchmaking-flow.md](patterns/matchmaking-flow.md)
3. [patterns/robust-room-lifecycle.md](patterns/robust-room-lifecycle.md)
4. [patterns/move-sync-reliability.md](patterns/move-sync-reliability.md)
5. [examples/chess-move-sync.md](examples/chess-move-sync.md) for turn-based games

## Prerequisites

1. User authenticated (`checkAuth` success).
2. VIVERSE SDK loaded:
   ```html
   <script src="https://www.viverse.com/static-assets/viverse-sdk/index.umd.cjs"></script>
   <script src="https://www.viverse.com/static-assets/play-sdk/1.0.1/play-sdk.umd.js"></script>
   ```
3. App ID from [VIVERSE Studio](https://studio.viverse.com/).
4. Stable actor identity input (account id + per-connect unique suffix).

## Mandatory Compliance Gates (MUST PASS)

1. **MUST** create matchmaking with `playClient.newMatchmakingClient(appId)` and proactively call `mc.connect()` when available.
2. **MUST** wait for connect signal (`onConnect`/`connect`) with timeout; do not block forever waiting on events.
3. **MUST** run `setActor` after connect with a unique per-connect `session_id` (`accountId-timestamp-random`) and guard method availability (`mc.setActor?.(...)` or explicit `if (typeof mc.setActor === "function")`).
4. **MUST** use **Session-Matching Alpha** to resolve local `actor_id` by matching local `session_id` against `mc.getMyRoomActors()` or `room.actors`.
5. **MUST** initialize `MultiplayerClient` with `await mp.init({ modules: { general: { enabled: true } } })` before using `mp.general`.
6. **MUST NOT** call `mc.getActorId()` (non-existent API).
7. **MUST NOT** depend on `updateRoom(...)` as a portable room-state API; use `setRoomProperties(...)` for room properties.
8. **MUST** pass a raw room ID string to `joinRoom(...)` (not a room object).
9. **MUST** treat room properties as **host/creator-authoritative** for gameplay-critical state (`gameState`, `turn`, `phase`, scores).
10. **MUST NOT** let non-host clients call `setRoomProperties(...)` / `updateRoom(...)` for gameplay-critical fields.
11. **MUST** have non-host clients send move intents/snapshots via `MultiplayerClient.general.sendMessage(...)`, then host applies and publishes canonical state.
12. **MUST** commit one complete turn as **one authoritative state write** (no split write like PLAY then delayed DRAW write).
13. **MUST** verify host actor binding after create+join: confirm `session_id` exists in `mc.getMyRoomActors()` or `room.actors`; if missing, retry `setActor` + `joinRoom(roomId)` before entering waiting/start UI.
14. **MUST NOT** call `joinRoom(ROOM_KEY)` using a synthetic/shared key directly. Always discover existing rooms first and join by real `room.id`/`room.roomId`.
15. **MUST** normalize and validate `roomId` before `new MultiplayerClient(...)`; if missing, throw `Error("roomId is required")` and stop gameplay initialization.
16. **MUST** provide explicit room lifecycle actions (`createRoom`, `joinRoom`, `leaveRoom`) even when auto-match is enabled.
17. **MUST** guard actor/room normalization against `null` SDK entries; never read `.id` from untrusted payloads without object checks.
18. **MUST** provide late-join state recovery (`requestState` flow or host replay of authoritative state) so joiners cannot stay stuck in pre-start UI.

## Implementation Workflow

> [!IMPORTANT]
> Before coding, load and apply [patterns/robust-room-lifecycle.md](patterns/robust-room-lifecycle.md).
> It is the canonical create/join/auto-match and room cleanup recipe.

### 1) Init Play + Matchmaking (Hardened v3.7)

Do NOT rely on automatic connection. Use a Promise to guarantee the client is ready.

```javascript
const v = window.viverse || window.VIVERSE_SDK || window.vSdk;
const PlayClass = v.Play || v.play || window.play?.Play || window.Play;
const playClient = new PlayClass();

const mc = await playClient.newMatchmakingClient(appId);

// MANDATORY: Proactive unique session ID
const actorSessionId = `${user.accountId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

// MANDATORY: Explicit Connect with Promise Race
const isConnected = await new Promise((resolve) => {
    let resolved = false;
    const done = (val) => { if (!resolved) { resolved = true; resolve(val); } };
    mc.on("onConnect", () => done(true));
    mc.on("connect", () => done(true));
    setTimeout(() => done(false), 5000); // 5s timeout
    if (typeof mc.connect === 'function') mc.connect().catch(() => {});
});

if (!isConnected) console.warn('Matchmaking connection could not be verified, proceeding anyway...');

// MANDATORY: Manual actor setup (v3.8)
// Use the UNIQUE actorSessionId as the session_id to prevent stale session rebinding
if (typeof mc.setActor === "function") {
  await mc.setActor({
    session_id: actorSessionId,
    name: user.displayName || user.name || 'Player',
    properties: { avatarUrl: user.avatarUrl },
  });
} else {
  throw new Error("Matchmaking client setActor API unavailable");
}
```

### 3) Join or Create Room (Robust Flow)

**CRITICAL**: `joinRoom` requires a raw **Room ID string**, not an object.

```javascript
// Scan for existing lobby
const roomsRes = await mc.getAvailableRooms();
const rooms = roomsRes?.rooms || roomsRes || [];
const existing = rooms.find(r => r.name === "My_Game_Lobby");

let room;
if (existing) {
  // Join by ID
  const res = await mc.joinRoom(existing.id || existing.roomId);
  room = res?.room || res;
} else {
  // Create
  const res = await mc.createRoom({
    name: "My_Game_Lobby",
    mode: "Room",
    maxPlayers: 2,
    minPlayers: 1 // Allow host to enter immediately
  });
  room = res?.room || res;
  
  // MANDATORY: Host auto-join (ensures session consistency)
  const roomId = room?.id || room?.roomId;
  if (roomId) await mc.joinRoom(roomId);

  // MANDATORY: verify creator is actually in actor list
  let bound = false;
  for (let i = 0; i < 6; i++) {
    const actors = (await mc.getMyRoomActors?.().catch(() => [])) || room?.actors || [];
    if (actors.some(a => a.session_id === actorSessionId)) {
      bound = true;
      break;
    }
    await mc.setActor?.({ session_id: actorSessionId, name: user.displayName || 'Player', properties: {} }).catch(() => {});
    if (roomId) await mc.joinRoom(roomId).catch(() => {});
    await new Promise(r => setTimeout(r, 250));
  }
  if (!bound) throw new Error('Host session not bound to room after create/join retries');
}
```

### 4) Start game (host only)

```javascript
await matchmakingClient.startGame();
```

Joiner side listens for `onGameStartNotify`.

### 5) Init MultiplayerClient for sync

```javascript
const MClient =
  (v?.play || v?.Play)?.MultiplayerClient ||
  window.play?.MultiplayerClient ||
  window.Play?.MultiplayerClient;
if (!roomId) throw new Error("roomId is required");
let mp;
try {
  mp = new MClient(roomId, {
    app_id: appId,
    token: accessToken,
    authorization: accessToken,
    accessToken,
    session_id: actorSessionId
  });
} catch (_) {
  mp = new MClient(roomId, appId, actorSessionId);
}
await mp.init({ modules: { general: { enabled: true } } });
```

Register listeners before/around init when possible, then bridge both receive channels.

### 6) Send and receive messages

```javascript
mp.general.sendMessage(JSON.stringify({ type: "fen", fen: chess.fen() }));

mp.general.onMessage((raw) => {
  const data = typeof raw === "object" ? raw : JSON.parse(raw);
  if (data.type === "fen") chess.load(data.fen);
});
```

For turn-based games, send full state snapshots (for example FEN), not deltas.

For host-authoritative games:

```javascript
// joiner/non-host
mp.general.sendMessage(JSON.stringify({
  type: "STATE_SYNC",
  id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  gameState: nextState
}));

// host receives, validates, applies, then setRoomProperties({ gameState })
```

### Protocol evolution checklist (required)

When adding a new gameplay message type (for example `WEAPON`, `POWERUP`):

1. Add it to message-type constants used for send.
2. Add it to parser/validator allowlist (`VALID_TYPES` or equivalent).
3. Add handler branch on receiver side.
4. Add test log/assertion for message acceptance.

If step 2 is missed, packets are silently dropped by strict parsers.

## Room Lifecycle Best Practice

Before create/join in repeated tests:

1. Disconnect multiplayer client
2. If host, close room
3. Leave room
4. Disconnect matchmaking
5. Re-init and set actor again

This prevents stale-room rebinding and "game already started" failures.

### Lobby UX requirements (must-have)

- Show a dedicated `Leave Room` button whenever user is inside a room (host and joiner).
- `Back` should run full lifecycle cleanup; `Leave Room` should leave current room but keep matchmaking connected.
- Host leave order must remain:
  1. disconnect multiplayer
  2. close room
  3. leave room
- Joiner leave order must remain:
  1. disconnect multiplayer
  2. leave room
- After leave/create/join failure, refresh room list immediately to remove stale or not-joinable entries from UI.
- Block `Start Match` until room has required player count (for 1v1, `2/2`).
- Auto-refresh room list should not fight user interaction:
  - use slower polling interval by default
  - pause or defer list refresh while user is hovering/focusing/touching the room list
  - keep room ordering stable to prevent "Join" button position jumps

### Mobile lifecycle + zombie-session prevention

- Treat `visibilitychange` / `pagehide` as lifecycle events:
  - if app is backgrounded in active session for too long (for example >10s), return to lobby and run cleanup.
  - on `pagehide`, best-effort call multiplayer lifecycle cleanup.
- Add in-game heartbeat messages from both peers (for example every 2s).
- Host tracks peer heartbeat timeout (for example 12s):
  - if timed out, terminate session gracefully and clean room.
- Handle WebGL context loss (`webglcontextlost`) on mobile resume:
  - trigger session interruption flow and return to lobby rather than keeping a broken white screen.

### Host-authoritative dynamic world state (pickups/buffs)

For collectible gameplay state (pickups, temporary buffs):

1. Host is sole authority for collision/consume decisions.
2. Peers send intent only when needed; host validates and applies.
3. Host broadcasts authoritative delta (affected pickup + affected player fields).
4. Include dynamic state in periodic snapshot fallback (for example `pickups[]`, buff expiry timestamps).
5. Include all combat-relevant fields in respawn/snapshot payloads (weapon, cooldowns, timed buffs, hit feedback timestamps).

## Verification Checklist

- [ ] Two different users can create/join/start
- [ ] Both sides receive game-start signal
- [ ] Host leave closes room for joiners
- [ ] Joiner leave does not break host's ability to restart
- [ ] Move/state sync works for first move and late joiner catch-up
- [ ] No stale room is auto-rejoined after cleanup
- [ ] New message types are accepted by strict parser (not dropped)
- [ ] Host-authoritative pickup/buff flow stays consistent for both peers
- [ ] Respawn/snapshot payloads restore full combat state (not just transform/hp)
- [ ] Room list remains usable under auto-refresh (stable ordering + interaction-safe polling)

## Critical Gotchas

- **Session-Matching Alpha**: To find your `actor_id`, iterate `room.actors` and find the one where `actor.session_id === actorSessionId`.
- **MANDATORY**: Do NOT call `getActorId()`.
- Register/start handlers before calling `startGame` to avoid missed events.
- Use `mp.general.sendMessage(...)` with bound context; avoid detached fn refs.
- Bridge both `mp.onMessage` and `mp.general.onMessage` in mixed environments.
- Prefer `setRoomProperties(...)` for room state updates across SDK/runtime variants.
- Compute and send sync payload before React async state updates.
- Do not use non-host room-properties fallback for gameplay-critical state; route through host relay.
- Avoid multi-step turn commits that write partial intermediate states; publish one canonical post-turn snapshot.
- Host leave order matters: disconnect multiplayer -> close room -> leave room.
- Reuse of fixed session id can cause stale room rebinding; use fresh per-connect id.
- Adding send handlers without updating parser allowlist causes silent message loss in production.
- If joiner can directly mutate gameplay-critical state, desync and exploit risk increase; use host-authoritative apply + rebroadcast.

## References

- [patterns/matchmaking-flow.md](patterns/matchmaking-flow.md)
- [patterns/move-sync-reliability.md](patterns/move-sync-reliability.md)
- [examples/chess-move-sync.md](examples/chess-move-sync.md)
- [VIVERSE Matchmaking SDK Docs](https://docs.viverse.com/developer-tools/matchmaking-and-networking-sdk)
