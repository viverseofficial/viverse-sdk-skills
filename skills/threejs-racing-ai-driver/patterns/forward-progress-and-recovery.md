# Forward Progress And Recovery

## Goal

Prevent the CPU from jumping to nearby wrong segments or entering recovery while still cornering correctly.

## Pattern

- Track a current ordered waypoint or segment index.
- Advance only forward.
- Allow bounded forward reacquisition after collisions.
- Trigger recovery only when the car is off-path, stalled, or going backward long enough.

## Recovery Rules

Use these signals together:

- distance from route centerline
- signed forward speed
- time without route progress
- explicit recovery reason string for logs

Avoid using heading error alone on tile-based hairpins.

## Minimal Pseudocode

```js
if (offPath && Math.abs(headingError) > wrongWayAngle && speed > minSpeed) {
  startRecovery('wrong-way');
}

if (noProgressTime > maxNoProgress && (offPath || speed < stallSpeed || fwdSpeed < minFwd)) {
  startRecovery('no-progress');
}

if (wellTracked && fwdSpeed > healthyFwdSpeed) {
  noProgressTime = Math.max(0, noProgressTime - dt * 2);
}
```