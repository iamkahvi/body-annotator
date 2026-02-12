const PART_COLOR = '#3d3d3d';
const HOVER_COLOR = '#5ab0ff';
const HIGHLIGHT_COLOR = '#e06030';

const SVG_NS = 'http://www.w3.org/2000/svg';

let onPartClick = null;
// partName -> [SVGElement, ...] (one per view the part appears in)
let partElements = {};

// Front view part definitions (center x=130)
// Back view is mirrored at x=260 (newX = 520 - oldX), with abdomen→lower_back
const FRONT_PARTS = [
  {
    name: 'head',
    d: 'M130,20 C155,20 160,40 160,50 C160,62 152,72 144,78 L116,78 C108,72 100,62 100,50 C100,40 105,20 130,20 Z',
  },
  {
    name: 'neck',
    d: 'M116,78 L144,78 L148,108 L112,108 Z',
  },
  {
    name: 'right_shoulder',
    d: 'M88,108 C62,104 46,120 50,144 L74,144 L88,132 Z',
  },
  {
    name: 'left_shoulder',
    d: 'M172,108 C198,104 214,120 210,144 L186,144 L172,132 Z',
  },
  {
    name: 'chest',
    d: 'M88,108 L172,108 L172,132 L170,196 L90,196 L88,132 Z',
  },
  {
    name: 'abdomen',
    d: 'M90,199 L170,199 L172,268 L88,268 Z',
  },
  {
    name: 'right_hip',
    d: 'M88,271 L128,271 L126,308 L84,308 Z',
  },
  {
    name: 'left_hip',
    d: 'M132,271 L172,271 L176,308 L134,308 Z',
  },
  {
    name: 'right_upper_arm',
    d: 'M50,147 L74,147 L74,212 L52,212 Z',
  },
  {
    name: 'left_upper_arm',
    d: 'M186,147 L210,147 L208,212 L188,212 Z',
  },
  {
    name: 'right_elbow',
    d: 'M50,215 L74,215 L74,242 L50,242 Z',
  },
  {
    name: 'left_elbow',
    d: 'M186,215 L210,215 L208,242 L188,242 Z',
  },
  {
    name: 'right_forearm',
    d: 'M52,245 L72,245 L68,318 L56,318 Z',
  },
  {
    name: 'left_forearm',
    d: 'M188,245 L208,245 L204,318 L192,318 Z',
  },
  {
    name: 'right_hand',
    d: 'M54,321 L70,321 L72,354 Q72,364 64,364 L60,364 Q52,364 52,354 Z',
  },
  {
    name: 'left_hand',
    d: 'M190,321 L206,321 L208,354 Q208,364 200,364 L196,364 Q188,364 188,354 Z',
  },
  {
    name: 'right_thigh',
    d: 'M84,311 L124,311 Q120,360 114,402 L94,402 Q86,360 84,311 Z',
  },
  {
    name: 'left_thigh',
    d: 'M136,311 L176,311 Q174,360 166,402 L146,402 Q140,360 136,311 Z',
  },
  {
    name: 'right_knee',
    d: 'M94,405 L114,405 Q116,420 114,435 L94,435 Q92,420 94,405 Z',
  },
  {
    name: 'left_knee',
    d: 'M146,405 L166,405 Q168,420 166,435 L146,435 Q144,420 146,405 Z',
  },
  {
    name: 'right_calf',
    d: 'M92,438 L116,438 Q122,475 112,532 L96,532 Q84,475 92,438 Z',
  },
  {
    name: 'left_calf',
    d: 'M144,438 L168,438 Q176,475 166,532 L152,532 Q140,475 144,438 Z',
  },
  {
    name: 'right_ankle',
    d: 'M97,535 L111,535 L110,556 L98,556 Z',
  },
  {
    name: 'left_ankle',
    d: 'M149,535 L163,535 L162,556 L150,556 Z',
  },
  {
    name: 'right_foot',
    d: 'M96,559 L112,559 L116,584 Q116,592 108,592 L100,592 Q92,592 92,584 Z',
  },
  {
    name: 'left_foot',
    d: 'M148,559 L164,559 L168,584 Q168,592 160,592 L152,592 Q144,592 144,584 Z',
  },
];

const FRONT_NAME_REMAP = {
  right_calf: 'right_shin',
  left_calf: 'left_shin',
  right_thigh: 'right_quad',
  left_thigh: 'left_quad',
};

const BACK_NAME_REMAP = {
  head: 'back_of_head',
  chest: 'upper_back',
  abdomen: 'lower_back',
  right_thigh: 'right_hamstring',
  left_thigh: 'left_hamstring',
};

/**
 * Mirror SVG path data horizontally around x=260.
 * Handles M, L, Q, C, Z commands (absolute only).
 */
