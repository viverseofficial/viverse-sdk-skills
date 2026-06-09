---
name: viverse-polygon-streaming-threejs
description: Minimal Polygon Streaming .xrg loading in vanilla Three.js using the official web-player-threejs SDK
prerequisites: [Three.js project, npm install access, web root static file control]
tags: [threejs, polygon-streaming, xrg, streaming, assets, viverse]
---

# VIVERSE Polygon Streaming for Three.js

## When To Use This Skill

Use this skill when all of these are true:

1. The project is a browser-based Three.js app.
2. The user wants to stream a Polygon Streaming `.xrg` asset at runtime.
3. The goal is to mount the streamed model into an existing `THREE.Group` or scene anchor.
4. The project is not PlayCanvas.

Do not use this skill for direct `.glb` loading without Polygon Streaming or for PlayCanvas-only flows.

## Preflight Checklist

- [ ] `npm install -S @polygon-streaming/web-player-threejs@2.9.0-beta.2`
- [ ] `npm install -S three`
- [ ] The app has a live `camera`, `renderer`, `scene`, and `cameraTarget`
- [ ] `/service-worker.js` is published at the web root
- [ ] `/lib/basis_transcoder.js` is published at the web root
- [ ] `/lib/basis_transcoder.wasm` is published at the web root
- [ ] The streaming URL resolves to an `.xrg` asset

## Mandatory Compliance Gates

1. **MUST** use `StreamController` from `@polygon-streaming/web-player-threejs`.
2. **MUST** publish the service worker and Basis transcoder files at the expected root paths.
3. **MUST** call `streamController.update()` every frame after `renderer.render(...)`.
4. **MUST** use the exported beta wrapper signature for `2.9.0-beta.2`:
   `streamController.addModel(url, sceneGroup, options)`
5. **MUST NOT** call the internal object-form API directly through the exported wrapper.
6. **MUST** wire at least one success signal and one failure signal.
7. **MUST** preserve a visible fallback if the streamed model fails.

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

### Step 4: Create a stable model anchor

```js
const modelAnchor = new THREE.Group();
modelAnchor.position.set(0, 0, 0);
modelAnchor.rotation.set(0, Math.PI, 0);
modelAnchor.scale.setScalar(0.02);
scene.add(modelAnchor);
```

Attach gameplay movement to the anchor, not to streamed internals.

### Step 5: Load the model

```js
streamController.addModel(
  'https://stream.viverse.com/.../model.xrg',
  modelAnchor,
  {
    qualityPriority: 1,
    onModelLoaded: (...args) => {
      console.info('Polygon Streaming initial model data ready', args);
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
});

streamController.addEventListener(EVENT_MODEL_LOAD_ERROR, (event) => {
  console.error('Polygon Streaming model load error event', event);
});
```

`onModelLoaded` is the best signal that the initial model data is ready and the object should now exist in scene.

### Step 7: Update every frame

```js
function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
  streamController.update();
}
```

## Known Gotchas

1. `2.9.0-beta.2` still tries to load `/assets/viverse-symbol-anim.glb` as an internal loading animation. That is separate from your XRG.
2. A failed loading mascot does not prove the streamed XRG failed.
3. The exported wrapper uses positional arguments even though the internal loader uses an object shape.
4. If the model is invisible, check anchor scale, position, and rotation before blaming the URL.
5. Keep a fallback mesh or procedural object during integration.

## Verification Checklist

- [ ] Console shows Polygon Streaming startup log
- [ ] `onModelLoaded` or `EVENT_MODEL_LOAD` fires
- [ ] Network shows `.xrg` or downstream streamable asset requests
- [ ] `/service-worker.js` is requested from the app root
- [ ] `/lib/basis_transcoder.js` and `/lib/basis_transcoder.wasm` are reachable
- [ ] Fallback stays visible if load fails