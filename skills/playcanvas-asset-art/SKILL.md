---
name: playcanvas-asset-art
description: Replace, fetch, and process texture/image assets in static PlayCanvas templates
prerequisites: [PlayCanvas static template workspace, sips available (macOS), Python PIL available]
tags: [playcanvas, texture, image, asset, art, symbol, overlay, sprite]
---

# PlayCanvas Asset & Art Skill

## ★ QUICK START — Per-Color Symbols (flow-line-v1)

**If the user wants different symbols/images on different colored endpoints:**

**Step 1: For each color, decide the source:**
- Check `ls files/assets/symbol_library/` for pre-made PNGs:
  bird, flame, star, heart, diamond, cross, moon, lightning, circle_ring, triangle
- If the user's requested symbol **IS** in the library → use `cp`
- If the user's requested symbol **IS NOT** in the library → **GENERATE it with PIL** (Step 2b)
- **NEVER substitute a different symbol.** If user says "tree" and there's no tree.png, you MUST generate a tree.

**Step 2a: Copy from library** (for symbols that exist):
```bash
cp files/assets/symbol_library/bird.png files/assets/283500002/1/endpoint_blue.png
cp files/assets/symbol_library/bird.png files/assets/283500012/1/block_blue.png
```

**Step 2b: Generate with PIL** (for symbols NOT in library):
```bash
python3 - <<'PY'
from PIL import Image, ImageDraw
SZ = 256
BG = (153, 153, 153, 255)  # gray background
FG = (255, 255, 255, 255)  # white foreground (symbol)
img = Image.new('RGBA', (SZ, SZ), BG)
d = ImageDraw.Draw(img)
# Draw the requested shape — be creative and make it recognizable
# Example: tree (trunk + triangular canopy)
d.rectangle([118, 180, 138, 240], fill=FG)  # trunk
d.polygon([(128, 30), (50, 180), (206, 180)], fill=FG)  # canopy
img.save('files/assets/283500003/1/endpoint_green.png')
img.save('files/assets/283500013/1/block_green.png')
PY
```
> Use gray `(153,153,153)` background + white `(255,255,255)` foreground.
> White areas = full color brightness, gray areas = dimmer (still colored).

**Step 3: Verify** — `file files/assets/283500002/1/endpoint_blue.png` → must say "PNG image data"

**DONE.** No config.json edits. No 2453710.json edits. No script patching. No downloading.

### Pre-wired paths (just overwrite the file — everything else is already set up)

| Color | Endpoint path | Block path |
|---|---|---|
| red | `files/assets/283500001/1/endpoint_red.png` | `files/assets/283500011/1/block_red.png` |
| blue | `files/assets/283500002/1/endpoint_blue.png` | `files/assets/283500012/1/block_blue.png` |
| green | `files/assets/283500003/1/endpoint_green.png` | `files/assets/283500013/1/block_green.png` |
| yellow | `files/assets/283500004/1/endpoint_yellow.png` | `files/assets/283500014/1/block_yellow.png` |
| purple | `files/assets/283500005/1/endpoint_purple.png` | `files/assets/283500015/1/block_purple.png` |
| teal | `files/assets/283500006/1/endpoint_teal.png` | `files/assets/283500016/1/block_teal.png` |

### PIL generation tips for common shapes:
| Symbol | Drawing approach |
|---|---|
| tree | Rectangle trunk + triangle polygon canopy |
| fish | Ellipse body + triangle tail polygon |
| cat | Circle head + triangle ears + dot eyes |
| house | Rectangle base + triangle roof polygon |
| car | Rectangle body + two circle wheels |
| crown | Rectangle base + three triangle points |
| flower | Central circle + ellipse petals around it |
| shield | Wide top arc + pointed bottom polygon |

Always save to BOTH the endpoint AND block path for each color.

---

## ⛔ NEVER DO THESE (common mistakes that break the game)

1. **NEVER modify `textureBlock` or `textureEndpointCircle` values in `2453710.json`** — these are GLOBAL defaults that affect ALL cells. Changing them breaks all obstacles or all endpoints.
2. **NEVER modify `config.json` asset entries for existing per-color assets** — they are already registered with correct format and `preload: true`.
3. **NEVER patch `__game-scripts.js`** for per-color — it's already patched with `_getPerColorEndpointTexture()`.
4. **NEVER save SVG content as a `.png` file** — PlayCanvas requires real raster PNG data.
5. **NEVER modify `2453710.json` attribute values** for per-color work — they're pre-wired.
6. **NEVER substitute a different symbol** when the user's requested one is not in the library — generate it with PIL instead.

## Game Terminology (flow-line-v1)

