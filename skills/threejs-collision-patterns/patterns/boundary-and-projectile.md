# Boundary & Projectile Collision

## Pattern: Arena Boundary

Keep entities within the play area using clamping or hard rejection.

### Clamping (Soft Boundary)

```js
clampPosition(position, radius = 1.1) {
  position.x = Math.max(this.bounds.minX + radius,
    Math.min(this.bounds.maxX - radius, position.x));
  position.z = Math.max(this.bounds.minZ + radius,
    Math.min(this.bounds.maxZ - radius, position.z));
}
```

Use when: entities should slide along walls (tanks, characters, racing games).

### Hard Rejection (Kill Boundary)

```js
checkCollision(point, radius) {
  if (point.z < -LEVEL.LENGTH / 2 || point.z > LEVEL.LENGTH / 2) {
    return { label: 'boundary' };
  }
  if (point.y < LEVEL.MIN_Y || point.y > LEVEL.MAX_Y) {
    return { label: 'altitude boundary' };
  }
  // ... then check individual obstacles
}
```

Use when: leaving bounds means death/failure (flight games, platformers).

### Key Rules

- Apply boundary clamp BEFORE wall collision (clamp first, then test walls).
- Account for entity radius in boundary math (`bounds.min + radius`).
- For flight games: check Y axis too (altitude limits).

---

## Pattern: Projectile vs Wall

Destroy projectiles on wall impact. Uses the same collision system as entity movement but with smaller radius.

```js
// In projectile update loop:
for (const projectile of this.projectiles) {
  projectile.life -= dt;
  projectile.position.addScaledVector(projectile.velocity, dt);
  projectile.mesh.position.copy(projectile.position);

  // Lifetime expiry
  if (projectile.life <= 0) {
    this.scene.remove(projectile.mesh);
    continue;
  }

  // Wall collision (skip for special projectiles)
  if (!projectile.passesThroughWalls &&
      arena.collides(projectile.position, projectile.radius)) {
    this.scene.remove(projectile.mesh);
    // Optional: spawn impact particle effect here
    continue;
  }

  survivors.push(projectile);
}
this.projectiles = survivors;
```

### Key Rules

- Projectile collision radius: 0.2–0.3 (small for accuracy).
- Support `passesThroughWalls` flag for special weapon types.
- Use `survivors` array pattern — filter in one pass, reassign at end.
- Always `scene.remove(mesh)` when destroying projectiles (prevent memory leak).
- Consider spawn offset: fire projectile from gun muzzle, not entity center (prevents self-collision).

### Projectile Spawn Safety

```js
fire(origin, direction, speed) {
  const projectile = {
    position: origin.clone().addScaledVector(direction, 1.5), // offset from shooter
    velocity: direction.clone().multiplyScalar(speed),
    ownerId: this.id,       // skip self in entity hit check
    radius: 0.2,
    life: 3.0,              // seconds before auto-destroy
    passesThroughWalls: false,
    mesh: this.createBulletMesh()
  };
  this.scene.add(projectile.mesh);
  this.projectiles.push(projectile);
}
```
