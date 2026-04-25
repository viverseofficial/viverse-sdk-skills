---
name: vrma-animation-retargeting
description: How to correctly retarget external animations (VRMA, Mixamo GLB) onto VIVERSE avatars in PlayCanvas or Three.js, and how to drive procedural bone poses directly for game characters.
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
- You want procedural bone poses (idle, aim, shoot) without a VRMA file

## Read Order

1. This file
2. `skills/viverse-avatar-sdk/patterns/avatar-animation.md`
3. `skills/viverse-avatar-sdk/patterns/avatar-animation-troubleshooting.md`

---

## VRM Loading Checklist (Three.js)

Before touching any animation, get the loading right:

```javascript
import { GLTFLoader }              from 'three/examples/jsm/loaders/GLTFLoader.js';
import { VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';

const loader = new GLTFLoader();
loader.register(parser => new VRMLoaderPlugin(parser));

loader.load(avatarUrl, gltf => {
  const vrm = gltf.userData.vrm;  // ← always check this exists

  // ❌ DO NOT call these — causes skinned mesh corruption on VIVERSE avatars:
  // VRMUtils.removeUnnecessaryVertices(gltf.scene);
  // VRMUtils.removeUnnecessaryJoints(gltf.scene);

  // ✅ Convert MToon → MeshStandardMaterial so Three.js lighting works
  vrm.scene.traverse(child => {
    child.visible = true;
    child.layers.set(0);           // force default layer (VRM first-person system hides meshes)
    if (child.isMesh) {
      child.castShadow    = true;
      child.frustumCulled = false; // bones shift computed bounds
      const convertMat = m => {
        const std = new THREE.MeshStandardMaterial();
        if (m.map)         std.map         = m.map;
        if (m.normalMap)   std.normalMap   = m.normalMap;
        if (m.color)       std.color.copy(m.color);
        if (m.emissive)    std.emissive.copy(m.emissive);
        if (m.emissiveMap) std.emissiveMap = m.emissiveMap;
        std.transparent = m.transparent ?? false;
        std.opacity     = m.opacity     ?? 1.0;
        std.side        = THREE.DoubleSide;
        std.roughness   = 0.7;
        std.metalness   = 0.0;
        return std;
      };
      child.material = Array.isArray(child.material)
        ? child.material.map(convertMat) : convertMat(child.material);
    }
  });

  // ✅ Facing direction: VRM faces -Z by default
  vrm.scene.rotation.y = 0;   // faces -Z (toward enemies in a tower defense game)
  // vrm.scene.rotation.y = Math.PI;  // faces +Z (toward camera — use in DashRunner-style games)

  // ✅ Foot alignment via getRawBoneNode (more accurate than bounding box)
  const leftFoot  = vrm.humanoid.getRawBoneNode('leftFoot');
  const rightFoot = vrm.humanoid.getRawBoneNode('rightFoot');
  let footWorldY  = null;
  for (const foot of [leftFoot, rightFoot]) {
    if (!foot) continue;
    foot.updateWorldMatrix(true, false);
    const wp = new THREE.Vector3().setFromMatrixPosition(foot.matrixWorld);
    if (footWorldY === null || wp.y < footWorldY) footWorldY = wp.y;
  }
  const box    = new THREE.Box3().setFromObject(vrm.scene);
  const scale  = TARGET_HEIGHT / Math.max(box.max.y - box.min.y, 0.1);
  vrm.scene.scale.setScalar(scale);
  vrm.scene.position.y = footWorldY !== null
    ? PLATFORM_Y - footWorldY * scale
    : PLATFORM_Y - new THREE.Box3().setFromObject(vrm.scene).min.y;

  // ✅ Call vrm.update(dt) every render frame (spring bones, expressions)
  // this._vrm = vrm;  → then in render loop: this._vrm.update(dt)
});
```

---

## Procedural Pose Animation (No VRMA file needed)

For game characters needing specific poses (idle, aim, shoot) without a VRMA clip.
Lighter than loading VRMA, works well for action/tower defense games.

### Step 0 — Always log available bones first

Bone availability varies by avatar. Build poses only from confirmed bones:

```javascript
const testBones = ['leftUpperArm','rightUpperArm','leftLowerArm','rightLowerArm',
  'leftHand','rightHand','spine','chest','upperChest','neck','head'];
const found   = testBones.filter(b => vrm.humanoid.getNormalizedBoneNode(b));
const missing = testBones.filter(b => !vrm.humanoid.getNormalizedBoneNode(b));
console.log('[Anim] Found:', found.join(', '));
console.log('[Anim] Missing:', missing.join(', '));
```