| In-game element | Frame type | User might call it |
|---|---|---|
| **Start/end nodes** (colored circles where paths begin/end) | `endpoint_circle` | "colored blocks", "color blocks", "start blocks", "end dots" |
| **Obstacle cells** (X-shaped, cannot be filled) | `block` | "cross", "X", "wall", "blocker" |

> **"color blocks" = start/end nodes**, NOT obstacles. When user says "change color blocks",
> they mean the colored endpoint circles, not the X-shaped obstacles.

## Capability Boundaries

### ✅ POSSIBLE — agent can do these
| Request | Technique |
|---|---|
| Change block/cell shape | Set `shapeType` enum in scene JSON |
| Replace a texture with a custom image | Overwrite `files/assets/<id>/1/<filename>` |
| Different texture per color | Copy from symbol library, or generate with PIL, to per-color asset paths |
| Fetch a symbol/icon from the web | `curl` from Iconify/Twemoji, then convert to PNG with `sips` |
| Resize/convert an image | `sips` (macOS built-in) or `python3 PIL` |
| Add a watermark or logo overlay | Composite with `python3 PIL` or `sips` |
| Change background/UI colors | Edit `styles.css` or `__settings__.js` |

### ⚠️ DIFFICULT — requires careful surgical editing of compiled scripts
| Request | Approach |
|---|---|
| Add new script components | Compiled bundle — very complex; prefer runtime hooks or patching existing scripts |
| Per-entity custom shaders | Compiled engine — no runtime shader injection; consider material property changes instead |

When the user requests something in the ⚠️ list, explain the difficulty and offer the closest ✅ alternative first.

---

## flow-line-v1 Rendering Architecture

Understand this before modifying any rendering code:

### Frame Types
Every cell is painted with a **frame type** that determines its texture:
| Frame | Used for | Texture attribute | When used |
|---|---|---|---|
| `cell_empty` | Unoccupied cells | `textureCellEmpty` | Default state |
| `block` | Obstacle/wall cells | `textureBlock` | Grid obstacles |
| `endpoint_circle` | **Start/end nodes** | `textureEndpointCircle` | Colored endpoints where paths begin/end |
| `pipe_straight` | Path segments | `texturePipeStraight` | Connected path cells |
| `pipe_corner` | Path corners | `texturePipeCorner` | Path turns |

### Color System
- Each endpoint has a color key (`red`, `blue`, `green`, etc.) mapped to a hex via `GridRenderer.PATH_COLOR_HEX`
- `_paintCellFrame(row, col, frameType, parsedColor, rotation)` applies the frame texture + color tint
- Color is applied via `material.emissive` — the per-color textures act as **brightness modulators** (white=full color, gray=dimmer)
- **Start/end nodes ALWAYS use `endpoint_circle` frame**, not `block`

### Key lookup chain
```
_paintCellFrame → _createMaterialForGridFrame → _applyGridFrameToCell → _getTextureAssetForFrame(frameName)
  → TEXTURE_ATTR_BY_FRAME[frameName] → attribute name → this[attrName].resource
```

### Per-color overlay rendering (already patched in template)
The IIFE in `_paintCellFrame` does:
```
var _pt = this._getPerColorEndpointTexture(i);  // i = pc.Color
if (!_pt) _pt = this._getPerColorBlockTexture(i);
if (_pt) {
  n.diffuseMap = _pt;        // texture as diffuse
  n.emissiveMap = _pt;       // texture as emissive (multiplied by emissive color)
  n.blendType = pc.BLEND_NORMAL;  // enable alpha blending
  n.alphaTest = 0.05;        // discard near-transparent pixels
}
```
- The texture acts as a **brightness modulator**: white = full color, gray = dimmer
- Both diffuseMap AND emissiveMap must be set (emissiveMap alone is too dim)
- `_getPerColorEndpointTexture(colorObj)` converts the pc.Color to hex, fuzzy-matches (distance < 30) to the closest PATH_COLOR_HEX, and returns `this[attrName].resource`

---

## PlayCanvas config.json Asset Format Reference

When adding NEW texture assets to `config.json`, each entry **must** follow this exact structure.
Missing or incorrect fields (especially `preload: true`) will cause `.resource` to be `null` at runtime.

```json
{
  "name": "endpoint_red.png",
  "type": "texture",
  "file": {
    "filename": "endpoint_red.png",
    "size": 850,
    "hash": "unique_hash_string",
    "variants": {},
    "url": "files/assets/283500001/1/endpoint_red.png"
  },
  "data": {
    "addressu": "repeat",
    "addressv": "repeat",
    "minfilter": "linear_mip_linear",
    "magfilter": "linear",
    "anisotropy": 1,
    "rgbm": false,
    "srgb": true,
    "mipmaps": true
  },
  "preload": true,
  "tags": [],
  "i18n": {},
  "id": "283500001"
}
```

