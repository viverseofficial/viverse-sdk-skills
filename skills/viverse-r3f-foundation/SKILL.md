---
name: viverse-r3f-foundation
description: Build browser 3D games with React Three Fiber and @react-three/viverse. Use for initial scene setup, character controls, physics body setup, and VIVERSE-ready project foundations.
prerequisites: [React, three, @react-three/fiber, VIVERSE app ID]
tags: [viverse, r3f, threejs, react, game-foundation]
---

# VIVERSE R3F Foundation

Foundation skill for browser mini-games using `@react-three/viverse`.

## When To Use This Skill

Use when you need:
- a fast R3F + VIVERSE starter scene
- character movement and simple platform/arena gameplay
- physics-ready level geometry for browser mini-games

## Read Order

1. This file
2. [Viverse simple game tutorial](https://pmndrs.github.io/viverse/tutorials/simple-game)
3. [Viverse publish tutorial](https://pmndrs.github.io/viverse/tutorials/publish-to-viverse)
4. `../viverse-auth/SKILL.md`
5. `../viverse-world-publishing/SKILL.md`

## Preflight Checklist

- [ ] Install deps: `three`, `@react-three/fiber`, `@react-three/viverse`, `@react-three/drei`
- [ ] Have a valid VIVERSE App ID
- [ ] Decide env key strategy (`VITE_VIVERSE_CLIENT_ID` vs `VITE_VIVERSE_APP_ID`)
- [ ] Target a small browser-friendly map and low-poly assets

## Implementation Workflow

1. Set up `<Canvas>` and wrap game content with `<Viverse>`.
2. Add environment lights and sky.
3. Add controllable player with `<SimpleCharacter />`.
4. Add collision-ready geometry inside `<BvhPhysicsBody>`.
5. Add respawn/reset logic in frame update for fail-safe gameplay.
6. Wire auth/profile and publish pipeline from existing VIVERSE core skills.

### Full-path controls without avatar (tested pattern)

For games that do **not** use `SimpleCharacter` (for example tank/driving games), you can still adopt pmndrs input framework directly:

1. Create an `InputSystem` on the canvas DOM element (`onCreated -> gl.domElement`).
2. Register built-in inputs:
   - `ScreenJoystickInput` (mobile movement joystick)
   - `LocomotionKeyboardInput` (desktop movement keys)
3. Add one custom input plugin for game-specific actions (for example turret left/right + fire).
4. Define custom `InputField`s for game-specific actions and map them into your game control state each frame.
5. Keep gameplay/controller logic separate from input providers; swap providers without changing gameplay.

This allows framework-standard mobile joystick UX while preserving non-avatar gameplay.

### Input action "one-shot" pattern (required for non-continuous actions)

For actions like weapon switch, interact, or mode-toggle:

1. Define a dedicated custom `InputField` (for example `WeaponSwitchField`).
2. Store pending action in custom input plugin state (for example `pendingWeaponChoice`).
3. Return action once from `get(field)`.
4. Immediately clear pending action after read.

Why:
- Prevents repeated triggers while key/button is held.
- Keeps input deterministic and easy to reason about in frame update loops.

Minimal scaffold:

```tsx
<Canvas shadows>
  <Viverse>
    <Sky />
    <directionalLight intensity={1.2} position={[5, 10, 10]} castShadow />
    <ambientLight intensity={1} />
    <SimpleCharacter />
    <BvhPhysicsBody>
      <PrototypeBox scale={[10, 1, 15]} position={[0, -0.5, 0]} />
    </BvhPhysicsBody>
  </Viverse>
</Canvas>
```

## Verification Checklist

- [ ] Character moves/jumps on map in browser
- [ ] Physics collisions work for floor/platforms
- [ ] Respawn logic works when falling out of bounds
- [ ] Build succeeds and preview runs after publish
- [ ] Non-avatar controller can read from `InputSystem` (desktop + mobile)
- [ ] Mobile joystick appears only on touch/coarse-pointer devices
- [ ] Arrow/space or mapped action keys do not trigger page scroll/gesture leaks
- [ ] One-shot actions (weapon switch/interact) fire exactly once per press
- [ ] Combat FX arrays are bounded and cleaned by TTL (no long-session accumulation)
- [ ] Timed buffs/weapons expire by timestamp logic (not fragile per-feature timers)
- [ ] Hit feedback is readable (for example short emissive pulse via `lastHitAt`)
- [ ] Pickups render only when active and respawn correctly

## Critical Gotchas

- Keep scope small for browser mini-games; avoid large maps and heavy shaders.
- Keep auth and App ID config in sync with publish target app.
- Rebuild after env changes before publishing (`import.meta.env` is build-time).
- Do not duplicate auth state hooks across multiple top-level UI components.
- `ScreenJoystickInput` alone does not cover custom combat actions; add a custom input plugin for action fields.
- `SimpleCharacter` is optional; pmndrs input framework can be used directly for vehicle/tank controllers.
- Keep gameplay state deterministic and authoritative; treat visual effects (shot/hit/explosion) as render-layer events with short TTL.
- Cap transient FX collections (for example `slice(-N)`) to avoid memory/perf drift during long playtests.
- Timestamp-based effects/buffs (`until` fields) are more robust than many ad-hoc timers spread across components.

## References

- [pmndrs/viverse repository](https://github.com/pmndrs/viverse)
- [Simple game tutorial](https://pmndrs.github.io/viverse/tutorials/simple-game)
- [Publish tutorial](https://pmndrs.github.io/viverse/tutorials/publish-to-viverse)
