# Flight Simulator — Full Collision Example

Extracted from a working flight-simulator template. Shows all collision patterns integrated together.

## Constants (src/core/Constants.js)

```js
export const PLAYER = {
  COLLISION_RADIUS: 1.65,
  FORWARD_SPEED: 26,
};

export const RING = {
  RADIUS: 4,
  SCORE_DISTANCE: 5,
  MAGNET_RADIUS: 18,
  MAGNET_SPAWN_INTERVAL: 3,
  MAGNET_SPAWN_CHANCE: 1.0,
  MAGNET_DURATION: 7,
};

export const LEVEL = {
  OFFICE_WIDTH: 120,
  OFFICE_HEIGHT: 60,
  OFFICE_LENGTH: 600,
};
```

## Level Builder (src/level/LevelBuilder.js)

```js
import * as THREE from 'three';
import { LEVEL } from '../core/Constants.js';

export class LevelBuilder {
  constructor(scene) {
    this.scene = scene;
    this.obstacles = [];
    this.buildWalls();
    this.buildFurniture();
  }

  addBox({ position, scale, material, label, collidable = true }) {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(scale.x, scale.y, scale.z), material
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

  buildWalls() {
    const wallMat = new THREE.MeshLambertMaterial({ color: 0x8899aa });
    const halfW = LEVEL.OFFICE_WIDTH / 2;
    // Collidable walls
    this.addBox({ position: new THREE.Vector3(-halfW, 30, 0),
      scale: new THREE.Vector3(3, 60, LEVEL.OFFICE_LENGTH),
      material: wallMat, label: 'left wall' });
    this.addBox({ position: new THREE.Vector3(halfW, 30, 0),
      scale: new THREE.Vector3(3, 60, LEVEL.OFFICE_LENGTH),
      material: wallMat, label: 'right wall' });
    // Non-collidable decoration
    const glassMat = new THREE.MeshBasicMaterial({ color: 0x9fc7d4, transparent: true, opacity: 0.4 });
    this.addBox({ position: new THREE.Vector3(-halfW + 1.8, 35, 0),
      scale: new THREE.Vector3(0.6, 18, 34),
      material: glassMat, label: 'window', collidable: false });
  }

  buildFurniture() {
    const deskMat = new THREE.MeshLambertMaterial({ color: 0x665544 });
    this.addBox({ position: new THREE.Vector3(10, 5, -50),
      scale: new THREE.Vector3(28, 6, 18),
      material: deskMat, label: 'desk' });
  }

  checkCollision(point, radius = 1.5) {
    // Boundary check first
    if (point.z < -LEVEL.OFFICE_LENGTH / 2 || point.z > LEVEL.OFFICE_LENGTH / 2) {
      return { label: 'office boundary' };
    }
    // AABB check
    for (const obs of this.obstacles) {
      const dx = Math.max(Math.abs(point.x - obs.center.x) - obs.halfSize.x, 0);
      const dy = Math.max(Math.abs(point.y - obs.center.y) - obs.halfSize.y, 0);
      const dz = Math.max(Math.abs(point.z - obs.center.z) - obs.halfSize.z, 0);
      if (dx * dx + dy * dy + dz * dz <= radius * radius) {
        return obs;
      }
    }
    return null;
  }
}
```

## Game Loop (src/core/Game.js)

```js
animate() {
  requestAnimationFrame(() => this.animate());
  const delta = Math.min(this.clock.getDelta(), 0.05);

  if (gameState.started && !gameState.gameOver && this.player) {
    this.player.update(delta, this.input);

    // Collision check AFTER player moves (flight game = death on hit)
    const collision = this.level.checkCollision(
      this.player.getPosition(), PLAYER.COLLISION_RADIUS
    );
    if (collision) {
      console.warn('[Game] Collision with', collision.label);
      eventBus.emit(Events.PLAYER_DIED);
    }

    // Ring/collectible system (distance-based pickup)
    if (this.ringSystem) {
      this.ringSystem.update(delta, this.player.getPosition());
    }
  }

  this.renderer.render(this.scene, this.camera);
}
```

## Ring System with Magnet Power-Up (src/systems/RingSystem.js)

```js
update(delta, playerPosition) {
  // Magnet power-up spawn timer
  if (!this.magnetPowerUp) {
    this.magnetSpawnTimer -= delta;
    if (this.magnetSpawnTimer <= 0) {
      this.magnetSpawnTimer = RING.MAGNET_SPAWN_INTERVAL;
      if (Math.random() <= RING.MAGNET_SPAWN_CHANCE) {
        this.spawnMagnetPowerUp(playerPosition);
      }
    }
  } else {
    // Power-up pickup check (generous radius)
    if (this.magnetPowerUp.position.distanceTo(playerPosition) <= 4.75) {
      this.collectMagnetPowerUp();
    }
  }

  // Ring collection (distance-based)
  for (const ring of this.rings) {
    if (ring.userData.collected) continue;
    const dist = ring.position.distanceTo(playerPosition);
    if (dist < RING.SCORE_DISTANCE) {
      ring.userData.collected = true;
      gameState.score++;
    }
  }
}
```
