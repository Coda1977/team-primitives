// Renders a single synthesized cluster with its title, summary, category badge,
// source count, voter (participant) names, and an expandable list of member ideas.

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { CATEGORIES } from "../../config/categories";
import { C } from "../../config/constants";

export default function ClusterCard({ cluster, ideas, participants }) {
  const [expanded, setExpanded] = useState(false);
  const cat = CATEGORIES.find((c) => c.id === cluster.categoryId);
  const memberIdeas = cluster.memberIdeaIds
    .map((id) => ideas.find((i) => i._id === id))
    .filter(Boolean);
  const participantNames = cluster.participantIds
    .map((id) => participants.find((p) => p._id === id)?.name)
    .filter(Boolean);

  return (
    <div className="border" style={{ borderColor: C.lightGray }}>
      <div className="p-4">
        <div className="flex items-start gap-3 mb-2">
          <span
            className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider whitespace-nowrap mt-0.5"
            style={{ background: (cat?.color ?? C.electricBlue) + "20", color: cat?.color ?? C.electricBlue }}
          >
            {cat?.title ?? cluster.categoryId}
          </span>
          <span
            className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider whitespace-nowrap mt-0.5"
            style={{ background: C.starredBg, color: C.red }}
            title="People who contributed an idea that became part of this cluster"
          >
            {cluster.participantIds.length} {cluster.participantIds.length === 1 ? "source" : "sources"}
          </span>
        </div>
        <h3 className="text-base font-bold leading-snug mb-1">{cluster.title}</h3>
        {cluster.summary && (
          <p className="text-sm text-neutral-700 leading-relaxed mb-2">
            {cluster.summary}
          </p>
        )}
        <p className="text-xs text-neutral-500">
          Sourced from: {participantNames.join(", ")}
        </p>
      </div>

      <button
        onClick={() => setExpanded((e) => !e)}
        className="w-full flex items-center justify-between px-4 py-2 border-t text-xs uppercase tracking-wider font-semibold text-neutral-600 hover:bg-neutral-50"
        style={{ borderColor: C.lightGray }}
      >
        <span>{expanded ? "Hide" : "Show"} {memberIdeas.length} source idea{memberIdeas.length === 1 ? "" : "s"}</span>
        <ChevronDown
          size={14}
          style={{ transform: expanded ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}
        />
      </button>

      {expanded && (
        <ul className="px-4 py-3 border-t space-y-2 bg-neutral-50" style={{ borderColor: C.lightGray }}>
          {memberIdeas.map((idea) => {
            const participantName =
              participants.find((p) => p._id === idea.participantId)?.name ?? "(unknown)";
            return (
              <li key={idea._id} className="text-sm leading-relaxed flex gap-2">
                <span className="text-neutral-400 font-mono text-xs whitespace-nowrap pt-0.5">
                  ({participantName})
                </span>
                <span>{idea.text}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
