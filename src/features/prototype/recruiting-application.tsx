import { useLayoutEffect, useRef, useState } from "react";
import posthog from "posthog-js";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ApplicationRecord } from "./application-record";
import {
  EmployerInquiry,
  inquiryStatusLine,
  inquiryTimeline,
  type InquiryEditing,
} from "./inquiry";
import { inquiryStages, nextStages, stageLabels, type Application, type Stage } from "./model";
import { usePrototype } from "./store";

const posthogConfigured = Boolean(
  import.meta.env.VITE_PUBLIC_POSTHOG_PROJECT_TOKEN && import.meta.env.VITE_PUBLIC_POSTHOG_HOST,
);

/** Decision wording on buttons; the recorded stage names stay unchanged. */
const actionLabels: Partial<Record<Stage, string>> = {
  interview_invited: "Zaproś na rozmowę",
  rejected: "Odrzuć aplikację",
};

export function RecruitingApplication({ application }: { application: Application }) {
  const { state, run } = usePrototype();
  const [note, setNote] = useState("");
  const [announcement, setAnnouncement] = useState("");
  // Kept outside the tab panel so unsaved question edits and notes survive tab changes.
  const [editing, setEditing] = useState<InquiryEditing>(null);
  const [conversationNotes, setConversationNotes] = useState<Record<string, string>>({});
  const [ownQuestion, setOwnQuestion] = useState("");
  const open = inquiryStages.includes(application.stage);
  const [section, setSection] = useState(
    application.inquiry?.status === "answered" && open ? "questions" : "answer",
  );
  // Questions kept for the conversation stay reachable from the decision area after the invitation.
  const conversationGuide = application.inquiry?.status === "interview";
  // While the recruiter still chooses what to do with the questions, that choice is the one
  // primary action on the tab; the decision buttons stay available but secondary.
  const choosingPath = application.inquiry?.status === "draft" && open && section === "questions";
  // With per-question conversation notes on the tab, the sheet note is for the decision only.
  const noteLabel = conversationGuide ? "Notatka do decyzji" : "Notatka rekrutacyjna";
  const statusRef = useRef<HTMLSpanElement>(null);
  const pendingFocus = useRef<"status" | "questions" | null>(null);
  const company = state.companies.find((item) => item.id === application.companyId);
  const availableStages = nextStages[application.stage];
  // From a fresh application the invitation records the review step as well.
  const actions: Stage[] =
    application.stage === "submitted" ? ["interview_invited", ...availableStages] : availableStages;

  useLayoutEffect(() => {
    if (pendingFocus.current === "status") statusRef.current?.focus();
    if (pendingFocus.current === "questions") document.getElementById("inquiry-heading")?.focus();
    pendingFocus.current = null;
  }, [application.stage, section, application.inquiry?.status]);

  function decide(stage: Stage) {
    const steps: Stage[] = nextStages[application.stage].includes(stage)
      ? [stage]
      : ["reviewed", stage];
    for (const [index, step] of steps.entries())
      if (
        !run({
          type: "stage",
          applicationId: application.id,
          stage: step,
          note: index === steps.length - 1 ? note : "",
        })
      )
        return;
    if (posthogConfigured)
      posthog.capture("application_stage_changed", {
        application_id: application.id,
        stage,
      });
    setNote("");
    setAnnouncement(`Zapisano etap: ${stageLabels[stage]}.`);
    pendingFocus.current = "status";
  }

  return (
    <>
      <ApplicationRecord
        application={application}
        companyName={company?.name ?? ""}
        audience="employer"
        history={application.events}
        statusRef={statusRef}
        extraSections={[
          {
            value: "questions",
            label: "Pytania",
            content: (
              <EmployerInquiry
                application={application}
                editing={editing}
                onEditingChange={setEditing}
                notes={conversationNotes}
                onNotesChange={setConversationNotes}
                ownQuestion={ownQuestion}
                onOwnQuestionChange={setOwnQuestion}
              />
            ),
          },
        ]}
        section={section}
        onSectionChange={setSection}
        timelineExtras={inquiryTimeline(application, "employer")}
        footer={
          availableStages.length > 0 ? (
            <>
              {(open || conversationGuide) && section !== "questions" && (
                <div className="inquiry-entry">
                  <p>
                    {!open
                      ? application.stage === "interview_invited"
                        ? "Masz pytania na tę rozmowę."
                        : "Masz pytania i notatki z rozmowy."
                      : application.inquiry
                        ? (inquiryStatusLine(application, "employer") ?? "Pytania są przygotowane.")
                        : "Nie masz pewności, co ta osoba zrobiła sama?"}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (!application.inquiry) {
                        if (!run({ type: "inquiry_prepare", applicationId: application.id }))
                          return;
                        if (posthogConfigured)
                          posthog.capture("inquiry_prepared", { application_id: application.id });
                      }
                      pendingFocus.current = "questions";
                      setSection("questions");
                    }}
                  >
                    {application.inquiry ? "Pokaż pytania" : "Dopytaj przed zaproszeniem"}
                  </Button>
                </div>
              )}
              <p className="record-caption">Notatka zapisze się w historii po zmianie etapu.</p>
              <div className="record-actions">
                {actions.map((stage, index) => (
                  <Button
                    key={stage}
                    variant={
                      index === 0 && stage !== "rejected" && !choosingPath ? "default" : "outline"
                    }
                    onClick={() => decide(stage)}
                  >
                    {actionLabels[stage] ?? stageLabels[stage]}
                  </Button>
                ))}
              </div>
            </>
          ) : (
            <p className="record-caption">
              {stageLabels[application.stage]}. Brak kolejnych działań w tym procesie.
            </p>
          )
        }
      >
        {availableStages.length > 0 ? (
          <>
            <h3>
              <label htmlFor="recruiting-note">{noteLabel}</label>
            </h3>
            <p className="record-caption" id="recruiting-note-hint">
              Widoczna tylko pracodawcy w tym scenariuszu.
            </p>
            <Textarea
              id="recruiting-note"
              aria-label={`${noteLabel} (widoczna pracodawcy)`}
              aria-describedby="recruiting-note-hint"
              maxLength={12000}
              rows={4}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder={
                conversationGuide
                  ? "Co przesądza o Twojej decyzji?"
                  : "Co warto sprawdzić w rozmowie?"
              }
            />
          </>
        ) : null}
      </ApplicationRecord>
      <p role="status" className="sr-only">
        {announcement}
      </p>
    </>
  );
}
