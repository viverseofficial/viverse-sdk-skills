# Physics Colliders for Google Maps 3D Tiles

How to add walkable physics surfaces to Google Maps Photorealistic 3D Tile geometry loaded into PlayCanvas.

## The Constraint

Google Maps 3D tiles produce **millions of triangles** (buildings, vegetation, terrain detail). This makes mesh colliders (`type: 'mesh'`) impossible:

1. **Ammo.js `.at()` incompatibility** — PlayCanvas calls `getIndexedMeshArray().at(0)` which no ASM.js Ammo build supports (see [ammo-compatibility.md](../../playcanvas-avatar-navigation/patterns/ammo-compatibility.md))
2. **BVH stack overflow** — Even with the `.at()` fix, Ammo's recursive BVH tree builder exceeds the browser call stack limit on millions of triangles
3. **Performance** — Triangle-mesh collision on city-scale geometry would be unusably slow

## The Solution: AABB Box Collider Ground Plane

Compute the bounding box of the loaded map entity and create a flat ground slab beneath it:

```javascript
appRef.current.assets.loadFromUrlAndFilename(blobUrl, 'map.glb', 'container', (err, asset) => {
    // Lifecycle guard (CRITICAL — see safe-physics-cleanup skill)
    if (!appRef.current || appRef.current._destroyed) return;
    if (err || !asset || !asset.resource) {
        console.error("Map load error:", err);
        return;
    }

    try {
        const entity = asset.resource.instantiateRenderEntity();
        entity.name = "GoogleMaps3DTiles";
        appRef.current.root.addChild(entity);

        // Compute AABB from all render mesh instances
        const aabb = new pc.BoundingBox();
        const renders = entity.findComponents('render');
        renders.forEach(r => {
            if (r.meshInstances) {
                r.meshInstances.forEach(mi => aabb.add(mi.aabb));
            }
        });

        // Create ground plane collider
        const ground = new pc.Entity('MapGround');
        const halfExtents = aabb.halfExtents;
        ground.addComponent('collision', {
            type: 'box',
            halfExtents: new pc.Vec3(
                Math.max(halfExtents.x, 500),  // Minimum 500m coverage
                0.5,                            // Thin ground slab
                Math.max(halfExtents.z, 500)
            )
        });
        ground.addComponent('rigidbody', {
            type: 'static',
            friction: 0.8
        });
        // Position at the bottom of the map geometry
        ground.setPosition(
            aabb.center.x,
            aabb.center.y - halfExtents.y,
            aabb.center.z
        );
        appRef.current.root.addChild(ground);
    } catch (e) {
        // Absorb "Cannot destroy object" Ammo.js assertions during GLB parsing
        console.warn('[MapLoader] GLB parse error (absorbed):', e.message);
    }
});
```

## Critical Patterns

### 1. Try-Catch is Mandatory
The GLB container parser internally creates/destroys temporary physics objects. Ammo.js will throw `Cannot destroy object. (Did you create it yourself?)` during parsing. The try-catch absorbs this non-fatal assertion while still rendering the geometry correctly.

### 2. Lifecycle Guard is Mandatory
The `loadFromUrlAndFilename` callback fires asynchronously. By the time it arrives, the React component may have unmounted and `appRef.current` may be destroyed. Always check `appRef.current._destroyed`.

### 3. Minimum Half-Extents
Use `Math.max(halfExtents.x, 500)` to ensure the ground plane is at least 500m wide. Some map tiles may have tiny computed bounds if only a few meshes have loaded.

## Why Not Mesh Colliders?

| Approach | Result |
|----------|--------|
| `type: 'mesh'` on Google Maps GLB | ❌ `TypeError: .at is not a function` (ASM.js Ammo) |
| `type: 'mesh'` + Vite plugin fix | ❌ `RangeError: Maximum call stack size exceeded` (BVH overflow) |
| `type: 'box'` AABB ground plane | ✅ Works, fast, industry-standard for open worlds |

## When Mesh Colliders ARE Appropriate

Mesh colliders work great for **small, game-scale objects** like:
- A table, chair, or piece of furniture
- A vehicle or character capsule
- A rock formation or small building

If using mesh colliders, **always include the Vite plugin** from [ammo-compatibility.md](../../playcanvas-avatar-navigation/patterns/ammo-compatibility.md) to patch the `.at()` incompatibility.
