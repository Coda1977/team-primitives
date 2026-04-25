import PhaseProgress from "./PhaseProgress";

function truncateRole(role, maxLen = 50) {
  if (!role || role.length <= maxLen) return role;
  const trimmed = role.slice(0, maxLen);
  const lastSpace = trimmed.lastIndexOf(" ");
  return lastSpace > 20 ? trimmed.slice(0, lastSpace) + "..." : trimmed + "...";
}

export default function Header({ state, dispatch }) {
  const { phase, intake } = state;
  const isGenerating = phase === "generating-primitives" || phase === "generating-playbook";
  const showRole = intake.role && phase !== "intake" && !isGenerating;

  return (
    <header className="header no-print">
      <div className="header-inner">
        <div className="header-left">
          <span className="header-title">AI Playbook</span>
          {showRole && (
            <>
              <span className="header-divider">|</span>
              <span className="header-role" title={intake.role}>{truncateRole(intake.role)}</span>
            </>
          )}
        </div>
        <div className="header-actions">
          <PhaseProgress phase={phase} dispatch={dispatch} isGenerating={isGenerating} />
        </div>
      </div>
    </header>
  );
}
