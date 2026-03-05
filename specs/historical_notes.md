# Historical Notes Feature

## Problem

Expired notes are permanently deleted from `localStorage` on page load (line 127 of `app.js`). Once a note's `expiresAt` timestamp passes and the user opens the app, that note is gone forever. There is no way to look back at past annotations.

## Current Behavior

1. `loadNotes()` filters out expired notes and immediately calls `saveNotes()`, destroying them.
2. `getActiveNotes()` also filters expired notes at render time.
3. `deleteNote()` permanently removes a note from the array.
4. Export only includes active (non-expired) notes via `getExportPayload() -> getActiveNotes()`.

Expired notes and explicitly deleted notes are indistinguishable — both are gone.

## Goal

Allow users to browse all historical notes, including those past expiry, via the existing status filter.

## Approach

### Data model changes

Replace `expiresAt` with `lastInteractedWith` (ms timestamp). Expiry is derived at read time: a note is expired when `Date.now() > lastInteractedWith + ONE_WEEK_MS`. No separate storage key — everything stays in `body-annotator-notes`.

Per-note fields become:
- `id`: string UUID
- `bodyPart`: canonical part name
- `description`: free-text string
- `startDate`: number (ms timestamp)
- `endDate`: number (ms timestamp) or `null` for ongoing
- `lastInteractedWith`: number (ms timestamp)

### Expiry logic

- `isExpired(note, now)` becomes `now > note.lastInteractedWith + ONE_WEEK_MS`.
- Any save, edit, resolve, or mark-ongoing action sets `lastInteractedWith = Date.now()`.
- **No purging on load.** `loadNotes()` keeps all notes in the array. Expired notes remain in storage indefinitely.
- Explicit deletes (delete button) remain hard deletes — the note is removed from the array and from storage.

### UI changes

Add "Expired" as a new option in the existing `#filter-status` dropdown:
- `All` — shows active (ongoing + resolved) notes only (current default behavior, excludes expired)
- `Ongoing` — ongoing and not expired
- `Resolved` — resolved and not expired
- `Expired` — only notes past their expiry window

Note cards for expired notes show an "Expired" badge. Clicking an expired note opens the modal in read-only display mode (no edit/resolve/delete actions).

Body SVG highlighting continues to use only non-expired notes.

### Migration

On load, migrate existing notes: set `lastInteractedWith = expiresAt - ONE_WEEK_MS` if `expiresAt` exists, then drop `expiresAt`. Notes without either field get `lastInteractedWith = startDate`.

### Changes by file

| File | Change |
|---|---|
| `site/app.js` | Replace `expiresAt` with `lastInteractedWith`. Remove expired-note purge from `loadNotes()`. Update `isExpired()`. Add migration logic. Update filter logic to support "Expired" status. Make modal read-only for expired notes. Update all save/resolve/ongoing handlers to set `lastInteractedWith`. |
| `site/index.html` | Add `<option value="expired">Expired</option>` to `#filter-status`. |
| `site/styles.css` | Add expired badge style. |

### Export/Import

Export includes all notes (active and expired). Import normalizes `lastInteractedWith` the same way as the existing `expiresAt` normalization — fall back to `startDate` if missing.

### Open questions

- **Should there be a "permanently clear history" action?** Not for v1, but worth considering if storage gets large.
- **Should expired notes be restorable?** Could allow a "reactivate" action that resets `lastInteractedWith` to now. Not required for v1.
