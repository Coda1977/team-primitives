// Thin wrapper around Convex HTTP client for the simulation harness.
//
// Reads VITE_CONVEX_URL from .env.local (set automatically by `npx convex dev`)
// or falls back to CONVEX_URL env var.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../convex/_generated/api.js";

function loadEnvLocal() {
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const envPath = resolve(__dirname, "..", "..", ".env.local");
  try {
    const content = readFileSync(envPath, "utf8");
    const env = {};
    for (const line of content.split(/\r?\n/)) {
      const m = line.match(/^([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/);
      if (!m) continue;
      let val = m[2].trim();
      // Strip optional surrounding quotes
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      // Strip inline comments after a # (only if preceded by whitespace)
      val = val.replace(/\s+#.*$/, "");
      env[m[1]] = val;
    }
    return env;
  } catch {
    return {};
  }
}

export function getEnv() {
  const fileEnv = loadEnvLocal();
  return { ...fileEnv, ...process.env };
}

// Hydrate process.env from .env.local at module load time. Other libs
// (Anthropic SDK, ConvexHttpClient) read directly from process.env.
{
  const fileEnv = loadEnvLocal();
  for (const [k, v] of Object.entries(fileEnv)) {
    if (process.env[k] === undefined) process.env[k] = v;
  }
}

export function createClient() {
  const env = getEnv();
  const url = env.VITE_CONVEX_URL || env.CONVEX_URL;
  if (!url) {
    throw new Error(
      "VITE_CONVEX_URL not found. Run `npx convex dev` to set it in .env.local."
    );
  }
  return new ConvexHttpClient(url);
}

export { api };
