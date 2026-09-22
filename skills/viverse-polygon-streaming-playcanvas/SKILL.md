---
name: viverse-polygon-streaming-playcanvas
description: PlayCanvas Polygon Streaming .xrg integration playbook for @polygon-streaming/web-player-playcanvas, covering script-component setup (streamController/streamableModel), automatic service-worker registration vs manual file publishing, Ammo/Basis WASM prerequisites for embedded colliders and KTX2 textures, and entity-level load/error/animation events
prerequisites: [PlayCanvas project (npm/ESM, not Editor-only workflow), npm install access, web root static file control]
tags: [playcanvas, polygon-streaming, xrg, streaming, assets, viverse]
---

# VIVERSE Polygon Streaming for PlayCanvas

## When To Use This Skill

Use this skill when all of these are true:

1. The project is a browser-based PlayCanvas app built from npm/ESM code (not purely the PlayCanvas Editor's own script-asset workflow).
2. The user wants to stream a Polygon Streaming `.xrg` asset at runtime via `@polygon-streaming/web-player-playcanvas`.
3. The goal is to mount the streamed model as a `pc.Entity` in an existing scene.
4. The project needs reliable success/error signals, embedded colliders, and/or animation playback.
5. The project is not Three.js (See [viverse-polygon-streaming-threejs skill](../viverse-polygon-streaming-threejs/) for integrating into a Three.js project).

Do not use this skill for direct `.glb` loading without Polygon Streaming.

## Preflight Checklist

- [ ] `npm install -S @polygon-streaming/web-player-playcanvas playcanvas`
- [ ] The app can create a `pc.Application` with a canvas and, if needed, `pc.Mouse` / `pc.Keyboard` / `pc.TouchDevice`
- [ ] `/service-worker.js` — copied from `node_modules/@polygon-streaming/web-player-playcanvas/dist/service-worker.js` — is published at the app's web root, for both dev and build
- [ ] `pc.WasmModule` is configured and loaded for `'Ammo'` **before** `new pc.Application(...)` runs, unless none of the models have an embedded collider or every `streamableModel` sets `useEmbeddedCollider: false`.
- [ ] `pc.basisInitialize(...)` is called with glue/wasm/fallback URLs if streamed models may ship KTX2 textures (the common case)
- [ ] A `pc.Entity` with a `camera` component exists before the `streamController` script entity is created
- [ ] The streaming URL resolves to an `.xrg` asset (get it from the Polygon Streaming console — see "Using Your Own Model" in `packages/playcanvas/README.md`)

## Mandatory Compliance Gates

1. **MUST** call `registerScripts()` from `@polygon-streaming/web-player-playcanvas` once, before creating any entity that uses the `streamController` or `streamableModel` script components.
2. **MUST** integrate through PlayCanvas script components: `entity.addComponent('script')` then `entity.script.create('streamController' | 'streamableModel', { attributes })`. There is no standalone imperative `StreamController` constructor call for app code to make directly.
3. **MUST** create exactly **one** entity with a `streamController` script component per page/session. Each script instance owns an independent internal `StreamController`; two of them fight over the same renderer/camera/triangle budget.
4. **MUST** pass a real `pc.Entity` with a `camera` component as the `streamController` script's `camera` attribute — it is required. Omitting it logs `Camera attribute is missing` and the controller never initializes.
5. **MUST** set `cameraType` explicitly: `'nonPlayer'` (camera not attached to a player, e.g. orbiting/observing) or `'player'` (camera attached to a controlled character). It changes distance/quality heuristics, not just semantics.
6. **MUST** add every `streamableModel` script entity as a **child** of its owning `streamController` entity. `StreamableModelScript` looks at `entity.parent` first and only falls back to `app.root.findOne(...)` (which returns the *first* `streamController` script found anywhere in the scene) when there's no parent match. With more than one stream controller present, that fallback can silently attach a model to the wrong controller.
7. **MUST NOT** call `streamController.update()` manually. `StreamControllerScript.update()` already runs `this._streamController.update()` every PlayCanvas app tick because it is an ordinary script component.
8. **MUST NOT** call `navigator.serviceWorker.register(...)` yourself. `Env` (inside `@polygon-streaming/web-player-core`) registers `/service-worker.js` automatically the first time a `streamController` script constructs its internal `StreamController`, as long as `'serviceWorker' in navigator` and the app isn't running on the PlayCanvas Editor preview host.
9. **MUST** still publish the actual service worker file yourself — automatic registration does not create the file. Copy `node_modules/@polygon-streaming/web-player-playcanvas/dist/service-worker.js` to the app's web root (e.g. via `vite-plugin-static-copy`, as the package's own example does) for both `dev` and `build`.
10. **MUST** configure Ammo via `pc.WasmModule.setConfig('Ammo', { glueUrl, wasmUrl, fallbackUrl })` and wait for `pc.WasmModule.getInstance('Ammo', callback)` before constructing `new pc.Application(...)`, **unless** the streamable model doesn't contain a collider or `useEmbeddedCollider` is set to `false` (it defaults to `true`); the core streaming pipeline then adds a kinematic `rigidbody` + mesh `collision` component pair per streamed model to back its embedded collider.
11. **MUST** call `pc.basisInitialize({ glueUrl, wasmUrl, fallbackUrl })` if any streamed asset may ship KTX2 textures. The core renderer routes `.ktx2` filenames straight into PlayCanvas's KTX2 texture path, which needs the Basis transcoder or those textures fail to decode.
12. **MUST** listen for success/failure on the **model entity itself**, not the stream controller: `streamableModelEntity.on(EVENT_STREAMABLE_MODEL_LOAD, ...)` / `EVENT_STREAMABLE_MODEL_LOAD_ERROR`.
13. **MUST** attach the `EVENT_STREAMABLE_MODEL_LOAD` listener synchronously, right after `entity.script.create('streamableModel', ...)`. The internal `onModelLoaded` callback fires the entity event only if a listener is already registered at that moment — there is no buffering or replay of a missed load event.
14. **MUST** only call `entity.fire('streamable-model:play-animation', nameOrIndex, transitionDuration?)` **after** the model has loaded. The listener for this event is itself registered inside the model's `onModelLoaded` callback, so firing it earlier (e.g. immediately after `script.create`) is a silent no-op.
15. **MUST** treat `showLoadingModel` (default `true`) as opt-out, not opt-in. The default loading placeholder resolves against Polygon Streaming's own `sharedAssetsUrl` CDN path, not the app's web root. Override with `loadingModelUrl` only if you want a custom placeholder.
16. **MUST NOT** assume the loading placeholder follows the model or depends on the camera setup. It is added at a fixed world position of `(0, 0.4, 0)`, scaled from the camera's distance to that point. If your model isn't near the origin, set `showLoadingModel: false` and build your own loading UI off the load/error events.
17. **MUST** coordinate any physics entities you add yourself (ground planes, triggers, etc.) with the same Ammo bootstrap as the streamed colliders — `rigidbody`/`collision` components created before Ammo finishes loading also silently no-op, same failure mode as gate 11.

