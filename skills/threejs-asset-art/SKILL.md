---
name: threejs-asset-art
description: Replace GLB models, override materials, fetch textures, and add procedural decorations in static Three.js templates
prerequisites: [Three.js static template workspace, GLTFLoader, sips available (macOS), Python PIL available]
tags: [threejs, model, material, texture, asset, art, decoration, procedural, glb]
---

# Three.js Asset & Art Skill

## ★ QUICK REFERENCE — What This Skill Covers

| Technique | When to use |
|---|---|
| Material override | Change colors, metalness, roughness, emissive glow on existing GLB meshes |
| Texture swap | Replace textures on GLB meshes with fetched images (color maps, normal maps, env maps) |
| Model swap | Replace a GLB model URL with an alternative from the bundled theme pack or external CDN |
| Procedural decoration | Add Three.js geometry (trees, rocks, particles, water, clouds) around the scene |
| Post-processing | Adjust bloom, fog, tone mapping, sky gradient for atmosphere |

---

## ⛔ NEVER DO THESE

1. **NEVER try to "generate" a GLB model** — LLMs cannot create binary 3D model files. Use model swaps or procedural geometry instead.
2. **NEVER inline base64-encoded GLB data** — files are too large and break the page.
3. **NEVER modify a GLB file directly** — they are binary. Override materials at runtime after loading.
4. **NEVER remove physics/collision setup** when swapping visuals — always preserve the gameplay layer.
5. **NEVER hardcode absolute paths to models** — use relative paths from the HTML file (e.g., `models/vehicle.glb`).

---

## Architecture: How Three.js Templates Load Assets

### Model Loading Pattern (GLTFLoader)

```javascript
const loader = new GLTFLoader();
const modelNames = [
    'vehicle-truck-yellow', 'vehicle-truck-green', ...
    'track-straight', 'track-corner', ...
    'decoration-empty', 'decoration-forest', ...
];

const models = {};
const promises = modelNames.map(name =>
    new Promise((resolve, reject) => {
        loader.load(`models/${name}.glb`, (gltf) => {
            models[name] = gltf.scene;
            resolve();
        }, undefined, reject);
    })
);
await Promise.all(promises);
```

### Key Insight: The `models` Object Is the Asset Registry

All templates store loaded models in a dictionary keyed by filename (minus extension). Track builders, vehicle spawners, and decoration placers all reference `models['some-key']`. To change visuals:

1. **Swap the GLB file** — replace `models/old-name.glb` with a new file at the same path
2. **Add alternative models** — add new GLB files + add their names to `modelNames`
3. **Override materials after load** — traverse the loaded scene and patch materials

---

## Technique 1: Material Override (Most Common)

Override materials on loaded GLB meshes to change the visual theme without replacing model files.

### Pattern: Traverse and patch all meshes

```javascript
// After models are loaded, before they're placed in the scene:
function applyThemeMaterials(model, options = {}) {
    model.traverse((child) => {
        if (!child.isMesh) return;
        
        // Clone material to avoid affecting the original
        child.material = child.material.clone();
        
        // Color override
        if (options.color) {
            child.material.color.set(options.color);
        }
        
        // PBR properties
        if (options.metalness !== undefined) child.material.metalness = options.metalness;
        if (options.roughness !== undefined) child.material.roughness = options.roughness;
        
        // Emissive glow
        if (options.emissive) {
            child.material.emissive.set(options.emissive);
            child.material.emissiveIntensity = options.emissiveIntensity || 1.0;
        }
        
        // Texture map
        if (options.map) {
            child.material.map = options.map;
            child.material.needsUpdate = true;
        }
    });
}
```

### Pattern: Selective override by mesh name

```javascript
model.traverse((child) => {
    if (!child.isMesh) return;
    const name = child.name.toLowerCase();
    
    if (name.includes('body')) {
        child.material = child.material.clone();
        child.material.color.set(0xff4444);
        child.material.metalness = 0.8;
    } else if (name.includes('wheel')) {
        child.material = child.material.clone();
        child.material.color.set(0x222222);
        child.material.roughness = 0.9;
    }
});
```

### Where to inject in the template

Insert material overrides **after `loadModels()` completes** but **before `buildTrack()` / vehicle init**:

```javascript
await loadModels();

// === THEME OVERRIDES START ===
applyThemeMaterials(models['vehicle-truck-yellow'], { color: 0xff6600, metalness: 0.7 });
applyThemeMaterials(models['track-straight'], { color: 0x3a5a3a, roughness: 0.95 });
applyThemeMaterials(models['decoration-forest'], { color: 0x1a4a1a });
// === THEME OVERRIDES END ===

buildTrack(scene, models, customCells);
```

---

