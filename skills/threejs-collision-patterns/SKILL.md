---
name: threejs-collision-patterns
description: Collision detection patterns for Three.js games without physics engines
prerequisites: [Three.js imported, Game loop with delta time]
tags: [threejs, collision, physics, game, hitbox]
---

# Three.js Collision Patterns

Manual collision detection for Three.js games. No physics engine required — uses simple geometric tests each frame.

## When To Use This Skill

Use this when a project needs:
- Collidable walls, obstacles, or furniture (AABB)
- Projectile hit detection against entities (sphere)
- Collectible/power-up pickup zones (distance)
- Arena boundaries that block movement

## Read Order

1. This file (overview + integration checklist)
2. [patterns/aabb-box-collider.md](patterns/aabb-box-collider.md) — static obstacles
3. [patterns/sphere-distance-collider.md](patterns/sphere-distance-collider.md) — pickups & projectiles
4. [patterns/boundary-and-projectile.md](patterns/boundary-and-projectile.md) — arena edges & bullet-vs-wall

## Core Principle

Every collidable game object consists of two parts:
1. **Visual mesh** — what the player sees (can be complex geometry)
2. **Collision primitive** — simple shape used for hit tests (box or sphere)

The collision primitive is registered at mesh creation time and tested each frame in the game loop.

## Integration Checklist

When implementing collision in a new game:

1. **Define entity radius** in Constants.js (e.g., `PLAYER: { COLLISION_RADIUS: 1.65 }`).
2. **Choose pattern** based on shape:
   - Box-shaped static objects → AABB (Pattern 1 or 2)
   - Moving entities vs walls → Box3 intersection (Pattern 2)
   - Projectiles/pickups → Sphere distance (Pattern 3)
   - Arena edges → Boundary clamp (Pattern 4)
3. **Register colliders** at mesh creation time (not retroactively).
4. **Test in game loop** every frame, BEFORE applying movement.
5. **Label obstacles** for debugging.
6. **Use `collidable: false`** for visual-only decoration meshes.
7. **Keep collision shapes simple** — enclosing boxes/spheres, not complex mesh geometry.

## Anti-Patterns (DO NOT)

- Do NOT use raycasting for simple AABB collision (expensive, unnecessary).
- Do NOT add physics engine deps (cannon.js, rapier, ammo.js) unless explicitly requested.
- Do NOT make collision radius exactly match mesh size — add 10-20% padding for game feel.
- Do NOT skip collision on decorative meshes silently — explicitly mark `collidable: false`.
- Do NOT test collision AFTER applying movement (causes entities stuck inside walls).
- Do NOT allocate new Vector3/Box3 objects inside the collision loop (GC pressure) — reuse temporaries.

## Preflight Checklist

- [ ] Every entity that can collide has a `COLLISION_RADIUS` or `radius` property
- [ ] Obstacle registry (`this.obstacles` array) is populated during level build
- [ ] Game loop calls `checkCollision()` BEFORE `position.copy(nextPosition)`
- [ ] Decorative meshes are marked `collidable: false`
- [ ] Projectile collision uses small radius (0.2–0.3) for accuracy
- [ ] Pickup collision uses generous radius (1.5–5.0) for good game feel
