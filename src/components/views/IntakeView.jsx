// Three functional-level intake questions for Team Primitives.
// Editorial broadcast layout — kicker rule, big function-name title, numbered
// questions with generous vertical rhythm.

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { C } from "../../config/constants";

const FADE_KEYFRAMES = `
  @keyframes intakeReveal {
    0% { opacity: 0; transform: translateY(16px); }
    100% { opacity: 1; transform: translateY(0); }
  }
`;

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
    <main className="min-h-screen bg-white text-black">
      <style>{FADE_KEYFRAMES}</style>

      {/* Sticky header with persistent identity */}
      <header
        className="sticky top-0 z-30 backdrop-blur-md border-b"
        style={{
          background: "rgba(255,255,255,0.92)",
          borderColor: C.lightGray,
        }}
      >
        <div className="max-w-3xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3 text-xs">
            <span
              className="inline-block w-1 h-4"
              style={{ background: C.red }}
            />
            <span
              className="uppercase tracking-[0.28em] font-bold"
              style={{ color: C.darkGray }}
            >
              {session.functionName}
            </span>
            <span style={{ color: C.lightGray }}>·</span>
            <span style={{ color: C.darkGray }}>{participant.name}</span>
          </div>
          <span
            className="inline-block w-1.5 h-1.5 rounded-full"
            style={{ background: C.electricBlue }}
            aria-label="online"
            title="online"
          />
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-6 pt-16 pb-32">
        {/* Editorial title block */}
        <div
          className="mb-16"
          style={{
            opacity: 0,
            animation: `intakeReveal 600ms ease-out 0ms forwards`,
          }}
        >
          <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-neutral-500 mb-5">
            Intake · ~3 min
          </p>
          <h1
            className="font-bold leading-[1] tracking-tight mb-6"
            style={{
              fontSize: "clamp(2.5rem, 5vw, 4rem)",
              letterSpacing: "-0.025em",
            }}
          >
            Tell us about{" "}
            <span style={{ color: C.red }}>{session.functionName}</span>
          </h1>
          <p
            className="leading-relaxed max-w-xl"
            style={{
              fontSize: "clamp(1rem, 1.2vw, 1.15rem)",
              color: C.darkGray,
            }}
          >
            Three questions about your <strong>function</strong> — not your
            personal role. Answer however you'd describe it to a colleague.
          </p>
        </div>

        {/* Hairline rule */}
        <hr
          className="mb-12 border-0 h-px"
          style={{
            background: C.lightGray,
            opacity: 0,
            animation: `intakeReveal 600ms ease-out 100ms forwards`,
          }}
        />

        <form onSubmit={onSubmit}>
          {QUESTIONS.map((q, idx) => {
            const count = wordCount(answers[q.key]);
            const chip = wordCountChip(count);
            return (
              <section
                key={q.key}
                className="mb-16 last:mb-0"
                style={{
                  opacity: 0,
                  animation: `intakeReveal 600ms ease-out ${
                    200 + idx * 120
                  }ms forwards`,
                }}
              >
                <div className="flex items-baseline gap-5 mb-5">
                  <span
                    className="font-bold tabular-nums leading-none"
                    style={{
                      fontSize: "2.25rem",
                      color: C.lightGray,
                      letterSpacing: "-0.04em",
                    }}
                  >
                    {String(idx + 1).padStart(2, "0")}
                  </span>
                  <label className="block flex-1">
                    <h2
                      className="font-bold leading-tight"
                      style={{
                        fontSize: "clamp(1.125rem, 1.6vw, 1.4rem)",
                        letterSpacing: "-0.01em",
                      }}
                    >
                      {q.label(session.functionName)}
                    </h2>
                  </label>
                </div>

                <p
                  className="text-sm italic mb-4 ml-[3.75rem]"
                  style={{ color: C.gray500 }}
                >
                  {q.helper}
                </p>

                <textarea
                  value={answers[q.key]}
                  onChange={update(q.key)}
                  rows={4}
                  className="w-full ml-[3.75rem] px-5 py-4 text-base leading-relaxed bg-white border focus:outline-none transition-colors"
                  style={{
                    width: "calc(100% - 3.75rem)",
                    borderColor: count > 0 ? C.darkGray : C.lightGray,
                  }}
                  placeholder="Share your perspective…"
                />

                <div className="ml-[3.75rem] mt-2 h-4 flex items-center">
                  {chip && (
                    <p
                      aria-live="polite"
                      className="text-[11px] font-bold uppercase tracking-[0.18em]"
                      style={{ color: chip.color }}
                    >
                      {chip.text}
                    </p>
                  )}
                </div>
              </section>
            );
          })}

          {error && (
            <div
              role="alert"
              className="text-sm px-4 py-3 border-l-4 mt-8 ml-[3.75rem]"
              style={{
                borderColor: C.red,
                background: C.redLight,
                color: C.darkGray,
              }}
            >
              {error}
            </div>
          )}
        </form>
      </div>

      {/* Sticky bottom gate bar */}
      <div
        className="fixed bottom-0 left-0 right-0 border-t backdrop-blur-md"
        style={{
          background: "rgba(255,255,255,0.95)",
          borderColor: C.lightGray,
        }}
      >
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <p
            className="text-xs uppercase tracking-[0.2em] font-semibold"
            style={{ color: allFilled ? C.darkGray : C.gray500 }}
          >
            {allFilled
              ? "Ready when you are"
              : `${
                  3 -
                  Object.values(answers).filter((v) => v.trim().length > 0).length
                } left to fill`}
          </p>
          <button
            onClick={onSubmit}
            disabled={submitting || !allFilled}
            className="px-6 py-3 text-xs font-semibold uppercase tracking-[0.18em] disabled:opacity-50 disabled:cursor-not-allowed"
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
      </div>
    </main>
  );
}
