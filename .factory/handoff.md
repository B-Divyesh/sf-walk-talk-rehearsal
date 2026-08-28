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

## Deployment and remaining notes

Deploy the generated `dist/` directory to Azure Static Web App `sf-walk-talk-rehearsal` in resource group `sociobot` using its production environment. The static-host configuration is part of that directory, so it must be deployed with every release. Live deployment/header identity evidence is recorded after publication.

Known product limits remain intentional: speech synthesis voice availability and MediaRecorder support are browser-dependent; the text-only and unrecorded paths remain usable. Decks, settings, history, and recordings remain local browser data, so users should export before clearing site data or uninstalling.
