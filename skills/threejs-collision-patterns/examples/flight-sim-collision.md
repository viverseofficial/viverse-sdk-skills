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

  buildMountains() {
    for (let i = 0; i < 40; i++) {
      const radius = 8 + Math.random() * 17;
      const height = 15 + Math.random() * 45;
      const group = new THREE.Group();

      const body = new THREE.Mesh(
        new THREE.ConeGeometry(radius, height, 8),
        new THREE.MeshLambertMaterial({ color: 0x7a6b5a })
      );
      body.position.y = height / 2;
      group.add(body);

      group.position.set(
        (Math.random() - 0.5) * 800,
        0,
        (Math.random() - 0.5) * 800
      );
      this.scene.add(group);

      this.obstacles.push({
        type: 'cone',
        center: new THREE.Vector3(group.position.x, 0, group.position.z),
        radius: radius * 1.08,
        height,
        label: `mountain-${i + 1}`
      });
    }
  }

  checkCollision(point, radius = 1.5) {
    for (const obs of this.obstacles) {
      if (obs.type !== 'cone') continue;

      const minY = obs.center.y - radius;
      const maxY = obs.center.y + obs.height + radius;
      if (point.y < minY || point.y > maxY) continue;

      const relativeHeight = THREE.MathUtils.clamp(
        (point.y - obs.center.y) / obs.height,
        0,
        1
      );
      const coneRadiusAtY = obs.radius * (1 - relativeHeight);
      const allowedRadius = coneRadiusAtY + radius;
      const dx = point.x - obs.center.x;
      const dz = point.z - obs.center.z;

      if (dx * dx + dz * dz <= allowedRadius * allowedRadius) {
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

    const collision = this.level.checkCollision(
      this.player.getPosition(),
      PLAYER.COLLISION_RADIUS
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
