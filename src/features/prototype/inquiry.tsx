import { useLayoutEffect, useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  inquiryStages,
  MAX_INQUIRY_QUESTIONS,
  MIN_INQUIRY_ANSWER_LENGTH,
  type Application,
  type InquiryQuestion,
} from "./model";
import { usePrototype } from "./store";
import { capture } from "@/lib/posthog";

const dateFormat = new Intl.DateTimeFormat("pl-PL", { dateStyle: "medium", timeStyle: "short" });
const terminalStages = ["hired", "rejected", "withdrawn"];
const prototypeNote =
  "Prototyp: pytania i komentarze są przygotowanymi wcześniej przykładami dla tej osoby. Nie pisze ich model AI.";

export type InquiryEditing = { id: string; text: string } | null;

/** Short list/status text; null when nothing waits for this audience. */
export function inquiryStatusLine(application: Application, audience: "candidate" | "employer") {
  const status = application.inquiry?.status;
  if (!status) return null;
  if (audience === "candidate")
    return status === "sent" && !terminalStages.includes(application.stage)
      ? "Pracodawca czeka na Twoje odpowiedzi"
      : null;
  if (status === "interview")
    return terminalStages.includes(application.stage) ? null : "Pytania przygotowane na rozmowę";
  if (!inquiryStages.includes(application.stage)) return null;
  return status === "draft"
    ? "Pytania czekają na wysłanie"
    : status === "sent"
      ? "Pytania wysłane · czekamy na odpowiedzi"
      : "Odpowiedzi czekają na Twoją decyzję";
}

/** Recorded question events for the process timeline. Never includes draft activity. */
export function inquiryTimeline(application: Application, audience: "candidate" | "employer") {
  const inquiry = application.inquiry;
  const employer = audience === "employer";
  return [
    inquiry?.sentAt && {
      title: employer ? "Wysłano pytania do kandydata" : "Pracodawca wysłał pytania",
      at: inquiry.sentAt,
    },
    inquiry?.answeredAt && {
      title: employer ? "Kandydat odpowiedział na pytania" : "Wysłano odpowiedzi",
      at: inquiry.answeredAt,
    },
  ].filter((item): item is { title: string; at: string } => Boolean(item));
}

function RecruiterComment({
  question,
  number,
  purpose,
}: {
  question: InquiryQuestion;
  number: number;
  purpose: boolean;
}) {
  return (
    <div className="inquiry-comment" role="note" aria-label={`Komentarz do pytania ${number}`}>
      <p className="inquiry-comment-label">Tylko dla Ciebie · nie trafi do wiadomości</p>
      {question.text !== question.proposed && (
        <p className="inquiry-stale">
          <strong>Komentarz dotyczy pierwotnego pytania.</strong> Treść pytania została zmieniona, a
          komentarz nie. Pierwotne pytanie: „{question.proposed}”
        </p>
      )}
      <dl>
        {purpose && (
          <div>
            <dt>Cel</dt>
            <dd>{question.purpose}</dd>
          </div>
        )}
        <div>
          <dt>Czego oczekiwać</dt>
          <dd>{question.expect}</dd>
        </div>
        <div className="inquiry-warning">
          <dt>Sygnał ostrzegawczy</dt>
          <dd>{question.warning}</dd>
        </div>
        <div>
          <dt>Co sprawdzić na rozmowie</dt>
          <dd>{question.verify}</dd>
        </div>
      </dl>
    </div>
  );
}

function Basis({ question }: { question: InquiryQuestion }) {
  return (
    <p className="inquiry-source">
      <strong>Skąd to pytanie: </strong>
      {question.basis ? (
        <>
          „{question.basis}” <span>· z CV</span>
        </>
      ) : (
        "nie opiera się na żadnym konkretnym zdaniu z CV."
      )}
    </p>
  );
}

