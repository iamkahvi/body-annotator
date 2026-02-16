const PART_COLOR = '#3d3d3d';
const HOVER_COLOR = '#5ab0ff';
const HIGHLIGHT_COLOR = '#e06030';

const SVG_NS = 'http://www.w3.org/2000/svg';

let onPartClick = null;
// partName -> [SVGElement, ...] (one per view the part appears in)
let partElements = {};
let currentAngle = 0;
let carousel = null;

// View definitions: each face of the 3D carousel
// Views are arranged in a cylinder: front=0°, right=90°, back=180°, left=270°
const VIEWS = [
  { name: 'FRONT', angle: 0, label: 'FRONT', parts: [], nameRemap: {} },
  { name: 'RIGHT', angle: 90, label: 'RIGHT', parts: [], nameRemap: {} },
  { name: 'BACK', angle: 180, label: 'BACK', parts: [], nameRemap: {} },
  { name: 'LEFT', angle: 270, label: 'LEFT', parts: [], nameRemap: {} },
];

// ── Part geometry definitions per view ──────────────────────────────
// All paths are drawn in a 260x610 viewBox (single-body width)

const FRONT_PARTS = [
  { name: 'head', d: 'M130,20 C155,20 160,40 160,50 C160,62 152,72 144,78 L116,78 C108,72 100,62 100,50 C100,40 105,20 130,20 Z' },
  { name: 'neck', d: 'M116,78 L144,78 L148,108 L112,108 Z' },
  { name: 'right_shoulder', d: 'M88,108 C62,104 46,120 50,144 L74,144 L88,132 Z' },
  { name: 'left_shoulder', d: 'M172,108 C198,104 214,120 210,144 L186,144 L172,132 Z' },
  { name: 'chest', d: 'M88,108 L172,108 L172,132 L170,196 L90,196 L88,132 Z' },
  { name: 'abdomen', d: 'M90,199 L170,199 L172,268 L88,268 Z' },
  { name: 'right_hip', d: 'M88,271 L128,271 L126,308 L84,308 Z' },
  { name: 'left_hip', d: 'M132,271 L172,271 L176,308 L134,308 Z' },
  { name: 'right_upper_arm', d: 'M50,147 L74,147 L74,212 L52,212 Z' },
  { name: 'left_upper_arm', d: 'M186,147 L210,147 L208,212 L188,212 Z' },
  { name: 'right_elbow', d: 'M50,215 L74,215 L74,242 L50,242 Z' },
  { name: 'left_elbow', d: 'M186,215 L210,215 L208,242 L188,242 Z' },
  { name: 'right_forearm', d: 'M52,245 L72,245 L68,318 L56,318 Z' },
  { name: 'left_forearm', d: 'M188,245 L208,245 L204,318 L192,318 Z' },
  { name: 'right_hand', d: 'M54,321 L70,321 L72,354 Q72,364 64,364 L60,364 Q52,364 52,354 Z' },
  { name: 'left_hand', d: 'M190,321 L206,321 L208,354 Q208,364 200,364 L196,364 Q188,364 188,354 Z' },
  { name: 'right_thigh', d: 'M84,311 L124,311 Q120,360 114,402 L94,402 Q86,360 84,311 Z' },
  { name: 'left_thigh', d: 'M136,311 L176,311 Q174,360 166,402 L146,402 Q140,360 136,311 Z' },
  { name: 'right_knee', d: 'M94,405 L114,405 Q116,420 114,435 L94,435 Q92,420 94,405 Z' },
  { name: 'left_knee', d: 'M146,405 L166,405 Q168,420 166,435 L146,435 Q144,420 146,405 Z' },
  { name: 'right_calf', d: 'M92,438 L116,438 Q122,475 112,532 L96,532 Q84,475 92,438 Z' },
  { name: 'left_calf', d: 'M144,438 L168,438 Q176,475 166,532 L152,532 Q140,475 144,438 Z' },
  { name: 'right_ankle', d: 'M97,535 L111,535 L110,556 L98,556 Z' },
  { name: 'left_ankle', d: 'M149,535 L163,535 L162,556 L150,556 Z' },
  { name: 'right_foot', d: 'M96,559 L112,559 L116,584 Q116,592 108,592 L100,592 Q92,592 92,584 Z' },
  { name: 'left_foot', d: 'M148,559 L164,559 L168,584 Q168,592 160,592 L152,592 Q144,592 144,584 Z' },
];

