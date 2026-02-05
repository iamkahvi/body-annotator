# 3D Body Model Annotation: Research Document

## Problem Statement

Implement an interactive 3D human body model that users can rotate, zoom, and click to annotate specific body parts. The core challenge is establishing a coordinate system that reliably maps user clicks to named body regions.

---

## Approach 1: Pre-Segmented Mesh (Recommended for Prototype)

Load a 3D model where each body part is a **separate mesh object** with a unique name. Click detection uses raycasting to identify which mesh was hit.

### How it works
```
Model structure:
├── head (mesh)
├── neck (mesh)
├── left_shoulder (mesh)
├── right_shoulder (mesh)
├── torso (mesh)
└── ... etc
```

When user clicks, raycast returns the intersected mesh name directly.

### Pros
- Simplest implementation
- Direct 1:1 mapping between mesh names and your existing `BODY_PARTS` array
- No coordinate math or region detection needed
- Fast click detection (built into Three.js/Babylon.js)

### Cons
- Requires finding or creating a properly segmented model
- Visual seams between parts can be visible
- Less anatomically detailed (muscle-level granularity difficult)

### Sources for pre-segmented models
- **MakeHuman** (free, exports with body part groups)
- **Mixamo** (free with Adobe account, rigged characters)
- **Sketchfab** (search "low poly human body parts", many free options)
- **TurboSquid** (paid options with better quality)

---

## Approach 2: Single Mesh with Vertex Groups / Bone Weights

Use a single seamless mesh with a skeleton (armature). Body parts are defined by which vertices are weighted to which bones.

### How it works
1. Load rigged model (glTF with skeleton)
2. On click, raycast to get the hit face/vertex
3. Look up which bone has the highest weight for that vertex
4. Map bone name to body part

### Pros
- Seamless visual appearance
- Standard rigged models are abundant
- Can reuse animation-ready models

### Cons
- More complex implementation
- Weight lookup requires parsing bone data
- Edge cases: vertices weighted to multiple bones
- Three.js doesn't expose bone weights directly (need custom shader or geometry inspection)

### Implementation complexity
Medium-high. Would need to:
```javascript
// Pseudocode
const intersection = raycaster.intersectObject(mesh);
const faceIndex = intersection.faceIndex;
const vertexIndices = getVerticesForFace(faceIndex);
const boneIndex = getDominantBone(vertexIndices, skinWeights);
const bodyPart = boneToPartMapping[skeleton.bones[boneIndex].name];
```

---

## Approach 3: UV Coordinate Region Mapping

Define body part regions as areas in UV texture space. Click position is converted to UV coordinates and looked up against a region map.

### How it works
1. Create a "body part map" texture (each region a different color)
2. On click, get UV coordinates of hit point
3. Sample the map texture at those UVs
4. Color → body part name

### Pros
- Works with any UV-mapped model
- Pixel-level precision possible
- Region boundaries easily editable in image editor

### Cons
- Requires creating the UV region map (manual work)
- Model must have good UV unwrapping
- Additional texture lookup on each click

### Best for
Fine-grained anatomical selection (individual muscles) if you have or create the map texture.

---

## Approach 4: 3D Bounding Volumes / Spatial Regions

Define body parts as 3D bounding boxes, spheres, or capsules in world space. Map click point to nearest/containing region.

### How it works
1. Define regions: `{ name: 'head', center: [0, 1.7, 0], radius: 0.15 }`
2. On click, raycast to get 3D hit point
3. Check which region contains or is nearest to that point

### Pros
- Model-agnostic (works with any mesh)
- Easy to visualize and debug
- Can be defined programmatically

### Cons
- Imprecise at boundaries
- Doesn't follow mesh surface (clicks on arm near torso might register as torso)
- Manual tuning of region bounds required

---

## Approach 5: Medical/Anatomical Library Integration

Use a specialized library designed for anatomical visualization.

### Options

**BioDigital Human** (biodigital.com)
- Professional anatomical platform
- Has API for embedding
- Comes with labeled anatomy
- **Cost**: Paid, enterprise pricing

