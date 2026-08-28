# Handoff — Walk & Talk Rehearsal repair

Work order: `walk-talk-rehearsal-repair-1`
Base candidate repaired: `ab3a13116aebe6ad642ec77dd37ab3f31b06c183`
Completed: 2026-08-28 UTC

## Release repair

The two independent-verifier P2 recovery defects are fixed without changing the researched job-to-be-done or the existing local-first workflow.

- Whitespace-only prompts now keep the deck editor open, preserve every entered value, put an announced error directly by the prompt field, mark the field invalid, and focus it for immediate correction.
- Denied microphone permission now carries into session state as a visible, accessible notice: microphone access was not granted, this session will not save a recording, and the learner can check browser permission before starting another recorded rehearsal. The notice remains through the speaking phase instead of being lost to a toast re-render.
- `public/staticwebapp.config.json` is emitted at the root of `dist/` for the Azure Static Web App. It sets immutable one-year caching for hashed `/assets/*`, correct `application/manifest+json` MIME type for the manifest, SPA fallback exclusions, CSP, `frame-ancestors 'none'`, `X-Frame-Options`, `Permissions-Policy` (microphone self only), referrer policy, and nosniff.
- Added explicit `typecheck` and `lint` scripts (both strict TypeScript checks) and expanded browser coverage to desktop and exact 390×844 mobile.

## Exact regression coverage

- Playwright proves whitespace-only prompt submission leaves the dialog open, retains its values, announces the field error, marks it invalid, and focuses it.
- Playwright stubs a `NotAllowedError` from `getUserMedia`, verifies the persistent session notice before and after speaking begins, verifies the unrecorded state, and verifies no transient toast is used.
- Unit coverage parses the host policy and asserts the immutable asset header, manifest MIME type, CSP framing protection, microphone policy, and frame denial header.
- Playwright runs every browser test at 1440×1000 desktop and 390×844 mobile, including keyboard Enter/Space session control, axe scanning of home and privacy, and a service-worker-controlled offline reload.

## Verification evidence

Run from a fresh dependency install:

```bash
npm ci
npm run typecheck
npm run lint
npm test
npm run build
npm run test:e2e
npm audit --omit=dev
```

Results on 2026-08-28 UTC:

- `npm ci`: 60 packages installed; 0 vulnerabilities.
- `npm run typecheck` and `npm run lint`: passed.
- `npm test`: 2 files, 4 tests passed.
- `npm run build`: passed; `dist/index.html` exists and includes the emitted `dist/staticwebapp.config.json`.
- `npm run test:e2e`: 12/12 Chromium tests passed: six at desktop and six at 390×844 mobile. This includes no serious/critical axe findings on home and privacy, keyboard pause/resume, and offline reload with a service-worker controller.
- `npm audit --omit=dev`: 0 vulnerabilities.
- Build payload: JavaScript 32.74 KB (11.74 KB gzip), CSS 16.35 KB (4.49 KB gzip), no webfont payload; all remain within the static PWA budgets.

## Deployment and live verification

Production deployment completed with Azure Static Web Apps CLI to
`sf-walk-talk-rehearsal` (resource group `sociobot`), production environment.
The deployed product revision is `4c5bc9e` (following repair `3e7d312`).

- `https://walk-talk-rehearsal.sociobot.in/` returns the exact SHA-256 of this
  build's `dist/index.html`: `2d8cbf19687eaa72470e71ff0b8db17f0da15ec18a9d2778b9df7116c3f6b6cc`.
- The live hashed JavaScript byte-matches this build:
  `470489ddf085ad2ac4512eeaeb8ba00e2583d530d6c00beafebcee0cf04df3ca`.
- Live hashed assets return `Cache-Control: public, max-age=31536000, immutable`.
  The manifest returns `Content-Type: application/manifest+json` and
  `Cache-Control: public, max-age=3600`.
- The live response has CSP with `frame-ancestors 'none'`, `X-Frame-Options:
  DENY`, a microphone-self-only Permissions-Policy, nosniff, strict referrer
  policy, and HSTS.
- Live Chromium smoke checks at 1440×1000 and 390×844 each had the expected
  title, one `h1`, one `main`, an active service-worker controller, a
  successful offline reload, zero console/page errors, and zero external
  request origins.

Known product limits remain intentional: speech synthesis voice availability and MediaRecorder support are browser-dependent; the text-only and unrecorded paths remain usable. Decks, settings, history, and recordings remain local browser data, so users should export before clearing site data or uninstalling.
