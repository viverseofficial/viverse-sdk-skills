---
name: viverse-pls-starter-world
description: Use a Polygon Streaming starter-world repo (Medieval Starter 100, dkatz23/PolygonStreamingWorlds) to add streamed buildings to an existing Three.js game — repo access, catalog/scene formats, stream-URL gotchas, per-level layouts, and a stage loading gate driven by model-load.
prerequisites: [Existing Three.js game with one shared StreamController, GitHub access to the starter repo, Node.js 20+, Playwright]
tags: [threejs, polygon-streaming, starter-world, catalog, level-dressing, loading-screen, viverse]
---

# VIVERSE Polygon Streaming Starter World → existing game

A starter-world repo ships a **finished town, a catalog of already-published PLS assets, and a working viewer**. Its own prompt tells an agent to run the town unchanged. This skill covers the other job: **taking assets from that catalog into a different, already-running game** (a tower-defence game with chapters and stages was the proving ground) without a PLS CLI login, re-upload or model regeneration.

Read [viverse-polygon-streaming-threejs](../viverse-polygon-streaming-threejs/) first. It owns the runtime rules (one shared `StreamController`, serialized `addModel`, wrapper events, `cameraTarget`, service worker). This skill assumes them and adds the catalog, level-design and loading-flow layer on top.

## When To Use This Skill

- The user points at a starter-world repository and wants its buildings/props in an existing game's maps.
- The user wants a loading screen that holds each stage until streamed scenery is in.
- You are deciding which levels get which dressing and where objects may stand.

