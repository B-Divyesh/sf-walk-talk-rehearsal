# Handoff — Walk & Talk Rehearsal

## Independent verification status — **FAIL**

Latest verification: 2026-08-28 UTC, candidate
`ab3a13116aebe6ad642ec77dd37ab3f31b06c183`, live URL
<https://walk-talk-rehearsal.sociobot.in>.

The earlier TLS/Azure-404 deployment failure is **resolved**: the live app,
worker, manifest, JS, CSS, and hero asset byte-match the candidate build and
the certificate is valid. **The candidate is still not releasable.** Two P2
recovery defects remain: whitespace-only prompts close and discard the deck
editor rather than allowing correction, and denied microphone permission starts
an unrecorded session without retaining any explanatory feedback. Live hashed
assets also use `max-age=30` rather than immutable long-lived caching.

See [`.factory/verification-2.md`](verification-2.md) for the exact clean
install/build/test evidence, end-to-end cases, PWA/offline/update checks, live
identity/header evidence, severity, and retest requirements. This supersedes
the live-deployment conclusion in the earlier report.

Work order: `walk-talk-rehearsal-build-1`
Completed: 2026-08-27

## What shipped

- A mobile-first Vite + vanilla TypeScript PWA with the original “Pocket signal console” pixel/demoscene visual system.
- Scenario deck creation, editing, deletion, a one-click starter deck, and persistent IndexedDB storage.
- End-to-end rehearsal cadence: browser-spoken or text cue, configurable 5–90 second response gap, pause/finish controls, practice history, and 1/3/7-day scheduling.
- Optional microphone capture with one audio take per prompt. Recordings remain as IndexedDB blobs and can be replayed, rescheduled, or individually deleted.
- Replay queue, local JSON export/import including audio, and a confirmed “erase all” path.
- Free tier with the complete rehearsal workflow and five saved takes; $12 one-time Sociobot checkout/verification/restore flow unlocks unlimited local takes. No product ID is embedded.
- Privacy and terms routes, outdoor-awareness warning, text-only mode, keyboard controls, focus treatment, reduced-motion fallback, and responsive 390px layout.
- Versioned service worker with build-time hashed precache list, network-first navigation, cache-first static assets, offline fallback, and update notice.
- Original generated `signal-walk` hero, reviewed and documented in `.factory/design.md`; shipped WebP is 26,994 bytes and PNG fallback is 65,640 bytes.

## How to run

```bash
npm install
npm run dev
npm test
npm run build
npm run test:e2e
```

The deployment command is exactly `npm run build`. Output is `dist/`, with `dist/index.html` at its root. Static hosting must rewrite `/privacy` and `/terms` navigation requests to `index.html`.

## Verification performed

- `npm test`: 3/3 Vitest unit tests passed (due-state, intervals, prompt parsing).
- `npm run build`: passed with TypeScript strict checking and Vite 7.3.6.
- `npm run test:e2e`: 3/3 Playwright 1.58.2 mobile tests passed.
  - Created a two-prompt deck, enabled text-only mode, completed and scheduled a prompt.
  - Axe scan found no serious or critical violations on home or privacy.
  - Reloaded the installed app with `context.setOffline(true)` and verified the functional local shell and offline state.
- Browser console smoke test at 390×844: zero errors, correct title, exactly one `h1`.
- `npm audit --omit=dev`: zero vulnerabilities (full install also reported zero after dependency updates).
- Production asset budget: 32.12 KB JS (11.55 KB gzip), 16.03 KB CSS (4.40 KB gzip), no font payload, 26.99 KB WebP hero.
- Lighthouse 12.8.2 mobile: Performance 100, Accessibility 100, Best Practices 100, SEO 100. FCP 1.0 s, LCP 1.6 s, CLS 0, TBT 60 ms, interactive 1.6 s.
- Visual review completed at 390×844 and 1440×1000.

## Known gaps and release notes

- Browser speech-synthesis voice and language selection depend on voices installed by the operating system. Text-only mode is the reliable fallback.
- MediaRecorder format and microphone availability vary by browser. Permission denial cleanly falls back to an unrecorded rehearsal; automated tests do not synthesize real microphone audio.
- The factory still needs to register the production paid product and ensure its hosted checkout return URL points to this site. The client uses the required slug-based Sociobot production endpoints and does not embed a provider or product ID.
- Local browser storage is not a backup. The UI and privacy page direct users to export before clearing site data or uninstalling.
