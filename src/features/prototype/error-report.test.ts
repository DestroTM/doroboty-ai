import { describe, expect, it } from "vitest";
import { errorReport, issueUrl, ISSUE_TEMPLATE, MAX_ERROR_MESSAGE } from "./error-report";

const now = new Date("2026-11-17T22:00:00.000Z");

describe("errorReport", () => {
  it("keeps the route path and drops query and section parts", () => {
    const report = errorReport(
      new TypeError("boom"),
      "#/oferty?q=moje+prywatne+wyszukiwanie#employer",
      now,
      "UA",
    );
    expect(report).toContain("Widok: #/oferty");
    expect(report).not.toContain("prywatne");
    expect(report).not.toContain("employer");
    expect(report).toContain("Błąd: TypeError: boom");
    expect(report).toContain("Czas: 2026-11-17T22:00:00.000Z");
    expect(report).toContain("Przeglądarka: UA");
  });

  it("falls back to the home route and handles non-Error values", () => {
    expect(errorReport("x", "", now, "UA")).toContain("Widok: #/");
    expect(errorReport("x", "", now, "UA")).toContain("Błąd: Error: x");
    expect(errorReport(new Error(""), "#/", now, "UA")).toContain("(brak opisu)");
  });

  it("truncates long messages", () => {
    const report = errorReport(new Error("a".repeat(MAX_ERROR_MESSAGE + 50)), "#/", now, "UA");
    expect(report).toContain(`${"a".repeat(MAX_ERROR_MESSAGE)}…`);
    expect(report).not.toContain("a".repeat(MAX_ERROR_MESSAGE + 1));
  });
});

describe("issueUrl", () => {
  it("opens the tester template with route and browser, without query text", () => {
    const url = new URL(issueUrl({ hash: "#/oferty?q=prywatne#employer", userAgent: "UA" }));
    expect(url.origin + url.pathname).toBe("https://github.com/DestroTM/doroboty-ai/issues/new");
    expect(url.searchParams.get("template")).toBe(ISSUE_TEMPLATE);
    expect(url.searchParams.get("title")).toBe("[Zgłoszenie] ");
    expect(url.searchParams.get("widok")).toBe("#/oferty");
    expect(url.searchParams.get("przegladarka")).toBe("UA");
    expect(url.searchParams.has("szczegoly")).toBe(false);
    expect(url.href).not.toContain("prywatne");
  });

  it("adds error details and an error title when given", () => {
    const details = errorReport(new Error("boom"), "#/app", now, "UA");
    const url = new URL(issueUrl({ hash: "#/app", userAgent: "UA", details }));
    expect(url.searchParams.get("title")).toBe("[Błąd] Ekran błędu w widoku #/app");
    expect(url.searchParams.get("szczegoly")).toBe(details);
  });
});
