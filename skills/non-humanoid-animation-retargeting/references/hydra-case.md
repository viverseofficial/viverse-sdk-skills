# Tested case: Hydra from Dragon + Snake sources

This optional case records the October 2, 2026 workflow. The example project is
`../three-kingdoms-mobile-prototype` relative to the `viverse-sdk-skills`
repository root. It is not bundled or required. Script names, bone IDs, timing,
voxel resolution and numerical thresholds are specific to that project.

## Source evidence

The project inspected Mesh2Motion's live animation library and pinned its app
assets to revision `79f3f61a9852ef70234a5a4a7c13ed87f7a71833`:

- [Official app repository](https://github.com/Mesh2Motion/mesh2motion-app)
- [Official asset repository](https://github.com/Mesh2Motion/mesh2motion-assets)
- [Pinned Dragon GLB](https://raw.githubusercontent.com/Mesh2Motion/mesh2motion-app/79f3f61a9852ef70234a5a4a7c13ed87f7a71833/static/animations/dragon-animations.glb)
- [Pinned Snake GLB](https://raw.githubusercontent.com/Mesh2Motion/mesh2motion-app/79f3f61a9852ef70234a5a4a7c13ed87f7a71833/static/animations/snake-animations.glb)

The inspected Dragon supplied Idle and Walk, plus flight/rest clips; it had no
Bite, Hit, Death or breath attack. Snake supplied Bite, Idle, Hit and Death.
These were finished authored animations, not evidence of AI-generated creature
motion. The saved provenance identifies these Snake/Dragon assets as CC0;
other repository assets have their own licenses. Recheck the selected asset's
license and contents when using another version.

See the project files `MESH2MOTION_HYDRA_RESEARCH.md`,
`artifacts/mesh2motion-research/provenance.json` and
`artifacts/mesh2motion-dragon/provenance.json` for the original evidence.

## What failed and what changed

1. **Neck-only animation:** Death left the torso and feet static. A new rig used
   the actual mesh volume for torso, four limbs, curled tail and nine neck
   chains. Geodesic weights and volumetric torso seeds addressed belly/hip
   leakage. This was a skinning and rig-coverage problem, not a need to turn the
   neck farther. The accepted static mesh, normals, UVs and 2K textures survived.
2. **Hybrid body motion:** Dragon body/foot/tail motion was transferred to the
   target. Foot targets used target limb proportions and measured knee planes;
   tail contact was corrected locally. The accepted full-body Death was kept,
   because the Dragon source had no Death to transfer.
3. **Backward Bite:** Tangent-only mapping left a large roll ambiguity, while
   delta rotations overbent the target's already-forward neck. Mapping the
   source direction field through target anatomical forward/up frames, keeping
   fixed segment lengths and blending with Idle, made windup-to-strike snout
   travel positive. Bite and five Sequence events were checked; Walk and Death
   track payloads remained byte-identical. The rigid skull followed the last
   neck's world frame in this target; independent jaw motion was still absent.
4. **False paired contacts:** Searching any prop vertex could align the handle.
   Searching any source time could align a backswing behind the hero. The final
   pair calibration restricted source stroke phases, used the distal club end,
   required forward reach and checked XYZ gap. Root displacement was extracted
   through the pelvis hierarchy rather than assuming a local X axis.

## Reproducible implementation

From the example project root, after installing its documented dependencies:

```sh
# Check saved hybrid and bite-direction regression evidence.
npm --prefix model-review run test:tripo-hydra-hybrid
npm --prefix model-review run test:hydra-bite-direction
# Check shared-scene sampling and protected source tracks.
npm --prefix model-review run test:paired-review
```

Read implementation before rebuilding; the scripts consume project-specific
landmark files and cached analysis. Useful entry points:

| Area | Project-relative path |
| --- | --- |
| 3D volume rig / skin | `art/tripo-animation-v2/README.md` and adjacent Python scripts |
| Full-body source adaptation | `model-review/scripts/rig-tripo-hydra-v2.mjs` |
| Dragon/Snake composition | `model-review/scripts/build-hydra-dragon-hybrid.mjs` |
| Bite-only correction | `model-review/scripts/fix-hydra-bites.mjs` |
| Direction evidence | `artifacts/hydra-bite-direction/report.md` and `audit.mjs` |
| Shared actor timelines | `model-review/src/paired-combat-review.js` |
| Paired checks | `model-review/scripts/check-paired-review.mjs` |
| Single-scene integration / disposal | `model-review/src/tripo-review.js` and `tripo-motion-player.js` |

With the local server running, open the existing review page and choose
**攻防配對**. The query selects a reproducible paused pose, for example:
`/tripo-review.html?asset=hercules-hydra-pair&detail=paired&clip=MightPunish&time=2.02&play=0`.

## Acceptance and limits

The user accepted the Hydra hybrid animation, including repaired bites, and
then the three paired review scenarios. This establishes visual review of this
candidate, not a finished combat controller.

At that revision, basic counter contact was scheduled at 4.01s and Might at
2.02s; the reported calibrated distal-end gaps were about 2.6cm and 2.3cm.
These are project measurements, not universal thresholds or proof of a full
collision system. Selected-frame checks still found about 6cm of Hercules sole
penetration. Later work should test actual runtime surfaces and every relevant
contact frame, not merely the stored calibration residual.

The pair deliberately holds a low Bite pose to inspect a counter window.
Double Bite uses fixed source attack areas, not live aim at the hero. Independent
jaws, neck self-collision, sweep/spit pairings, regeneration, damage, responsive
player controls and Android performance remain separate work. Reuse the
validated transfer method without carrying these unfinished details forward as
accepted gameplay behavior.
