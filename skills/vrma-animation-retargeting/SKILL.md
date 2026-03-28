---
name: vrma-animation-retargeting
description: How to correctly retarget VRMA animations onto VIVERSE avatars in PlayCanvas using per-bone frame correction
prerequisites: [PlayCanvas engine, VIVERSE Avatar SDK, VRMA animation files]
tags: [playcanvas, vrma, animation, retargeting, skeleton, viverse, avatar]
---

# VRMA Animation Retargeting for VIVERSE Avatars

Retarget VRMA to VIVERSE avatars using manual sampling and per-bone frame correction.

## When To Use This Skill

Use when:
- VRMA clips do not animate VIVERSE avatars correctly via default binder
- limbs/axes are wrong despite valid curve bindings
- you need deterministic animation retargeting in PlayCanvas

## Read Order

1. This file
2. `skills/viverse-avatar-sdk/patterns/avatar-animation.md`
3. `skills/viverse-avatar-sdk/patterns/avatar-animation-troubleshooting.md`

## Core Problem

- VIVERSE avatar rig and VRMA reference frames differ per bone.
- Default binder/path mutation approach is insufficient for robust retargeting.
- Raw VRMA rotation keys include local rest transform; must convert to delta first.

## Implementation Workflow

1. Build bone map from avatar render rig (`Avatar_*` target bones).
2. Capture avatar parent-world rest quaternions at bind pose.
3. Parse VRMA hierarchy and compute local rests + parent-world rests.
4. Build manual sampler from raw track curves.
5. Per frame:
   - sample raw local rotation
   - strip VRMA local rest: `delta = inv(vrmaLocalRest) * anim`
   - compute per-bone frame correction:
     - `frameCorrect = inv(avatarParentWorld) * vrmaParentWorld`
   - conjugate delta into avatar frame and apply local rotation
6. Drive sampler in update loop.

## Key Equations

```text
delta = inv(vrmaLocalRest) * animQuat
frameCorrect = inv(avatarParentWorld) * vrmaParentWorld
avatarLocal = frameCorrect * delta * inv(frameCorrect)
```

## Verification Checklist

- [ ] Bone mapping covers expected humanoid curve count
- [ ] Hips motion looks correct at rest and during loop
- [ ] Arms/legs move in expected planes (no mirrored/backward swing)
- [ ] No dependency on runtime `entityPath` mutation
- [ ] Animation loop stable across clip transitions

## Critical Gotchas

- **TypeError: ve.split is not a function**: This occurs when `animBinder` attempts to mutate a path that isn't a string (or is missing). Avoid relying on path mutation for complex VIVERSE avatars.
- **Bone Naming Mismatch**: VRMA files often use standard humanoid names (e.g., `Hips`, `Spine`), while VIVERSE avatars use `Avatar_Hips`, `Avatar_Spine`.
- **Manual Sampler is Key**: Always prefer manual sampling over default binder for deterministic results.

## Robust Alternative: Bone Renaming Strategy

If complex retargeting logic fails or is too slow, use the **Bone Renaming** strategy:

1. Iterate through the VIVERSE avatar's skeleton.
2. For each bone starting with `Avatar_`, create an alias or rename it to the standard humanoid name (e.g., `Avatar_Hips` -> `Hips`).
3. Load the VRMA animation. The PlayCanvas engine will now bind the curves correctly based on the matching names.
4. This avoids the `frameCorrect` math but requires the VRMA to be in the same rest-pose orientation as the avatar.

## References

- `skills/viverse-avatar-sdk/patterns/avatar-animation.md`
- `skills/viverse-avatar-sdk/patterns/avatar-animation-troubleshooting.md`
