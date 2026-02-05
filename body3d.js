import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

let scene, camera, renderer, controls;
let bodyParts = {};
let hoveredPart = null;
let onPartClick = null;

const PART_COLOR = 0x3d3d3d;
const HOVER_COLOR = 0x4a9eff;
const HIGHLIGHT_COLOR = 0x4a9eff;

export function init3DBody(container, clickCallback) {
  onPartClick = clickCallback;

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

  // Build body
  createBody();

  // Event listeners
  renderer.domElement.addEventListener('pointermove', onPointerMove);
  renderer.domElement.addEventListener('click', onClick);
  window.addEventListener('resize', () => onResize(container));

  // Animation loop
  animate();
}

function createBody() {
  const material = (name) => {
    const mat = new THREE.MeshStandardMaterial({
      color: PART_COLOR,
      roughness: 0.7,
      metalness: 0.1
    });
    return mat;
  };

  // Head
  addPart('head', new THREE.SphereGeometry(0.12, 32, 32), [0, 1.65, 0]);

  // Neck
  addPart('neck', new THREE.CylinderGeometry(0.04, 0.05, 0.08, 16), [0, 1.49, 0]);

  // Torso - chest
  addPart('chest', new THREE.BoxGeometry(0.32, 0.22, 0.15), [0, 1.32, 0]);

  // Torso - abdomen
  addPart('abdomen', new THREE.BoxGeometry(0.28, 0.18, 0.14), [0, 1.12, 0]);

  // Lower back (slightly behind abdomen)
  addPart('lower_back', new THREE.BoxGeometry(0.24, 0.12, 0.08), [0, 1.08, -0.08]);

  // Shoulders
  addPart('left_shoulder', new THREE.SphereGeometry(0.06, 16, 16), [-0.2, 1.4, 0]);
  addPart('right_shoulder', new THREE.SphereGeometry(0.06, 16, 16), [0.2, 1.4, 0]);

  // Upper arms
  addPart('left_upper_arm', new THREE.CylinderGeometry(0.04, 0.04, 0.22, 16), [-0.24, 1.24, 0]);
  addPart('right_upper_arm', new THREE.CylinderGeometry(0.04, 0.04, 0.22, 16), [0.24, 1.24, 0]);

  // Elbows
  addPart('left_elbow', new THREE.SphereGeometry(0.045, 16, 16), [-0.24, 1.1, 0]);
  addPart('right_elbow', new THREE.SphereGeometry(0.045, 16, 16), [0.24, 1.1, 0]);

  // Forearms
  addPart('left_forearm', new THREE.CylinderGeometry(0.035, 0.03, 0.2, 16), [-0.24, 0.95, 0]);
  addPart('right_forearm', new THREE.CylinderGeometry(0.035, 0.03, 0.2, 16), [0.24, 0.95, 0]);

  // Hands
  addPart('left_hand', new THREE.BoxGeometry(0.06, 0.1, 0.03), [-0.24, 0.8, 0]);
  addPart('right_hand', new THREE.BoxGeometry(0.06, 0.1, 0.03), [0.24, 0.8, 0]);

  // Hips
  addPart('left_hip', new THREE.SphereGeometry(0.07, 16, 16), [-0.1, 1.0, 0]);
  addPart('right_hip', new THREE.SphereGeometry(0.07, 16, 16), [0.1, 1.0, 0]);

  // Thighs
  addPart('left_thigh', new THREE.CylinderGeometry(0.06, 0.05, 0.32, 16), [-0.1, 0.78, 0]);
  addPart('right_thigh', new THREE.CylinderGeometry(0.06, 0.05, 0.32, 16), [0.1, 0.78, 0]);

  // Knees
  addPart('left_knee', new THREE.SphereGeometry(0.055, 16, 16), [-0.1, 0.58, 0]);
  addPart('right_knee', new THREE.SphereGeometry(0.055, 16, 16), [0.1, 0.58, 0]);

  // Calves
  addPart('left_calf', new THREE.CylinderGeometry(0.045, 0.035, 0.3, 16), [-0.1, 0.38, 0]);
  addPart('right_calf', new THREE.CylinderGeometry(0.045, 0.035, 0.3, 16), [0.1, 0.38, 0]);

  // Ankles
  addPart('left_ankle', new THREE.SphereGeometry(0.04, 16, 16), [-0.1, 0.2, 0]);
  addPart('right_ankle', new THREE.SphereGeometry(0.04, 16, 16), [0.1, 0.2, 0]);

  // Feet
  addPart('left_foot', new THREE.BoxGeometry(0.06, 0.04, 0.12), [-0.1, 0.1, 0.03]);
  addPart('right_foot', new THREE.BoxGeometry(0.06, 0.04, 0.12), [0.1, 0.1, 0.03]);
}

function addPart(name, geometry, position) {
  const material = new THREE.MeshStandardMaterial({
    color: PART_COLOR,
    roughness: 0.7,
    metalness: 0.1
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
  if (hoveredPart && (!intersects.length || intersects[0].object.name !== hoveredPart.name)) {
    hoveredPart.material.color.setHex(hoveredPart.userData.currentColor || hoveredPart.userData.baseColor);
    hoveredPart = null;
    renderer.domElement.style.cursor = 'grab';
  }

  // Set new hover
  if (intersects.length > 0) {
    const mesh = intersects[0].object;
    if (mesh !== hoveredPart) {
      hoveredPart = mesh;
      mesh.material.color.setHex(HOVER_COLOR);
      renderer.domElement.style.cursor = 'pointer';
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
    const partName = intersects[0].object.name;
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
  notes.forEach(note => {
    if (!mostRecent[note.bodyPart] || note.timestamp > mostRecent[note.bodyPart]) {
      mostRecent[note.bodyPart] = note.timestamp;
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
    const intensity = Math.max(0, 1 - (age / THREE_WEEKS_MS));

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