## Technique 2: Texture Fetch & Apply

Fetch an image from the web and apply it as a texture map on GLB meshes.

### Fetch sources (same as playcanvas-asset-art)

| Source | Best for | URL pattern |
|---|---|---|
| ambientCG | PBR textures (wood, metal, stone) | `https://ambientcg.com/get?file=WoodFloor051_1K-JPG.zip` |
| Poly Haven | HDR environments, PBR materials | `https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/` |
| Iconify | SVG icons → texture | `https://api.iconify.design/<set>/<icon>.svg?width=256` |
| Twemoji | Emoji as PNG | `https://raw.githubusercontent.com/twitter/twemoji/master/assets/72x72/<unicode>.png` |

### Pattern: Download at generation time, bundle in output

```bash
# Fetch a texture for the ground/track
curl -L "https://ambientcg.com/get?file=Ground054_1K-JPG.zip" -o /tmp/ground_tex.zip
unzip -o /tmp/ground_tex.zip -d /tmp/ground_tex/
cp /tmp/ground_tex/Ground054_1K_Color.jpg models/Textures/ground_color.jpg
cp /tmp/ground_tex/Ground054_1K_NormalGL.jpg models/Textures/ground_normal.jpg
```

### Pattern: Load texture in JS and apply

```javascript
import { TextureLoader } from 'three';

const texLoader = new TextureLoader();

function loadAndApplyTexture(model, texturePath, options = {}) {
    const texture = texLoader.load(texturePath);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    if (options.repeat) texture.repeat.set(options.repeat[0], options.repeat[1]);
    
    model.traverse((child) => {
        if (!child.isMesh) return;
        child.material = child.material.clone();
        child.material.map = texture;
        if (options.normalMap) {
            child.material.normalMap = texLoader.load(options.normalMap);
        }
        child.material.needsUpdate = true;
    });
}
```

### Pattern: Generate texture with PIL at build time

```bash
python3 - <<'PY'
from PIL import Image, ImageDraw, ImageFilter
import random

SZ = 512
img = Image.new('RGB', (SZ, SZ), (34, 80, 34))  # dark green base
d = ImageDraw.Draw(img)

# Add noise/variation for a natural ground look
for _ in range(2000):
    x, y = random.randint(0, SZ-1), random.randint(0, SZ-1)
    shade = random.randint(20, 60)
    d.point((x, y), fill=(shade, shade+30, shade))

img = img.filter(ImageFilter.GaussianBlur(1))
img.save('models/Textures/ground_grass.jpg', quality=85)
PY
```

---

## Technique 3: Model Swap

Replace a GLB file with a thematic alternative. The template loads models by filename from the `models/` directory.

### Option A: Replace the file directly

```bash
# Replace the forest decoration with a desert rocks model
cp themed-models/desert-rocks.glb models/decoration-forest.glb
```

The template code loads `models/decoration-forest.glb` — as long as the replacement has similar scale and origin, it works as a drop-in.

### Option B: Add new model + update modelNames array

In `main.js`, add to the `modelNames` array:

```javascript
const modelNames = [
    'vehicle-truck-yellow', 'vehicle-truck-green', ...
    'track-straight', 'track-corner', ...
    'decoration-empty', 'decoration-forest', 'decoration-tents',
    'decoration-cactus',  // ← NEW
];
```

Then in `Track.js`, reference it in DECO_CELLS or the procedural placement logic.

### Option C: Pre-bundled theme packs

If the template ships with a `models/themes/` directory:
```
models/themes/
  desert/
    decoration-forest.glb  → cacti/rocks
    decoration-tents.glb   → camp/ruins
    vehicle-truck-yellow.glb → dune buggy
  snow/
    decoration-forest.glb  → snow pines
    decoration-tents.glb   → igloos
    vehicle-truck-yellow.glb → snowmobile
```

Swap by copying the theme pack over the main models:
```bash
cp models/themes/desert/* models/
```

---

## Technique 4: Procedural Decoration

Add Three.js geometry to enhance the scene without needing GLB files.

### Pattern: Stylized trees

```javascript
function createStylizedTree(height = 2, trunkColor = 0x4a3020, canopyColor = 0x2d5a2d) {
    const group = new THREE.Group();
    
    // Trunk
    const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.12, height * 0.4, 6),
        new THREE.MeshStandardMaterial({ color: trunkColor, roughness: 0.9 })
    );
    trunk.position.y = height * 0.2;
    trunk.castShadow = true;
    group.add(trunk);
    
    // Canopy (cone or sphere)
    const canopy = new THREE.Mesh(
        new THREE.ConeGeometry(0.6, height * 0.7, 7),
        new THREE.MeshStandardMaterial({ color: canopyColor, roughness: 0.85 })
    );
    canopy.position.y = height * 0.65;
    canopy.castShadow = true;
    group.add(canopy);
    
    return group;
}
```

