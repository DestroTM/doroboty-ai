import { test, expect, type Page } from "@playwright/test";
import { gunzipSync } from "node:zlib";

/**
 * Checks what the production build sends to PostHog. Requests never leave the
 * test: the stubbed remote config enables autocapture and event batches are
 * decoded locally. PostHog drops headless browsers as bots, so the test
 * presents a desktop Chrome user agent.
 */
test.use({
  userAgent:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36",
});

type SentEvent = { event: string; url: string; text: string; raw: string };

async function recordAnalytics(page: Page) {
  const sent: SentEvent[] = [];
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => false });
    Object.defineProperty(navigator, "userAgentData", { get: () => undefined });
  });
  await page.route(/^https:\/\/[^/]*\.posthog\.com\//, async (route) => {
    const request = route.request();
    const url = request.url();
    if (url.includes("config.js")) return route.abort();
    if (url.includes("/config")) return route.fulfill({ json: { autocapture_opt_out: false } });
    if (url.includes(".js")) return route.fulfill({ contentType: "text/javascript", body: "" });
    const body = request.postDataBuffer();
    if (body && /\/(e|i\/v0\/e)\//.test(url)) {
      let text: string;
      try {
        text = gunzipSync(body).toString();
      } catch {
        text = body.toString();
      }
      const payload = JSON.parse(text);
      for (const e of Array.isArray(payload) ? payload : (payload.batch ?? [payload]))
        sent.push({
          event: e.event,
          url: String(e.properties?.$current_url ?? ""),
          text: String(e.properties?.$el_text ?? ""),
          raw: JSON.stringify(e),
        });
    }
    return route.fulfill({ json: { status: 1 } });
  });
  return sent;
}

test("analytics records public clicks and skips persona data", async ({ page }) => {
  const sent = await recordAnalytics(page);
  await page.goto("/#/oferty?query=AI%20Product");
  await page.getByRole("link", { name: "Zobacz rolę", exact: true }).first().click();
  await page.goto("/#/auth/sign-in");
  await page.getByRole("button", { name: "Wejdź jako Anna Kowalska", exact: true }).click();
  await page.goto("/#/app/profil");
  await page.getByRole("button", { name: "Zapisz profil", exact: true }).click();
  await page.goto("/#/");

  await expect
    .poll(() => sent.some((e) => e.event === "profile_saved"), { timeout: 10_000 })
    .toBe(true);
  const clicks = sent.filter((e) => e.event === "$autocapture");
  expect(clicks.map((e) => e.text)).toContain("Zobacz rolę");
  expect(clicks.every((e) => !/#\/(app|aplikuj|auth)/.test(e.url))).toBe(true);
  expect(sent.filter((e) => e.event === "$pageview").map((e) => new URL(e.url).hash)).toEqual(
    expect.arrayContaining(["#/oferty?query=[redacted]", "#/auth/sign-in", "#/app/profil"]),
  );
  expect(sent.find((e) => e.event === "$identify")?.raw).toContain('"role":"candidate"');
  for (const e of sent) expect(e.raw).not.toMatch(/Anna|Kowalsk|query=AI/);
});
