# Independent verification — FAIL

**Verifier work order:** `walk-talk-rehearsal-verify-1`  
**Candidate tested:** `ab3a13116aebe6ad642ec77dd37ab3f31b06c183` (`main`)  
**Live URL tested:** <https://walk-talk-rehearsal.sociobot.in>  
**Date:** 2026-08-27 UTC

## Verdict

**FAIL — do not release.** The candidate is reproducibly buildable and its local
PWA workflow is substantially functional, but the configured live URL is not
usable. A normal browser rejects its certificate, and the host serves Azure 404
responses for the app shell assets and service worker. This violates the
`pwa-offline` delivery contract and prevents users from using the product.

## Release-blocking defects

### P0 — live deployment has invalid TLS and no functional asset/PWA delivery

- A strict Chromium navigation to the live URL failed with
  `ERR_CERT_COMMON_NAME_INVALID`.
- The presented certificate was issued to
  `*.msha-slice-7-eus2-1-ase.p.azurewebsites.net`, not
  `walk-talk-rehearsal.sociobot.in` (valid 2026-07-21 to 2027-01-17).
- At 23:22 UTC, an insecure diagnostic request returned a root `index.html`
  whose SHA-256 exactly matched the candidate build
  (`b34e4de9966d0e85d381853d1adac438caedd15302ba3c2e2c503eb125d6f850`),
  but every referenced delivery path returned `404 Site Not Found` HTML:
  `/assets/index-CGNPyTzm.js`, `/assets/index-BaVCAbZ0.css`,
  `/manifest.webmanifest`, `/offline.html`, `/icons/icon-192.png`, and
  `/sw.js`.
- A repeat insecure request at 23:30 UTC returned `404 Site Not Found` even
  for `/`. A browser allowed to ignore TLS rendered the Azure 404 page (one
  error-page `<h1>`) and logged a 404 resource error.

This is fresh evidence of a deployment/configuration failure, not a local build
failure. Correct the hostname certificate and publish the entire `dist/`
directory with SPA fallback before re-verification.

## Product defects found locally

### P2 — invalid prompt input destroys the editable recovery state

Entering whitespace-only prompt lines submits the form, announces “Add at
least one prompt.”, and re-renders the home page. The deck dialog is no longer
open (`#deck-dialog.open === false`), so the learner must reopen it and retype
the other fields rather than correcting the invalid prompt in place.

### P2 — microphone-denial explanation is lost

With microphone permission denied, the app correctly starts an unrecorded
text-only session and later shows “No recording · speak freely”, but the
immediate “Microphone access was not granted…” toast is removed by the
subsequent session render. The user receives no timely recovery explanation.

### P3 — production response policies cannot meet the expected standard

On the one diagnostic root-200 response, HSTS, referrer policy, and
`X-Content-Type-Options` were present, but CSP, clickjacking protection, and a
Permissions-Policy were absent. HSTS was only `max-age=10886400` despite a
`preload` token. Asset caching could not be assessed because the assets were
404. Recheck these headers after the deployment is repaired.

## Evidence: clean install and repository gates

The worktree was clean and at the specified candidate before verification.
Environment: Node `v22.23.2`, npm `10.9.8`.

| Check | Result |
| --- | --- |
| `npm ci` | PASS — 60 packages audited, 0 vulnerabilities |
| `npm test` | PASS — 3/3 Vitest tests |
| Type check + exact production build (`npm run build`) | PASS — `tsc --noEmit`, Vite build, SW injection |
| `npm run test:e2e` | PASS — 3/3 Playwright 1.58.2 tests |
| `npm audit --omit=dev` | PASS — 0 vulnerabilities |
| `git diff --check` before documentation changes | PASS |

Build output: `dist/` exists. Initial JS is 32,120 B (11,550 B gzip), CSS is
16,026 B (4,400 B gzip), there are no font payloads, and the WebP illustration
is 26,994 B. All are within the stated static-product budgets.

## Independent local browser QA

Tested against the generated production `dist/` via Vite preview, not the dev
server.

- **390 × 844 mobile:** visually inspected. Created a two-prompt deck, tested
  whitespace-only invalid prompts, set the 5-second lower-bound speaking gap,
  enabled text-only mode, confirmed IndexedDB persistence, ran a session,
  paused/resumed with focused keyboard controls, finished an answer, and
  scheduled the next prompt for three days. No page or console errors.
- **1440 × 1000 desktop:** visually inspected with one `<h1>`; layout,
  safety reminder, controls, text contrast, and responsive zones were legible.
- **Keyboard/focus:** a focused control had a visible solid focus outline; the
  session’s keyboard Enter pause/resume and schedule controls worked. The
  shipped CSS contains the reduced-motion media rule that disables animation,
  transitions, and smooth scrolling.
- **Recording:** with Chromium fake microphone hardware and granted permission,
  recording state appeared and a MediaRecorder take was saved locally. With
  permission denied, unrecorded recovery worked (subject to the P2 feedback
  defect above).
- **Accessibility:** existing Playwright axe scans for home and `/privacy`,
  plus an independent mobile home scan, found **0 serious/critical** issues.
  Title, `lang`, skip link, landmarks, one page `<h1>`, image alt text, and
  visible focus were present.
- **Privacy/network:** initial local bootstrap made no external requests;
  no third-party script/font CDN was requested. Source and runtime behavior
  keep decks/settings/takes in IndexedDB. The microphone is only requested
  from Record; license verification is the documented user-license-only
  Sociobot request.
- **PWA:** the supplied suite passed an offline reload after
  `context.setOffline(true)`. Independently changing only the worker script
  URL caused a real update event, controller change, and the in-app “Update
  ready. Reload when you finish this rehearsal.” toast, with no errors.
- **Performance:** Lighthouse 12.8.2 generated a local mobile report of
  Performance 91, Accessibility 100, Best Practices 100, SEO 100; FCP 1.1 s,
  LCP 1.6 s, CLS 0, TBT 380 ms. Lighthouse exited non-zero only after writing
  the report because its tab crashed during teardown; the complete audit data
  is in `/tmp/walk-talk-lighthouse.json` in this verification environment.

## Retest instructions

1. Fix DNS/TLS binding for `walk-talk-rehearsal.sociobot.in`.
2. Publish all files from the candidate’s generated `dist/` root, including
   `assets/`, `sw.js`, `manifest.webmanifest`, `offline.html`, and `icons/`;
   configure `/privacy` and `/terms` SPA fallback.
3. Add cache rules for hashed assets and secure response policies, then rerun
   this verification from a clean checkout.
4. Preserve invalid deck form values on validation errors and make microphone
   denial visible in the session UI.
