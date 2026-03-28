---
name: playcanvas-googlemaps-3dtiles
description: Streaming, rendering, and decoding Google Maps Photorealistic 3D Tiles in PlayCanvas
prerequisites: [PlayCanvas engine, 3d-tiles-renderer, Google Maps API Key]
tags: [playcanvas, google-maps, 3d-tiles, draco, gltf]
---

# Google Maps 3D Tiles Streaming (PlayCanvas)

Reliable Google Photorealistic 3D Tiles streaming in PlayCanvas using `3d-tiles-renderer`.

## When To Use This Skill

Use this when a project needs to:
- Render real-world cities or photorealistic environments using Google Maps data.
- Avoid 400/403 errors when requesting the Maps API.
- Support dynamically compressed (`.drc`/`KHR_draco_mesh_compression`) geometry from Google's servers.

## Read Order

1. This file
2. [patterns/physics-colliders.md](patterns/physics-colliders.md)
3. [patterns/flat-map-workaround.md](patterns/flat-map-workaround.md)

## Preflight

- [ ] Google Maps API key has Map Tiles API enabled
- [ ] Installed: `3d-tiles-renderer`, `three`
- [ ] Draco decoder path configured
- [ ] Root/session handshake implemented
- [ ] URL preprocessing plugin registered for renderer version
- [ ] Non-mesh physics strategy selected for navigation

## Implementation Workflow

1. Fetch `root.json` using key-authenticated request.
2. Extract session token from returned content URIs.
3. Initialize `TilesRenderer` with root URL.
4. Register URL preprocess plugin to append key/session.
5. Register Draco plugin for compressed geometry.
6. Add lifecycle guards for async load/unmount.
7. Use simple colliders (AABB/ground planes), not mesh colliders.

## Minimal Setup Skeleton

```javascript
import { TilesRenderer } from "3d-tiles-renderer";
import { GLTFExtensionsPlugin } from "3d-tiles-renderer/plugins";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";

const draco = new DRACOLoader();
draco.setDecoderPath("https://www.gstatic.com/draco/versioned/decoders/1.5.6/");

const rootResp = await fetch(`https://tile.googleapis.com/v1/3dtiles/root.json?key=${apiKey}`);
const tiles = new TilesRenderer(rootResp.url);
tiles.registerPlugin({ preprocessURL: (u) => patchedUrl(u, apiKey, sessionToken) });
tiles.registerPlugin(new GLTFExtensionsPlugin({ dracoLoader: draco }));
```

## Verification Checklist

- [ ] Root fetch succeeds (no 400/403)
- [ ] Tile requests include key/session params
- [ ] Draco tiles decode without runtime errors
- [ ] Camera moves through streamed tiles smoothly
- [ ] Physics/navigation works without mesh collider crashes

## Critical Gotchas

- Google tiles are frequently Draco-compressed; missing decoder will crash.
- In newer `3d-tiles-renderer`, direct `preprocessURL` assignment may be ignored; use plugin registration.
- Session token must be attached to non-root tile requests.
- Do not use mesh colliders on massive map geometry for Ammo-based navigation.
- Wrap async tile/model operations with lifecycle guards for unmount safety.

## References

- [patterns/physics-colliders.md](patterns/physics-colliders.md)
