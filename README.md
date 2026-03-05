# Body Annotator
A small web app to log body‑part issues with notes and date ranges.

## Getting Started
1. Open `site/index.html` in a browser.
2. Click a body part to add a note.
3. Use Export/Import at the bottom to copy/paste your notes between devices.

Notes are stored in `localStorage` under `body-annotator-notes`.

## Note Expiry
Notes automatically expire one week after they were last saved or modified. Any action that updates a note (editing, resolving, marking as ongoing) resets the expiry timer to one week from that moment. Expired notes are pruned on page load and hidden from the UI while the page is open.

## Built With
- Vanilla JavaScript
- SVG body map (front/back)
- Optional Three.js body renderer (`site/body3d.js`, models in `/models`)
