// Per-field length caps for user-supplied strings. Enforced at every mutation
// boundary that accepts free text. The caps exist primarily as cost-amplifier
// defenses: ungated text gets persisted, then later concatenated into Anthropic
// prompts where token spend scales with input size.

export const LIMITS = {
  name: 80,
  intakeField: 1000,
  idea: 500,
  chatTurn: 2000,
  functionName: 80,
  industry: 120,
} as const;

export function enforceMaxLength(
  field: string,
  value: string,
  max: number
): void {
  if (value.length > max) {
    throw new Error(`${field} exceeds ${max} characters`);
  }
}