const FRONT_NAME_REMAP = {
  right_calf: 'right_shin',
  left_calf: 'left_shin',
  right_thigh: 'right_quad',
  left_thigh: 'left_quad',
};

// Right side view - shows the body from the right (patient's right side facing viewer)
// Left arm/leg hidden, right arm/leg visible on the near side, torso in profile
const RIGHT_SIDE_PARTS = [
  { name: 'head', d: 'M110,20 C140,18 150,35 150,50 C150,65 142,75 135,78 L105,78 C100,72 95,60 95,50 C95,35 100,22 110,20 Z' },
  { name: 'neck', d: 'M105,78 L135,78 L138,108 L102,108 Z' },
  { name: 'right_shoulder', d: 'M100,108 C80,106 68,118 70,140 L90,140 L100,128 Z' },
  { name: 'chest', d: 'M100,108 L160,108 L158,196 L98,196 Z' },
  { name: 'abdomen', d: 'M98,199 L158,199 L156,268 L96,268 Z' },
  { name: 'right_hip', d: 'M96,271 L150,271 L148,308 L94,308 Z' },
  { name: 'right_upper_arm', d: 'M56,143 L80,143 L78,212 L58,212 Z' },
  { name: 'right_elbow', d: 'M56,215 L80,215 L78,242 L58,242 Z' },
  { name: 'right_forearm', d: 'M58,245 L78,245 L74,318 L62,318 Z' },
  { name: 'right_hand', d: 'M60,321 L76,321 L78,354 Q78,364 70,364 L66,364 Q58,364 58,354 Z' },
  { name: 'right_thigh', d: 'M94,311 L148,311 Q144,360 138,402 L104,402 Q98,360 94,311 Z' },
  { name: 'right_knee', d: 'M104,405 L138,405 Q140,420 138,435 L104,435 Q102,420 104,405 Z' },
  { name: 'right_calf', d: 'M102,438 L140,438 Q146,475 136,532 L106,532 Q96,475 102,438 Z' },
  { name: 'right_ankle', d: 'M107,535 L135,535 L134,556 L108,556 Z' },
  { name: 'right_foot', d: 'M106,559 L136,559 L140,584 Q140,592 132,592 L110,592 Q102,592 102,584 Z' },
];

const RIGHT_NAME_REMAP = {
  right_calf: 'right_calf',
  right_thigh: 'right_thigh',
};

// Back view - mirror of front horizontally. Left/right swap visually but names stay
const BACK_PARTS = FRONT_PARTS.map(p => ({
  name: p.name,
  d: mirrorPathX(p.d),
}));

const BACK_NAME_REMAP = {
  head: 'back_of_head',
  chest: 'upper_back',
  abdomen: 'lower_back',
  right_thigh: 'right_hamstring',
  left_thigh: 'left_hamstring',
  right_calf: 'right_calf',
  left_calf: 'left_calf',
};

// Left side view - mirror of right side
const LEFT_SIDE_PARTS = RIGHT_SIDE_PARTS.map(p => {
  // Swap left/right in names
  let name = p.name;
  if (name.startsWith('right_')) name = 'left_' + name.slice(6);
  else if (name.startsWith('left_')) name = 'right_' + name.slice(5);
  return { name, d: mirrorPathX(p.d) };
});

const LEFT_NAME_REMAP = {
  left_calf: 'left_calf',
  left_thigh: 'left_thigh',
};

// Assign parts to views
VIEWS[0].parts = FRONT_PARTS;
VIEWS[0].nameRemap = FRONT_NAME_REMAP;
VIEWS[1].parts = RIGHT_SIDE_PARTS;
VIEWS[1].nameRemap = RIGHT_NAME_REMAP;
VIEWS[2].parts = BACK_PARTS;
VIEWS[2].nameRemap = BACK_NAME_REMAP;
VIEWS[3].parts = LEFT_SIDE_PARTS;
VIEWS[3].nameRemap = LEFT_NAME_REMAP;

