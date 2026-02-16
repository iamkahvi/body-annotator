# 3D Body Model Setup

## Quick Start

1. Download the model from Sketchfab:
   https://sketchfab.com/3d-models/lowpoly-ps1-basemesh-male-unwrapped-segmented-d214c630e7524a5fb394ce4fc963a3c4

2. Click "Download 3D Model" and select **glTF** format

3. Extract and rename the `.glb` file to `body.glb`

4. Place it in this directory: `models/body.glb`

5. Run the app and check the browser console for mesh names

6. Update `MESH_NAME_MAP` in `body3d.js` if automatic mapping doesn't work

## How Mesh Mapping Works

The loader will:
1. Log all mesh names found in the model to the console
2. Try to automatically match them to body parts using common naming patterns
3. Fall back to `MESH_NAME_MAP` for explicit overrides

If a body part isn't being detected, add an entry to `MESH_NAME_MAP`:

```javascript
const MESH_NAME_MAP = {
  'ActualMeshName': 'left_arm',
  'AnotherMesh': 'chest',
  // etc.
};
```

## Expected Body Parts

The app expects these body part names:

- head, neck
- left_shoulder, right_shoulder
- left_upper_arm, right_upper_arm
- left_elbow, right_elbow
- left_forearm, right_forearm
- left_hand, right_hand
- chest, abdomen, lower_back
- left_hip, right_hip
- left_thigh, right_thigh
- left_knee, right_knee
- left_calf, right_calf
- left_ankle, right_ankle
- left_foot, right_foot

## Alternative Models

If the BitHack model doesn't work well, try:
- [Low Poly Human Anatomy](https://sketchfab.com/3d-models/low-poly-human-anatomy-0be4d79f6f9b4bea8c2dca7f20479e92) - more detailed (10.7k triangles)
- [Segmented lowpoly base male PS1 style](https://sketchfab.com/3d-models/segmented-lowpoly-base-male-ps1-style-4effea73164b4d05bea791377a5623e5) - alternative segmented version

## Fallback

If no model is found at `models/body.glb`, the app automatically uses a procedural body made from simple 3D primitives.
