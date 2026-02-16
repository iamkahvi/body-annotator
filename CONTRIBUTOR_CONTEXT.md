# Body Log app context

## What this app is
A single‑page, static web app for tracking body‑part notes. Users click a body part, enter a description plus a start date (and optional end date), and the app stores notes in `localStorage`. Notes are listed with search/sort/filter and the body graphic is highlighted based on recency.

## Data model (stored in `localStorage`)
`localStorage` key: `body-annotator-notes`

Each note is an object with:
- `id`: string UUID (`crypto.randomUUID()`).
- `bodyPart`: canonical part name (e.g. `left_knee`, `upper_back`).
- `description`: free‑text string.
- `startDate`: number (ms timestamp).
- `endDate`: number (ms timestamp) or `null` for ongoing.

Legacy format: older notes may have `timestamp`/`createdAt`/`occurrences`; `site/app.js` migrates on load.

Canonical body parts are defined in `site/app.js` (`BODY_PARTS`). SVG front/back remaps thighs/calves and back parts to match names.

## Architecture (rough)
- `site/index.html`: layout, modal, filters, includes `site/app.js` as ES module.
- `site/styles.css`: styling for layout, modal, and note cards.
- `site/app.js`: application state + UI wiring.
  - Loads/saves notes from `localStorage`.
  - Opens/closes modal with display/edit modes; creates/edits/deletes notes and their date ranges.
  - Filters/sorts notes and renders list.
  - Calls `updateBodyHighlightsSVG` to color body parts by recency.
- `site/body-svg.js`: renders a front/back SVG body; wires click/hover and highlight logic.
- `site/body3d.js`: optional Three.js body model renderer (not currently wired in `app.js`).
  - Reads `site/body-models.json` for model path + mesh name mapping.
  - Falls back to a procedural body if model load fails.

## Highlighting behavior
Body parts are colored from base gray to accent based on the most recent end date in the last ~21 days (ongoing notes are treated as “now”). More recent dates = stronger highlight.

## Files worth reading first
- `site/app.js`
- `site/body-svg.js`
- `site/index.html`
- `site/body3d.js` + `site/body-models.json` (if you want to enable 3D)
