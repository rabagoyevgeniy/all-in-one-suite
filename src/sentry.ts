import * as Sentry from "@sentry/react";

const dsn = import.meta.env.VITE_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,

    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration(),
    ],

    tracesSampleRate: import.meta.env.DEV ? 1.0 : 0.2,

    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,

    environment: import.meta.env.MODE,
    enabled: import.meta.env.PROD,
  });
}

export default Sentry;