### Pattern: Rocks / boulders

```javascript
function createRock(size = 1, color = 0x666666) {
    const geo = new THREE.DodecahedronGeometry(size, 0);
    // Deform vertices for organic look
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
        pos.setXYZ(i,
            pos.getX(i) * (0.8 + Math.random() * 0.4),
            pos.getY(i) * (0.7 + Math.random() * 0.3),
            pos.getZ(i) * (0.8 + Math.random() * 0.4)
        );
    }
    geo.computeVertexNormals();
    
    const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.95, flatShading: true });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true;
    return mesh;
}
```

### Pattern: Particle clouds / mist

```javascript
function createMist(scene, bounds) {
    const count = 200;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    
    for (let i = 0; i < count; i++) {
        positions[i * 3] = (Math.random() - 0.5) * bounds.width;
        positions[i * 3 + 1] = Math.random() * 3 + 0.5;
        positions[i * 3 + 2] = (Math.random() - 0.5) * bounds.depth;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    const mat = new THREE.PointsMaterial({
        color: 0xffffff,
        size: 2,
        transparent: true,
        opacity: 0.3,
        depthWrite: false
    });
    
    scene.add(new THREE.Points(geo, mat));
}
```

### Pattern: Water plane

```javascript
function createWater(width, depth, y = -0.3) {
    const geo = new THREE.PlaneGeometry(width, depth, 32, 32);
    const mat = new THREE.MeshStandardMaterial({
        color: 0x1a6a8a,
        metalness: 0.3,
        roughness: 0.1,
        transparent: true,
        opacity: 0.7,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = y;
    return mesh;
}
```

---

## Technique 5: Atmosphere & Post-Processing

### Pattern: Sky gradient (no skybox file needed)

```javascript
function createGradientSky(scene, topColor = 0x0055aa, bottomColor = 0x88ccff) {
    const canvas = document.createElement('canvas');
    canvas.width = 2; canvas.height = 256;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0, '#' + topColor.toString(16).padStart(6, '0'));
    grad.addColorStop(1, '#' + bottomColor.toString(16).padStart(6, '0'));
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 2, 256);
    
    const tex = new THREE.CanvasTexture(canvas);
    tex.mapping = THREE.EquirectangularReflectionMapping;
    scene.background = tex;
}
```

### Pattern: Fog tuning

```javascript
// Distance fog (existing in template)
scene.fog = new THREE.Fog(0xadb2ba, 30, 55);

// Exponential fog (denser, more atmospheric)
scene.fog = new THREE.FogExp2(0x2a4a3a, 0.025);
```

### Pattern: Light color theming

```javascript
// Sunset theme
dirLight.color.set(0xffaa44);
dirLight.intensity = 4;
hemiLight.color.set(0xff8833);      // sky color
hemiLight.groundColor.set(0x443322); // ground bounce
scene.background = new THREE.Color(0x331a00);
scene.fog.color.set(0x331a00);
```

---

## Template-Specific: starter-kit-racing-v1

### Asset inventory

| Category | Model files | Mesh structure |
|---|---|---|
| Vehicles | `vehicle-truck-{yellow,green,purple,red}.glb` | `body`, `wheel_front_left`, `wheel_front_right`, `wheel_back_left`, `wheel_back_right` |
| Track pieces | `track-{straight,corner,bump,finish}.glb` | Road surface mesh |
| Decorations | `decoration-{empty,forest,tents}.glb` | Instanced via `InstancedMesh` |
| Textures | `models/Textures/colormap.png` | Shared atlas for all models |
| Palette Variants | `colormap-desert.png`, `colormap-snow.png`, `colormap-neon.png` | Drop-in replacements |

### ThemeConfig.js (centralized)

All visual parameters are in `js/ThemeConfig.js`. To change the entire look, edit:
```javascript
import { THEME } from './ThemeConfig.js';
// THEME.palette — path to colormap texture (swap for desert/snow/neon)
// THEME.playerVehicle — model key for player car
// THEME.sky — background, fogColor, fogNear, fogFar
// THEME.lighting — directional + hemisphere colors/intensity
// THEME.bloom — strength, radius, threshold
// THEME.toneMapping — exposure
```

### Palette swap (highest-impact change)

All GLB models share `models/Textures/colormap.png` — a 512×512 flat-color atlas.
Models UV-map to specific swatches. Replacing this ONE file recolors everything.

Available palettes:
- `colormap.png` — default Kenney pastels
- `colormap-desert.png` — warm browns/oranges
- `colormap-snow.png` — cool blues/whites
- `colormap-neon.png` — vivid saturated

