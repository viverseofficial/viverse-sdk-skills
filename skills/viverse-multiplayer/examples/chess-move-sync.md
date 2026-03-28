# Chess Move Sync Example

Turn-based sync pattern for a 2-player chess game using VIVERSE MultiplayerClient `general` module.

## Recommended: FEN-Based Sync

Use **full board state (FEN)** instead of move deltas for reliable sync. See [move-sync-reliability.md](../patterns/move-sync-reliability.md) for rationale.

### Message Format

```javascript
{ type: "fen", fen: "rnbqkbnr/pppppppp/8/8/6P1/8/PPPPPP1P/RNBQKBNR b KQkq g3 0 1" }
```

### Sending a Move

When the local player makes a legal move, **compute the next state and FEN synchronously, then send before or right after `setState`**. Do not compute FEN inside a `setState` updater — React may run it asynchronously and the message will never send.

```javascript
function onLocalMove(from, to, promotion = "q") {
  const next = cloneGame(chess);
  makeMove(next, from, to, promotion);
  const nextFen = next.fen();
  setChess(next);
  if (gameMode === "online" && nextFen) {
    sendMessage({ type: "fen", fen: nextFen });
  }
}
```

### Receiving a FEN

Subscribe once when entering the game:

```javascript
useEffect(() => {
  if (gameMode !== "online") return;
  const unsub = onMessage((data) => {
    if (data?.type === "fen" && typeof data.fen === "string") {
      setChess((c) => {
        const next = cloneGame(c);
        try {
          next.load(data.fen);
          return next;
        } catch {
          return c;
        }
      });
    } else if (data?.type === "requestState" && isMaster) {
      const fen = chessRef.current?.fen?.();
      if (fen) sendMessage({ type: "fen", fen });
    }
  });
  return unsub;
}, [gameMode, isMaster]);
```

`onMessage` should internally bridge both channels:
- `multiplayerClient.onMessage(...)`
- `multiplayerClient.general.onMessage(...)`

This avoids environment-specific drops where only one receive path fires.

### Request-State for Late Joiners

When the joiner (Black) mounts, they may have missed White's first move. Send `requestState`; the master responds with the current FEN:

```javascript
useEffect(() => {
  if (gameMode !== "online" || !onlineReady) return;
  sendMessage({ type: "requestState" });
}, [gameMode, onlineReady]);
```

---

## Alternative: Move Delta

For backward compatibility, you can still support move messages:

```javascript
{ type: "move", from: "e2", to: "e4", promotion: "q" }
```

### Sending a Move (Delta)

```javascript
sendMessage({ type: "move", from, to, promotion });
```

### Receiving a Move (Delta)

```javascript
if (data?.type === "move" && data.from && data.to) {
  setChess((c) => {
    const next = cloneGame(c);
    try {
      next.move({ from: data.from, to: data.to, promotion: data.promotion || "q" });
      return next;
    } catch {
      return c;
    }
  });
}
```

**Note**: Move deltas are more efficient but less robust. Prefer FEN for reliability.

---

## Debug Signatures

Healthy sender:
- `sendMsg OK`
- `[Multiplayer] SENT { type: "fen", ... }`

Healthy receiver:
- `rcv bridge: top` or `rcv bridge: general`
- `[Multiplayer] RECV { type: "fen", ... }`

Room lifecycle healthy:
- Host leave -> room disappears from list (or is marked closed)
- Joiner leave -> room remains with `Players: 1/2` for host
- Rejoin path works without `"game already started"` unless host already started

---

## Role Assignment

- **Master client** (room creator) → White (`playerColor: "w"`)
- **Non-master** (joiner) → Black (`playerColor: "b"`)

Sort actors by `is_master_client` and assign colors before starting:

```javascript
const sorted = [...room.actors].sort((a, b) => (a.is_master_client ? -1 : 1));
const myIndex = sorted.findIndex((a) => a.session_id === myAccountId);
const playerColor = myIndex === 0 ? "w" : "b";
```

## Full Implementation

See `chess_battle_2d` project for the complete ChessBoard + MultiplayerService integration.
