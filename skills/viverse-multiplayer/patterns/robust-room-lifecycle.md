# Robust Room Lifecycle Pattern

This pattern is the multiplayer equivalent of auth's `robust-profile-fetch`:
it defines a deterministic, production-safe room flow for create/join/auto-match.

## Why This Exists

Many regressions come from partial implementations that:
- only hardcode one lobby name without reliable fallback,
- skip host attach verification after room creation,
- omit leave/close sequencing, or
- have no clear split between manual room actions and auto-match.

Use this pattern whenever building or fixing matchmaking flows.

## Canonical Behavior

1. Connect matchmaking (`newMatchmakingClient(appId)`), then proactively call `connect()` when available.
2. Set a unique per-connect `session_id` (`${accountId}-${Date.now()}-${random}`).
3. Discover rooms first (`getAvailableRooms`) before deciding join/create.
4. For manual join, always join by real room id (`room.id || room.roomId || room.game_session`).
5. For create, host must auto-join created room id, then verify host actor binding by `session_id`.
6. Auto-match should prefer open rooms; if no open room exists, create one.
7. Host-only start gate: require `2/2` players before `startGame`.
8. Cleanup order:
   - Host leave: `disconnect multiplayer -> closeRoom -> leaveRoom`
   - Joiner leave: `disconnect multiplayer -> leaveRoom`

## Drop-in Reference Snippet

```javascript
const actorSessionId = `${user.accountId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const playClient = new PlayClass();
const mc = await playClient.newMatchmakingClient(appId);

if (typeof mc.connect === "function") {
  await mc.connect().catch(() => {});
}

if (typeof mc.setActor !== "function") {
  throw new Error("Matchmaking client setActor API unavailable");
}
await mc.setActor({
  session_id: actorSessionId,
  name: user.displayName || "Player",
  properties: { avatarUrl: user.avatarUrl || "" },
});

const list = await mc.getAvailableRooms?.();
const rooms = Array.isArray(list) ? list : (list?.rooms || []);
const openRoom = rooms.find((r) => {
  const count = Number(r?.playerCount ?? r?.player_count ?? (Array.isArray(r?.actors) ? r.actors.length : 0));
  return count < 2;
});

let room;
if (openRoom) {
  const roomId = openRoom.id || openRoom.roomId || openRoom.game_session;
  const joined = await mc.joinRoom?.(roomId);
  room = joined?.room || joined;
} else {
  const created = await mc.createRoom?.({
    name: "My_Game_Lobby",
    mode: "Room",
    maxPlayers: 2,
    minPlayers: 1,
  });
  room = created?.room || created;
  const roomId = room?.id || room?.roomId || room?.game_session;
  if (!roomId) throw new Error("roomId is required");
  await mc.joinRoom?.(roomId).catch(() => {});

  let attached = false;
  for (let i = 0; i < 6; i++) {
    const actors = (await mc.getMyRoomActors?.().catch(() => [])) || room?.actors || [];
    if (actors.some((a) => (a.session_id || a.sessionId) === actorSessionId)) {
      attached = true;
      break;
    }
    await mc.setActor?.({ session_id: actorSessionId, name: user.displayName || "Player", properties: {} }).catch(() => {});
    await mc.joinRoom?.(roomId).catch(() => {});
    await new Promise((r) => setTimeout(r, 250));
  }
  if (!attached) throw new Error("Host session not bound to room after create/join retries");
}
```

## UI Contract (Required)

- Expose explicit actions:
  - `Create Room`
  - `Join Room` (from room list and/or room code)
  - `Leave Room`
  - `Start Match` (host only, enabled when player count is full)
- Auto-match is additive, not a replacement for manual create/join controls.

## Reference Implementation

Use `tank_shooter_3d` as the working sample for this pattern:
- `tank_shooter_3d/src/viverse/MultiplayerService.js`
- `tank_shooter_3d/src/App.jsx`