// ── SVG helpers ──────────────────────────────────────────────────────

function mirrorPathX(d) {
  return d.replace(/([MLQCZ])\s*([^MLQCZ]*)/gi, (_, cmd, args) => {
    if (cmd.toUpperCase() === 'Z') return 'Z';
    const nums = args.trim().split(/[\s,]+/).map(Number);
    for (let i = 0; i < nums.length; i += 2) {
      nums[i] = 260 - nums[i];
    }
    return cmd + nums.join(',');
  });
}

function createSVGElement(tag, attrs) {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) {
    el.setAttribute(k, v);
  }
  return el;
}

function createPartPath(d, partName) {
  const path = createSVGElement('path', {
    d,
    fill: PART_COLOR,
    stroke: '#1a1a1a',
    'stroke-width': '1.5',
    'stroke-linejoin': 'round',
    'data-part': partName,
  });
  path.style.cursor = 'pointer';
  path.style.transition = 'fill 0.15s';
  path._baseColor = PART_COLOR;

  path.addEventListener('mouseenter', () => {
    path.setAttribute('fill', HOVER_COLOR);
  });
  path.addEventListener('mouseleave', () => {
    path.setAttribute('fill', path._baseColor);
  });
  path.addEventListener('click', (e) => {
    e.stopPropagation();
    if (onPartClick) onPartClick(partName);
  });

  if (!partElements[partName]) partElements[partName] = [];
  partElements[partName].push(path);

  return path;
}

function createFaceSVG(view) {
  const svg = createSVGElement('svg', {
    viewBox: '0 0 260 610',
    preserveAspectRatio: 'xMidYMid meet',
  });
  svg.style.width = '100%';
  svg.style.height = '100%';
  svg.style.display = 'block';

  // View label
  const labelAttrs = {
    fill: '#666',
    'font-size': '13',
    'font-family': '-apple-system, BlinkMacSystemFont, sans-serif',
    'text-anchor': 'middle',
  };

  const label = createSVGElement('text', { x: '130', y: '12', ...labelAttrs });
  label.textContent = view.label;
  svg.appendChild(label);

  // Add L/R indicators for front and back views
  if (view.name === 'FRONT') {
    const r = createSVGElement('text', { x: '40', y: '12', ...labelAttrs, 'font-size': '11' });
    r.textContent = 'R';
    svg.appendChild(r);
    const l = createSVGElement('text', { x: '220', y: '12', ...labelAttrs, 'font-size': '11' });
    l.textContent = 'L';
    svg.appendChild(l);
  } else if (view.name === 'BACK') {
    const l = createSVGElement('text', { x: '40', y: '12', ...labelAttrs, 'font-size': '11' });
    l.textContent = 'L';
    svg.appendChild(l);
    const r = createSVGElement('text', { x: '220', y: '12', ...labelAttrs, 'font-size': '11' });
    r.textContent = 'R';
    svg.appendChild(r);
  }

  // Body parts
  const group = createSVGElement('g', { class: `view-${view.name.toLowerCase()}` });
  for (const part of view.parts) {
    const name = view.nameRemap[part.name] || part.name;
    group.appendChild(createPartPath(part.d, name));
  }

  // Eyes on front head
  if (view.name === 'FRONT') {
    const leftEye = createSVGElement('circle', {
      cx: '121', cy: '45', r: '3',
      fill: '#888', 'pointer-events': 'none',
    });
    const rightEye = createSVGElement('circle', {
      cx: '139', cy: '45', r: '3',
      fill: '#888', 'pointer-events': 'none',
    });
    group.appendChild(leftEye);
    group.appendChild(rightEye);
  }

  // Ear on right side view
  if (view.name === 'RIGHT') {
    const ear = createSVGElement('ellipse', {
      cx: '90', cy: '50', rx: '6', ry: '10',
      fill: '#888', 'pointer-events': 'none',
    });
    group.appendChild(ear);
  }

  // Ear on left side view (mirrored)
  if (view.name === 'LEFT') {
    const ear = createSVGElement('ellipse', {
      cx: '170', cy: '50', rx: '6', ry: '10',
      fill: '#888', 'pointer-events': 'none',
    });
    group.appendChild(ear);
  }

  svg.appendChild(group);
  return svg;
}

