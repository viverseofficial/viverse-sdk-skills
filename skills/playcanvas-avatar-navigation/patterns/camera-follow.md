# Camera Follow System

Third-person orbit camera that follows the avatar during navigation and orbits a target point during free-look.

## Camera State

```javascript
const cameraState = {
    yaw: 45,              // Horizontal rotation (degrees)
    pitch: -30,           // Vertical rotation (degrees, negative = looking down)
    distance: 25,         // Distance from pivot point
    targetPos: new pc.Vec3(0, 0, 0),  // Where the camera should look
    pivot: new pc.Vec3(0, 0, 0),       // Smoothed camera target
    isRotating: false,    // Mouse drag state
};
```

## Camera Entity Setup

```javascript
const camera = new pc.Entity('camera');
camera.addComponent('camera', {
    clearColor: new pc.Color(0.1, 0.12, 0.15),
    farClip: 2000
});
app.root.addChild(camera);
```

## Mouse Orbit Controls

```javascript
app.mouse.on(pc.EVENT_MOUSEDOWN, (e) => {
    if (e.button === pc.MOUSEBUTTON_LEFT) cameraState.isRotating = true;
});
app.mouse.on(pc.EVENT_MOUSEUP, (e) => {
    if (e.button === pc.MOUSEBUTTON_LEFT) cameraState.isRotating = false;
});
app.mouse.on(pc.EVENT_MOUSEMOVE, (e) => {
    if (cameraState.isRotating) {
        cameraState.yaw -= e.dx * 0.3;
        cameraState.pitch = pc.math.clamp(
            cameraState.pitch - e.dy * 0.3, -85, 85
        );
    }
});
app.mouse.on(pc.EVENT_MOUSEWHEEL, (e) => {
    cameraState.distance = Math.max(cameraState.distance + e.wheel * 1.0, 2);
});
```

## Touch Support

```javascript
if (app.touch) {
    let lastTouchX = 0, lastTouchY = 0;
    app.touch.on(pc.EVENT_TOUCHSTART, (e) => {
        lastTouchX = e.touches[0].x;
        lastTouchY = e.touches[0].y;
    });
    app.touch.on(pc.EVENT_TOUCHMOVE, (e) => {
        const dx = e.touches[0].x - lastTouchX;
        const dy = e.touches[0].y - lastTouchY;
        cameraState.yaw -= dx * 0.3;
        cameraState.pitch = pc.math.clamp(cameraState.pitch - dy * 0.3, -85, 85);
        lastTouchX = e.touches[0].x;
        lastTouchY = e.touches[0].y;
    });
}
```

## Update Loop: Follow Avatar or Free-Look

```javascript
app.on('update', (dt) => {
    // --- Avatar Follow Mode ---
    if (avatar && isNavigating && avatarSpawned) {
        const avatarPos = avatar.getPosition();
        // Only follow if avatar is at a valid position
        if (avatarPos.x !== 0 || avatarPos.y !== 0 || avatarPos.z !== 0) {
            cameraState.targetPos.set(
                avatarPos.x, 
                avatarPos.y + 1,   // Slightly above avatar center
                avatarPos.z
            );
            // Auto-zoom in if camera is too far
            if (cameraState.distance > 30) {
                cameraState.distance = pc.math.lerp(cameraState.distance, 15, 0.2);
            }
        }
    }

    // --- Free-Look Mode (WASD to pan target, no avatar) ---
    if (!avatar || !avatarSpawned || !isNavigating) {
        const x = (kb.isPressed(pc.KEY_D) ? 1 : 0) - (kb.isPressed(pc.KEY_A) ? 1 : 0);
        const z = (kb.isPressed(pc.KEY_S) ? 1 : 0) - (kb.isPressed(pc.KEY_W) ? 1 : 0);
        if (x !== 0 || z !== 0) {
            const rad = cameraState.yaw * pc.math.DEG_TO_RAD;
            const dx = x * Math.cos(rad) - z * Math.sin(rad);
            const dz = x * Math.sin(rad) + z * Math.cos(rad);
            const speed = Math.max(15 * 2, cameraState.distance * 1.5);
            cameraState.targetPos.x += dx * speed * dt;
            cameraState.targetPos.z += dz * speed * dt;
        }
    }

    // --- Apply Camera Transform ---
    cameraState.pivot.lerp(cameraState.pivot, cameraState.targetPos, 0.1);

    const quat = new pc.Quat().setFromEulerAngles(cameraState.pitch, cameraState.yaw, 0);
    const pos = new pc.Vec3(0, 0, cameraState.distance);
    quat.transformVector(pos, pos);
    pos.add(cameraState.pivot);

    camera.setLocalPosition(pos);
    camera.lookAt(cameraState.pivot);
});
```

## Fit Camera to Bounds

Auto-position the camera to see the whole model:

```javascript
function fitCameraToBounds(cameraState, bounds, idealState, animate = true) {
    const maxExtent = Math.max(
        bounds.halfExtents.x, 
        bounds.halfExtents.y, 
        bounds.halfExtents.z
    );
    const targetDist = maxExtent * 2.5;

    cameraState.targetPos.copy(bounds.center);
    if (animate) {
        cameraState.distance = targetDist;
    }
}
```

## Model Switch Reset

When loading a new model, reset camera distance to prevent black screen:

```javascript
cameraState.distance = 25;  // Reset to default
```

> [!CAUTION]
> If camera distance stays at the value from a previous large model (e.g., 1277), the new smaller model will be invisible because the camera is too far away. This manifests as a "black screen" bug.
