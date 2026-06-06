# Low-Overhead Racing Debug

## Goal

Keep diagnostics available without paying their cost during normal gameplay.

## Pattern

Expose a single debug flag and gate all expensive debug work behind it.

When debug is off:

- skip route sphere creation
- skip cell labels and sprite textures
- skip graph lines
- skip interval console logs
- skip debug string assembly

When debug is on, show only the minimum layers needed to isolate failure:

- ordered cell labels
- graph edges
- waypoint dots
- current target and next target
- recovery reason logs

## Minimal Pseudocode

```js
this.debugEnabled = Boolean(debug);

if (!this.debugEnabled) return;

console.log('[CPU]', reason, state);
```