function mirrorPathX(d) {
  return d.replace(/([MLQCZ])\s*([^MLQCZ]*)/gi, (_, cmd, args) => {
    if (cmd.toUpperCase() === 'Z') return 'Z';
    const nums = args.trim().split(/[\s,]+/).map(Number);
    for (let i = 0; i < nums.length; i += 2) {
      nums[i] = 520 - nums[i];
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

  // Track base color for highlight system
  path._baseColor = PART_COLOR;

  path.addEventListener('mouseenter', () => {
    path.setAttribute('fill', HOVER_COLOR);
  });
  path.addEventListener('mouseleave', () => {
    path.setAttribute('fill', path._baseColor);
  });
  path.addEventListener('click', () => {
    if (onPartClick) onPartClick(partName);
  });

  // Register in partElements
  if (!partElements[partName]) partElements[partName] = [];
  partElements[partName].push(path);

  return path;
}

export function initSVGBody(container, clickCallback) {
  onPartClick = clickCallback;
  partElements = {};

  const svg = createSVGElement('svg', {
    viewBox: '0 0 520 610',
    preserveAspectRatio: 'xMidYMid meet',
  });
  svg.style.width = '100%';
  svg.style.height = '100%';
  svg.style.display = 'block';

  // Labels with L/R indicators
  // Front view: patient's right = viewer's left
  const labelAttrs = {
    fill: '#666',
    'font-size': '11',
    'font-family': '-apple-system, BlinkMacSystemFont, sans-serif',
  };

  const frontR = createSVGElement('text', { x: '50', y: '12', 'text-anchor': 'middle', ...labelAttrs });
  frontR.textContent = 'R';
  svg.appendChild(frontR);

  const frontLabel = createSVGElement('text', { x: '130', y: '12', 'text-anchor': 'middle', ...labelAttrs });
  frontLabel.textContent = 'FRONT';
  svg.appendChild(frontLabel);

  const frontL = createSVGElement('text', { x: '210', y: '12', 'text-anchor': 'middle', ...labelAttrs });
  frontL.textContent = 'L';
  svg.appendChild(frontL);

  // Back view: mirrored (patient's left = viewer's left)
  const backL = createSVGElement('text', { x: '310', y: '12', 'text-anchor': 'middle', ...labelAttrs });
  backL.textContent = 'L';
  svg.appendChild(backL);

  const backLabel = createSVGElement('text', { x: '390', y: '12', 'text-anchor': 'middle', ...labelAttrs });
  backLabel.textContent = 'BACK';
  svg.appendChild(backLabel);

  const backR = createSVGElement('text', { x: '470', y: '12', 'text-anchor': 'middle', ...labelAttrs });
  backR.textContent = 'R';
  svg.appendChild(backR);

  // Divider line
  const divider = createSVGElement('line', {
    x1: '260',
    y1: '20',
    x2: '260',
    y2: '598',
    stroke: '#333',
    'stroke-width': '1',
    'stroke-dasharray': '4,4',
  });
  svg.appendChild(divider);

  // Front view
  const frontGroup = createSVGElement('g', { class: 'front-view' });
  for (const part of FRONT_PARTS) {
    const name = FRONT_NAME_REMAP[part.name] || part.name;
    frontGroup.appendChild(createPartPath(part.d, name));
  }

  // Eyes on the front head
  const leftEye = createSVGElement('circle', {
    cx: '121', cy: '45', r: '3',
    fill: '#888', 'pointer-events': 'none',
  });
  const rightEye = createSVGElement('circle', {
    cx: '139', cy: '45', r: '3',
    fill: '#888', 'pointer-events': 'none',
  });
  frontGroup.appendChild(leftEye);
  frontGroup.appendChild(rightEye);

  svg.appendChild(frontGroup);

  // Back view (mirrored)
  const backGroup = createSVGElement('g', { class: 'back-view' });
  for (const part of FRONT_PARTS) {
    const name = BACK_NAME_REMAP[part.name] || part.name;
    const mirroredD = mirrorPathX(part.d);
    backGroup.appendChild(createPartPath(mirroredD, name));
  }
  svg.appendChild(backGroup);

  container.appendChild(svg);
}

export function updateBodyHighlightsSVG(notes) {
  const now = Date.now();
  const THREE_WEEKS_MS = 21 * 24 * 60 * 60 * 1000;

  // Most recent occurrence timestamp per body part
  const mostRecent = {};
  notes.forEach((note) => {
    const latest = note.occurrences
      ? Math.max(...note.occurrences)
      : note.timestamp || 0;
    if (!mostRecent[note.bodyPart] || latest > mostRecent[note.bodyPart]) {
      mostRecent[note.bodyPart] = latest;
    }
  });

  // Update all part elements
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
