---
name: threejs-racing-ai-driver
description: "Build or fix CPU racing drivers for Three.js or VIVERSE racing games. Use for waypoint loops, tile-to-route reconstruction, lap completion, recovery logic, and low-overhead debug workflows."
argument-hint: "Describe the track representation, current CPU symptom, and whether the failure is route build, progress tracking, or recovery spam"
---

# Three.js Racing AI Driver

## What This Skill Does

This skill gives a practical baseline for CPU car drivers in tile-based or waypoint-based racing games.

It focuses on the smallest set of patterns that usually decide whether the AI can actually finish a lap:

- route reconstruction from runtime track cells
- deterministic loop traversal
- stable waypoint generation
- forward-only progress tracking
- recovery logic that does not trigger on valid hairpins
- opt-in debug overlays and logging with low runtime overhead

This skill is intentionally biased toward runnable, low-ceremony algorithms instead of abstract AI architectures.

## Use This Skill When

- the CPU car jumps across the track to the wrong segment
- the waypoint list closes early or skips road tiles
- the car keeps entering recovery while still on the road
- a tile map or encoded runtime map must be turned into a closed drivable loop
- debug spheres, labels, or per-frame logs became expensive and should be opt-in

## Core Workflow

1. Treat route construction as the controlling problem.
2. Build a reciprocal connectivity graph from runtime track cells.
3. Validate the graph before generating waypoints.
4. Traverse the validated graph into an ordered closed loop.
5. Generate centerline waypoints with piecewise-linear subdivision.
6. Track progress forward along ordered segments only.
7. Gate recovery on genuine off-path or stalled conditions.
8. Keep visual and console debugging opt-in.

## Preferred Algorithm

### 1. Build a Road Graph

Input shape should be runtime cells such as:

```js
[ gx, gz, type, orient ]
```

For each traversable cell:

- derive legal exits from `type + orient`
- locate neighbor cells in those directions
- keep only reciprocal connections where both cells agree on the connection

For a normal closed loop, every road cell should have graph degree `2`.

If degree is not `2`, do not silently invent a route. Emit a diagnostic and stop or fall back explicitly.

### 2. Traverse the Loop Deterministically

Start from the finish cell or spawn cell.

- pick the neighbor that matches the start orientation when available
- walk neighbor-to-neighbor
- never choose among geometric "closest" cells to continue the loop
- stop only when the traversal returns to the start and all graph cells were visited

If traversal revisits a node before closure or misses cells, treat that as a route-build failure, not a steering failure.

### 3. Generate Waypoints from Ordered Cells

Use the ordered loop as the source of truth.

Preferred default:

- one anchor per ordered cell center
- linear subdivision between adjacent cell centers

This is usually safer than CatmullRom on narrow tile tracks because it never overshoots through inside corners.

Only use spline interpolation if the road width and topology clearly tolerate overshoot.

### 4. Track Progress by Sequence, Not Euclidean Proximity

Do not reselect the global nearest waypoint every frame on looping tracks.

Preferred options:

- segment projection with forward-only advancement
- perpendicular-plane crossing tests on the current ordered waypoint
- bounded forward reacquisition after collisions

Never allow progress to jump to a topologically distant but geometrically nearby arm of the track.

### 5. Keep Recovery Conservative

Recovery should only trigger when the car is genuinely failing.

Good recovery signals:

- materially off the route centerline
- nearly stopped for long enough
- backward relative to facing and not correcting
- no forward progress while also off-path or stalled

Bad recovery signals by themselves:

- large heading error during a valid hairpin
- temporarily flat waypoint index while still moving through a corner
- high steering demand on a narrow but correct segment

## Debug Pattern

Use a layered debug system:

- graph edges: verify track connectivity
- ordered cell labels: verify traversal order
- waypoint dots: verify sampled route shape
- current and next target highlight: verify runtime tracking
- explicit recovery reason logs: `wrong-way`, `stuck`, `no-progress`

Keep all of the above behind an explicit debug flag such as:

```txt
?debug=cpu
```

When debug is off:

- do not draw spheres, labels, or lines
- do not emit per-frame or interval console logs
- avoid building expensive temporary debug strings

## Practical Rules

1. Fix route topology before tuning steering.
2. Validate graph degree before blaming the controller.
3. Prefer linear interpolation on tight tile tracks.
4. Require off-path evidence before wrong-way recovery.
5. Keep debug visuals and logs opt-in only.

## Read Next

- [Route graph pattern](patterns/route-graph-from-cells.md)
- [Forward progress pattern](patterns/forward-progress-and-recovery.md)
- [Low-overhead debug pattern](patterns/low-overhead-racing-debug.md)
- [CPU driver example](examples/tile-racing-cpu-driver.md)