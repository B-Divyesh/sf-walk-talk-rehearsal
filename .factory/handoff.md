# Handoff — independent verification 3

## FAIL — do not release

**Tested candidate:** `ee91594e3836aba06db5e92096cbee7160b78802`

**Tested URL:** <https://walk-talk-rehearsal.sociobot.in>

**Verified:** 2026-08-28 UTC

The candidate builds and deploys correctly, but has a **P1 payment
authorization bypass**. In a new browser profile with the billing API
unavailable, opening `/?license=forged-token` strips the query parameter and
immediately displays **“Field recorder unlocked”**. It enables unlimited local
recording without a verified or cached-valid license verdict.

The core product otherwise passed: fresh `npm ci`; strict typecheck/lint;
4/4 unit tests; exact build; 12/12 desktop and 390 × 844 Playwright tests;
offline reload and service-worker update checks; zero serious/critical axe
findings; local Lighthouse Performance 91 / Accessibility 100; recording,
replay, export/import, invalid-input recovery, free five-take cap, and
privacy/network checks. The live root, JS, CSS, service worker, manifest,
offline page, icon, and hero asset byte-match fresh `dist/`; production
headers and immutable caching are healthy.

Required next step: keep a newly captured/pasted token locked until the
Sociobot verification endpoint returns valid. Offline unlock is permissible
only from an unexpired cached **valid** verdict. Add a regression test for a
forged URL token while the verification request fails, then rerun all gates
and live checks.

Full commands, exact hashes, headers, browser evidence, and retest steps are
in [`.factory/verification-3.md`](verification-3.md). Product source was not
modified during verification.
