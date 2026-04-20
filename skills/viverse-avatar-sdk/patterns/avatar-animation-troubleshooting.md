# Avatar Animation Troubleshooting Guide

## Common Issue: Avatar Stuck in T-Pose

If your avatar loads but remains in T-pose without playing any animation, follow this debugging checklist.

### Diagnostic Checklist

#### 1. Are animation files loading?
```javascript
idleAsset.ready(() => {
    console.log('[AnimDebug] Idle loaded, animations:', asset.resource?.animations?.length);
});
```
**If 0 or undefined:** The file failed to load or is not a valid GLB/VRMA container.

#### 2. Does the track have curves and internal data?
```javascript
const track = asset.resource.animations[0]?.resource;
console.log('[AnimDebug] curves:', track?.curves?.length);
console.log('[AnimDebug] _inputs:', track?._inputs?.length, '_outputs:', track?._outputs?.length);
```
**If curves exist but `_inputs`/`_outputs` are missing:** The animation was compiled differently — internal API may have changed.

#### 3. What are the animation curve targets?
```javascript
track.curves.slice(0, 5).forEach((c, i) => {
    const p = c.paths?.[0];
    console.log(`[AnimDebug] curve[${i}]:`, {
        entityPath: p?.entityPath,
        property: p?.propertyPath?.[0],
        input: c.input, output: c.output
    });
});
```
**Expected for VRMA:** `entityPath: ["Untitled", "Avatar_Root", "hips"]`, property: `"localRotation"`

#### 4. What are ALL avatar node names?
```javascript
const avatarNodes = [];
const traverse = (node) => { avatarNodes.push(node); node.children.forEach(traverse); };
traverse(avatarEntity);
console.log('[AnimDebug] ALL nodes:', avatarNodes.filter(n => n.name).map(n => n.name).join(', '));
```
**Expected VIVERSE avatar:** Two hierarchies — `Avatar_Hips, Avatar_Spine...` AND `Normalized_Avatar_Hips, Normalized_Avatar_Spine...`

#### 5. Are bones being matched?
Log the bone mapping results:
```javascript
console.log(`[AnimDebug] Humanoid bones matched: ${avatarNodesByHumanoid.size}`);
for (const [bone, node] of avatarNodesByHumanoid) {
    console.log(`[AnimDebug]   ${bone} -> ${node.name}`);
}
```

#### 6. Are bone transforms actually changing?
```javascript
const hips = avatarNodesByHumanoid.get('hips');
const initRot = hips.getLocalRotation().clone();
app.on('update', () => {
    const r = hips.getLocalRotation();
    const changed = Math.abs(r.x - initRot.x) > 0.0001;
    console.log(`Hips rot: ${r.x.toFixed(4)},${r.y.toFixed(4)},${r.z.toFixed(4)},${r.w.toFixed(4)} changed=${changed}`);
});
```
**If `changed=false` every frame:** Animation data isn't reaching the bones — see root causes below.

### Root Causes & Fixes

| Symptom | Root Cause | Fix |
|---|---|---|
| T-pose, 0/55 curves matched | Bone names use `Normalized_Avatar_*` or `Avatar_*` prefix; normalization doesn't handle them | Add prefix stripping: `.replace(/^Normalized_Avatar_/i, '').replace(/^Avatar_/i, '')` |
| T-pose, 55/55 matched, `changed=false` | Using AnimComponent `assignAnimation()` — AnimBinder ignores modified entityPaths | **Switch to manual animation sampling** (see avatar-animation.md) |
| T-pose, `_parser` is undefined | Trying to read glTF JSON which PlayCanvas discards | Use bone name normalization, not glTF extension parsing |
| Animation plays but **upside-down** | Targeting `Avatar_*` bones (non-identity rest) instead of `Normalized_Avatar_*` (identity rest) | **Prefer Normalized_Avatar_* bones** — VRMA data assumes VRM 1.0 identity rest pose |
| `chest`/`upperChest` unmatched | Avatar uses `Spine1`/`Spine2` instead | Add aliases: `'spine1': 'chest', 'spine2': 'upperchest'` |
| Finger bones unmatched | Avatar uses `HandThumb1/2/3` not `ThumbMetacarpal/Proximal/Distal` | Add numbered finger aliases (see BONE_ALIASES in avatar-animation.md) |
| `leftEye`/`rightEye` unmatched | Avatar uses `EyeL`/`EyeR` | Add aliases: `'eyel': 'lefteye', 'eyer': 'righteye'` |
| `setFloat('speed')` throws error | State graph not compiled on first frame | Wrap in `try/catch` |
| **Three.js: Avatar invisible after bone rename** | `SkinnedMesh.skeleton` uses bone index references; renaming bones corrupts skin matrix lookup | **Never rename bones in Three.js** — clone clip tracks and rewrite `.name` field instead |
| **Three.js: Avatar invisible despite loading** | VRM scene root nodes loaded with `visible=false` | Traverse entire scene after load and force `child.visible = true` |
| **Three.js: Avatar disappears mid-game** | Frustum culling discards mesh after skeleton manipulation shifts bounding box | Set `child.frustumCulled = false` on all `isMesh` nodes after load |
| **Three.js: Only hair/accessories visible, body underground** | Targeting `Normalized_Avatar_*` bones in vanilla Three.js — VRM constraint system (Normalized→Avatar) only runs inside `@pixiv/three-vrm` loader. Without it, `Normalized_Avatar_*` bones move but do NOT deform the SkinnedMesh body | In vanilla Three.js, **target `Avatar_*` bones** for animation tracks. Only use `Normalized_Avatar_*` when using the `@pixiv/three-vrm` package. |
| **Three.js `three-vrm-animation`: SyntaxError Unexpected token `<`** | Loading a `.vrma` file on Vite/SPA servers without proper MIME types falls back to `index.html` | Rename the asset to `.glb` (e.g., `Walk_vrma.glb`) to force the server to load it as binary data. |
| **Three.js `three-vrm-animation`: TypeError `u is not a function`** | Destructuring a generic `createVRM...` function for the animation plugin but passing `undefined` | The plugin is a class. Import `VRMAnimationLoaderPlugin` and instantiate with `new VRMAnimationLoaderPlugin(parser)` inside `.register()`. |