**Zygote Body** (zygotebody.com)
- Detailed anatomical model
- Limited embedding options
- **Cost**: Licensing required for commercial use

**3D4Medical**
- Medical education focused
- No web embedding

### Pros
- Extremely detailed anatomical accuracy
- Pre-labeled muscles, bones, organs
- Professional quality

### Cons
- Significant licensing costs
- Overkill for injury logging (user doesn't need liver/kidney detail)
- Less control over customization
- May have usage restrictions

---

## Technology Comparison: Three.js vs Babylon.js

### Three.js
- More popular, larger ecosystem
- Lighter weight
- More examples/tutorials online
- Manual setup for many features

### Babylon.js
- Built-in action manager (click handling simpler)
- Better built-in physics
- Heavier bundle size
- Strong TypeScript support

**Recommendation**: Three.js for this project. Simpler, lighter, and click handling is straightforward with raycasting.

---

## Model Format Recommendation

**glTF/GLB** (GL Transmission Format)
- Modern standard, designed for web
- Efficient binary format (GLB)
- Excellent Three.js support
- Supports meshes, materials, skeletons, animations

Avoid: FBX (binary, inconsistent), OBJ (no hierarchy/bones)

---

## Recommended Implementation Path

### Phase 1: MVP with Pre-Segmented Model
1. Find/create a simple low-poly human model with 20-30 separate parts
2. Export as glTF
3. Load with Three.js GLTFLoader
4. Raycasting for click detection
5. Orbit controls for rotate/zoom

**Estimated complexity**: 200-400 lines of JS

### Phase 2: Enhanced (if needed)
- Add rigged model with bone weight lookup
- Implement body part highlighting on hover
- Add smooth camera transitions to focus on selected part

### Phase 3: Anatomical Detail (future)
- Integrate more detailed model (muscles layer)
- UV region mapping for fine-grained selection
- Multiple visualization modes (skin, muscle, skeleton)

---

## Quick Start Code Structure

```javascript
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// Setup scene, camera, renderer
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, width/height, 0.1, 100);
const renderer = new THREE.WebGLRenderer({ antialias: true });

// Controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

// Load model
const loader = new GLTFLoader();
loader.load('body-model.glb', (gltf) => {
  scene.add(gltf.scene);

  // Store clickable parts
  gltf.scene.traverse((child) => {
    if (child.isMesh && BODY_PARTS.includes(child.name)) {
      clickableParts.push(child);
    }
  });
});

// Click detection
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

canvas.addEventListener('click', (event) => {
  mouse.x = (event.clientX / width) * 2 - 1;
  mouse.y = -(event.clientY / height) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(clickableParts);

  if (intersects.length > 0) {
    const bodyPart = intersects[0].object.name;
    openModal(bodyPart);
  }
});
```

---

## Model Sources (Free/Open)

| Source | License | Notes |
|--------|---------|-------|
| MakeHuman | CC0/AGPL | Generate customizable humans, export with part groups |
| Mixamo | Free with Adobe account | Rigged characters, good for bone-weight approach |
| Sketchfab | Varies (filter by CC) | Search "low poly human anatomy" |
| Quaternius | CC0 | Free low-poly packs, may include humans |
| ReadyPlayerMe | Free tier | Avatar generator, modern style |

---

## Summary

| Approach | Complexity | Precision | Model Requirements | Best For |
|----------|------------|-----------|-------------------|----------|
| Pre-segmented mesh | Low | Medium | Separate meshes per part | MVP/Prototype |
| Bone weights | Medium-High | Medium | Rigged skeleton | Seamless visuals |
| UV region map | Medium | High | Good UVs + region texture | Fine-grained anatomy |
| Bounding volumes | Low | Low | Any mesh | Quick hack |
| Medical library | Low (integration) | Very High | N/A (provided) | Professional medical |

**Recommendation for your project**: Start with Approach 1 (pre-segmented mesh). It maps directly to your existing code structure, requires minimal changes, and can be implemented in a day. If you need muscle-level detail later, layer in UV mapping.
