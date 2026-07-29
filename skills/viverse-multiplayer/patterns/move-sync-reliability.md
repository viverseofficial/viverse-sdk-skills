# Move Sync Reliability

Learnings from Chess Battle 2D: ensuring turn-based game state syncs reliably across VIVERSE MultiplayerClient peers.

## Problem

When White moved in one session, Black's session sometimes stayed at the starting position and showed "White to move" — moves were not syncing to the joiner.

## Root Causes & Fixes

### 0. Creator-Only Room Property Writes (Critical)

**Problem**: Non-creator trying to write room properties causes runtime errors such as:
`Only room creator can set room properties`.
This creates reset loops where joiner moves appear briefly then revert.

**Fix**: Host/creator is sole writer for gameplay-critical room state.
- Joiner sends intent/snapshot over realtime (`general.sendMessage`).
- Host validates, applies, and writes canonical `gameState` via `setRoomProperties`.
- Never let joiner fallback to direct room-property write for turn state.

### 1. Compute State and Send Before `setState` (Critical)

**Problem**: Computing the FEN inside a React `setState` updater and then calling `sendMessage` after `setState` can result in **no message being sent**. React may run the updater asynchronously, so the FEN variable is often still `null` when checked.

```javascript
// ❌ BUG — nextFen can be null; sendMessage never runs
let nextFen = null;
setChess((c) => {
  const next = cloneGame(c);
  makeMove(next, from, to, promotion);
  nextFen = next.fen();  // set in updater
  return next;
});
if (nextFen) sendMessage({ type: "fen", fen: nextFen });  // nextFen often null!
```

**Fix**: Compute the next state and FEN **synchronously** before calling `setState`. Send immediately.

```javascript
// ✅ Correct — compute first, send before/during state update
const next = cloneGame(chess);
makeMove(next, from, to, promotion);
const nextFen = next.fen();
setChess(next);
if (broadcast && nextFen) sendMessage({ type: "fen", fen: nextFen });
```

### 2. Use FEN (Full Board State) Instead of Move Deltas

**Problem**: Sending `{ type: "move", from, to, promotion }` and applying it on the peer can fail if:
- Messages are lost or reordered
- The peer's local state diverged (e.g. missed a prior message)
- The SDK serializes/deserializes differently

**Fix**: Send the full board state (FEN) after each move. FEN is self-contained and idempotent.

```javascript
// On move — send FEN
const next = cloneGame(chess);
makeMove(next, from, to, promotion);
sendMessage({ type: "fen", fen: next.fen() });

// On receive — load FEN
if (data?.type === "fen" && typeof data.fen === "string") {
  const next = cloneGame(chess);
  next.load(data.fen);
  setChess(next);
}
```

### 3. Request-State Flow for Late Joiners

**Problem**: Black may connect after White's first move. Black never receives that move.

**Fix**: When the board mounts (and after connection is ready), send `{ type: "requestState" }`. The master client responds with the current FEN. Only the master should respond to avoid conflicts.

```javascript
// On mount (when online and connected)
useEffect(() => {
  if (gameMode !== "online" || !onlineReady) return;
  sendMessage({ type: "requestState" });
}, [gameMode, onlineReady]);

// On receive requestState — master only
if (data?.type === "requestState" && isMaster) {
  const fen = chessRef.current?.fen?.();
  if (fen) sendMessage({ type: "fen", fen });
}
```

### 3.1 Host Replay Window for Missed Start Packets

**Problem**: Joiner can connect to room but miss the first `gameStateUpdate`, then remain in "waiting for start".

**Fix**: Host replays authoritative state for a short interval (or continuously while session active).

```javascript
useEffect(() => {
  if (!isHost || !gameState.isStarted || actors.length < 2) return;
  const t = setInterval(() => {
    sendMessage({ type: "gameStateUpdate", data: gameState });
  }, 1200);
  return () => clearInterval(t);
}, [isHost, gameState, actors.length]);
```

Also apply monotonic version guard to avoid stale overwrite:

```javascript
const prevVersion = Number(prev?.stateVersion || 0);
const nextVersion = Number(incoming?.stateVersion || 0);
if (nextVersion <= prevVersion) return prev;
```

### 4. Connection Timing

**Ensure**:
- Both creator and joiner call `connectMultiplayer()` (and `await` it) before entering the game.
- `onMessage` is registered as soon as the ChessBoard (or game component) mounts — which should be after `connectMultiplayer()` resolves.
- Use `chessRef.current` in async callbacks to always read the latest state when responding to `requestState`.

