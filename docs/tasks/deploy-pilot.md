# First publication on Netlify (Q4.2 Deploy Pilot)

Slug: `deploy-pilot`
Created: 2026-11-18
Branch: `feature/i2-dopytaj-przed-zaproszeniem` (PR #1, merged to `main` before publication)

## Goal

Publish the verified prototype from `main` at a public HTTPS address on Netlify and complete the post-publication check from [docs/release.md](../release.md).

## Decisions (project owner, 2026-11-18)

- Hosting: Netlify, free plan (budget 0 zł from release.md).
- Method: Netlify connected to the GitHub repository `DestroTM/doroboty-ai`; production branch `main`. Every push to `main` builds and publishes; rollback through the Netlify deploy history.
- Before merging PR #1, GitHub Actions are enabled on the fork so CI runs; merge only with green CI.
- Build settings live in `netlify.toml`: `npm run build`, publish `dist/`, Node.js from `.nvmrc`. No environment variables, secrets, functions or redirects (hash routes).

## Acceptance Criteria

- `./scripts/verify` passes locally on the merged commit; CI is green on PR #1.
- The production address (`*.netlify.app`) opens over HTTPS in a private window without logging in to Netlify.
- The post-publication check in release.md passes, including a direct deep link and reload persistence.
- release.md contains the Netlify publish and rollback steps and a release log row with commit and address.
- FEATURES.md reviewed: hosting does not change product behavior.

## Results (2026-11-18)

- Local `./scripts/verify` passed before the merge (formatting, kit, lint, types, 39 unit tests, packet, build, 40 browser journeys). A clean clone with `npm ci && npm run build` produced `dist/` as Netlify does.
- GitHub Actions were enabled on the fork; CI passed on PR #1 (run 44270075306) and on the merge to `main` (run 44270572098).
- PR #1 merged; `main` = `fe5dfd1`. Netlify project `doroboty-ai-ag` connected to the repository by the owner; production address <https://doroboty-ai-ag.netlify.app>.
- Served version confirmed: live `index.html` references `index-CuEki8NI.js` and `index-DSkUKZM3.css`, identical to a local build of `fe5dfd1`.
- HTTPS: HTTP/2 200, valid certificate, `strict-transport-security` set by Netlify.
- Post-publication check automated with a one-off Playwright script against the live address (not committed; kept in the ignored `artifacts/live-check/`), desktop 1280 px and 390 px, fresh browser context each run: home page, direct deep link `#/oferty/ai-product-manager`, Anna applies, Karolina moves the candidate to review and invites to an interview, the stage survives reload. No console errors, page errors, failed or 4xx/5xx requests, no requests outside the site origin, no horizontal overflow.
- Known limitation: the free Netlify plan injects `/.netlify/scripts/hud` and a fixed 202 × 64 px „Powered by Netlify” iframe in the bottom-right corner. It is same-origin, does not block the checked journey, but overlaps content in that corner while scrolling on phones.
- FEATURES.md reviewed: hosting does not change product behavior; no entry needed.
- Not verified: manual private-window journey by the owner on a real device; Netlify deploy history rollback was not exercised.

## Follow-up: post-deployment readiness audit and production alerts (2026-11-18)

The production-readiness report was refreshed for the deployed commit `fe5dfd1` (audit `7d04d3e7`, deployment stage). Preparation 14/14 again on `fe5dfd1`; deployment 2/5: HTTPS and the production journey pass; Netlify panel configuration and deploy logs need the owner; alerts failed because nothing checks production automatically and the free Netlify plan sends no deploy failure e-mail.

Decision (project owner): add a scheduled GitHub Actions check instead of an external uptime service.

- `scripts/check-production <url>` builds nothing itself; it compares the asset references of the local `dist/index.html` with the live `index.html`, loads each asset, and retries for about 10 minutes before failing (Netlify may still be deploying after a push).
- `.github/workflows/production-check.yml` runs it after each push to `main`, every 6 hours and on demand (`workflow_dispatch` with an address input, used to test the failure notification). Read-only permissions; the address is passed through an environment variable, not interpolated into the shell.
- docs/release.md: Netlify rollback corrected (publishing an earlier deploy does not lock auto publishing; lock it explicitly), monitoring and alert test described.
- Local evidence: the script passes against production with the `fe5dfd1` build, fails against a non-existent address and fails when the build references a different JS file.
- The scheduled run notifies only if the owner enables Actions e-mail notifications in GitHub; the alert is verified only after the owner receives the test e-mail.
- FEATURES.md reviewed: no product behavior change.
