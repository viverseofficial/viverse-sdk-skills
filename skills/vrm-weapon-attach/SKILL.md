---
name: vrm-weapon-attach
description: 'Attach weapon/prop GLB models to VRM avatar hand bones in Three.js + @pixiv/three-vrm. Use for: weapon attachment, prop parenting, hand pose/grip animation, bow/sword/staff hold pose, fixing prop floating at forearm or wrist, fixing weapon orientation mismatch, adding emissive glow to weapon models. Covers normalized vs raw bone hierarchy, world-space holder pattern, palm center positioning, and finger curl poses.'
argument-hint: 'VRM avatar, weapon GLB, hand bone, grip pose'
---

# VRM Weapon Attachment (Three.js + @pixiv/three-vrm)

## When to Use
- Attaching a weapon or prop GLB to a VRM avatar's hand
- Prop appears floating, at forearm, or at wrist instead of palm
- Weapon faces wrong direction (90° or 180° off)
- Hand has no grip shape (fingers flat, no curl)
- Want to add glow/emissive enhancement to weapon mesh

---

## Core Architecture: World-Space Holder Pattern

**Never parent a weapon directly to a VRM skeleton bone.** `SkinnedMesh` bones do not propagate `matrixWorld` to Three.js children. Instead:

1. Create a `THREE.Group` (`_weaponHolder`) and add it to the scene root.
2. Each render frame, sync the holder's world position + quaternion from the bone.
3. Add the weapon GLB as a child of the holder (not the bone).

```js
// Setup (once):
this._weaponHolder = new THREE.Group();
this.scene.add(this._weaponHolder);

// Render loop (every frame, AFTER vrm.update() + updateMatrixWorld):
if (this._vrm) {
  this._vrm.update(1/60);
  this._vrm.scene.updateMatrixWorld(true); // MUST follow vrm.update()
}
if (this._weaponBone) {
  (this._weaponPosBone || this._weaponBone).getWorldPosition(this._weaponHolder.position);
  this._weaponBone.getWorldQuaternion(this._weaponHolder.quaternion);
  this._weaponHolder.scale.set(1, 1, 1);
}
```

---

## Bone Selection

### Use Normalized Bones, Not Raw Bones

A VIVERSE/VRM avatar exposes two parallel hierarchies:
- `Avatar_LeftHand` — raw skeleton bone, origin at wrist joint (visual mid-forearm region)
- `Normalized_Avatar_LeftHand` — pose-driven bone, moves with animation

**Always prefer `getNormalizedBoneNode` over `getRawBoneNode`.**  
Raw bones do not reflect animation pose correctly at runtime; normalized bones do.

```js
// CORRECT — tracks actual animated hand position:
const byApi = h?.getNormalizedBoneNode?.('leftHand') || h?.getRawBoneNode?.('leftHand');
```

### Use Two Bones: Position vs Rotation

| Purpose | Bone | Why |
|---|---|---|
| **Position** | `leftMiddleProximal` | Palm center (base of middle metacarpal) |
| **Rotation** | `leftHand` | Wrist orientation drives weapon facing |

```js
this._weaponBone    = vrm.humanoid.getNormalizedBoneNode('leftHand');       // rotation
this._weaponPosBone = vrm.humanoid.getNormalizedBoneNode('leftMiddleProximal') || this._weaponBone; // position
```

### Known VIVERSE VRM Bone Names (confirmed)
```
Raw:        Avatar_LeftHand, Avatar_LeftForeArm, Avatar_LeftForeArmSub
Normalized: Normalized_Avatar_LeftHand, Normalized_Avatar_LeftForeArm
            Normalized_Avatar_LeftHandMiddle1 (leftMiddleProximal)
            Normalized_Avatar_LeftHandIndex1, Normalized_Avatar_LeftHandRing1, etc.
```

---

## Weapon GLB Orientation

The holder's local axes are determined by the **normalized hand bone's rest pose** after VRM normalization. Orientation must be determined empirically per avatar/pose.

### Debugging Orientation (systematic approach)

Test four cardinal rotations on `WEAPON_ADJUST[filename].rot`:

| rot Y | result for left-hand bow (avatar faces +Z) |
|---|---|
| `0` | bow faces self (confirmed) |
| `1.57` | bow faces east (confirmed) |
| `3.14159` | bow faces enemies ✓ (confirmed correct) |
| `-1.57` | bow faces west |

### Bow GLB Specifics (Kenney-style bow.glb)
- Model limbs span ±0.56 on the **Y-axis** — already vertical in model space
- Correct final config after VIVERSE avatar testing:

```js
'bow.glb': { scale: 0.72, pos: [0.00, 0.00, 0.00], rot: [0.0, 3.14159, 0.0] }
```

---

## Hand Pose & Grip Animation

Use `vrm.humanoid.getNormalizedBoneNode(boneName)` and set `quaternion.setFromEuler()`.  
All euler angles are `XYZ` order. Key axes per bone:

