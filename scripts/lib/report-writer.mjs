// Writes simulation run reports under reports/<date>-<run-id>/.

import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPORTS_ROOT = resolve(__dirname, "..", "..", "reports");

export function startReport({ runId }) {
  const date = new Date().toISOString().slice(0, 10);
  const dir = resolve(REPORTS_ROOT, `${date}-${runId}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

export function writeSessionData(reportDir, sessionCode, data) {
  const sessionDir = resolve(reportDir, sessionCode);
  mkdirSync(sessionDir, { recursive: true });
  writeFileSync(
    resolve(sessionDir, "data.json"),
    JSON.stringify(data, null, 2),
    "utf8"
  );
}

export function writeIndex(reportDir, summary) {
  const lines = [];
  lines.push(`# Simulation run · ${summary.runId}`);
  lines.push("");
  lines.push(`Started: ${summary.startedAt}`);
  lines.push(`Finished: ${summary.finishedAt}`);
  lines.push(`Duration: ${Math.round(summary.durationMs / 1000)}s`);
  lines.push("");
  lines.push(`**Sessions:** ${summary.sessions.length}`);
  lines.push(`**Personas total:** ${summary.totalPersonas}`);
  lines.push(`**LLM calls:** ${summary.usage.calls}`);
  lines.push(
    `**Tokens:** ${summary.usage.inputTokens.toLocaleString()} input · ${summary.usage.outputTokens.toLocaleString()} output`
  );
  lines.push(`**Estimated cost:** $${summary.usage.costUsd.toFixed(2)}`);
  lines.push("");
  if (summary.errors.length > 0) {
    lines.push(`## Errors (${summary.errors.length})`);
    for (const err of summary.errors) {
      lines.push(`- **${err.phase}** [${err.context}]: ${err.message}`);
    }
    lines.push("");
  }
  lines.push("## Sessions");
  lines.push("");
  for (const s of summary.sessions) {
    lines.push(`### ${s.functionName} · \`${s.code}\``);
    lines.push("");
    lines.push(`- Admin URL: ${s.adminUrl}`);
    lines.push(`- Participants: ${s.participantCount} (${s.personas.join(", ")})`);
    lines.push(`- Ideas generated: ${s.totalIdeas}`);
    lines.push(`- Stars total: ${s.totalStars}`);
    if (s.synthesis) {
      lines.push(`- Synthesized clusters: ${s.synthesis.clusterCount}`);
    }
    if (s.ranked && s.ranked.length > 0) {
      lines.push(`- Top voted: **${s.ranked[0].title}** (${s.ranked[0].voteCount} votes)`);
      if (s.ranked[0].contributorNames?.length >= 2) {
        lines.push(
          `  - cross-team consensus from: ${s.ranked[0].contributorNames.join(", ")}`
        );
      }
    }
    lines.push("");
  }
  writeFileSync(resolve(reportDir, "index.md"), lines.join("\n"), "utf8");
}