### Critical fields:
| Field | Required | What happens if wrong |
|---|---|---|
| `preload: true` | **YES** | Asset never loaded → `.resource` is `null` → texture invisible |
| `file.url` | **YES** | Must match actual file path exactly |
| `file.filename` | **YES** | PlayCanvas uses this for type detection |
| `file.variants: {}` | **YES** | Missing = asset registry skips it |
| `data.minfilter` | Use strings | Numeric values (`5`) break — use `"linear_mip_linear"` |
| `data.magfilter` | Use strings | Numeric values (`1`) break — use `"linear"` |
| `data.srgb: true` | Recommended | Without it, colors may look washed out |
| `id` | **YES** | Must match the key in `assets` object |

> ⚠️ **Common mistake**: Using numeric enum values (`minFilter: 5`) instead of string names (`"linear_mip_linear"`). The built-in PlayCanvas assets always use string names.

---

## Step-by-Step: Replace a Texture Asset

### 1. Find the asset ID in the scene JSON
```bash
python3 -c "
import json
data = json.load(open('2453710.json'))
for eid, ent in data['entities'].items():
    sc = ent.get('components', {}).get('script', {}).get('scripts', {})
    for sname, sdef in sc.items():
        for aname, aval in (sdef.get('attributes') or {}).items():
            if isinstance(aval, int):
                print(f'{ent[\"name\"]}.{sname}.{aname} = {aval}')
"
```

### 2. Map asset ID to file path in config.json
```bash
python3 -c "
import json
asset_id = 282971613  # example: textureBlock
cfg = json.load(open('config.json'))
asset = cfg['assets'].get(str(asset_id), {})
print(asset.get('filename'), asset.get('url'))
"
```
The URL field gives the relative path, e.g. `files/assets/282971613/1/block.png`.

### 3. Fetch a replacement image from the web

**Option A — Direct PNG from Twemoji (preferred — no conversion needed):**
```bash
# Twemoji provides pre-rendered PNG files. Find the unicode codepoint for the emoji.
# Bird: U+1F426 → 1f426, Fire: U+1F525 → 1f525, Star: U+2B50 → 2b50
curl -L "https://raw.githubusercontent.com/twitter/twemoji/master/assets/72x72/1f426.png" -o /tmp/symbol.png
```

**Option B — Iconify SVG (must convert to PNG):**
```bash
# Download SVG
curl -L "https://api.iconify.design/mdi/bird.svg?width=256&height=256&color=%23ffffff" -o /tmp/symbol.svg

# CRITICAL: Convert SVG to PNG. SVG files CANNOT be used as PlayCanvas textures.
# Use sips on macOS (reads SVG, exports PNG):
sips -s format png /tmp/symbol.svg --out /tmp/symbol.png 2>/dev/null \
  || python3 -c "import cairosvg; cairosvg.svg2png(url='/tmp/symbol.svg', write_to='/tmp/symbol.png', output_width=256, output_height=256)" 2>/dev/null \
  || rsvg-convert -w 256 -h 256 -o /tmp/symbol.png /tmp/symbol.svg
```

**Option C — Copy from the pre-bundled symbol library (fastest, no network needed):**
```bash
# See "Symbol Library" section above for available symbols
cp files/assets/symbol_library/star.png /tmp/symbol.png
```

**Option D — Generate with Python PIL (for custom symbols not in library):**
```python
from PIL import Image, ImageDraw
SZ = 256
BG = (153, 153, 153, 255)   # gray background (0.6 brightness)
FG = (255, 255, 255, 255)   # white symbol (full brightness)
img = Image.new('RGBA', (SZ, SZ), BG)
d = ImageDraw.Draw(img)
# Draw your shape in white on gray — white areas will be bright, gray areas dimmer
# Example: cross / plus sign
d.rectangle([108, 20, 148, 236], fill=FG)
d.rectangle([20, 108, 236, 148], fill=FG)
img.save('/tmp/symbol.png')
```
> **Important**: Use gray `(153,153,153)` background + white `(255,255,255)` foreground.
> The rendering engine multiplies this texture by the block's emissive color, so:
> - White areas → full color brightness (symbol stands out)
> - Gray areas → dimmer color (still shows color, just darker)

**NEVER do this:**
```bash
# WRONG — creates an SVG file with .png extension. PlayCanvas will fail to load it.
echo '<svg ...>' > files/assets/123/1/symbol.png   # ← BROKEN
```

