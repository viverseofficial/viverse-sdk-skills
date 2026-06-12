---
name: viverse-polygon-streaming-threejs
description: Three.js Polygon Streaming .xrg integration and debugging playbook for @polygon-streaming/web-player-threejs, including correct wrapper events, asset publishing, model fitting, and fallback replacement policy
prerequisites: [Three.js project, npm install access, web root static file control]
tags: [threejs, polygon-streaming, xrg, streaming, assets, viverse]
---

# VIVERSE Polygon Streaming for Three.js

## When To Use This Skill

Use this skill when all of these are true:

1. The project is a browser-based Three.js app.
2. The user wants to stream a Polygon Streaming `.xrg` asset at runtime.
3. The goal is to mount the streamed model into an existing `THREE.Group` or scene anchor.
4. The project needs reliable success/error signals and predictable fallback behavior.
5. The project is not PlayCanvas.

Do not use this skill for direct `.glb` loading without Polygon Streaming or for PlayCanvas-only flows.

## Preflight Checklist

- [ ] `npm install -S @polygon-streaming/web-player-threejs@2.9.0-beta.2`
- [ ] `npm install -S three`
- [ ] The app has a live `camera`, `renderer`, `scene`, and `cameraTarget`
- [ ] `/service-worker.js` is published at the web root
- [ ] `/lib/basis_transcoder.js` is published at the web root
- [ ] `/lib/basis_transcoder.wasm` is published at the web root
- [ ] `/assets/viverse-symbol-anim.glb` is published at the web root
- [ ] The streaming URL resolves to an `.xrg` asset

## Mandatory Compliance Gates

1. **MUST** use `StreamController` from `@polygon-streaming/web-player-threejs`.
2. **MUST** publish the service worker and Basis transcoder files at the expected root paths.
3. **MUST** call `streamController.update()` every frame after `renderer.render(...)`.
4. **MUST** use the exported beta wrapper signature for `2.9.0-beta.2`:
   `streamController.addModel(url, sceneGroup, options)`
5. **MUST NOT** call the internal object-form API directly through the exported wrapper.
6. **MUST** wire success and failure through the wrapper event layer on `StreamController`.
7. **MUST NOT** treat the user-passed `onModelLoaded` callback as the primary app-level success source.
8. **MUST** preserve a visible fallback if the streamed model fails.
9. **MUST** decide explicitly whether the streamed asset replaces the whole actor or only one part of it.
10. **MUST NOT** hide the fallback visual before `EVENT_MODEL_LOAD` or equivalent wrapper success is observed.
11. **MUST** separate gameplay transform from streamed-content fitting by using an outer anchor plus an inner content root.

## Verified SDK Behavior For `2.9.0-beta.2`

- The exported wrapper emits `EVENT_MODEL_LOAD` and `EVENT_MODEL_LOAD_ERROR`.
- In the installed `2.9.0-beta.2` build, those resolve to `model-load` and `model-load-error`.
- The SDK wrapper can wrap or replace user-supplied `onModelLoaded` and `onModelLoadError` callbacks.
- For app integration, the wrapper event on `StreamController` is the safer hook.
- If the model finishes loading internally but the app listens to `model-loaded` instead of `model-load`, the UI can look stuck even though the SDK succeeded.

## Implementation Workflow

### Step 1: Install the SDK

```bash
npm install -S @polygon-streaming/web-player-threejs@2.9.0-beta.2 three
```

### Step 2: Publish required static files

Copy these into your final app output:

- `node_modules/@polygon-streaming/web-player-threejs/dist/service-worker.js` -> `/service-worker.js`
- `node_modules/three/examples/jsm/libs/basis/basis_transcoder.js` -> `/lib/basis_transcoder.js`
- `node_modules/three/examples/jsm/libs/basis/basis_transcoder.wasm` -> `/lib/basis_transcoder.wasm`
- `public/assets/viverse-symbol-anim.glb` -> `/assets/viverse-symbol-anim.glb`

