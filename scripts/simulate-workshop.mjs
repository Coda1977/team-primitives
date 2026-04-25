// Workshop simulator. Drives 1+ Team Primitives sessions end-to-end with
// AI-generated persona answers — useful for stress-testing synthesis quality
// + voting flows before a real workshop.
//
// Usage:
//   node scripts/simulate-workshop.mjs                              # 1 session × 6 personas
//   node scripts/simulate-workshop.mjs --sessions 3 --participants 5
//   node scripts/simulate-workshop.mjs --sessions 10 --participants 6 --concurrency 3
//
// Reads VITE_CONVEX_URL from .env.local and OWNER_KEY + ANTHROPIC_API_KEY
// from process.env (or .env.local).
//
// Targets whichever Convex deployment .env.local points at. For a real
// "staging" run, point .env.local at a separate Convex project before running.

import { readdirSync, readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import pLimit from "p-limit";

// IMPORTANT: convex-client.mjs imports first because it hydrates process.env
// from .env.local at module load. PersonaDriver reads from process.env.
import { createClient, getEnv, api } from "./lib/convex-client.mjs";
import { PersonaDriver, pickRandom } from "./lib/persona-llm.mjs";
import { startReport, writeSessionData, writeIndex } from "./lib/report-writer.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ---------- CLI args ----------
function parseArgs(argv) {
  const out = {
    sessions: 1,
    participants: 6,
    concurrency: 2,
    votesPerParticipant: 3,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--sessions") out.sessions = Number(argv[++i]);
    else if (a === "--participants") out.participants = Number(argv[++i]);
    else if (a === "--concurrency") out.concurrency = Number(argv[++i]);
    else if (a === "--votes") out.votesPerParticipant = Number(argv[++i]);
  }
  return out;
}

// ---------- persona file loading ----------
function loadPersonaFiles() {
  const dir = resolve(__dirname, "personas");
  const files = readdirSync(dir).filter((f) => f.endsWith(".json"));
  return files.map((f) => JSON.parse(readFileSync(resolve(dir, f), "utf8")));
}

// ---------- helpers ----------
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function pollUntilCanvasReady(client, participantId, timeoutMs = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const p = await client.query(api.participants.getParticipant, { participantId });
    if (p?.phase === "canvas") return p;
    await sleep(800);
  }
  throw new Error(`Canvas generation timed out for participant ${participantId}`);
}

// ---------- one session ----------
async function runSession({ client, persona, ownerKey, participantCount, votesPerParticipant, driver }) {
  const result = {
    functionName: persona.functionName,
    code: null,
    adminUrl: null,
    personas: [],
    participantCount: 0,
    totalIdeas: 0,
    totalStars: 0,
    synthesis: null,
    ranked: [],
    errors: [],
  };

  try {
    // 1. Create session
    const created = await client.mutation(api.ownerQueries.createSessionAsOwner, {
      ownerKey,
      functionName: persona.functionName,
      teamSize: persona.teamSize,
      industry: persona.industry,
    });
    result.code = created.code;
    result.adminUrl = `/s/${created.code}/admin?k=${created.adminKey}`;
    const sessionId = created.sessionId;
    const adminKey = created.adminKey;

    console.log(`  ✓ created ${persona.functionName} session ${created.code}`);

    // 2. Pick N personas + drive each through full participant flow
    const personas = pickRandom(persona.personas, Math.min(participantCount, persona.personas.length));
    result.personas = personas.map((p) => p.name);
    result.participantCount = personas.length;

    const participantStates = [];
    for (const p of personas) {
      try {
        // Generate intake
        const answers = await driver.generateIntake({
          functionName: persona.functionName,
          industry: persona.industry,
          teamSize: persona.teamSize,
          persona: p,
        });

        // Join + submit intake + generate canvas
        const joined = await client.mutation(api.participants.joinSession, {
          sessionId,
          name: p.name,
        });
        await client.mutation(api.intake.submitIntake, {
          participantId: joined.participantId,
          ...answers,
        });
        await client.action(api.ai.generateCanvas.run, {
          participantId: joined.participantId,
        });
        await pollUntilCanvasReady(client, joined.participantId);

        // Star 5–8 random ideas from canvas
        const canvas = await client.query(api.canvas.getMyCanvas, {
          participantId: joined.participantId,
        });
        const allIdeas = Object.values(canvas).flat();
        const starCount = Math.min(allIdeas.length, 5 + Math.floor(Math.random() * 4));
        const toStar = pickRandom(allIdeas, starCount);
        for (const idea of toStar) {
          await client.mutation(api.canvas.toggleStar, {
            participantId: joined.participantId,
            ideaId: idea._id,
          });
        }
        await client.mutation(api.canvas.finalizeStars, {
          participantId: joined.participantId,
        });

        result.totalIdeas += allIdeas.length;
        result.totalStars += toStar.length;
        participantStates.push({
          participantId: joined.participantId,
          slug: joined.slug,
          name: p.name,
          starredIdeaIds: toStar.map((i) => i._id),
        });
        console.log(`    · ${p.name} (${p.subRole}): ${allIdeas.length} ideas, ${toStar.length} starred`);
      } catch (err) {
        result.errors.push({
          phase: "participant-flow",
          context: `${created.code}/${p.name}`,
          message: err?.message ?? String(err),
        });
        console.warn(`    ⚠ ${p.name} errored: ${err?.message ?? err}`);
      }
    }

    if (participantStates.length < 2) {
      throw new Error(`Only ${participantStates.length} participants succeeded — synthesis needs 2`);
    }

    // 3. Synthesize
    await client.action(api.ai.synthesize.run, { sessionId, adminKey });
    const synth = await client.query(api.synthesis.getLatestSynthesis, {
      sessionId,
      adminKey,
    });
    if (synth?.status !== "ready") {
      throw new Error(`Synthesis ended in status ${synth?.status}: ${synth?.error}`);
    }
    result.synthesis = {
      clusterCount: synth.clusters.length,
      clusters: synth.clusters,
    };
    console.log(`  ✓ synthesized into ${synth.clusters.length} dedup'd ideas`);

    // 4. Open voting
    await client.mutation(api.votes.openVoting, {
      sessionId,
      adminKey,
      votesPerParticipant,
    });

    // 5. Each persona votes for `votesPerParticipant` random clusters
    for (const ps of participantStates) {
      const anchors = pickRandom(synth.clusters, votesPerParticipant).map(
        (c) => c.memberIdeaIds[0]
      );
      for (const anchor of anchors) {
        try {
          await client.mutation(api.votes.castVote, {
            participantId: ps.participantId,
            ideaId: anchor,
          });
        } catch (err) {
          // Could be a re-vote attempt on same idea — fine, ignore
        }
      }
    }

    // 6. Close voting
    await client.mutation(api.votes.closeVoting, { sessionId, adminKey });

    // 7. Fetch ranked
    const ranked = await client.query(api.votes.getRankedResults, { sessionId });
    result.ranked = ranked?.ranked ?? [];
    if (result.ranked[0]) {
      console.log(
        `  ✓ voted: top "${result.ranked[0].title}" with ${result.ranked[0].voteCount} votes`
      );
    }
  } catch (err) {
    result.errors.push({
      phase: "session",
      context: result.code ?? persona.functionName,
      message: err?.message ?? String(err),
    });
    console.error(`  ✗ ${persona.functionName} session failed: ${err?.message ?? err}`);
  }

  return result;
}