Do not use it to run the starter as-is (follow the repo's own `AGENTS.md`), to upload or convert new models (use [viverse-pls-cli](../viverse-pls-cli/)), or for PlayCanvas.

## 1. Reach the repository

The repo can be private. Do not change visibility, scrape raw links anonymously, or ask for credentials in chat.

1. `gh auth status`. If not signed in, have the user accept the collaborator invitation and run `gh auth login`.
2. Plain `git clone https://…` fails non-interactively (`could not read Username`). Use `gh repo clone`, SSH, or read single files without cloning:

```bash
gh api -H "Accept: application/vnd.github.raw" \
  "repos/OWNER/REPO/contents/public/catalogs/medieval-starter-100.json?ref=BRANCH" > catalog.json
gh api "repos/OWNER/REPO/git/trees/BRANCH%2Fwith-slash?recursive=1" --jq '.tree[].path'   # file list
```

Branch names containing `/` must be URL-encoded in tree calls. Read `AGENTS.md` and `public/agent-guide.md` first; they are the source of truth.

## 2. What is in the repo (Medieval Starter 100)

| File | What it gives you |
|---|---|
| `public/catalogs/medieval-starter-100.json` | 100 assets: 35 buildings, 25 environment, 30 props, 10 transport |
| `public/scenes/starter-village.json` | Saved town: 245 placements, 77 distinct assets, 65 enabled |
| `public/scenes/town-environment.json.gz` | Finished terrain/roads/trees as `THREE.ObjectLoader` data (not needed to reuse assets) |
| `public/src/town-viewer.mjs` | The reference loader (`StreamController` + `model-load` fitting) |
| `public/gallery.html` | Thumbnail browser; "copy asset reference" for later edits |

**Catalog entry:** `id`, `groupId`, `name`, `category`, `thumb`, `size` `[w, h, d]` in metres (right-handed, Y-up), `streamUrl`.

**Scene placement:** `instanceId` (unique), `assetId`, `enabled`, `position`, `quaternion` `[x,y,z,w]`, `scale`, `fitAxis` (`height` | `length`) with `targetHeight`/`targetLength`. A `null` scale means "never fitted yet": fit once from the load event, then keep it.

The starter's rule "preserve exact transforms, never re-normalize" applies **inside the starter scene**. In another game you place objects yourself and fit each one once (see the pattern file).

## 3. Stream URLs: the gotcha that costs an hour

Catalog `streamUrl` is folder-style: `https://stream.viverse.com/polygon_file/<groupId>/<assetId>/`.

- A bare GET of that folder returns **403 AccessDenied**. That does not mean the asset is unpublished.
- `<streamUrl>model.xrg` returns **200** (`binary/octet-stream`). A building is roughly 7–15 MB at full quality.
- The SDK skips its folder-existence probe only for URLs that end in `.xrg` / `.sxrweb`, so **pass the explicit `model.xrg` URL**.
- Check availability with `HEAD …/model.xrg` (200). Do not substitute a different asset when one is missing; report it.

The starter pins Three.js 0.185.1 / PLS 2.9.2. A game on `@polygon-streaming/web-player-threejs` 2.9.0-beta.2 streamed the catalog's buildings fine with explicit `model.xrg` URLs, so a version bump is not required just to reuse them (only buildings were exercised; test environment/props before relying on them).

## 4. Adopt the assets (summary)

Full code in [patterns/adopt-buildings-into-a-game.md](./patterns/adopt-buildings-into-a-game.md).

1. **Data file, not code:** a `villageLayouts` module with the asset table (`assetId`, catalog `size`) and per-mode placement lists. Behaviour lives in a separate kit.
2. **One anchor + one fit group per building.** The anchor carries position and yaw. The stream fills the inner fit group, which stays hidden until `model-load`, then is scaled to `catalog height × placement scale` from `event.boundingBox`, centred on x/z, and grounded on `minY`.
3. **Load one at a time**, low initial detail (`initialTrianglePercent ≈ 0.02`), `castShadows: false`.
4. **Map levels to layouts by mode, not by stage number.** The game had only two physical layouts (front corridor for stages 1–3, four-gate siege for 4–10); each gets its own placement list, created the first time it is shown.
5. **Hide, never remove.** The shared session routes events by `modelIndex`; removing models shifts those indices. Toggle `visible` when the mode changes.
6. **Keep gameplay readable.** Express keep-out rules (enemy lanes, keep ring, emplacements, island rim, terrace edges) as **unit tests over the layout data**, and feed the same footprints as exclusion zones to any procedural vegetation or skyline so nothing grows through a building.
7. **Budget.** 12–16 buildings per layout was comfortable; each is 7–15 MB at full quality and shares one triangle budget with the rest of the scene.

## 5. Stage loading gate (summary)

Full code in [patterns/stage-loading-gate.md](./patterns/stage-loading-gate.md).

- The success signal is **`EVENT_MODEL_LOAD` (`"model-load"`)** and the failure signal is `EVENT_MODEL_LOAD_ERROR` (`"model-load-error"`) on the shared controller. Not `"model-loaded"` (an internal event) and not only the `onModelLoaded` callback. The event means *usable and bounded*, not *fully refined*; there is no separate "fully refined" event.
- Gate at the start of **every** stage/wave, keyed on **readiness**, not on "first wave": if the active layout is already settled, proceed **synchronously** with no overlay (no flash, existing timing and tests unchanged).
- A failed building counts as settled. One unpublished asset must never block a stage.
- **Timeout** (20 s was chosen): start the stage anyway and keep streaming in the background.
- **Cancel** on reset or when a newer wave starts. Hide the overlay synchronously in `cancel`, and let the late promise `then` check it is still the current handle so it cannot hide a newer overlay.
- Progress is **bursty**: the SDK completes the initial batch together, so the count may jump 0 → N. Add a sweep animation on `transform` (compositor-driven) so the screen never looks frozen while the main thread decodes.

## 6. Verify without trusting a background tab

See [patterns/verification-recipes.md](./patterns/verification-recipes.md). Short version: drive a **dedicated headless Chromium** (software GL flags), not a shared browser tab, and prove four cases: normal start, a stage whose layout is not loaded yet, stalled streaming (timeout), and failed assets.

## Gotchas

- Folder `streamUrl` 403 ≠ unpublished; use `…/model.xrg`.
- `model-loaded` ≠ `model-load`. Listening to the wrong one makes the loading screen hang on a model that already loaded.
- Catalog `size` is the **fitted** size. Fit from the load event's bounding box, scaled to the catalog height, and never show the raw geometry before that (it appears at arbitrary scale).
- Treat catalog fronts as facing +Z when computing yaw, then **check each asset visually**. Turn individual buildings by hand where the assumption is wrong.
- Terrace/step geometry: a building must stand wholly on one surface. Test corners, not only the centre.
- Portrait/mobile cameras show only the edge buildings; judge density from the landscape and overview views.
- Do not mutate or copy the starter's `town-environment.json.gz` into another game; reuse assets, not the finished landscape.
- Temporary debug handles (for example a global scene reference used to place the camera) must be removed before committing.

## Verification Checklist

- [ ] `HEAD …/model.xrg` is 200 for every asset used; unavailable ones are reported, not swapped
- [ ] Explicit `model.xrg` URLs are passed to `addModel`
- [ ] One shared `StreamController`; buildings load one at a time
- [ ] Each building is hidden until `model-load`, then fitted once from `event.boundingBox`
- [ ] Layout tests: lanes, keep ring, emplacements, island rim, overlap, terrace edges
- [ ] Vegetation/skyline exclusion zones cover every footprint
- [ ] Gate keyed on readiness; settled layouts proceed synchronously
- [ ] Failed buildings count as settled; timeout starts the stage; cancel hides the overlay
- [ ] Loading text translated in every shipped locale
- [ ] Headless runs cover normal, not-yet-loaded layout, stalled and failed streaming
- [ ] Temporary debug hooks removed