For Vite apps, place `viverse-symbol-anim.glb` under `public/assets/` so the build emits `dist/assets/viverse-symbol-anim.glb` without any runtime override.

If the app already has a custom root service worker, keep that registration and import the Polygon Streaming worker inside it with `importScripts('./service-worker.js')` rather than trying to register two competing root workers.

### Step 3: Construct the controller

```js
import * as THREE from 'three';
import {
  StreamController,
  EVENT_MODEL_LOAD,
  EVENT_MODEL_LOAD_ERROR,
} from '@polygon-streaming/web-player-threejs';

const streamController = new StreamController(
  camera,
  renderer,
  scene,
  cameraTarget,
  {
    cameraType: 'nonPlayer',
    triangleBudget: 5000000,
    mobileTriangleBudget: 3000000,
  }
);
```

### Step 4: Create a stable model anchor and content root

```js
const modelAnchor = new THREE.Group();
const streamedContentRoot = new THREE.Group();

modelAnchor.position.set(0, 0, 0);
modelAnchor.rotation.set(0, Math.PI, 0);
modelAnchor.scale.setScalar(1);
modelAnchor.add(streamedContentRoot);
scene.add(modelAnchor);
```

Attach gameplay movement to the outer anchor, not to streamed internals.

Use the inner content root for post-load fitting and centering.

### Step 5: Load the model

```js
streamController.addModel(
  'https://stream.viverse.com/.../model.xrg',
  streamedContentRoot,
  {
    qualityPriority: 1,
    onModelLoaded: (...args) => {
      console.info('Polygon Streaming callback fired', args);
    },
    onModelLoadError: (error) => {
      console.error('Polygon Streaming load error', error);
    },
  }
);
```

### Step 6: Add load/error listeners

```js
streamController.addEventListener(EVENT_MODEL_LOAD, (event) => {
  console.info('Polygon Streaming model loaded event', event);
  fitStreamedModel(streamedContentRoot, event.boundingBox, {
    targetSize: 3.6,
    yOffset: 0.02,
  });
});

streamController.addEventListener(EVENT_MODEL_LOAD_ERROR, (event) => {
  console.error('Polygon Streaming model load error event', event);
});
```

Treat `EVENT_MODEL_LOAD` as the app-level success signal.

Hide fallback visuals and apply post-load fitting from this wrapper event path, not only from the user-supplied `onModelLoaded` callback.

If the package exposes the exported constants, prefer them over raw strings. If not, the current wrapper event names are `model-load` and `model-load-error`.

### Step 7: Fit the streamed model to gameplay scale

```js
function fitStreamedModel(contentRoot, boundingBox, { targetSize, yOffset }) {
  if (!boundingBox) return;

  const sizeX = Math.max(boundingBox.maxX - boundingBox.minX, 0.0001);
  const sizeY = Math.max(boundingBox.maxY - boundingBox.minY, 0.0001);
  const sizeZ = Math.max(boundingBox.maxZ - boundingBox.minZ, 0.0001);
  const maxSize = Math.max(sizeX, sizeY, sizeZ);
  const fitScale = targetSize / maxSize;

  const centerX = (boundingBox.minX + boundingBox.maxX) * 0.5;
  const centerZ = (boundingBox.minZ + boundingBox.maxZ) * 0.5;

  contentRoot.scale.setScalar(fitScale);
  contentRoot.position.set(
    -centerX * fitScale,
    yOffset - boundingBox.minY * fitScale,
    -centerZ * fitScale
  );
}
```

This prevents the common symptom where loading succeeds but the replacement appears tiny, huge, or below the floor.

### Step 8: Update every frame

```js
function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
  streamController.update();
}
```

## Fallback Replacement Policy

Define replacement behavior deliberately for multi-part actors.

Examples:

- full replacement: hide the entire fallback visual root after `EVENT_MODEL_LOAD`
- lower-body replacement only: hide the fallback hull but keep a procedural turret overlay

Do not leave this implicit. If only part of the fallback is hidden, the final actor can look half-replaced even though PS loaded correctly.

## Known Gotchas

