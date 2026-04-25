// Persona-driven LLM wrapper. Generates intake answers + voting choices in
// the voice of a given function role.
//
// One Anthropic call per intake (cheap — ~800 tokens). Voting is heuristic
// (random selection within budget) to keep cost down; can be upgraded to
// LLM-driven preference scoring later.

import Anthropic from "@anthropic-ai/sdk";

const MODEL = "claude-sonnet-4-5-20250929";

export class PersonaDriver {
  constructor({ apiKey } = {}) {
    const key = apiKey ?? process.env.ANTHROPIC_API_KEY;
    if (!key) {
      throw new Error(
        "ANTHROPIC_API_KEY not set. The simulator needs it to drive personas."
      );
    }
    this.client = new Anthropic({ apiKey: key });
    this.usage = { inputTokens: 0, outputTokens: 0, calls: 0 };
  }

  async generateIntake({ functionName, industry, teamSize, persona }) {
    const prompt = `You are roleplaying ${persona.name}, a ${persona.subRole} at a ${functionName} team in a ${industry} company (team of ${teamSize}). Voice/perspective: ${persona.voice}

Answer 3 intake questions about the FUNCTION (not your personal role) for an AI brainstorming workshop. Stay in character — give answers ${persona.name} would actually give based on their sub-role.

1. What does ${functionName} do well that AI could help you do 10x more of?
2. Where does ${functionName} get stuck or slowed down that AI could help unblock?
3. If you could snap your fingers and have AI handle one thing in ${functionName} tomorrow, what would it be?

Each answer: 1–3 sentences, concrete and specific to ${functionName} (not generic). Reference real ${functionName} workflows.

Respond ONLY in this exact JSON format (no markdown fences):
{"strengths": "...", "blockers": "...", "oneWish": "..."}`;

    const response = await this.client.messages.create({
      model: MODEL,
      max_tokens: 800,
      messages: [{ role: "user", content: prompt }],
    });
    this._tallyUsage(response);

    const text = response.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("");

    const m = text.match(/\{[\s\S]*\}/);
    if (!m) throw new Error(`Persona-LLM did not return JSON for ${persona.name}`);
    const parsed = JSON.parse(m[0]);
    if (!parsed.strengths || !parsed.blockers || !parsed.oneWish) {
      throw new Error(
        `Persona-LLM returned incomplete intake for ${persona.name}: ${JSON.stringify(parsed)}`
      );
    }
    return {
      strengths: parsed.strengths,
      blockers: parsed.blockers,
      oneWish: parsed.oneWish,
    };
  }

  _tallyUsage(response) {
    this.usage.calls += 1;
    if (response?.usage) {
      this.usage.inputTokens += response.usage.input_tokens ?? 0;
      this.usage.outputTokens += response.usage.output_tokens ?? 0;
    }
  }

  // Cost in USD assuming Sonnet 4.5 pricing: $3/M input, $15/M output.
  // Update if pricing changes.
  estimatedCostUsd() {
    return (
      (this.usage.inputTokens / 1_000_000) * 3 +
      (this.usage.outputTokens / 1_000_000) * 15
    );
  }
}

// Pick K random items from arr (without replacement).
export function pickRandom(arr, k) {
  const copy = arr.slice();
  const out = [];
  while (out.length < k && copy.length > 0) {
    const idx = Math.floor(Math.random() * copy.length);
    out.push(copy.splice(idx, 1)[0]);
  }
  return out;
}
