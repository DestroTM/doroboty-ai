import posthog, { type CaptureResult, type Properties } from "posthog-js";

const token: string | undefined = import.meta.env.VITE_PUBLIC_POSTHOG_PROJECT_TOKEN;
const host: string | undefined = import.meta.env.VITE_PUBLIC_POSTHOG_HOST;

/**
 * True when the build has a PostHog project. Production builds read the public
 * project values from .env.production; `npm run dev` has no analytics unless a
 * developer adds .env.local (see .env.example).
 */
export const posthogConfigured = Boolean(token && host);

/**
 * Hash routes where people see or type persona data: workspaces, the
 * application form and the person picker. Element-based events are dropped
 * there; pageviews and the explicit product events stay.
 */
const privateRoute = /#\/(app|aplikuj|auth)(?:[/?]|$)/;
const elementEvents = new Set(["$autocapture", "$rageclick", "$dead_click", "$copy_autocapture"]);
/** Free-text search phrase in public listing URLs. */
const searchPhrase = /([?&]query=)[^&#]*/g;

function redact(properties: Properties | undefined) {
  if (!properties) return properties;
  return Object.fromEntries(
    Object.entries(properties).map(([key, value]) => [
      key,
      typeof value === "string" ? value.replace(searchPhrase, "$1[redacted]") : value,
    ]),
  );
}

/** Drops element events on private routes and removes search phrases from URLs. */
export function sanitizeEvent(event: CaptureResult | null): CaptureResult | null {
  if (!event) return null;
  const url = event.properties?.$current_url;
  if (elementEvents.has(event.event) && typeof url === "string" && privateRoute.test(url))
    return null;
  return {
    ...event,
    properties: redact(event.properties) ?? {},
    $set: redact(event.$set),
    $set_once: redact(event.$set_once),
  };
}

export function initPosthog() {
  if (!posthogConfigured) {
    if (import.meta.env.DEV)
      console.info("PostHog is off: set VITE_PUBLIC_POSTHOG_* in .env.local to test analytics.");
    return;
  }
  posthog.init(token!, {
    api_host: host,
    defaults: "2026-08-30",
    autocapture: true,
    // Hash routes carry the screen; keep the hash in URLs and count route changes.
    disable_capture_url_hashes: false,
    capture_pageview: { path: true, search: true, hash: true },
    capture_dead_clicks: false,
    // Recordings would show persona data on private routes; keep them off.
    disable_session_recording: true,
    before_send: sanitizeEvent,
    logs: { serviceName: "doroboty-ai-case-web", environment: import.meta.env.MODE },
    capture_exceptions: {
      capture_unhandled_errors: true,
      capture_unhandled_rejections: true,
      capture_console_errors: false,
    },
  });
}

function guarded(send: () => void) {
  if (!posthogConfigured) return;
  try {
    send();
  } catch {
    // Analytics must never interfere with the prototype.
  }
}

/** Product event with operational metadata only (IDs, counts, flags), never free text. */
export function capture(event: string, properties?: Properties) {
  guarded(() => posthog.capture(event, properties));
}

export function captureException(error: unknown) {
  guarded(() => posthog.captureException(error));
}

/** Links events to the synthetic persona by ID and role; no names. */
export function identifyPerson(id: string, role: string) {
  guarded(() => posthog.identify(id, { role }));
}

export function resetIdentity() {
  guarded(() => posthog.reset());
}

type LogAttributes = Record<string, boolean | number | string>;

/** Purpose-written records for PostHog Logs; never forwards console output. */
export const posthogLogger = {
  error(message: string, attributes: LogAttributes) {
    guarded(() => posthog.logger.error(message, attributes));
  },
  info(message: string, attributes: LogAttributes) {
    guarded(() => posthog.logger.info(message, attributes));
  },
};