## Verified SDK Behavior

- Registered script names: `'streamController'` (constant `STREAM_CONTROLLER_SCRIPT_NAME`) and `'streamableModel'` (constant `STREAMABLE_MODEL_SCRIPT_NAME`).
- The package also re-exports `toAnimStateGraphAsset(data, app)` — builds an `animstategraph` asset from a plain JS object at runtime, bypassing the PlayCanvas Editor — and `StreamController` / `PlayCanvasRenderer` for advanced integration outside the script-component API.
- VRM expression playback — `entity.fire('vrm-expression:start-emotion', name, { times, values })` — is provided by the bundled `@viverseofficial/playcanvas-vrm` dependency for VRM-sourced XRGs, not by this package directly.
- `useEmbeddedCollider` (model attribute, default `true`) and `showLoadingModel` (controller attribute, default `true`) are both **enabled by default**, so their WASM/asset prerequisites (Ammo, and reachability of the loading-model CDN URL) apply out of the box unless explicitly opted out.

## Implementation Workflow

### Step 1: Install

```bash
npm install -S @polygon-streaming/web-player-playcanvas playcanvas
```

### Step 2: Publish the service worker (registration is automatic; the file is not)

```js
// vite.config.js
import { resolve } from 'path';
import { defineConfig, normalizePath } from 'vite';
import { viteStaticCopy } from 'vite-plugin-static-copy';

export default defineConfig({
  plugins: [
    viteStaticCopy({
      targets: [
        {
          src: normalizePath(resolve(__dirname, './node_modules/@polygon-streaming/web-player-playcanvas/dist/service-worker.js')),
          dest: ''
        }
      ]
    }),
  ],
});
```

