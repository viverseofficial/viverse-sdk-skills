---
name: viverse-storage
description: Persist user game state to VIVERSE cloud using the Storage SDK (CloudSaveClient). Covers cloud save, local fallback, first-login merge, async timing pitfalls, and exit-save patterns.
prerequisites: [VIVERSE Auth integration (access token), VIVERSE Studio App ID]
tags: [viverse, storage, cloud-save, persistence, save-data]
---

# VIVERSE Storage SDK — Cloud Save

Use the VIVERSE Storage SDK to persist per-user game state (progress, inventory, settings) to VIVERSE cloud. Requires a logged-in user with a valid access token.

## When To Use This Skill

- Save/restore game progress across devices or sessions
- Persist loadout, upgrades, scores, unlocks for authenticated users
- Show "sign in to save your progress" CTA to guests (sign-up driver)
- First-login merge: promote local guest save to cloud on first auth

## Read Order

1. This file (constraints + workflow)
2. [viverse-auth/SKILL.md](../viverse-auth/SKILL.md) — you need a valid access token first

---

## SDK URL

```
https://www.viverse.com/static-assets/storage-sdk/1.0.0/storage-sdk.umd.js
```

Exposes `globalThis.storage.CloudSaveClient` after script loads.

---

## Mandatory Compliance Gates (MUST PASS)

1. **MUST** have a valid VIVERSE access token — all CloudSaveClient calls throw `"This API is only available to logged-in users."` if the token is invalid/empty.
2. **MUST** pass `appId` (string, 10-char Studio app ID) to `new CloudSaveClient(appId)`.
3. **MUST NOT** store secrets, credentials, or tokens in cloud save data — only non-secret user-scoped state.
4. **MUST** handle the `204 No Content` case — `getPlayerData()` returns `null` when no save exists, not an error.
5. **MUST** load SDK script before instantiating `CloudSaveClient` — it is NOT included in the VIVERSE core SDK bundle.
6. **MUST NOT** call save on every frame or tick — save at checkpoints (wave start, shop close, game over, visibility change).

---

## CloudSaveClient API

### Instantiation

```javascript
// Storage SDK exposes itself as globalThis.storage after script loads
const client = new globalThis.storage.CloudSaveClient(appId);
// appId must be a non-empty string (your Studio 10-char app ID)
```

### `setPlayerData(key, data, token)` → `Promise<void>`

Upsert a named data blob for the current user.

- `key` — non-empty string identifying the save slot (e.g. `"game_save"`)
- `data` — non-null object (or valid JSON string)
- `token` — VIVERSE access token string
- Throws if key/data/token is empty string or null

```javascript
await client.setPlayerData('game_save', { wave: 5, gold: 300 }, accessToken);
```

Internally calls: `POST /api/webrtcbot-service/v1/cloudsave/{appId}/upsert/{key}`

### `getPlayerData(key, token)` → `Promise<data | null>`

Retrieve a named blob. Returns `null` if no save exists (HTTP 204).

- `key` — non-empty string
- `token` — VIVERSE access token string

```javascript
const save = await client.getPlayerData('game_save', accessToken);
// save is null if not found, or the object you previously set
```

Internally calls: `GET /api/webrtcbot-service/v1/cloudsave/{appId}`  
Response shape: `{ data: { player_data: { [key]: yourObject } } }`  
`getPlayerData` handles the unwrapping — you get `yourObject` directly.

### Other methods (lower-level, use sparingly)

| Method | Description |
|--------|-------------|
| `client.userApp.save(data, token)` | Save entire userapp blob (alternative to CloudSave) |
| `client.userApp.getLatest(token)` | Get most recent userapp snapshot |
| `client.userApp.getAll(token)` | Get all userapp versions |
| `client.userApp.delete(version, token)` | Delete a specific version |
| `client.cloudSave.save(key, data, token)` | Low-level upsert (same as setPlayerData internals) |
| `client.cloudSave.get(token)` | Low-level get all cloud save data |

