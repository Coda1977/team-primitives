// localStorage helpers for the owner key.
//
// Convenience layer on top of the URL-fragment auth model: once a key has
// been validated against the server (i.e., `listAllSessions` returned non-null),
// we cache it in localStorage so the next visit to `/` from this browser can
// auto-redirect into `/owner` without the user retyping the bookmark.
//
// localStorage is per-browser-profile. Clearing site data, switching browsers,
// or using a private window all bypass this — that's by design. The bookmark
// at `/owner#k=...` and the JSON backup at `/owner/restore` remain the
// source-of-truth recovery paths.

const KEY = "teamprimitives:ownerKey";

export function setOwnerKey(key) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY, key);
  } catch {
    // Storage unavailable (private mode quota, etc.) — silently ignore.
  }
}

export function getOwnerKey() {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function clearOwnerKey() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}
