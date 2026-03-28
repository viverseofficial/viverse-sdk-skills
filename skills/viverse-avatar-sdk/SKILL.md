---
name: viverse-avatar-sdk
description: Loading and displaying VIVERSE user avatars (GLB/VRM) in 3D scenes
prerequisites: [VIVERSE Auth integration, PlayCanvas or Three.js]
tags: [viverse, avatar, glb, vrm, playcanvas]
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
- `profile.activeAvatar?.avatarUrl` for 3D model
- `profile.activeAvatar?.headIconUrl` for 2D UI

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
- Scale differs across avatars; normalize height post-load.
- Use placeholder fallback to avoid hard failure.
- For VRMA, use normalized bones and manual sampling pattern.

## References

- [viverse-auth](../viverse-auth/SKILL.md)
- [patterns/avatar-animation.md](patterns/avatar-animation.md)
- [patterns/avatar-animation-troubleshooting.md](patterns/avatar-animation-troubleshooting.md)
- [examples/glb-avatar-loader.md](examples/glb-avatar-loader.md)