Prefer `setPlayerData` / `getPlayerData` — they wrap the low-level API with key-based access.

---

## Implementation Workflow

### 1. Load Storage SDK

```javascript
async function loadStorageSdk() {
  if (globalThis.storage?.CloudSaveClient) return; // already loaded
  await new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = 'https://www.viverse.com/static-assets/storage-sdk/1.0.0/storage-sdk.umd.js';
    s.onload = res;
    s.onerror = () => rej(new Error('Storage SDK failed to load'));
    document.head.appendChild(s);
  });
}
```

### 2. Instantiate Client

```javascript
await loadStorageSdk();
const saveClient = new globalThis.storage.CloudSaveClient(appId);
```

### 3. Save

```javascript
async function saveToCloud(token, data) {
  await saveClient.setPlayerData('game_save', data, token);
}
```

### 4. Load

```javascript
async function loadFromCloud(token) {
  const data = await saveClient.getPlayerData('game_save', token);
  return data; // null if no save exists
}
```

### 5. Local fallback for guests

Always mirror cloud save in `localStorage` so guests don't lose progress:

```javascript
const LOCAL_KEY = 'myapp_v1_save';

function saveLocal(data) {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(data));
}

function loadLocal() {
  const raw = localStorage.getItem(LOCAL_KEY);
  return raw ? JSON.parse(raw) : null;
}
```

### 6. First-login merge

When a guest logs in for the first time, upload their local save to cloud if no cloud save exists:

```javascript
async function mergeLocalToCloud(token) {
  const local = loadLocal();
  if (!local) return;
  const existing = await loadFromCloud(token);
  if (existing) return; // cloud save wins
  await saveToCloud(token, local);
  localStorage.removeItem(LOCAL_KEY);
}
// Call this immediately after auth resolves
```

### 7. Full integration sequence (main.js)

Auth resolves asynchronously — always follow this order to avoid races:

```javascript
const gameSave = new ViverseGameSave(appId);
const game = new Game(gameSave); // loads local save into _pendingSave immediately in constructor

// ... later, when auth resolves:
game.setAuthToken(token);
await gameSave.mergeLocalToCloud(token); // first-login: local → cloud (clears local after)
game.loadSave();                         // fire-and-forget; phase-aware application
```

**Why this order matters:**
- `new Game()` grabs local save synchronously before any async auth completes — guest progress is never lost
- `mergeLocalToCloud()` must complete before `loadSave()` so the cloud save exists to load
- `loadSave()` is phase-aware; it handles every game state correctly (see Phase-Aware Loading below)

---

## Save Trigger Matrix

| Trigger | Cloud | Local |
|---------|-------|-------|
| Wave/round start (auto-save) | ✅ | ✅ |
| Shop "Save & Leave" | ✅ | ✅ |
| Game over | ✅ | ✅ |
| `visibilitychange` (tab hide) | best-effort beacon | ✅ sync |
| `beforeunload` | best-effort beacon | ✅ sync |
| Every N seconds periodic | ❌ (too frequent) | ✅ |

---

## Exit Save Pattern (visibilitychange / beforeunload)

**CRITICAL**: Do NOT use `navigator.sendBeacon()` for cloud save. `sendBeacon` does not support custom request headers, but the Storage SDK endpoint requires an `AccessToken` header.

**Correct approach**: Use `fetch` with `keepalive: true` — it survives page close and supports custom headers:

```javascript
function saveBeacon(token, data) {
  if (!appId || !token) return;
  const url = `https://broadcasting-gateway-gaming.vrprod.viveport.com/api/webrtcbot-service/v1/cloudsave/${appId}/upsert/game_save`;
  try {
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'AccessToken': token },
      body: JSON.stringify(data),
      keepalive: true,   // survives page close, like sendBeacon
    }).catch(() => {}); // best-effort only
  } catch {}
}
```

**Exit save guard** — only save during active gameplay phases (not menus/game-over to avoid overwriting progress):

```javascript
function _exitSave() {
  const ACTIVE_PHASES = new Set(['fighting', 'countdown', 'shop']);
  if (!ACTIVE_PHASES.has(this.phase)) return;
  const snap = this._buildSnapshot();
  this._saveService.saveLocal(snap);              // synchronous — safe in beforeunload
  if (this._authToken) {
    this._saveService.saveBeacon(this._authToken, snap); // async keepalive
  }
}