// ── Carousel rotation ────────────────────────────────────────────────

function setRotation(angle, animate = true) {
  currentAngle = angle;
  if (carousel) {
    carousel.style.transition = animate ? 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)' : 'none';
    carousel.style.transform = `translateZ(-${carouselRadius}px) rotateY(${-angle}deg)`;
  }
  updateViewIndicator();
}

let carouselRadius = 0;

function getActiveViewIndex() {
  // Normalize angle to 0-360
  let a = ((currentAngle % 360) + 360) % 360;
  // Find nearest view
  let closest = 0;
  let minDist = 360;
  for (let i = 0; i < VIEWS.length; i++) {
    let dist = Math.abs(a - VIEWS[i].angle);
    if (dist > 180) dist = 360 - dist;
    if (dist < minDist) {
      minDist = dist;
      closest = i;
    }
  }
  return closest;
}

function snapToNearestView() {
  const idx = getActiveViewIndex();
  // Find the snap angle closest to current (handle wrapping)
  const target = VIEWS[idx].angle;
  let a = currentAngle;
  // Normalize difference
  let diff = target - (((a % 360) + 360) % 360);
  if (diff > 180) diff -= 360;
  if (diff < -180) diff += 360;
  setRotation(a + diff, true);
}

let viewIndicatorDots = [];

function updateViewIndicator() {
  const idx = getActiveViewIndex();
  viewIndicatorDots.forEach((dot, i) => {
    dot.classList.toggle('active', i === idx);
  });
}

// ── Drag interaction ─────────────────────────────────────────────────

function setupDragInteraction(container) {
  let isDragging = false;
  let startX = 0;
  let startAngle = 0;
  let lastX = 0;
  let velocity = 0;

  const getX = (e) => e.touches ? e.touches[0].clientX : e.clientX;

  const onStart = (e) => {
    // Don't interfere with body part clicks
    if (e.target.closest('path[data-part]')) return;
    isDragging = true;
    startX = getX(e);
    lastX = startX;
    startAngle = currentAngle;
    velocity = 0;
    carousel.style.transition = 'none';
  };

  const onMove = (e) => {
    if (!isDragging) return;
    const x = getX(e);
    const dx = x - startX;
    velocity = x - lastX;
    lastX = x;
    // Convert px drag to degrees (sensitivity)
    const degPerPx = 0.5;
    setRotation(startAngle - dx * degPerPx, false);
  };

  const onEnd = () => {
    if (!isDragging) return;
    isDragging = false;
    // If velocity is high enough, go to next/prev view
    if (Math.abs(velocity) > 5) {
      const idx = getActiveViewIndex();
      const dir = velocity > 0 ? -1 : 1;
      const nextIdx = ((idx + dir) % VIEWS.length + VIEWS.length) % VIEWS.length;
      const target = VIEWS[nextIdx].angle;
      // Calculate shortest path
      let a = currentAngle;
      let diff = target - (((a % 360) + 360) % 360);
      if (diff > 180) diff -= 360;
      if (diff < -180) diff += 360;
      setRotation(a + diff, true);
    } else {
      snapToNearestView();
    }
  };

  container.addEventListener('mousedown', onStart);
  container.addEventListener('mousemove', onMove);
  container.addEventListener('mouseup', onEnd);
  container.addEventListener('mouseleave', onEnd);
  container.addEventListener('touchstart', onStart, { passive: true });
  container.addEventListener('touchmove', onMove, { passive: true });
  container.addEventListener('touchend', onEnd);
}

// ── Public API ───────────────────────────────────────────────────────

