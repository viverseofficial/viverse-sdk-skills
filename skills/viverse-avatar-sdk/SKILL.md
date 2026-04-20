---
name: viverse-avatar-sdk
description: Loading and displaying VIVERSE user avatars (GLB/VRM) in 3D scenes
prerequisites: [VIVERSE Auth integration, PlayCanvas or Three.js]
tags: [viverse, avatar, glb, vrm, playcanvas, threejs]
---

# VIVERSE Avatar SDK

Load authenticated user avatars (GLB/VRM) into 3D scenes with robust fallback behavior.

## When To Use This Skill

Use this when a project needs:
- Display the user's personalized VIVERSE avatar
- Load a GLB/VRM model into PlayCanvas or Three.js
- Replace a placeholder sphere with the real avatar model

## Read Order

1. This file
2. [patterns/avatar-animation.md](patterns/avatar-animation.md) if VRMA animation is needed
3. [examples/glb-avatar-loader.md](examples/glb-avatar-loader.md)

## Preflight

- [ ] Auth completed and `access_token` available
- [ ] SDK available via `window.viverse || window.VIVERSE_SDK`
- [ ] Scene runtime can load GLB container assets
- [ ] Placeholder avatar path exists for failure cases

## Get Profile + Avatar URL

After `checkAuth()` returns an `access_token`, use the **Avatar SDK** to fetch profile data:

```javascript
const vSdk = window.viverse || window.VIVERSE_SDK;
const avatarClient = new vSdk.avatar({
    baseURL: 'https://sdk-api.viverse.com/',
    accessToken: accessToken  // from checkAuth().access_token
});

const profile = await avatarClient.getProfile();
```

> [!CAUTION]
> `checkAuth()` does **NOT** return avatar URLs or display name. You must use the Avatar SDK `getProfile()` method.

Use:
- `profile.activeAvatar?.avatarUrl` for 3D model (.glb)
- `profile.activeAvatar?.vrmUrl` for 3D model (.vrm) — **check this FIRST**; VRM-backed avatars do NOT populate `avatarUrl`
- `profile.activeAvatar?.headIconUrl` for 2D UI

> [!CAUTION]
> **Always check `vrmUrl` before `avatarUrl`.** The VIVERSE default avatar uses VRM format and will return `activeAvatar.vrmUrl` while leaving `avatarUrl` null. Checking only `avatarUrl` gives a false null and loads the fallback instead of the real avatar.

```javascript
// Correct extraction order:
const avatarUrl = profile.activeAvatar?.vrmUrl
               || profile.activeAvatar?.avatarUrl
               || null;
```

## PlayCanvas Load Pattern (Core)

```javascript
const asset = new pc.Asset("avatar-asset", "container", {
  url: avatarUrl,
  filename: "avatar.glb", // force GLB/container handler
});

asset.on("load", () => {
  const entity = asset.resource.instantiateRenderEntity();
  app.root.addChild(entity);
  // Normalize scale to target height if needed.
});

asset.on("error", () => {
  // Fallback to placeholder avatar
});
```

## Three.js Load Pattern (Core)

```javascript
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const loader = new GLTFLoader();
loader.load(avatarUrl, (gltf) => {
    const model = gltf.scene;

    // VRM models face -Z by default; rotate 180° to face +Z (away from camera)
    model.rotation.y = Math.PI;

    // CRITICAL: Force visibility on entire scene graph.
    // VRM root nodes are sometimes loaded with visible=false.
    model.traverse((child) => {
        child.visible = true;
        if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
            // Disable frustum culling — retargeting can shift bounds outside camera view
            child.frustumCulled = false;
        }
    });

    scene.add(model);
}, undefined, (err) => {
    console.error('Avatar load failed, using fallback', err);
    // Use placeholder
});
```

## Dynamic Model Swap Pattern (Three.js)

When replacing a default character model with an authenticated avatar at runtime:

```javascript
// ✅ DO: Cache animation clips BEFORE removing the default model
if (currentModel) {
    cachedAnimations = currentClips; // preserve clips!
    scene.remove(currentModel);     // remove mesh only
    mixer = null;
    // DO NOT clear cachedAnimations
}

// ❌ DON'T: Clear animations on model swap
// cachedAnimations = null; // This will kill retargeting!
```

The reason: animation clips are bundled inside the default model's GLB. Once the model is removed from the scene, the only copy of those clips is in the `cachedAnimations` reference.

## Fallback Strategy

If avatar URL load fails, always render a placeholder avatar so gameplay continues.

## Verification Checklist

- [ ] Auth token is present before avatar fetch
- [ ] Profile returns display info and/or avatar URL
- [ ] Avatar loads successfully in target scene runtime
- [ ] Placeholder appears on URL/decode failure
- [ ] No hard crash when avatar asset fails

## Animation Note (VRMA)

For VIVERSE VRMA retargeting:
- Target `Normalized_Avatar_*` bones.
- Prefer manual sampling workflow from [patterns/avatar-animation.md](patterns/avatar-animation.md).

## Gotchas

- Avatar SDK requires auth token; `checkAuth()` alone has no avatar URL.
- VIVERSE avatars may be VRM-backed GLB; force container handler where needed.
- **`vrmUrl` takes priority over `avatarUrl`** — VRM profiles do not populate `avatarUrl`.
- Scale differs across avatars; normalize height post-load.
- **Direction:** VRM models face `-Z` by default. Rotate `Math.PI` on Y-axis for environments where models should face `+Z` (away from camera).
- **Invisible avatar:** VRM `gltf.scene` can load with root nodes set to `visible=false`. Always traverse and force `child.visible = true` after loading.
- **Frustum culling:** After skeleton retargeting or bone manipulation, Three.js may compute incorrect bounds and cull the mesh. Set `child.frustumCulled = false` on all SkinnedMesh nodes.
- **Do NOT rename skeleton bones** — `SkinnedMesh.skeleton` stores bone references by index. Renaming `bone.name` after load corrupts the skin matrix lookup and makes the avatar invisible. Instead, remap animation clip track names (clone tracks, rewrite `.name` field) — see `vrma-animation-retargeting` skill.
- **Two bone hierarchies:** VRM has `Avatar_*` (original rig, mesh-bound) and `Normalized_Avatar_*` (identity rest pose). Always target `Normalized_Avatar_*` for animation tracks. See `avatar-animation-troubleshooting.md`.
- Use placeholder fallback to avoid hard failure.
- For VRMA, use normalized bones and manual sampling pattern.

## References

- [viverse-auth](../viverse-auth/SKILL.md)
- [patterns/avatar-animation.md](patterns/avatar-animation.md)
- [patterns/avatar-animation-troubleshooting.md](patterns/avatar-animation-troubleshooting.md)
- [examples/glb-avatar-loader.md](examples/glb-avatar-loader.md)
