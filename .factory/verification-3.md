# Independent verification 3 — FAIL

**Work order:** `walk-talk-rehearsal-verify-3`

**Candidate tested:** `ee91594e3836aba06db5e92096cbee7160b78802` (`main`)

**Live URL tested:** <https://walk-talk-rehearsal.sociobot.in>

**Verified:** 2026-08-28 UTC
**Method:** clean checkout at the candidate, fresh lockfile install, exact
production build, independent Chromium/PWA checks, and fresh production
transport/artifact checks. Product source was not modified.

## Verdict

**FAIL — do not release.** The previous deployment failure is resolved. The
live application is healthy and byte-identical to the fresh candidate build,
and the core local-first rehearsal flow passes. A new, forged license token,
however, unlocks paid unlimited recording whenever license verification is
unavailable. This is a reproducible payment authorization bypass.

## Release-blocking defect

### P1 — an unverified URL license unlocks paid recording while offline

`src/license.ts` correctly makes `cachedUnlock()` require a cached valid
verdict. But `init()` in `src/main.ts` overrides that protection: when
`captureLicense()` sees any `?license=` value, it sets `unlocked = true` before
verification. If the verification request fails (for example, while offline),
the catch retains that unlocked state indefinitely.

Reproduction, against freshly built production output:

1. Use a fresh browser profile and block `https://api.sociobot.in/**`.
2. Open `/?license=forged-token`.
3. The app removes the query token from the URL, then displays **“Field
   recorder unlocked”** with unlimited local takes and no warning.

The independent browser probe returned:

```json
{"url":"http://127.0.0.1:4174/","unlocked":1,"notice":[]}
```

This violates the paid-unlock contract: offline optimistic unlock may use a
**cached valid verdict**, not a raw, newly supplied and unverified token. It
also lets an attacker retain unlimited recording by importing a forged token
while disconnected. Do not set `unlocked` from `captureLicense()` alone;
retain the free state until a valid response is received, or until an existing
unexpired cached valid verdict is found. Preserve the token for later retry
and give an honest verification-pending/offline notice.

## Clean repository gates

| Check | Result |
| --- | --- |
| Clean checkout / target | PASS — `HEAD` was exactly `ee91594e3836aba06db5e92096cbee7160b78802` and clean before QA |
| `npm ci` | PASS — 59 packages installed; 60 audited; 0 vulnerabilities |
| `npm run typecheck` | PASS |
| `npm run lint` | PASS — configured as strict TypeScript check |
| `npm test` | PASS — 2 files, 4/4 tests |
| `npm run build` | PASS — strict typecheck, Vite production build, service-worker injection, `dist/` created |
| `npm run test:e2e` | PASS — 12/12 Chromium 1.58.2 tests: six desktop and six 390 × 844 mobile |
| `npm audit --omit=dev` | PASS — 0 vulnerabilities |

Fresh production payload: JavaScript **32,744 B** (**11,740 B gzip**), CSS
**16,346 B** (**4,490 B gzip**), no font files, and WebP hero **26,994 B**.
These are within the 200 KB JS, 50 KB CSS, 120 KB font, and 300 KB hero
budgets. Local Lighthouse mobile audit: **Performance 91**, **Accessibility
100**, LCP **1,507 ms**, CLS **0**, TBT **376 ms**.

## Product, recovery, and local-first exercise

All browser tests used the generated `dist/` through `vite preview`, not the
development server.

- At desktop 1440 × 1000 and mobile 390 × 844, created user-authored decks,
  enabled text-only mode, started a normal two-prompt rehearsal, finished an
  answer, and scheduled its return. A deck persisted after reload.
- The speaking-gap slider produced both contractual boundary labels: **5
  seconds** and **90 seconds**.
- With a browser-level granted microphone/MediaRecorder stub, **Record**
  showed “Recording locally”; finishing saved a local audio take, scheduling
  set its replay, making it due displayed the native audio control, and
  “Heard it · +7 days” rescheduled it. Captured request origins were only the
  local app origin.
- Seeded five local takes in a disposable browser profile. A sixth recorded
  session was blocked with the stated “five free takes are full” recovery
  message.
- Export created a Walk & Talk JSON backup. A malformed import displayed
  “That file is not a valid Walk & Talk backup.” without losing the existing
  deck; the valid backup then imported successfully. The shipped Playwright
  recovery test also confirms whitespace-only prompts keep their dialog,
  values, invalid state, focus, and announced error.
- The supplied denied-microphone test passed at both viewports: the accessible
  session notice remains visible and the session plainly says it will not
  save a recording.

## Accessibility, responsive UI, and PWA

- The 12-case suite passed axe scans of home and privacy with **zero
  serious/critical findings** at desktop and 390 × 844 mobile.
- Browser smoke checks confirmed `lang`, title, exactly one `h1`, one `main`,
  meaningful hero alt text, and no console or page errors. Keyboard Enter and
  Space session control are covered by the suite. An independent 390 px
  reduced-motion check found no horizontal overflow, a visible `3px` cyan
  focus outline, a 277.6 × 56 px primary target, and `transition-duration:
  0s` under reduced motion.
- The shipped offline Playwright test passed after service-worker control and
  `context.setOffline(true)`: reload retained the functional shell and
  “OFFLINE / all local” state. Independently serving a changed worker for the
  same scope produced the in-app “Update ready. Reload when you finish this
  rehearsal.” toast and an active controller. The worker has versioned
  precache, `skipWaiting`, and `clientsClaim`.

## Privacy, transport policy, and deployment identity

- Normal free home loads at both live viewports requested only
  `https://walk-talk-rehearsal.sociobot.in`; there were zero console/page
  errors and no analytics, CDN font, tracking, or recording-upload request.
  Source and runtime review confirm IndexedDB for decks/settings/takes and an
  explicit microphone request only from **Record**. The only application
  external origin in the built JavaScript is the documented Sociobot billing
  API, reached only for a license.
- Fresh SHA-256 comparison confirms live `index.html`, hashed JS, hashed CSS,
  `sw.js`, manifest, offline page, hero WebP, and icon exactly match this
  candidate's fresh `dist/`. In particular, the live root hash is
  `2d8cbf19687eaa72470e71ff0b8db17f0da15ec18a9d2778b9df7116c3f6b6cc`
  and JS hash is
  `470489ddf085ad2ac4512eeaeb8ba00e2583d530d6c00beafebcee0cf04df3ca`.
- Live response policies pass the expected deployment checks: hashed JS is
  `Cache-Control: public, max-age=31536000, immutable`; manifest is
  `application/manifest+json` with a one-hour cache; CSP restricts execution
  to self and permits only the billing API connection; `frame-ancestors
  'none'`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, strict
  referrer policy, microphone-self-only Permissions-Policy, and HSTS are
  present.

## Retest requirements

1. Make a fresh URL/pasted token remain locked until verification succeeds;
   use only an unexpired cached **valid** verdict for offline unlock.
2. Add automated coverage for forged `?license=` plus a failed/offline
   verification request, asserting the free five-take cap remains enforced.
3. Re-run the clean gates, the full browser suite, this offline authorization
   probe, and live artifact/header comparison after deployment.
