# Avatar Controller Reference

## Pick An Integration Tier

Before choosing a tier, ask the user which they want: a Tier A free-design game (a brand-new standalone Three.js game with creative gameplay latitude on top of the bundled controller), a Tier A standard avatar sandbox (a brand-new standalone single-avatar scene with no added gameplay), or an integration into their current workspace / existing scene. Offer the free-design game first. Build a complete new game (Tier A) only when they explicitly want a standalone one, and keep free-design work inside the Tier A boundaries described in the Skill's Tier A Free-Design Game section; when integrating into an existing project, inspect it first and prefer Selection-Only or Tier B rather than scaffolding a new scene.

- Tier A, `physics: 'builtin'`: use for a single avatar on a flat ground plane. The controller owns gravity jump, Space input, touch joystick and Jump button, movement, orbit/zoom, and a perspective camera.
- Tier B, `physics: 'none'`: use with an existing game loop, physics engine, collision, slopes, platforms, multiple floors, Unity, Unreal, or host-owned camera/input. The controller handles VRM and idle/walk/run animation only and never changes `position.y`.

Tier A does not implement world collision, floor cutouts, slopes, stairs, ceilings, or NPC interaction.

## Animation Assets

Use `window.ViverseMeSDK.animations` or `window.ViverseMeSDK.getAnimationUrl(name)` for absolute VRMA URLs:

- `idle`, `walk`, `run`: locomotion loops.
- `jump_start`: standing crouch/takeoff.
- `jump_up`: rising phase.
- `jump_loop`: looping airborne pose.
- `jump_down`: landing phase.

Recommended sequence: `jump_start -> jump_up -> jump_loop -> jump_down`.

## Peer Dependencies

The controller does not bundle Three.js or VRM libraries. The host must provide one shared Three.js instance through an import map. The documented compatible set is:

```html
<script type="importmap">
  {
    "imports": {
      "three": "https://unpkg.com/three@0.160.1/build/three.module.js",
      "three/addons/": "https://unpkg.com/three@0.160.1/examples/jsm/",
      "@pixiv/three-vrm": "https://esm.sh/@pixiv/three-vrm@2.1.2?bundle&external=three",
      "@pixiv/three-vrm-animation": "https://esm.sh/@pixiv/three-vrm-animation@2.1.2?bundle&external=three"
    }
  }
</script>
```

## Tier A Setup

```js
const { createAvatarController } = await import(
  window.ViverseMeSDK.avatarControllerUrl
);

const controller = createAvatarController({
  scene,
  domElement: canvas,
  animations: window.ViverseMeSDK.animations
});

controller.setAvatar(vrm);

function loop() {
  controller.update(clock.getDelta());
  renderer.render(scene, controller.camera);
  requestAnimationFrame(loop);
}
```

Call `setAvatar()` again when the selected avatar changes and `dispose()` when tearing down the experience.

## Complete Happy Path Wiring

For a game-ready Tier A integration, the host must connect the selection and SDK lifecycle to the controller. The public Guide contains the complete copy-ready implementation; preserve these details when adapting it:

1. Wait for SDK readiness robustly: use `window.ViverseMeSDK.instance` if present, otherwise wait once for `viverse-me:sdk-ready`. The SDK script is asynchronous, so either load order is valid.
2. Create `GLTFLoader`, set `crossOrigin = 'anonymous'`, and register `VRMLoaderPlugin` from `@pixiv/three-vrm`.
3. Create the controller with the host scene/canvas, `window.ViverseMeSDK.animations`, `enableAnimation: true`, `enableControl: true`, and `physics: 'builtin'`.
4. On selection, require `avatar.vrmUrl`, load and validate `gltf.userData.vrm`, then call `VRMUtils.removeUnnecessaryVertices()` and `removeUnnecessaryJoints()`.
5. Detach the previous avatar with `controller.setAvatar(null)`, deep-dispose its scene, then call `controller.setAvatar(nextVrm, avatar.animations || null)`. Passing payload animations is required because they may override the SDK defaults.
6. Apply `avatar.controlsHint` immediately and continue listening for `viverse-me:controls-changed`. Animation off also forces controls off; do not let a later lifecycle event incorrectly re-enable them.
7. On `viverse-me:open`, disable control, hide joystick/Jump UI, and pause the render loop. On close, reset the clock delta, resume, and show controls only after an avatar exists.
8. Clamp frame delta to `0.05`, update the controller before rendering, and update `controller.camera.aspect` plus the renderer size on resize.

