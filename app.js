import { initBody3D, updateBodyHighlights3D } from './body-3d-procedural.js';

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
let dataMode = 'export';

// DOM elements
const modal = document.getElementById('modal');
const modalTitle = document.getElementById('modal-title');
const noteText = document.getElementById('note-text');
const noteStartDate = document.getElementById('note-start-date');
const noteEndDate = document.getElementById('note-end-date');
const modalDisplay = document.getElementById('modal-display');
const modalEdit = document.getElementById('modal-edit');
const displayDateRange = document.getElementById('display-date-range');
const displayDuration = document.getElementById('display-duration');
const displayDescription = document.getElementById('display-description');
const modalActionsDisplay = document.getElementById('modal-actions-display');
const modalActionsEdit = document.getElementById('modal-actions-edit');
const saveBtn = document.getElementById('save-btn');
const resolveBtn = document.getElementById('resolve-btn');
const markOngoingBtn = document.getElementById('mark-ongoing-btn');
const editBtn = document.getElementById('edit-btn');
const cancelEditBtn = document.getElementById('cancel-edit-btn');
const closeModalBtn = document.getElementById('close-modal-btn');
const deleteBtn = document.getElementById('delete-btn');
const notesList = document.getElementById('notes-list');
const searchInput = document.getElementById('search');
const sortSelect = document.getElementById('sort');
const filterPartSelect = document.getElementById('filter-part');
const exportDataBtn = document.getElementById('export-data-btn');
const importDataBtn = document.getElementById('import-data-btn');
const dataModal = document.getElementById('data-modal');
const dataModalTitle = document.getElementById('data-modal-title');
const dataModalHelp = document.getElementById('data-modal-help');
const dataTextarea = document.getElementById('data-textarea');
const dataStatus = document.getElementById('data-status');
const dataModalClose = document.getElementById('data-modal-close');
const dataCopyBtn = document.getElementById('data-copy-btn');
const dataActionBtn = document.getElementById('data-action-btn');

// Initialize
function init() {
  loadNotes();
  setupBody();
  setupModalListeners();
  setupFilterListeners();
  setupDataTransferListeners();
  populateFilterDropdown();
  renderNotes();
}

