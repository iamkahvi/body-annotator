import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// ── Constants ────────────────────────────────────────────────────────

const PART_COLOR = 0x4a4a4a;
const HOVER_COLOR = 0x5ab0ff;
const HIGHLIGHT_COLOR_HEX = '#e06030';
const PART_COLOR_HEX = '#4a4a4a';
const BG_COLOR = 0x1a1a1a;
const EDGE_COLOR = 0x2a2a2a;

// ── Body part geometry definitions ───────────────────────────────────
// All positions in world units. Y-up, Z-forward (toward viewer in front view).
// Total figure height ~1.8 units, feet near y=0, head top near y=1.8.
//
// To add a new body part: add an entry here. That's it.
// Types: 'sphere', 'cylinder', 'box', 'halfSphere', 'halfCylinder'
// For half-types, 'side' determines front (+Z) or back (-Z).

const PART_DEFS = [
  // ── Head ──
  {
    name: 'head',
    type: 'halfSphere',
    side: 'front',
    pos: [0, 1.62, 0],
    radius: 0.105,
    segments: 20,
  },
  {
    name: 'back_of_head',
    type: 'halfSphere',
    side: 'back',
    pos: [0, 1.62, 0],
    radius: 0.105,
    segments: 20,
  },

  // ── Neck ──
  {
    name: 'neck',
    type: 'cylinder',
    pos: [0, 1.48, 0],
    rTop: 0.038,
    rBot: 0.042,
    height: 0.07,
    segments: 14,
  },

  // ── Shoulders ──
  {
    name: 'right_shoulder',
    type: 'sphere',
    pos: [-0.195, 1.40, 0],
    radius: 0.055,
    segments: 14,
  },
  {
    name: 'left_shoulder',
    type: 'sphere',
    pos: [0.195, 1.40, 0],
    radius: 0.055,
    segments: 14,
  },

  // ── Upper torso (chest / upper back) ──
  {
    name: 'chest',
    type: 'box',
    pos: [0, 1.28, 0.038],
    size: [0.28, 0.24, 0.076],
  },
  {
    name: 'upper_back',
    type: 'box',
    pos: [0, 1.28, -0.038],
    size: [0.28, 0.24, 0.076],
  },

  // ── Lower torso (abdomen / lower back) ──
  {
    name: 'abdomen',
    type: 'box',
    pos: [0, 1.04, 0.034],
    size: [0.25, 0.22, 0.068],
  },
  {
    name: 'lower_back',
    type: 'box',
    pos: [0, 1.04, -0.034],
    size: [0.25, 0.22, 0.068],
  },

  // ── Hips ──
  {
    name: 'right_hip',
    type: 'box',
    pos: [-0.072, 0.88, 0],
    size: [0.108, 0.10, 0.125],
  },
  {
    name: 'left_hip',
    type: 'box',
    pos: [0.072, 0.88, 0],
    size: [0.108, 0.10, 0.125],
  },

  // ── Upper arms ──
  {
    name: 'right_upper_arm',
    type: 'cylinder',
    pos: [-0.235, 1.24, 0],
    rTop: 0.038,
    rBot: 0.034,
    height: 0.24,
    segments: 12,
  },
  {
    name: 'left_upper_arm',
    type: 'cylinder',
    pos: [0.235, 1.24, 0],
    rTop: 0.038,
    rBot: 0.034,
    height: 0.24,
    segments: 12,
  },

  // ── Elbows ──
  {
    name: 'right_elbow',
    type: 'sphere',
    pos: [-0.235, 1.09, 0],
    radius: 0.037,
    segments: 12,
  },
  {
    name: 'left_elbow',
    type: 'sphere',
    pos: [0.235, 1.09, 0],
    radius: 0.037,
    segments: 12,
  },

  // ── Forearms ──
  {
    name: 'right_forearm',
    type: 'cylinder',
    pos: [-0.235, 0.92, 0],
    rTop: 0.034,
    rBot: 0.027,
    height: 0.26,
    segments: 12,
  },
  {
    name: 'left_forearm',
    type: 'cylinder',
    pos: [0.235, 0.92, 0],
    rTop: 0.034,
    rBot: 0.027,
    height: 0.26,
    segments: 12,
  },

  // ── Hands ──
  {
    name: 'right_hand',
    type: 'box',
    pos: [-0.235, 0.73, 0],
    size: [0.044, 0.08, 0.024],
  },
  {
    name: 'left_hand',
    type: 'box',
    pos: [0.235, 0.73, 0],
    size: [0.044, 0.08, 0.024],
  },

  // ── Thighs (quad / hamstring split) ──
  {
    name: 'right_quad',
    type: 'halfCylinder',
    side: 'front',
    pos: [-0.085, 0.68, 0],
    rTop: 0.062,
    rBot: 0.052,
    height: 0.30,
    segments: 14,
  },
  {
    name: 'right_hamstring',
    type: 'halfCylinder',
    side: 'back',
    pos: [-0.085, 0.68, 0],
    rTop: 0.062,
    rBot: 0.052,
    height: 0.30,
    segments: 14,
  },
  {
    name: 'left_quad',
    type: 'halfCylinder',
    side: 'front',
    pos: [0.085, 0.68, 0],
    rTop: 0.062,
    rBot: 0.052,
    height: 0.30,
    segments: 14,
  },
  {
    name: 'left_hamstring',
    type: 'halfCylinder',
    side: 'back',
    pos: [0.085, 0.68, 0],
    rTop: 0.062,
    rBot: 0.052,
    height: 0.30,
    segments: 14,
  },

  // ── Knees ──
  {
    name: 'right_knee',
    type: 'sphere',
    pos: [-0.085, 0.49, 0],
    radius: 0.050,
    segments: 14,
  },
  {
    name: 'left_knee',
    type: 'sphere',
    pos: [0.085, 0.49, 0],
    radius: 0.050,
    segments: 14,
  },

  // ── Lower legs (shin / calf split) ──
  {
    name: 'right_shin',
    type: 'halfCylinder',
    side: 'front',
    pos: [-0.085, 0.32, 0],
    rTop: 0.046,
    rBot: 0.034,
    height: 0.28,
    segments: 14,
  },
  {
    name: 'right_calf',
    type: 'halfCylinder',
    side: 'back',
    pos: [-0.085, 0.32, 0],
    rTop: 0.046,
    rBot: 0.034,
    height: 0.28,
    segments: 14,
  },
  {
    name: 'left_shin',
    type: 'halfCylinder',
    side: 'front',
    pos: [0.085, 0.32, 0],
    rTop: 0.046,
    rBot: 0.034,
    height: 0.28,
    segments: 14,
  },
  {
    name: 'left_calf',
    type: 'halfCylinder',
    side: 'back',
    pos: [0.085, 0.32, 0],
    rTop: 0.046,
    rBot: 0.034,
    height: 0.28,
    segments: 14,
  },

  // ── Ankles ──
  {
    name: 'right_ankle',
    type: 'sphere',
    pos: [-0.085, 0.14, 0],
    radius: 0.035,
    segments: 12,
  },
  {
    name: 'left_ankle',
    type: 'sphere',
    pos: [0.085, 0.14, 0],
    radius: 0.035,
    segments: 12,
  },

  // ── Feet ──
  {
    name: 'right_foot',
    type: 'box',
    pos: [-0.085, 0.08, 0.025],
    size: [0.058, 0.038, 0.105],
  },
  {
    name: 'left_foot',
    type: 'box',
    pos: [0.085, 0.08, 0.025],
    size: [0.058, 0.038, 0.105],
  },
];