document.addEventListener('visibilitychange', () => { if (document.hidden) _exitSave(); });
window.addEventListener('beforeunload', () => _exitSave());
```

---

## Phase-Aware Save Loading

When `loadSave()` is called, the game may already be running. Handle all states:

```javascript
async loadSave() {
  let snap = await loadCloud(token).catch(() => null) ?? loadLocal();
  if (!snap || snap.v !== SAVE_VERSION) return;

  if (this.phase === 'title') {
    // Title screen already showing — refresh it with fresher cloud save
    this._pendingSave = snap;
    this.hud.showTitleScreen(snap, onContinue, onNewGame);

  } else if (this.totalWave <= 1 && this.phase === 'countdown') {
    // Wave 1 countdown is live — reset to apply save (waveGen++ invalidates old countdown)
    this._pendingSave = snap;
    this._reset();

  } else if (this.totalWave <= 1 && this.phase === 'intro') {
    // Pre-wave — just stash, _startNextWave() will apply it
    this._pendingSave = snap;

  } else {
    // Active gameplay — queue for next restart with a notification banner
    this._pendingSave = snap;
    this.hud.showBanner('☁ Save found — resumes on restart', 4000);
  }
}
```

---

## Generation Counter Pattern (Prevent Double-Start)

When save loading is async, a stale countdown callback can fire after a reset, spawning a second wave. Use a generation counter to invalidate stale closures:

```javascript
// In constructor / state:
this._waveGen = 0;

// In _reset():
this._waveGen++; // invalidate all in-flight callbacks from previous run

// In countdown callback — capture gen at creation time:
const gen = this._waveGen;
showCountdown(3, () => {
  if (this._waveGen !== gen) return; // stale callback — discard
  this.enemies.spawnWave(...);
});
```

**When this matters**: If auth resolves after game start, `loadSave()` may call `_reset()` which increments `_waveGen`. Any countdown callback captured before the reset will see a mismatched generation and bail out cleanly, preventing double-spawn.

---

## Startup Title Screen (Continue vs New Game)

When a save exists, show a title screen before starting wave 1 to let the player choose:

```javascript
// In _startNextWave() at wave 0, before starting the intro:
if (this.totalWave === 0 && this._pendingSave) {
  const snap = this._pendingSave;
  this.phase = 'title';
  this.hud.showTitleScreen(
    snap,
    () => { this._applySnapshot(snap); },          // Continue
    () => { this._pendingSave = null; this._saveService?.clearLocal(); this._startNextWave(); }, // New Game
  );
  return;
}
```

Title screen UI should display save metadata (stage, wave, date) so the player knows what they're continuing:

```javascript
function showTitleScreen(snap, onContinue, onNewGame) {
  const label = snap
    ? `Stage ${(snap.stageIdx ?? 0) + 1} · Wave ${snap.waveInStage ?? 1}`
    : null;
  // render overlay with Continue / New Game buttons + label
}
```

---

## Critical Gotchas

### 1. Response shape
`getPlayerData(key, token)` returns the data you stored **directly** — no wrapping needed. Internally the API returns `{ data: { player_data: { [key]: data } } }` but `getPlayerData` unwraps all of that.

### 2. 204 = no save (not an error)
If no save exists, `getPlayerData` returns `null` (SDK converts 204 → `{}`→ `null`). Do not treat `null` as an error.

### 3. Token must be access token (JWT), not auth key
The SDK internally checks if the token is a JWT (`le(token)` check) and routes it to the correct header (`AccessToken` vs `AuthKey`). Always pass the `access_token` from `checkAuth()`.

### 4. appId is required and must be a string
`new CloudSaveClient(appId)` throws `"appId is required"` / `"appId must be a string"` if the value is undefined, null, or not a string.

### 5. Not available without login
Every method throws synchronously if the token resolves to empty — do NOT call any save methods for guest users. Check auth state before calling.

### 6. SDK is separate from core VIVERSE SDK
`window.viverse` does NOT include Storage. You must load the separate script URL. Do not assume `window.viverse.storage` exists — it doesn't.

### 7. sendBeacon does NOT work for cloud save
`navigator.sendBeacon(url, blob)` cannot send custom headers. The Storage API requires `AccessToken` header. Use `fetch(..., { keepalive: true })` instead — same unload survival, full header support.

### 8. mergeLocalToCloud clears local save — load cloud AFTER merge
After `mergeLocalToCloud(token)` runs, `loadLocal()` returns `null` (the local data was promoted and cleared). Always call `loadSave()` after `mergeLocalToCloud()` completes, not before or concurrently.

### 9. Async save load can race with game start
The game constructor may call `_reset()` → `_startNextWave()` before auth resolves. The save may arrive mid-countdown. Use `_pendingSave` + phase-aware application in `loadSave()` — never directly call `_reset()` from save load unless you are certain the game is at wave 0.

---

## Guest UX Pattern (Sign-up Driver)

Show a cloud save CTA on game-over/victory screens for non-authenticated users:

```html
<!-- Show only when isGuest === true -->
<div class="save-cta">
  🔐 <strong>Sign in to VIVERSE</strong>
  <br>Save your progress to cloud and compete on global leaderboards.