> [!CAUTION]
> **Normalized_Avatar_* vs Avatar_* hierarchy guidance is loader-dependent:**
> - **With `@pixiv/three-vrm`**: Target `Normalized_Avatar_*` bones — the VRM constraint system propagates motion to `Avatar_*` which drives the skin.
> - **With vanilla GLTFLoader (no VRM loader)**: Target `Avatar_*` bones directly — the constraint system is NOT active, so `Normalized_Avatar_*` bones are orphaned (only child meshes like hair move). The SkinnedMesh is bound to `Avatar_*` and they must be driven directly.


### Three.js: Invisible Avatar Checklist

If an avatar loads (no errors logged) but is not visible in Three.js:

1. **Check `visible` flag** — VRM roots can load hidden:
   ```javascript
   model.traverse(child => { child.visible = true; });
   ```

2. **Disable frustum culling** — retargeting shifts bounds:
   ```javascript
   model.traverse(child => {
       if (child.isMesh) child.frustumCulled = false;
   });
   ```

3. **Check if mesh was added to scene** — log `scene.children.length` before and after `scene.add(model)`.

4. **Check scale** — VRM avatars sometimes have `scale = 0` from an upstream parent node:
   ```javascript
   model.traverse(child => console.log(child.name, child.scale));
   ```

5. **Check bone renaming** — if you renamed any bones, the SkinnedMesh will silently break. Revert bone names, use track remapping instead (see `vrma-animation-retargeting` skill).



### Critical Lessons Learned

> [!CAUTION]
> **PlayCanvas AnimComponent silently fails on remapped paths.** Even when: (1) `anim.playing = true`, (2) `baseLayer.activeState = "Idle"`, (3) `anim.enabled = true` — the animation can still have zero effect on bones. The AnimBinder resolves paths at construction time using a pre-compiled node cache and ignores runtime modifications to `curve.paths[0].entityPath`. **The only reliable approach is manual animation sampling.**

> [!CAUTION]
> **MUST target Normalized_Avatar_* bones, NOT Avatar_* bones.** VRMA animations are VRM 1.0 format with identity rest pose. Targeting original Avatar_* bones (which have non-identity rest orientations) causes the avatar to render upside-down or deformed.

> [!WARNING]
> **The avatar has TWO separate bone hierarchies.** `Avatar_Hips` → original rig (mesh-bound), `Normalized_Avatar_Hips` → VRM 1.0 normalized rig (identity rest). These are NOT the same nodes — they exist as siblings under different parent nodes (`Armature_0` vs `VRMHumanoidRig`).

> [!IMPORTANT]
> **PlayCanvas discards glTF JSON post-parse.** `asset.resource._parser` is `undefined`. You cannot read `VRMC_vrm_animation` or any glTF extension data.

> [!TIP]
> **Animation curves for blend shapes (expressions)** target nodes like `"relaxed"`, `"blink"`. These won't match skeleton bones — it's normal for these to remain unmatched in the bone mapping.

### Debugging Timeline (Real-World Example)

This is the actual path we took debugging a VIVERSE avatar T-pose:

1. **0/55 matched** → Bone names were `Normalized_Avatar_*`, code only handled `J_Bip_*`
   - Fix: Add `Normalized_Avatar_` prefix stripping
2. **23/55 matched** → Missing aliases for `chest`→`Spine1`, fingers `Thumb1`→`ThumbMetacarpal`
   - Fix: Comprehensive BONE_ALIASES table
3. **55/55 matched, still T-pose** → AnimComponent's AnimBinder ignores modified entityPaths
   - Fix: Switch to manual animation sampling (extract `_inputs`/`_outputs`, apply per frame)
4. **Animation plays but upside-down** → Applied VRM 1.0 data to Avatar_* bones (wrong rest pose)
   - Fix: Prefer `Normalized_Avatar_*` bones (identity rest, designed for VRMA)
5. **Animation works correctly** ✓
