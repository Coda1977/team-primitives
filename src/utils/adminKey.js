// Admin-key helpers. Mirrors the owner-key pattern: the key lives in the URL
// fragment (`#k=...`) so it never appears in Referer headers, server access
// logs, or browser history. The fragment is read once on first render and then
// stripped from the address bar so screenshots don't expose it.

// Module-scoped cache: in React 19 strict mode useEffect runs twice; the
// second run would see an already-stripped hash and incorrectly redirect.
// Cache the parsed key by pathname so repeat invocations are stable.
const KEY_CACHE = new Map();

export function readCachedAdminKey(pathname) {
  return KEY_CACHE.get(pathname) ?? null;
}

export function hasCachedAdminKey(pathname) {
  return KEY_CACHE.has(pathname);
}

// Reads `#k=...` from the current URL, stores it in the cache, and strips
// the fragment from the address bar. Returns the parsed key or null.
export function consumeAdminKeyFromHash(pathname) {
  const cached = KEY_CACHE.get(pathname);
  if (cached) return cached;

  const hash = window.location.hash;
  const match = hash.match(/k=([^&]+)/);
  if (!match) return null;

  const key = decodeURIComponent(match[1]);
  KEY_CACHE.set(pathname, key);
  window.history.replaceState(null, "", window.location.pathname);
  return key;
}

export function buildAdminUrl(origin, code, adminKey) {
  return `${origin}/s/${code}/admin#k=${adminKey}`;
}

export function buildPresentUrl(origin, code, adminKey) {
  return `${origin}/s/${code}/present#k=${adminKey}`;
}