</div>
```

Additional UX rules:
- Guest progress is saved to `localStorage` silently (no "saved locally" toast needed)
- CTA appears on natural pauses (end screen, between rounds) — never as a blocking modal
- On first login, automatically merge local → cloud (no manual action required from user)
- Add a "Save & Leave" button in the shop/pause menu — saves locally for guests, cloud+local for auth users, then reloads

```javascript
// Save & Leave handler (works for both guests and auth users)
async function onSaveAndLeave() {
  const snap = buildSnapshot();
  saveLocal(snap);
  if (authToken) {
    await saveCloud(authToken, snap).catch(() => {});
  }
  location.reload();
}
```

---

## Save Data Schema Best Practices

- Include a version constant `SAVE_VERSION = 1` — gate all save reads on `snap.v === SAVE_VERSION`
- Include a `savedAt` timestamp (epoch ms) for conflict resolution and display
- Keep the payload small — no scene objects, no meshes, no 3D state
- Store IDs, levels, and counters — not computed values that can be re-derived
- Tag local saves with `_local: true` so `mergeLocalToCloud` can distinguish them from cloud copies

```javascript
const SAVE_VERSION = 1;

const snapshot = {
  v: SAVE_VERSION,
  savedAt: Date.now(),
  stageIdx: 2,
  waveInStage: 4,
  totalWave: 14,
  gold: 450,
  score: 12000,
  castleHp: 380,
  kills: 147,
  ownedWeaponIds: ['inferno', 'frost'],
  weaponLevels: { inferno: 3, frost: 1 },
  bowLevels: { pierce: 2, fireRate: 1, damage: 3 },
  slotAssignments: ['bow', 'inferno', null],
};
```

---

## Debugging Checklist

- [ ] Storage SDK script loaded before `new CloudSaveClient()`
- [ ] `appId` is a non-empty string matching Studio app
- [ ] Token is a valid JWT (`access_token` from `checkAuth()`)
- [ ] `getPlayerData` returns `null` (no save) vs throws (bad token/appId)
- [ ] Not calling save methods for guest/unauthenticated users
- [ ] Save payload contains no circular references or non-serializable values
- [ ] `mergeLocalToCloud` awaited before `loadSave()` is called
- [ ] Exit save uses `fetch+keepalive`, NOT `navigator.sendBeacon`
- [ ] Phase guard in `_exitSave()` prevents saving over progress from menu/gameover phases
- [ ] Generation counter guards all countdown callbacks after `_reset()`
