import { Context } from "hono";
import { timingSafeEqual } from "crypto";
import { env } from "~/env";
import { UnsendApiError } from "~/server/public-api/api-error";

/**
 * Guards the workspace-provisioning endpoints with an instance-level admin secret.
 *
 * These endpoints create teams and therefore cannot use the normal team-scoped bearer
 * token (no team exists yet). Instead the caller (client-hub) presents the shared
 * `USESEND_ADMIN_API_KEY` as a bearer token.
 *
 * - When the secret is not configured, respond 404 so the feature's existence isn't leaked.
 * - Compare in constant time to avoid timing side-channels.
 */
export function requireAdminApiKey(c: Context) {
  const configured = env.USESEND_ADMIN_API_KEY;
  if (!configured) {
    throw new UnsendApiError({ code: "NOT_FOUND", message: "Not found" });
  }

  const header = c.req.header("Authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";

  if (!token || !safeEqual(token, configured)) {
    throw new UnsendApiError({
      code: "UNAUTHORIZED",
      message: "Invalid admin token",
    });
  }
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}
