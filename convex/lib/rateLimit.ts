// Token-bucket-style sliding-window rate limiter backed by a small Convex
// table. Each key counts mutations within a window; on overflow the call
// throws. The window resets atomically when the next request arrives after
// `windowMs` has elapsed.
//
// Convex serializes mutations per document, so the read-then-patch sequence
// here doesn't race with concurrent calls hitting the same key.

import { MutationCtx } from "../_generated/server";

export async function checkRateLimit(
  ctx: MutationCtx,
  key: string,
  max: number,
  windowMs: number
): Promise<void> {
  const row = await ctx.db
    .query("rateLimits")
    .withIndex("by_key", (q) => q.eq("key", key))
    .unique();
  const now = Date.now();

  if (!row) {
    await ctx.db.insert("rateLimits", { key, count: 1, windowStart: now });
    return;
  }

  if (now - row.windowStart > windowMs) {
    await ctx.db.patch(row._id, { count: 1, windowStart: now });
    return;
  }

  if (row.count >= max) {
    throw new Error("Rate limit exceeded — try again in a minute");
  }

  await ctx.db.patch(row._id, { count: row.count + 1 });
}
