// localStorage helpers for { sessionCode -> participantId } map.
// Each browser remembers which participant they are per session.

const KEY_PREFIX = "teamprimitives:";

export function setParticipantId(sessionCode, participantId) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(`${KEY_PREFIX}${sessionCode}:participantId`, participantId);
  } catch {
    // Quota exceeded or storage unavailable — silently ignore
  }
}

export function getParticipantId(sessionCode) {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(`${KEY_PREFIX}${sessionCode}:participantId`);
  } catch {
    return null;
  }
}

export function clearParticipantId(sessionCode) {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(`${KEY_PREFIX}${sessionCode}:participantId`);
  } catch {
    // ignore
  }
}