Control hints should be applied like this:

```js
let controlsHint = {};

function applyControls(controller, hint = {}, pausedBySdk = false) {
  controlsHint = { ...controlsHint, ...hint };
  const animationEnabled = controlsHint.animationEnabled !== false;
  controller.setEnableAnimation(animationEnabled);
  controller.setEnableControl(
    !pausedBySdk && animationEnabled && controlsHint.controlEnabled !== false
  );
  if (controlsHint.controllerSize !== undefined) {
    controller.setControllerSize(controlsHint.controllerSize);
  }
}
```

Use `sdk.showLoading?.('Loading avatar...')` after yielding one microtask and pair it with `sdk.hideLoading?.()` in `finally` so the embedded flow can close before the host loading state starts.

## Important Options

| Option | Default | Meaning |
| --- | --- | --- |
| `scene` | required | Host-owned `THREE.Scene`. |
| `domElement` | required | Canvas/input target. |
| `camera` | undefined | Tier A may create one; Tier B never touches it. |
| `physics` | `'builtin'` | Use `'none'` for host-owned physics. |
| `enableJump` | `true` | Enables jump machine and input in Tier A. |
| `bindSpaceKey` | `true` | Disable if the host uses Space. |
| `gravity` | `18` | Gravity in m/s squared. |
| `jumpVelocity` | `6.5` | Initial upward velocity. |
| `variableJumpCutFactor` | `0.45` | Early-release rising velocity multiplier. |
| `groundY` | `0` | Single Tier A ground plane. |
| `enableAnimation` | `true` | Mixer master switch. |
| `enableControl` | `true` | Input master switch. |
| `input.joystick` | `'auto'` | Auto on touch, or force with boolean. |
| `moveSpeed` | `2.4` | Walking speed in m/s. |
| `runSpeedMultiplier` | `2.0` | Run speed multiplier. |
| `cameraOffset` | `1.35` | Vertical look-at offset. |
| `initialCameraDistance` | `4.5` | Initial orbit distance. |
| `minCameraDistance` | `1.75` | Closest zoom. |
| `maxCameraDistance` | `6.5` | Farthest zoom. |

## Public API

- `update(delta)`: advance mixer, VRM, movement, camera, and physics each frame.
- `setAvatar(vrm, animations?)`: attach, replace, or detach (`null`) the avatar.
- `setAnimations(urls)`: replace and reload VRMA clips.
- `setEnableAnimation(boolean)`, `setEnableControl(boolean)`, `setEnableJump(boolean)`.
- `jump()`, `cutJump()`: programmatic jump press/release.
- `setCameraDistance(distance)`.
- `setJoystickVisible(boolean)`: controls joystick and Jump button together.
- `setControllerSize('default' | 'small')`.
- `dispose()`: remove listeners, mixer, controls, anchor, and restore touch action.

Read-only getters include `camera`, `anchor`, `visualRoot`, `cameraState`, `enableAnimation`, `enableControl`, `enableJump`, `physicsMode`, `isGrounded`, and `jumpPhase`.

## Jump Behavior

Each frame applies vertical acceleration equivalent to `vy -= gravity * dt`. Releasing jump while rising multiplies velocity by `variableJumpCutFactor` for a short hop.

- Standing jump uses the full four-clip sequence and disables horizontal movement during takeoff and landing clips.
- Running jump skips `jump_start` and `jump_down`; airborne steering uses 60% of ground speed.
- Movement input during a standing landing cuts the landing clip and blends immediately to locomotion.
