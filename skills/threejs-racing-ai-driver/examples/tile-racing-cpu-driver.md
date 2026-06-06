# Tile Racing CPU Driver Example

Use this shape when the track is runtime-authored from tiles.

```js
const route = buildRouteGraph(trackCells);
const loop = traverseClosedLoop(route, finishCell);
const waypoints = buildLinearWaypoints(loop, gridOffset, cellSize, 6);

const driver = {
  waypoints,
  segmentIndex: 0,
  update(vehicle, dt) {
    this.segmentIndex = advanceForwardOnly(this.segmentIndex, vehicle.position, waypoints);
    return stanleyControl(vehicle, this.segmentIndex, waypoints, dt);
  }
};
```

Debug workflow:

1. Draw ordered cell indices.
2. Draw reciprocal graph edges.
3. Draw waypoint dots.
4. If the CPU still fails, inspect recovery reason before touching steering gains.