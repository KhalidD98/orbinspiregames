import { RateLimiter, HOUR } from "@convex-dev/rate-limiter";
import { components } from "../_generated/api";

export const rateLimiter = new RateLimiter(components.rateLimiter, {
  // Password change: 3 attempts per user per hour
  changePassword: { kind: "token bucket", rate: 3, period: HOUR },
});
