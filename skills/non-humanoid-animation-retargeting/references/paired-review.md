# Paired choreography and validation

Read when placing a creature and hero together to inspect an attack, evade, counter or other contact.

## One coordinate system, two performances

Establish shared units and preserve authored world scale when it is already meaningful. If normalization is needed, calibrate actor dimensions before solving their contact. Ground each from actual mesh geometry, then place both in a shared scene. Keep outer review normalization uniform across the pair; an independent scale change requires recalibrating contacts. Convert world-space landmarks back to the parent/group space before using them as local marker or actor positions.

Use an absolute-time scenario sampler for both actors and effects. Reset or explicitly set all sampled channels so backwards scrubbing and switching scenarios give the same pose as forward playback. Blend entry/exit; clamp one-shots at exact endpoints. Test samples after other clips have played, not only from a clean mixer.

For root extraction, inspect the actual pelvis displacement through the hierarchy. Forward travel may be carried by an unexpected local component because the rig is rotated. Extract the horizontal motion in a known frame, preserve vertical support motion, and apply the horizontal displacement exactly once. Do not add mount travel while retaining the same travel in the skeleton. Document intentional choreography translation separately from authored root motion.

## Align a real strike, not any close point

1. Identify the striking end of the prop from its grip and geometry. The nearest vertex anywhere on a club can be the handle; this can put the hero's fist or torso into the creature.
2. Restrict the search to the intended active stroke. An unconstrained height/distance search can select a backswing or windup that happens to pass through the target height.
3. Require the target to be in front of the hero, with plausible reach and body clearance. Calibrate facing from a neutral anatomical frame once; do not reuse the previous sampled pose's yaw as a new bind frame.
4. Place actors using whole-root transforms first. Measure the complete XYZ separation after placement, not only the horizontal gap or the pre-adjustment distance.
5. Verify the exact sampled paired pose, including blends, root motion and outer scene transforms. A small cached calibration residual does not prove the runtime makes contact. Sample adjacent frames and inspect surface penetration versus a plausible contact point.

Changing the creature's low-head hold or slowing recovery can expose a counter opportunity while preserving source files. Label it as a choreography adaptation; do not silently replace accepted source animation or present a frozen pose as finished stagger animation. A fixed two-head sequence is a spatial demonstration until both attack paths, player escape and timing are tested together. It is not live targeting or a proven safe dodge.

## Useful viewer behavior

Offer attack-type selection, shared time, slow playback, frame steps, camera orbit and optional skeletons. Display the current anticipation/evade/strike/recovery phase and the intended contact time. Distinguish available pairings from missing sweep, spit, regeneration or other actions; do not relabel a rotated bite as a validated new attack.

Threat and opportunity markers explain intent, not collision results. Keep their coordinate space correct and their meaning clear. Fit the complete motion to avoid empty frames, but allow zoom or a contact view for close inspection.

Reuse a scene/tab where practical, stop hidden-page work, and dispose replaced models, textures, skeleton GPU resources, mixers, helpers and event listeners. Define caller/driver ownership: detaching actor roots before caller cleanup can hide their skeletons from disposal. Do not create extra browser windows merely to compare successive candidates.

## Validation that can catch the observed failures

- Reload baked assets; verify finite transforms, normalized weights, consistent bone lengths and expected clip bindings.
- For forward attacks, define a marker from actual snout vertices or an authored socket. Project strike minus windup displacement onto the anatomical forward axis at windup. Report the phase and coordinate units; source and target distances are not directly comparable before scaling.
- Check all participating branches and overlapping events. A repaired standalone bite can coexist with an unfixed sequence.
- Sample skinned soles, belly, tail and heads through ground-contact events, not just joint origins or final poses. Check each relevant frame's clearance; a minimum over many frames cannot prove that no other frame floats. Report remaining penetration instead of hiding it behind a permissive threshold.
- Verify strike-end distance and forward reach at the runtime contact time. Review actor-body and neighboring-neck collisions separately; marker coincidence is not a collision solver.
- Test seek order, scenario changes, loop/end behavior and a nonidentity parent transform. Markers should follow the same visible positions after review normalization.
- Verify protected animations through channel/accessor payloads or hashes, and preserve geometry/texture bytes when the change only concerns motion.

Keep automated, visual and gameplay acceptance separate. Choose sample density and thresholds for the asset's scale and motion. A successful preview still does not prove input responsiveness, attack cancellation, invulnerability, damage, AI coordination or device performance.
