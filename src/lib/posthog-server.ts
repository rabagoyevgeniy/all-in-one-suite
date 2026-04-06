import { PostHog } from "posthog-node";

const posthogServer = new PostHog(
  process.env.POSTHOG_API_KEY ?? "",
  { host: process.env.POSTHOG_HOST }
);

export default posthogServer;