// SVG Body setup
function setupBody() {
  const container = document.getElementById('body-3d-container');
  initBody3D(container, (partName) => {
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
    populateEditFields(existingNote);
    populateDisplayFields(existingNote);
    setModalMode('display', { isNew: false, isOngoing, isResolved: !isOngoing });
  } else {
    editingNoteId = null;
    const today = new Date().toISOString().split('T')[0];
    noteStartDate.value = today;
    noteEndDate.value = '';
    noteText.value = '';
    setModalMode('edit', { isNew: true, isOngoing: false, isResolved: false });
  }
  modal.classList.remove('hidden');
  if (modalEdit.classList.contains('hidden')) return;
  noteText.focus();
}

function populateEditFields(note) {
  noteStartDate.value = toDateInputValue(note.startDate);
  noteEndDate.value = note.endDate == null ? '' : toDateInputValue(note.endDate);
  noteText.value = note.description;
}

function populateDisplayFields(note) {
  displayDateRange.textContent = formatDateRange(note.startDate, note.endDate);
  displayDuration.textContent = `Duration: ${formatDuration(note.startDate, note.endDate)}`;
  displayDescription.textContent = note.description;
}

function setModalMode(mode, { isNew = false, isOngoing = false, isResolved = false } = {}) {
  const isDisplay = mode === 'display';
  modalDisplay.classList.toggle('hidden', !isDisplay);
  modalEdit.classList.toggle('hidden', isDisplay);
  modalActionsDisplay.classList.toggle('hidden', !isDisplay);
  modalActionsEdit.classList.toggle('hidden', isDisplay);
  resolveBtn.classList.toggle('hidden', !isDisplay || !isOngoing);
  markOngoingBtn.classList.toggle('hidden', !isDisplay || !isResolved);
  editBtn.classList.toggle('hidden', !isDisplay);
  deleteBtn.classList.toggle('hidden', isNew);
  cancelEditBtn.classList.toggle('hidden', isNew);

  const title = selectedPart ? formatTitleCase(selectedPart) : 'Note';
  modalTitle.textContent = title;
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

  markOngoingBtn.addEventListener('click', () => {
    if (!editingNoteId) return;
    const note = notes.find(n => n.id === editingNoteId);
    if (!note) return;

    note.endDate = null;

    saveNotes();
    renderNotes();
    closeModal();
  });

  editBtn.addEventListener('click', () => {
    if (!editingNoteId) return;
    const note = notes.find(n => n.id === editingNoteId);
    if (!note) return;

    populateEditFields(note);
    setModalMode('edit', { isNew: false });
    noteText.focus();
  });

  cancelEditBtn.addEventListener('click', () => {
    if (!editingNoteId) {
      closeModal();
      return;
    }

    const note = notes.find(n => n.id === editingNoteId);
    if (!note) {
      closeModal();
      return;
    }

    const isOngoing = note.endDate == null;
    populateDisplayFields(note);
    setModalMode('display', { isNew: false, isOngoing, isResolved: !isOngoing });
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
    if (e.key === 'Escape') {
      if (!modal.classList.contains('hidden')) closeModal();
      if (!dataModal.classList.contains('hidden')) closeDataModal();
    }
  });
}

function setupDataTransferListeners() {
  exportDataBtn.addEventListener('click', () => openDataModal('export'));
  importDataBtn.addEventListener('click', () => openDataModal('import'));
  dataModalClose.addEventListener('click', closeDataModal);
  dataCopyBtn.addEventListener('click', copyDataToClipboard);
  dataActionBtn.addEventListener('click', () => {
    if (dataMode === 'export') {
      closeDataModal();
      return;
    }
    handleImport();
  });
  dataModal.addEventListener('click', (e) => {
    if (e.target === dataModal) closeDataModal();
  });
}

function openDataModal(mode) {
  dataMode = mode;
  dataStatus.textContent = '';

  if (mode === 'export') {
    dataModalTitle.textContent = 'Export data';
    dataModalHelp.textContent = 'Copy the text below and keep it somewhere safe.';
    dataTextarea.value = JSON.stringify(getExportPayload(), null, 2);
    dataTextarea.readOnly = true;
    dataCopyBtn.classList.remove('hidden');
    dataActionBtn.textContent = 'Done';
  } else {
    dataModalTitle.textContent = 'Import data';
    dataModalHelp.textContent = 'Paste data from another device. This replaces your current notes.';
    dataTextarea.value = '';
    dataTextarea.readOnly = false;
    dataCopyBtn.classList.add('hidden');
    dataActionBtn.textContent = 'Import';
  }

  dataModal.classList.remove('hidden');
  dataTextarea.focus();
  dataTextarea.select();
}

function closeDataModal() {
  dataModal.classList.add('hidden');
  dataTextarea.value = '';
  dataStatus.textContent = '';
}

function copyDataToClipboard() {
  const text = dataTextarea.value;
  if (!text) return;

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => {
      dataStatus.textContent = 'Copied to clipboard.';
    }).catch(() => {
      dataStatus.textContent = 'Select and copy the text manually.';
    });
  } else {
    dataStatus.textContent = 'Select and copy the text manually.';
  }
}

function handleImport() {
  const raw = dataTextarea.value.trim();
  if (!raw) {
    dataStatus.textContent = 'Paste your data first.';
    return;
  }

  const parsed = parseImportPayload(raw);
  if (!parsed) {
    dataStatus.textContent = 'That data format is not valid JSON.';
    return;
  }

  const normalized = normalizeImportedNotes(parsed);
  if (!normalized) {
    dataStatus.textContent = 'No valid notes found in that data.';
    return;
  }

  notes = normalized;
  saveNotes();
  renderNotes();
  closeDataModal();
}

function getExportPayload() {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    notes
  };
}

function parseImportPayload(raw) {
  try {
    return JSON.parse(raw);
  } catch (error) {
    return null;
  }
}

function normalizeImportedNotes(payload) {
  let importedNotes = null;

  if (Array.isArray(payload)) {
    importedNotes = payload;
  } else if (payload && Array.isArray(payload.notes)) {
    importedNotes = payload.notes;
  }

  if (!importedNotes) return null;

  const normalized = importedNotes
    .map(normalizeNote)
    .filter(note => note);

  if (normalized.length === 0) return null;

  return normalized;
}

function normalizeNote(note) {
  if (!note || typeof note !== 'object') return null;

  const bodyPart = typeof note.bodyPart === 'string' ? note.bodyPart : null;
  const description = typeof note.description === 'string' ? note.description.trim() : '';
  const startDate = toValidTimestamp(note.startDate);
  const endDate = note.endDate == null ? null : toValidTimestamp(note.endDate);
  const id = typeof note.id === 'string' ? note.id : crypto.randomUUID();

  if (!bodyPart || !description || !startDate) return null;

  return {
    id,
    bodyPart,
    startDate,
    endDate,
    description
  };
}

function toValidTimestamp(value) {
  const numberValue = typeof value === 'string' ? Number(value) : value;
  if (!Number.isFinite(numberValue)) return null;
  if (numberValue <= 0) return null;
  return numberValue;
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
  updateBodyHighlights3D(notes);
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

function formatTitleCase(part) {
  return formatPartName(part)
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
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
