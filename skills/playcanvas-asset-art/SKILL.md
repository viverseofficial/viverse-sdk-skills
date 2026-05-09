---
name: playcanvas-asset-art
description: Replace, fetch, and process texture/image assets in static PlayCanvas templates
prerequisites: [PlayCanvas static template workspace, sips or Python PIL available]
tags: [playcanvas, texture, image, asset, art, symbol, overlay, sprite]
---

# PlayCanvas Asset & Art Skill

Use this skill when the user request involves visual/art changes in a **compiled static PlayCanvas template** (flow-line-v1, starter-kit-racing-v1, etc.) — such as changing textures, adding symbols, overlaying images, or swapping sprites.

## Critical Rules

> **SVG files CANNOT be used as PlayCanvas textures.**
> PlayCanvas loads textures via WebGL which requires raster formats (PNG, JPG).
> If you download an SVG, you MUST convert it to PNG before placing it in `files/assets/`.
> Use `sips` (macOS) or `rsvg-convert` to do the conversion. Never rename `.svg` → `.png`.

## Capability Boundaries

### ✅ POSSIBLE — agent can do these
| Request | Technique |
|---|---|
| Change block/cell shape | Set `shapeType` enum in scene JSON |
| Replace a texture with a custom image | Overwrite `files/assets/<id>/1/<filename>` |
| Different texture per color | Patch `__game-scripts.js` to add per-color texture lookup + create per-color PNG assets |
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
- Color is applied via `material.emissive` — the texture should be **white on transparent** so color tinting works
- **Start/end nodes ALWAYS use `endpoint_circle` frame**, not `block`

### Key lookup chain
```
_paintCellFrame → _createMaterialForGridFrame → _applyGridFrameToCell → _getTextureAssetForFrame(frameName)
  → TEXTURE_ATTR_BY_FRAME[frameName] → attribute name → this[attrName].resource
```

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

**Option C — Generate with Python PIL (if available):**
```python
from PIL import Image, ImageDraw
img = Image.new('RGBA', (256, 256), (0, 0, 0, 0))
draw = ImageDraw.Draw(img)
# Example: white cross on transparent background
draw.rectangle([108, 20, 148, 236], fill=(255, 255, 255, 220))
draw.rectangle([20, 108, 236, 148], fill=(255, 255, 255, 220))
img.save('/tmp/symbol.png')
```

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

If user asks for **different images on different colored blocks/endpoints** (e.g. bird on blue, fire on red):

> **IMPORTANT**: Start/end nodes use `endpoint_circle` frame, NOT `block`.
> If the user wants symbols on the colored endpoint dots, you must patch the
> `endpoint_circle` rendering path — not the `block` path.

### Step-by-Step: Patch `__game-scripts.js` for per-color endpoint textures

#### 1. Create real PNG texture assets (not SVG!)
```bash
# Download PNGs directly from Twemoji — these are already raster format
curl -L "https://raw.githubusercontent.com/twitter/twemoji/master/assets/72x72/1f426.png" -o /tmp/bird.png
curl -L "https://raw.githubusercontent.com/twitter/twemoji/master/assets/72x72/1f525.png" -o /tmp/fire.png

# Resize to 256×256 for better quality (sips is built into macOS)
sips -z 256 256 /tmp/bird.png --out /tmp/bird_256.png
sips -z 256 256 /tmp/fire.png --out /tmp/fire_256.png

# Verify they are valid PNG files
file /tmp/bird_256.png  # must say "PNG image data", not "SVG"
file /tmp/fire_256.png

# Create asset directories and copy
mkdir -p files/assets/283500001/1 files/assets/283500002/1
cp /tmp/bird_256.png files/assets/283500001/1/bird_blue.png
cp /tmp/fire_256.png files/assets/283500002/1/fire_red.png
```

#### 2. Register asset entries in config.json
```python
import json
from pathlib import Path
p = Path('config.json')
cfg = json.loads(p.read_text())
cfg['assets']['283500001'] = {
    'region': 'none', 'filename': 'bird_blue.png', 'type': 'texture',
    'file': {'size': 1, 'hash': 'bird_blue'},
    'data': {'minFilter': 5, 'magFilter': 1, 'anisotropy': 1, 'addressU': 1, 'addressV': 1},
    'url': 'files/assets/283500001/1/bird_blue.png'
}
cfg['assets']['283500002'] = {
    'region': 'none', 'filename': 'fire_red.png', 'type': 'texture',
    'file': {'size': 1, 'hash': 'fire_red'},
    'data': {'minFilter': 5, 'magFilter': 1, 'anisotropy': 1, 'addressU': 1, 'addressV': 1},
    'url': 'files/assets/283500002/1/fire_red.png'
}
p.write_text(json.dumps(cfg, ensure_ascii=False, separators=(',', ':')))
```

