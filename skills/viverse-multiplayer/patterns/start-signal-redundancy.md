# Start-Signal Redundancy

Learnings from hide-and-seek (2026-07): matchmaking worked, the host started the
match, and **every joiner stayed in the lobby forever** while the host saw an
empty world. Two independent defects, both worth designing against up front.

## Defect 1 — the reliable signal was discarded

`onGameStartNotify` arrives on the **matchmaking socket**, which is the same
socket that just carried a successful `createRoom`, `joinRoom` and `startGame`.
It is by far the most trustworthy signal you have.

The game stored it and never read it:

```javascript
// ❌ BUG — flag is set and nothing consumes it
onSdkEvent(mc, "onGameStartNotify", () => {
  mpState.gameStarted = true;
  notify();                      // only subscriber was updateLobbyUi(), which ignores the flag
});
```

Game entry instead depended on a `PHASE_CHANGE` message over
`MultiplayerClient.general` — one unacked datagram on a transport that had not
finished connecting (see [move-sync-reliability.md](move-sync-reliability.md),
"Sends before the data channel opens").

**Fix**: expose the matchmaking start event as a first-class callback and make it
the *primary* trigger for entering the round.

```javascript
export function onGameStart(cb) { gameStartListeners.push(cb); return () => {...}; }

onSdkEvent(mc, "onGameStartNotify", (d) => { mpState.gameStarted = true; notify(); notifyGameStart("onGameStartNotify"); });
onSdkEvent(mc, "onGameStart",       (d) => { mpState.gameStarted = true; notify(); notifyGameStart("onGameStart"); });
```

Bridge both names — builds differ, and this event has been observed firing
**twice**, so every consumer must be idempotent.

## Defect 2 — "entering the round" was never a function

The host ran a full `startRound()`: build arena, hide the menu panel, place the
player, make them visible, take pointer lock, refresh HUD. The joiner's message
handler only assigned state fields:

```javascript
// ❌ BUG — joiner "starts" the round but never enters it
case "PHASE_CHANGE":
  state.phase = data.phase;
  state.timer = data.timer;
  state.started = true;     // menu still covering the screen, player never placed
  break;
```

Worse, the position broadcast was gated on `state.started`, so a joiner who
missed the packet never broadcast either — making "host cannot see others" a
*downstream symptom of the same bug*, not a separate sync failure.

**Fix**: factor the presentation half of round start into one function and make
both roles call it. Make it idempotent — legitimate duplicate triggers are the
norm once you add redundancy.

```javascript
function applyRoundPresentation({ phase, timer } = {}) { /* menu, placement, visibility, pointer lock */ }

let entered = false, inFlight = null;
async function enterOnlineRound(reason, { phase, timer, role } = {}) {
  if (!online || isHost) return;
  if (entered) { if (phase) state.phase = phase; if (typeof timer === "number") state.timer = timer; return; }
  if (inFlight) return inFlight;
  inFlight = (async () => {
    if (!(await buildArena())) return;               // never flip `entered` on failure
    applyRoundPresentation({ phase, timer });
    entered = true;
  })();
  try { await inFlight; } finally { inFlight = null; }
}
```

## The redundancy rule

> No state transition a player cannot recover from may depend on a single
> unacked packet.

For game start, wire **three independent routes**. They fail in different ways,
so the union is far stronger than any one:

| Route | Transport | Notes |
|---|---|---|
| `onGameStartNotify` | matchmaking socket | Primary. Independent of WebRTC entirely. |
| Host `FULL_STATE` replay every ~1.2 s | WebRTC `general` | Also rescues late joiners; cheap. |
| Host `setRoomProperties({ gameStarted, phase, timer, roles })` + joiner poll | matchmaking socket | Host-authoritative; works when WebRTC never comes up. |

Plus a joiner-side `REQUEST_STATE` retry (every 1 s, capped) rather than one
fire-and-forget packet, so a joiner actively pulls state instead of waiting.

All routes must converge on the same idempotent entry function, and each should
log which route won:

```javascript
console.log("[MP] enterOnlineRound COMPLETE", { via: reason });
```

That single field turns "multiplayer is broken" into "route A is dead, B carried
it" on the next test.

## Diagnosing this class of bug

Symptom triad that points straight here:

1. Matchmaking looks perfectly healthy (create/join/start all succeed).
2. The host reports sends succeeding.
3. Joiners receive nothing and never leave the lobby.

Because create/join/start ride the matchmaking socket and gameplay rides WebRTC,
a completely dead data channel is invisible from the lobby. Instrument the send
path and the entry path before theorising — and note that a joiner stuck in the
lobby with the host broadcasting is *one* bug, not two.

## Reference

- [move-sync-reliability.md](move-sync-reliability.md) — data-channel readiness and the silent drop
- [matchmaking-flow.md](matchmaking-flow.md) — room setup and start
