# Ammo.js Compatibility with PlayCanvas

The most critical compatibility issue between PlayCanvas and Ammo.js in VIVERSE Studio environments.

## The Problem

PlayCanvas 2.14.4+ uses `.at()` on Emscripten `btAlignedObjectArray` vectors in its mesh collider builder (`createAmmoMesh`):

```javascript
// Inside PlayCanvas engine — collision/system.js
var indexedArray = triMesh.getIndexedMeshArray();
indexedArray.at(0).m_numTriangles = numTriangles;  // 💥 CRASHES
```

**No available ASM.js build of Ammo.js has the `.at()` method.** This includes:
- The 8.8MB build from `voxel_landmark` / `three/examples/jsm/libs/ammo.js`
- The official PlayCanvas CDN build from `code.playcanvas.com/ammo.js` (403 Access Denied anyway)
- Any Emscripten ASM.js compiled output using the old `_emscripten_bind_` pattern

The `.at()` method only exists in WASM builds, but WASM builds lack `Ammo.addFunction` which PlayCanvas also requires during initialization.

## Why `voxel_landmark` Never Crashed

`voxel_landmark` only uses **primitive Box colliders** (boxes, spheres). These go through `createPhysicalShape → type === 'box'` which never calls `createAmmoMesh`. The crash only triggers with `type: 'mesh'` colliders.

## The Solution: Vite Build Plugin

Patch PlayCanvas at compile time to remove the incompatible lines. These are **optimization hints only** — triangles are still built correctly via `findOrAddVertex`/`addIndex`.

```javascript
// vite.config.js
function patchPlayCanvasAmmo() {
  return {
    name: 'patch-playcanvas-ammo',
    transform(code, id) {
      if (!id.includes('playcanvas')) return null;

      let patched = code;
      let changed = false;

      if (patched.includes('getIndexedMeshArray')) {
        // Remove: Debug.assert(typeof triMesh.getIndexedMeshArray === 'function', ...)
        patched = patched.replace(
          /Debug\.assert\(typeof\s+triMesh\.getIndexedMeshArray\s*===\s*'function'[^;]*;\s*/g,
          '/* [patched] getIndexedMeshArray assert removed */\n'
        );

        // Remove: const/var indexedArray = triMesh.getIndexedMeshArray();
        patched = patched.replace(
          /(?:const|var|let)\s+indexedArray\s*=\s*triMesh\.getIndexedMeshArray\(\)\s*;\s*/g,
          '/* [patched] getIndexedMeshArray call removed */\n'
        );

        // Remove: indexedArray.at(0).m_numTriangles = numTriangles;
        patched = patched.replace(
          /indexedArray\.at\(\s*0\s*\)\.m_numTriangles\s*=\s*numTriangles\s*;\s*/g,
          '/* [patched] m_numTriangles pre-allocation removed */\n'
        );

        changed = true;
      }

      return changed ? { code: patched, map: null } : null;
    }
  };
}

// Usage:
export default defineConfig({
  plugins: [patchPlayCanvasAmmo(), react()],
});
```

## Approaches That Don't Work

| Approach | Why It Fails |
|----------|-------------|
| Swap Ammo.js binary (ASM→WASM) | WASM build lacks `Ammo.addFunction` |
| Monkey-patch `.at()` on prototype | `getIndexedMeshArray()` returns raw Emscripten pointer, not a JS-indexable wrapper |
| `(x.at ? x.at(0) : x[0])` fallback | Old Emscripten arrays don't support bracket indexing either |
| Downgrade PlayCanvas | v2.14.4 already uses `.at()` — would need to go very old |

## Mesh Colliders vs Box Colliders

Even with the Vite plugin fixing `.at()`, **mesh colliders will stack-overflow on Google Maps geometry**. Google Maps 3D tiles produce millions of triangles, and Ammo's recursive BVH tree builder exceeds the browser call stack limit.

**Use box colliders for city-scale terrain.** Mesh colliders are only viable for small, game-scale objects (tables, rocks, vehicles).

## PlayCanvas Engine Initialization Order

When running inside VIVERSE Studio's secure iframe:

1. **Synchronously** create `new pc.Application(canvas)` to claim the canvas
2. **Asynchronously** load full Ammo.js via `loadScript('/lib/ammo.js')`
3. Call `await window.Ammo()` to initialize the factory
4. Replace `window.Ammo` with the initialized instance
5. Only then call `app.start()` and set `appRef.current = app`

```javascript
// CORRECT: Synchronous canvas claim, async Ammo load
const app = new pc.Application(canvas, { ... });
canvas.setAttribute('data-engine-active', 'true');

const startWithFullAmmo = async () => {
    await loadScript('/lib/ammo.js');
    if (typeof window.Ammo === 'function') {
        window.Ammo = await window.Ammo();
    }
    app.start();
    appRef.current = app;
};
startWithFullAmmo();
```

## Key Rules

1. **Always include the Vite plugin** if using mesh colliders with PlayCanvas + ASM.js Ammo
2. **Never use mesh colliders on Google Maps 3D geometry** — use box colliders instead
3. **Wrap GLB container callbacks** with lifecycle guards and try-catch (see [safe-physics-cleanup.md](safe-physics-cleanup.md))
4. **Claim the canvas synchronously** — don't wait for async Ammo load before creating the Application
5. **Check `app._destroyed`** in async callbacks, not just `appRef.current`
