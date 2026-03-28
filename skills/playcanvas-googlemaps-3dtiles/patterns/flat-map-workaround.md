# Flat Map Workaround (3D Tiles)

Detect when Google Photorealistic 3D Tiles return "flat" data (e.g., parks, water, or 2D areas) and fall back to top-down blueprints.

## The Problem

Some geographic areas lack 3D mesh data in Google's dataset. In these cases, the renderer might show a flat texture or nothing at all, making navigation impossible or visually empty.

## Detection Logic

To detect a flat landmark, analyze the bounding boxes of the loaded tiles:

1. Calculate the total height (Y-axis) variance of all bounding boxes in the landmark.
2. If `maxY - minY < threshold` (e.g., 0.5 meters), mark the landmark as `isFlat`.

```javascript
const heightVariance = boundingBox.maxY - boundingBox.minY;
if (heightVariance < 0.5) {
    landmark.isFlat = true;
}
```

## Fallback Strategy: Blueprints

When `isFlat` is true:
1. Do not attempt to voxelize or generate physics for the (missing) 3D mesh.
2. Instead, fetch a top-down "blueprint" image or map tile for that coordinate.
3. Render the blueprint as a flat plane at `y=0`.
4. Provide a "Survivor Ground" physics plane to allow the avatar to walk on the 2D area.

## UI Feedback

Always notify the user if a landmark is flat:
- "This area is currently flat. Showing blueprint view."
- If no blueprint is available: "3D data is not available for this location."
