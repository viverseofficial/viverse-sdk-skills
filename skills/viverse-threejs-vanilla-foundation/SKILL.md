---
name: viverse-threejs-vanilla-foundation
description: Build VIVERSE-enabled browser games in vanilla Three.js using @pmndrs/viverse and @viverse/sdk. Use when you want Three.js without React.
prerequisites: [three, @pmndrs/viverse, @viverse/sdk, VITE VIVERSE app id]
tags: [viverse, threejs, vanilla, browser-game, foundation]
---

# VIVERSE Three.js Vanilla Foundation

Use `@pmndrs/viverse` for non-React Three.js game foundations with VIVERSE integration.

## When To Use This Skill

Use when you need:
- vanilla Three.js architecture (no React dependency)
- VIVERSE auth/profile integration in a custom render loop
- lightweight browser mini-game foundation

## Read Order

1. This file
2. [Without React intro](https://pmndrs.github.io/viverse/without-react/introduction)
3. `../viverse-auth/SKILL.md`
4. `../viverse-world-publishing/SKILL.md`

## Preflight Checklist

- [ ] Install deps: `three`, `@pmndrs/viverse`, `@viverse/sdk`, `vite`
- [ ] Prepare production App ID env (`VITE_VIVERSE_APP_ID` or mapped equivalent)
- [ ] Confirm render loop + resize lifecycle is implemented
- [ ] Confirm asset loading fallbacks exist

## Implementation Workflow

1. Create scene/camera/renderer/canvas and resize handling.
2. Add environment (sky/lights/map).
3. Initialize VIVERSE client and auth/profile fetch (see viverse-auth skill).
4. Launch game loop immediately — DO NOT block on auth.
5. Show profile chip as soon as auth resolves (guest fallback if it fails).
6. Implement stable `requestAnimationFrame` update loop.

## Proven Pattern — UMD Script Tag (not @pmndrs/viverse)

All working VIVERSE Three.js games use the hosted UMD script tag, not npm packages:

```html
<!-- index.html -->
<script src="https://www.viverse.com/static-assets/viverse-sdk/index.umd.cjs"></script>
<script>
  window.__GAME_CONFIG__ = {
    clientId: "YOUR_APP_ID",        <!-- replaced at build time -->
    leaderboardName: "my-score",
    versionName: "0.1.0"
  };
</script>
```

App ID resolution (viverseConfig.js):
```js
const HOSTNAME_PATTERN = /^([a-z0-9]{10})(?:-preview)?\.world\.viverse\.app$/i;
function resolveAppId() {
  const cfg = window.__GAME_CONFIG__ || {};
  const explicit = String(cfg.clientId || '').trim();
  if (/^[a-z0-9]{10}$/i.test(explicit)) return explicit;
  const m = window.location.hostname.match(HOSTNAME_PATTERN);
  return m ? m[1].toLowerCase() : '';
}
```

## Canvas Setup (Critical for VIVERSE iframe)

```js
// Canvas MUST have tabindex for keyboard/mouse capture inside VIVERSE iframe
const canvas = renderer.domElement;
canvas.setAttribute('tabindex', '0');
canvas.style.outline = 'none';
document.getElementById('app').appendChild(canvas);

// Delay focus slightly to override post-click browser focus grab
setTimeout(() => canvas.focus(), 100);
canvas.addEventListener('mousedown', () => canvas.focus());
```

Without `tabIndex` + `.focus()`, ALL keyboard and mouse events are silently dropped
inside VIVERSE Worlds iframe. This is the #1 gotcha for new Three.js games on VIVERSE.

## Game Loop Pattern

```js
class Game {
  _lastTime = 0;
  _loop(ts = 0) {
    requestAnimationFrame(t => this._loop(t));
    const dt = Math.min((ts - this._lastTime) / 1000, 0.1); // cap dt to 100ms
    this._lastTime = ts;
    this.update(dt);
    this.renderer.render(this.scene, this.camera);
  }
}
// Start: new Game() → calls this._loop()
```

## Auth-Decoupled Launch Pattern

```js
// main.js — game launches immediately, auth fills in chip async
const chip = new ProfileChip();
const auth = new ViverseAuthController(state => {
  if (state.status === 'ready') {
    state.isAuthenticated ? chip.setProfile(state.profile) : chip.setGuest();
  }
});
auth.initialize().catch(() => chip.setGuest()); // never blocks
const game = new Game();                         // starts immediately
```

## OrbitControls Integration

For adjustable camera angle (orbit/zoom/pan) in a Three.js game:

```javascript
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 2, -4);     // pivot point (battlefield center)
controls.enableDamping  = true;    // smooth inertia
controls.dampingFactor  = 0.06;
controls.minDistance    = 10;
controls.maxDistance    = 80;
controls.minPolarAngle  = 0.05;           // near top-down
controls.maxPolarAngle  = Math.PI * 0.72; // low side angle limit
controls.rotateSpeed    = 0.6;
controls.update();

// In render loop (replaces manual camera lookAt):
controls.update(); // must call every frame when damping is on
renderer.render(scene, camera);

// Camera shake still works — apply offset AFTER controls.update()
if (shakeIntensity > 0.005) {
  camera.position.x += (Math.random()-0.5) * shakeIntensity;
  camera.position.y += (Math.random()-0.5) * shakeIntensity;
  shakeIntensity *= 0.85;
}
```

> [!CAUTION]
> Do NOT call `camera.lookAt()` manually when OrbitControls is active — they conflict. OrbitControls manages the lookAt internally via `controls.target`.

## VFX Object Pooling (Performance)

Creating/disposing `THREE.Mesh` every frame (trail dots, sparks) causes GC spikes. Pre-allocate pools:

```javascript
const POOL_SIZE = 80;
const trailGeo  = new THREE.SphereGeometry(0.07, 3, 3);
const pool = Array.from({length: POOL_SIZE}, () => {
  const mesh = new THREE.Mesh(trailGeo, new THREE.MeshBasicMaterial({transparent:true}));
  mesh.visible = false;
  scene.add(mesh);
  return { mesh, life: 0, active: false };
});
let head = 0; // ring-buffer cursor

function spawnTrail(pos) {
  const slot = pool[head % POOL_SIZE];
  head++;
  slot.mesh.position.copy(pos);
  slot.mesh.visible = true;
  slot.life = 0.18;
  slot.active = true;
}

function updatePool(dt) {
  for (const s of pool) {
    if (!s.active) continue;
    s.life -= dt;
    if (s.life <= 0) { s.active = false; s.mesh.visible = false; }
    else s.mesh.material.opacity = s.life / 0.18 * 0.7;
  }
}
```

## Bloom Post-processing

```javascript
import { EffectComposer }  from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass }      from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass }      from 'three/examples/jsm/postprocessing/OutputPass.js';

renderer.toneMapping = THREE.ACESFilmicToneMapping;
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  0.75,  // strength
  0.4,   // radius
  0.6    // threshold — only emissive surfaces glow
);
composer.addPass(bloom);
composer.addPass(new OutputPass());

// Use composer.render() instead of renderer.render() in loop
// On resize:
composer.setSize(w, h);
bloom.resolution.set(w, h);
```

## Collision Performance — Z-range Early Exit

For tower defense with many arrows × many enemies, skip most pairs with a cheap z-check:

```javascript
for (const arrow of arrows) {
  if (!arrow.alive) continue;
  for (const enemy of enemies) {
    if (!enemy.alive) continue;
    if (Math.abs(arrow.pos.z - enemy.pos.z) > 2.5) continue; // ← skips ~90% of pairs
    if (arrow.checkEnemy(enemy)) { /* hit */ }
  }
}
```

## Enemy Hit Flash — Timer Not setTimeout

Using `setTimeout` for a 80ms material flash at high fire rates creates hundreds of queued callbacks and GC pressure. Use a frame timer instead:

```javascript
// In takeDamage():
this._hitFlash = 0.08;
mesh.material.emissive.setHex(0xffffff);

// In update(dt):
if (this._hitFlash > 0) {
  this._hitFlash -= dt;
  if (this._hitFlash <= 0) {
    mesh.material.emissive.setHex(0);
    mesh.material.emissiveIntensity = 0;
  }
}
```

## Verification Checklist

- [ ] Canvas has `tabindex="0"` and `.focus()` called after game start
- [ ] Game loop starts without waiting for auth
- [ ] Profile chip shows avatar when auth succeeds, "Guest" when it fails
- [ ] Scene renders and updates on browser resize
- [ ] Auth/profile fetch succeeds in VIVERSE preview environment
- [ ] Game still runs when profile/avatar is unavailable

## Critical Gotchas

- **Canvas tabindex is mandatory** — without it, all input silently drops in VIVERSE iframe
- **Never block game start on auth** — auth can take 3-5s; game should start immediately
- **App ID injection**: sed `YOUR_APP_ID` in index.html at publish time, then rebuild
- Guard async auth/profile requests against unmount/dispose races
- Keep mobile/browser performance constraints in scope (mini-game assets)

## References

- [Without React introduction](https://pmndrs.github.io/viverse/without-react/introduction)
- [pmndrs/viverse repository](https://github.com/pmndrs/viverse)