// ── Module state ─────────────────────────────────────────────────────

let scene, camera, renderer, controls;
let bodyMeshes = {}; // partName -> THREE.Mesh
let allMeshes = []; // flat array for raycasting
let hoveredPart = null;
let onPartClick = null;
let tooltip = null;
let pointerDownPos = null;
let animFrameId = null;

// ── Geometry helpers ─────────────────────────────────────────────────

function createHalfSphereGeometry(radius, side, segments = 16) {
  // In Three.js SphereGeometry, phi is the horizontal angle around Y.
  // phi=0 faces +Z. We want front half = contains +Z surface.
  const phiStart = side === 'front' ? -Math.PI / 2 : Math.PI / 2;
  const phiLength = Math.PI;
  return new THREE.SphereGeometry(
    radius,
    segments,
    Math.ceil(segments * 0.75),
    phiStart,
    phiLength,
  );
}

function createHalfCylinderGeometry(rTop, rBot, height, side, segments = 12) {
  // In Three.js CylinderGeometry, theta=0 vertex is at (sin(0)*r, y, cos(0)*r) = (0, y, r) → +Z.
  // Front half: theta from -PI/2 to PI/2, i.e. thetaStart=-PI/2, thetaLength=PI.
  // But Three.js CylinderGeometry: at thetaStart=0 the first edge is at x=sin(0)=0, z=cos(0)=r → +Z.
  // Full circle goes: +Z → +X → -Z → -X → +Z.
  // Front half (containing +Z): we want from -X through +Z to +X.
  // That's thetaStart = 3*PI/2 (which is -X side), thetaLength = PI.
  const thetaStart = side === 'front' ? (3 * Math.PI) / 2 : Math.PI / 2;
  const thetaLength = Math.PI;
  return new THREE.CylinderGeometry(
    rTop,
    rBot,
    height,
    segments,
    1,
    false,
    thetaStart,
    thetaLength,
  );
}

