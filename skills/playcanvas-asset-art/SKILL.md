---
name: playcanvas-asset-art
description: Replace, fetch, and process texture/image assets in static PlayCanvas templates
prerequisites: [PlayCanvas static template workspace, sips available (macOS), Python PIL available]
tags: [playcanvas, texture, image, asset, art, symbol, overlay, sprite]
---

# PlayCanvas Asset & Art Skill

Use this skill when the user request involves visual/art changes in a **compiled static PlayCanvas template** (flow-line-v1, starter-kit-racing-v1, etc.) — such as changing textures, adding symbols, overlaying images, or swapping sprites.

## Critical Rules

> **SVG files CANNOT be used as PlayCanvas textures.**
> PlayCanvas loads textures via WebGL which requires raster formats (PNG, JPG).
> If you download an SVG, you MUST convert it to PNG before placing it in `files/assets/`.
> Use `sips` (macOS) or `rsvg-convert` to do the conversion. Never rename `.svg` → `.png`.

> **Python PIL/Pillow IS available.**
> `python3 -c "from PIL import Image"` works. Use PIL to generate custom textures
> when the pre-bundled symbol library doesn't have what the user wants.

> **NEVER modify global texture attributes in `2453710.json`.**
> The attributes `textureBlock`, `textureEndpointCircle`, `textureCellEmpty`,
> `texturePipeStraight`, `texturePipeCorner` are GLOBAL defaults that affect ALL cells
> of that type. Changing them breaks the entire game visually.
> For per-color customization, use ONLY the pre-wired per-color attributes
> (`textureEndpointRed`, `textureBlockRed`, etc.) — these are already wired in the scene JSON.
> **You do NOT need to modify `2453710.json` or `config.json` at all.**

## flow-line-v1 Game Terminology

| In-game element | Frame type | What it does | User might call it |
|---|---|---|---|
| **Start/end nodes** | `endpoint_circle` | Colored circles marking where paths begin/end. Each color pair must be connected. | "colored blocks", "start blocks", "end dots", "color blocks" |
| **Obstacle/cross cells** | `block` | X-shaped or solid cells that CANNOT be filled by paths. Not color-coded. | "cross", "X", "wall", "blocker" |
| **Path segments** | `pipe_straight` / `pipe_corner` | The lines the player draws to connect endpoints. | "pipes", "lines", "path" |
| **Empty cells** | `cell_empty` | Unfilled grid cells the player can draw through. | "empty", "blank" |

> When the user says "change the color blocks" or "change colored blocks", they mean
> **start/end nodes** (`endpoint_circle`), NOT obstacles (`block`). The "color" in
> "color block" refers to the path color (red, blue, green...), not the block shape.

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

If user asks for **different images on different colored endpoints** (e.g. bird on blue, fire on red):

> **The template already has per-color endpoint support built in.**
> `__game-scripts.js` has `_getPerColorEndpointTexture()` and attributes
> `textureEndpointRed`, `textureEndpointBlue`, `textureEndpointGreen`,
> `textureEndpointYellow`, `textureEndpointPurple`, `textureEndpointTeal`.
> 
> **DO NOT modify `2453710.json` or `config.json`.** Everything is already wired.
> **DO NOT touch `textureBlock` or `textureEndpointCircle`** — these are globals.
> Just:
> 1. Copy/generate PNG images
> 2. Place them at the pre-wired asset paths (see table below)
> 3. That's ALL. Nothing else.

### Step-by-Step: Per-Color Endpoint Textures (NO script patching needed)

> **Everything is pre-wired.** The template already has placeholder white PNGs at
> the correct asset paths, registered in config.json, and wired in the scene JSON.
> You ONLY need to copy symbol PNGs from the built-in symbol library.

#### Symbol Library (pre-bundled — use these!)

The template includes ready-to-use symbol PNGs at `files/assets/symbol_library/`:

| File | Shape | Good match for |
|---|---|---|
| `bird.png` | Bird silhouette | bird, dove, eagle, animal |
| `flame.png` | Flame / fire | fire, hot, burn |
| `star.png` | 5-pointed star | star, gold, award |
| `heart.png` | Heart | heart, love, life |
| `diamond.png` | Diamond / rhombus | diamond, gem, jewel |
| `cross.png` | Plus / cross | cross, plus, medical |
| `moon.png` | Crescent moon | moon, night, dark |
| `lightning.png` | Lightning bolt | lightning, thunder, electric, energy |
| `circle_ring.png` | Circle ring | circle, ring, portal |
| `triangle.png` | Triangle | triangle, arrow, pyramid |

These are 256×256 RGBA PNGs with **white symbol on gray background** (gray=0.6).
The rendering engine multiplies this texture by the block's emissive color, so:
- **White areas (symbol) → full color brightness** (symbol stands out)
- **Gray areas (background) → dimmer color** (still shows the color, just darker)

#### 1. Copy symbol from library to the correct asset path

```bash
# Example: bird on blue endpoints, fire on red endpoints
cp files/assets/symbol_library/bird.png files/assets/283500002/1/endpoint_blue.png
cp files/assets/symbol_library/flame.png files/assets/283500001/1/endpoint_red.png

# Also copy to block paths so both endpoints AND path blocks show the symbol
cp files/assets/symbol_library/bird.png files/assets/283500012/1/block_blue.png
cp files/assets/symbol_library/flame.png files/assets/283500011/1/block_red.png

# VERIFY
file files/assets/283500002/1/endpoint_blue.png   # must say "PNG image data"
file files/assets/283500001/1/endpoint_red.png
```

That's it. **No config.json edits. No scene JSON (2453710.json) edits. No script patching. No downloading required.**

> ⚠️ **CRITICAL**: Do NOT modify `textureBlock` or `textureEndpointCircle` attributes
> in `2453710.json`. Those are GLOBAL textures. Changing them breaks ALL cells of that type.
> The per-color attributes (`textureEndpointRed`, `textureBlockRed`, etc.) are SEPARATE
> and already wired. You only need to overwrite the PNG files at the paths above.

#### Mapping user requests to library symbols

When the user says something like "bird on blue, fire on red":
1. Find the closest symbol in the library table above
2. `cp files/assets/symbol_library/<symbol>.png files/assets/<endpoint_id>/1/<endpoint_file>.png`
3. `cp files/assets/symbol_library/<symbol>.png files/assets/<block_id>/1/<block_file>.png`

If the user requests a symbol NOT in the library (e.g. "skull", "tree"):
1. **Best**: Generate with Python PIL (white shape on gray `(153,153,153)` background, 256×256 RGBA)
2. **Alt**: `curl` from Twemoji: `curl -L "https://raw.githubusercontent.com/twitter/twemoji/master/assets/72x72/<codepoint>.png" -o /tmp/symbol.png` then `sips -z 256 256`

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
> Only overwrite colors the user mentions. Untouched placeholders (all-white) have no visible effect — the block looks normal.

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

> **Which to use?** If the user says "change the colored dots/circles/start/end" or
> "change color blocks" → use `textureEndpoint*` (these are the colored start/end nodes).
> If they specifically say "change obstacle blocks" or "change the X/cross cells" → use `textureBlock*`.
> When in doubt, "color blocks" = start/end nodes = `textureEndpoint*`.

> ⚠️ **IMPORTANT**: These per-color attributes are ALREADY WIRED in `2453710.json`.
> Do NOT modify `2453710.json` to change attribute values.
> Do NOT reassign `textureBlock` or `textureEndpointCircle` to per-color asset IDs.
> Just overwrite the PNG files at the pre-wired paths listed above.

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
