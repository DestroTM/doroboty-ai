# Release, rollback and recovery

How to publish the prototype as a static site, check it, roll it back and help a tester recover. The readiness evidence for the current version lives in [production-readiness.html](production-readiness.html).

## What is published

| Item           | Decision                                                                                                                                                                                                                                                                                                             |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Published code | Always a specific commit of `main`. Feature branches are merged to `main` (with green CI) before publication.                                                                                                                                                                                                        |
| Artifact       | The static `dist/` folder from `npm run build`. No server, database, environment variables or secrets.                                                                                                                                                                                                               |
| Hosting        | Netlify, free plan, project `doroboty-ai-ag` at <https://doroboty-ai-ag.netlify.app>. Connected to GitHub `DestroTM/doroboty-ai`, production branch `main`; build settings in `netlify.toml`. Netlify injects a „Powered by Netlify” badge (fixed, bottom right) on the free plan.                                   |
| Audience       | A few people testing the AIPH3 prototype; the link is shared directly. Synthetic data only.                                                                                                                                                                                                                          |
| Budget         | 0 zł — free hosting plan only. If the provider asks for payment or warns about limits, stop and decide before continuing.                                                                                                                                                                                            |
| Owner          | Adam Góralczyk (project owner) reacts to incidents and needs access to the GitHub repository and the hosting account.                                                                                                                                                                                                |
| Contact        | Testers report problems as public GitHub issues through „Zgłoś problem” in the app (footer, workspace menu, error screen), using [the tester template](../.github/ISSUE_TEMPLATE/zgloszenie-testera.yml). A free GitHub account is required; there is no other reporting path. Issues are enabled in the repository. |

## Publish a version

1. Merge the feature branch into `main` through a pull request after CI is green.
2. On a clean checkout: `git switch main && git pull`, then `git status` must show no local changes.
3. `npm ci` and `./scripts/verify`. Do not publish if it fails.
4. Note the version: `git rev-parse --short HEAD`.
5. Netlify builds and publishes automatically after the push to `main` (`npm run build`, `dist/`, Node.js from `.nvmrc`). In the Netlify project, **Deploys** must show the new deploy as **Published** for the noted commit. To confirm the served version, compare the `assets/index-*.js` name in the live `index.html` with a local `npm run build` of the same commit. Hash routes need no rewrite rules.
6. The **Production check** workflow (`.github/workflows/production-check.yml`) runs after the push to `main` and confirms that the site serves the build of `main` (it waits up to about 10 minutes for Netlify).
7. Run the post-publication check below, then add a row to the release log.

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

- **Later releases:** in Netlify open **Deploys**, choose the previous successful production deploy and **Publish deploy**. This is instant and does not rebuild. The next push to `main` overwrites it, so also select **Lock to stop auto publishing** in **Deploys** until the fix is merged, then **Unlock to start auto publishing**. Then run the post-publication check. The scheduled production check will fail while the rolled-back version differs from `main`; that is expected until the fix is published.
- **First publication:** there is no previous version. Take the site down by deleting the Netlify project (**Project configuration → General → Danger zone**; check the current Netlify UI before acting, a deleted project name may not be reusable), and tell testers in the channel.
- **Effect on tester data:** none on the server, because data lives only in each tester's browser. Trial on 2026-11-17: a save created by the I2 version (with sent pre-invitation questions) opened in the previous `main` build (`81682a8`) without errors; the save was not discarded, and the questions were still present after a change in the old version and after returning to the new version. Repeat this trial when the saved data format changes.

## Production monitoring and alerts

Netlify's free plan sends no e-mail when a deploy fails (deploy e-mail notifications are a Pro feature). Instead, the **Production check** GitHub Actions workflow runs `scripts/check-production` after every push to `main`, every 6 hours and on demand. It builds `main`, then fails when the production address does not answer with HTTP 2xx or does not serve the same JS/CSS files, for example after a failed Netlify build.

- **Who is notified:** GitHub notifies the person who triggered a failed run; for scheduled runs, the workflow's author (GitHub's documentation also names the last person who changed the cron line). The owner must enable **Notification settings → System → Actions → Email** (optionally **Only notify for failed workflows**).
- **Test the alert:** **Actions → Production check → Run workflow** with a wrong address, e.g. `https://doroboty-ai-ag-test.netlify.app`. The run fails after about 10 minutes and the owner should receive the e-mail. Then run it again with the default address; it must pass.
- **Limits:** a run proves the site responds and serves `main`; it does not click through the journey (use the post-publication check). GitHub disables scheduled workflows in public repositories after 60 days without repository activity; re-enable it in **Actions**.
- **Tester reports:** new issues from „Zgłoś problem” reach the owner through GitHub notifications for the watched repository.

## Recovery plan

1. **Diagnose.** Read the tester's GitHub issue (route, browser and, from the error screen, time and error) and ask follow-up questions there. Reproduce in a private window on the published address, then locally with `npm run build && npm run preview` at the published commit.
2. **Decide.** If the published version is broken for everyone, roll back (above). If it affects one tester's data, help them recover it (step 3).
3. **Recover a tester's state.**
   - Working app: **Moje konto → Ustawienia** (`#/app/settings`) → **Eksportuj dane** keeps a copy; **Importuj dane** restores it; **Resetuj scenariusz** returns to the starting data.
   - Unreadable save: the app shows a notice and does not overwrite the save. Its **Ustawienia danych** link leads to settings: **Pobierz poprzedni zapis**, then import a valid file or reset.
   - Error screen: **Pobierz kopię danych** downloads the browser save before anything else is tried; **Odśwież stronę** or **Wróć na stronę główną** usually recovers.
4. **Communicate.** In the issue and the testers' channel say what happened, whether to reload, and whether any data needs to be imported again. Close the issue with the fix or rollback, and record the incident in docs/tasks/.

## Release log

| Date       | Commit    | Address                              | Post-publication check                                                                                  | Notes                                                                                            |
| ---------- | --------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| 2026-11-18 | `fe5dfd1` | <https://doroboty-ai-ag.netlify.app> | Passed (automated, desktop 1280 px and mobile 390 px); manual private-window check by the owner pending | First publication: I2 pre-invitation questions and Q4.1 readiness. CI green on PR #1 and `main`. |
