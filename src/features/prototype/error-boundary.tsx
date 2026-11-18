import { Component, useEffect, useRef, useState, type ReactNode } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { downloadText } from "./download";
import { errorReport, issueUrl } from "./error-report";
import { STORAGE_KEY } from "./storage";
import { captureException, posthogLogger } from "@/lib/posthog";

function readRawSave() {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

/**
 * Recovery screen for an unexpected render error (host composition of the C17
 * recovery anatomy: heading, reason, recovery actions). `standalone` renders
 * its own page frame when the failure happened outside the application shell.
 */
export function ErrorScreen({
  error,
  standalone = false,
}: {
  error: unknown;
  standalone?: boolean;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  const [report] = useState(() =>
    errorReport(error, window.location.hash, new Date(), navigator.userAgent),
  );
  const [issue] = useState(() =>
    issueUrl({ hash: window.location.hash, userAgent: navigator.userAgent, details: report }),
  );
  const [save] = useState(readRawSave);
  const [status, setStatus] = useState("");
  const [open, setOpen] = useState(false);
  useEffect(() => {
    // Run after the shell's route-change focus on <main>, which fires after child effects.
    const frame = requestAnimationFrame(() => heading.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(report);
      setStatus("Skopiowano szczegóły błędu.");
    } catch {
      setOpen(true);
      setStatus("Nie udało się skopiować automatycznie. Zaznacz i skopiuj tekst poniżej.");
    }
  }

  const section = (
    <section className="prototype-section app-error" aria-labelledby="app-error-title">
      <h1 id="app-error-title" ref={heading} tabIndex={-1}>
        Coś poszło nie tak
      </h1>
      <p>
        Ten widok nie wyświetlił się poprawnie. Dane zapisane w tej przeglądarce nie zostały
        usunięte.
      </p>
      <p>
        Zgłoś problem jako publiczne issue na GitHubie projektu (wymaga darmowego konta) — szczegóły
        błędu dodamy automatycznie. Nie dopisuj danych osobowych ani prywatnych treści.
      </p>
      <div className="app-error-actions">
        <Button onClick={() => window.location.reload()}>Odśwież stronę</Button>
        <a
          className={buttonVariants({ variant: "outline" })}
          href={issue}
          target="_blank"
          rel="noopener noreferrer"
        >
          Zgłoś problem na GitHubie
          <span className="sr-only"> (otwiera się w nowej karcie)</span>
        </a>
        <Button variant="outline" onClick={copy}>
          Skopiuj szczegóły błędu
        </Button>
        {save !== null && (
          <Button
            variant="outline"
            onClick={() => downloadText("doroboty-kopia-zapisu.json", save)}
          >
            Pobierz kopię danych
          </Button>
        )}
        <a
          className={buttonVariants({ variant: "outline" })}
          href="#/"
          onClick={(event) => {
            // In the shell a route change remounts the boundary; otherwise (standalone,
            // or the home page itself failed) only a reload can retry.
            const home = window.location.hash.split("?")[0];
            if (!standalone && home !== "#/" && home !== "") return;
            event.preventDefault();
            window.location.hash = "/";
            window.location.reload();
          }}
        >
          Wróć na stronę główną
        </a>
      </div>
      <p role="status" className="app-error-status">
        {status}
      </p>
      <details open={open} onToggle={(event) => setOpen(event.currentTarget.open)}>
        <summary>Co zawierają szczegóły?</summary>
        <pre>{report}</pre>
      </details>
    </section>
  );
  return standalone ? <main className="app-error-page">{section}</main> : section;
}

type BoundaryState = { failed: boolean; error: unknown };

/** Catches render errors below it. Remount it (e.g. with a route key) to retry. */
export class ErrorBoundary extends Component<
  { children: ReactNode; standalone?: boolean },
  BoundaryState
> {
  state: BoundaryState = { failed: false, error: null };
  static getDerivedStateFromError(error: unknown): BoundaryState {
    return { failed: true, error };
  }
  componentDidCatch(error: unknown) {
    posthogLogger.error("render_error_recovered", {
      boundary_scope: this.props.standalone ? "application" : "route",
    });
    captureException(error);
  }
  render() {
    return this.state.failed ? (
      <ErrorScreen error={this.state.error} standalone={this.props.standalone} />
    ) : (
      this.props.children
    );
  }
}
