import { describe, expect, it } from "vitest";
import type { CaptureResult } from "posthog-js";
import { sanitizeEvent } from "./posthog";

const base = "https://doroboty-ai-ag.netlify.app/";
const event = (name: string, url: string, extra: Partial<CaptureResult> = {}): CaptureResult => ({
  uuid: "test",
  event: name,
  properties: { $current_url: url },
  ...extra,
});

describe("sanitizeEvent", () => {
  it("keeps clicks on public pages", () => {
    const click = event("$autocapture", `${base}#/oferty`);
    expect(sanitizeEvent(click)?.properties.$current_url).toBe(`${base}#/oferty`);
  });

  it.each(["#/app", "#/app/kandydaci/a1", "#/aplikuj/ai-product-manager", "#/auth/sign-in"])(
    "drops element events on private route %s",
    (route) => {
      for (const name of ["$autocapture", "$rageclick", "$dead_click", "$copy_autocapture"])
        expect(sanitizeEvent(event(name, `${base}${route}`))).toBeNull();
    },
  );

  it("keeps pageviews and product events on private routes", () => {
    expect(sanitizeEvent(event("$pageview", `${base}#/app/profil`))).not.toBeNull();
    expect(sanitizeEvent(event("application_submitted", `${base}#/aplikuj/x`))).not.toBeNull();
  });

  it("does not treat similar public routes as private", () => {
    expect(sanitizeEvent(event("$autocapture", `${base}#/application`))).not.toBeNull();
  });

  it("removes the free-text search phrase from every URL property", () => {
    const url = `${base}#/oferty?query=Jan%20Kowalski&location=Warszawa`;
    const result = sanitizeEvent(
      event("$pageview", url, { $set_once: { $initial_current_url: url } }),
    );
    const expected = `${base}#/oferty?query=[redacted]&location=Warszawa`;
    expect(result?.properties.$current_url).toBe(expected);
    expect(result?.$set_once?.$initial_current_url).toBe(expected);
  });

  it("passes through a null event", () => {
    expect(sanitizeEvent(null)).toBeNull();
  });
});
