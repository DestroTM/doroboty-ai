import { describe, expect, it } from "vitest";
import { initialState, transition, stateSchema, type State } from "./model";
const time = "2026-11-03T10:00:00.000Z";
function as(state: State, id: string) {
  return transition(state, { type: "select_person", id });
}
function submitted() {
  const s = as(initialState(), "candidate-anna");
  return transition(
    s,
    {
      type: "submit",
      jobId: s.jobs[0].id,
      notes: "Original notes",
      generated: "Generated copy",
      answer: "Approved application with sufficient context.",
      consent: true,
    },
    time,
    "application-anna",
  );
}
describe("coherent browser scenario", () => {
  it("requires approval and prevents duplicate applications", () => {
    const s = as(initialState(), "candidate-anna");
    const input = {
      type: "submit" as const,
      jobId: s.jobs[0].id,
      notes: "",
      generated: "",
      answer: "Approved application with sufficient context.",
      consent: false,
    };
    expect(() => transition(s, input, time)).toThrow("Zatwierdź");
    expect(() => transition(submitted(), { ...input, consent: true }, time)).toThrow("już wysłana");
    expect(s.applications).toHaveLength(1);
  });
  it("preserves approved sources while profile and notes evolve", () => {
    const s = submitted();
    const app = s.applications.at(-1)!;
    const changed = transition(s, {
      type: "profile",
      value: {
        name: "Updated Name",
        headline: "Updated Headline",
        bio: "Changed",
        location: "Wrocław",
      },
    });
    expect(changed.applications.at(-1)).toEqual(app);
    expect(app.candidateName).toBe("Anna Kowalska");
    expect(app.sourceNotes).toBe("Original notes");
    expect(app.generatedAnswer).toBe("Generated copy");
  });
  it("supports employer review through conversation and continuation without skipping stages", () => {
    let s = as(submitted(), "employer-brightlabs");
    expect(() =>
      transition(
        s,
        { type: "stage", applicationId: "application-anna", stage: "continued", note: "" },
        time,
      ),
    ).toThrow();
    for (const stage of [
      "reviewed",
      "interview_invited",
      "first_conversation_held",
      "continued",
      "hired",
    ] as const)
      s = transition(
        s,
        { type: "stage", applicationId: "application-anna", stage, note: "Employer note" },
        time,
      );
    expect(s.applications.at(-1)?.stage).toBe("hired");
    expect(s.applications.at(-1)?.events).toHaveLength(6);
  });
  it("rejects another employer’s stage writes and another candidate’s withdrawal", () => {
    expect(() =>
      transition(
        as(submitted(), "employer-northstar"),
        { type: "stage", applicationId: "application-anna", stage: "reviewed", note: "" },
        time,
      ),
    ).toThrow();
    expect(() =>
      transition(
        as(submitted(), "candidate-marek"),
        { type: "withdraw", applicationId: "application-anna" },
        time,
      ),
    ).toThrow();
  });
  it("makes withdrawal terminal and keeps drafts and saved jobs person-specific", () => {
    let s = submitted();
    s = transition(s, { type: "withdraw", applicationId: "application-anna" }, time);
    expect(() =>
      transition(
        as(s, "employer-brightlabs"),
        { type: "stage", applicationId: "application-anna", stage: "reviewed", note: "" },
        time,
      ),
    ).toThrow();
    s = transition(s, {
      type: "draft",
      jobId: s.jobs[1].id,
      notes: "Notes",
      generated: "Output",
      answer: "Edited",
    });
    s = transition(s, { type: "toggle_saved", jobId: s.jobs[1].id });
    expect(s.drafts[0].candidateId).toBe("candidate-anna");
    expect(s.saved[0].candidateId).toBe("candidate-anna");
  });
  it("validates broken references, duplicate submissions and invalid histories on import", () => {
    const s = submitted();
    s.applications.push({ ...s.applications.at(-1)!, id: "another-id" });
    expect(stateSchema.safeParse(s).success).toBe(false);
    const broken = submitted();
    broken.applications.at(-1)!.events.push({ stage: "hired", at: time, note: "" });
    broken.applications.at(-1)!.stage = "hired";
    expect(stateSchema.safeParse(broken).success).toBe(false);
    const unknown = initialState();
    unknown.jobs[0].companyId = "missing";
    expect(stateSchema.safeParse(unknown).success).toBe(false);
  });
  it("only publishes own-company jobs and keeps submitted job snapshots unchanged", () => {
    const state = as(submitted(), "employer-brightlabs");
    const updated = { ...state.jobs[0], title: "Updated public role" };
    const result = transition(state, { type: "publish", job: updated });
    expect(result.jobs[0].title).toBe("Updated public role");
    expect(result.applications.at(-1)?.jobTitle).toBe("AI Product Manager");
    expect(() =>
      transition(as(state, "employer-northstar"), { type: "publish", job: updated }),
    ).toThrow();
    expect(() =>
      transition(state, { type: "publish", job: { ...updated, salaryMin: 500, salaryMax: 1 } }),
    ).toThrow();
  });
});
describe("pre-invitation questions", () => {
  const id = "application-anna";
  const answer = "Odpowiadałam za zakres asystenta i kryteria gotowości.";
  function prepared() {
    return transition(
      as(submitted(), "employer-brightlabs"),
      { type: "inquiry_prepare", applicationId: id },
      time,
    );
  }
  function edited() {
    let s = prepared();
    s = transition(s, {
      type: "inquiry_question",
      applicationId: id,
      questionId: "q1",
      status: "approved",
      text: "Zmienione pytanie o własną pracę?",
    });
    return transition(s, {
      type: "inquiry_question",
      applicationId: id,
      questionId: "q3",
      status: "skipped",
      text: s.applications.at(-1)!.inquiry!.questions[2].text,
    });
  }
  const sent = () => transition(edited(), { type: "inquiry_send", applicationId: id }, time);
  it("prepares scenario questions ready to use, with a basis found in the submitted CV", () => {
    const inquiry = prepared().applications.at(-1)!.inquiry!;
    expect(inquiry.status).toBe("draft");
    expect(inquiry.questions).toHaveLength(3);
    for (const question of inquiry.questions) {
      expect(question.status).toBe("approved");
      if (question.basis) expect(prepared().applications.at(-1)!.cv).toContain(question.basis);
    }
    expect(() => transition(prepared(), { type: "inquiry_prepare", applicationId: id })).toThrow(
      "już przygotowane",
    );
  });
  it("sends only kept questions and keeps the prepared wording", () => {
    let none = prepared();
    for (const question of none.applications.at(-1)!.inquiry!.questions)
      none = transition(none, {
        type: "inquiry_question",
        applicationId: id,
        questionId: question.id,
        status: "skipped",
        text: question.text,
      });
    expect(() => transition(none, { type: "inquiry_send", applicationId: id })).toThrow(
      "co najmniej jedno",
    );
    const inquiry = sent().applications.at(-1)!.inquiry!;
    expect(inquiry.status).toBe("sent");
    expect(inquiry.questions.map((x) => x.status)).toEqual(["approved", "approved", "skipped"]);
    expect(inquiry.questions[0].text).toBe("Zmienione pytanie o własną pracę?");
    expect(inquiry.questions[0].proposed).not.toBe(inquiry.questions[0].text);
    expect(() =>
      transition(sent(), {
        type: "inquiry_question",
        applicationId: id,
        questionId: "q3",
        status: "approved",
        text: "Późna zmiana?",
      }),
    ).toThrow("już wysłane");
  });
  it("accepts complete candidate answers once", () => {
    const candidate = as(sent(), "candidate-anna");
    expect(() =>
      transition(candidate, { type: "inquiry_answer", applicationId: id, answers: { q1: answer } }),
    ).toThrow("co najmniej");
    const done = transition(
      candidate,
      { type: "inquiry_answer", applicationId: id, answers: { q1: answer, q2: answer } },
      time,
    );
    const inquiry = done.applications.at(-1)!.inquiry!;
    expect(inquiry.status).toBe("answered");
    expect(inquiry.questions.map((x) => x.answer)).toEqual([answer, answer, ""]);
    expect(done.applications.at(-1)!.stage).toBe("submitted");
    expect(() =>
      transition(done, {
        type: "inquiry_answer",
        applicationId: id,
        answers: { q1: answer, q2: answer },
      }),
    ).toThrow("nie można już");
  });
  it("keeps questions for the conversation without sending them and stores recruiter notes", () => {
    let s = transition(edited(), { type: "inquiry_interview", applicationId: id, on: true });
    expect(s.applications.at(-1)!.inquiry!.status).toBe("interview");
    expect(s.applications.at(-1)!.inquiry!.sentAt).toBeUndefined();
    expect(() =>
      transition(as(s, "candidate-anna"), {
        type: "inquiry_answer",
        applicationId: id,
        answers: { q1: answer, q2: answer },
      }),
    ).toThrow("nie można już");
    expect(() => transition(s, { type: "inquiry_send", applicationId: id })).toThrow();
    const back = transition(s, { type: "inquiry_interview", applicationId: id, on: false });
    expect(back.applications.at(-1)!.inquiry!.status).toBe("draft");
    for (const stage of ["reviewed", "interview_invited"] as const)
      s = transition(s, { type: "stage", applicationId: id, stage, note: "" }, time);
    s = transition(s, {
      type: "inquiry_notes",
      applicationId: id,
      notes: { q1: "Opisała własną decyzję o zakresie." },
    });
    expect(s.applications.at(-1)!.inquiry!.questions[0].note).toBe(
      "Opisała własną decyzję o zakresie.",
    );
    expect(() =>
      transition(s, { type: "inquiry_interview", applicationId: id, on: false }),
    ).toThrow("przed zaproszeniem");
    expect(() =>
      transition(as(s, "employer-northstar"), {
        type: "inquiry_notes",
        applicationId: id,
        notes: { q1: "x" },
      }),
    ).toThrow("Nie znaleziono");
  });
  it("lets the recruiter add, edit and remove own questions up to the limit", () => {
    const add = (state: State, text: string) =>
      transition(state, { type: "inquiry_add", applicationId: id, text });
    let s = add(prepared(), "  Jak dzielisz pracę z zespołem danych?  ");
    const own = s.applications.at(-1)!.inquiry!.questions.at(-1)!;
    expect(own).toMatchObject({
      id: "own1",
      own: true,
      status: "approved",
      text: "Jak dzielisz pracę z zespołem danych?",
      expect: "",
    });
    expect(() => add(s, "   ")).toThrow("puste");
    s = transition(s, {
      type: "inquiry_question",
      applicationId: id,
      questionId: "own1",
      status: "approved",
      text: "Jak dzielisz pracę z analitykami?",
    });
    const edited = s.applications.at(-1)!.inquiry!.questions.at(-1)!;
    expect(edited.proposed).toBe(edited.text);
    s = add(s, "Drugie własne pytanie?");
    expect(() => add(s, "Szóste pytanie?")).toThrow("najwyżej 5");
    expect(() =>
      transition(s, { type: "inquiry_remove", applicationId: id, questionId: "q1" }),
    ).toThrow("tylko własne");
    s = transition(s, { type: "inquiry_remove", applicationId: id, questionId: "own1" });
    expect(s.applications.at(-1)!.inquiry!.questions.map((x) => x.id)).toEqual([
      "q1",
      "q2",
      "q3",
      "own2",
    ]);
    const done = transition(s, { type: "inquiry_send", applicationId: id }, time);
    expect(() => add(done, "Za późno?")).toThrow("już wysłane");
    expect(() =>
      transition(as(done, "candidate-anna"), {
        type: "inquiry_answer",
        applicationId: id,
        answers: { q1: answer, q2: answer, q3: answer },
      }),
    ).toThrow("co najmniej");
  });
  it("enforces company, candidate and stage boundaries", () => {
    expect(() =>
      transition(as(submitted(), "employer-northstar"), {
        type: "inquiry_prepare",
        applicationId: id,
      }),
    ).toThrow("Nie znaleziono");
    expect(() =>
      transition(as(sent(), "candidate-marek"), {
        type: "inquiry_answer",
        applicationId: id,
        answers: { q1: answer, q2: answer },
      }),
    ).toThrow("Nie znaleziono");
    let invited = as(submitted(), "employer-brightlabs");
    for (const stage of ["reviewed", "interview_invited"] as const)
      invited = transition(invited, { type: "stage", applicationId: id, stage, note: "" }, time);
    expect(() => transition(invited, { type: "inquiry_prepare", applicationId: id })).toThrow(
      "przed zaproszeniem",
    );
  });
  it("rejects imported questions that claim sending without a date and accepts saves without notes", () => {
    const broken = sent();
    delete broken.applications.at(-1)!.inquiry!.sentAt;
    expect(stateSchema.safeParse(broken).success).toBe(false);
    expect(stateSchema.safeParse(submitted()).success).toBe(true);
    const legacy = JSON.parse(JSON.stringify(sent()));
    for (const question of legacy.applications.at(-1).inquiry.questions) delete question.note;
    expect(stateSchema.parse(legacy).applications.at(-1)!.inquiry!.questions[0].note).toBe("");
  });
});