Do this for a non-Vite bundler too — the important part is that `service-worker.js` is reachable at the site root before the first `streamController` script initializes, since `Env` registers it automatically at that point (gate 9).

### Step 3: Configure Ammo and Basis before creating the `pc.Application`

Skip the Ammo half only if every streamable model doesn't have a collider or you have set `useEmbeddedCollider` to false for every streamable model.

```js
import * as pc from 'playcanvas';
import { registerScripts } from '@polygon-streaming/web-player-playcanvas';

pc.WasmModule.setConfig('Ammo', {
  glueUrl: ammoGlueUrl,
  wasmUrl: ammoWasmUrl,
  fallbackUrl: ammoFallbackUrl
});
pc.WasmModule.getInstance('Ammo', ammoLibraryLoaded);

async function ammoLibraryLoaded() {
  const canvas = document.getElementById('application');
  const app = new pc.Application(canvas, {
    mouse: new pc.Mouse(canvas),
    keyboard: new pc.Keyboard(window),
    touch: new pc.TouchDevice(window),
  });

  registerScripts();

  pc.basisInitialize({
    glueUrl: basisGlueUrl,
    wasmUrl: basisWasmUrl,
    fallbackUrl: basisFallbackUrl,
  });

  // ... Steps 4-8 continue inside this callback ...

  app.start();
}
```

### Step 4: Create the camera entity

```js
const camera = new pc.Entity('camera');
camera.addComponent('camera');
app.root.addChild(camera);
```

Set `showLoadingModel: false` on the stream controller to disable it.

### Step 5: Create the stream controller entity

```js
const streamController = new pc.Entity('Stream Controller');
streamController.addComponent('script');
streamController.script.create('streamController', {
  attributes: {
    camera,
    cameraType: 'nonPlayer',
    triangleBudget: 5000000,
    mobileTriangleBudget: 3000000
  },
});
app.root.addChild(streamController);
```

### Step 6: Create streamable model entities as children of the controller

```js
const streamableModelEntity = new pc.Entity('Streaming Model');
streamableModelEntity.addComponent('script');
streamableModelEntity.script.create('streamableModel', {
  attributes: {
    path: 'https://stream.viverse.com/demos/jet-engine-11m/',
    qualityPriority: 1
  },
});
streamController.addChild(streamableModelEntity); // MUST be a child — see gate 7
```

### Step 7: Wire load/error listeners synchronously

```js
import {
  EVENT_STREAMABLE_MODEL_LOAD,
  EVENT_STREAMABLE_MODEL_LOAD_ERROR,
} from '@polygon-streaming/web-player-playcanvas';

streamableModelEntity.on(EVENT_STREAMABLE_MODEL_LOAD, (boundingBox, isAnimated, willUseEmbeddedCollider, isLastModelToLoad) => {
  console.info('Polygon Streaming model loaded', { boundingBox, isAnimated, willUseEmbeddedCollider, isLastModelToLoad });
});

streamableModelEntity.on(EVENT_STREAMABLE_MODEL_LOAD_ERROR, (error) => {
  console.error('Polygon Streaming model load error', error);
});
```

Attach these immediately after `script.create('streamableModel', ...)` (gate 15) — do not defer to a later tick.

### Step 8: Play embedded or VRM animations (only after load)

```js
streamableModelEntity.on(EVENT_STREAMABLE_MODEL_LOAD, () => {
  streamableModelEntity.fire('streamable-model:play-animation', 'animationName', 0.2);
});
```

For VRM-sourced XRGs, pass `vrmAnimations` in the `streamableModel` attributes (name, `pc.Asset` of type `container`, `loop`, `default`) — see `packages/playcanvas/README.md` for the full shape.

## Known Gotchas

