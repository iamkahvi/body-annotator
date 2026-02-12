import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

let scene, camera, renderer, controls;
let bodyParts = {};
let hoveredPart = null;
let onPartClick = null;

const PART_COLOR = 0x3d3d3d;
const HOVER_COLOR = 0x4a9eff;
const HIGHLIGHT_COLOR = 0x4a9eff;

// Loaded from body-models.json at init time
let MODEL_PATH = null;
let MESH_NAME_MAP = {};

// Your canonical body part names
const BODY_PARTS = [
  "head",
  "neck",
  "left_shoulder",
  "right_shoulder",
  "left_upper_arm",
  "right_upper_arm",
  "left_elbow",
  "right_elbow",
  "left_forearm",
  "right_forearm",
  "left_hand",
  "right_hand",
  "chest",
  "abdomen",
  "lower_back",
  "left_hip",
  "right_hip",
  "left_thigh",
  "right_thigh",
  "left_knee",
  "right_knee",
  "left_calf",
  "right_calf",
  "left_ankle",
  "right_ankle",
  "left_foot",
  "right_foot",
];

async function loadModelConfig() {
  const resp = await fetch("body-models.json");
  const config = await resp.json();
  const activeKey = config.activeModel;
  const modelConfig = config.models[activeKey];
  if (!modelConfig) {
    throw new Error(`Model config "${activeKey}" not found in body-models.json`);
  }
  MODEL_PATH = modelConfig.path || null;
  MESH_NAME_MAP = modelConfig.meshNameMap || {};
  console.log(`Loaded model config: "${activeKey}" (${MODEL_PATH})`);
}

export async function init3DBody(container, clickCallback) {
  onPartClick = clickCallback;

  // Load mesh config before anything else
  try {
    await loadModelConfig();
  } catch (err) {
    console.warn("Could not load body-models.json, using empty mesh map:", err.message);
  }

  // Scene
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1a1a1a);

  // Camera
  const aspect = container.clientWidth / container.clientHeight;
  camera = new THREE.PerspectiveCamera(50, aspect, 0.1, 100);
  camera.position.set(0, 1, 3);

  // Renderer
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  container.appendChild(renderer.domElement);

  // Controls
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.target.set(0, 1, 0);
  controls.minDistance = 1.5;
  controls.maxDistance = 6;
  controls.update();

  // Lighting
  const ambient = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambient);

  const directional = new THREE.DirectionalLight(0xffffff, 0.8);
  directional.position.set(2, 3, 2);
  scene.add(directional);

  const backLight = new THREE.DirectionalLight(0xffffff, 0.3);
  backLight.position.set(-2, 2, -2);
  scene.add(backLight);

  // Try to load external model, fall back to procedural
  loadModel().catch((err) => {
    console.warn(
      "Could not load model, using procedural fallback:",
      err.message,
    );
    createProceduralBody();
  });

  // Event listeners
  renderer.domElement.addEventListener("pointermove", onPointerMove);
  renderer.domElement.addEventListener("click", onClick);
  window.addEventListener("resize", () => onResize(container));

  // Animation loop
  animate();
}

// Load glTF/GLB model
function loadModel() {
  return new Promise((resolve, reject) => {
    if (!MODEL_PATH) {
      reject(new Error("No model path configured"));
      return;
    }

    const loader = new GLTFLoader();
    loader.load(
      MODEL_PATH,
      (gltf) => {
        const model = gltf.scene;

        // Log all mesh names to help with mapping
        console.log("Model loaded. Mesh names found:");
        model.traverse((child) => {
          if (child.isMesh) {
            console.log(`  - "${child.name}"`);
          }
        });

        // Center and scale the model
        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());

        // Scale to fit ~2 units tall
        const scale = 2 / size.y;
        model.scale.setScalar(scale);

        // Center horizontally, place feet near y=0
        model.position.x = -center.x * scale;
        model.position.y = -box.min.y * scale;
        model.position.z = -center.z * scale;

        // Update controls target to model center
        controls.target.set(0, 1, 0);
        controls.update();

        scene.add(model);

        // Register clickable body parts
        model.traverse((child) => {
          if (child.isMesh) {
            // Try to map mesh name to body part
            const partName = mapMeshToBodyPart(child.name);

            if (partName) {
              // Apply our material for consistent styling
              child.material = new THREE.MeshStandardMaterial({
                color: PART_COLOR,
                roughness: 0.7,
                metalness: 0.1,
              });
              child.userData.baseColor = PART_COLOR;
              child.userData.bodyPart = partName;
              bodyParts[partName] = child;
            }
          }
        });

        console.log("Registered body parts:", Object.keys(bodyParts));
        resolve(model);
      },
      undefined,
      (error) => reject(error),
    );
  });
}

