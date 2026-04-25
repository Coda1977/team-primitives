// Three functional-level intake questions for Team Primitives.
// Adapted from the original AI Playbook IntakeView (which had 7 role-focused questions).

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { C } from "../../config/constants";

const QUESTIONS = [
  {
    key: "strengths",
    label: (fn) => `What does ${fn} do well that AI could help you do 10x more of?`,
    helper: "Strengths AI could amplify. List things you're already good at.",
  },
  {
    key: "blockers",
    label: (fn) => `Where does ${fn} get stuck or slowed down that AI could help unblock?`,
    helper: "Bottlenecks, handoffs, waiting time, things that drain energy.",
  },
  {
    key: "oneWish",
    label: (fn) =>
      `If you could snap your fingers and have AI handle one thing in ${fn} tomorrow, what would it be?`,
    helper: "The one thing you'd offload first.",
  },
];

function wordCount(text) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function wordCountChip(count) {
  if (count === 0) return null;
  if (count <= 5) return { text: "Add a bit more", color: C.gray500 };
  if (count <= 15) return { text: "Good start", color: C.darkGray };
  return { text: "Great detail ✓", color: C.red };
}

export default function IntakeView({ session, participant, onSubmitted }) {
  const submitIntake = useMutation(api.intake.submitIntake);
  const [answers, setAnswers] = useState({
    strengths: "",
    blockers: "",
    oneWish: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const update = (key) => (e) =>
    setAnswers((a) => ({ ...a, [key]: e.target.value }));

  const allFilled = Object.values(answers).every((v) => v.trim().length > 0);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!allFilled) return;
    setSubmitting(true);
    setError(null);
    try {
      await submitIntake({
        participantId: participant._id,
        strengths: answers.strengths.trim(),
        blockers: answers.blockers.trim(),
        oneWish: answers.oneWish.trim(),
      });
      onSubmitted?.();
    } catch (err) {
      setError(err?.message ?? "Could not submit. Try again?");
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-white text-black px-6 py-8">
      <header
        className="max-w-3xl mx-auto mb-8 flex items-center justify-between text-xs text-neutral-500 border-b pb-3"
        style={{ borderColor: C.lightGray }}
      >
        <span>
          {session.functionName} · {participant.name}
        </span>
        <span aria-label="online" title="online">●</span>
      </header>

      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3">
          Tell us about {session.functionName}
        </h1>
        <p className="text-base text-neutral-700 mb-10">
          Three questions about your function — not your personal role. Answer however you'd describe it to a colleague. ~3 min.
        </p>

        <form onSubmit={onSubmit} className="space-y-8">
          {QUESTIONS.map((q) => {
            const count = wordCount(answers[q.key]);
            const chip = wordCountChip(count);
            return (
              <div key={q.key}>
                <label className="block">
                  <h3 className="text-base sm:text-lg font-bold leading-snug mb-1">
                    {q.label(session.functionName)}
                  </h3>
                  <p className="text-sm italic text-neutral-500 mb-3">{q.helper}</p>
                  <textarea
                    value={answers[q.key]}
                    onChange={update(q.key)}
                    rows={4}
                    className="w-full px-4 py-3 border text-base focus:outline-none focus:ring-2 leading-relaxed"
                    style={{ borderColor: C.lightGray }}
                    placeholder="Share your perspective…"
                  />
                </label>
                {chip && (
                  <p
                    aria-live="polite"
                    className="text-xs mt-2"
                    style={{ color: chip.color }}
                  >
                    {chip.text}
                  </p>
                )}
              </div>
            );
          })}

          {error && (
            <div
              className="text-sm px-4 py-3 border-l-4"
              style={{
                borderColor: C.red,
                background: C.redLight,
                color: C.darkGray,
              }}
            >
              {error}
            </div>
          )}

          <div
            className="sticky bottom-0 bg-white pt-4 pb-6 border-t -mx-6 px-6 sm:mx-0 sm:px-0"
            style={{ borderColor: C.lightGray }}
          >
            <button
              type="submit"
              disabled={submitting || !allFilled}
              className="w-full sm:w-auto px-6 py-3 text-sm font-semibold uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: allFilled ? C.red : C.gray300,
                color: C.white,
              }}
            >
              {!allFilled
                ? "Fill all 3 to continue"
                : submitting
                ? "Submitting…"
                : "Generate my AI canvas →"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
