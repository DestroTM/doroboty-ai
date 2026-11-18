# Release, rollback and recovery

How to publish the prototype as a static site, check it, roll it back and help a tester recover. The readiness evidence for the current version lives in [production-readiness.html](production-readiness.html).

## What is published

| Item           | Decision                                                                                                                                                                                                                                                                                                             |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Published code | Always a specific commit of `main`. Feature branches are merged to `main` (with green CI) before publication.                                                                                                                                                                                                        |
| Artifact       | The static `dist/` folder from `npm run build`. No server, database, environment variables or secrets.                                                                                                                                                                                                               |
| Hosting        | Any static host. The provider is chosen in Q4.2; add its exact publish/rollback steps below when chosen.                                                                                                                                                                                                             |
| Audience       | A few people testing the AIPH3 prototype; the link is shared directly. Synthetic data only.                                                                                                                                                                                                                          |
| Budget         | 0 zł — free hosting plan only. If the provider asks for payment or warns about limits, stop and decide before continuing.                                                                                                                                                                                            |
| Owner          | Adam Góralczyk (project owner) reacts to incidents and needs access to the GitHub repository and the hosting account.                                                                                                                                                                                                |
| Contact        | Testers report problems as public GitHub issues through „Zgłoś problem” in the app (footer, workspace menu, error screen), using [the tester template](../.github/ISSUE_TEMPLATE/zgloszenie-testera.yml). A free GitHub account is required; there is no other reporting path. Issues are enabled in the repository. |

## Publish a version

1. Merge the feature branch into `main` through a pull request after CI is green.
2. On a clean checkout: `git switch main && git pull`, then `git status` must show no local changes.
3. `npm ci` and `./scripts/verify`. Do not publish if it fails.
4. Note the version: `git rev-parse --short HEAD`.
5. `npm run build` and publish the `dist/` folder with the provider (steps added in Q4.2). Hash routes need no rewrite rules; `base: "./"` also allows a subpath.
6. Run the post-publication check below, then add a row to the release log.

## Post-publication check (about 5 minutes)

Use a private browser window, so no earlier local save affects the result.

1. The address opens over HTTPS without certificate warnings.
2. The home page loads, and the browser console shows no errors.
3. Open `#/oferty/ai-product-manager` directly by pasting the full address (deep link works without the server).
4. Choose Anna Kowalska → apply to the offer → send the application.
5. Switch to Karolina Wiśniewska → open the candidate → record a decision or send pre-invitation questions.
6. Reload the page: the application and decision are still there.
7. Repeat steps 2–3 on a phone or at a narrow window width.

**Roll back when** any step fails for every tester and cannot be fixed within about 30 minutes, or the published version is not the noted commit.

## Roll back

- **Later releases:** republish the previous release's `dist/` — with the provider's “promote/restore previous deployment” option, or by building the previous commit from the release log (`git switch --detach <commit> && npm ci && npm run build`) and publishing that `dist/`. Then run the post-publication check.
- **First publication:** there is no previous version. Unpublish or disable the site with the provider and tell testers in the channel.
- **Effect on tester data:** none on the server, because data lives only in each tester's browser. Trial on 2026-11-17: a save created by the I2 version (with sent pre-invitation questions) opened in the previous `main` build (`81682a8`) without errors; the save was not discarded, and the questions were still present after a change in the old version and after returning to the new version. Repeat this trial when the saved data format changes.

## Recovery plan

1. **Diagnose.** Read the tester's GitHub issue (route, browser and, from the error screen, time and error) and ask follow-up questions there. Reproduce in a private window on the published address, then locally with `npm run build && npm run preview` at the published commit.
2. **Decide.** If the published version is broken for everyone, roll back (above). If it affects one tester's data, help them recover it (step 3).
3. **Recover a tester's state.**
   - Working app: **Moje konto → Ustawienia** (`#/app/settings`) → **Eksportuj dane** keeps a copy; **Importuj dane** restores it; **Resetuj scenariusz** returns to the starting data.
   - Unreadable save: the app shows a notice and does not overwrite the save. Its **Ustawienia danych** link leads to settings: **Pobierz poprzedni zapis**, then import a valid file or reset.
   - Error screen: **Pobierz kopię danych** downloads the browser save before anything else is tried; **Odśwież stronę** or **Wróć na stronę główną** usually recovers.
4. **Communicate.** In the issue and the testers' channel say what happened, whether to reload, and whether any data needs to be imported again. Close the issue with the fix or rollback, and record the incident in docs/tasks/.

## Release log

| Date | Commit | Address | Post-publication check | Notes |
| ---- | ------ | ------- | ---------------------- | ----- |