// Map mesh name to canonical body part name
function mapMeshToBodyPart(meshName) {
  // First check explicit mapping
  if (MESH_NAME_MAP[meshName]) {
    return MESH_NAME_MAP[meshName];
  }

  // Try automatic matching (case-insensitive, underscores/spaces normalized)
  const normalized = meshName.toLowerCase().replace(/[\s-]/g, "_");

  for (const part of BODY_PARTS) {
    if (normalized === part || normalized.includes(part)) {
      return part;
    }
  }

  // Try common naming conventions
  const patterns = {
    head: /^head/i,
    neck: /^neck/i,
    chest: /^(chest|torso|upper_?body)/i,
    abdomen: /^(abdomen|stomach|belly)/i,
    lower_back: /^(lower_?back|lumbar)/i,
    left_shoulder: /^(l_?shoulder|shoulder_?l|left_?shoulder)/i,
    right_shoulder: /^(r_?shoulder|shoulder_?r|right_?shoulder)/i,
    left_upper_arm: /^(l_?(upper_?)?arm|arm_?l|left_?(upper_?)?arm|l_?bicep)/i,
    right_upper_arm:
      /^(r_?(upper_?)?arm|arm_?r|right_?(upper_?)?arm|r_?bicep)/i,
    left_elbow: /^(l_?elbow|elbow_?l|left_?elbow)/i,
    right_elbow: /^(r_?elbow|elbow_?r|right_?elbow)/i,
    left_forearm: /^(l_?forearm|forearm_?l|left_?forearm)/i,
    right_forearm: /^(r_?forearm|forearm_?r|right_?forearm)/i,
    left_hand: /^(l_?hand|hand_?l|left_?hand)/i,
    right_hand: /^(r_?hand|hand_?r|right_?hand)/i,
    left_hip: /^(l_?hip|hip_?l|left_?hip|l_?pelvis)/i,
    right_hip: /^(r_?hip|hip_?r|right_?hip|r_?pelvis)/i,
    left_thigh: /^(l_?thigh|thigh_?l|left_?thigh|l_?(upper_?)?leg)/i,
    right_thigh: /^(r_?thigh|thigh_?r|right_?thigh|r_?(upper_?)?leg)/i,
    left_knee: /^(l_?knee|knee_?l|left_?knee)/i,
    right_knee: /^(r_?knee|knee_?r|right_?knee)/i,
    left_calf: /^(l_?calf|calf_?l|left_?calf|l_?(lower_?)?leg|l_?shin)/i,
    right_calf: /^(r_?calf|calf_?r|right_?calf|r_?(lower_?)?leg|r_?shin)/i,
    left_ankle: /^(l_?ankle|ankle_?l|left_?ankle)/i,
    right_ankle: /^(r_?ankle|ankle_?r|right_?ankle)/i,
    left_foot: /^(l_?foot|foot_?l|left_?foot)/i,
    right_foot: /^(r_?foot|foot_?r|right_?foot)/i,
  };

  for (const [part, pattern] of Object.entries(patterns)) {
    if (pattern.test(meshName)) {
      return part;
    }
  }

  return null;
}

