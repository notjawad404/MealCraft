/**
 * Minimal JWT helpers. The backend has no `GET /auth/me` yet, so the client
 * reads the token's own `exp` claim to decide whether a stored session is
 * still worth restoring. This is a convenience check only — the server still
 * verifies every token it receives.
 */

export function decodeToken(token) {
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(base64));
  } catch {
    return null;
  }
}

/** Milliseconds until the token expires, or `null` if it carries no `exp`. */
export function millisUntilExpiry(token) {
  const payload = decodeToken(token);
  if (!payload?.exp) return null;
  return payload.exp * 1000 - Date.now();
}

export function isTokenExpired(token) {
  const remaining = millisUntilExpiry(token);
  if (remaining === null) return false; // no exp claim — let the server decide
  return remaining <= 0;
}
