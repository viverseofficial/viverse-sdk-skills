# Anatomy, skinning and hybrid transfer

Read when adapting a creature source to a different body plan or diagnosing partial animation, twisted heads or foot contact.

## Diagnose the layer that failed

| Observation | Inspect before changing animation |
| --- | --- |
| Necks collapse but torso and feet remain sculpted | Bone coverage, torso/limb weights and whether those joints have animated tracks |
| Correct skeleton but belly stretches toward hip | Skin seed regions and weight assignment through the body's volume |
| Source moves forward but target retreats | Source/target forward axes, section-frame roll, rest-posture differences and strike phase |
| Skull flips while the terminal neck looks plausible | Skull bind basis, parent-local conversion and separately applied head rotation |
| Foot IK looks right but toes/body penetrate | Skinned sole/belly surface, target proportions and support envelope |
| Whole body floats to clear a curled tail | Tail contact constraint incorrectly applied through the common root |
| Exact end becomes empty or returns to bind | One-shot clamping, last exported key, object visibility and animation bindings |

## Recover usable 3D anatomy when necessary

Preserve topology, vertex order, normals, UVs and textures unless changing them is part of the task. Hash complete vertex data with the accessor layout accounted for; interleaved buffer storage is not a flat XYZ list.

For a connected thick mesh, one workable method is occupied-volume voxelization followed by medial paths and geodesic weighting. Pick resolution from the narrowest feature that must remain distinct and memory limits. Inspect connectivity and repairs: closing gaps can accidentally join neighboring necks or erase openings. Disconnected parts and open surfaces need separate treatment.

Use volumetric torso seeds rather than only a spine line when that line assigns the belly to the hips. Identify feet by real contact patches and anatomy; a farthest-point heuristic can select a curled tail. Bound weights, normalize them, and inspect cross-branch leakage. The method is optional: a good existing rig or artist-authored weights should be retained.

## Combine sources by anatomical responsibility

Document which source owns the root, pelvis/chest, limbs, tail, each neck and head. Reuse a single coherent target skeleton and skin. Map anatomical roles, not just matching names. Source chain hierarchy may run from head toward tail while target anatomy runs from torso toward head; derive the ordered sample path from actual positions and relationships.

- Transfer body rotations relative to true bind frames, then convert to target-parent local rotations.
- Choose root-motion policy independently: in-place cycles, locomotion displacement or a bounded choreography path.
- Map chains of unequal joint count by normalized arc distance or another measured correspondence. Retain the target's segment lengths and rest curvature where required.
- Scale limb motion by target/source anatomy. For quadruped feet, a source foot trajectory and two-link IK with the target's measured knee plane can preserve gait better than copying joint angles. Near full extension, retain a continuous bend plane. Shorten unreachable horizontal strides rather than flattening all foot lift.
- Correct a tail locally when possible. Raising the common root to clear it can unplant every foot.

## Section frames and posture adaptation

Let `t` be a normalized chain tangent. Project an anatomical side vector onto the plane perpendicular to it and normalize to `s`; form the right-handed basis `F = [s, t, s × t]`. A source-to-target section mapping is `F_target × inverse(F_source)`. Use a stable anatomical/transported side near degeneracy; a near-zero projection is not a valid frame. Check quaternion hemisphere and temporal continuity.

A tangent-only shortest-arc rotation does not determine axial twist. It can leave the rest face pointing approximately forward while mapping the moving bend plane incorrectly. Also, if tangent-to-snout angles differ, one rotation cannot match both. Calibrate the skull with its own snout/side basis when its articulation requires it.

Distinguish two operations:

- **Rotation-delta transfer:** keeps target rest posture and transfers motion relative to source rest. Appropriate when body plans and articulation are compatible.
- **Curve adaptation:** maps the source's changing chain direction field into the target's anatomical forward/up frame, reconstructing fixed-length target segments and blending with its idle pose. Useful when delta transfer overbends an already-forward neck. It changes the performance and needs new visual review.

Do not treat absolute source directions as a universal fix. Check the neck root connection, body-motion inheritance, curvature, swept volume, target reach and head orientation. Thick creatures may need less curvature or different timing than a thin snake. Numerical continuity does not solve self-collision.
