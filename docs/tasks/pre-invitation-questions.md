# Pre-invitation questions (I2 „Dopytaj przed zaproszeniem”)

Slug: `pre-invitation-questions`
Created: 2026-11-16
Branch: `feature/i2-dopytaj-przed-zaproszeniem`

## Goal

Let an employer ask a candidate two or three questions about their own work before deciding on an invitation, read the answers next to a recruiter-only comment, and then record the existing recruiting decision.

## Context

Participant discovery (AIPH3 Supersprint, decision of 2026-11-12) selected the need „before inviting, the recruiter wants to know what the candidate did personally, but does not know what to ask or how to judge the answer”. The chosen idea is I2: prepared questions with a recruiter-only comment (purpose, what to expect, warning sign, what to verify in the conversation). The recruiter edits and approves each question before sending.

This task builds the interface path only. Question and comment texts are **prepared scenario content per persona**, not model output. Everything else (edit, approve, skip, send, candidate answers, decision, persistence) uses real local operations.

## Affected routes, families and shared consumers

- `/#/app/kandydaci/:id` (employer record): new „Pytania” tab in the shared RecordSheet, new timeline entries.
- `/#/app/aplikacje/:id` (candidate record): „Pytania” tab appears once questions are sent.
- `/#/app/kandydaci`, `/#/app/aplikacje` (lists): one status line while questions are pending or answered.
- Shared consumers changed: `ApplicationRecord` (optional extra sections, default section, timeline extras), `RecordSheet` (optional `defaultSection`). Callers without questions render as before.
- Poster People families reused: record sheet (host extension, RECORDS.md), Button variants, Textarea, Field, record caption/actions. No new font, color or card family. Questions are separated by rules inside the single sheet; the recruiter-only comment is a paper-fill margin note (r10, no second contour).

Host decisions without a v1 reference (documented composition, not a kit variant): question block anatomy, recruiter-only comment block, native disclosure for „Skąd to pytanie?”.

## Plan

- [x] Review relevant code/docs
- [x] Domain: optional `inquiry` on an application, four operations, role and stage guards
- [x] Prepared scenario content for both candidate personas plus a generic fallback
- [x] Employer tab: prepare, edit, approve, skip, send, read answers
- [x] Candidate tab: answer form and read-only copy
- [x] List status lines and timeline entries
- [x] Unit tests and one browser journey
- [x] FEATURES.md
- [x] Run verification

## Acceptance Criteria

- [x] Employer opens a submitted application, prepares questions, changes one text, skips one, approves the rest and sends them. Sending is unavailable with zero approved questions.
- [x] Candidate sees only question texts and the explanatory message, never the recruiter comment, answers every sent question (minimum 20 characters each) and submits once.
- [x] Employer sees each answer next to the comment and records the existing stage decision. State survives reload.
- [x] Version-1 saves and imports without questions remain valid; another company cannot read or change the questions.
- [x] Existing Answer/CV tabs, note retention, stage actions and withdrawal behave as before.
- [x] Desktop 1280px and mobile 390/320px: no horizontal overflow, complete wrapping of long questions.
- [ ] `./scripts/verify` passes — **not on this machine as a single command**, see Handoff Notes

## Files / Areas

- `src/features/prototype/model.ts`, `model.test.ts`
- `src/features/prototype/inquiry-scenarios.ts`, `inquiry.tsx`
- `src/features/prototype/application-record.tsx`, `recruiting-application.tsx`, `candidate-application.tsx`, `workspace.tsx`
- `src/components/record-sheet.tsx`, `src/app/inquiry.css`, `src/app/globals.css`, `docs/design-system/RECORDS.md`
- `tests/e2e/prototype.spec.ts`, `FEATURES.md`

## Risks

- Prepared texts can be mistaken for model output. Mitigation: visible caption on the employer tab and the register entry marked Simulated.
- The recruiter comment is stored in the shared browser scenario; hiding it in the candidate view is presentation, not confidentiality (same boundary as employer notes).
- A basis quote is shown only when it occurs literally in the submitted CV snapshot, so imported custom CVs get the explicit „no basis” sentence.

## Not built

- Real model generation and any check of question quality.
- Recruiter-written decision message to the candidate, „what to verify” lines copied into the pre-interview note, reminders for unanswered questions.

## Handoff Notes

Executed on 2026-11-16, Node 24.14.0, macOS, branch `feature/i2-dopytaj-przed-zaproszeniem` (uncommitted working tree).

