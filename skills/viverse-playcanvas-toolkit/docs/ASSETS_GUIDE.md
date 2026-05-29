# Assets Architecture Guide

This document explains how to organize and use assets in the toolkit packages.

## Directory Structure

Each package follows this assets organization:

```
packages/{package-name}/
├── public/assets/         # Toolkit assets (models, textures, audio, etc.)
│   ├── models/
│   ├── textures/
│   └── audio/
├── src/assets/            # Small files, bundled with the code
│   ├── icons/
│   ├── images/            # Only for small size images
│   └── fonts/
└── src/
```

## Build and Distribution Flow

### Toolkit Build Process

1. **Package Build**: Each package builds its `dist` folder containing:
   - Compiled JavaScript modules (`index.js`)
   - Assets from `public/assets/` (copied to `dist/assets/` by Vite)

2. **Extension Integration**: During Extension build (`pnpm build:extension`):
   - The `copy-dist.mjs` script collects all `packages/*/dist` outputs
   - Toolkit scripts are copied to `apps/editor-extension/public/toolkit/*.mjs`
   - Toolkit assets are copied to `apps/editor-extension/public/toolkit/assets/{package-name}/`
   - A `toolkit-structure.json` is generated to track the file structure

3. **Runtime Upload**: When Extension initializes in PlayCanvas Editor:
   - `ViverseToolkitService` reads `toolkit-structure.json`
   - All Toolkit scripts and assets are uploaded to PlayCanvas Editor's `.viverse/toolkit/` folder
   - Assets become available as PlayCanvas Editor assets

## Usage Guidelines

### 🌐 Public Assets (`public/assets/`)

**Purpose:** Toolkit assets (3D models, textures, audio files) that are bundled with the Extension and uploaded to PlayCanvas Editor.

**Build Process:**

- Vite copies `public/assets/` to `dist/assets/` during package build
- `copy-dist.mjs` flattens and organizes these assets into Extension's `public/toolkit/assets/{package-name}/`
- `ViverseToolkitService` uploads them to PlayCanvas Editor at runtime

**Best for:** 3D models, large textures, videos, audio files.

**Usage:**

All paths to public assets **must** be resolved at runtime using the central `resolveAssetPath` function from the `@viverse/config` package. This function resolves assets from the PlayCanvas Editor's asset system.

```typescript
import { resolveAssetPath } from '@viverse/config';

// Correct way to get a URL for a large asset
// The first argument is the short name of the current package.
const modelUrl = resolveAssetPath('local-player', '/avatars/character.vrm');
const textureUrl = resolveAssetPath('local-player', '/textures/environment.jpg');
```

**Note:** The `packageName` parameter is currently kept for API compatibility but is not used in the resolution logic, as all assets are now resolved from the Editor's asset system.

### 📦 Source Assets (`src/assets/`)

**Purpose:** Small files that are imported directly into the source code and bundled by Vite.

**Build Process:** Processed by Vite, which may include optimization, hashing, or inlining.

**Best for:** Icons, small images, fonts, CSS assets.

**Usage:**

```typescript
// Small assets can be imported directly
import logoImage from './assets/logo.png';
import iconSprite from './assets/icons.svg';

// These imports return a processed URL, e.g., /assets/logo-abc123.png
console.log(logoImage);
```

## Asset Resolution

### Editor Asset Resolution

The Toolkit uses **localized assets** that are uploaded to PlayCanvas Editor. The `resolveAssetPath` function:

1. **Always uses Editor mode**: All assets are resolved from PlayCanvas Editor's asset system
2. **Finds assets by filename**: Uses `pcApp.assets.find()` to locate assets
3. **Handles GLB conversion**: Automatically converts `.glb` to `.glb.bin` for Editor compatibility
4. **Returns Editor URLs**: Returns the asset URL from the Editor's context

```typescript
// resolveAssetPath implementation (simplified)
export function resolveAssetPath(packageName: string, relativePath: string): string {
  // Always resolve from Editor assets
  return getAssetPathFromEditor(relativePath);
}
```

### VIVERSE PlayCanvas Toolkit Initialization

The consuming application (PlayCanvas Extension) initializes the Toolkit by:

1. **Uploading Toolkit assets**: `ViverseToolkitService.uploadToolkitScripts()`, `ViverseToolkitService.uploadToolkitAssets()` uploads all Toolkit scripts and assets to `.viverse/toolkit/`
2. **Setting runtime config**: Calls `setViverseEnv()` to configure SDK URLs and other runtime settings
3. **No CDN dependency**: All Toolkit resources are local to the Extension and Editor project

This setup ensures that Toolkit assets are **completely self-contained** within the Extension build, enabling full offline functionality and customization by open-source contributors.
