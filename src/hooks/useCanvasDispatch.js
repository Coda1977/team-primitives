// Dispatch-shaped adapter that lets the inherited primitives components
// (CategorySection, IdeaCard, AddIdeaInput) work unchanged via a `dispatch`
// prop. Each action type maps to a Convex mutation.
//
// The shape is intentionally backwards-compatible with the original AI Playbook
// so we don't have to fork the inherited components.

import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";

export function useCanvasDispatch(participantId, ideaIdLookup) {
  const addIdea = useMutation(api.canvas.addIdea);
  const updateIdea = useMutation(api.canvas.updateIdea);
  const deleteIdea = useMutation(api.canvas.deleteIdea);
  const toggleStar = useMutation(api.canvas.toggleStar);
  const markChatIdeaAdded = useMutation(api.canvas.markChatIdeaAdded);

  return (action) => {
    switch (action.type) {
      case "ADD_PRIMITIVE":
        return addIdea({
          participantId,
          categoryId: action.categoryId,
          text: action.text,
          source: action.source ?? "manual",
        });

      case "UPDATE_PRIMITIVE": {
        const realId = ideaIdLookup?.(action.ideaId) ?? action.ideaId;
        return updateIdea({ participantId, ideaId: realId, text: action.text });
      }

      case "DELETE_PRIMITIVE": {
        const realId = ideaIdLookup?.(action.ideaId) ?? action.ideaId;
        return deleteIdea({ participantId, ideaId: realId });
      }

      case "TOGGLE_PRIMITIVE_STAR": {
        const realId = ideaIdLookup?.(action.ideaId) ?? action.ideaId;
        return toggleStar({ participantId, ideaId: realId });
      }

      case "MARK_PRIMITIVE_IDEA_ADDED":
        return markChatIdeaAdded({
          participantId,
          messageId: action.messageId,
          ideaIdx: action.ideaIdx,
        });

      // ADD_PRIMITIVES_CHAT_MSG and ADD_CHAT_MSG are handled directly by the
      // ChatDrawer via Convex queries/actions — not routed through this dispatch.
      case "ADD_PRIMITIVES_CHAT_MSG":
      case "ADD_CHAT_MSG":
        return undefined;

      default:
        if (typeof console !== "undefined") {
          console.warn("[useCanvasDispatch] unknown action type:", action.type);
        }
        return undefined;
    }
  };
}
