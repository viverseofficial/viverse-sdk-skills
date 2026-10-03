---
name: non-humanoid-animation-retargeting
description: Reference finished creature animations and adapt them to non-humanoid rigs, including quadrupeds, serpentine chains and multi-headed creatures. Use for creature skinning failures, backward attacks, grounding, hybrid motion sources and synchronized hero-creature attack review. Ordinary humanoid Mixamo or VRMA transfers belong to their dedicated skills.
---

# Source-based creature animation and tuning

Use an observed, complete source motion to establish anticipation, action and recovery. Inspect the target's actual 3D anatomy before choosing the transfer method. A good-looking concept image, correct endpoint, or passing bone-angle test does not establish a working creature rig.


## Check the local source library first

Before searching online or downloading again, check the user's local animation library. Use `ANIMATION_LIBRARY_ROOT` when configured; on this workstation the library is at `../Game-Assets/Animation-Library` relative to the `viverse-sdk-skills` repository root. Inspect `CATALOG.md` or run `python3 <library>/tools/library.py search <action>`. `catalog.json` distinguishes original files, imported references, variants and exact bind-pose companions by checksum. Preserve provenance and keep canonical sources unchanged; validate any reused motion on the new target rig.

If no suitable local source exists, use the source acquisition workflow below with Mixamo or Mesh2Motion as appropriate, recording the actual source and export settings. Archive new downloads in the external local library and follow its `README.md` for adding files. Keep downloaded animation sources and library catalogs outside this skill repository; the skill contains reusable instructions and tooling. The local archive is optional, and its absence does not prevent using the workflow.

## Establish the evidence

- Inspect the real source clip, hierarchy, inverse binds, animated channels, units and deformation. Record source URL/service, revision or export settings, clip names/durations, checksum and asset-specific license. Distinguish a watched preview, downloaded data and an inferred capability.
- Match sources by function. A dragon can supply torso/legs/tail while a snake supplies neck motion; the existence of a dragon model does not imply that its library contains attacks, breath or death. Leave unsupported actions as explicit gaps.
- Preserve accepted models and clips. Write candidates separately and restrict fixes to the failing channels/actions. When Walk or Death is already accepted, verify their referenced animation payloads remain unchanged while fixing Bite.

## Inspect the target before retargeting

Check skin coverage over the torso, belly, all limbs, tail, neck roots and skulls. A neck-only rig cannot make the body collapse. Missing joints, wrong weights and wrong motion mapping are separate problems: diagnose which layer fails before adding pose offsets.

Use mesh-space landmarks, multiple 3D views, connected regions or volume paths where needed. A projection is an inspection aid, not anatomical evidence. Nearby necks can be far apart along the actual surface; Euclidean nearest-bone weights can leak across them. Rebuild a rig/skin only when the existing one cannot represent the intended motion.

For hybrid sources, reversed source chains, foot IK, and skinning diagnosis, read [anatomy and transfer](references/anatomy-and-transfer.md).

## Transfer motion with explicit frames

Define source/target forward, up, side, bind pose and chain direction. Do not infer these solely from bone names, local Euler components or the first animation frame. Transfer parents before children, with root displacement and branch ownership defined separately.

Aligning one tangent leaves roll undetermined. When a strike moves backward, inspect the source curve, the target rest posture and the snout direction through the whole action; do not keep adding local angle corrections. A thin upright snake and a thick forward-reaching neck may need an adapted curve rather than the same rotation delta. Preserve target segment lengths and use bounded corrections supported by the anatomy.

Keep the head's relationship to its terminal neck explicit. A separately copied skull rotation can reverse the face. Copying the terminal neck frame was one useful fallback for a particular rigid-skull target, not a general replacement for head/jaw articulation.

## Prove the motion, then compose interactions

Reload baked outputs and sample anticipation, windup, strike, recovery, loop seams and exact endpoints. Use slow playback, seeking in both directions, frame steps, skeleton overlays and at least two useful camera angles. Compare source and target at matched phases.

Measure the actual skinned snout/sole/weapon surface where possible. For a bite, project snout travel from **windup to strike** onto its measured forward axis; an already-extended neutral pose is a misleading sole baseline. Check every participating head, not just the first corrected example. Measure full-mesh floor clearance and branch deformation as well as bones. Choose temporal resolution and tolerances from speed, dimensions and interpolation error; report the samples actually checked.

For shared-scale hero/creature choreography, strike-phase selection, root extraction and viewer lifecycle, read [paired review and validation](references/paired-review.md). An accepted model or animation preview is not proof of gameplay targeting, collision, damage, regeneration or mobile performance.

## Save a reusable result

Keep source provenance, target mapping/calibration, conversion code, reloaded validation reports and a reproducible review URL with clip/time. Record what the user accepted and what remains provisional. Keep large models, credentials and project-specific rig IDs in the project, not in this skill.

The optional [Hydra case](references/hydra-case.md) identifies the tested Dragon + Snake implementation and its failures. It is an example, not a requirement to use Three.js, Mesh2Motion, a nine-head rig or that project's tuning values.
