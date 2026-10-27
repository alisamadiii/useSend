/**
 * Cookie used by the admin workspace switcher to remember which team (workspace)
 * is currently active. It is advisory only — the backend always re-validates that
 * the requesting user may access the selected team (membership OR isAdmin).
 */
export const ACTIVE_TEAM_COOKIE = "usend_active_team";

/**
 * Parse the active-team id from a raw cookie header string.
 * Works on both the server (`headers.get("cookie")`) and the client (`document.cookie`).
 * Returns a positive integer team id, or null when absent/invalid.
 */
export function parseActiveTeamCookie(
  cookieHeader?: string | null,
): number | null {
  if (!cookieHeader) return null;

  const entry = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${ACTIVE_TEAM_COOKIE}=`));

  if (!entry) return null;

  const raw = entry.slice(ACTIVE_TEAM_COOKIE.length + 1);
  const id = Number(decodeURIComponent(raw));
  return Number.isInteger(id) && id > 0 ? id : null;
}
