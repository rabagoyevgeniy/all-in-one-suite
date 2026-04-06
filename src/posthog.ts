import posthog from "posthog-js";

posthog.init("phc_NA8yuj00wzGXqhafsxdnjgemdCHxa9FwYF2cjhbt7DZ", {
  api_host: "https://eu.i.posthog.com",
  capture_pageview: false,
  capture_pageleave: true,
  persistence: "localStorage+cookie",
});

console.log("[PostHog] initialized", posthog.get_distinct_id());

export default posthog;
