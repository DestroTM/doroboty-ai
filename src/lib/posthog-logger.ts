import posthog from "posthog-js";

type LogAttributes = Record<string, boolean | number | string>;

function isPostHogConfigured() {
  return Boolean(
    import.meta.env.VITE_PUBLIC_POSTHOG_PROJECT_TOKEN && import.meta.env.VITE_PUBLIC_POSTHOG_HOST,
  );
}

/** Sends only purpose-written application records to PostHog Logs. */
export const posthogLogger = {
  error(message: string, attributes: LogAttributes) {
    if (!isPostHogConfigured()) return;

    try {
      posthog.logger.error(message, attributes);
    } catch {
      // Logging must not interfere with error recovery.
    }
  },
  info(message: string, attributes: LogAttributes) {
    if (!isPostHogConfigured()) return;

    try {
      posthog.logger.info(message, attributes);
    } catch {
      // Logging must not interfere with app actions.
    }
  },
};
