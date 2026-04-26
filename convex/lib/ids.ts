// Short, human-friendly session codes. Format: "<2-4 letter prefix>-<4 char base32>"
// Example: "HR-4K2M", "PMK-9X3D"

const BASE32 = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"; // Crockford-style, no I/L/O/U

function randomBase32(length: number): string {
  // Reject-sampling on cryptographically random bytes — uniform across BASE32's 32 symbols.
  // 256 / 32 = 8, so any byte maps cleanly via bit-mask without modulo bias.
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let out = "";
  for (let i = 0; i < length; i++) {
    out += BASE32[bytes[i] & 0x1f];
  }
  return out;
}

function functionPrefix(functionName: string): string {
  // Strip non-alpha, take first 2-4 uppercase chars from word boundaries
  const words = functionName
    .toUpperCase()
    .split(/[^A-Z]+/)
    .filter(Boolean);

  if (words.length === 0) return "WS"; // fallback "Workshop"
  if (words.length === 1) return words[0].slice(0, Math.min(4, words[0].length));
  // Multi-word: take first letter of each word, max 4
  return words.slice(0, 4).map((w) => w[0]).join("");
}

export function generateSessionCode(functionName: string): string {
  return `${functionPrefix(functionName)}-${randomBase32(4)}`;
}

export function generateAdminKey(): string {
  // 128-bit cryptographic key, hex-encoded. Acts as the bearer token for admin URLs.
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let out = "";
  for (let i = 0; i < bytes.length; i++) {
    out += bytes[i].toString(16).padStart(2, "0");
  }
  return out;
}

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 32);
}
