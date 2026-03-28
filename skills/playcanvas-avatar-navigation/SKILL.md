---
name: playcanvas-avatar-navigation
description: Physics-based avatar movement, colliders, and camera follow in PlayCanvas + Ammo.js scenes
prerequisites: [PlayCanvas engine, Ammo.js physics, HTML canvas]
tags: [playcanvas, physics, avatar, navigation, ammo.js]
---

# PlayCanvas Avatar Navigation

Physics-first avatar movement for PlayCanvas + Ammo.js with crash-safe lifecycle rules.

## When To Use This Skill

Use this when a project needs:
- A user-controllable avatar walking/flying on 3D geometry
- Physics colliders for buildings or terrain
- Third-person camera following the avatar
- Safe entity creation/destruction without Ammo.js crashes

## Read Order

1. This file
2. [patterns/ammo-compatibility.md](patterns/ammo-compatibility.md)
3. [patterns/safe-physics-cleanup.md](patterns/safe-physics-cleanup.md)
4. [patterns/avatar-controller.md](patterns/avatar-controller.md)
5. [patterns/camera-follow.md](patterns/camera-follow.md)

## Preflight

- [ ] `window.pc` is available if runtime expects global engine
- [ ] Ammo module config is valid for current build target
- [ ] Canvas exists and is claimed synchronously
- [ ] Ground collider strategy decided (box/AABB vs mesh)
- [ ] Safe destroy utility is implemented before spawning entities

## Implementation Workflow

1. Create `pc.Application(canvas)` synchronously.
2. Initialize Ammo and enable rigidbody/collision systems.
3. Create static ground/boundary colliders.
4. Spawn avatar with dynamic rigidbody + collision shape.
5. Add input-driven movement controller.
6. Add follow camera and reset camera distance on model swap.
7. Destroy entities through physics-safe cleanup only.

## Verification Checklist

- [ ] Avatar collides with ground/buildings correctly
- [ ] Camera follows without clipping or drift
- [ ] Repeated spawn/despawn does not crash Ammo
- [ ] Scene switch/unmount does not leave physics artifacts
- [ ] No null-canvas startup race in React lifecycle

## Critical Gotchas

- Never call direct `entity.destroy()` on physics entities; use safe cleanup pattern.
- Parent destroy cascades to children; parent must also be physics-safe destroyed.
- Some PlayCanvas + Ammo combinations break mesh colliders (`.at()` issues); follow compatibility pattern.
- Canvas/application init order matters in React: claim canvas first, async init after.
- Camera state can persist across model swaps; reset follow distance explicitly.

## References

- [patterns/safe-physics-cleanup.md](patterns/safe-physics-cleanup.md)
- [patterns/ammo-compatibility.md](patterns/ammo-compatibility.md)
- [patterns/ground-and-colliders.md](patterns/ground-and-colliders.md)
- [patterns/avatar-controller.md](patterns/avatar-controller.md)
- [patterns/camera-follow.md](patterns/camera-follow.md)
- [examples/debug-tools.md](examples/debug-tools.md)
