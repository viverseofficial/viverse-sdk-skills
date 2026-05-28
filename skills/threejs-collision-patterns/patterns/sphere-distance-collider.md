# Sphere / Distance Collider (Pickups & Projectiles)

Best for: bullets hitting entities, collectible items, power-ups, trigger zones.

## Pattern A: Projectile → Entity Hit (Squared Distance)

Use `distanceToSquared` to avoid sqrt when checking many entities.

```js
// Entity has a radius property
class Tank {
  constructor() {
    this.radius = 1.1;
    this.position = new THREE.Vector3();
  }
}

// In projectile update loop:
update(dt, tanks, onHit) {
  for (const projectile of this.projectiles) {
    projectile.position.addScaledVector(projectile.velocity, dt);
    projectile.mesh.position.copy(projectile.position);

    // Check hit against all enemy entities
    const hitTank = tanks.find(tank =>
      tank.id !== projectile.ownerId &&
      tank.position.distanceToSquared(projectile.position) <=
        Math.pow(tank.radius + projectile.radius, 2)
    );

    if (hitTank) {
      onHit(hitTank.id, projectile);
      this.scene.remove(projectile.mesh);
    }
  }
}
```

### Key Rules

- Projectile radius should be small (0.2–0.3) for accuracy.
- Sum both radii: `tank.radius + projectile.radius` for proper sphere-vs-sphere.
- Skip self-hits: `tank.id !== projectile.ownerId`.

---

## Pattern B: Collectible Pickup (Direct Distance)

Use `distanceTo` for single-target checks where readability matters.

```js
// Ring/coin collection
update(delta, playerPosition) {
  for (const ring of this.rings) {
    if (ring.userData.collected) continue;

    const dist = ring.position.distanceTo(playerPosition);
    if (dist < RING.SCORE_DISTANCE) {
      ring.userData.collected = true;
      ring.material.color.setHex(RING.COLOR_PASSED);
      ring.material.transparent = true;
      // Trigger score, particle burst, etc.
      eventBus.emit(Events.SCORE_CHANGED, { score: ++gameState.score });
    }
  }
}
```

### Key Rules

- Mark collected: `ring.userData.collected = true` — skip in future frames.
- Pickup radius should be GENEROUS (1.5–5.0 units) for satisfying game feel.
- Remove or fade the mesh visually after collection.

---

## Pattern C: Power-Up Pickup (Fixed Radius)

Single-instance special items with fixed detection radius.

```js
// Power-up spawned ahead of player
spawnPowerUp(playerPosition) {
  const mesh = this.createPowerUpMesh();
  const offset = new THREE.Vector3(
    (Math.random() - 0.5) * 28,
    (Math.random() - 0.5) * 8,
    -70 - Math.random() * 35  // ahead in -Z (player forward direction)
  );
  mesh.position.copy(playerPosition).add(offset);
  this.scene.add(mesh);
  this.powerUp = mesh;
}

// In update loop:
if (this.powerUp) {
  // Animate the power-up (bob, rotate)
  this.powerUp.rotation.z += delta * 1.5;
  this.powerUp.position.y += Math.sin(elapsed * 2.4) * 0.005;

  // Check pickup (generous radius)
  if (this.powerUp.position.distanceTo(playerPosition) <= 4.75) {
    this.activatePowerUp();
    this.scene.remove(this.powerUp);
    this.powerUp = null;
  }
}
```

### Key Rules

- Power-up pickup radius (4.75) should be larger than visual mesh radius.
- Spawn position relative to player movement direction (not behind them).
- Set `this.powerUp = null` after collection to stop checking.
- Add visual feedback: rotation, bobbing, glow to make it noticeable.

---

## Performance Notes

| Method | Use When | Cost |
|--------|----------|------|
| `distanceToSquared` | Many entities (> 10) | No sqrt, fastest |
| `distanceTo` | Single target or few entities | Readable, slight overhead |
| Pre-filter by axis | Hundreds of entities | Skip sqrt entirely for far objects |

### Pre-filter Example

```js
// Quick axis-aligned rejection before expensive distance calc
for (const entity of entities) {
  if (Math.abs(entity.position.x - point.x) > maxRadius) continue;
  if (Math.abs(entity.position.z - point.z) > maxRadius) continue;
  // Now do proper distance check
  if (entity.position.distanceToSquared(point) <= maxRadius * maxRadius) {
    // hit
  }
}
```
