# Matchmaking Flow Pattern

End-to-end flow for VIVERSE multiplayer: connect → create/join room → start game → sync state.

## 1. Connect to Matchmaking

```javascript
await initPlayClient();
await initMatchmakingClient();

// Proactive connect first (when SDK exposes it)
if (typeof matchmakingClient.connect === "function") {
  await matchmakingClient.connect();
}

// Wait for connect with timeout (do not hang indefinitely)
const connected = await new Promise((resolve) => {
  let done = false;
  const finish = (v) => {
    if (done) return;
    done = true;
    matchmakingClient.off?.("onConnect", onConnect);
    matchmakingClient.off?.("connect", onConnect);
    resolve(v);
  };
  const onConnect = () => finish(true);
  matchmakingClient.on("onConnect", onConnect);
  matchmakingClient.on("connect", onConnect);
  setTimeout(() => finish(Boolean(matchmakingClient.connected || matchmakingClient.isConnected)), 5000);
});
if (!connected) console.warn("Matchmaking connection could not be verified.");

// Generate unique session ID to prevent "undefined" or guest collisions
const actorSessionId = `${user.accountId || user.account_id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

if (typeof matchmakingClient.setActor === "function") {
  await matchmakingClient.setActor({
    session_id: actorSessionId,
    name: user.displayName || user.name || "Player",
    properties: {}
  });
} else {
  throw new Error("Matchmaking client setActor API unavailable");
}
```

## 2. Join or Create Room (Robust Flow)

**CRITICAL**: `joinRoom` requires a raw **Room ID string**, not an object.

```javascript
// Scan for existing sessions by name
const roomsRes = await matchmakingClient.getAvailableRooms();
const rooms = roomsRes?.rooms || roomsRes || [];
const existingRoom = rooms.find(r => r.name === "My_Game_Room");

let room;
if (existingRoom) {
  // JOIN: Must use the roomId string
  const roomId = existingRoom.id || existingRoom.roomId;
  const res = await matchmakingClient.joinRoom(roomId);
  room = res?.room || res;
} else {
  // CREATE
  const res = await matchmakingClient.createRoom({
    name: "My_Game_Room",
    mode: "Room",
    maxPlayers: 2,
    minPlayers: 1 // Recommended: allow host entry
  });
  room = res?.room || res;
  
  // HOST AUTO-JOIN: Ensures creator is bound to the room session
  const roomId = room?.id || room?.roomId;
  if (roomId) await matchmakingClient.joinRoom(roomId);

  // CRITICAL: some SDK/runtime variants still fail to attach creator actor immediately.
  // Verify by session_id and self-heal with setActor + rejoin retries.
  let attached = false;
  for (let i = 0; i < 6; i++) {
    const actors = await matchmakingClient.getMyRoomActors?.().catch(() => []) || room?.actors || [];
    if (actors.some((a) => a.session_id === actorSessionId)) {
      attached = true;
      break;
    }
    await matchmakingClient.setActor?.({ session_id: actorSessionId, name: displayName || "Player", properties: {} }).catch(() => {});
    if (roomId) await matchmakingClient.joinRoom(roomId).catch(() => {});
    await new Promise((r) => setTimeout(r, 250));
  }
  if (!attached) throw new Error("Creator actor not attached after create/join retries");
}
```

### Null-safe normalization (required)

Some SDK variants can return `null` entries in actor/room arrays. Normalize first.

```javascript
const asObject = (v) => (v && typeof v === "object" ? v : {});
const actorIdOf = (actor) => {
  const a = asObject(actor);
  return a.id || a.actor_id || a.actorId || a.session_id || a.sessionId || "";
};
const roomIdOf = (room) => {
  const r = asObject(room);
  return r.id || r.roomId || r.game_session || "";
};
const normalizeActors = (list) =>
  (Array.isArray(list) ? list : [])
    .map((a) => asObject(a))
    .map((a) => ({ ...a, id: actorIdOf(a) }))
    .filter((a) => a.id);
```

**List rooms** (optional):
```javascript
const { rooms } = await matchmakingClient.getAvailableRooms();
// Or subscribe: matchmakingClient.on("onRoomListUpdate", setRooms);
```

## 3. Wait for 2 Players, Start Game

Listen for actor changes:
```javascript
matchmakingClient.on("onRoomActorChange", (payload) => {
  const actors = Array.isArray(payload) ? payload : (payload?.actors || []);
  if (actors.length >= 2 && amMaster) {
    // Show "Start Game" button
  }
});
```

Note: some SDK variants send `onJoinRoom` / `onRoomUpdate` as `{ room: {...} }` wrappers.
Always normalize with `const room = data?.room || data`.

Master starts:
```javascript
await matchmakingClient.startGame();
```

Non-master listens:
```javascript
matchmakingClient.on("onGameStartNotify", () => {
  // Init MultiplayerClient and enter game
});
```

## 4. Init Multiplayer Client

After start (both master and non-master):
```javascript
const roomId = room?.id || room?.roomId || room?.game_session;
if (!roomId) throw new Error("roomId is required");
const MClient = v.play?.MultiplayerClient || v.Play?.MultiplayerClient || window.play?.MultiplayerClient || window.Play?.MultiplayerClient;
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

await mp.init({
  modules: {
    general: { enabled: true }
  }
});

const onMessage = (msg) => console.log("message", msg);
if (typeof mp.on === "function") {
  mp.on("connected", () => console.log("connected"));
  mp.on("message", onMessage);
} else if (typeof mp.addEventListener === "function") {
  mp.addEventListener("connected", () => console.log("connected"));
  mp.addEventListener("message", onMessage);
}
mp.general?.onMessage?.(onMessage);
```

When sending, call `mp.general.sendMessage(payload)` directly (do not detach the function reference), or Play SDK may throw `...reading 'sdk'`.

## 5. Sync Game State

Use `general.sendMessage` / `general.onMessage` for custom state. See [chess-move-sync.md](../examples/chess-move-sync.md).

Late-join recovery is mandatory for started matches:

```javascript
// Option A: request-state handshake
sendMessage("requestState", {});
// host: on requestState => send current authoritative snapshot

// Option B: host replay window (covers missed first packet)
if (isHost && gameState.isStarted) {
  const timer = setInterval(() => sendMessage("gameStateUpdate", gameState), 1200);
  // clear timer on cleanup
}
```

## 6. Leave / Close Room Order (Important)

To avoid orphaned or unjoinable rooms:

- **Host leave flow**: `disconnect multiplayer -> closeRoom -> leaveRoom`
- **Joiner leave flow**: `disconnect multiplayer -> leaveRoom`

If host leaves with `leaveRoom` before `closeRoom`, room entries may remain visible but fail to join.

## 7. Auto-match Behavior

Auto-match should **not** replace manual room controls.

- Keep explicit `Create Room`, `Join Room`, and `Leave Room` actions.
- Auto-match may call discover->join/create internally, but users must be able to recover manually if it fails.