### 5. General Module Init

Explicitly enable the General module when initializing MultiplayerClient:

```javascript
await mp.init({ modules: { general: { enabled: true } } });
```

Note: `init()` only reads `modules.game`, `modules.networkSync`,
`modules.actionSync` and `modules.leaderboard`, so the `general` flag is
**inert**. Keep it as documentation of intent — the general module is wired in
the constructor and works regardless. Do not enable `game`/`networkSync` to
"fix" a dead channel: they provision bots and room config server-side.

### 5A. Sends before the data channel opens are silently discarded (Critical)

**Problem**: `await mp.init(...)` resolving does not mean you can send. Verified
against `play-sdk/1.0.1`:

- `init()` calls `this.mediasoupclient.connect(roomId, peerId)` **without
  awaiting it**, then returns. With no `game`/`networkSync`/`actionSync`/
  `leaderboard` modules it also skips its own awaits, so it resolves in ~0 ms.
- The chat DataProducer that carries `general` traffic is created later, inside
  `join()`, and its SCTP channel opens later still.
- The send path is
  `general.sendMessage → sdk.send → mediasoupclient.sendMessage → sendChatMessage`,
  and `sendChatMessage` is:

  ```javascript
  async sendChatMessage(e) {
    if (this._chatDataProducer) {
      if (this._chatDataProducer.readyState !== "open") {
        console.warn("sendChatMessage() | chat DataProducer not open");
        return;                        // <-- no throw, no return value
      }
      try { this._chatDataProducer.send(e) } catch (t) { ... }
    }
  }
  ```

  If `_chatDataProducer` is null it returns with **no warning at all**.

Symptom: the host logs a successful send, joiners receive nothing, and the lobby
looks perfectly healthy because create/join/start ride the matchmaking socket.

**Fix**: gate the first send on the real readiness signal and queue until then.

```javascript
await mp.init({ modules: { general: { enabled: true } } });

// mp.onConnected -> mediasoupclient.onConnected -> onMyDataProducerConnected,
// fired from the chat DataProducer's "open" event. Register synchronously after
// init(): the SDK does NOT replay a missed open.
let ready = false;
const outbox = [];
try {
  mp.onConnected(() => { ready = true; outbox.splice(0).forEach(send); });
} catch (_) { /* throws pre-init */ }

// Fallback so a missed event cannot deadlock the game.
setTimeout(() => { if (!ready) { ready = true; outbox.splice(0).forEach(send); } }, 8000);
```

Never queue positional/transform updates — they are worthless once stale. Queue
state transitions (roles, phase, start, full-state) only.

**Detecting a drop**: the warn fires synchronously inside `send()`, so a flag
around the call reveals whether the packet actually left — see the Critical
Gotchas section of [SKILL.md](../SKILL.md) for the console.warn hook. Requeue on
a detected drop and mark the transport not-ready again.

Do not stop at readiness gating: if the channel never comes up, the game still
needs a start path that does not use it. See
[start-signal-redundancy.md](start-signal-redundancy.md).

### 5B. When the data channel never opens at all (Verified on prod)

Readiness gating is not always enough. On hide-and-seek (2026-07-29) the chat
DataProducer **never** opened: no `onConnected` within 8 s, and sends still
dropping 26 s after `init()`. The producer object existed (so `join()` and
`produceData()` both succeeded) but `readyState` never became `"open"` —
consistent with ICE/DTLS never completing. Game code cannot inspect this: the
public wrapper closes over the `MediasoupClient`, so `_sendTransport` and
`_chatDataProducer` are unreachable.

Meanwhile matchmaking was completely healthy. **Matchmaking and gameplay ride
different transports, so a totally dead data channel is invisible from the
lobby.**

**Fallback**: the matchmaking client can carry low-rate state.

| API | Who may call it | Use |
|---|---|---|
| `mc.setActorProperties(props)` | **any actor**, not host-only | per-player transform/state publish |
| `mc.getMyRoomActors()` | any actor | read every actor's `properties` |
| `mc.setRoomProperties(props)` | host/creator only | authoritative room state |
| `mc.getRoomProperties()` | any actor | read room state |

```javascript
// publish (~3-4 Hz; one socket round trip each, so throttle and never overlap)
await mc.setActorProperties({ avatarUrl, px, pz, pry, rl: role });

// read: poll getMyRoomActors and translate into your existing message shape,
// so no rendering/consumer code has to change
for (const actor of actors) {
  if (actor.session_id === mySessionId) continue;
  const p = actor.properties || {};
  handleMessage({ type: "POSITION", actorId: actor.session_id, x: +p.px, z: +p.pz, ry: +p.pry });
}
```