> [!CAUTION]
> Missing bones silently skip — no error. Build pose tables only from confirmed-found bones.

### Step 1 — Understand VRM normalized bone axes

**Verified by screenshot testing on a real VIVERSE avatar (rotation.y = 0, facing -Z):**

#### Upper arm axes

| Bone | rx | ry | rz |
|---|---|---|---|
| `leftUpperArm` | twist | **ry- = FORWARD** (-Z) / ry+ = backward | **rz- = RAISES** / rz+ = lowers |
| `rightUpperArm` | twist | **ry+ = BACKWARD** (+Z) / ry- = forward | **rz+ = RAISES** / rz- = lowers |

> [!CAUTION]
> **ry sign is OPPOSITE between left and right arms.** ry+ on leftUpperArm goes BACKWARD (toward camera), not forward. This is the single most common axis mistake.

> [!CAUTION]
> **rz sign is also OPPOSITE between left and right.** rz+ raises the right arm, but rz+ LOWERS the left arm.

> [!CAUTION]
> **ry delta must be ≥ 1.2 radians to be visually distinct.** When rz (vertical) and ry (horizontal) change simultaneously, the vertical component dominates. A ry delta of 0.6 rad is invisible next to a simultaneous rz change of 0.8 rad.

> [!CAUTION]
> **Bow arm ry must be identical across all poses.** Any ry delta on the bow arm creates visible forward/back oscillation during animation. Only rz and lowerArm should differ between poses for the bow arm.

#### Lower arm and hand axes

| Bone | rx | rz |
|---|---|---|
| `leftLowerArm` | forearm twist (NOT elbow bend) | **rz+ = elbow bends** |
| `rightLowerArm` | forearm twist (NOT elbow bend) | **rz- OR rz+ = elbow bends** (test both) |
| `hand` | **wrist flex/extension** | wrist deviation |

> [!CAUTION]
> **lowerArm rx is NOT elbow bend.** It only pronates/supinates the forearm. The elbow bend axis is rz.

#### Summary table (rotation.y = 0, character faces -Z)

```
leftUpperArm:   ry- = forward,  ry+ = back,    rz- = UP,  rz+ = DOWN
rightUpperArm:  ry+ = back,     ry- = forward, rz+ = UP,  rz- = DOWN
leftLowerArm:   rz+ = elbow bend,  rx = forearm twist
rightLowerArm:  rz±= elbow bend (test direction), rx = forearm twist
hand:           rx = wrist flex,   ry = wrist deviation

⚠️ If rotation.y = Math.PI (character faces +Z), ALL ry signs flip.
```

### Step 2 — Define named pose tables

Working bow-archer pose example (verified on VIVERSE avatar, rotation.y = 0):

```javascript
// Euler [rx, ry, rz] in radians — character faces -Z (enemies)

const POSE_IDLE = {
  // Shooting-ready stance: bow arm pointed at enemies, draw arm at half-draw
  leftUpperArm:  [ 0.0, -1.57, -0.3],  // bow arm: 90° forward (ry- FIXED), slight raise
  leftLowerArm:  [ 0.0,  0.0,   0.4],  // elbow bent (rz+)
  leftHand:      [ 0.0,  0.0,   0.0],
  rightUpperArm: [ 0.0,  0.2,   0.8],  // draw arm: slight back, raised
  rightLowerArm: [ 0.0,  0.0,  -0.6],  // elbow bent (rz-)
  rightHand:     [ 0.3,  0.0,   0.0],  // wrist flex (rx)
  spine:         [ 0.10, 0.0,   0.0],
  chest:         [ 0.06, 0.0,   0.0],
  upperChest:    [ 0.04, 0.0,   0.0],
  neck:          [-0.05, 0.0,   0.0],
  head:          [-0.04, 0.0,   0.0],
};

const POSE_AIM = {
  // Full draw: bow arm stays locked forward, draw arm pulls back to ear
  leftUpperArm:  [ 0.0, -1.57, -0.5],  // bow arm: SAME ry as idle (no push/pull)
  leftLowerArm:  [ 0.0,  0.0,   0.6],
  leftHand:      [ 0.0,  0.0,   0.0],
  rightUpperArm: [ 0.0,  1.5,   1.4],  // draw arm: BACK (ry+ delta=1.3) + raised
  rightLowerArm: [ 0.0,  0.0,   1.6],  // elbow bends toward face (test rz+ vs rz-)
  rightHand:     [ 0.5,  0.0,   0.0],  // wrist flexed, gripping string
  spine:         [ 0.20, 0.0,   0.0],
  chest:         [ 0.14, 0.0,   0.0],
  upperChest:    [ 0.09, 0.0,   0.0],
  neck:          [-0.14, 0.0,   0.0],
  head:          [-0.12, 0.0,   0.0],
};

const POSE_RELEASE = {
  // Follow-through: bow arm stays, draw arm snaps forward
  leftUpperArm:  [ 0.0, -1.57, -0.6],  // same ry, bounces up (rz more negative)
  leftLowerArm:  [ 0.0,  0.0,   0.3],
  leftHand:      [ 0.0,  0.0,   0.0],
  rightUpperArm: [ 0.0,  0.2,   0.5],  // draw arm drops: ry 1.5→0.2 = snaps forward
  rightLowerArm: [ 0.0,  0.0,  -0.4],
  rightHand:     [ 0.2,  0.0,   0.0],
  spine:         [ 0.12, 0.0,   0.0],
  chest:         [ 0.08, 0.0,   0.0],
  upperChest:    [ 0.05, 0.0,   0.0],
  neck:          [-0.07, 0.0,   0.0],
  head:          [-0.05, 0.0,   0.0],
};
```

