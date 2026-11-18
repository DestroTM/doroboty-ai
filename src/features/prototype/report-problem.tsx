import type { ReactElement, ReactNode } from "react";
import { ArrowUpRight } from "lucide-react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { issueUrl } from "./error-report";
import { posthogLogger } from "@/lib/posthog-logger";

/**
 * "Zgłoś problem": C18 information dialog explaining that reports go to a
 * public GitHub issue, then linking to a prefilled issue form.
 */
export function ReportProblem({
  trigger,
  children,
}: {
  trigger: ReactElement;
  children: ReactNode;
}) {
  return (
    <Dialog>
      <DialogTrigger render={trigger}>{children}</DialogTrigger>
      <DialogContent className="pp-dialog report-dialog" showCloseButton={false}>
        <div className="pp-dialog-heading">
          <DialogTitle>Zgłoś problem</DialogTitle>
          <DialogClose render={<Button variant="outline" size="icon-sm" aria-label="Zamknij" />}>
            ×
          </DialogClose>
        </div>
        <div className="report-dialog-body">
          <DialogDescription>
            Zgłoszenia zbieramy jako publiczne issue w repozytorium projektu na GitHubie. Potrzebne
            jest darmowe konto GitHub.
          </DialogDescription>
          <p className="report-dialog-warning">
            <strong>Zgłoszenie jest publiczne.</strong> Nie wpisuj danych osobowych, treści
            prawdziwego CV, haseł ani prywatnych wiadomości.
          </p>
          <div>
            <p>W zgłoszeniu opisz:</p>
            <ul>
              <li>co chcesz zrobić,</li>
              <li>czego się spodziewasz,</li>
              <li>co widzisz zamiast tego.</li>
            </ul>
            <p>Widok aplikacji i przeglądarka uzupełnią się automatycznie.</p>
          </div>
          <div className="report-dialog-actions">
            <a
              className={buttonVariants()}
              href={issueUrl({ hash: window.location.hash, userAgent: navigator.userAgent })}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => {
                posthogLogger.info("problem_report_opened", { source: "report_dialog" });
              }}
            >
              Otwórz zgłoszenie na GitHubie
              <ArrowUpRight aria-hidden="true" />
              <span className="sr-only">(otwiera się w nowej karcie)</span>
            </a>
            <DialogClose render={<Button variant="outline" />}>Zamknij</DialogClose>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
