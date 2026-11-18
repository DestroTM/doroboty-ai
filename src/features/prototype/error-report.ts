export const MAX_ERROR_MESSAGE = 300;
export const ISSUES_URL = "https://github.com/DestroTM/doroboty-ai/issues/new";
export const ISSUE_TEMPLATE = "zgloszenie-testera.yml";

/** Route path from a hash URL, without query or section parts (they can hold typed text). */
export function routePath(hash: string) {
  return hash.replace(/^#/, "").split(/[?#]/)[0] || "/";
}

/**
 * Builds the text a tester copies from the error screen. It deliberately omits
 * scenario data, form text and the URL query, so it can be sent without review
 * of private content. The tester sees the exact text before sending it.
 */
export function errorReport(error: unknown, hash: string, now: Date, userAgent: string) {
  const name = error instanceof Error ? error.name : "Error";
  const raw = error instanceof Error ? error.message : String(error);
  const message =
    raw.length > MAX_ERROR_MESSAGE ? `${raw.slice(0, MAX_ERROR_MESSAGE)}…` : raw || "(brak opisu)";
  return [
    "DoRoboty.ai — zgłoszenie błędu",
    `Czas: ${now.toISOString()}`,
    `Widok: #${routePath(hash)}`,
    `Błąd: ${name}: ${message}`,
    `Przeglądarka: ${userAgent}`,
  ].join("\n");
}

/**
 * Link to a new public GitHub issue using the tester template, prefilled with
 * the route path, browser and optional error report. Opening it is the tester's
 * own action; the application itself sends nothing.
 */
export function issueUrl({
  hash,
  userAgent,
  details,
}: {
  hash: string;
  userAgent: string;
  details?: string;
}) {
  const path = `#${routePath(hash)}`;
  const params = new URLSearchParams({
    template: ISSUE_TEMPLATE,
    title: details ? `[Błąd] Ekran błędu w widoku ${path}` : "[Zgłoszenie] ",
    widok: path,
    przegladarka: userAgent,
  });
  if (details) params.set("szczegoly", details);
  return `${ISSUES_URL}?${params}`;
}
