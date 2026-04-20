---
name: vrma-animation-retargeting
description: How to correctly retarget external animations (VRMA, Mixamo GLB) onto VIVERSE avatars in PlayCanvas or Three.js
prerequisites: [PlayCanvas or Three.js engine, VIVERSE Avatar SDK, animation clip files]
tags: [playcanvas, threejs, vrma, mixamo, animation, retargeting, skeleton, viverse, avatar]
---

# VRMA Animation Retargeting for VIVERSE Avatars

Retarget VRMA to VIVERSE avatars using manual sampling and per-bone frame correction.

## When To Use This Skill

Use when:
- VRMA / Mixamo GLB clips do not animate VIVERSE avatars correctly via default binder
- Limbs/axes are wrong despite valid curve bindings
- You need to retarget animation clips from a different character onto a VIVERSE VRM avatar
- You need deterministic animation retargeting in PlayCanvas or Three.js

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

> [!CAUTION]
> **NEVER apply Mixamo FBX/GLB animations directly to VRM `Normalized_Avatar_*` bones without rig map math.** VRM 1.0 Normalized bones expect an *identity rest pose* (all rotations are `(0,0,0,1)` at T-pose). Mixamo animations bake rotations relative to Mixamo's unique rest pose. Merely renaming Mixamo tracks to `Normalized_Avatar_*` without applying inverse matrix calculations causes the avatar to instantly deform and collapse into a twisted ball.

> [!CAUTION]
> **NEVER rename skeleton bones at runtime in Three.js.** `SkinnedMesh.skeleton` stores its `bones[]` array by **index reference**, not by name. When you do `bone.name = 'NewName'`, the visual skinning breaks immediately and the avatar becomes invisible. 

- **Vite/SPA Routing Bug**: `.vrma` files are not universally recognized MIME types. If hosted on VIVERSE or local Vite servers, fetching `assets/idle.vrma` may return the SPA wildcard fallback (`index.html`), causing `SyntaxError: Unexpected token '<'` during GLTF parsing. **Fix**: Rename the asset to `.glb` (e.g., `Walk_vrma.glb`) to force `model/gltf-binary` MIME type serving.
- **VRMAnimationLoaderPlugin TypeError**: The `@pixiv/three-vrm-animation` package exports `VRMAnimationLoaderPlugin` as a class. Destructuring `createVRMAnimationLoaderPlugin` (which does not exist) and passing `undefined` to `GLTFLoader.register()` causes a silent failure that later manifests as `TypeError: u is not a function` during parsing.

## Native VRMA Loading (Three.js - Recommended)

The 100% native solution for Three.js VRM avatars is to use `.vrma` animation files loaded via `@pixiv/three-vrm-animation`. This guarantees perfect rest pose alignment without complex retargeting math.

```javascript
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
// ⚠️ Note: createVRMAnimationClip is a standalone function!
import { VRMAnimationLoaderPlugin, createVRMAnimationClip } from '@pixiv/three-vrm-animation';

const animLoader = new GLTFLoader();
// ⚠️ Note: Instantiate with `new`, do not use a non-existent creator function.
animLoader.register((parser) => new VRMAnimationLoaderPlugin(parser));

// Load as .glb to bypass SPA routing issues with unknown extensions
animLoader.load('assets/Walk_vrma.glb', (animGltf) => {
    const vrmAnimations = animGltf.userData.vrmAnimations;
    if (vrmAnimations && vrmAnimations.length > 0) {
        const vrmAnimation = vrmAnimations[0];
        
        // Generates an AnimationClip specifically tailored for this VRM's normalized bones
        const clip = createVRMAnimationClip(vrmAnimation, vrm);
        
        // Set up the mixer on the VRM scene
        const mixer = new THREE.AnimationMixer(vrm.scene);
        const action = mixer.clipAction(clip);
        action.play();
        
        // Save references to mixer in your render loop:
        // this.mixer.update(deltaTime);
        // this.vrm.update(deltaTime); // Required to propagate normalized bones!
    }
});
```

## Legacy Mixamo Track Remapping

If you absolutely must use Mixamo GLB animations and cannot convert them to `.vrma`, do not map them directly to `Normalized_Avatar_*` bones unless you use a full Mixamo VRM Rig Map (such as `mixamoVRMRigMap.js` from the V-Sekai sandbox).

If mapping to raw `Avatar_*` bones (non-identity rest), strip `position` tracks to prevent scale/translation teleportation:

```javascript
// Example of stripping position tracks to prevent Mixamo from shooting the avatar into the sky
if (prop === 'position') return; // Inside your track copying loop
```

## References

- `skills/viverse-avatar-sdk/SKILL.md`
- `skills/viverse-avatar-sdk/patterns/avatar-animation.md`
- `skills/viverse-avatar-sdk/patterns/avatar-animation-troubleshooting.md`
