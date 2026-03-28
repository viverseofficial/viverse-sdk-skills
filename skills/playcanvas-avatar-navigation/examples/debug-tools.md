# Debug Tools

Development tools for visualizing colliders and testing navigation without physics constraints.

## Debug Collider Visualization

Tag all debug entities for easy toggling, hidden by default:

```javascript
function createDebugColliderVisual(entity, color, label) {
    const debug = new pc.Entity(`debug-${label}`);
    debug.tags.add('debug_collider');
    debug.enabled = false;  // Hidden by default

    debug.addComponent('render', { type: 'box' });
    const mat = new pc.StandardMaterial();
    mat.diffuse = color;
    mat.opacity = 0.3;
    mat.blendType = pc.BLEND_NORMAL;
    mat.update();
    if (debug.render?.meshInstances[0]) {
        debug.render.meshInstances[0].material = mat;
    }

    // Match parent's collision shape
    const col = entity.collision;
    if (col) {
        const he = col.halfExtents;
        debug.setLocalScale(he.x * 2, he.y * 2, he.z * 2);
    }

    entity.addChild(debug);
    return debug;
}
```

### Toggle Function (global)

```javascript
window.__toggleDebugColliders = () => {
    const entities = app.root.findByTag('debug_collider');
    const newState = entities.length > 0 ? !entities[0].enabled : true;
    entities.forEach(e => { e.enabled = newState; });
    return newState;
};
```

## Ghost Mode

Disable building collisions to walk through walls during testing:

```javascript
window.__toggleGhostMode = () => {
    const colliders = app.root.find(
        n => n.name?.startsWith('building-collider-')
    );
    if (colliders.length === 0) return false;

    const isGhost = !colliders[0].collision?.enabled;
    const newEnabled = isGhost;  // Toggle
    colliders.forEach(c => {
        if (c.collision) c.collision.enabled = newEnabled;
    });
    return !newEnabled;  // Returns true if ghost mode is ON
};
```

## Collapsible UI Panel (React)

```jsx
<div style={{ position: 'relative' }}>
    {/* Gear icon button */}
    <button
        onClick={(e) => {
            const panel = e.target.closest('div')
                .querySelector('[data-debug-panel]');
            if (panel) {
                const vis = panel.style.display !== 'none';
                panel.style.display = vis ? 'none' : 'flex';
            }
        }}
        title="Dev Tools"
    >
        ⚙️
    </button>

    {/* Dropdown panel */}
    <div data-debug-panel style={{ display: 'none', flexDirection: 'column' }}>
        <button onClick={() => window.__toggleDebugColliders?.()}>
            🔍 Debug Colliders
        </button>
        <button onClick={() => window.__toggleGhostMode?.()}>
            👻 Ghost Mode
        </button>
    </div>
</div>
```

> [!TIP]
> Add `tabIndex={-1}` to all buttons so Space key (fly up) doesn't accidentally trigger button clicks when the avatar is flying.
