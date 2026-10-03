---
name: mixamo-animation-retargeting
description: Import finished Mixamo or other humanoid animations, adapt them to a different character rig, and verify the exported motion with synchronized source-versus-target playback. Use for animation retargeting, unnatural elbow or wrist motion, weapon grip alignment, and preserving validated character-animation workflows.
---

# Finished motion → character rig

Use a complete source motion as the primary pose and timing reference. A weapon endpoint alone cannot determine believable shoulder, elbow, torso, and recovery motion. Reserve IK for bounded contact corrections after the source motion transfers correctly.


## Check the local source library first

Before searching online or downloading again, check the user's local animation library. Use `ANIMATION_LIBRARY_ROOT` when configured; on this workstation the library is at `../Game-Assets/Animation-Library` relative to the `viverse-sdk-skills` repository root. Inspect `CATALOG.md` or run `python3 <library>/tools/library.py search <action>`. `catalog.json` distinguishes original files, imported references, variants and exact bind-pose companions by checksum. Preserve provenance and keep canonical sources unchanged; validate any reused motion on the new target rig.

If no suitable local source exists, use the source acquisition workflow below with Mixamo or Mesh2Motion as appropriate, recording the actual source and export settings. Archive new downloads in the external local library and follow its `README.md` for adding files. Keep downloaded animation sources and library catalogs outside this skill repository; the skill contains reusable instructions and tooling. The local archive is optional, and its absence does not prevent using the workflow.

## Workflow

1. **Establish a reproducible source.** Inspect an actual preview for the intended action. Preserve the original downloaded asset and record service, animation name, character, export settings, checksum, nonempty clip name, and duration. Do not claim to have watched or downloaded a clip without doing so. Use the user's authorized session; keep credentials out of assets and documentation.
2. **Inspect both rigs.** Read hierarchy, inverse-bind/rest transforms, child-axis directions, units, skin weights, and animation bindings. Restore the bind pose for calibration; the first animation frame is not the bind pose. Inspect duplicate-looking skeletons for inherited animation before adding tracks. Identify missing clavicles, fingers, twist bones, or torso segments explicitly.
3. **Import without changing the movement.** Select the intended nonempty take. Preserve timing and local source tracks, normalize units once, and retain the original file. A neutral-material review copy can simplify FBX texture loading; it is not the final textured character.
4. **Retarget with rest-pose corrections.** Map anatomical roles, not names alone. Transfer source animated rotations relative to source bind rotations, applying target bind-axis corrections before converting world rotations to target-parent local space. Traverse parents before children. Define root translation scaling separately. Use normalized quaternions with hemisphere continuity. Handle twist bones explicitly; do not copy Euler angles across differently oriented rigs.
5. **Validate the grip independently.** Attach the same-sized prop to source and target with a fixed palm-relative basis. Determine shaft orientation from the actual hand/finger geometry or authored grip socket, not world-up. Inspect wrist, forearm roll, and palm contact together. A hand without finger bones needs an explicit authored grip basis.
6. **Bake and reload.** Export a separate candidate, then reload the serialized asset for tests. Include exact clip endpoints, authored keys, and intermediate samples. For Three.js one-shot sampling, set `LoopOnce` and `clampWhenFinished = true`; otherwise sampling the duration can restore the bind pose. Select bake rate from measured interpolation error, not a universal preset.
7. **Compare visually and numerically.** Synchronize source and target by clip time, units, and comparable cameras. Provide slow playback, scrubbing, frame stepping, front/side/three-quarter views, and optional skeletons. Check complete anticipation, strike, recovery, and end transition. Measure limb directions, prop axes, root displacement, bone-length preservation, finite transforms, and skin weights in the reloaded outputs. Small numerical errors do not prove natural anatomy or good skinning.
8. **Record acceptance, then integrate.** Preserve the accepted source, target, provenance, conversion scripts, test scripts, and comparison viewer. Distinguish visual acceptance from gameplay integration. Derive hit windows, sound, hit stop, and blends from the accepted motion; do not distort the motion to fit an old impact timestamp. Recheck grounding and contacts on the target proportions.

## Diagnose before patching

- Correct endpoints with a backward elbow: inspect bind axes, shoulder roll, and pole direction; avoid another arbitrary wrist-target keyframe patch.
- Source looks correct, target twists: isolate mapping/rest correction from skinning and axial twist. Inspect several views and adjacent frames.
- Only the tail snaps: inspect mixer clamping and the exact exported final key.
- Hands match but weapon points elsewhere: inspect the grip basis and prop parent transforms.
- Duplicate mesh appears unanimated: inspect ancestry and actual deformation before duplicating animation tracks.
- Export-time checks pass but playback fails: reload the GLB and validate real bindings/interpolation.

For contact IK, derive the pole from the transferred source elbow and preserve bend-side continuity near extension. Use joint constraints and bounded corrections; unconstrained FABRIK is not an anatomical guarantee. If the target rig cannot represent the motion, improve the rig/skin rather than accumulating angle patches.

## Proven local example

For an optional local example, read [the Hercules case](references/hercules-case.md) for the accepted asset, executable project commands, the exact rotation convention, test results, and remaining integration work. The example project is expected at `../three-kingdoms-mobile-prototype` relative to the `viverse-sdk-skills` repository root. It is not bundled with this skill or required to use it. The scripts there are character-specific examples, not a universal rig importer. Adapt and validate their mappings for each new character.