// Procedural fallback (original implementation)
function createProceduralBody() {
  // Head
  addPart("head", new THREE.SphereGeometry(0.12, 32, 32), [0, 1.65, 0]);

  // Neck
  addPart(
    "neck",
    new THREE.CylinderGeometry(0.04, 0.05, 0.08, 16),
    [0, 1.49, 0],
  );

  // Torso - chest
  addPart("chest", new THREE.BoxGeometry(0.32, 0.22, 0.15), [0, 1.32, 0]);

  // Torso - abdomen
  addPart("abdomen", new THREE.BoxGeometry(0.28, 0.18, 0.14), [0, 1.12, 0]);

  // Lower back (slightly behind abdomen)
  addPart(
    "lower_back",
    new THREE.BoxGeometry(0.24, 0.12, 0.08),
    [0, 1.08, -0.08],
  );

  // Shoulders
  addPart(
    "left_shoulder",
    new THREE.SphereGeometry(0.06, 16, 16),
    [-0.2, 1.4, 0],
  );
  addPart(
    "right_shoulder",
    new THREE.SphereGeometry(0.06, 16, 16),
    [0.2, 1.4, 0],
  );

  // Upper arms
  addPart(
    "left_upper_arm",
    new THREE.CylinderGeometry(0.04, 0.04, 0.22, 16),
    [-0.24, 1.24, 0],
  );
  addPart(
    "right_upper_arm",
    new THREE.CylinderGeometry(0.04, 0.04, 0.22, 16),
    [0.24, 1.24, 0],
  );

  // Elbows
  addPart(
    "left_elbow",
    new THREE.SphereGeometry(0.045, 16, 16),
    [-0.24, 1.1, 0],
  );
  addPart(
    "right_elbow",
    new THREE.SphereGeometry(0.045, 16, 16),
    [0.24, 1.1, 0],
  );

  // Forearms
  addPart(
    "left_forearm",
    new THREE.CylinderGeometry(0.035, 0.03, 0.2, 16),
    [-0.24, 0.95, 0],
  );
  addPart(
    "right_forearm",
    new THREE.CylinderGeometry(0.035, 0.03, 0.2, 16),
    [0.24, 0.95, 0],
  );

  // Hands
  addPart("left_hand", new THREE.BoxGeometry(0.06, 0.1, 0.03), [-0.24, 0.8, 0]);
  addPart("right_hand", new THREE.BoxGeometry(0.06, 0.1, 0.03), [0.24, 0.8, 0]);

  // Hips
  addPart("left_hip", new THREE.SphereGeometry(0.07, 16, 16), [-0.1, 1.0, 0]);
  addPart("right_hip", new THREE.SphereGeometry(0.07, 16, 16), [0.1, 1.0, 0]);

  // Thighs
  addPart(
    "left_thigh",
    new THREE.CylinderGeometry(0.06, 0.05, 0.32, 16),
    [-0.1, 0.78, 0],
  );
  addPart(
    "right_thigh",
    new THREE.CylinderGeometry(0.06, 0.05, 0.32, 16),
    [0.1, 0.78, 0],
  );

  // Knees
  addPart(
    "left_knee",
    new THREE.SphereGeometry(0.055, 16, 16),
    [-0.1, 0.58, 0],
  );
  addPart(
    "right_knee",
    new THREE.SphereGeometry(0.055, 16, 16),
    [0.1, 0.58, 0],
  );

  // Calves
  addPart(
    "left_calf",
    new THREE.CylinderGeometry(0.045, 0.035, 0.3, 16),
    [-0.1, 0.38, 0],
  );
  addPart(
    "right_calf",
    new THREE.CylinderGeometry(0.045, 0.035, 0.3, 16),
    [0.1, 0.38, 0],
  );

  // Ankles
  addPart("left_ankle", new THREE.SphereGeometry(0.04, 16, 16), [-0.1, 0.2, 0]);
  addPart("right_ankle", new THREE.SphereGeometry(0.04, 16, 16), [0.1, 0.2, 0]);

  // Feet
  addPart(
    "left_foot",
    new THREE.BoxGeometry(0.06, 0.04, 0.12),
    [-0.1, 0.1, 0.03],
  );
  addPart(
    "right_foot",
    new THREE.BoxGeometry(0.06, 0.04, 0.12),
    [0.1, 0.1, 0.03],
  );
}

