import { initSVGBody, updateBodyHighlightsSVG } from './body-svg.js';

const STORAGE_KEY = 'body-annotator-notes';

const BODY_PARTS = [
  'head', 'back_of_head', 'neck',
  'left_shoulder', 'right_shoulder',
  'left_upper_arm', 'right_upper_arm',
  'left_elbow', 'right_elbow',
  'left_forearm', 'right_forearm',
  'left_hand', 'right_hand',
  'chest', 'upper_back', 'abdomen', 'lower_back',
  'left_hip', 'right_hip',
  'left_quad', 'right_quad',
  'left_hamstring', 'right_hamstring',
  'left_knee', 'right_knee',
  'left_shin', 'right_shin',
  'left_calf', 'right_calf',
  'left_ankle', 'right_ankle',
  'left_foot', 'right_foot'
];

let notes = [];
let selectedPart = null;
let editingNoteId = null;

// DOM elements
const modal = document.getElementById('modal');
const modalTitle = document.getElementById('modal-title');
const modalPartName = document.getElementById('modal-part-name');
const noteText = document.getElementById('note-text');
const noteStartDate = document.getElementById('note-start-date');
const noteEndDate = document.getElementById('note-end-date');
const saveBtn = document.getElementById('save-btn');
const resolveBtn = document.getElementById('resolve-btn');
const closeModalBtn = document.getElementById('close-modal-btn');
const deleteBtn = document.getElementById('delete-btn');
const notesList = document.getElementById('notes-list');
const searchInput = document.getElementById('search');
const sortSelect = document.getElementById('sort');
const filterPartSelect = document.getElementById('filter-part');

// Initialize
function init() {
  loadNotes();
  setupBody();
  setupModalListeners();
  setupFilterListeners();
  populateFilterDropdown();
  renderNotes();
}

// SVG Body setup
function setupBody() {
  const container = document.getElementById('body-3d-container');
  initSVGBody(container, (partName) => {
    selectedPart = partName;
    openModal();
  });
}

// LocalStorage
function loadNotes() {
  const stored = localStorage.getItem(STORAGE_KEY);
  notes = stored ? JSON.parse(stored) : [];
  // Migrate old notes: occurrences/timestamp/createdAt → startDate/endDate
  let migrated = false;
  notes.forEach(note => {
    if (note.occurrences && note.occurrences.length) {
      const start = Math.min(...note.occurrences);
      const end = Math.max(...note.occurrences);
      note.startDate = start;
      note.endDate = end;
      delete note.occurrences;
      delete note.createdAt;
      migrated = true;
    }

    if (note.timestamp && !note.startDate) {
      note.startDate = note.timestamp;
      note.endDate = note.timestamp;
      delete note.timestamp;
      migrated = true;
    }

    if (note.createdAt && !note.startDate) {
      note.startDate = note.createdAt;
      note.endDate = note.createdAt;
      delete note.createdAt;
      migrated = true;
    }

    if (note.startDate && typeof note.endDate === 'undefined') {
      note.endDate = note.startDate;
      migrated = true;
    }
  });
  if (migrated) saveNotes();
}

function saveNotes() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
}

// Modal
function openModal(existingNote = null) {
  if (existingNote) {
    const isOngoing = existingNote.endDate == null;
    editingNoteId = existingNote.id;
    selectedPart = existingNote.bodyPart;
    noteStartDate.value = toDateInputValue(existingNote.startDate);
    noteEndDate.value = isOngoing ? '' : toDateInputValue(existingNote.endDate);
    noteText.value = existingNote.description;
    deleteBtn.classList.remove('hidden');
    resolveBtn.classList.toggle('hidden', !isOngoing);
    modalTitle.textContent = 'Edit Note';
  } else {
    editingNoteId = null;
    const today = new Date().toISOString().split('T')[0];
    noteStartDate.value = today;
    noteEndDate.value = '';
    noteText.value = '';
    deleteBtn.classList.add('hidden');
    resolveBtn.classList.add('hidden');
    modalTitle.textContent = 'Add Note';
  }
  modalPartName.textContent = formatPartName(selectedPart);
  modal.classList.remove('hidden');
  noteText.focus();
}

function closeModal() {
  modal.classList.add('hidden');
  selectedPart = null;
  editingNoteId = null;
}

