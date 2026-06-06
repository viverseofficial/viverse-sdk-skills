# Route Graph From Runtime Cells

## Goal

Convert runtime road cells into a deterministic ordered loop for CPU driving.

## Pattern

1. Index cells by `gx,gz`.
2. Derive legal exits from each cell's `type + orient`.
3. Keep only reciprocal connections.
4. Verify every loop node has degree `2`.
5. Traverse from finish until the loop closes and all nodes were visited.

## Why This Works

It removes geometric guessing. The controller follows topology, not whichever nearby road cell looks closest.

## Minimal Pseudocode

```js
const graph = new Map();

for (const cell of cells) {
  const exits = getOpenDirections(cell);
  const neighbors = exits
    .map(([dx, dz]) => cellMap.get(key(cell.gx + dx, cell.gz + dz)))
    .filter(Boolean)
    .filter((neighbor) => connectsBack(neighbor, cell));
  graph.set(key(cell.gx, cell.gz), neighbors);
}

assertEveryNodeHasDegree2(graph);
const orderedLoop = walkClosedLoop(graph, finishCell);
```

## Failure Signals

- degree `0` or `1`: open road or wrong orient
- degree `3+`: ambiguous junction not supported by a simple lap driver
- revisit before closure: bad traversal or bad graph
- missing cells after closure: incomplete loop