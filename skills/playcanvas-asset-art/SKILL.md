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

If user asks for **different images on different colored endpoints** (e.g. bird on blue, fire on red):

> **The template already has per-color endpoint support built in.**
> `__game-scripts.js` has `_getPerColorEndpointTexture()` and attributes
> `textureEndpointRed`, `textureEndpointBlue`, `textureEndpointGreen`,
> `textureEndpointYellow`, `textureEndpointPurple`, `textureEndpointTeal`.
> You do NOT need to patch `__game-scripts.js`. Just:
> 1. Download real PNG images
> 2. Place them in `files/assets/<id>/1/`
> 3. Register in `config.json`
> 4. Wire the attribute in `2453710.json`

### Step-by-Step: Per-Color Endpoint Textures (NO script patching needed)

> **Everything is pre-wired.** The template already has placeholder white PNGs at
> the correct asset paths, registered in config.json, and wired in the scene JSON.
> You ONLY need to download real PNGs and overwrite the placeholder files.

#### 1. Download real PNG images and overwrite placeholders
```bash
# Use curl to download from Twemoji (pre-rendered PNG, no conversion needed)
# Bird U+1F426, Fire U+1F525, Star U+2B50, Tree U+1F332, Lightning U+26A1
# Format: https://raw.githubusercontent.com/twitter/twemoji/master/assets/72x72/<codepoint>.png

# Example: bird on blue endpoints, fire on red endpoints
curl -L "https://raw.githubusercontent.com/twitter/twemoji/master/assets/72x72/1f426.png" -o /tmp/bird.png
curl -L "https://raw.githubusercontent.com/twitter/twemoji/master/assets/72x72/1f525.png" -o /tmp/fire.png

# Resize to 256x256
sips -z 256 256 /tmp/bird.png --out files/assets/283500002/1/endpoint_blue.png
sips -z 256 256 /tmp/fire.png --out files/assets/283500001/1/endpoint_red.png

# VERIFY they are real PNG
file files/assets/283500002/1/endpoint_blue.png   # must say "PNG image data"
file files/assets/283500001/1/endpoint_red.png
```

That's it. No config.json edits. No scene JSON edits. No script patching.

#### Pre-wired asset paths (just overwrite these files)

| Color | Endpoint asset path | Block asset path |
|---|---|---|
| red | `files/assets/283500001/1/endpoint_red.png` | `files/assets/283500011/1/block_red.png` |
| blue | `files/assets/283500002/1/endpoint_blue.png` | `files/assets/283500012/1/block_blue.png` |
| green | `files/assets/283500003/1/endpoint_green.png` | `files/assets/283500013/1/block_green.png` |
| yellow | `files/assets/283500004/1/endpoint_yellow.png` | `files/assets/283500014/1/block_yellow.png` |
| purple | `files/assets/283500005/1/endpoint_purple.png` | `files/assets/283500015/1/block_purple.png` |
| teal | `files/assets/283500006/1/endpoint_teal.png` | `files/assets/283500016/1/block_teal.png` |

> **Which to overwrite?** If user says "change the colored dots/start/end" → overwrite `endpoint_*.png`.
> If "blocks/walls" → overwrite `block_*.png`. If ambiguous → overwrite both with same image.
> Only overwrite colors the user mentions. Untouched placeholders show as white (invisible).

### Color → Attribute Mapping

The template has pre-built per-color attributes for both **endpoints** (start/end nodes) and **blocks** (obstacles on the path). Wire the right one based on what the user wants to change.

#### Endpoint attributes (start/end colored dots)
| Color key | Hex (from PATH_COLOR_HEX) | Attribute name |
|---|---|---|
| red | #E24B4A | `textureEndpointRed` |
| blue | #378ADD | `textureEndpointBlue` |
| green | #639922 | `textureEndpointGreen` |
| yellow | #BA7517 | `textureEndpointYellow` |
| purple | #7F77DD | `textureEndpointPurple` |
| teal | #17A589 | `textureEndpointTeal` |

#### Block attributes (obstacles/walls)
| Color key | Attribute name |
|---|---|
| red | `textureBlockRed` |
| blue | `textureBlockBlue` |
| green | `textureBlockGreen` |
| yellow | `textureBlockYellow` |
| purple | `textureBlockPurple` |
| teal | `textureBlockTeal` |

> **Which to use?** If the user says "change the colored dots/circles/start/end" → use `textureEndpoint*`. If they say "change blocks/walls/obstacles" → use `textureBlock*`. If ambiguous (e.g. "color blocks"), use **both** `textureEndpoint*` AND `textureBlock*` with the same images.

### Fallback: One symbol for all endpoints
If the user just wants one symbol on all endpoints, replace the `textureEndpointCircle` asset directly instead of using per-color attributes. For one symbol on all blocks, replace the `textureBlock` asset.

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