function addPart(name, geometry, position) {
  const material = new THREE.MeshStandardMaterial({
    color: PART_COLOR,
    roughness: 0.7,
    metalness: 0.1,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(...position);
  mesh.name = name;
  mesh.userData.baseColor = PART_COLOR;

  scene.add(mesh);
  bodyParts[name] = mesh;
}

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

function onPointerMove(event) {
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(pointer, camera);
  const meshes = Object.values(bodyParts);
  const intersects = raycaster.intersectObjects(meshes);

  // Reset previous hover
  if (
    hoveredPart &&
    (!intersects.length || intersects[0].object.name !== hoveredPart.name)
  ) {
    hoveredPart.material.color.setHex(
      hoveredPart.userData.currentColor || hoveredPart.userData.baseColor,
    );
    hoveredPart = null;
    renderer.domElement.style.cursor = "grab";
  }

  // Set new hover
  if (intersects.length > 0) {
    const mesh = intersects[0].object;
    if (mesh !== hoveredPart) {
      hoveredPart = mesh;
      mesh.material.color.setHex(HOVER_COLOR);
      renderer.domElement.style.cursor = "pointer";
    }
  }
}

function onClick(event) {
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(pointer, camera);
  const meshes = Object.values(bodyParts);
  const intersects = raycaster.intersectObjects(meshes);

  if (intersects.length > 0) {
    const mesh = intersects[0].object;
    // Use bodyPart from userData (for loaded models) or fall back to mesh name (procedural)
    const partName = mesh.userData.bodyPart || mesh.name;
    if (onPartClick) {
      onPartClick(partName);
    }
  }
}

function onResize(container) {
  const width = container.clientWidth;
  const height = container.clientHeight;

  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
}

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}

// Update body part colors based on note recency
export function updateBodyHighlights3D(notes) {
  const now = Date.now();
  const THREE_WEEKS_MS = 21 * 24 * 60 * 60 * 1000;

  // Get most recent note timestamp for each body part
  const mostRecent = {};
  notes.forEach((note) => {
    const latest =
      note.endDate == null && note.startDate != null
        ? Date.now()
        : note.endDate ?? note.startDate ?? note.timestamp ?? 0;
    if (!mostRecent[note.bodyPart] || latest > mostRecent[note.bodyPart]) {
      mostRecent[note.bodyPart] = latest;
    }
  });

  // Update each body part mesh
  Object.entries(bodyParts).forEach(([name, mesh]) => {
    const timestamp = mostRecent[name];

    if (!timestamp) {
      mesh.userData.currentColor = PART_COLOR;
      mesh.material.color.setHex(PART_COLOR);
      return;
    }

    const age = now - timestamp;
    const intensity = Math.max(0, 1 - age / THREE_WEEKS_MS);

    if (intensity > 0) {
      // Interpolate from PART_COLOR toward HIGHLIGHT_COLOR
      const baseR = (PART_COLOR >> 16) & 0xff;
      const baseG = (PART_COLOR >> 8) & 0xff;
      const baseB = PART_COLOR & 0xff;

      const highR = (HIGHLIGHT_COLOR >> 16) & 0xff;
      const highG = (HIGHLIGHT_COLOR >> 8) & 0xff;
      const highB = HIGHLIGHT_COLOR & 0xff;

      const r = Math.round(baseR + (highR - baseR) * intensity);
      const g = Math.round(baseG + (highG - baseG) * intensity);
      const b = Math.round(baseB + (highB - baseB) * intensity);

      const color = (r << 16) | (g << 8) | b;
      mesh.userData.currentColor = color;
      mesh.material.color.setHex(color);
    } else {
      mesh.userData.currentColor = PART_COLOR;
      mesh.material.color.setHex(PART_COLOR);
    }
  });
}
