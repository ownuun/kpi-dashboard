import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  
  tracesSampleRate: process.env.NODE_ENV === "production" ? 1.0 : 0.1,
  
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  
  enabled: process.env.NODE_ENV === "production",
  environment: process.env.NODE_ENV,
  
  ignoreErrors: [
    "top.GLOBALS",
    "ResizeObserver loop limit exceeded",
    "ResizeObserver loop completed with undelivered notifications",
    "Network request failed",
    "Failed to fetch",
    "Load failed",
    "AbortError",
  ],
  
  // Security: mask PII before sending to Sentry
  beforeSend(event) {
    if (event.user?.email) {
      event.user.email = event.user.email.replace(/(.{2}).*(@.*)/, "$1***$2");
    }
    return event;
  },

  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],
});
