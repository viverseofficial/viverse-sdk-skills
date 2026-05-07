---
name: playcanvas-asset-art
description: Replace, fetch, and process texture/image assets in static PlayCanvas templates
prerequisites: [PlayCanvas static template workspace, sips or Python PIL available]
tags: [playcanvas, texture, image, asset, art, symbol, overlay, sprite]
---

# PlayCanvas Asset & Art Skill

Use this skill when the user request involves visual/art changes in a **compiled static PlayCanvas template** (flow-line-v1, starter-kit-racing-v1, etc.) — such as changing textures, adding symbols, overlaying images, or swapping sprites.

## Capability Boundaries

### ✅ POSSIBLE — agent can do these
| Request | Technique |
|---|---|
| Change block/cell shape | Set `shapeType` enum in scene JSON |
| Replace a texture with a custom image | Overwrite `files/assets/<id>/1/<filename>` |
| Fetch a symbol/icon from the web | `curl` from Iconify, SVG CDN, or public PNG |
| Resize/convert an image | `sips` (macOS built-in) or `python3 PIL` |
| Add a watermark or logo overlay | Composite with `python3 PIL` or `sips` |
| Change background/UI colors | Edit `styles.css` or `__settings__.js` |

### ❌ NOT POSSIBLE — compiled script is immutable
| Request | Why blocked |
|---|---|
| Different texture per color (bird on blue, fire on red) | Requires logic in `__game-scripts.js` — immutable |
| Add new script components | Compiled bundle — cannot add new scripts |
| Per-entity custom shaders | Compiled engine — no runtime shader injection |

When the user requests something in the ❌ list, explain the limitation and offer the closest ✅ alternative.

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

**Option A — Iconify SVG (best for symbols/icons):**
```bash
# Available icons: https://icon-sets.iconify.design/
# Format: https://api.iconify.design/<prefix>/<icon>.svg?width=128&height=128&color=%23ffffff
curl -L "https://api.iconify.design/mdi/bird.svg?width=128&height=128&color=%23ffffff" -o /tmp/symbol.svg
# Convert SVG to PNG using rsvg-convert (if available) or Python cairosvg
python3 -c "
import subprocess, sys
subprocess.run(['rsvg-convert', '-w', '128', '-h', '128', '-o', '/tmp/symbol.png', '/tmp/symbol.svg'], check=True)
"
```

**Option B — Direct PNG from public CDN (simpler):**
```bash
# Use a transparent-background PNG that fits the slot
curl -L "https://raw.githubusercontent.com/twitter/twemoji/master/assets/72x72/1f426.png" -o /tmp/symbol.png
```

**Option C — Generate a simple symbol with Python PIL:**
```python
from PIL import Image, ImageDraw
img = Image.new('RGBA', (128, 128), (0, 0, 0, 0))
draw = ImageDraw.Draw(img)
# Draw a cross/plus
draw.rectangle([54, 10, 74, 118], fill=(255, 255, 255, 220))
draw.rectangle([10, 54, 118, 74], fill=(255, 255, 255, 220))
img.save('/tmp/symbol.png')
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

If user asks for **different images on different colored blocks** (e.g. bird on blue, fire on red):

1. Acknowledge the limitation first:
   > "This template uses a single texture slot for all block cells — per-color custom textures would require modifying the compiled game script, which is locked. I can apply one symbol to all blocks, or change the block shape instead."

2. Then ask (or infer from context) which alternative they prefer:
   - **One symbol on all blocks** → fetch image + swap texture asset
   - **Shape change** → update shapeType enum

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
- [ ] No immutable files (`__game-scripts.js`, `__modules__.js`, etc.) were modified