1. `2.9.0-beta.2` still tries to load `/assets/viverse-symbol-anim.glb` as an internal loading animation. That is separate from your XRG.
2. The stable fix is to ship that GLB locally at `/assets/viverse-symbol-anim.glb`; do not monkey-patch `StreamController.addLoadingModel()` unless you are debugging the SDK itself.
3. A failed loading mascot does not prove the streamed XRG failed.
4. The exported wrapper uses positional arguments even though the internal loader uses an object shape.
5. If `addModel()` resolves and network `206` requests happen, do not assume the model failed. Confirm the wrapper event name first.
6. If the streamed model loads but looks absent, check post-load fitting before blaming the URL.
7. Keep a fallback mesh or procedural object during integration.
8. A parented anchor is safer than a floating world-space mount that is manually re-synced every frame.
9. On non-bundled pages that use the UMD build, the PS runtime can fail at startup if it runs before a global `THREE` exists. Load a classic Three.js global first, or inject the PS runtime from module code after `window.THREE = THREE` is set.
10. If the app already registers its own root service worker, merge the PS worker into that file instead of letting the SDK compete for root-worker ownership.
11. Bounding-box fitting and user tuning are separate steps. Fit first from `event.boundingBox`, then optionally apply a config multiplier such as `0.5` for art direction.

## Debugging Playbook

### Symptom: `addModel()` resolves but the app still thinks loading never finished

Check these first:

1. Are you listening to `EVENT_MODEL_LOAD` or the exact emitted wrapper event name?
2. Did you accidentally wire `model-loaded` instead of `model-load`?
3. Are you relying only on `onModelLoaded` instead of the wrapper event?

### Symptom: network looks healthy but nothing visible appears

Check these next:

1. Is the content mounted under a separate child root for fitting?
2. Did you normalize the model using `event.boundingBox`?
3. Is the outer anchor doing gameplay transforms while the inner root handles centering/scale?
4. Is the streamed model below the floor because `minY` was not aligned to the intended ground offset?

### Symptom: only part of the actor is replaced

Check fallback policy:

1. Which fallback nodes are hidden on success?
2. Is `keepTurretOverlay` or equivalent intentionally preserving part of the actor?
3. Does the desired asset represent a full replacement or only a body replacement?
4. Are fallback visuals being hidden too early, before wrapper success is confirmed?

### Symptom: the SDK appears healthy but the fallback never swaps

Check these next:

1. Is fallback visibility tied to `EVENT_MODEL_LOAD` or only to `onModelLoaded`?
2. Does the streamed content root actually gain children after load?
3. Is the app fitting the model under a separate inner content root rather than moving the gameplay anchor itself?
4. Is the fallback still visible only because post-load fit/offset leaves the streamed model inside it or under the floor?

### Symptom: you still suspect the SDK never loaded

Use cheap discriminators before broad changes:

1. Verify `HEAD 200` on the `.xrg` URL.
2. Verify one or more `GET 206` range responses.
3. Verify `streamController.update()` runs after `renderer.render()`.
4. Inspect internal engine state if needed:
  - `models.length`
  - `initialBatchStarted`
  - `totalNumModels`
  - `numModelsInitialDataLoaded`

If those counters advance, the problem has likely moved from transport into integration or presentation.

## Verification Checklist

- [ ] Console shows Polygon Streaming startup log
- [ ] `EVENT_MODEL_LOAD` or `model-load` fires
- [ ] Network shows `.xrg` or downstream streamable asset requests
- [ ] `/service-worker.js` is requested from the app root
- [ ] `/lib/basis_transcoder.js` and `/lib/basis_transcoder.wasm` are reachable
- [ ] `/assets/viverse-symbol-anim.glb` is reachable from the app root
- [ ] Streamed content is centered/scaled using the emitted bounding box
- [ ] Fallback is hidden only after wrapper success confirms the streamed model is usable
- [ ] Any custom root service worker imports the PS worker instead of competing with it
- [ ] Fallback policy matches the intended replacement mode
- [ ] Fallback stays visible if load fails