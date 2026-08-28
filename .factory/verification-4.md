# Independent verification 4 — FAIL

**Work order:** `walk-talk-rehearsal-verify-4`  
**Candidate tested:** `4bc6a249034c86573e327564f3b8db1de53bdd46`  
**Live URL:** <https://walk-talk-rehearsal.sociobot.in>  
**Verified:** 2026-08-28 UTC

## Verdict

**FAIL — do not release this candidate.** The previously reported
deployment-only problems are resolved: the live deployment is healthy and
byte-identical to a fresh production build of this candidate. The core
local-first rehearsal product works. However, malformed JSON import closes
Settings immediately after showing its error, so the learner cannot recover in
place by selecting a valid backup. That misses the required invalid-input
recovery path.

## Defects

### P2 — malformed backup import discards the active recovery surface

1. Open **Settings** and choose **Import**.
2. Select a file containing malformed JSON (for example `{bad`).
3. Observe the toast: “That file is not a valid Walk & Talk backup.”

The error is truthful and no stored data is lost, but `announce()` re-renders
the shell, closing `#settings-dialog`. The learner must reopen Settings before
they can select a corrected backup. Keep Settings and its data tools open for
the failure case and bind/announce the error within that dialog. This was
reproduced against fresh `dist/` at `http://127.0.0.1:4174`: the error status
was present and `HTMLDialogElement.open` was `false`.

No P1 defects were found.

## Fresh local gates

The checkout was clean and at the stated candidate before QA. Product source
was not modified.

| Check | Result |
| --- | --- |
| `npm ci` | PASS — 59 packages installed; 60 audited; 0 vulnerabilities |
| `npm test` | PASS — 2 Vitest files, 4/4 tests |
| `npm run typecheck` | PASS |
| `npm run lint` | PASS — configured as strict TypeScript checking |
| `npm run build` | PASS — strict typecheck, Vite production build, worker injection, and `dist/` |
| `npm run test:e2e` | PASS — 14/14 Chromium 1.58.2 checks across 1440 × 1000 and 390 × 844 |
| `npm audit --omit=dev` | PASS — 0 vulnerabilities |

Fresh output is 32,959 B JS (11,800 B gzip), 16,346 B CSS (4,490 B gzip), no
webfont payload, and 26,994 B WebP hero artwork. These are within the 200 KB
JS, 50 KB CSS, 120 KB font, and 300 KB mobile-hero budgets. Lighthouse 12.8.2
could not complete in this container: both direct and manually launched
Chromium runs crashed the audit tab. No Lighthouse score is claimed; the
browser, axe, layout, and byte-budget checks below completed.

## Independent product exercise

Against freshly built `dist/` served through Vite preview:

- Created a user-authored French deck, selected the contractual 5-second and
  90-second speaking-gap boundaries, enabled text-only mode, and completed a
  recorded one-prompt rehearsal. A controlled local MediaRecorder produced a
  local take; after reload IndexedDB contained one deck and one take.
- Scheduled that take for tomorrow, made it due in the disposable test
  profile, and confirmed that the native replay control rendered. The replay
  reschedule control worked.
- Export created `walk-talk-backup-2026-08-28.json`; its JSON had format
  `walk-talk-rehearsal`, version 1, and the expected deck data. Importing that
  export in a clean browser profile restored the deck successfully.
- The P2 malformed-import recovery defect above was independently reproduced.
  The shipped suite also passes its whitespace-only prompt recovery,
  microphone-denial explanation, keyboard pause/resume, and forged-license
  free-tier-cap regressions.
- Normal free use made requests only to the app origin. The recording probe
  made no outbound request; browser console and page-error collections were
  empty.

## Accessibility, responsive UI, and PWA

- Fresh axe scans at 390 × 844 found zero serious/critical findings on home,
  privacy, and terms; the full 14-case suite also passed home/privacy axe at
  both configured desktop and mobile viewports.
- At 390 px with reduced motion, there was no horizontal overflow, Tab reached
  the skip link with a visible `rgb(68, 230, 225) solid 3px` focus outline,
  primary action size was 277.6 × 56 px, and transition duration was `0s`.
  Keyboard Enter/Space session controls passed in the suite. Visual inspection
  of fresh desktop and mobile screenshots found no clipping or overlap.
- After service-worker control, `context.setOffline(true)` followed by reload
  retained the functional shell and `OFFLINE / all local`; no page/console
  errors occurred. A controlled changed worker registered for the same scope
  produced the in-app “Update ready. Reload when you finish this rehearsal.”
  toast. The emitted worker has versioned precache, `skipWaiting`, and
  `clients.claim`.

## Privacy, deployment identity, and response policy

- Source and runtime review confirm IndexedDB for decks/settings/takes;
  `getUserMedia` only on explicit **Record**; no analytics, trackers,
  third-party scripts, CDNs, or recording upload. The only external endpoint
  is the documented Sociobot license API, used after a license token exists.
- In fresh real-browser live checks at 1440 × 1000 and 390 × 844, title,
  `lang=en`, exactly one `h1`, one `main`, meaningful hero alt text, active
  service-worker control, and zero console/page errors all passed. Normal
  first-load request origin was only `https://walk-talk-rehearsal.sociobot.in`.
- Live `index.html`, hashed JS/CSS, `sw.js`, manifest, offline page, and WebP
  hero SHA-256 byte-match fresh `dist/`. Hashes include index
  `0a6c872b150b0208b4d164f03ffc6bb0a9d36c6a52b15dab1afd9e5c0d716d19`, JS
  `b5fff11ecd835fcef801ae0b0555be942439d850bb8e8ce3e17b9ab0593d14c0`, CSS
  `68eb65fd1b892a81038b34a4aacfb5a7815c5628ef76e6c0b9461e5ebaf2bca8`, and
  worker `2074f7858944d40acaa4566245236e58e86600c12d8e0e1deae5ea62722c3098`.
- Live hashed assets have `Cache-Control: public, max-age=31536000, immutable`;
  manifest is `application/manifest+json` with a one-hour cache. CSP limits
  execution to self and the documented billing connection, and live responses
  include `frame-ancestors 'none'`, `X-Frame-Options: DENY`, nosniff, strict
  referrer policy, microphone-self-only Permissions-Policy, and HSTS. TLS is
  valid for the hostname through 2027-02-27.

## Retest requirement

1. Preserve the Settings dialog when import parsing/validation fails; make the
   error discoverable in that dialog and leave **Import** immediately usable.
2. Add an automated malformed-import regression that asserts the dialog
   remains open and existing data remains intact.
3. Re-run the clean gates, invalid-import browser probe, offline reload,
   changed-worker update probe, and live artifact/header comparison after
   deployment.
