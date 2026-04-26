// Constant-time string equality for bearer-key checks. Used for both adminKey
// (per-session) and OWNER_KEY (deployment-wide). Both keys are 128-bit so a
// remote timing attack is infeasible in practice; the helper exists so the
// codebase doesn't have a casual `===` comparing secrets at every call site.

export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}
