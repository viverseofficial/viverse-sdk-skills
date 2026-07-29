# Tank Shooter: Real-Time Transform Sync (Working Reference)

Source of truth: `tank_shooter_3d/src/viverse/MultiplayerService.js` and
`tank_shooter_3d/src/game/netProtocol.js`. This is a **verified-working**
real-time (not turn-based) integration — use it as the baseline for any
action game. [chess-move-sync.md](chess-move-sync.md) covers turn-based only,
and its patterns do not carry over to per-frame transform sync.

> Why this example exists: hide-and-seek was built from the turn-based example
> plus SKILL.md prose, and lost days to a dead data channel caused by a
> constructor form this file would have prevented. If you are writing an action
> game, read this before writing any networking code.

## 1. Construct the client — positional, or via the factory

```javascript
// tank_shooter_3d: MultiplayerService.initRealtime()
this.multiplayer = new MClient(roomId, this.appId, this.actorSessionId);
```

Positional. `(roomId, appId, userSessionId)`. See gates 4A/4B — the options-object
form silently produces a client whose `peerId` is unrelated to your matchmaking
actor, and the transport then never completes.

Prefer the factory when available, since it also initialises the Play SDK:

```javascript
const mp = await playClient.newMultiplayerClient(roomId, appId, actorSessionId);
```

## 2. Register both receive bridges BEFORE init()

```javascript
const bridge = (raw) => {
  const parsed = parseNetworkMessage(raw);
  if (!parsed) return;
  onParsedMessage?.(parsed);
  this.messageHandlers.forEach((handler) => handler(parsed));
};

this.multiplayer.onMessage?.(bridge);          // top-level bridge
this.multiplayer.general?.onMessage?.(bridge); // general-module bridge

await this.multiplayer.init({ modules: { general: { enabled: true } } });
```

Both bridges, optional-chained, and registered **before** `init()`.

## 3. Validate every inbound packet against an allowlist

```javascript
const VALID_TYPES = new Set(Object.values(MESSAGE_TYPES));

export function parseNetworkMessage(raw) {
  try {
    const data = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!data || typeof data !== "object") return null;
    if (typeof data.type !== "string" || !VALID_TYPES.has(data.type)) return null;
    if (typeof data.matchId !== "string" || !data.matchId) return null;
    if (!data.payload || typeof data.payload !== "object") return null;
    if (typeof data.ts !== "number") return null;
    return data;
  } catch {
    return null;
  }
}
```

Every packet carries `{ type, ts, matchId, payload }`. `matchId` is what stops a
stale packet from a previous round being applied to the current one — a real
hazard once players re-match without a reload.

**When you add a message type, add it to `MESSAGE_TYPES` first.** A strict parser
silently drops unknown types, so a send handler added without the constant looks
exactly like a network failure.

## 4. Message vocabulary for an action game

| Type | Direction | Purpose |
|---|---|---|
| `transform` | each → peers | per-player position/rotation, high rate |
| `stateSnapshot` | host → peers | full authoritative state |
| `requestState` | joiner → host | late-join catch-up |
| `heartbeat` | each → peers | liveness / zombie detection |
| `fire`, `shot`, `hit`, `damage`, `death`, `respawn` | intent + result | combat |
| `powerup`, `weapon` | host-authoritative | pickups |
| `timer`, `matchEnd` | host → peers | round lifecycle |

Separating `fire` (intent) from `shot`/`hit` (host-validated result) is what keeps
combat host-authoritative — peers never self-report a kill.

## 5. Room properties as a second channel

```javascript
async setRoomSnapshot(snapshot) {
  await this.updateRoomProperties({ v1_snapshot: JSON.stringify(snapshot) });
}

async readRoomSnapshot(roomId) {
  const rooms = await this.getRooms();
  const room = rooms.find((entry) => (entry.id || entry.roomId) === roomId);
  // ...parse room.properties.v1_snapshot
}
```

Two things worth copying:

- The snapshot is **one versioned JSON string under one key** (`v1_snapshot`), not
  many loose keys — so it evolves without breaking older clients.
- It is read back **from the room list** (`getRooms()`), not only
  `getRoomProperties()`. The room list carries properties, which is a useful
  second read path when a client is not yet fully bound to the room.

Room properties are **host/creator-only writes**. For per-player state a joiner
must publish, use `setActorProperties` (any actor may call it) — see
[move-sync-reliability.md](../patterns/move-sync-reliability.md) §5B.

## Checklist for a new action game

- [ ] Client constructed positionally (or via `newMultiplayerClient`)
- [ ] `mp.userSessionId === actorSessionId` asserted after construction
- [ ] Both receive bridges registered before `init()`
- [ ] Envelope carries `type`/`ts`/`matchId`; parser rejects anything else
- [ ] New message types added to the allowlist at the same time as the sender
- [ ] `requestState` → host `stateSnapshot` path exists for late joiners
- [ ] Combat is intent → host validation → broadcast result
- [ ] Heartbeats plus a peer timeout so a vanished player is detected
