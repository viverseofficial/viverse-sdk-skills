# Performance and memory when streaming a lot of scenery

Measured on Bastion Archer (a three.js tower-defence game) after adding ~15-18 streamed buildings per layout to a scene that already ran a castle, enemies and effects. Numbers are from headless Chromium with software GL, so read them as relative, not absolute. SDK: `@polygon-streaming/web-player-threejs` 2.9.0-beta.2, re-checked on 2.9.2.

## 1. Do not toggle a light's `visible` at runtime

**Symptom:** the game stutters or freezes the first time a skill with a flash/bloom light is used, and gets worse as more streamed models are added.

**Cause:** three.js builds each lit material's shader for the current number of visible lights. Turning a light's `visible` on or off changes that number, so every lit material recompiles its program.

| Scene | One frame when the light turned on |
|---|---|
| ~540 materials (no village) | ~14 s |
| ~600 materials (village) | ~55 s (10 new shader programs) |
| Same scene, intensity-only fade | 1 ms, 0 new programs |

PLS adds many materials, so this hitch grows with streamed content even though the lights are not the new part.

**Fix:** create pooled flash lights once, leave them `visible = true` for the whole session, and fade with `intensity` (0 = invisible and free). Pin it with a test: count `scene.traverseVisible(o => o.isLight)` before, during and after the effect and across `clearAll()`; it must never change. Do not "fix" it by pre-warming only: any later change of the light count recompiles again.

**Diagnose:** time `renderer.render` on a frame with the light on versus off, and watch `renderer.info.programs.length`. A jump in programs is a recompile.

## 2. Triangle budget

`triangleBudget` is the number of triangles the streamer refines the whole scene up to, so it is a ceiling on what is drawn.

| Option | Default | Notes |
|---|---|---|
| `triangleBudget` | 5,000,000 | desktop |
| `mobileTriangleBudget` | 3,000,000 | picked from the user agent; 0 means use `triangleBudget` |
| URL `?triangle-budget=` / `?tb=` | | overrides either, handy for testing |

- Keep **5M desktop / 3M mobile**. In Bastion's stage 4 the scene reached ~4.7M triangles with the village, against under 1M for the game's own scene.
- Per model: `initialTrianglePercent` is a **share of the whole budget**, so the default 0.1 means ~500k triangles per model before refinement. Scenery used `0.004` (~20k at 5M). `qualityPriority` below 1 (0.2 used) makes the streamer favour gameplay-critical models when it refines.
- Mobile detection is by user agent. A desktop browser in a device emulator is not "mobile" to the SDK until the UA changes.

## 3. Unloading models (`removeModel`)

Three facts about the SDK, checked in its source, that are easy to get wrong:

1. **`controller.models` is `undefined` on the exported `StreamController`.** It is a thin wrapper; the engine that owns the list is stored in an obfuscated field (`controller.streamController` in dev builds). Find it by looking for the property whose value has an array `models`. Code that does `controller.models?.some(...)` silently concludes "model not present", and **removal never happens**: buildings are only hidden while the SDK keeps refining them, and re-entering the level adds a second copy.
2. **`modelIndex` in `model-load` / `model-load-error` is a monotonic add counter**, not a position in the list. Removing a model does not shift the indices of others, so owner tables keyed by `modelIndex` stay correct.
3. **`removeModel(parent, callback)` is asynchronous.** It retries once a second (up to 20 times) while the model is busy, then calls `callback`. Queue it with `addModel` calls so adds and removals do not interleave, wait for the callback, and add a timeout so a stuck removal cannot block later adds.

### The SDK keeps every removed model alive

`registerForPromotion()` adds each model to `engine.promo.queued` and `engine.promo.inflight`. With the default texture policy nothing removes it again (only the `off` policy path calls the code that clears them). So every model ever added stays reachable, with its partition tree, material cache and texture bookkeeping, until the page ends.

| | JS heap after forced GC, front/cardinal layouts switched back and forth |
|---|---|
| Removal working, promo sets not cleaned | 306, 397, 645, 839, 1004 MB (about +350 MB per full cycle) |
| After deleting the model from the sets | 228, 217, 320, 298, 275, 318, 345 MB (bounded) |

After removal succeeds, delete the removed model from `promo.queued`, `promo.inflight` and `promo.ready`:

```js
function findStreamEngine(controller) {
  if (Array.isArray(controller?.models)) return controller;
  return Object.values(controller || {}).find(v => v && typeof v === 'object' && Array.isArray(v.models)) || null;
}

function forgetRemovedModel(engine, model) {
  for (const set of [engine?.promo?.queued, engine?.promo?.inflight, engine?.promo?.ready]) set?.delete?.(model);
}
// in removeModel(): const model = engine.models.find(m => m.sceneGroup === parent);
// ... controller.removeModel(parent, () => { forgetRemovedModel(engine, model); resolve(true); });
```

Only do it after the SDK confirmed removal, never on a timeout (it may still be using the model).

**SDK 2.9.2 does not fix this.** Its `registerForPromotion` and `_removeModel` code is identical to 2.9.0-beta.2 (verified by reading both builds and by a `WeakRef` test: all 15 removed models still alive with the cleanup off, held by `promo.queued`). Do not assume an upgrade removes the need for the cleanup; re-run the test below after any SDK upgrade.

One removed model can stay referenced by a scratch `boundingBox.modelNode.model` field on the engine. It is overwritten by later use, so it is a single bounded leftover, not growth.

### The empty root group

The SDK adds a "Streamable Model Root Node" group under the parent you gave `addModel` and removes the meshes on removal, but not that group. If you reuse the parent for a reload, groups stack up (1 child, then 2, ...). Call `parent.clear()` once the removal promise resolves.

## 4. Proving a leak (do not trust the heap number alone)

`performance.memory.usedJSHeapSize` after `gc()` shows growth but not the cause. This sequence found it in a few runs:

1. **Count the engine's models** after each load/unload cycle. If it tracks the active layout (16, 19, 16, 19), removal works. If it only grows, removal is not reaching the SDK.
2. **Track a removed model with a `WeakRef`** (`new WeakRef(model)`), switch layouts, `gc()` a few times, and check `deref()`.
3. If it is alive, **walk the object graph from the game's roots** (BFS over own properties, Sets and Maps, skipping DOM and typed arrays) until the target is found, and print the path: `...promo.queued.<set>` pointed straight at the cause.
4. Re-run with the fix off to prove the test can fail, and on the other SDK version to prove whether an upgrade matters.

The sampling heap profiler (`HeapProfiler.startSampling`) only said "SDK `buildNode` allocations", which was true but not actionable; the `WeakRef` + path search was.

## 5. Settings and ordering that mattered

- Load scenery one request at a time, and start it after the core scene has had a head start.
- Hide-only is the safe default for layouts that come back often. Unload only if you can afford the wait for removal to finish (up to 20 s) and you have verified the cleanup above.
- Add a regression test for every item here; each one was invisible in functional testing and only showed up in measurements.