1. `useEmbeddedCollider: true` (the default) silently produces zero collision if Ammo wasn't configured and loaded before `new pc.Application(...)` — no thrown error, just a missing `rigidbody`/`collision` pair and a PlayCanvas console warning about an unknown component system.
2. A missing/failed `pc.basisInitialize(...)` call doesn't fail loudly either — KTX2-textured streamed models can load geometrically while textures fail to decode, which looks like "the model loaded but is untextured/black," not "streaming failed."
3. The loading placeholder is placed at the fixed world position `(0, 0.4, 0)`, not at the streamed model's position; a model positioned far from the origin loads with the placeholder somewhere else in the scene.
4. `entity.fire('streamable-model:play-animation', ...)` before load is a silent no-op — the listener for that event is registered inside the model's own load callback, so there's nothing listening yet.
5. `streamableModel` entities parented anywhere other than directly under their intended `streamController` entity fall back to a scene-wide search that returns the *first* `streamController` script found — with multiple controllers present this can misattach a model without any error.
6. Two `streamController` script entities in the same scene create two independent internal `StreamController`s that compete for the same renderer/camera/triangle budget — keep it to one.
7. `streamController.update()` must **not** be called manually from an app-level render loop; doing so would double-update the internal controller since the script component's own `update()` already does it every tick.

## Debugging Playbook

### Symptom: nothing streams, no console errors

1. Confirm `registerScripts()` ran before any `streamController`/`streamableModel` script was created.
2. Confirm `/service-worker.js` returns 200 from the app's web root (`Env` registers it automatically, but only if the file exists there).
3. Confirm the `streamController` entity has a valid `camera` attribute — check console for `Camera attribute is missing`.

### Symptom: model geometry loads but textures are black/missing

1. Confirm `pc.basisInitialize(...)` was called with reachable glue/wasm/fallback URLs before or during load.
2. Check network requests for `.ktx2` files returning errors, and console for Basis transcoder init failures.

### Symptom: model loads but has no collision

1. Confirm `useEmbeddedCollider` wasn't left implicitly `true` without Ammo configured.
2. Confirm `pc.WasmModule.getInstance('Ammo', ...)` resolved **before** `new pc.Application(...)` was constructed — colliders added after Ammo loads too late will still no-op, since the rigidbody component system is registered once at `Application` construction.
3. Look for a PlayCanvas console warning about an unrecognized `rigidbody`/`collision` component system.

### Symptom: `EVENT_STREAMABLE_MODEL_LOAD` never fires

1. Confirm the listener is attached immediately after `entity.script.create('streamableModel', ...)`, not deferred.
2. Confirm you're listening on the **model entity**, not the `streamController` entity — this package fires load/error on the model, unlike the Three.js wrapper's controller-level events.
3. Check for a `streamable-model:load-error` (or deprecated `streamable-model-load-error`) firing instead.

### Symptom: loading placeholder never appears

1. Confirm `showLoadingModel` wasn't set to `false`.
2. Confirm the camera is looking toward the world origin — the placeholder sits at `(0, 0.4, 0)` regardless of where the model is.
3. Confirm the default `viverse-symbol-anim.glb` (or your `loadingModelUrl`) is reachable; the placeholder is only added after that asset loads, and it's removed once the model loads.

### Symptom: `streamable-model:play-animation` does nothing

1. Confirm it's fired from inside (or after) an `EVENT_STREAMABLE_MODEL_LOAD` handler, not immediately after `script.create`.
2. Confirm the animation name/index exists — check `model.animationNames` via the load event or console errors like `Couldn't find animation with name ...`.

## Verification Checklist

- [ ] `registerScripts()` called once before any stream-related script component is created
- [ ] Exactly one `streamController` script entity exists in the scene
- [ ] `camera` and `cameraType` attributes are set on the `streamController` script
- [ ] Every `streamableModel` entity is a child of its intended `streamController` entity
- [ ] `/service-worker.js` is reachable at the app's web root in both dev and build
- [ ] Ammo is configured and loaded before `new pc.Application(...)`, or every model doesn't have an embedded collider or every models sets `useEmbeddedCollider: false`.
- [ ] `pc.basisInitialize(...)` is called if streamed models may use KTX2 textures
- [ ] `EVENT_STREAMABLE_MODEL_LOAD` / `EVENT_STREAMABLE_MODEL_LOAD_ERROR` listeners are attached on the model entity, synchronously after `script.create`
- [ ] No `streamController.update()` call anywhere in app code
- [ ] Animation playback (`streamable-model:play-animation`) is only fired after load
- [ ] `showLoadingModel` behavior matches intent (default CDN placeholder, custom `loadingModelUrl`, or explicitly disabled)
