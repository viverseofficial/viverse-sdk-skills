# Safe Physics Cleanup

The most critical pattern in PlayCanvas + Ammo.js development. Directly calling `entity.destroy()` on entities with rigidbody or collision components will crash Ammo.js.

## The Problem

Ammo.js (Bullet physics compiled to WASM) maintains internal pointers to physics objects. When PlayCanvas destroys an entity, it tries to remove the physics body. If the physics world is mid-step or the body was already freed, Ammo throws:

```
Error: Cannot destroy object. (Did you create it yourself?)
```

This crash is **fatal** — the entire physics system stops working.

## The Solution: Deferred Destruction Queue

### Step 1: Queue entities for destruction

```javascript
const destructionQueue = new Set();
let cleanupScheduled = false;
let physicsCooldown = false;

function safeDestroy(entity) {
    if (!entity || entity._destroyed) return;
    
    entity.enabled = false;          // Hide immediately
    destructionQueue.add(entity);    // Queue for safe removal
    
    if (!cleanupScheduled) {
        cleanupScheduled = true;
        app.once('postUpdate', () => runCleanup(app));  // Destroy AFTER physics step
    }
}
```

### Step 2: Run cleanup after physics step

```javascript
function runCleanup(app) {
    if (!app || app._destroyed) {
        destructionQueue.clear();
        cleanupScheduled = false;
        return;
    }

    const items = Array.from(destructionQueue);
    destructionQueue.clear();
    cleanupScheduled = false;

    items.forEach(entity => {
        if (!entity || entity._destroyed) return;

        const isPhysicsHeavy = 
            entity.name.includes('physics') ||
            entity.name.includes('avatar') ||
            entity.name.includes('ground') ||
            entity.name.includes('landmark') ||
            entity.name.includes('building') ||
            entity.tags?.has('survivor_ground');

        if (isPhysicsHeavy) {
            // CRITICAL: Remove physics components FIRST
            entity.enabled = false;
            try { if (entity.rigidbody) entity.removeComponent('rigidbody'); } catch(e) {}
            try { if (entity.collision) entity.removeComponent('collision'); } catch(e) {}

            // Set cooldown, defer actual destruction
            physicsCooldown = true;
            setTimeout(() => {
                if (entity && !entity._destroyed) entity.destroy();
                physicsCooldown = false;
            }, 0);
        } else {
            entity.destroy();
        }
    });
}
```

### Step 3: Guard creation until cleanup finishes

```javascript
function startCreation() {
    if (cleanupScheduled || physicsCooldown) {
        // Poll until cleanup is complete
        let retries = 0;
        const timer = setInterval(() => {
            retries++;
            if (!cleanupScheduled && !physicsCooldown) {
                clearInterval(timer);
                startCreation();  // Retry
            } else if (retries >= 40) {  // 2s timeout
                clearInterval(timer);
                cleanupScheduled = false;
                physicsCooldown = false;
                startCreation();  // Force proceed
            }
        }, 50);
        return;
    }
    
    // Safe to create new entities with physics
    createGroundPlane();
    createBuildingColliders();
    // etc.
}
```

## Why This Pattern Exists

| Approach | Result |
|----------|--------|
| `entity.destroy()` directly | ❌ Ammo.js crash |
| Remove components then destroy | ❌ Race condition if physics is mid-step |
| Defer to `postUpdate` | ❌ May still crash if cooldown not observed |
| Queue + postUpdate + component-first + cooldown | ✅ Safe |

## Key Rules

1. **Always remove `rigidbody` before `collision`** — collision depends on rigidbody
2. **Parent entities with physics children are physics-heavy** — `landmark` contains building colliders
3. **Use `setTimeout(0)` between component removal and `destroy()`** — gives Ammo one tick to settle
4. **Poll with `setInterval`, don't chain `postUpdate`** — postUpdate chaining can miss cooldown windows