#### 3. Add per-color texture attributes to `__game-scripts.js`
Find the line that registers `textureEndpointCircle`:
```
GridRenderer.attributes.add("textureEndpointCircle",{type:"asset",assetType:"texture",title:"Grid endpoint_circle"})
```
Insert per-color endpoint attributes right after it (keep on same line, no newlines):
```js
,GridRenderer.attributes.add("textureEndpointRed",{type:"asset",assetType:"texture",title:"Endpoint (red)"}),GridRenderer.attributes.add("textureEndpointBlue",{type:"asset",assetType:"texture",title:"Endpoint (blue)"})
```

#### 4. Add per-color lookup function
Find `GridRenderer.prototype.initialize=function` and insert this helper **before** it:
```js
GridRenderer.prototype._getPerColorEndpointTexture=function(hex){
  var m={
    "#e24b4a":"textureEndpointRed","#ff0000":"textureEndpointRed","#cc0000":"textureEndpointRed","#e74c3c":"textureEndpointRed",
    "#378add":"textureEndpointBlue","#0000ff":"textureEndpointBlue","#3498db":"textureEndpointBlue","#50aaff":"textureEndpointBlue"
  };
  var h=(hex||"").toLowerCase(),attr=m[h];
  if(attr&&this[attr]&&this[attr].resource)return this[attr].resource;
  return null;
};
```

> **Hex values**: Read `GridRenderer.PATH_COLOR_HEX` from the minified code to get the exact hex values used at runtime. In flow-line-v1: `red:"#E24B4A"`, `blue:"#378ADD"`. Your lookup map MUST include these exact values (lowercased).

#### 5. Patch `_paintCellFrame` to use per-color textures for endpoints
This is the CRITICAL step. Find the `_paintCellFrame` function body.

Locate where it builds the material and applies color:
```js
n.emissive=i,n.update()
```

Insert per-color texture application BEFORE `n.update()`:
```js
var _pcTex=this._getPerColorEndpointTexture(i.toString());if(_pcTex){n.diffuseMap=_pcTex;n.emissiveMap=_pcTex;n.diffuse.set(1,1,1);n.emissive.set(1,1,1)}
```

This replaces the solid color tint with the actual symbol texture when a per-color texture is available. The `emissive.set(1,1,1)` makes the texture show at full brightness instead of being color-tinted.

> **How to verify the patch**: After patching, search for `_getPerColorEndpointTexture` — it must appear at LEAST twice (the definition + the call site). If it only appears once, the call site wasn't inserted.

#### 6. Wire attributes in scene JSON
```python
import json
from pathlib import Path
p = Path('2453710.json')
data = json.loads(p.read_text())
for ent in data['entities'].values():
    sc = ent.get('components', {}).get('script', {}).get('scripts', {})
    if 'gridRenderer' in sc:
        attrs = sc['gridRenderer']['attributes']
        attrs['textureEndpointRed'] = 283500002    # fire
        attrs['textureEndpointBlue'] = 283500001   # bird
p.write_text(json.dumps(data, ensure_ascii=False, separators=(',', ':')))
```

### Verify the patch
```bash
# 1. Check function exists AND is called (must be ≥ 2 occurrences)
grep -o '_getPerColorEndpointTexture' __game-scripts.js | wc -l
# Expected: 2 or more

# 2. Verify texture files are real PNG (not SVG)
file files/assets/283500001/1/*.png  # must say "PNG image data"
file files/assets/283500002/1/*.png

# 3. Verify no JS syntax errors
node -e "eval(require('fs').readFileSync('__game-scripts.js','utf8'))" 2>&1 | head -5
```

### Fallback: One symbol for all endpoints
If per-color is too complex, replace the single `textureEndpointCircle` asset with one symbol that applies to all endpoints. Use white-on-transparent so the runtime color tinting works.

### Also supporting per-color block obstacles
If the user wants per-color textures on **block/obstacle** cells (not endpoints), use the same approach but target `textureBlock` and the `block` frame type.

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
