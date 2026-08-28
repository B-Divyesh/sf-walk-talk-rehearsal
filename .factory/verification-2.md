# Independent verification 2 — FAIL

**Work order:** `walk-talk-rehearsal-verify-2`  
**Candidate:** `ab3a13116aebe6ad642ec77dd37ab3f31b06c183`  
**Live URL:** <https://walk-talk-rehearsal.sociobot.in>  
**Verified:** 2026-08-28 UTC  
**Method:** clean detached worktree at the candidate, fresh lockfile install,
production build and independent Chromium checks. Product source was not
modified.

## Verdict

**FAIL — do not release this candidate.** The previously reported live-host
failure is no longer present: the live deployment is byte-for-byte the
candidate build and is usable. However, two reproducible P2 recovery failures
mean the product does not meet the work-order requirement for invalid-input and
permission-error recovery. The production host also misses the required
long-lived immutable cache policy for hashed assets.

## Defects

### P2 — whitespace-only prompts discard the in-progress editor state

1. Open **Build your first deck**.
2. Enter a deck name and whitespace-only prompt lines.
3. Select **Save deck**.

The app correctly rejects the deck and shows “Add at least one prompt.”, but
its `announce()` re-render replaces the open dialog. The dialog closes and the
learner must reopen it and re-enter the fields instead of correcting the
invalid prompt in place. This is a failed invalid-input recovery path.

### P2 — microphone denial starts silently without a recovery explanation

In Chromium with microphone permission denied, selecting **Record** starts a
normal unrecorded session, but the intended “Microphone access was not
granted. Starting without recording.” notice is rendered immediately before
the session view and is removed by the next render. There is no session toast
or equivalent explanation (`.toast` absent; recording indicator absent). A
learner who expected a locally saved take is not told how to recover.

### P2 — live hashed assets are revalidated every 30 seconds, not immutable

At the live URL, `/assets/index-CGNPyTzm.js`, CSS, image, worker, manifest and
HTML all return `Cache-Control: public, must-revalidate, max-age=30`. The
hashed JS/CSS asset is 32,120 B and is safe to cache immutably, but is not
served with a long-lived immutable policy. This misses the PWA performance
contract's deploy caching requirement and causes needless revalidation while
walking. `manifest.webmanifest` is additionally served as
`application/octet-stream`, not a manifest/JSON MIME type (P3 deployment
hardening issue).

### P3 — response-policy hardening remains incomplete

The healthy live response includes HSTS, `Referrer-Policy:
strict-origin-when-cross-origin`, `X-Content-Type-Options: nosniff`, and DNS
prefetch control. It does not include a Content-Security-Policy,
frame-ancestors/clickjacking control, or Permissions-Policy. Set policies that
retain the required local microphone behavior while preventing unwanted
embedding and third-party execution.

## Fresh evidence

### Clean repository gates

| Check | Result |
| --- | --- |
| `npm ci` | PASS — 60 packages audited; 0 vulnerabilities |
| `npm test` | PASS — 1 Vitest file, 3/3 tests |
| `npm run build` | PASS — strict TypeScript, Vite production build, service-worker injection; `dist/` created |
| `npm run test:e2e` | PASS — 3/3 Chromium 1.58.2 tests |
| `npm audit --omit=dev` | PASS — 0 vulnerabilities |
| lint/type checks available | PASS — no lint script exists; `build` runs `tsc --noEmit` |

Production bundle sizes: JS **32,120 B** (11,550 B gzip), CSS **16,026 B**
(4,400 B gzip), no webfont payload, WebP hero **26,994 B**. The 48,146 B JS +
CSS total is comfortably below the 200 KB/50 KB budgets. A fresh Lighthouse
CLI invocation could not attach to the supplied Chromium binary in this
container, so no new Lighthouse score is claimed; browser/axe and asset-budget
checks above completed successfully.

### Product and recovery exercise

Against production `dist/` via Vite preview at 390 × 844:

- Created a French two-prompt deck; set both 5-second and 90-second gap
  boundaries; enabled text-only; started a session; used Space to
  pause/resume; finished and scheduled the first prompt for three days;
  confirmed the second prompt; ended and reloaded with the deck persisted.
- With fake Chromium microphone hardware and permission granted, created a
  MediaRecorder take; IndexedDB `takes` count was 1 and no page/console error
  occurred.
- Exported the starter deck as `walk-talk-rehearsal` JSON and imported it into
  a clean browser context; one deck restored. A malformed JSON import shows
  its recovery message and keeps Settings open.
- Tested the two P2 cases above separately. Whitespace does not create a deck,
  but does close the editor; denied microphone starts the session with neither
  explanatory toast nor recording state.

### PWA, accessibility, visual, and privacy checks

- With a controlled browser offline after service-worker activation, an
  offline reload showed the functional app shell, its heading, service-worker
  controller, and `OFFLINE / all local` status.
- In a disposable copy of built output, registering a changed worker for the
  same scope fired the product's update listener and displayed “Update ready.
  Reload when you finish this rehearsal.” The production worker has
  `skipWaiting` and `clientsClaim`.
- Fresh axe scans of home and privacy on **390 × 844** and **1440 × 1000** had
  **zero serious or critical findings**. The live pages have `lang`, title,
  one h1, main landmark, image alt text, visible cyan `:focus-visible` outline,
  and a reduced-motion rule that removes animation and transitions.
- Visual review of both sizes found no clipping, overlap, or mobile control
  obstruction. Desktop and mobile maintain the Pocket Signal console system.
- Browser request capture on the live home and privacy pages showed no external
  requests and no console/page errors. Source audit found local IndexedDB for
  decks/settings/takes and no analytics. The only application network endpoint
  is the documented Sociobot license verification endpoint, reached only when
  a license token exists; microphone capture is explicit and local.

### Deployment identity and transport

The live root, JS, CSS, `sw.js`, manifest, offline page and WebP asset all
SHA-256 byte-match the candidate's freshly generated `dist/` artifacts. The
live certificate is valid for `walk-talk-rehearsal.sociobot.in`, issued by
GeoTrust/DigiCert, valid 2026-08-27 through 2027-02-27. `/privacy` and
`/terms` return the SPA shell correctly. Therefore the earlier TLS/Azure-404
finding is resolved and is not a current defect.

## Retest requirements

1. Keep deck dialog state and values open when `promptLines()` is empty; bind
   the error to the prompt field.
2. Persist microphone-denial feedback into the session UI and state plainly
   that the session will not save a recording.
3. Deploy `Cache-Control: public, max-age=31536000, immutable` for hashed
   assets and a correct manifest MIME type; add the response policies above.
4. Re-run clean build, recovery-path browser tests, and live header checks.