- `npm run design-system:check`, `npm run lint`, `npm run typecheck`, `npm run verify:packet`, `npm run build`: passed.
- `npm test`: 5 files, 32 tests passed (5 new for questions).
- Browser journeys: 35 passed, including the new end-to-end questions journey (employer draft → send → candidate validation and answers → employer answers → existing stage decision → reload → other company blocked), Axe scans of the record in three states and overflow checks at 390/320px.
- **Deviation:** the Playwright version in this repository expects Chromium build 1243, which is not provisioned here. Nothing was installed. The journeys ran through a temporary config outside the repository that points at the already cached headless Chromium build 1200. The repository `playwright.config.ts` is unchanged, so `npm run test:e2e` and `./scripts/verify` still fail on this machine until the matching browser is provisioned.
- `npm run format:check` reports only two untracked local files (`.claude/settings.local.json`, `.mcp.json`); every tracked and new file passes Prettier.
- Visual evidence (ignored `artifacts/`): `inquiry-employer-draft.png`, `inquiry-employer-draft-mobile.png`, `inquiry-candidate-form.png`, `inquiry-employer-answers.png`, `inquiry-employer-answers-mobile.png`. Reviewed by the implementing agent against the record-sheet recipe; no paired comparison with a kit reference exists because the kit has no such screen. No human design acceptance and no test with a real person yet.
- Review pass found and fixed one defect: repeated `aside` landmarks with identical names (now a named `role="note"` per question).
- FEATURES.md: added CAN-19, EMP-11 (Simulated), EMP-12.

## Revision 2 (2026-11-16, after participant review)

Requested changes: make the feature reachable at the decision point, remove per-question approval, make the decision wording explicit, and add a way to take the questions to the conversation instead of sending them.

- Entry: „Dopytaj przed zaproszeniem” block above the decision buttons on every tab except „Pytania”; it prepares questions and switches to the tab (RecordSheet/ApplicationRecord gained optional controlled `section`/`onSectionChange`).
- Questions start as kept; actions are „Zmień treść” and „Pomiń”/„Przywróć”. The recruiter-only comment and the basis are collapsed in draft and sent states, expanded when reading answers and in the conversation guide.
- Decision buttons: „Zaproś na rozmowę”, „Odrzuć aplikację”. From `submitted` the invitation records `reviewed` and `interview_invited` in one click. Stage names and transitions in the model are unchanged. Two existing journeys were updated for the new button names (EMP-09 Changed).
- New status `interview` with operations `inquiry_interview` (on/off before the invitation) and `inquiry_notes`; question field `note` defaults to an empty string so earlier saves stay valid. The candidate never gets a „Pytania” tab in this mode.
- List status is a noninteractive light-pink pill (same values as `.record-stage`).

Evidence, same environment and the same browser deviation as above: lint, types, design-system check, packet and build passed; `npm test` 33 passed; browser journeys 36 passed (two for questions: send path with one-click invitation, conversation path with notes, undo, reload and candidate exclusion; Axe scans in four states; 390/320px overflow). New captures: `inquiry-employer-entry.png`, `inquiry-employer-conversation.png`. Still no human design acceptance and no test with a real person.

## Revision 3 (2026-11-16)

After the invitation the entry beside the decision buttons stays visible when questions were kept for the conversation: „Masz pytania na tę rozmowę.” at the invitation stage and „Masz pytania i notatki z rozmowy.” at later non-terminal stages, with „Pokaż pytania” opening the tab and focusing its heading. The conversation journey covers both texts. Evidence: see the latest run recorded in the handoff of this session (same browser deviation).

## Revision 4 (2026-11-16)

- While the questions wait for the send/conversation choice (draft, before the invitation, „Pytania” tab open), the decision buttons render as secondary so the tab has one primary action. They stay enabled; on other tabs and after the choice the first decision is primary again.
- When questions are kept for the conversation, the sheet note is labelled „Notatka do decyzji” with the placeholder „Co przesądza o Twojej decyzji?”, to separate it from the per-question conversation notes. Its behavior (saved into history on a stage change) is unchanged.

## Revision 5 (2026-11-17)

Participant finding: after the recruiter changes a question, the prepared comment no longer matches it. The prototype cannot rewrite the comment (prepared content, no model), so it is marked instead: the disclosure label adds „dotyczy pierwotnego pytania”, the comment shows „Komentarz dotyczy pierwotnego pytania” with the prepared wording, in the draft, sent, answered and conversation states. „Przywróć pierwotną treść” restores the prepared wording and moves focus to „Zmień treść”. A real product would regenerate the comment after an edit; that is not built and not simulated.

## Revision 6 (2026-11-17)

Participant request: the recruiter can add own questions. New operations `inquiry_add` and `inquiry_remove` (draft, before the invitation, own company); question field `own` defaults to false so earlier saves stay valid. Total limit is five questions (`MAX_INQUIRY_QUESTIONS`), explained in the interface. An own question has no prepared comment or basis, is labelled „Twoje pytanie”, can be edited without a „changed” mark and removed instead of skipped. The candidate sees it like any other question. Unsaved text of a question being added lives in the employer controller and survives tab changes.

Evidence, same environment and browser deviation: lint, types, build passed; `npm test` 34 passed; browser journeys 37 passed (new journey: add, edit, limit, remove with focus on the heading, send, candidate answers four questions, employer reads the answer without a comment; Axe scan and 320px overflow).