### Step 3 — Drive bones in render loop

```javascript
// Must call EVERY frame — even in idle — or VRM reverts to T-pose
function updateAnim(dt, vrm, shootPhase, shootT) {
  const DRAW_DUR    = 0.18;
  const RELEASE_DUR = 0.07;
  const RECOVER_DUR = 0.40;

  let fromPose, toPose, t, done = false;

  if (shootPhase === 0) {
    t = Math.min(shootT / DRAW_DUR, 1);
    fromPose = POSE_IDLE; toPose = POSE_AIM;
    if (t >= 1) { shootPhase = 1; shootT = 0; }
  } else if (shootPhase === 1) {
    t = Math.min(shootT / RELEASE_DUR, 1);
    fromPose = POSE_AIM; toPose = POSE_RELEASE;
    if (t >= 1) { shootPhase = 2; shootT = 0; }
  } else if (shootPhase === 2) {
    t = Math.min(shootT / RECOVER_DUR, 1);
    fromPose = POSE_RELEASE; toPose = POSE_IDLE;
    if (t >= 1) done = true;
  } else {
    // ← CRITICAL: always drive POSE_IDLE in idle state
    // If you skip this, VRM reverts to T-pose between shots
    fromPose = POSE_IDLE; toPose = POSE_IDLE; t = 1;
  }

  const ease = t < 0.5 ? 2*t*t : -1+(4-2*t)*t;
  const h    = vrm.humanoid;

  for (const bone of Object.keys(toPose)) {
    const node = h.getNormalizedBoneNode(bone);
    if (!node) continue;
    const from = fromPose[bone] || [0,0,0];
    const to   = toPose[bone];
    node.quaternion.setFromEuler(new THREE.Euler(
      from[0] + (to[0]-from[0])*ease,
      from[1] + (to[1]-from[1])*ease,
      from[2] + (to[2]-from[2])*ease, 'XYZ'
    ));
  }

  // CRITICAL: call AFTER setting bones, not before
  vrm.update(dt);
  if (done) shootPhase = undefined;
}
```

> [!CAUTION]
> **Always drive bones every frame in idle state.** If `_updateShootAnim` returns early when `shootPhase === undefined`, the VRM reverts to T-pose. Add an else branch that applies POSE_IDLE at t=1.

> [!CAUTION]
> **Do not call `_updateShootAnim` from inside `renderer.render()`.** Call it from the game loop with real `dt` so a pause flag can skip it independently of the render.

### Facing direction and aimAt formula

```javascript
// VRM faces -Z by default (toward enemies in tower defense)
vrm.scene.rotation.y = 0;

// aimAt: must use atan2(x, -z) not atan2(x, z) when rotation.y = 0
// atan2(x, z) gives π when enemy is at z=-30 → avatar faces camera
// atan2(x, -z) gives 0 when enemy is at z=-30 → avatar faces enemy ✓
model.rotation.y = Math.atan2(dir.x, -dir.z);
```

---

## DashRunner Cross-Reference (avatar loading patterns)

From the DashRunner source, confirmed patterns for VIVERSE VRM:

```javascript
// ✅ Convert MToon → MeshStandardMaterial (required for Three.js lighting)
// ✅ child.layers.set(0) — prevents VRM first-person system hiding meshes
// ✅ child.frustumCulled = false — bones shift computed bounds
// ✅ Use getRawBoneNode('leftFoot') for foot Y alignment, not bounding box
// ❌ Do NOT call VRMUtils.removeUnnecessaryVertices — corrupts VIVERSE avatars
// ❌ Do NOT call getProfile() again if using ViverseAuthController
//    (enrichProfile already fetched it — read from state.profile.raw.activeAvatar)
```

DashRunner uses `rotation.y = Math.PI` (character faces +Z, camera behind at -Z).
Bastion Archer uses `rotation.y = 0` (character faces -Z, enemies at -Z).
**If you change rotation.y by Math.PI, all ry signs flip.**

---

## Core Problem (VRMA retargeting)

- VIVERSE avatar rig and VRMA reference frames differ per bone.
- Default binder/path mutation approach is insufficient for robust retargeting.
- Raw VRMA rotation keys include local rest transform; must convert to delta first.

## Implementation Workflow (VRMA retargeting)

1. Build bone map from avatar render rig (`Avatar_*` target bones).
2. Capture avatar parent-world rest quaternions at bind pose.
3. Parse VRMA hierarchy and compute local rests + parent-world rests.
4. Build manual sampler from raw track curves.
5. Per frame:
   - sample raw local rotation
   - strip VRMA local rest: `delta = inv(vrmaLocalRest) * anim`
   - compute per-bone frame correction: `frameCorrect = inv(avatarParentWorld) * vrmaParentWorld`
   - conjugate delta into avatar frame and apply local rotation
6. Drive sampler in update loop.

## Key Equations

```text
delta = inv(vrmaLocalRest) * animQuat
frameCorrect = inv(avatarParentWorld) * vrmaParentWorld
avatarLocal = frameCorrect * delta * inv(frameCorrect)
```

## Critical Gotchas

> [!CAUTION]
> **NEVER apply Mixamo FBX/GLB animations directly to VRM `Normalized_Avatar_*` bones without rig map math.** VRM 1.0 Normalized bones expect an *identity rest pose*. Mixamo animations bake rotations relative to Mixamo's unique rest pose — renaming tracks without inverse matrix calculations causes instant deformation.

> [!CAUTION]
> **NEVER rename skeleton bones at runtime in Three.js.** `SkinnedMesh.skeleton` stores bones by index reference, not name. Renaming breaks skinning immediately.

- **Vite/SPA Routing Bug**: `.vrma` files may return the SPA wildcard fallback. Rename to `.glb` to force correct MIME type.
- **VRMAnimationLoaderPlugin TypeError**: Import `VRMAnimationLoaderPlugin` as a class and instantiate with `new`. `createVRMAnimationLoaderPlugin` does not exist.

## Native VRMA Loading (Three.js — Recommended)

```javascript
import { VRMAnimationLoaderPlugin, createVRMAnimationClip } from '@pixiv/three-vrm-animation';

const animLoader = new GLTFLoader();
animLoader.register(parser => new VRMAnimationLoaderPlugin(parser));

animLoader.load('assets/Walk_vrma.glb', animGltf => {
  const vrmAnimation = animGltf.userData.vrmAnimations?.[0];
  if (!vrmAnimation) return;
  const clip   = createVRMAnimationClip(vrmAnimation, vrm);
  const mixer  = new THREE.AnimationMixer(vrm.scene);
  const action = mixer.clipAction(clip);
  action.play();
  // In render loop: mixer.update(dt); vrm.update(dt);
});
```

## Verification Checklist

- [ ] Bones logged — only confirmed-present bones used in pose tables
- [ ] POSE_IDLE driven every frame (not just on shoot trigger)
- [ ] `_updateShootAnim` called from game loop, not from `renderer.render()`
- [ ] MToon materials converted to MeshStandardMaterial
- [ ] `child.layers.set(0)` applied to all mesh children
- [ ] `vrm.update(dt)` called AFTER bone rotations, every frame
- [ ] Bow arm ry is identical across all poses (no push/pull oscillation)
- [ ] ry delta on draw arm is ≥ 1.2 rad for visible horizontal motion
- [ ] Foot alignment uses `getRawBoneNode` not bounding box

## References

- `skills/viverse-avatar-sdk/SKILL.md`
- `skills/viverse-avatar-sdk/patterns/avatar-animation.md`
- `skills/viverse-avatar-sdk/patterns/avatar-animation-troubleshooting.md`