// ---------- main ----------
async function main() {
  const args = parseArgs(process.argv.slice(2));
  const env = getEnv();
  const ownerKey = env.OWNER_KEY ?? process.env.OWNER_KEY;
  if (!ownerKey) {
    console.error(
      "OWNER_KEY not set. Add to .env.local or pass via OWNER_KEY=... environment variable."
    );
    process.exit(1);
  }

  const client = createClient();
  const driver = new PersonaDriver();
  const personaFiles = loadPersonaFiles();

  const runId = Math.random().toString(36).slice(2, 8);
  const reportDir = startReport({ runId });
  const startedAt = new Date().toISOString();
  const start = Date.now();

  console.log(`\n═══ Team Primitives — workshop simulator ═══`);
  console.log(`Run ID:        ${runId}`);
  console.log(`Sessions:      ${args.sessions}`);
  console.log(`Participants:  ${args.participants} per session`);
  console.log(`Votes:         ${args.votesPerParticipant} per participant`);
  console.log(`Concurrency:   ${args.concurrency}`);
  console.log(`Convex URL:    ${env.VITE_CONVEX_URL}`);
  console.log(`Report:        ${reportDir}\n`);

  const limit = pLimit(args.concurrency);
  const sessionTasks = [];
  for (let i = 0; i < args.sessions; i++) {
    const persona = personaFiles[i % personaFiles.length];
    sessionTasks.push(
      limit(async () => {
        console.log(`▶ session ${i + 1}/${args.sessions}: ${persona.functionName}`);
        const result = await runSession({
          client,
          persona,
          ownerKey,
          participantCount: args.participants,
          votesPerParticipant: args.votesPerParticipant,
          driver,
        });
        if (result.code) {
          writeSessionData(reportDir, result.code, result);
        }
        return result;
      })
    );
  }

  const results = await Promise.all(sessionTasks);
  const finishedAt = new Date().toISOString();
  const durationMs = Date.now() - start;

  const totalPersonas = results.reduce((s, r) => s + r.participantCount, 0);
  const allErrors = results.flatMap((r) => r.errors);
  const usage = {
    calls: driver.usage.calls,
    inputTokens: driver.usage.inputTokens,
    outputTokens: driver.usage.outputTokens,
    costUsd: driver.estimatedCostUsd(),
  };

  writeIndex(reportDir, {
    runId,
    startedAt,
    finishedAt,
    durationMs,
    sessions: results.filter((r) => r.code),
    totalPersonas,
    errors: allErrors,
    usage,
  });

  console.log(`\n═══ Done ═══`);
  console.log(`Sessions:        ${results.filter((r) => r.code).length}/${args.sessions}`);
  console.log(`Participants:    ${totalPersonas}`);
  console.log(`Errors:          ${allErrors.length}`);
  console.log(`LLM calls:       ${usage.calls}`);
  console.log(
    `Tokens:          ${usage.inputTokens.toLocaleString()} in · ${usage.outputTokens.toLocaleString()} out`
  );
  console.log(`Estimated cost:  $${usage.costUsd.toFixed(2)}`);
  console.log(`Duration:        ${Math.round(durationMs / 1000)}s`);
  console.log(`Report:          ${reportDir}/index.md\n`);

  if (allErrors.length > 0) {
    console.warn(`⚠ ${allErrors.length} errors during run — see report index for details.`);
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error("\n✗ Simulator crashed:", err);
  process.exit(1);
});
