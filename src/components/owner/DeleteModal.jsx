import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { C } from "../../config/constants";
import ModalShell from "./ModalShell";
import StatusBlock from "../shared/StatusBlock";

export default function DeleteModal({ session, ownerKey, onClose }) {
  const deleteSession = useMutation(api.ownerQueries.deleteSessionAsOwner);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const onConfirm = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await deleteSession({ ownerKey, sessionId: session._id });
      onClose();
    } catch (err) {
      setError(err?.message ?? "Could not delete. Try again?");
      setSubmitting(false);
    }
  };

  return (
    <ModalShell onClose={onClose} title="Delete session">
      <p className="text-sm text-neutral-700 mb-5 leading-relaxed">
        Delete session <strong>{session.functionName}</strong> ({session.code})? This permanently deletes all{" "}
        <strong>{session.participantCount}</strong> participants' data and cannot be undone.
      </p>

      {error && (
        <StatusBlock variant="alert" kicker="Couldn't delete" className="mb-4">
          {error}
        </StatusBlock>
      )}

      <div className="flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider"
          style={{ color: C.darkGray }}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={submitting}
          className="px-5 py-2.5 text-xs font-semibold uppercase tracking-wider disabled:opacity-50"
          style={{ background: C.red, color: C.white }}
        >
          {submitting ? "Deleting…" : "Delete permanently"}
        </button>
      </div>
    </ModalShell>
  );
}
