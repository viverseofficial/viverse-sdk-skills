# TankArena-Derived Debug Appendix

## What This Appendix Is For

Use this appendix when the generic Polygon Streaming integration steps are already in place, but the app still behaves as if loading failed or the replacement model looks wrong after load.

## Short Failure Sequence

TankArena exposed a three-step failure chain:

1. The app believed PS never finished.
2. The SDK had actually loaded the model, but the app listened to the wrong wrapper event.
3. After success was wired correctly, the streamed model still looked broken because it was not fitted to gameplay scale and the fallback visuals were only partially hidden.

## Most Reusable Lessons

### 1. Do not infer PS failure from UI state alone

If `addModel()` resolves and network `206` range requests appear, the SDK may already be progressing normally even if the app still looks stuck.

### 2. Validate wrapper event names from the installed SDK build

For `@polygon-streaming/web-player-threejs@2.9.0-beta.2`, the reliable wrapper success/error events are:

- `model-load`
- `model-load-error`

If the app listens to `model-loaded` instead, the model can finish loading internally while the app never updates its own success state.

### 3. Treat post-load fitting as part of integration, not polish

A streamed model that mounts with raw source coordinates can look absent even after successful load.

Fit using the emitted bounding box:

- scale to the intended gameplay `targetSize`
- center the model in `x/z`
- align `minY` to the intended ground offset

### 4. Make fallback replacement policy explicit

For multi-part actors, decide whether the streamed model replaces:

- the whole actor
- only the lower body
- only a specific visual layer

If only one fallback node is hidden, the result can look half-replaced even though streaming succeeded.

### 5. Do not hide the fallback before wrapper success

If the app removes or hides the fallback actor before `model-load`, the user can see an empty slot and assume PS failed even while the SDK is still progressing.

Keep the fallback visible until wrapper success confirms the streamed content is present and fitted.

### 6. Fit under an inner content root, not the gameplay anchor

Using a single mount group for both gameplay transforms and post-load fitting makes debugging harder and can cause offset/scale confusion.

Use:

- outer anchor: gameplay motion, rotation, authored placement
- inner content root: bounding-box centering, minY ground alignment, final fit scale

### 7. A failed loading mascot is a separate prerequisite issue

`/assets/viverse-symbol-anim.glb` can fail independently of the XRG stream.

Ship the file, but do not treat mascot failure alone as proof that the streamed model failed.

## Cheap Discriminators

Before changing broad integration code, check these:

1. `HEAD 200` on the `.xrg` URL
2. one or more `GET 206` range responses
3. `streamController.update()` running after `renderer.render()`
4. wrapper success/error event name correctness
5. post-load bounding-box fitting
6. fallback hide/show policy
7. whether the streamed content root actually gains children after success

## Internal Engine Clues

If you must inspect the wrapper internals, the following signals are strong evidence that PS really loaded:

- `models.length > 0`
- `initialBatchStarted === true`
- `numModelsInitialDataLoaded > 0`
- wrapper `isModelLoaded === true`

If those are true, the bug is likely no longer transport. It is usually event wiring, placement, fitting, or fallback rendering.