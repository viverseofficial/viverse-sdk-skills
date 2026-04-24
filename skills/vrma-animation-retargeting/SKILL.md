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

## Procedural Pose Animation (No VRMA file needed)

For game characters that need specific poses (idle, aim, shoot) without a VRMA clip file, drive bones directly via `vrm.humanoid.getNormalizedBoneNode()`. This is lighter than loading VRMA and works well for tower defense / action games.

### Step 0 — Always log available bones first

VIVERSE avatar bone availability varies by avatar. Log before building poses:

```javascript
const testBones = ['leftUpperArm','rightUpperArm','leftLowerArm','rightLowerArm',
  'leftHand','rightHand','spine','chest','upperChest','neck','head'];
const found   = testBones.filter(b => vrm.humanoid.getNormalizedBoneNode(b));
const missing = testBones.filter(b => !vrm.humanoid.getNormalizedBoneNode(b));
console.log('[Anim] Found:', found.join(', '));
console.log('[Anim] Missing:', missing.join(', '));
// Build poses ONLY from confirmed-found bones
```

> [!CAUTION]
> Only include bones in your pose tables that are confirmed present. Missing bones silently skip (no error), but if you assume a bone exists and build interpolation math around it, you get subtle wrong behavior.

### Step 1 — Define named pose tables

```javascript
// Euler angles [rx, ry, rz] in radians
const POSE_IDLE = {
  leftUpperArm:  [0, 0,  1.0],   // arms lowered from T-pose (A-pose)
  rightUpperArm: [0, 0, -1.0],
  leftLowerArm:  [0, 0,  0.2],
  rightLowerArm: [0, 0, -0.2],
  spine: [0.05, 0, 0],
};

const POSE_AIM = {
  leftUpperArm:  [-1.2, -0.2,  0.2],  // bow arm extends forward
  leftLowerArm:  [-0.3,  0.0,  0.0],
  rightUpperArm: [-1.0,  0.3, -1.4],  // draw arm pulls FAR back
  rightLowerArm: [-1.6,  0.0,  0.0],
  spine: [0.15, 0, 0],
};
```

### Step 2 — Animate with eased lerp in render loop

```javascript
function updateAnim(dt, vrm, phase, t) {
  const ease = t < 0.5 ? 2*t*t : -1+(4-2*t)*t; // ease-in-out
  for (const bone of Object.keys(toPose)) {
    const node = vrm.humanoid.getNormalizedBoneNode(bone);
    if (!node) continue;
    const from = fromPose[bone] || [0,0,0];
    const to   = toPose[bone];
    node.quaternion.setFromEuler(new THREE.Euler(
      from[0] + (to[0]-from[0])*ease,
      from[1] + (to[1]-from[1])*ease,
      from[2] + (to[2]-from[2])*ease, 'XYZ'
    ));
  }
}

// CRITICAL: call vrm.update(dt) AFTER setting bones, not before
vrm.update(dt);
```

### Facing Direction Gotcha (Three.js)

> [!CAUTION]
> **VRM faces -Z by default. Set `rotation.y = 0` when enemies are at negative Z.** Setting `rotation.y = Math.PI` (as many tutorials suggest for "facing the camera") will make the avatar face TOWARD the camera and AWAY from enemies.

```javascript
// If enemies are at z = -30 (negative Z), avatar should face -Z:
vrm.scene.rotation.y = 0;        // ✅ faces enemies
// vrm.scene.rotation.y = Math.PI; // ❌ faces camera (common mistake)
```

### aimAt formula when VRM faces -Z

When VRM default is `rotation.y = 0` (facing -Z), the aim formula must use `atan2(x, -z)` not `atan2(x, z)`:

```javascript
// ❌ Wrong — gives π when enemy is straight ahead at z=-30
model.rotation.y = Math.atan2(dir.x, dir.z);

// ✅ Correct — gives 0 when enemy is straight ahead at z=-30
model.rotation.y = Math.atan2(dir.x, -dir.z);
```

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
