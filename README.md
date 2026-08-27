# Walk & Talk Rehearsal

Walk & Talk is a mobile-first, offline-capable rehearsal tool for language learners who want to practise real situations while walking or commuting. You write the situations. The app speaks each cue, leaves a timed gap for your answer, optionally records the answer locally, and schedules it for a later listen.

Live site: <https://walk-talk-rehearsal.sociobot.in>

## What v1 includes

- User-authored scenario decks with one cue per line
- Spoken prompts through the browser’s on-device speech synthesis, plus a text-only mode
- Configurable 5–90 second speaking gaps with pause and finish controls
- Optional microphone recording stored only in IndexedDB
- A replay queue with 1, 3, and 7-day scheduling
- Full JSON export/import, including local audio takes
- Installable PWA with an explicitly tested offline app shell
- One-time Sociobot license restore; free use includes five saved takes and the unlock removes that cap
- Accessible keyboard controls, focus states, reduced motion, and mobile-safe layouts

Walk & Talk does not grade pronunciation, generate dialogue, upload audio, or replace a tutor. Browser speech voices vary by device and operating system.

## Develop and verify

Requires Node.js 20 or newer.

```bash
npm install
npm run dev
npm test
npm run build
npm run test:e2e
```

`npm run build` is the reproducible deployment command. It type-checks, builds the Vite app, and injects the hashed app-shell files into the service worker. Static output lands in `dist/` with `dist/index.html` at its root.

The Playwright suite uses version 1.58.2 and covers a 390px-class mobile flow, automated axe checks, and an offline reload. In a fresh environment, install its browser with `npx playwright install chromium` if it is not already present.

## Data and privacy

Decks, settings, and recordings live in browser IndexedDB. License state lives in localStorage. No analytics, third-party scripts, cloud recording, or CDN fonts are used. Users can export or erase their data from Settings. See the in-app `/privacy` and `/terms` pages.

Microphone access is requested only when a user chooses a recorded session. The free experience never waits on a license network request.

## Deploy

Serve `dist/` as a static site with SPA history fallback to `index.html`. Do not configure billing, DNS, or infrastructure from this repository; the Param Factory owns deployment and product registration.

## Project notes

- Product brief: [`.factory/brief.json`](.factory/brief.json)
- Visual system and asset provenance: [`.factory/design.md`](.factory/design.md)
- Verification and handoff: [`.factory/handoff.md`](.factory/handoff.md)

## License

MIT. See [LICENSE](LICENSE).
