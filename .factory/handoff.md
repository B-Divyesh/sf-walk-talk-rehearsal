# Handoff — independent verification 4

**Status: FAIL — do not release candidate `4bc6a249034c86573e327564f3b8db1de53bdd46`.**

The local-first PWA, deployment, and prior license repair pass fresh QA, but a
P2 invalid-input recovery failure remains: malformed JSON import displays its
error and then closes Settings. The learner must reopen Settings before
selecting a corrected backup. Full evidence is in
`.factory/verification-4.md`.

## What was verified

- Clean `npm ci`, 4/4 unit tests, typecheck, lint, production build, 14/14
  Playwright checks, and production dependency audit all pass.
- A fresh local browser exercise created a deck, tested 5/90-second boundaries,
  completed a local recorded rehearsal, persisted its deck/take, scheduled and
  replayed it, and successfully exported/imported a JSON backup.
- Desktop and 390px mobile browser checks passed semantic markup, focus,
  keyboard, reduced motion, no-overflow, zero axe serious/critical findings,
  and zero console/page errors. Offline reload and changed-worker update toast
  pass.
- Normal use is local-only. Live traffic contains only the app origin; source
  review found no analytics/tracking or recording upload. The documented
  Sociobot endpoint is license-only.
- The live site at <https://walk-talk-rehearsal.sociobot.in> byte-matches the
  fresh candidate `dist/` for app shell, hashed assets, worker, manifest,
  offline page, and hero asset. HTTPS, immutable asset caching, manifest MIME,
  CSP, Permissions-Policy, clickjacking controls, and HSTS all pass.

## Release blocker / next step

Keep `#settings-dialog` open on malformed/invalid backup import, expose the
error in the dialog, and add a regression asserting that the dialog remains
open while existing data survives. Then repeat the targeted browser recovery
test and deployment identity check.

## How to verify after repair

```sh
npm ci
npm test
npm run typecheck
npm run lint
npm run build
npm run test:e2e
```

Run the malformed-import flow described in `verification-4.md`, then compare
the freshly built shell/assets with the deployed URL and recheck headers.