function createGeometry(def) {
  const seg = def.segments || 14;
  switch (def.type) {
    case 'sphere':
      return new THREE.SphereGeometry(def.radius, seg, seg);
    case 'halfSphere':
      return createHalfSphereGeometry(def.radius, def.side, seg);
    case 'cylinder':
      return new THREE.CylinderGeometry(
        def.rTop,
        def.rBot,
        def.height,
        seg,
        1,
        false,
      );
    case 'halfCylinder':
      return createHalfCylinderGeometry(
        def.rTop,
        def.rBot,
        def.height,
        def.side,
        seg,
      );
    case 'box':
      return new THREE.BoxGeometry(def.size[0], def.size[1], def.size[2]);
    default:
      console.warn(`Unknown part type: ${def.type}`);
      return new THREE.BoxGeometry(0.05, 0.05, 0.05);
  }
}

// ── Build the body ───────────────────────────────────────────────────

function buildBody() {
  bodyMeshes = {};
  allMeshes = [];

  for (const def of PART_DEFS) {
    const geometry = createGeometry(def);
    const material = new THREE.MeshPhongMaterial({
      color: PART_COLOR,
      shininess: 15,
      specular: 0x222222,
      flatShading: false,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(def.pos[0], def.pos[1], def.pos[2]);
    mesh.name = def.name;
    mesh.userData.partName = def.name;
    mesh.userData.baseColor = PART_COLOR;
    mesh.userData.currentColor = PART_COLOR;

    scene.add(mesh);
    bodyMeshes[def.name] = mesh;
    allMeshes.push(mesh);
  }

  // Add subtle eyes to front of head for orientation cue
  addEyes();
}

function addEyes() {
  const eyeGeo = new THREE.SphereGeometry(0.012, 8, 8);
  const eyeMat = new THREE.MeshPhongMaterial({
    color: 0x888888,
    shininess: 40,
  });

  const headPos = bodyMeshes['head']
    ? bodyMeshes['head'].position
    : new THREE.Vector3(0, 1.62, 0);

  for (const xOff of [-0.035, 0.035]) {
    const eye = new THREE.Mesh(eyeGeo, eyeMat);
    eye.position.set(headPos.x + xOff, headPos.y + 0.01, headPos.z + 0.09);
    eye.userData.isDecoration = true;
    scene.add(eye);
  }
}

// ── Tooltip ──────────────────────────────────────────────────────────

function createTooltip() {
  const el = document.createElement('div');
  el.style.cssText = `
    position: fixed;
    background: rgba(0, 0, 0, 0.85);
    color: #f0f0f0;
    padding: 4px 10px;
    border-radius: 4px;
    font-size: 13px;
    font-family: -apple-system, BlinkMacSystemFont, sans-serif;
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.12s;
    z-index: 50;
    text-transform: capitalize;
    white-space: nowrap;
  `;
  document.body.appendChild(el);
  return el;
}

function showTooltip(text, x, y) {
  if (!tooltip) return;
  tooltip.textContent = text.replace(/_/g, ' ');
  tooltip.style.opacity = '1';
  tooltip.style.left = x + 12 + 'px';
  tooltip.style.top = y - 8 + 'px';
}

function hideTooltip() {
  if (!tooltip) return;
  tooltip.style.opacity = '0';
}

// ── Interaction ──────────────────────────────────────────────────────

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

function getPartFromEvent(event) {
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(pointer, camera);
  const intersects = raycaster.intersectObjects(allMeshes, false);

  if (intersects.length > 0) {
    const mesh = intersects[0].object;
    if (mesh.userData.isDecoration) return null;
    return mesh;
  }
  return null;
}

function setupInteraction(container) {
  const canvas = renderer.domElement;

  // Hover
  canvas.addEventListener('pointermove', (event) => {
    const mesh = getPartFromEvent(event);

    // Unhover previous
    if (hoveredPart && hoveredPart !== mesh) {
      hoveredPart.material.color.setHex(
        hoveredPart.userData.currentColor || hoveredPart.userData.baseColor,
      );
      hoveredPart.material.emissive.setHex(0x000000);
      hoveredPart = null;
      hideTooltip();
    }

    if (mesh && mesh !== hoveredPart) {
      hoveredPart = mesh;
      mesh.material.color.setHex(HOVER_COLOR);
      mesh.material.emissive.setHex(0x111122);
      canvas.style.cursor = 'pointer';
      showTooltip(mesh.userData.partName, event.clientX, event.clientY);
    } else if (mesh) {
      // Still hovering same part, update tooltip position
      showTooltip(mesh.userData.partName, event.clientX, event.clientY);
    } else {
      canvas.style.cursor = 'grab';
    }
  });

  // Track pointer down position to distinguish click from drag
  canvas.addEventListener('pointerdown', (event) => {
    pointerDownPos = { x: event.clientX, y: event.clientY };
    canvas.style.cursor = 'grabbing';
  });

  canvas.addEventListener('pointerup', () => {
    if (!hoveredPart) {
      canvas.style.cursor = 'grab';
    } else {
      canvas.style.cursor = 'pointer';
    }
  });

  // Click (only if pointer didn't move much — not a drag)
  canvas.addEventListener('click', (event) => {
    if (pointerDownPos) {
      const dx = event.clientX - pointerDownPos.x;
      const dy = event.clientY - pointerDownPos.y;
      if (dx * dx + dy * dy > 36) return; // dragged > 6px, ignore
    }

    const mesh = getPartFromEvent(event);
    if (mesh && onPartClick) {
      onPartClick(mesh.userData.partName);
    }
  });

  // Hide tooltip when pointer leaves canvas
  canvas.addEventListener('pointerleave', () => {
    if (hoveredPart) {
      hoveredPart.material.color.setHex(
        hoveredPart.userData.currentColor || hoveredPart.userData.baseColor,
      );
      hoveredPart.material.emissive.setHex(0x000000);
      hoveredPart = null;
    }
    hideTooltip();
    canvas.style.cursor = 'grab';
  });
}

// ── Resize ───────────────────────────────────────────────────────────

function handleResize(container) {
  const ro = new ResizeObserver(() => {
    const w = container.clientWidth;
    const h = container.clientHeight;
    if (w === 0 || h === 0) return;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  });
  ro.observe(container);
}

// ── Animation loop ───────────────────────────────────────────────────

function animate() {
  animFrameId = requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}

// ── Public API ───────────────────────────────────────────────────────

export function initBody3D(container, clickCallback) {
  onPartClick = clickCallback;

  // Scene
  scene = new THREE.Scene();
  scene.background = new THREE.Color(BG_COLOR);

  // Camera — slightly above eye level, looking at torso center
  const w = container.clientWidth || 400;
  const h = container.clientHeight || 500;
  camera = new THREE.PerspectiveCamera(42, w / h, 0.05, 50);
  camera.position.set(0, 1.1, 2.8);

  // Renderer
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setSize(w, h);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  container.appendChild(renderer.domElement);

  // Lights
  const ambient = new THREE.AmbientLight(0xffffff, 0.7);
  scene.add(ambient);

  const keyLight = new THREE.DirectionalLight(0xffffff, 0.9);
  keyLight.position.set(3, 4, 5);
  scene.add(keyLight);

  const fillLight = new THREE.DirectionalLight(0xffffff, 0.35);
  fillLight.position.set(-2, 2, -3);
  scene.add(fillLight);

  const rimLight = new THREE.DirectionalLight(0xffffff, 0.2);
  rimLight.position.set(0, -1, -4);
  scene.add(rimLight);

  // Orbit controls
  controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 0.95, 0);
  controls.enablePan = false;
  controls.minPolarAngle = Math.PI * 0.15;
  controls.maxPolarAngle = Math.PI * 0.85;
  controls.minDistance = 1.2;
  controls.maxDistance = 4.5;
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.rotateSpeed = 0.8;
  controls.update();

  // Build body
  buildBody();

  // Tooltip
  tooltip = createTooltip();

  // Interaction
  setupInteraction(container);

  // Resize handling
  handleResize(container);

  // Start render loop
  animate();

  // Set initial cursor
  renderer.domElement.style.cursor = 'grab';
}

export function updateBodyHighlights3D(notes) {
  const now = Date.now();
  const THREE_WEEKS_MS = 21 * 24 * 60 * 60 * 1000;

  // Most recent relevant timestamp per body part
  const mostRecent = {};
  notes.forEach((note) => {
    const latest =
      note.endDate == null && note.startDate != null
        ? Date.now()
        : (note.endDate ?? note.startDate ?? note.timestamp ?? 0);
    if (!mostRecent[note.bodyPart] || latest > mostRecent[note.bodyPart]) {
      mostRecent[note.bodyPart] = latest;
    }
  });

  const baseR = (PART_COLOR >> 16) & 0xff;
  const baseG = (PART_COLOR >> 8) & 0xff;
  const baseB = PART_COLOR & 0xff;

  const high = hexToRgb(HIGHLIGHT_COLOR_HEX);

  for (const [name, mesh] of Object.entries(bodyMeshes)) {
    const timestamp = mostRecent[name];

    if (!timestamp) {
      mesh.userData.currentColor = PART_COLOR;
      if (mesh !== hoveredPart) {
        mesh.material.color.setHex(PART_COLOR);
      }
      continue;
    }

    const age = now - timestamp;
    const intensity = Math.max(0, 1 - age / THREE_WEEKS_MS);

    if (intensity > 0) {
      const r = Math.round(baseR + (high.r - baseR) * intensity);
      const g = Math.round(baseG + (high.g - baseG) * intensity);
      const b = Math.round(baseB + (high.b - baseB) * intensity);
      const color = (r << 16) | (g << 8) | b;
      mesh.userData.currentColor = color;
      if (mesh !== hoveredPart) {
        mesh.material.color.setHex(color);
      }
    } else {
      mesh.userData.currentColor = PART_COLOR;
      if (mesh !== hoveredPart) {
        mesh.material.color.setHex(PART_COLOR);
      }
    }
  }
}

// ── Utilities ────────────────────────────────────────────────────────

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return { r: (n >> 16) & 0xff, g: (n >> 8) & 0xff, b: n & 0xff };
}
