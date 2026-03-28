# Avatar Controller

A rigidbody-based avatar with WASD movement, fly controls, and camera-relative direction.

## Spawning the Avatar

```javascript
function spawnAvatar(app, spawnPosition) {
    const avatar = new pc.Entity('avatar');
    app.root.addChild(avatar);

    // Visual — sphere (replace with GLB model for production)
    avatar.addComponent('render', { type: 'sphere' });
    const mat = new pc.StandardMaterial();
    mat.diffuse = new pc.Color(0.2, 0.8, 0.3);
    mat.update();
    if (avatar.render?.meshInstances[0]) {
        avatar.render.meshInstances[0].material = mat;
    }
    avatar.setLocalScale(1.5, 1.5, 1.5);

    // Physics — dynamic rigidbody
    avatar.addComponent('rigidbody', {
        type: 'dynamic',
        mass: 2,
        friction: 0.5,
        restitution: 0,
        angularDamping: 0.99,   // Prevent spinning
        angularFactor: pc.Vec3.ZERO  // Lock rotation axes
    });
    avatar.addComponent('collision', {
        type: 'sphere',
        radius: 0.75
    });

    // Teleport to spawn position
    avatar.rigidbody.teleport(spawnPosition.x, spawnPosition.y, spawnPosition.z);
    avatar.rigidbody.activate();

    return avatar;
}
```

## Finding a Safe Spawn Point

Use raycasting to find the ground surface:

```javascript
function findSafeSpawn(app, center, halfExtents) {
    const maxY = center.y + halfExtents.y;
    const rayStart = maxY + 50;
    const rayEnd = center.y - halfExtents.y - 10;

    const start = new pc.Vec3(center.x, rayStart, center.z);
    const end = new pc.Vec3(center.x, rayEnd, center.z);

    try {
        const result = app.systems.rigidbody.raycastFirst(start, end);
        if (result?.point) {
            const p = result.point.clone();
            p.y += 1.5;  // Above ground surface
            return p;
        }
    } catch (e) {
        console.warn("Raycast failed:", e.message);
    }

    // Fallback: top of scene + 10
    return new pc.Vec3(center.x, maxY + 10, center.z);
}
```

## Movement: WASD + Camera-Relative Direction

```javascript
// Inside the app update loop
app.on('update', (dt) => {
    if (!avatar?.rigidbody || !isNavigating) return;

    const kb = app.keyboard;
    const force = new pc.Vec3();

    // Camera-relative directions (flatten Y)
    const forward = camera.forward.clone();
    forward.y = 0; forward.normalize();
    const right = camera.right.clone();
    right.y = 0; right.normalize();

    // Input
    if (kb.isPressed(pc.KEY_W) || kb.isPressed(pc.KEY_UP))    force.add(forward);
    if (kb.isPressed(pc.KEY_S) || kb.isPressed(pc.KEY_DOWN))   force.sub(forward);
    if (kb.isPressed(pc.KEY_A) || kb.isPressed(pc.KEY_LEFT))   force.sub(right);
    if (kb.isPressed(pc.KEY_D) || kb.isPressed(pc.KEY_RIGHT))  force.add(right);

    if (force.length() > 0) {
        force.normalize().scale(30);  // Target velocity
        const currentVel = avatar.rigidbody.linearVelocity;
        const diff = new pc.Vec3(
            force.x - currentVel.x, 
            0, 
            force.z - currentVel.z
        );
        avatar.rigidbody.applyImpulse(diff.x * 20, 0, diff.z * 20);
        avatar.rigidbody.activate();

        // Smooth rotation to face movement direction
        const targetAngle = Math.atan2(force.x, force.z) * pc.math.RAD_TO_DEG;
        const curAngle = avatar.getEulerAngles().y;
        let angleDiff = targetAngle - curAngle;
        while (angleDiff > 180) angleDiff -= 360;
        while (angleDiff < -180) angleDiff += 360;
        avatar.setEulerAngles(0, curAngle + angleDiff * 0.2, 0);
    } else {
        // Friction — slow horizontal velocity when no input
        const vel = avatar.rigidbody.linearVelocity;
        avatar.rigidbody.linearVelocity = new pc.Vec3(
            vel.x * 0.9, vel.y, vel.z * 0.9
        );
    }
});
```

## Fly Mode (Space / Shift)

```javascript
// Inside the same update loop
const flyForce = new pc.Vec3();
if (kb.isPressed(pc.KEY_SPACE)) flyForce.y += 1;
if (kb.isPressed(pc.KEY_SHIFT)) flyForce.y -= 1;

if (flyForce.y !== 0) {
    const currentVel = avatar.rigidbody.linearVelocity;
    const targetVelY = flyForce.y * 15;
    const diffY = targetVelY - currentVel.y;
    avatar.rigidbody.applyImpulse(0, diffY * 10, 0);
    avatar.rigidbody.activate();
}
```

## Fall Recovery

Respawn if the avatar falls below the scene:

```javascript
if (avatar.getPosition().y < -100) {
    const spawnPos = findSafeSpawn(app, bounds.center, bounds.halfExtents);
    avatar.rigidbody.teleport(spawnPos.x, spawnPos.y + 10, spawnPos.z);
    avatar.rigidbody.linearVelocity = pc.Vec3.ZERO;
    avatar.rigidbody.activate();
}
```

## Avatar Lifecycle

When switching between models or toggling navigation:

```javascript
// Cleanup
function cleanupAvatar(avatar) {
    if (avatar) {
        safeDestroy(avatar);  // Use the safe destroy pattern!
    }
    avatarSpawned = false;
}

// Reset on new model
cameraState.distance = 25;  // Prevent stuck zoom
```

> [!WARNING]
> Always reset `avatarSpawned` flag when cleaning up. Without this, the camera follow logic may try to track a destroyed entity's position (always 0,0,0), snapping the camera to the origin.