export function EmployerInquiry({
  application,
  editing,
  onEditingChange,
  notes,
  onNotesChange,
  ownQuestion,
  onOwnQuestionChange,
}: {
  application: Application;
  editing: InquiryEditing;
  onEditingChange: (value: InquiryEditing) => void;
  /** Unsaved conversation notes by question id; saved values come from the application. */
  notes: Record<string, string>;
  onNotesChange: (value: Record<string, string>) => void;
  /** Unsaved text of a question the recruiter is adding. */
  ownQuestion: string;
  onOwnQuestionChange: (value: string) => void;
}) {
  const { run } = usePrototype();
  const [announcement, setAnnouncement] = useState("");
  const focusAfter = useRef<string | null>(null);
  const inquiry = application.inquiry;
  const open = inquiryStages.includes(application.stage);

  useLayoutEffect(() => {
    if (focusAfter.current) document.getElementById(focusAfter.current)?.focus();
    focusAfter.current = null;
  }, [editing?.id, inquiry?.status]);

  if (!inquiry)
    return open ? (
      <>
        <h3>Dopytaj przed zaproszeniem</h3>
        <p>
          Zanim zdecydujesz o rozmowie, zapytaj o własną pracę tej osoby. Dostaniesz 2–3 pytania i
          przy każdym komentarz tylko dla siebie: czego oczekiwać od odpowiedzi i na co uważać.
          Pytania możesz wysłać kandydatowi albo wziąć na rozmowę.
        </p>
        <div className="record-actions">
          <Button
            onClick={() => {
              focusAfter.current = "inquiry-heading";
              if (run({ type: "inquiry_prepare", applicationId: application.id }))
                capture("inquiry_prepared", { application_id: application.id });
            }}
          >
            Przygotuj pytania
          </Button>
        </div>
        <p className="record-caption inquiry-note">{prototypeNote}</p>
      </>
    ) : (
      <>
        <h3>Pytania przed zaproszeniem</h3>
        <p>Do tej aplikacji nie przygotowano pytań.</p>
      </>
    );

  const { status } = inquiry;
  const draft = status === "draft";
  const interview = status === "interview";
  const editable = draft && open;
  const questions = draft
    ? inquiry.questions
    : inquiry.questions.filter((x) => x.status === "approved");
  const kept = inquiry.questions.filter((x) => x.status === "approved").length;
  const terminal = terminalStages.includes(application.stage);
  const noteValue = (question: InquiryQuestion) => notes[question.id] ?? question.note;
  const unsavedNotes = questions.some((x) => noteValue(x) !== x.note);
  const set = (question: InquiryQuestion, next: InquiryQuestion["status"], text = question.text) =>
    run({
      type: "inquiry_question",
      applicationId: application.id,
      questionId: question.id,
      status: next,
      text,
    });

  return (
    <>
      <h3 id="inquiry-heading" tabIndex={-1}>
        {draft
          ? "Pytania do kandydata"
          : interview
            ? "Pytania na rozmowę"
            : status === "sent"
              ? "Pytania wysłane"
              : "Odpowiedzi kandydata"}
      </h3>
      <p className="record-caption">
        {draft
          ? editable
            ? "Popraw albo pomiń pytania, jeśli chcesz. Potem wyślij je kandydatowi albo weź na rozmowę."
            : "Te pytania nie zostały wysłane przed zmianą etapu."
          : interview
            ? "Kandydat nie dostał tych pytań. Zadaj je podczas rozmowy i zanotuj, co słyszysz."
            : status === "sent"
              ? `Wysłano ${dateFormat.format(new Date(inquiry.sentAt!))}. Czekamy na odpowiedzi.`
              : `Odpowiedzi z ${dateFormat.format(new Date(inquiry.answeredAt!))}.${
                  open
                    ? " Decyzję zapiszesz na dole karty: „Zaproś na rozmowę” albo „Odrzuć aplikację”."
                    : ""
                }`}
      </p>
      <ol className="inquiry-list">
        {questions.map((question, index) => {
          const number = index + 1;
          const isEditing = editing?.id === question.id;
          return (
            <li key={question.id} className="inquiry-question" data-status={question.status}>
              <p className="inquiry-meta">
                Pytanie {number} z {questions.length}
                {draft && question.status === "skipped" && <> · pominięte</>}
                {question.own && <> · Twoje pytanie</>}
                {question.text !== question.proposed && <> · zmienione przez Ciebie</>}
              </p>
              {isEditing ? (
                <>
                  <Textarea
                    id={`inquiry-text-${question.id}`}
                    aria-label={`Treść pytania ${number}`}
                    maxLength={2000}
                    rows={4}
                    value={editing.text}
                    onChange={(event) =>
                      onEditingChange({ id: question.id, text: event.target.value })
                    }
                  />
                  <div className="record-actions">
                    <Button
                      size="sm"
                      disabled={!editing.text.trim()}
                      onClick={() => {
                        if (set(question, question.status, editing.text)) {
                          focusAfter.current = `inquiry-edit-${question.id}`;
                          onEditingChange(null);
                        }
                      }}
                    >
                      Zapisz treść
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        focusAfter.current = `inquiry-edit-${question.id}`;
                        onEditingChange(null);
                      }}
                    >
                      Anuluj
                    </Button>
                  </div>
                </>
              ) : (
                <p className="inquiry-text">{question.text}</p>
              )}
              {status === "answered" && (
                <div className="inquiry-answer">
                  <h4>Odpowiedź</h4>
                  <p>{question.answer}</p>
                </div>
              )}
              {question.own ? (
                !draft && (
                  <p className="record-caption inquiry-own">
                    Twoje pytanie, bez przygotowanego komentarza.
                  </p>
                )
              ) : draft || status === "sent" ? (
                <details className="inquiry-basis">
                  <summary>
                    Komentarz tylko dla Ciebie
                    {question.text !== question.proposed && " · dotyczy pierwotnego pytania"}
                  </summary>
                  <RecruiterComment question={question} number={number} purpose />
                  <Basis question={question} />
                </details>
              ) : (
                <RecruiterComment
                  question={question}
                  number={number}
                  purpose={status !== "answered"}
                />
              )}
              {interview && (
                <label className="field inquiry-conversation-note">
                  <span>Notatka z rozmowy do pytania {number}</span>
                  <Textarea
                    rows={3}
                    maxLength={4000}
                    disabled={terminal}
                    value={noteValue(question)}
                    onChange={(event) =>
                      onNotesChange({ ...notes, [question.id]: event.target.value })
                    }
                  />
                </label>
              )}
              {editable && !isEditing && (
                <div className="record-actions">
                  <Button
                    id={`inquiry-edit-${question.id}`}
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      focusAfter.current = `inquiry-text-${question.id}`;
                      onEditingChange({ id: question.id, text: question.text });
                    }}
                  >
                    Zmień treść
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      if (!question.own)
                        return set(
                          question,
                          question.status === "skipped" ? "approved" : "skipped",
                        );
                      // The item disappears, so focus moves to the panel heading first.
                      document.getElementById("inquiry-heading")?.focus();
                      run({
                        type: "inquiry_remove",
                        applicationId: application.id,
                        questionId: question.id,
                      });
                    }}
                  >
                    {question.own ? "Usuń" : question.status === "skipped" ? "Przywróć" : "Pomiń"}
                  </Button>
                  {question.text !== question.proposed && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        // This button disappears once the wording is restored.
                        document.getElementById(`inquiry-edit-${question.id}`)?.focus();
                        set(question, question.status, question.proposed);
                      }}
                    >
                      Przywróć pierwotną treść
                    </Button>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ol>
      {editable &&
        (inquiry.questions.length < MAX_INQUIRY_QUESTIONS ? (
          <form
            className="inquiry-add"
            onSubmit={(event) => {
              event.preventDefault();
              if (run({ type: "inquiry_add", applicationId: application.id, text: ownQuestion })) {
                onOwnQuestionChange("");
                setAnnouncement("Dodano Twoje pytanie.");
              }
            }}
          >
            <label className="field">
              <span>Własne pytanie</span>
              <Textarea
                rows={2}
                maxLength={2000}
                value={ownQuestion}
                onChange={(event) => onOwnQuestionChange(event.target.value)}
                placeholder="O co jeszcze chcesz zapytać?"
              />
            </label>
            <p className="record-caption">
              Własne pytanie nie ma komentarza. Razem najwyżej {MAX_INQUIRY_QUESTIONS} pytań.
            </p>
            <div className="record-actions">
              <Button type="submit" size="sm" variant="outline" disabled={!ownQuestion.trim()}>
                Dodaj pytanie
              </Button>
            </div>
          </form>
        ) : (
          <p className="record-caption inquiry-add">
            Masz {MAX_INQUIRY_QUESTIONS} pytań. Więcej nie dodasz, żeby kandydat odpowiedział
            kilkoma zdaniami, a nie wypełniał ankietę.
          </p>
        ))}
      {editable && (
        <div className="inquiry-send">
          <p>
            Do wykorzystania {kept} z {inquiry.questions.length}
          </p>
          <div className="record-actions">
            <Button
              disabled={kept === 0 || editing !== null}
              onClick={() => {
                focusAfter.current = "inquiry-heading";
                if (run({ type: "inquiry_send", applicationId: application.id })) {
                  capture("inquiry_sent", {
                    application_id: application.id,
                    question_count: kept,
                  });
                  setAnnouncement("Pytania zostały wysłane.");
                }
              }}
            >
              Wyślij pytania kandydatowi
            </Button>
            <Button
              variant="outline"
              disabled={kept === 0 || editing !== null}
              onClick={() => {
                focusAfter.current = "inquiry-heading";
                if (run({ type: "inquiry_interview", applicationId: application.id, on: true }))
                  setAnnouncement("Pytania są przygotowane na rozmowę.");
              }}
            >
              Weź pytania na rozmowę
            </Button>
          </div>
        </div>
      )}
      {interview && !terminal && (
        <div className="inquiry-send">
          <p>{unsavedNotes ? "Masz niezapisane notatki" : "Notatki widzisz tylko Ty"}</p>
          <div className="record-actions">
            <Button
              disabled={!unsavedNotes}
              onClick={() => {
                if (run({ type: "inquiry_notes", applicationId: application.id, notes })) {
                  onNotesChange({});
                  setAnnouncement("Notatki zostały zapisane.");
                }
              }}
            >
              Zapisz notatki
            </Button>
            {open && (
              <Button
                variant="outline"
                onClick={() => {
                  focusAfter.current = "inquiry-heading";
                  run({ type: "inquiry_interview", applicationId: application.id, on: false });
                }}
              >
                Wróć do wyboru
              </Button>
            )}
          </div>
        </div>
      )}
      {(draft || interview) && <p className="record-caption inquiry-note">{prototypeNote}</p>}
      <p role="status" className="sr-only">
        {announcement}
      </p>
    </>
  );
}

