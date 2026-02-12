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
const noteDate = document.getElementById('note-date');
const saveBtn = document.getElementById('save-btn');
const renewBtn = document.getElementById('renew-btn');
const closeModalBtn = document.getElementById('close-modal-btn');
const deleteBtn = document.getElementById('delete-btn');
const occurrencesList = document.getElementById('occurrences-list');
const occurrencesSection = document.getElementById('occurrences-section');
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
  // Migrate old notes: timestamp → createdAt + occurrences
  let migrated = false;
  notes.forEach(note => {
    if (note.timestamp && !note.occurrences) {
      note.createdAt = note.timestamp;
      note.occurrences = [note.timestamp];
      delete note.timestamp;
      migrated = true;
    }
  });
  if (migrated) saveNotes();
}

function saveNotes() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
}

/** Most recent occurrence timestamp for a note */
function latestOccurrence(note) {
  return Math.max(...note.occurrences);
}

// Modal
function openModal(existingNote = null) {
  if (existingNote) {
    editingNoteId = existingNote.id;
    selectedPart = existingNote.bodyPart;
    noteDate.value = new Date().toISOString().split('T')[0];
    noteText.value = existingNote.description;
    deleteBtn.classList.remove('hidden');
    renewBtn.classList.remove('hidden');
    modalTitle.textContent = 'Edit Note';
    renderOccurrences(existingNote);
    occurrencesSection.classList.remove('hidden');
  } else {
    editingNoteId = null;
    noteDate.value = new Date().toISOString().split('T')[0];
    noteText.value = '';
    deleteBtn.classList.add('hidden');
    renewBtn.classList.add('hidden');
    modalTitle.textContent = 'Add Note';
    occurrencesSection.classList.add('hidden');
  }
  modalPartName.textContent = formatPartName(selectedPart);
  modal.classList.remove('hidden');
  noteText.focus();
}

function renderOccurrences(note) {
  const sorted = [...note.occurrences].sort((a, b) => b - a);
  occurrencesList.innerHTML = sorted.map(ts => {
    const d = new Date(ts);
    return `<li>${d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</li>`;
  }).join('');
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
    if (!text || !selectedPart) return;

    const selectedDate = new Date(noteDate.value + 'T12:00:00');

    if (editingNoteId) {
      const note = notes.find(n => n.id === editingNoteId);
      if (note) {
        note.bodyPart = selectedPart;
        note.description = text;
      }
    } else {
      const ts = selectedDate.getTime();
      const note = {
        id: crypto.randomUUID(),
        bodyPart: selectedPart,
        createdAt: ts,
        occurrences: [ts],
        description: text
      };
      notes.unshift(note);
    }

    saveNotes();
    renderNotes();
    closeModal();
  });

  renewBtn.addEventListener('click', () => {
    if (!editingNoteId) return;
    const note = notes.find(n => n.id === editingNoteId);
    if (!note) return;

    const renewDate = new Date(noteDate.value + 'T12:00:00').getTime();

    // Don't add duplicate dates (same day)
    const renewDay = new Date(renewDate).toDateString();
    const alreadyExists = note.occurrences.some(
      ts => new Date(ts).toDateString() === renewDay
    );
    if (alreadyExists) {
      // Briefly flash the occurrences list to indicate it's already there
      occurrencesSection.style.outline = '2px solid var(--accent)';
      setTimeout(() => { occurrencesSection.style.outline = ''; }, 600);
      return;
    }

    note.occurrences.push(renewDate);
    saveNotes();
    renderOccurrences(note);
    renderNotes();
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
      filtered.sort((a, b) => latestOccurrence(b) - latestOccurrence(a));
      break;
    case 'date-asc':
      filtered.sort((a, b) => latestOccurrence(a) - latestOccurrence(b));
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
    const latest = latestOccurrence(note);
    const count = note.occurrences.length;
    const countBadge = count > 1 ? `<span class="occurrence-count">${count}x</span>` : '';

    return `
      <div class="note-card" data-id="${note.id}">
        <div class="note-header">
          <span class="note-part">${formatPartName(note.bodyPart)} ${countBadge}</span>
          <span class="note-date">${formatDate(latest)}</span>
        </div>
        <p class="note-text">${escapeHtml(note.description)}</p>
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
function formatPartName(part) {
  return part.replace(/_/g, ' ');
}

function formatDate(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return 'Today';
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else if (diffDays < 7) {
    return date.toLocaleDateString([], { weekday: 'short' });
  } else {
    return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Start
init();
