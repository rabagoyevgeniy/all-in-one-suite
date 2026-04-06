import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: "https://488da2bb971c5f84af611f6137f5d5c6a04511037240705024.ingest.de.sentry.io/4511172741759856",

  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration(),
  ],

  // Performance monitoring: 100% in dev, reduce in production
  tracesSampleRate: import.meta.env.DEV ? 1.0 : 0.2,

  // Session Replay: capture 10% of sessions, 100% on error
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  environment: import.meta.env.MODE,
  enabled: import.meta.env.PROD,
});

export default Sentry;
