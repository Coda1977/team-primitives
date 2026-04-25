// Flat list of every starred idea in the session, grouped by category,
// with participant attribution. Always visible to admin as a safety net
// when synthesis quality is in doubt.

import { CATEGORIES } from "../../config/categories";
import { C } from "../../config/constants";

export default function RawStarredList({ starred }) {
  if (!starred || starred.length === 0) {
    return (
      <p className="text-sm text-neutral-500 italic">
        No starred ideas yet. Once participants lock their stars, they'll appear here grouped by category.
      </p>
    );
  }

  // Group by category
  const byCat = {};
  for (const idea of starred) {
    if (!byCat[idea.categoryId]) byCat[idea.categoryId] = [];
    byCat[idea.categoryId].push(idea);
  }

  return (
    <div className="space-y-6">
      {CATEGORIES.map((cat) => {
        const ideas = byCat[cat.id];
        if (!ideas || ideas.length === 0) return null;
        return (
          <section key={cat.id}>
            <h3 className="text-sm font-bold tracking-tight mb-2 flex items-center gap-2">
              <span
                className="inline-block w-2 h-2 rounded-full"
                style={{ background: cat.color }}
              />
              {cat.title}
              <span className="text-xs text-neutral-500 font-normal">({ideas.length})</span>
            </h3>
            <ul className="space-y-1">
              {ideas.map((idea) => (
                <li key={idea._id} className="text-sm leading-relaxed flex gap-2">
                  <span className="text-neutral-400 font-mono text-xs whitespace-nowrap pt-0.5">
                    ({idea.participantName})
                  </span>
                  <span>{idea.text}</span>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
