# Tank Arena — Full Collision Example

Extracted from a working tank-battle template. Shows Box3 wall collision + projectile system + collectibles.

## Entity Setup (src/game/Tank.js)

```js
class Tank {
  constructor(id) {
    this.id = id;
    this.position = new THREE.Vector3();
    this.radius = 1.1;           // collision radius
    this.bodyAngle = 0;
    this.speed = 4.5;
  }

  // Movement with collision guard
  drive(throttle, dt, arena) {
    if (throttle === 0) return;
    const nextPosition = this.position.clone();
    nextPosition.x += Math.sin(this.bodyAngle) * this.speed * throttle * dt;
    nextPosition.z += Math.cos(this.bodyAngle) * this.speed * throttle * dt;

    // 1. Clamp to arena bounds
    arena.clampPosition(nextPosition, this.radius);
    // 2. Test wall collision at proposed position
    if (!arena.collides(nextPosition, this.radius)) {
      this.position.copy(nextPosition);  // safe to move
    }
  }
}
```

## Arena with Box3 Walls (src/game/Arena.js)

```js
class Arena {
  constructor(scene) {
    this.scene = scene;
    this.wallBoxes = [];    // THREE.Box3 array
    this.bounds = { minX: -20, maxX: 20, minZ: -20, maxZ: 20 };
  }

  addWall(x, z, width, depth) {
    const height = 2.6;
    const box = new THREE.Box3().setFromCenterAndSize(
      new THREE.Vector3(x, height / 2, z),
      new THREE.Vector3(width, height, depth)
    );
    this.wallBoxes.push(box);

    // Visual mesh
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(width, height, depth),
      new THREE.MeshLambertMaterial({ color: 0x556677 })
    );
    mesh.position.set(x, height / 2, z);
    this.scene.add(mesh);
  }

  collides(position, radius = 1.1) {
    const body = new THREE.Box3().setFromCenterAndSize(
      new THREE.Vector3(position.x, 1.3, position.z),
      new THREE.Vector3(radius * 2, 2.6, radius * 2)
    );
    return this.wallBoxes.some(box => box.intersectsBox(body));
  }

  clampPosition(position, radius = 1.1) {
    position.x = Math.max(this.bounds.minX + radius,
      Math.min(this.bounds.maxX - radius, position.x));
    position.z = Math.max(this.bounds.minZ + radius,
      Math.min(this.bounds.maxZ - radius, position.z));
  }

  // Collectible material nodes (distance-based pickup)
  collectMaterialAt(position, radius = 1.8) {
    for (const node of this.materialNodes) {
      if (node.collected) continue;
      if (node.position.distanceToSquared(position) <= radius * radius) {
        node.collected = true;
        this.materialGroup.remove(node.mesh);
        return true;
      }
    }
    return false;
  }
}
```

## Projectile System (src/game/ProjectileSystem.js)

```js
class ProjectileSystem {
  constructor(scene) {
    this.scene = scene;
    this.projectiles = [];
  }

  fire(origin, direction, speed, ownerId, type = 'normal') {
    const projectile = {
      position: origin.clone().addScaledVector(direction, 1.5), // offset from shooter
      velocity: direction.clone().multiplyScalar(speed),
      ownerId,
      radius: type === 'heavy' ? 0.28 : 0.2,
      life: 3.0,
      passesThroughWalls: type === 'piercing',
      projectileType: type,
      mesh: this.createBulletMesh(type)
    };
    projectile.mesh.position.copy(projectile.position);
    this.scene.add(projectile.mesh);
    this.projectiles.push(projectile);
  }

  update(dt, arena, tanks, onHit) {
    const survivors = [];

    for (const projectile of this.projectiles) {
      projectile.life -= dt;
      projectile.position.addScaledVector(projectile.velocity, dt);
      projectile.mesh.position.copy(projectile.position);

      // Lifetime expiry
      if (projectile.life <= 0) {
        this.scene.remove(projectile.mesh);
        continue;
      }

      // Wall collision (respects passesThroughWalls flag)
      if (!projectile.passesThroughWalls &&
          arena.collides(projectile.position, projectile.radius)) {
        this.scene.remove(projectile.mesh);
        continue;
      }

      // Entity hit (sphere vs sphere, squared distance)
      const hitTank = tanks.find(tank =>
        tank.id !== projectile.ownerId &&
        tank.position.distanceToSquared(projectile.position) <=
          Math.pow(tank.radius + projectile.radius, 2)
      );

      if (hitTank) {
        onHit(hitTank.id, projectile);
        this.scene.remove(projectile.mesh);
        continue;
      }

      survivors.push(projectile);
    }

    this.projectiles = survivors;
  }
}
```
