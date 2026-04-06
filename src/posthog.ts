import posthog from "posthog-js";

posthog.init(import.meta.env.VITE_POSTHOG_API_KEY, {
  api_host: import.meta.env.VITE_POSTHOG_HOST,
  capture_pageview: false,
  capture_pageleave: true,
  persistence: "localStorage+cookie",
});

export default posthog;
