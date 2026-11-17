# Release readiness before the first publication (Q4.1 Launch Inspector)

Slug: `release-readiness`
Created: 2026-11-17
Branch: `feature/i2-dopytaj-przed-zaproszeniem` (merged to `main` before publication; `main` is always the published branch)

## Goal

Remove what blocks the first static publication of the prototype found by the production-readiness audit in [docs/production-readiness.html](../production-readiness.html), then re-run the audit on the version that will be published.

## Context

The first audit (2026-11-17) found the main journey, build, secrets, input handling and dependencies in order, but:

- `./scripts/verify` failed on `format:check` because Prettier checked the generated readiness report and local, untracked agent configuration files (`.mcp.json`, `.claude/settings.local.json`).
- There was no written release, rollback, post-publication check or recovery procedure.
- An unexpected render error unmounted the whole React tree and left a blank page with no recovery or way to report details.
- Budget (0 zł, free static hosting plan) and the incident owner (the project owner) needed confirmation. Testers report problems through the channel given in their invitation; no personal contact goes into the public frontend.

## Decisions

- `main` is the only published branch. Hosting provider is chosen in Q4.2; the procedure is provider-independent until then.
- Error reporting stays without an external service (the browser journeys assert no external requests). The error screen shows a copyable, visible report the tester sends to the person who invited them.
- Error details contain only time, route path without query, error name/message (truncated) and browser user agent. No scenario data or free text from forms is included, and nothing is logged.

## Affected routes, families and shared consumers

- All routes: a route-level boundary inside `Shell` around `Outlet` (header/navigation stay usable, resets on navigation through the existing route key) and a root boundary around the provider/router for failures outside a page.
- Poster People families: C17 empty/recovery composition (heading, reason, recovery actions) as already adapted by `NotFound` (`prototype-section`, H1, primary button). C01 primary/outline buttons via `buttonVariants`/`Button`. Native `details` disclosure for the report preview, as used by the application offer preview. No new font, colour or card family.
- Host decision without a v1 reference: application error state (the kit lists asynchronous errors as open). Documented as a host composition, not a kit variant.

## Plan

- [x] Exclude the generated readiness report and local agent configs from Prettier
- [x] Error boundary + error screen (route and root), with copy, data backup download, reload and home recovery
- [x] Browser regression for the error screen (forced render error) and unit test for the report text
- [x] `docs/release.md`: release, rollback, post-publication check, incident owner and recovery plan
- [x] Local rollback trial: previous `main` build opened with a save produced by the new version
- [x] FEATURES.md
- [x] `./scripts/verify`, review pass, refreshed readiness audit

## Acceptance Criteria

- `./scripts/verify` passes locally with the readiness report and local agent config files present.
- A render error inside a page shows a Polish error screen within the normal shell; navigation away recovers. A render error outside a page shows a standalone error screen.
- The error screen offers reload, return to the home page, copy details (with a visible preview and a non-clipboard fallback) and, when a browser save exists, download of the raw save. Focus moves to the heading.
- No scenario data, form text or query string appears in the copied details; no external request is made.
- `docs/release.md` describes the exact steps to publish a known `main` commit, verify it, roll it back, and recover a tester's state, with the owner and contact rule.
- The refreshed readiness report has no open mandatory preparation requirement.

## Results (2026-11-17)

- `./scripts/verify` passes with the report and local configs present: formatting, kit check (67 files), lint, types, 37 unit tests, packet, build, 38 browser journeys (including the new error-screen journey).
- In-shell error screen: browser journey forces a render error on `#/oferty/ai-product-manager?q=…`; heading focused, header still visible, copied details contain route path and error only (no query, no persona name), preview equals clipboard text, axe has no violations in `.app-error`, no overflow at 1280/390/320 px, return home recovers, no external requests.
- Standalone error screen: checked manually with a temporary, reverted throw in `Shell` (separate build outside the repo): standalone page frame, heading focused, no header, return home reloads into a working app. Not a permanent regression test.
- Rollback trial: previous `main` (`81682a8`) built from a temporary worktree and served on the same origin after a save created by this branch with sent pre-invitation questions. Old version loaded without page errors, did not discard the save, kept the questions after its own write; returning to the new version showed the questions again.
- Review pass: return-home on a failing home page would not have retried; fixed to reload in that case.
- Clipboard fallback (manual copy when clipboard access is denied) is implemented but not covered by an automated test.

## Follow-up: in-app problem reporting (2026-11-18)

Decision by the project owner: testers report problems as public GitHub issues in the public repository; no other path for people without a GitHub account. GitHub Issues were disabled and were enabled with `gh repo edit --enable-issues` on the owner's request.

- „Zgłoś problem” in the public footer and the workspace menu opens a C18 information dialog (host `pp-dialog` heading/paper body, 580px, Base UI Dialog focus/Escape) explaining public issues, warning about personal data and linking to a prefilled Polish issue form (`.github/ISSUE_TEMPLATE/zgloszenie-testera.yml`).
- The error screen links to the same form with the error report prefilled; its text now points to GitHub instead of the inviting person.
- Prefilled fields: route path without query, browser, optional error report. The link is opened only by the tester; the app sends nothing.
- The template is used by GitHub only after it reaches the default branch (`main`).
- Evidence: unit tests for `issueUrl`; browser journey for footer and sidebar triggers (dialog name, warning, link target/rel, prefilled parameters without query text or persona names, axe, Escape and focus return, 390/320 px fit, no external requests) and the error-screen link.

## Follow-up: mobile load speed (2026-11-18)

Measured with Playwright on the local `dist/` preview: iPhone 13 emulation (390 px), 4× CPU throttling, cold cache, Lighthouse-like slow 4G (1.6 Mb/s, 150 ms RTT) and fast 4G (9 Mb/s, 40 ms). Text content (FCP/LCP) was 1.7–1.9 s on slow 4G, but the 1.5 MB, 1536 × 1024 kit illustration (rendered at most ~490 CSS px, 128–230 px on phones) finished after ~9.4 s on slow 4G.

- Added resized WebP variants (640 w, 44 kB; 1000 w, 82 kB) in `src/assets/illustrations/` with a regeneration README; the kit PNG stays byte-identical.
- `PeopleArt` serves them through `srcset`/`sizes` on the home intro, listing intro and offer employer section (the last is decorative and lazy). Rendered sizes are unchanged at 1440/1100/850/700/390/320 px.
- After: illustration ready after ~2.2–2.4 s on slow 4G and ~0.6 s on fast 4G; text still 1.7 s / 0.5–0.6 s; the home page transfers 0.36 MB instead of ~1.8 MB.
- Browser regression: on a 390 px viewport the home and listing illustrations load a `people-*.webp` under 100 kB and never the kit PNG.
- FEATURES.md reviewed: no product behavior change, no entry needed. HOST-COMPONENTS.md lists PeopleArt and ReportProblem as host owners.
- Not measured: a real hosted deployment (CDN, HTTP/2, real devices). Company logos (14 MB in `public/company-logos`) were not requested on the checked pages; their use was not investigated.