### 4. Resize and place into the asset slot
```bash
# macOS built-in (no dependencies):
sips -z 128 128 /tmp/symbol.png --out files/assets/282971613/1/block.png

# Or Python PIL:
python3 -c "
from PIL import Image
img = Image.open('/tmp/symbol.png').convert('RGBA').resize((128, 128), Image.LANCZOS)
img.save('files/assets/282971613/1/block.png')
"
```

### 5. Verify the replacement
```bash
sips -g all files/assets/282971613/1/block.png | grep -E "pixelWidth|pixelHeight|format"
```

---

## Step-by-Step: Change Block Shape (shapeType enum)

When the user wants a shape change rather than a custom image:

### Valid shapeType values (flow-line-v1)
| User says | Set value |
|---|---|
| plus, cross, + | `"cross"` |
| diamond, rhombus | `"diamond"` |
| wide diamond | `"diamondWide"` |
| thick cross | `"thickCross"` |
| L-shape | `"lshape"` |
| narrow L | `"lshapeNarrow"` |
| wide L | `"lshapeWide"` |
| hourglass | `"hourglass"` |
| zigzag, wave | `"zigzag"` |
| comb | `"comb"` |
| bone | `"bone"` |
| arrow | `"arrow"` |
| letter A/B/E/F/G/Q | `"letterA"` etc. |
| square, box, default | `"square"` |

### Set the value
```python
import json
from pathlib import Path
p = Path('2453710.json')
data = json.loads(p.read_text())
for ent in data['entities'].values():
    sc = ent.get('components', {}).get('script', {}).get('scripts', {})
    if 'gridRenderer' in sc:
        sc['gridRenderer']['attributes']['shapeType'] = 'cross'  # your chosen value
p.write_text(json.dumps(data, ensure_ascii=False, separators=(',', ':')))
print('shapeType updated')
```

---

## Handling Per-Color Requests

See **★ QUICK START** at the top of this skill. Everything below is reference only.

### Fallback: One symbol for all endpoints
If the user just wants one symbol on ALL endpoints (same symbol, no per-color), replace the `textureEndpointCircle` asset file directly at its path in `files/assets/`. Do NOT change the attribute value in `2453710.json`.

---

## Image Sources Reference

| Source | Best for | URL pattern |
|---|---|---|
| Iconify | SVG icons (1000s of sets) | `https://api.iconify.design/<set>/<icon>.svg?width=128` |
| Twemoji | Emoji as PNG | `https://raw.githubusercontent.com/twitter/twemoji/master/assets/72x72/<unicode>.png` |
| Feather Icons | Clean line icons | `https://raw.githubusercontent.com/feathericons/feather/master/icons/<name>.svg` |
| SVG Repo | General SVG | `https://www.svgrepo.com/` (manual browse) |

---

## Checklist Before Publishing

- [ ] New asset file exists at correct path (`files/assets/<id>/1/<filename>`)
- [ ] File is a valid PNG (check with `sips -g format`)
- [ ] Dimensions match original (use `sips -g pixelWidth pixelHeight`)
- [ ] `shapeType` value is from the valid enum list (not invented)
- [ ] If `__game-scripts.js` was patched: verify game still loads (no syntax errors in patch)
- [ ] CONTRACT.json immutablePaths lists high-risk files — if any were modified, verify syntax and existing behavior is preserved

---

## Troubleshooting: Textures Not Showing

If per-color symbol textures are correctly placed as PNG files but don't appear in-game:

| Symptom | Cause | Fix |
|---|---|---|
| Symbol invisible, no errors | `preload: true` missing in config.json | Add `"preload": true` to the asset entry |
| Symbol invisible, no errors | config.json `file` structure wrong | `url` must be inside `file: { ... }`, not at root level |
| Symbol invisible, no errors | config.json `data` uses numeric enums | Use `"linear_mip_linear"` not `5`, `"linear"` not `1` |
| Symbol invisible, no errors | Only `emissiveMap` set | Must set BOTH `diffuseMap` and `emissiveMap` + blend mode |
| Colors washed out | `srgb: false` in asset data | Set `"srgb": true` |
| PNG file exists but shows white | File is all-white placeholder | Replace with actual symbol from symbol_library |
| "not a PNG" error | SVG saved with .png extension | Convert with `sips -s format png` first |

### Debug: verify asset loaded at runtime
Add to `_getPerColorEndpointTexture` temporarily:
```js
console.log('color hex:', h, 'attr:', a, 'asset:', this[a], 'resource:', this[a] && this[a].resource);
```
If `asset` is `null` → attribute not wired in 2453710.json.
If `asset` exists but `resource` is `null` → config.json entry is malformed or `preload: true` is missing.
