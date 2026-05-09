// Status banner primitive replacing the side-stripe (border-l-4) pattern.
// Uses the project's editorial vocabulary: 1px x 4-5px red kicker tick +
// small-caps tracked uppercase label + body, with a soft tinted background
// per variant. Optional inline action slot for retry buttons, etc.
//
// Variants:
//   alert   - errors / hard failures (red)
//   info    - system status / phase advances (electric blue)
//   success - positive confirmations (electric blue, distinct kicker color)
//   warning - amber for idle / soft cautions

import { C } from "../../config/constants";

// Variant -> { kicker color, surface tint, ARIA role }.
// `success` deliberately uses electric-blue (not red) so success and
// alert read as semantically distinct on a brand where red also means
// "primary CTA" and "starred".
const VARIANTS = {
  alert:   { kicker: C.red,           bg: C.redLight,                role: "alert"  },
  info:    { kicker: C.electricBlue,  bg: "rgba(0,163,224,0.06)",    role: "status" },
  success: { kicker: C.electricBlue,  bg: "rgba(0,163,224,0.06)",    role: "status" },
  warning: { kicker: C.warning,       bg: C.warningBg,               role: "status" },
  // Celebratory variant for the "voting open" / "your contribution is in"
  // moments. Red kicker + soft red wash, but only used when the moment
  // is genuinely a peak-end accent (sparingly).
  accent:  { kicker: C.red,           bg: C.starredBg,               role: "status" },
};

export default function StatusBlock({
  variant = "info",
  kicker,
  children,
  action,
  className = "",
  icon,
  compact = false,
  ...rest
}) {
  const v = VARIANTS[variant] ?? VARIANTS.info;
  const padX = compact ? "px-4" : "px-5";
  const padY = compact ? "py-3" : "py-4";

  return (
    <div
      role={v.role}
      className={`${padX} ${padY} ${className}`}
      style={{ background: v.bg }}
      {...rest}
    >
      {kicker && (
        <div className="flex items-center gap-3 mb-2">
          <span
            aria-hidden="true"
            className="inline-block w-1 h-4 flex-shrink-0"
            style={{ background: v.kicker }}
          />
          <span
            className="text-[10px] font-bold uppercase tracking-[0.28em]"
            style={{ color: v.kicker }}
          >
            {kicker}
          </span>
        </div>
      )}
      <div
        className={`text-sm ${icon ? "flex items-start gap-2" : ""}`}
        style={{ color: C.darkGray, lineHeight: 1.55 }}
      >
        {icon && <span className="flex-shrink-0 mt-0.5" aria-hidden="true">{icon}</span>}
        <div className="flex-1">{children}</div>
      </div>
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