| Bone | rx | ry | rz |
|---|---|---|---|
| `leftUpperArm` | — | aim direction (−1.57 = toward enemies) | raise/lower arm |
| `leftLowerArm` | forearm pronation/supination | — | elbow bend |
| `leftHand` | wrist flex/extension | wrist deviation | — |
| `leftIndexProximal` etc. | — | — | finger curl (1.0–1.3 = fist) |
| `leftThumbProximal` | thumb forward | — | thumb splay |

### Bow-Hold Grip Poses (all three animation states)

```js
// Forearm pronation so palm faces bow riser:
leftLowerArm: [0.3, 0.0, 0.4]  // rx=0.3 pronation, rz=0.4 elbow bend

// Wrist flex (fingers curl toward grip):
leftHand: [0.2, 0.0, 0.0]

// Finger curl (loose bow hold):
leftIndexProximal:  [0.0, 0.0, 1.1],
leftMiddleProximal: [0.0, 0.0, 1.2],
leftRingProximal:   [0.0, 0.0, 1.1],
leftLittleProximal: [0.0, 0.0, 1.0],
leftThumbProximal:  [0.3, 0.0, 0.5],
```

---

## Weapon Visual Enhancement

Apply after GLB loads, before adding to scene:

```js
weaponScene.traverse(child => {
  if (!child.isMesh) return;
  const mats = Array.isArray(child.material) ? child.material : [child.material];
  mats.forEach(m => {
    if (!m) return;
    m.envMapIntensity = 1.8;
    // Magical bow — golden glow:
    m.emissive = new THREE.Color(0xffaa00);
    m.emissiveIntensity = 0.9;
    m.roughness = 0.3;
    m.metalness = 0.8;
  });
});

// Add aura light:
const bowLight = new THREE.PointLight(0xffaa00, 1.8, 1.2);
weaponScene.add(bowLight);
```

---

## Common Pitfalls & Fixes

| Symptom | Root Cause | Fix |
|---|---|---|
| Weapon at mid-forearm | Using `getRawBoneNode` | Switch to `getNormalizedBoneNode` |
| Weapon at wrist, not palm | Using hand bone for position | Use `leftMiddleProximal` for position |
| Weapon 90° sideways | Wrong rotation axis | Test all four Y rotations empirically |
| Weapon faces avatar | Holder +X points toward avatar | Use `rot: [0, Math.PI, 0]` to flip |
| Hand flat, no grip | No finger curl in pose | Add `leftIndexProximal` etc. at rz≈1.1 |
| Weapon invisible/culled | Frustum culling on skinned mesh child | Set `frustumCulled = false` on all meshes |
| Weapon lags one frame | `updateMatrixWorld` before `vrm.update` | Always call `vrm.update()` → `updateMatrixWorld(true)` in that order |
| VRM expression warnings | Duplicate expression preset in VRM file | Benign warning from VRM loader, ignore |

---

## Diagnostic Console Logs to Add

```js
// After resolving bones:
console.log('[Weapon] Hand bone:', this._weaponBone?.name ?? 'NOT FOUND');
console.log('[Weapon] Palm bone:', this._weaponPosBone?.name ?? 'NOT FOUND');

// Dump all VRM object names to find bone names:
const names = [];
vrm.scene.traverse(o => { if (o.name) names.push(o.name); });
console.log('[VRM] All objects:', names.join(', '));
```

---

## Avatar Facing Direction (aimArcherAt)

When rotating the avatar to face a target, the formula depends on which axis the VRM faces at rest.

**VIVERSE VRM avatars face -Z at `rotation.y = 0`.**

For `rotation.y = θ`, the model's forward vector is `(-sinθ, 0, -cosθ)`.  
To face direction `dir = (dx, 0, dz)`:  
- sinθ = -dx, cosθ = -dz → `θ = atan2(-dx, -dz)`

```js
// CORRECT:
this.archerGroup.rotation.y = Math.atan2(-dir.x, -dir.z);

// WRONG — mirrors X axis → NW becomes NE, NE becomes NW:
// this.archerGroup.rotation.y = Math.atan2(dir.x, -dir.z);
```

**Sanity checks:**
- Enemy straight ahead at `-Z` → `dir=(0,0,-1)` → `atan2(0, 1) = 0` ✓
- Enemy at NW → `dir=(-1,0,-1)` → `atan2(1, 1) = +π/4` → avatar faces NW ✓

---

## References
- [Three.js SkinnedMesh docs](https://threejs.org/docs/#api/en/objects/SkinnedMesh)
- [@pixiv/three-vrm humanoid API](https://pixiv.github.io/three-vrm/packages/three-vrm/docs/classes/VRMHumanoid.html)
- VRM humanoid bone names: `leftHand`, `leftLowerArm`, `leftUpperArm`, `leftMiddleProximal`, etc. — full list in VRM spec
