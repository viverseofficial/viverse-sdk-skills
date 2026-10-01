# Adopt starter-catalog buildings into an existing game

Reference implementation: Bastion Archer (`template-sources/bastion-archer/app/src/scene/villageLayouts.js`, `VillageKit.js`, `SceneBuilder.js`, `GroundKit.js`, `SkylineKit.js`). The snippets below are the reusable shape, not a drop-in copy.

## 1. Layout data (no behaviour)

```js
const GROUP_ID = '<groupId from the catalog>';

export const VILLAGE_ASSETS = {
  // name: { assetId, size: [w, h, d] }   <- catalog `size`, metres
  smokehouse_stone: { assetId: '<catalog id>', size: [3.78, 4, 3.42] },
};

export function getVillageStreamUrl(name) {
  const asset = VILLAGE_ASSETS[name];
  // explicit model.xrg: the folder URL 403s and the SDK only skips its existence probe for .xrg
  return asset ? 'https://stream.viverse.com/polygon_file/' + GROUP_ID + '/' + asset.assetId + '/model.xrg' : null;
}

export const VILLAGE_LAYOUTS = {
  front:    [{ id: 'front-smokehouse-r3', asset: 'smokehouse_stone', x: 19.7, z: -8.5, rotY: -90 }],
  cardinal: [{ id: 'card-ne-well', asset: 'well_house_roofed', x: 21.5, z: -21.5, facing: [0, 0] }],
};

// Models are assumed to face +Z; `facing: [x, z]` turns a building toward a ground point.
export function getVillageYawDeg(p) {
  return Array.isArray(p.facing)
    ? (Math.atan2(p.facing[0] - p.x, p.facing[1] - p.z) * 180) / Math.PI
    : p.rotY ?? 0;
}

// Axis-aligned half extents after yaw: used by tests and exclusion zones.
export function getVillageHalfExtents(p) {
  const [w, , d] = VILLAGE_ASSETS[p.asset].size;
  const yaw = (getVillageYawDeg(p) * Math.PI) / 180;
  const c = Math.abs(Math.cos(yaw)), s = Math.abs(Math.sin(yaw)), k = p.scale ?? 1;
  return { x: ((w * c + d * s) * k) / 2, z: ((w * s + d * c) * k) / 2 };
}

export function getVillageExclusions(mode, margin = 1.4) {
  return (VILLAGE_LAYOUTS[mode] || []).map(p => {
    const [w, , d] = VILLAGE_ASSETS[p.asset].size;
    return { x: p.x, z: p.z, r: (Math.max(w, d) * (p.scale ?? 1)) / 2 + margin };
  });
}
```

## 2. The kit: anchor + fit group, serial loading, fit once

```js
export function createVillage({ session, layout, heightAt = () => 0, parent = null }) {
  const group = new THREE.Group();
  parent?.add(group);

  const entries = layout.map(placement => {
    const anchor = new THREE.Group();                       // position + yaw only
    anchor.position.set(placement.x, placement.y ?? heightAt(placement.x, placement.z), placement.z);
    anchor.rotation.y = THREE.MathUtils.degToRad(getVillageYawDeg(placement));
    const fit = new THREE.Group();                          // the stream fills this
    fit.visible = false;                                    // raw geometry is at arbitrary scale
    anchor.add(fit);
    group.add(anchor);
    return { placement, fit, state: 'pending' };
  });

  function place(entry, event) {
    const b = event.boundingBox;                            // { minX, maxX, minY, ... } from model-load
    const rawHeight = b.maxY - b.minY;
    if (!(rawHeight > 0)) return fail(entry, new Error('stream reported no bounds'));
    const target = VILLAGE_ASSETS[entry.placement.asset].size[1] * (entry.placement.scale ?? 1);
    const k = target / rawHeight;
    entry.fit.scale.setScalar(k);
    entry.fit.position.set(-((b.minX + b.maxX) / 2) * k, -b.minY * k, -((b.minZ + b.maxZ) / 2) * k);
    entry.fit.visible = true;                               // only now
    entry.state = 'loaded';
  }

  // one request in flight; the next starts when the previous addModel promise settles
  function next() {
    const entry = entries[cursor++];
    session.addModel(getVillageStreamUrl(entry.placement.asset), entry.fit, {
      initialTrianglePercent: 0.02,                         // keep the shared triangle budget for the castle/enemies
      castShadows: false,
      onLoad: e => place(entry, e),                         // wrapper `model-load`
      onError: err => fail(entry, err),                     // wrapper `model-load-error`
    }).then(advance, err => { fail(entry, err); advance(); });
  }
  // ... start(), progress(), whenSettled() - see stage-loading-gate.md
}
```

`session.addModel` here is the project's wrapper around the shared controller that maps `model-load` / `model-load-error` back to the owner by `modelIndex`. Keep that routing.

## 3. Layouts per mode, hide never remove

```js
_syncVillage(mode) {
  const key = mode === 'cardinal' ? 'cardinal' : 'front';
  this._villages ||= {};
  if (!this._villages[key] && getVillageLayout(key).length) {
    this._villages[key] = createVillage({
      session: getScenePolygonStreaming(ctx),
      layout: getVillageLayout(key),
      heightAt: key === 'front' ? (x, z) => terraceHeightAt(x, z, true) : () => 0,
      parent: this.scene,
    });
  }
  for (const [k, v] of Object.entries(this._villages)) v.setVisible(k === key);   // toggle, don't unload
}
```

Why hide, not remove: the shared session maps events by `modelIndex`, and the SDK splices its model list on removal, which shifts indices under live owners.

## 4. Keep-out rules as tests, not as eyeballing

Encode these on the layout data so a layout edit cannot silently break gameplay:

| Rule | Check |
|---|---|
| Not in an enemy lane | for each lane, `abs(across) - reach >= laneHalfWidth` when `along > 0` |
| Not on the keep ring | nearest footprint corner >= keep-clear radius |
| Inside the playable bowl | farthest corner <= the skyline's outer-rim radius |
| Clear of gameplay objects | >= N m from each emplacement/objective position |
| No building overlaps | AABB test using `getVillageHalfExtents` |
| Stands on one surface | `terraceHeightAt(corner)` equals `terraceHeightAt(centre)` for all four corners |
| Budget | `layout.length <= 20` |

Then reuse the same footprints as **exclusion zones** for procedural content: pass `exclusions: [{x, z, r}]` to the vegetation scatter (reject samples inside) and to the skyline/rock scatter (`Math.hypot(x - zone.x, z - zone.z) < zone.r + radius * 0.5` means skip). Without this, trees and rock pillars grow through buildings.

## 5. Deciding which levels get what

1. Read how the game actually builds levels. Here ten stages in six chapters shared only **two physical layouts**; stage differences were fog/ambient/sun colours.
2. Group by layout, not by story chapter, then add story fit as a tie-breaker (early stages: the settlement being defended; mid-game: quadrants between roads; the final stage: intact houses worth rebuilding).
3. Keep gameplay anchors free (named emplacements, objective positions, squad spots) and write them into the tests above.
4. Start with the lowest-risk layout (first levels), prove the PLS path end to end, then extend.

## Known limits

- Portrait cameras show only edge buildings.
- Both layouts stay in memory once shown (they are hidden, not unloaded).
- Per-stage variants (intact, burning, ruined) and objective-centred hamlets were not built.
