// Lazy facade over `./exportImpl.js`. The actual implementation pulls in
// docx (~1.5 MB), jszip (~400 KB), and file-saver — together about 2 MB of
// JavaScript that participants almost never trigger. Each named export below
// loads the impl on demand so the heavy bundle is only fetched the first time
// someone clicks an export button.

let implPromise = null;
function getImpl() {
  if (!implPromise) implPromise = import("./exportImpl.js");
  return implPromise;
}

export async function exportTopIdeasDocx(args) {
  const m = await getImpl();
  return m.exportTopIdeasDocx(args);
}

export async function exportSynthesisDocx(args) {
  const m = await getImpl();
  return m.exportSynthesisDocx(args);
}

export async function exportTeamBoardDocx(args) {
  const m = await getImpl();
  return m.exportTeamBoardDocx(args);
}

export async function exportParticipantDocx(args) {
  const m = await getImpl();
  return m.exportParticipantDocx(args);
}

export async function exportAllSessionsZip(args) {
  const m = await getImpl();
  return m.exportAllSessionsZip(args);
}
