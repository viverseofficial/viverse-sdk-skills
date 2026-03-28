# PlayCanvas: Avatar Animation with VRMA/GLB (VRM Humanoid Rigs)

## Problem

VIVERSE user avatars (VRM/GLB) appear in a **T-pose** after loading. Applying standard humanoid animations (VRMA or GLB) requires:
1. Understanding the avatar's **dual bone hierarchy**
2. Targeting the correct bones (**Normalized**, not Original)
3. Using **manual animation sampling** instead of PlayCanvas AnimComponent

## Architecture: Dual Bone Hierarchy

VIVERSE avatars have **TWO** bone hierarchies in the same model:

| Hierarchy | Example Names | Rest Pose | Mesh Binding |
|-----------|--------------|-----------|--------------|
| **Original** (`Avatar_*`) | `Avatar_Hips`, `Avatar_LeftArm`, `Avatar_LeftForeArm` | Non-identity (arbitrary) | Skinned mesh bound here |
| **Normalized** (`Normalized_Avatar_*`) | `Normalized_Avatar_Hips`, `Normalized_Avatar_LeftArm` | **Identity** (`0,0,0,1` quat) | VRM constraint-linked |

> [!CAUTION]
> **You MUST target `Normalized_Avatar_*` bones for VRMA animations.** VRMA is a VRM 1.0 format — animation rotations assume identity rest pose. Applying them to `Avatar_*` bones (non-identity rest) causes the avatar to appear **upside-down** or deformed.

## Why AnimComponent Doesn't Work

> [!CAUTION]
> **PlayCanvas AnimComponent ignores modified `entityPath` values.** The AnimBinder uses pre-compiled bindings created during `loadStateGraph()`. Modifying `curve.paths[0].entityPath` in-place does NOT affect playback — bones will never move. This was confirmed by logging bone rotations across 300 frames: all stayed at identity `(0,0,0,1)` despite `anim.playing=true`.

The correct approach is **manual animation sampling**: extract raw keyframe data from AnimTrack internals and directly call `node.setLocalRotation()` per frame.

## Solution: Manual Animation Sampler

### Step 1: Build Bone Lookup (Prefer Normalized)

```javascript
const avatarNodes = [];
const traverse = (node) => { avatarNodes.push(node); node.children.forEach(traverse); };
traverse(avatarEntity);

const avatarNodesByHumanoid = new Map();
const HUMANOID_BONES = [
    'hips', 'spine', 'chest', 'upperchest', 'neck', 'head',
    'lefteye', 'righteye',
    'leftshoulder', 'leftupperarm', 'leftlowerarm', 'lefthand',
    'rightshoulder', 'rightupperarm', 'rightlowerarm', 'righthand',
    'leftupperleg', 'leftlowerleg', 'leftfoot', 'lefttoes',
    'rightupperleg', 'rightlowerleg', 'rightfoot', 'righttoes',
    // ... finger bones ...
];

const stripBoneName = (name) => name
    .replace(/^Normalized_Avatar_/i, '')
    .replace(/^Avatar_/i, '')
    .replace(/^J_Bip_[CLR]_/i, '')
    .replace(/[_\- ]/g, '').toLowerCase();

// Pass 1: PREFER Normalized_Avatar_* (VRM 1.0 identity rest pose)
for (const node of avatarNodes) {
    if (!node.name?.startsWith('Normalized_Avatar_')) continue;
    const stripped = stripBoneName(node.name);
    for (const bone of HUMANOID_BONES) {
        if (stripped === bone && !avatarNodesByHumanoid.has(bone)) {
            avatarNodesByHumanoid.set(bone, node);
            break;
        }
    }
}
// Pass 2: Fallback to Avatar_* for any unmatched
for (const node of avatarNodes) {
    if (!node.name || node.name.startsWith('Normalized_Avatar_')) continue;
    const stripped = stripBoneName(node.name);
    for (const bone of HUMANOID_BONES) {
        if (stripped === bone && !avatarNodesByHumanoid.has(bone)) {
            avatarNodesByHumanoid.set(bone, node);
            break;
        }
    }
}
```

### Step 2: Comprehensive Bone Aliases

VIVERSE avatars use abbreviated names that differ from VRM humanoid standard:

```javascript
const BONE_ALIASES = {
    // Limb abbreviations
    'leftupleg': 'leftupperleg',   'rightupleg': 'rightupperleg',
    'leftleg': 'leftlowerleg',     'rightleg': 'rightlowerleg',
    'leftforearm': 'leftlowerarm', 'rightforearm': 'rightlowerarm',
    'leftarm': 'leftupperarm',     'rightarm': 'rightupperarm',
    'lefttoebase': 'lefttoes',     'righttoebase': 'righttoes',
    // Spine numbering: Spine1 = chest, Spine2 = upperChest
    'spine1': 'chest',             'spine2': 'upperchest',
    // Eye naming: EyeL/R instead of LeftEye/RightEye
    'eyel': 'lefteye',             'eyer': 'righteye',
    // Finger numbering (HandThumb1 = thumbMetacarpal, etc.)
    'lefthandthumb1': 'leftthumbmetacarpal',
    'lefthandthumb2': 'leftthumbproximal',
    'lefthandthumb3': 'leftthumbdistal',
    // ... (same pattern for Index, Middle, Ring, Pinky, both hands)
};
```

