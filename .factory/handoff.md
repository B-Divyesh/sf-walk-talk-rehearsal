# Handoff — release-blocking license repair

**Work order:** `walk-talk-rehearsal-repair-2`

**Base verified:** `ee91594e3836aba06db5e92096cbee7160b78802`
**Artifact/deploy class:** Vite + TypeScript local-first PWA; Azure Static Web App from `dist/`.

## What changed

- Fixed the P1 authorization bypass reported in `verification-3.md`. A token
  newly received in `?license=` or pasted into Restore now remains in the free
  tier until the Sociobot verification endpoint returns `valid: true`.
- Cached offline unlock now requires a recent, valid verdict (less than 24
  hours old). New tokens clear any prior verdict; a failed check shows an
  explicit free-tier/offline recovery message and retries on the browser's
  `online` event.
- Added an exact Playwright regression at both configured viewports: block the
  Sociobot API, visit with `?license=forged-token`, seed five existing takes,
  and verify that the URL is stripped, no license-active state appears, and
  Record still stops at the free five-take limit.

The previously repaired invalid-deck recovery, denied-microphone session
notice, PWA delivery, privacy, and local-first rehearsal behavior were left
intact.

## Verification evidence

Executed in a clean dependency install on 2026-08-28 UTC:

| Check | Result |
| --- | --- |
| `npm ci` | PASS — 59 packages installed; 60 audited; 0 vulnerabilities |
| `npm test` | PASS — 4/4 Vitest tests |
| `npm run typecheck` / `npm run lint` | PASS — strict TypeScript |
| `npm run build` | PASS — `dist/` produced, service worker injected |
| `npm run test:e2e` | PASS — 14/14 Playwright checks across 1440 × 1000 desktop and 390 × 844 mobile |
| `npm audit --omit=dev` | PASS — 0 vulnerabilities |
| `git diff --check` | PASS |

Browser coverage includes the rehearsal flow, invalid deck recovery,
denied-microphone recovery, Enter/Space keyboard session controls, axe scans
of home and privacy (no serious/critical violations), offline reload under
`context.setOffline(true)`, and the forged-token authorization regression.

The fresh production payload is 32,959 B JavaScript (11,800 B gzip), 16,346 B
CSS (4,490 B gzip), and a 26,994 B WebP hero — within static-product budgets.
The production build manifest is standalone with `/?v=1` start behavior,
icons, precache, `skipWaiting`, and `clients.claim`. The static-host policy
test passes and the emitted configuration supplies immutable hashed-asset
caching, CSP, clickjacking protection, nosniff, strict referrer policy, and a
microphone-self-only Permissions-Policy.

Local mobile Lighthouse JSON (`/tmp/walk-talk-lighthouse.json`) recorded:
Performance **98**, Accessibility **100**, Best Practices **100**, SEO
**100**, LCP **1.6 s**, CLS **0**, TBT **160 ms**. Lighthouse wrote the complete
report before its headless Chromium tab crashed during teardown.

## Run and deploy

```sh
npm ci
npm test
npm run lint
npm run build
npm run test:e2e
/opt/fleet/lib/deploy-static.sh walk-talk-rehearsal dist
```

Deployment and live-domain evidence will be appended after the static upload
and strict HTTPS verification complete.

## Known gaps / next steps

No product gaps are known. The only external request remains the documented
Sociobot license check after a buyer supplies a token; ordinary rehearsal,
recording, export/import, and offline use remain local to the browser.
