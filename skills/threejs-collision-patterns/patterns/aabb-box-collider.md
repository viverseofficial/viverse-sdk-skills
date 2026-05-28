# AABB Box Collider (Static Obstacles)

Best for: walls, furniture, platforms, barriers — anything box-shaped and stationary.

## Pattern A: Manual AABB Registry

Store collision descriptors alongside meshes. Test point+radius vs AABB each frame.

```js
// In LevelBuilder or similar:
constructor(scene) {
  this.scene = scene;
  this.obstacles = [];
}

// Register a collidable box alongside its visual mesh
addBox({ position, scale, material, label, collidable = true }) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(scale.x, scale.y, scale.z),
    material
  );
  mesh.position.copy(position);
  this.scene.add(mesh);
  if (collidable) {
    this.obstacles.push({
      center: position.clone(),
      halfSize: new THREE.Vector3(scale.x / 2, scale.y / 2, scale.z / 2),
      label
    });
  }
  return mesh;
}

// Per-frame collision test: point + radius vs AABB array
checkCollision(point, radius = 1.5) {
  for (const obs of this.obstacles) {
    const dx = Math.max(Math.abs(point.x - obs.center.x) - obs.halfSize.x, 0);
    const dy = Math.max(Math.abs(point.y - obs.center.y) - obs.halfSize.y, 0);
    const dz = Math.max(Math.abs(point.z - obs.center.z) - obs.halfSize.z, 0);
    if (dx * dx + dy * dy + dz * dz <= radius * radius) {
      return obs; // hit — return the obstacle descriptor
    }
  }
  return null;
}
```

### Usage in Game Loop

```js
const hit = level.checkCollision(player.getPosition(), PLAYER.COLLISION_RADIUS);
if (hit) {
  console.warn('[Game] Collision with', hit.label);
  eventBus.emit(Events.PLAYER_DIED);
}
```

### Key Rules

- `halfSize` = `scale / 2` — always derive from BoxGeometry dimensions.
- Non-collidable decorations (windows, glow) pass `collidable: false`.
- Label every obstacle for debug logging.
- Collision shape matches the visual mesh (no separate invisible collider needed for boxes).

---

## Pattern B: Box3 Intersection (Dynamic Entities vs Static Walls)

Store walls as `THREE.Box3` objects. Create a temporary Box3 around the moving entity for intersection testing.

```js
// Store walls during level generation
this.wallBoxes = [];

// When creating a wall mesh:
const box = new THREE.Box3().setFromCenterAndSize(
  new THREE.Vector3(x, y, z),
  new THREE.Vector3(width, height, depth)
);
this.wallBoxes.push(box);

// Collision test: entity position + radius → temporary Box3
collides(position, radius = 1.1) {
  const body = new THREE.Box3().setFromCenterAndSize(
    new THREE.Vector3(position.x, 1.3, position.z), // fixed Y for ground entities
    new THREE.Vector3(radius * 2, 2.6, radius * 2)
  );
  return this.wallBoxes.some(box => box.intersectsBox(body));
}
```

### Movement Guard Pattern

```js
// ALWAYS test proposed position, not current
const nextPosition = this.position.clone();
nextPosition.x += Math.sin(angle) * speed * dt;
nextPosition.z += Math.cos(angle) * speed * dt;

arena.clampPosition(nextPosition, this.radius); // boundary first
if (!arena.collides(nextPosition, this.radius)) {
  this.position.copy(nextPosition); // only move if clear
}
```

### When to Use A vs B

| Criteria | Pattern A (manual AABB) | Pattern B (Box3) |
|----------|------------------------|-------------------|
| Entity type | Player vs level | Tanks/characters vs walls |
| Performance | Faster for < 100 obstacles | Better for complex layouts |
| Response | Returns obstacle info | Returns boolean |
| Dimension | Full 3D (flying games) | 2D on XZ plane (ground games) |