### Step 3: Build Manual Animation Sampler

Extract raw keyframe data directly from AnimTrack internals:

```javascript
const buildAnimSampler = (asset, name) => {
    const track = asset.resource?.animations?.[0]?.resource;
    if (!track?.curves?.length) return null;
    
    const boneAnims = [];
    track.curves.forEach(curve => {
        const tgt = curve.paths?.[0];
        if (!tgt?.entityPath?.length) return;
        
        const animBone = tgt.entityPath[tgt.entityPath.length - 1];
        const normalized = animBone.replace(/[_\- ]/g, '').toLowerCase();
        const property = tgt.propertyPath?.[0]; // 'localRotation', 'localPosition', 'localScale'
        if (!property) return;
        
        let node = avatarNodesByHumanoid.get(normalized);
        if (!node) { const a = BONE_ALIASES[normalized]; if (a) node = avatarNodesByHumanoid.get(a); }
        if (!node) return;
        
        // Access raw keyframe arrays from AnimTrack internals
        const inputData = track._inputs[curve.input]?._data;   // Float32Array of timestamps
        const outputData = track._outputs[curve.output]?._data; // Float32Array of values
        if (!inputData || !outputData) return;
        
        const stride = Math.floor(outputData.length / inputData.length); // 4=quat, 3=vec3
        boneAnims.push({ node, property, inputData, outputData, stride });
    });
    
    return { duration: track.duration, boneAnims };
};
```

### Step 4: Per-Frame Animation Loop

```javascript
const sampleCurve = (iData, oData, stride, time) => {
    const n = iData.length;
    if (time <= iData[0]) return oData.subarray(0, stride);
    if (time >= iData[n-1]) return oData.subarray((n-1)*stride, n*stride);
    let i = 0;
    while (i < n-1 && iData[i+1] < time) i++;
    const alpha = (time - iData[i]) / (iData[i+1] - iData[i]);
    const b0 = i*stride, b1 = (i+1)*stride;
    if (stride === 4) { // Quaternion slerp
        tmpQ0.set(oData[b0], oData[b0+1], oData[b0+2], oData[b0+3]);
        tmpQ1.set(oData[b1], oData[b1+1], oData[b1+2], oData[b1+3]);
        tmpQR.slerp(tmpQ0, tmpQ1, alpha);
        return [tmpQR.x, tmpQR.y, tmpQR.z, tmpQR.w];
    }
    // Linear lerp for vec3
    const r = new Float32Array(stride);
    for (let j = 0; j < stride; j++) r[j] = oData[b0+j] + alpha*(oData[b1+j] - oData[b0+j]);
    return r;
};

// In update loop:
app.on('update', (dt) => {
    const sampler = isWalking ? walkSampler : idleSampler;
    animTime = (animTime + dt) % sampler.duration;
    for (const ba of sampler.boneAnims) {
        const v = sampleCurve(ba.inputData, ba.outputData, ba.stride, animTime);
        if (ba.property === 'localRotation' && ba.stride === 4)
            ba.node.setLocalRotation(v[0], v[1], v[2], v[3]);
        else if (ba.property === 'localPosition' && ba.stride === 3)
            ba.node.setLocalPosition(v[0], v[1], v[2]);
    }
});
```

## Animation ↔ Movement Integration

Switch between idle and walk based on physics velocity:

```javascript
let speed = 0;
if (avatarEntity.rigidbody) {
    const vel = avatarEntity.rigidbody.linearVelocity;
    speed = Math.sqrt(vel.x * vel.x + vel.z * vel.z);
}
const targetAnim = speed > 0.5 ? 'walk' : 'idle';
```

## Key Gotchas

> [!CAUTION]
> **Never modify `curve.paths[0].entityPath` and expect AnimComponent to use it.** The AnimBinder resolves paths internally via a pre-compiled cache. Use manual sampling instead.

> [!CAUTION]
> **Always target `Normalized_Avatar_*` bones for VRMA data.** Targeting `Avatar_*` causes upside-down or deformed animation due to mismatched rest poses between VRM 0.x and 1.0 conventions.

> [!WARNING]
> **PlayCanvas discards glTF JSON after parsing.** `asset.resource._parser` is `undefined`. You cannot read `VRMC_vrm_animation` extension data at runtime.

> [!IMPORTANT]
> **VRM 0.x vs 1.0 axis difference.** VRM 0.x uses arbitrary bone orientations. VRM 1.0 (and VRMA) uses normalized identity rest pose. Mixing conventions causes the avatar to face wrong direction or flip upside-down.

> [!TIP]
> **Expression/blend shape curves won't match bones.** Curves targeting `"relaxed"`, `"blink"`, etc. are blend shapes, not skeleton bones. It's normal for these to remain unmatched.