/** Candidate projection: question texts and own answers only, never the recruiter comment. */
export function CandidateInquiry({
  application,
  companyName,
  answers,
  onAnswersChange,
}: {
  application: Application;
  companyName: string;
  answers: Record<string, string>;
  onAnswersChange: (value: Record<string, string>) => void;
}) {
  const { run } = usePrototype();
  const [attempted, setAttempted] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const headingRef = useRef<HTMLHeadingElement>(null);
  const focusHeading = useRef(false);
  const inquiry = application.inquiry!;
  const questions = inquiry.questions
    .filter((x) => x.status === "approved")
    .map(({ id, text, answer }) => ({ id, text, answer }));
  const answered = inquiry.status === "answered";
  const closed = !answered && terminalStages.includes(application.stage);
  const length = (id: string) => (answers[id] ?? "").trim().length;

  useLayoutEffect(() => {
    if (focusHeading.current) headingRef.current?.focus();
    focusHeading.current = false;
  }, [inquiry.status]);

  function submit(event: FormEvent) {
    event.preventDefault();
    setAttempted(true);
    const invalid = questions.find((x) => length(x.id) < MIN_INQUIRY_ANSWER_LENGTH);
    if (invalid) {
      document.getElementById(`inquiry-answer-${invalid.id}`)?.focus();
      return;
    }
    focusHeading.current = true;
    if (run({ type: "inquiry_answer", applicationId: application.id, answers })) {
      capture("inquiry_answers_submitted", {
        application_id: application.id,
        question_count: questions.length,
      });
      setAnnouncement("Odpowiedzi zostały wysłane.");
    }
  }

  if (answered || closed)
    return (
      <>
        <h3 ref={headingRef} tabIndex={-1}>
          {answered ? "Twoje odpowiedzi" : "Pytania od pracodawcy"}
        </h3>
        <p className="record-caption">
          {answered
            ? `Wysłano ${dateFormat.format(new Date(inquiry.answeredAt!))}. O zaproszeniu decyduje rekruter.`
            : "Na te pytania nie można już odpowiedzieć."}
        </p>
        <ol className="inquiry-list">
          {questions.map((question, index) => (
            <li key={question.id} className="inquiry-question">
              <p className="inquiry-meta">
                Pytanie {index + 1} z {questions.length}
              </p>
              <p className="inquiry-text">{question.text}</p>
              {answered && (
                <div className="inquiry-answer">
                  <h4>Twoja odpowiedź</h4>
                  <p>{question.answer}</p>
                </div>
              )}
            </li>
          ))}
        </ol>
        <p role="status" className="sr-only">
          {announcement}
        </p>
      </>
    );

  return (
    <form noValidate onSubmit={submit}>
      <h3 ref={headingRef} tabIndex={-1}>
        Pytania od pracodawcy
      </h3>
      <div className="inquiry-message">
        <p>
          Rekruter z {companyName} chce dopytać o Twoje doświadczenie, zanim zaprosi Cię na rozmowę
          o stanowisko {application.jobTitle}.
        </p>
        <p>
          Odpowiedz krótko, własnymi słowami – wystarczy kilka zdań przy każdym pytaniu. Nie
          potrzebujesz żadnych plików, linków ani certyfikatów.
        </p>
        <p>
          Możesz poprawić język z pomocą AI, ale opisz własną pracę – na rozmowie rekruter dopyta o
          szczegóły.
        </p>
        <p>
          Pytania przygotował portal z pomocą AI na prośbę rekrutera. O zaproszeniu decyduje
          rekruter.
        </p>
      </div>
      <ol className="inquiry-list">
        {questions.map((question, index) => {
          const invalid = attempted && length(question.id) < MIN_INQUIRY_ANSWER_LENGTH;
          return (
            <li key={question.id} className="inquiry-question">
              <p className="inquiry-meta">
                Pytanie {index + 1} z {questions.length}
              </p>
              <label className="inquiry-text" htmlFor={`inquiry-answer-${question.id}`}>
                {question.text}
              </label>
              <Textarea
                id={`inquiry-answer-${question.id}`}
                required
                rows={5}
                maxLength={4000}
                aria-invalid={invalid || undefined}
                aria-describedby={`inquiry-help-${question.id}`}
                value={answers[question.id] ?? ""}
                onChange={(event) =>
                  onAnswersChange({ ...answers, [question.id]: event.target.value })
                }
              />
              <p
                id={`inquiry-help-${question.id}`}
                role={invalid ? "alert" : undefined}
                className={invalid ? "error-message" : "record-caption"}
              >
                {invalid
                  ? `Odpowiedź jest za krótka. Wpisz co najmniej ${MIN_INQUIRY_ANSWER_LENGTH} znaków (obecnie: ${length(question.id)}).`
                  : `Minimum ${MIN_INQUIRY_ANSWER_LENGTH} znaków. Obecnie: ${length(question.id)}.`}
              </p>
            </li>
          );
        })}
      </ol>
      <div className="record-actions">
        <Button type="submit">Wyślij odpowiedzi</Button>
      </div>
      <p className="record-caption inquiry-note">
        Prototyp: w tej wersji pytania są przygotowanymi przykładami, a odpowiedzi zostają w tym
        przeglądarkowym scenariuszu.
      </p>
      <p role="status" className="sr-only">
        {announcement}
      </p>
    </form>
  );
}