export function initSVGBody(container, clickCallback) {
  onPartClick = clickCallback;
  partElements = {};

  // Wrapper with perspective
  const wrapper = document.createElement('div');
  wrapper.className = 'body-3d-wrapper';

  // Navigation arrows
  const leftArrow = document.createElement('button');
  leftArrow.className = 'body-3d-arrow body-3d-arrow-left';
  leftArrow.innerHTML = '&#8249;';
  leftArrow.setAttribute('aria-label', 'Rotate left');
  leftArrow.addEventListener('click', () => {
    const idx = getActiveViewIndex();
    const prevIdx = ((idx - 1) % VIEWS.length + VIEWS.length) % VIEWS.length;
    const target = VIEWS[prevIdx].angle;
    let a = currentAngle;
    let diff = target - (((a % 360) + 360) % 360);
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;
    setRotation(a + diff, true);
  });

  const rightArrow = document.createElement('button');
  rightArrow.className = 'body-3d-arrow body-3d-arrow-right';
  rightArrow.innerHTML = '&#8250;';
  rightArrow.setAttribute('aria-label', 'Rotate right');
  rightArrow.addEventListener('click', () => {
    const idx = getActiveViewIndex();
    const nextIdx = (idx + 1) % VIEWS.length;
    const target = VIEWS[nextIdx].angle;
    let a = currentAngle;
    let diff = target - (((a % 360) + 360) % 360);
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;
    setRotation(a + diff, true);
  });

  // Carousel scene (provides perspective)
  const scene = document.createElement('div');
  scene.className = 'body-3d-scene';

  // Carousel (the rotating element)
  carousel = document.createElement('div');
  carousel.className = 'body-3d-carousel';

  // Calculate radius based on face width
  // For a 4-face carousel, radius = faceWidth / (2 * tan(π/4)) = faceWidth / 2
  // We'll set this after measuring
  const faceWidth = 260; // will be scaled by CSS
  carouselRadius = faceWidth / 2;

  // Create faces
  VIEWS.forEach((view, i) => {
    const face = document.createElement('div');
    face.className = 'body-3d-face';
    face.style.transform = `rotateY(${view.angle}deg) translateZ(${carouselRadius}px)`;
    face.appendChild(createFaceSVG(view));
    carousel.appendChild(face);
  });

  scene.appendChild(carousel);
  wrapper.appendChild(leftArrow);
  wrapper.appendChild(scene);
  wrapper.appendChild(rightArrow);

  // View indicator dots
  const indicator = document.createElement('div');
  indicator.className = 'body-3d-indicator';
  viewIndicatorDots = [];
  VIEWS.forEach((view, i) => {
    const dot = document.createElement('button');
    dot.className = 'body-3d-dot';
    dot.setAttribute('aria-label', view.label);
    dot.title = view.label;
    if (i === 0) dot.classList.add('active');
    dot.addEventListener('click', () => {
      let a = currentAngle;
      let diff = view.angle - (((a % 360) + 360) % 360);
      if (diff > 180) diff -= 360;
      if (diff < -180) diff += 360;
      setRotation(a + diff, true);
    });
    indicator.appendChild(dot);
    viewIndicatorDots.push(dot);
  });

  container.appendChild(wrapper);
  container.appendChild(indicator);

  // Set initial rotation
  setRotation(0, false);

  // Setup drag
  setupDragInteraction(scene);
}

export function updateBodyHighlightsSVG(notes) {
  const now = Date.now();
  const THREE_WEEKS_MS = 21 * 24 * 60 * 60 * 1000;

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

  for (const [name, elements] of Object.entries(partElements)) {
    const timestamp = mostRecent[name];

    if (!timestamp) {
      elements.forEach((el) => {
        el._baseColor = PART_COLOR;
        el.setAttribute('fill', PART_COLOR);
      });
      continue;
    }

    const age = now - timestamp;
    const intensity = Math.max(0, 1 - age / THREE_WEEKS_MS);

    if (intensity > 0) {
      const base = hexToRgb(PART_COLOR);
      const high = hexToRgb(HIGHLIGHT_COLOR);
      const r = Math.round(base.r + (high.r - base.r) * intensity);
      const g = Math.round(base.g + (high.g - base.g) * intensity);
      const b = Math.round(base.b + (high.b - base.b) * intensity);
      const color = rgbToHex(r, g, b);
      elements.forEach((el) => {
        el._baseColor = color;
        el.setAttribute('fill', color);
      });
    } else {
      elements.forEach((el) => {
        el._baseColor = PART_COLOR;
        el.setAttribute('fill', PART_COLOR);
      });
    }
  }
}

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return { r: (n >> 16) & 0xff, g: (n >> 8) & 0xff, b: n & 0xff };
}

function rgbToHex(r, g, b) {
  return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
}
