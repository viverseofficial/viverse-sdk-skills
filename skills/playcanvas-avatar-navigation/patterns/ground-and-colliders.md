# Ground Planes and Colliders

How to create physics-enabled ground planes, boundary walls, and building colliders for avatar navigation.

## Ground Plane

A large static rigidbody that prevents the avatar from falling infinitely.

```javascript
function createGroundPlane(app) {
    const ground = new pc.Entity('survivor_ground-' + Date.now());
    ground.tags.add('survivor_ground');
    app.root.addChild(ground);

    // Visual
    ground.addComponent('render', { type: 'box' });
    const mat = new pc.StandardMaterial();
    mat.diffuse = new pc.Color(0.2, 0.2, 0.2);
    mat.update();
    if (ground.render?.meshInstances[0]) {
        ground.render.meshInstances[0].material = mat;
    }
    ground.setLocalScale(2000, 1, 2000);
    ground.setLocalPosition(0, -0.5, 0);

    // Physics — rigidbody FIRST, then collision
    ground.addComponent('rigidbody', { type: 'static', restitution: 0.5 });
    ground.addComponent('collision', { 
        type: 'box', 
        halfExtents: new pc.Vec3(1000, 0.5, 1000) 
    });

    return ground;
}
```

> [!IMPORTANT]
> Always add `rigidbody` before `collision`. Adding collision without a rigidbody can cause Ammo.js errors in some PlayCanvas versions.

## Boundary Walls

Invisible walls at the edges of the navigable area to prevent the avatar from walking off.

```javascript
function createBoundaryWalls(app, size = 60) {
    const halfSize = size / 2;
    const wallHeight = 20;
    const walls = [
        { pos: [halfSize, wallHeight/2, 0],       half: [0.5, wallHeight/2, halfSize] },  // East
        { pos: [-halfSize, wallHeight/2, 0],      half: [0.5, wallHeight/2, halfSize] },  // West
        { pos: [0, wallHeight/2, halfSize],       half: [halfSize, wallHeight/2, 0.5] },  // North
        { pos: [0, wallHeight/2, -halfSize],      half: [halfSize, wallHeight/2, 0.5] },  // South
    ];

    walls.forEach((w, i) => {
        const wall = new pc.Entity(`building-collider-wall-${i}`);
        app.root.addChild(wall);
        wall.setLocalPosition(...w.pos);
        wall.addComponent('rigidbody', { type: 'static' });
        wall.addComponent('collision', { 
            type: 'box', 
            halfExtents: new pc.Vec3(...w.half) 
        });
    });
}
```

## Building Colliders from Bounding Boxes

Given bounding box metadata (from voxelization or model analysis), create colliders for each building.

```javascript
function createBuildingColliders(app, boundingBoxes) {
    boundingBoxes.forEach((bb, index) => {
        const { center, halfExtents } = bb;
        
        const collider = new pc.Entity(`building-collider-${index}`);
        app.root.addChild(collider);
        collider.setLocalPosition(center.x, center.y, center.z);
        
        collider.addComponent('rigidbody', { type: 'static' });
        collider.addComponent('collision', {
            type: 'box',
            halfExtents: new pc.Vec3(
                halfExtents.x, 
                halfExtents.y, 
                halfExtents.z
            )
        });
    });
}
```

## Physics-Heavy Entity Detection

When destroying entities, check if they contain physics components (directly or via children):

```javascript
const isPhysicsHeavy = 
    entity.name.includes('physics') ||
    entity.name.includes('avatar') ||
    entity.name.includes('ground') ||
    entity.name.includes('landmark') ||   // Parent of building colliders
    entity.name.includes('building') ||
    entity.tags?.has('survivor_ground');
```

## Safe Component Addition

Wrap `addComponent` calls to handle double-add scenarios:

```javascript
function safeAddComponent(entity, type, props, app, isDebug = false) {
    if (entity[type]) {
        if (isDebug) console.log(`[Safe] Skipping ${type} — already exists on ${entity.name}`);
        return;
    }
    entity.addComponent(type, props);
}
```
