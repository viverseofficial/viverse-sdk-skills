# Hercules: accepted downward club strike

On 2026-10-01 the user reviewed the synchronized comparison and said: “good and this is much better, keep the animation and rigging skill for later use.” This accepts the comparison candidate. Gameplay still uses the older procedural motion; hit windows, transitions, and grounding remain to be integrated.

## Locate the preserved implementation

Optional local example project, expected at `../three-kingdoms-mobile-prototype` relative to the `viverse-sdk-skills` repository root. This project is not bundled with the skill and is not a dependency.

If moved, locate the project by `MOTION_REPLACEMENT_PLAN.md` and `model-review/scripts/retarget-mixamo-hercules.mjs`. Do not silently regenerate a different motion when an asset is missing.

- Original: `assets/mixamo/standing-melee-attack-downward.fbx`
- Importer: `model-review/scripts/import-mixamo-source.mjs`
- Character-specific retargeter: `model-review/scripts/retarget-mixamo-hercules.mjs`
- Reload verification: `model-review/scripts/check-mixamo-retarget.mjs`
- Comparison: `model-review/motion-compare.html`, `src/motion-compare.js`, `src/motion-compare.css`
- Outputs in `model-review/public/models/`: `mixamo-downward-source.glb`, `mixamo-downward-source.json`, `mixamo-downward-reference.glb`, `hercules-mixamo-downward.glb`, `hercules-mixamo-downward.json`
- Review image: `output/mixamo-hercules-comparison.png`
- Decisions and integration status: `MOTION_REPLACEMENT_PLAN.md`

These project files are the implementation source of truth. The skill does not duplicate the FBX, GLBs, or scripts; preserve the project when archiving. The personal skill does not grant redistribution rights to downloaded assets.

## Source and reproduction

Mixamo **Standing Melee Attack Downward**, description **Downward Attack With Axe**, character **X Bot**. [Catalog](https://www.mixamo.com/#/?page=1&query=axe&type=Motion%2CMotionPack).

Export: FBX Binary, With Skin, 60 fps, no keyframe reduction.

SHA-256: `2c7ac4c799b94e4c8548270610ad18e7eadcfd2d5305ede3596626f5396f5a7c`.

Take `mixamo.com`: 53 tracks, 2.2666666507720947 seconds. `Take 001` is empty. The selected clip is renamed `Special`. A wrapper applies 0.01 scale from centimeters to meters. The review source uses neutral materials; the original FBX is untouched.

From the project's `model-review` directory, with its Node dependencies installed:

```sh
npm run mixamo:import -- --input ../assets/mixamo/standing-melee-attack-downward.fbx --clip mixamo.com
npm run mixamo:retarget
npm run test:mixamo
npm run build
```

These commands regenerate the named outputs. Preserve a newly accepted variant separately before experimenting. The existing local server's comparison URL is `http://127.0.0.1:4173/motion-compare.html?time=0.7`; verify the server is running before using it.

## Exact mapping and conventions used here

Target has 21 bones, sloping arms at bind, no separate clavicles/fingers, and a right forearm twist helper. Source's `Beta_Joints` suffixed bones inherit from canonical animated bones; adding duplicate tracks would be incorrect.

Target ← source, on each side:

| Target | Source |
| --- | --- |
| Hips / Spine / Chest | Hips / Spine / Spine2 |
| Neck / Head | Neck / Head |
| Shoulder / Elbow / Hand | Arm / ForeArm / Hand |
| Thigh / Knee / Ankle / Foot | UpLeg / Leg / Foot / ToeBase |

In this implementation's coordinate convention:

```text
desiredWorldQ = sourceAnimatedWorldQ * inverse(sourceRestWorldQ) * align
targetLocalQ = inverse(targetParentWorldQ) * desiredWorldQ
```

`align` maps the target's bind child direction onto the source's bind child direction with `setFromUnitVectors`. Read the script for terminal bones and hand handling. This primary-axis correction is specific to this rig; it does not fully solve arbitrary axial-roll conventions or every humanoid hierarchy.

The right twist helper stays at identity for this candidate. Hip displacement uses target/source rest hip-height ratio `0.8918735442268869`. The old Special IK is not applied.

For the grip, derive the palm transverse vector from source `HandIndex1 - HandPinky1`, orthogonalize against the hand-to-`HandMiddle1` direction, then align club +Y with that vector. Derive source and target grip rotations from the same basis and compensate source hand world scale so both clubs have equal meter size.

## Verification and pitfalls resolved

- Bake at 120 Hz, 273 samples. At 60 Hz the prop interpolation drift reached about 1.17°; 120 Hz reduced it below the case's 1° regression limit.
- `LoopOnce` with `clampWhenFinished=true` fixes the exact-duration bind-pose snap. Verify the last interval as well as the endpoint.
- Reload all three GLBs and test 825 combined time samples (240 Hz plus authored keys).
- Maximum upper/forearm direction errors: 0.0334° / 0.0343°; club-axis error 0.6917°; first-frame-relative hip-motion residual 4.14e-8 m; segment-length drift 2.55e-8 m.
- Also verify real track bindings, finite transforms, normalized finite skin weights. These are transfer-regression measurements, not universal anatomical quality thresholds.
- `npm test`, `npm run test:mixamo`, and `npm run build` passed during candidate delivery; build retained an existing chunk-size warning.
- Source/target visual review included synchronized playback and 0.70, 0.85, 0.95 second poses in front and three-quarter views. The user then accepted the comparison.
- Skeleton overlays traverse the complete glTF scene because skeletons can be siblings of skinned meshes.

The former procedural animation repeatedly passed limited angle checks while still looking backward. Preserve that lesson: full-motion visual acceptance is required in addition to numerical consistency. Do not describe this candidate as already integrated into gameplay.

## Useful references

- [Blender IK constraint and pole target](https://docs.blender.org/manual/en/latest/animation/constraints/tracking/ik_solver.html)
- [FABRIK author material](https://andreasaristidou.com/FABRIK)
- [Extending FABRIK with model constraints](https://doi.org/10.1002/cav.1630)