Caveats:
- `setActorProperties` **replaces** the property bag — carry existing fields
  (e.g. `avatarUrl`) forward or you will drop them.
- Budget a few Hz, not 10+. Fine for walking-pace games with interpolation;
  not for twitch shooters.
- Switch on **positive evidence** of failure (a detected drop, or no readiness
  after a grace period), not optimistically — otherwise you pay socket traffic
  when the fast path is healthy.

Also beware: logging a queued/dropped 10 Hz transform every frame will flush a
bounded diagnostic buffer in about a minute and erase the history you need.
Sample or exclude high-rate message types from logs.

### 6. roomId Consistency

Both creator and joiner must use the same `roomId`. Use `room.id || room.game_session` — these are typically equal from the matchmaking API.

### 7. Atomic Turn Commit (No Split Writes)

**Problem**: Writing `phase='DRAW'` first and writing final state later can desync under packet delay/retry.

**Fix**: Resolve play + draw + next-turn/winner in one state object, then publish once.

```javascript
const next = cloneState(gameState);
applyPlay(next);
applyDraw(next);
resolveTurnOrWinner(next);
await publishCanonicalState(next); // single authoritative write
```

## Message Types Summary

| Type      | Direction | Purpose                          |
|-----------|-----------|----------------------------------|
| `fen`     | Any → Peers | Full board state after a move   |
| `move`    | Any → Peers | (Optional) Move delta, for backward compat |
| `requestState` | Client → Peers | "Send me current state"      |

## Play SDK Example

VIVERSE provides a [Play SDK Multiplayer Tool](https://www.viverse.com/static-assets/play-sdk/) example. Key patterns:
- Use `client.onMessage` (top-level) or `client.general.onMessage` for receive
- Register all handlers (onConnected, onMessage, game events) **before** `client.init()`
- Init modules: `game`, `networkSync`, `actionSync`, `leaderboard` (example does not list `general`)
- Play SDK: `https://www.viverse.com/static-assets/play-sdk/1.0.1/play-sdk.umd.js`

## Verified Working Signal

Cross-device test confirmed the working path:
- Sender logs: `sendMsg OK` and `[Multiplayer] SENT ...`
- Receiver logs: `rcv bridge: general` (or `rcv bridge: top`) and `[Multiplayer] RECV ... type=fen`

If sender logs appear but receiver logs do not, the issue is in receive wiring, transport/session, or room lifecycle (not chess move generation).

## High-Impact Pitfalls (Observed)

1. **Detached send function breaks Play SDK context**
   - Symptom: `TypeError: Cannot read properties of undefined (reading 'sdk')` in `play-sdk.umd.js`
   - Cause: calling a detached ref (`const fn = mp.general.sendMessage; fn(payload)`)
   - Fix: always call with object context:
   ```javascript
   mp.general.sendMessage(payload);
   ```

2. **Only listening to one receive API misses messages**
   - Some environments deliver via `mp.onMessage`, others via `mp.general.onMessage`
   - Fix: register both bridges and dispatch to a single internal subscriber bus

3. **Stale room session causes wrong-room reuse**
   - Symptom: creating room N lands in previous room, duplicate self in actors, `startGame` returns `"game already started"`
   - Fix before create/join:
   ```javascript
   await closeRoom();   // best-effort (if host)
   await leaveRoom();   // best-effort
   disconnectMultiplayer();
   disconnectMatchmaking();
   ```
   - Also unregister room event listeners (`onJoinRoom`, `onGameStartNotify`, etc.) on cleanup

4. **Host/joiner lifecycle desync after leave**
   - Symptom A: host leaves, joiner still sees room in list but cannot join
   - Symptom B: joiner leaves/rejoins, creator UI says left or cannot start game
   - Fix:
   ```javascript
   // host leave flow
   disconnectMultiplayer();
   await closeRoom();
   await leaveRoom();

   // joiner leave flow
   disconnectMultiplayer();
   await leaveRoom();
   ```
   - Do not auto-force creator back to lobby on `onRoomActorChange` when actor count drops below 2; keep creator in room UI and wait for rejoin.

## Reference

- [chess-move-sync.md](../examples/chess-move-sync.md) — Full example
- [Matchmaking Flow](matchmaking-flow.md) — Room setup and start
