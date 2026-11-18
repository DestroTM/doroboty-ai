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

## Results

Pending.
