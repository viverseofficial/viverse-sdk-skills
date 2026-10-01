# Stage loading gate

Hold each stage until the active layout's streamed buildings have fired `model-load` (or failed). Reference: Bastion Archer `VillageKit.js` (`whenSettled`), `SceneBuilder.js` (`getVillageReadiness`, `whenVillageReady`), `Game.js` (`_gateOnStageAssets`, `_cancelStageLoading`), `HUD.js` (`showStageLoading`).

## Events

| Constant | String | Use |
|---|---|---|
| `EVENT_MODEL_LOAD` | `"model-load"` | success; event carries `modelIndex`, `boundingBox`, `isAnimated`, `willUseEmbeddedCollider`, `isLastModelToLoad`, `isVrm` |
| `EVENT_MODEL_LOAD_ERROR` | `"model-load-error"` | failure |
| (internal) | `"model-loaded"` | **do not use** |

`isLastModelToLoad` is relative to the controller's whole queue (castle, enemies, scenery), so it cannot answer "is the village ready". Count per building yourself.

## Readiness inside the kit

```js
const isSettled = () => entries.every(e => e.state === 'loaded' || e.state === 'failed');
const progress = () => ({ loaded, failed, total, settled: isSettled() });

whenSettled({ timeoutMs = Infinity, onProgress } = {}) {
  let end = () => {};
  const promise = new Promise(resolve => {
    let timer = null, done = false;
    const listener = snap => { onProgress?.(snap); if (snap.settled) end({}); };
    end = flags => {
      if (done) return; done = true;
      listeners.delete(listener); if (timer != null) clearTimeout(timer);
      resolve({ ...progress(), timedOut: false, cancelled: false, ...flags });
    };
    if (isSettled()) { end({}); return; }
    listeners.add(listener);
    onProgress?.(progress());
    if (Number.isFinite(timeoutMs)) timer = setTimeout(() => end({ timedOut: true }), timeoutMs);
  });
  return { promise, cancel: () => end({ cancelled: true }) };
}
```

`notify()` (call listeners with `progress()`) runs after every `place` and `fail`.

## Scene API

```js
getVillageReadiness(mode) { return this._villages?.[layoutKey(mode)]?.progress() || null; }   // null = no village

whenVillageReady({ mode = this._combatMode, timeoutMs, onProgress } = {}) {
  this._syncVillage(mode);                      // make sure the layout exists
  const village = this._villages?.[layoutKey(mode)];
  if (!village) {
    const empty = { loaded: 0, failed: 0, total: 0, settled: true, timedOut: false, cancelled: false };
    return { promise: Promise.resolve(empty), cancel() {} };
  }
  village.start();                              // start now instead of on the idle callback
  return village.whenSettled({ timeoutMs, onProgress });
}
```

## Game gate

Split the wave start into "set up state and combat mode" and "present the wave" (banners, intro, countdown), and put the gate between them. The combat mode must be set first because it is what creates the layout.

```js
_gateOnStageAssets(proceed) {
  this._cancelStageLoading();
  const readiness = this.scene3?.getVillageReadiness?.();
  if (!readiness || readiness.settled) { proceed(); return; }        // synchronous: no flash, timing unchanged

  const gen = this._waveGen;
  this.hud.showStageLoading?.(readiness);
  const handle = this.scene3.whenVillageReady({
    timeoutMs: STAGE_ASSET_LOAD_TIMEOUT_MS,                           // 20000
    onProgress: p => this.hud.updateStageLoading?.(p),
  });
  this._stageLoading = handle;
  handle.promise.then(result => {
    if (this._stageLoading !== handle) return;                        // cancelled or superseded: do not touch the overlay
    this._stageLoading = null;
    this.hud.hideStageLoading?.();
    if (this._waveGen !== gen) return;                                // a restart happened while waiting
    if (result.timedOut) console.warn('[Village] starting with buildings still streaming');
    proceed();
  });
}

_cancelStageLoading() {
  const handle = this._stageLoading;
  if (!handle) return;
  this._stageLoading = null;
  handle.cancel();
  this.hud?.hideStageLoading?.();                                     // synchronous, so a new overlay is not hidden by the late `then`
}
```

Call `_cancelStageLoading()` from the reset path. Optional-chain every scene/HUD call so tests with fakes keep working. Gate every entry point that starts a wave (including endless/looping modes), not only the first wave of a stage, so Continue-from-save and debug jumps are covered too.

## Overlay

- Full-screen, `role="status"`, above shop/map panels, owned by the HUD so `destroy()` removes it.
- Bar width = `(loaded + failed) / total` (failed buildings are finished too, so the bar can reach 100%).
- Because progress is bursty, add an indeterminate sweep that animates `transform`:

```css
@keyframes stageLoadingSweep { from { transform: translateX(-100%) } to { transform: translateX(400%) } }
```

- Add the title and `{loaded} / {total}` strings to **every** shipped locale and test that each locale has the keys.

## Behaviour decisions to confirm with the user

- Timeout vs wait forever vs wait with a Skip button. The chosen default was a **20 s timeout, then start and keep streaming**.
- Measured wait on a software-rendered headless run was 14-28 s for 12-15 buildings; real devices differ. If the timeout fires often, lower the building count or raise the timeout.

## Tests worth writing

1. `whenSettled`: waits for all, reports progress, counts failures as settled, resolves immediately when settled, times out, cancels.
2. Gate: settled layout starts synchronously with no overlay calls; null readiness or a scene without the API is never gated; pending shows the overlay then starts; timeout starts and hides; reset or a new wave never starts and hides the overlay.
3. Overlay: show, progress width (100% when failures complete it), hide, reuse, removed on `destroy()`.
4. Locale parity for the new keys.
