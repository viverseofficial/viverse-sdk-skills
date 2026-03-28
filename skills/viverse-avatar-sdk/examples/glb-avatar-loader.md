# GLB Avatar Loader

End-to-end example of loading a VIVERSE avatar into a PlayCanvas scene, with fallback to placeholder.

## Complete Implementation

```javascript
/**
 * Load and display a VIVERSE user's avatar in a PlayCanvas scene.
 * 
 * @param {pc.Application} app - PlayCanvas application
 * @param {string|null} avatarUrl - GLB URL from viverseService.getUserData().avatarUrl
 * @param {pc.Vec3} spawnPosition - Where to place the avatar
 * @param {object} options - Configuration
 * @param {boolean} options.addPhysics - Attach rigidbody for navigation (default: true)
 * @param {number} options.targetHeight - Desired avatar height in meters (default: 1.8)
 * @returns {Promise<pc.Entity>} The loaded avatar entity
 */
async function loadViverseAvatar(app, avatarUrl, spawnPosition, options = {}) {
    const { addPhysics = true, targetHeight = 1.8 } = options;

    let avatar;

    if (avatarUrl) {
        try {
            avatar = await loadGLB(app, avatarUrl, 'viverse-avatar');
            normalizeHeight(avatar, targetHeight);
        } catch (e) {
            console.warn('GLB load failed, using placeholder:', e);
            avatar = createSphere(app);
        }
    } else {
        avatar = createSphere(app);
    }

    avatar.name = 'avatar';
    app.root.addChild(avatar);

    if (addPhysics) {
        avatar.addComponent('rigidbody', {
            type: 'dynamic',
            mass: 2,
            friction: 0.5,
            restitution: 0,
            angularDamping: 0.99,
            angularFactor: pc.Vec3.ZERO
        });
        avatar.addComponent('collision', {
            type: 'sphere',
            radius: 0.75
        });
        avatar.rigidbody.teleport(
            spawnPosition.x, 
            spawnPosition.y, 
            spawnPosition.z
        );
        avatar.rigidbody.activate();
    } else {
        avatar.setLocalPosition(
            spawnPosition.x, 
            spawnPosition.y, 
            spawnPosition.z
        );
    }

    return avatar;
}

// --- Helpers ---

function loadGLB(app, url, name) {
    return new Promise((resolve, reject) => {
        const asset = new pc.Asset(name, 'container', { url });
        asset.on('load', () => {
            const entity = asset.resource.instantiateRenderEntity();
            resolve(entity);
        });
        asset.on('error', reject);
        app.assets.add(asset);
        app.assets.load(asset);
    });
}

function normalizeHeight(entity, targetHeight) {
    const aabb = new pc.BoundingBox();
    const meshInstances = entity.findComponents('render')
        .flatMap(r => r.meshInstances || []);
    
    if (meshInstances.length > 0) {
        aabb.copy(meshInstances[0].aabb);
        meshInstances.slice(1).forEach(mi => aabb.add(mi.aabb));
        
        const currentHeight = aabb.halfExtents.y * 2;
        if (currentHeight > 0) {
            const scale = targetHeight / currentHeight;
            entity.setLocalScale(scale, scale, scale);
        }
    }
}

function createSphere(app) {
    const entity = new pc.Entity('avatar');
    entity.addComponent('render', { type: 'sphere' });
    const mat = new pc.StandardMaterial();
    mat.diffuse = new pc.Color(0.2, 0.8, 0.3);
    mat.update();
    if (entity.render?.meshInstances[0]) {
        entity.render.meshInstances[0].material = mat;
    }
    entity.setLocalScale(1.5, 1.5, 1.5);
    return entity;
}
```

## Usage

```javascript
const userData = viverseService.getUserData();
const spawnPos = findSafeSpawn(app, bounds.center, bounds.halfExtents);
const avatar = await loadViverseAvatar(app, userData?.avatarUrl, spawnPos);
```