function setupModalListeners() {
  closeModalBtn.addEventListener('click', closeModal);

  saveBtn.addEventListener('click', () => {
    const text = noteText.value.trim();
    const startValue = noteStartDate.value;
    const endValue = noteEndDate.value;
    if (!text || !selectedPart || !startValue) return;

    const startTs = new Date(startValue + 'T12:00:00').getTime();
    const endTs = endValue
      ? new Date(endValue + 'T12:00:00').getTime()
      : null;

    if (Number.isNaN(startTs)) return;
    if (endTs !== null && (Number.isNaN(endTs) || endTs < startTs)) return;

    if (editingNoteId) {
      const note = notes.find(n => n.id === editingNoteId);
      if (note) {
        note.bodyPart = selectedPart;
        note.startDate = startTs;
        note.endDate = endTs;
        note.description = text;
      }
    } else {
      const note = {
        id: crypto.randomUUID(),
        bodyPart: selectedPart,
        startDate: startTs,
        endDate: endTs,
        description: text
      };
      notes.unshift(note);
    }

    saveNotes();
    renderNotes();
    closeModal();
  });

  resolveBtn.addEventListener('click', () => {
    if (!editingNoteId) return;
    const note = notes.find(n => n.id === editingNoteId);
    if (!note) return;

    const today = new Date().toISOString().split('T')[0];
    const endTs = new Date(today + 'T12:00:00').getTime();
    note.endDate = endTs;

    saveNotes();
    renderNotes();
    closeModal();
  });

  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  deleteBtn.addEventListener('click', () => {
    if (editingNoteId) {
      deleteNote(editingNoteId);
      closeModal();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !modal.classList.contains('hidden')) {
      closeModal();
    }
  });
}

// Filtering & sorting
function setupFilterListeners() {
  searchInput.addEventListener('input', renderNotes);
  sortSelect.addEventListener('change', renderNotes);
  filterPartSelect.addEventListener('change', renderNotes);
}

function populateFilterDropdown() {
  BODY_PARTS.forEach(part => {
    const option = document.createElement('option');
    option.value = part;
    option.textContent = formatPartName(part);
    filterPartSelect.appendChild(option);
  });
}

function getFilteredNotes() {
  const search = searchInput.value.toLowerCase();
  const filterPart = filterPartSelect.value;
  const sort = sortSelect.value;
  const now = Date.now();

  let filtered = [...notes];

  if (filterPart) {
    filtered = filtered.filter(n => n.bodyPart === filterPart);
  }

  if (search) {
    filtered = filtered.filter(n =>
      n.description.toLowerCase().includes(search) ||
      formatPartName(n.bodyPart).toLowerCase().includes(search)
    );
  }

  switch (sort) {
    case 'date-desc':
      filtered.sort((a, b) => noteSortDate(b, now) - noteSortDate(a, now));
      break;
    case 'date-asc':
      filtered.sort((a, b) => noteSortDate(a, now) - noteSortDate(b, now));
      break;
    case 'body-part':
      filtered.sort((a, b) => a.bodyPart.localeCompare(b.bodyPart));
      break;
  }

  return filtered;
}

// Body part highlighting
function updateBodyHighlights() {
  updateBodyHighlightsSVG(notes);
}

// Rendering
function renderNotes() {
  const filtered = getFilteredNotes();

  updateBodyHighlights();

  if (filtered.length === 0) {
    notesList.innerHTML = `
      <div class="empty-state">
        ${notes.length === 0
          ? 'No notes yet. Click a body part to add one.'
          : 'No notes match your search.'}
      </div>
    `;
    return;
  }

  notesList.innerHTML = filtered.map(note => {
    const dateRange = formatDateRange(note.startDate, note.endDate);
    const durationLabel = formatDuration(note.startDate, note.endDate);
    const statusLabel = note.endDate == null ? 'Ongoing' : 'Resolved';
    const statusClass = note.endDate == null ? 'note-status--ongoing' : 'note-status--resolved';

    return `
      <div class="note-card" data-id="${note.id}">
        <div class="note-header">
          <div class="note-meta">
            <span class="note-part">${formatPartName(note.bodyPart)}</span>
            <span class="note-status ${statusClass}">${statusLabel}</span>
          </div>
          <span class="note-date">${dateRange}</span>
        </div>
        <div class="note-submeta">
          <span class="note-duration">Duration: ${durationLabel}</span>
        </div>
      </div>
    `;
  }).join('');

  notesList.querySelectorAll('.note-card').forEach(card => {
    card.addEventListener('click', () => {
      const note = notes.find(n => n.id === card.dataset.id);
      if (note) openModal(note);
    });
  });
}

function deleteNote(id) {
  notes = notes.filter(n => n.id !== id);
  saveNotes();
  renderNotes();
}

// Utilities
function noteSortDate(note, now) {
  if (note.endDate == null) return now;
  return note.endDate ?? note.startDate ?? 0;
}

function formatPartName(part) {
  return part.replace(/_/g, ' ');
}

function toDateInputValue(timestamp) {
  if (!timestamp) return '';
  return new Date(timestamp).toISOString().split('T')[0];
}

function formatShortDate(timestamp) {
  return new Date(timestamp).toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

function formatDateRange(startTs, endTs) {
  if (!startTs) return '';
  if (endTs == null) return `${formatShortDate(startTs)} - now`;
  if (startTs === endTs) return formatShortDate(startTs);
  return `${formatShortDate(startTs)} - ${formatShortDate(endTs)}`;
}

function formatDuration(startTs, endTs) {
  if (!startTs) return '';
  const end = endTs == null ? Date.now() : endTs;
  const msPerDay = 24 * 60 * 60 * 1000;
  const days = Math.floor((end - startTs) / msPerDay) + 1;
  if (days <= 1) return '1 day';
  return `${days} days`;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Start
init();