To use: set `THEME.palette` in ThemeConfig.js to the desired path.

---

## Template-Specific: tankarena-3d-v1

### ThemeConfig.js (centralized)

All visual constants in `src/game/ThemeConfig.js`:
```javascript
import { THEME } from './ThemeConfig.js';
// THEME.players.p1/p2 — tank colors
// THEME.arena.wall/wallCap/wallStripe/pillar — material properties
// THEME.arena.ground — ground plane appearance
// THEME.groundTexture — canvas-drawn ground pattern colors
// THEME.lighting — hemisphere, directional, fog
// THEME.models.tank/powerup/bullet — GLTF model paths
```

### Asset inventory

| Category | Path | Format |
|---|---|---|
| Tank | `public/models/tank_model_new/scene.gltf` | GLTF+BIN |
| Powerup | `public/models/powerup_model/scene.gltf` | GLTF+BIN |
| Bullet | `public/models/bullet_model/scene.gltf` | GLTF+BIN+textures |

---

## Template-Specific: dashrunner-v1

### Theme System (already modularized)

`js/game/ThemeManager.js` exports `THEMES` with 7 named presets:
- `night` — Sunset Night (warm darks)
- `day` — Sunny Tuscany (bright Mediterranean)
- `golden` — Golden Hour (dramatic oranges)
- `cyberpunk` — Cyberpunk City (neon pink/cyan, heavy bloom)
- `forest` — Enchanted Forest (deep greens, misty)
- `arctic` — Arctic Storm (cold blues/whites)
- `volcanic` — Volcanic Wasteland (dark reds/oranges)

Each theme controls: sky gradient, fog, ambient/sun/fill/rim lights, building colors,
ground color, lamp emissive, exposure, and bloom.

### Config-driven assets

`game-config.json` defines obstacle and collectible models with swappable paths:
```json
{
  "obstacles": [{ "modelPath": "assets/NonnaKick.fbx", "modelType": "fbx" }],
  "collectibles": [{ "modelPath": "assets/Pizza.glb", "scale": 0.6 }]
}
```
Replace model files in `public/assets/` and update paths in config.

---

## Template-Specific: flight-simulator-v1

### Fully Procedural (no external assets)

Everything is generated from `src/core/Constants.js`:
```javascript
PLAYER.COLOR_FUSELAGE = 0xe8e0d4
PLAYER.COLOR_WING = 0xd4cdc0
LEVEL.GROUND_COLOR = 0x4a8c3a
LEVEL.MOUNTAIN_COLOR = 0x7a6b5a
SKY.TOP_COLOR = 0x1e90ff
```

No models to swap — change colors/dimensions directly in Constants.js.

---

## Capability Boundaries

### ✅ POSSIBLE — agent can do these

| Request | Technique |
|---|---|
| Change vehicle/track/decoration colors | Material override (traverse + set color) |
| Make vehicles metallic/glossy | Material override (metalness/roughness) |
| Add glow/neon effects | Emissive material + bloom pass adjustment |
| Change ground texture | Fetch texture + apply to ground plane |
| Replace the shared colormap | Overwrite `models/Textures/colormap.png` (affects all models) |
| Add procedural trees/rocks/clouds | Procedural decoration technique |
| Change sky/fog/lighting mood | Atmosphere technique |
| Swap to themed model pack | Model swap (if theme pack is bundled) |
| Add particle effects (rain, snow, dust) | Particle system with BufferGeometry |

### ❌ IMPOSSIBLE — do not attempt

| Request | Why |
|---|---|
| Generate a new 3D car model | Cannot create GLB binary files |
| Import a user's custom model from URL at runtime | CORS + untrusted content |
| Add skeletal animation to static models | Requires rigged models (not available) |
| Real-time ray tracing | WebGL limitation |

### ⚠️ REQUIRES TEMPLATE MODULARIZATION

| Request | What's needed |
|---|---|
| Swap individual model for a different shape | Theme pack must be bundled, OR colormap replacement |
| Per-vehicle unique texture | Models currently share one atlas — need split UVs or per-mesh override |
| Different decoration types (not forest/tents/empty) | New GLB files must be added to `models/` + `modelNames` array |

---

## Checklist Before Publishing

- [ ] Material overrides are applied after `loadModels()`, before scene build
- [ ] Any fetched textures exist at the referenced path in the output
- [ ] `modelNames` array matches actual files in `models/` directory
- [ ] Physics/collision setup is preserved (never modify Physics.js for visual changes)
- [ ] Procedural geometry uses `castShadow = true` for visual consistency
- [ ] Fog color matches scene background color (avoids harsh horizon line)
- [ ] No broken imports — only use modules available in the importmap
